require('dotenv').config();
const express = require('express');
const path = require('path');
const webpush = require('web-push');
const db = require('./db');
const agent = require('./agent');
const tools = require('./tools');

const app = express();
app.use(express.json({ limit: '15mb' })); // raised so base64 image attachments aren't rejected

const APP_PASSWORD = process.env.APP_PASSWORD || '';

// Push notifications are optional: they only work once VAPID keys are set.
// See README for how to generate them. Without keys, events/reminders still
// save and Kawalski can still talk about them \u2014 they just won't push an
// actual notification to the device.
const VAPID_PUBLIC_KEY = process.env.VAPID_PUBLIC_KEY || '';
const VAPID_PRIVATE_KEY = process.env.VAPID_PRIVATE_KEY || '';
const VAPID_SUBJECT = process.env.VAPID_SUBJECT || 'mailto:example@example.com';
const PUSH_ENABLED = !!(VAPID_PUBLIC_KEY && VAPID_PRIVATE_KEY);
if (PUSH_ENABLED) {
  webpush.setVapidDetails(VAPID_SUBJECT, VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY);
} else {
  console.warn('Push notifications disabled: VAPID_PUBLIC_KEY / VAPID_PRIVATE_KEY not set. See README.');
}

// Tell the frontend whether a password is required (so it can prompt).
// This must be registered BEFORE the password gate below, or checking
// whether a password is needed becomes itself blocked by the password gate.
app.get('/api/config', (req, res) => {
  res.json({ passwordRequired: !!APP_PASSWORD });
});

// Simple shared-password gate (optional). If APP_PASSWORD is set, every
// other /api request must send it in the x-app-password header.
app.use('/api', (req, res, next) => {
  if (!APP_PASSWORD) return next();
  if (req.headers['x-app-password'] === APP_PASSWORD) return next();
  return res.status(401).json({ error: 'unauthorized' });
});

// Chat with the agent. Streams the reply back as newline-delimited JSON
// chunks ({"type":"text","delta":"..."}) as Claude generates them, so the
// UI can show/speak the first sentence while later ones are still being
// written, instead of waiting for the entire reply before showing anything.
app.post('/api/chat', async (req, res) => {
  const text = (req.body && req.body.message || '').trim();
  const images = Array.isArray(req.body && req.body.images) ? req.body.images : [];
  if (!text && images.length === 0) return res.status(400).json({ error: 'empty message' });

  res.setHeader('Content-Type', 'application/x-ndjson');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('X-Accel-Buffering', 'no'); // ask proxies not to buffer, so chunks flush immediately
  if (res.flushHeaders) res.flushHeaders();

  try {
    await agent.handleMessage(text, images, (delta) => {
      res.write(JSON.stringify({ type: 'text', delta }) + '\n');
    });
    res.write(JSON.stringify({ type: 'done', summary: tools.buildSummary() }) + '\n');
  } catch (err) {
    console.error('chat error:', err);
    res.write(JSON.stringify({ type: 'error', message: String(err && err.message) }) + '\n');
  } finally {
    res.end();
  }
});

// Current dashboard summary
app.get('/api/summary', (req, res) => {
  res.json(tools.buildSummary(req.query.month));
});

// Conversation history for rehydrating the chat window on load
app.get('/api/history', (req, res) => {
  res.json(db.getHistoryForDisplay(Number(req.query.limit) || 100));
});

// Older messages, for "load more" scrolling further back
app.get('/api/history/before/:id', (req, res) => {
  res.json(db.getHistoryBefore(Number(req.params.id), Number(req.query.limit) || 50));
});

// Search across all stored conversation history
app.get('/api/search', (req, res) => {
  const q = (req.query.q || '').trim();
  if (!q) return res.json([]);
  res.json(db.searchHistory(q, Number(req.query.limit) || 50));
});

// Recent entries for the log table
app.get('/api/entries', (req, res) => {
  res.json(db.getRecentEntries(Number(req.query.limit) || 15));
});

// Manual data entry (form on the dashboard)
app.post('/api/log', (req, res) => {
  try {
    const entry = db.addActivity(req.body || {});
    res.json({ entry, summary: tools.buildSummary() });
  } catch (err) {
    res.status(500).json({ error: String(err && err.message) });
  }
});

// Set/update goal from the dashboard
app.post('/api/goal', (req, res) => {
  const { goal_type, goal_number, revenue_per_close } = req.body || {};
  if (!goal_type || !goal_number) return res.status(400).json({ error: 'goal_type and goal_number required' });
  if (goal_type === 'income' && !revenue_per_close) {
    return res.status(400).json({ error: 'revenue_per_close is required for income goals' });
  }
  const settings = db.setGoal(goal_type, Number(goal_number), revenue_per_close ? Number(revenue_per_close) : undefined);
  res.json({ settings, summary: tools.buildSummary() });
});

// Knowledge base: freeform facts Kawalski always knows
app.get('/api/notes', (req, res) => {
  res.json(db.getNotes(Number(req.query.limit) || 200));
});

