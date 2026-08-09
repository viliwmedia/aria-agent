require('dotenv').config();
const express = require('express');
const path = require('path');
const db = require('./db');
const agent = require('./agent');
const tools = require('./tools');

const app = express();
app.use(express.json());

const APP_PASSWORD = process.env.APP_PASSWORD || '';

// Simple shared-password gate (optional). If APP_PASSWORD is set, every
// /api request must send it in the x-app-password header.
app.use('/api', (req, res, next) => {
  if (!APP_PASSWORD) return next();
  if (req.headers['x-app-password'] === APP_PASSWORD) return next();
  return res.status(401).json({ error: 'unauthorized' });
});

// Tell the frontend whether a password is required (so it can prompt).
app.get('/api/config', (req, res) => {
  res.json({ passwordRequired: !!APP_PASSWORD });
});

// Chat with the agent
app.post('/api/chat', async (req, res) => {
  const text = (req.body && req.body.message || '').trim();
  if (!text) return res.status(400).json({ error: 'empty message' });
  try {
    const reply = await agent.handleMessage(text);
    res.json({ reply, summary: tools.buildSummary() });
  } catch (err) {
    console.error('chat error:', err);
    res.status(500).json({ error: 'agent failed', detail: String(err && err.message) });
  }
});

// Current dashboard summary
app.get('/api/summary', (req, res) => {
  res.json(tools.buildSummary(req.query.month));
});

// Conversation history for rehydrating the chat window on load
app.get('/api/history', (req, res) => {
  res.json(db.getHistoryForDisplay());
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
  const { goal_type, goal_number } = req.body || {};
  if (!goal_type || !goal_number) return res.status(400).json({ error: 'goal_type and goal_number required' });
  const settings = db.setGoal(goal_type, Number(goal_number));
  res.json({ settings, summary: tools.buildSummary() });
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

app.use(express.static(path.join(__dirname, 'public')));

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  if (!process.env.ANTHROPIC_API_KEY) {
    console.warn('WARNING: ANTHROPIC_API_KEY is not set. The chat agent will fail until you set it.');
  }
  console.log(`Setter HUD running on port ${PORT}`);
});