app.post('/api/notes', (req, res) => {
  const content = (req.body && req.body.content || '').trim();
  if (!content) return res.status(400).json({ error: 'content required' });
  res.json(db.addNote(content));
});

app.delete('/api/notes/:id', (req, res) => {
  const ok = db.deleteNote(Number(req.params.id));
  res.json({ deleted: ok });
});

// Delete an entry
app.delete('/api/entries/:date', (req, res) => {
  const ok = db.deleteEntry(req.params.date);
  res.json({ deleted: ok, summary: tools.buildSummary() });
});

// Clear conversation only
app.post('/api/clear-chat', (req, res) => {
  db.clearConversation();
  res.json({ ok: true });
});

// ---- Events / reminders ----

app.get('/api/events', (req, res) => {
  res.json(db.listUpcomingEvents(Number(req.query.limit) || 50));
});

app.post('/api/events', (req, res) => {
  const { title, event_at, notes } = req.body || {};
  if (!title || !event_at) return res.status(400).json({ error: 'title and event_at required' });
  const ms = typeof event_at === 'number' ? event_at : new Date(event_at).getTime();
  if (isNaN(ms)) return res.status(400).json({ error: 'invalid event_at' });
  res.json(db.createEvent({ title, event_at: ms, notes }));
});

app.put('/api/events/:id', (req, res) => {
  const { title, event_at, notes } = req.body || {};
  const patch = { title, notes };
  if (event_at !== undefined) {
    const ms = typeof event_at === 'number' ? event_at : new Date(event_at).getTime();
    if (isNaN(ms)) return res.status(400).json({ error: 'invalid event_at' });
    patch.event_at = ms;
  }
  const updated = db.updateEvent(Number(req.params.id), patch);
  if (!updated) return res.status(404).json({ error: 'not found' });
  res.json(updated);
});

app.delete('/api/events/:id', (req, res) => {
  res.json({ deleted: db.deleteEvent(Number(req.params.id)) });
});

// ---- Push notifications ----

app.get('/api/push/public-key', (req, res) => {
  res.json({ enabled: PUSH_ENABLED, publicKey: VAPID_PUBLIC_KEY || null });
});

app.post('/api/push/subscribe', (req, res) => {
  const sub = req.body;
  if (!sub || !sub.endpoint) return res.status(400).json({ error: 'invalid subscription' });
  db.saveSubscription(sub);
  res.json({ ok: true });
});

app.post('/api/push/unsubscribe', (req, res) => {
  const { endpoint } = req.body || {};
  if (endpoint) db.deleteSubscriptionByEndpoint(endpoint);
  res.json({ ok: true });
});

// Sends a test push immediately, so the user can confirm notifications
// actually work on their device right after enabling them.
app.post('/api/push/test', async (req, res) => {
  if (!PUSH_ENABLED) return res.status(400).json({ error: 'push not configured on the server' });
  const subs = db.getSubscriptions();
  if (subs.length === 0) return res.status(400).json({ error: 'no subscriptions on file yet' });
  const payload = JSON.stringify({ title: 'Kawalski', body: "This is a test \u2014 notifications are working." });
  let sent = 0;
  for (const sub of subs) {
    try { await webpush.sendNotification(sub, payload); sent++; }
    catch (err) { console.error('push test failed for a subscription:', err.message); }
  }
  res.json({ sent });
});

// ---- Background scheduler: checks for due, unnotified events every minute
// and pushes a notification to every subscribed device. ----
async function checkDueReminders() {
  if (!PUSH_ENABLED) return;
  const due = db.getDueUnnotifiedEvents(Date.now());
  if (due.length === 0) return;
  const subs = db.getSubscriptions();
  for (const event of due) {
    const payload = JSON.stringify({
      title: 'Kawalski \u00b7 Reminder',
      body: event.title + (event.notes ? ' \u2014 ' + event.notes : ''),
    });
    for (const sub of subs) {
      try { await webpush.sendNotification(sub, payload); }
      catch (err) {
        // 410/404 means the browser subscription is dead; clean it up.
        if (err.statusCode === 410 || err.statusCode === 404) db.deleteSubscriptionByEndpoint(sub.endpoint);
        else console.error('push send failed:', err.message);
      }
    }
    db.markEventNotified(event.id);
  }
}
setInterval(() => { checkDueReminders().catch(err => console.error('reminder check failed:', err)); }, 60 * 1000);

app.use(express.static(path.join(__dirname, 'public')));

const PORT = process.env.PORT || 3000;
(async () => {
  await db.initDb(); // Initialize SQL.js database
  app.listen(PORT, () => {
    if (!process.env.ANTHROPIC_API_KEY) {
      console.warn('WARNING: ANTHROPIC_API_KEY is not set. The chat agent will fail until you set it.');
    }
    console.log(`Setter HUD running on port ${PORT}`);
  });
})();
