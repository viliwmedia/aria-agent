const Database = require('better-sqlite3');
const fs = require('fs');
const path = require('path');

const DB_PATH = process.env.DATABASE_PATH || './data/setter.db';
fs.mkdirSync(path.dirname(DB_PATH), { recursive: true });

const db = new Database(DB_PATH);
db.pragma('journal_mode = WAL');

db.exec(`
  CREATE TABLE IF NOT EXISTS entries (
    date TEXT PRIMARY KEY,
    dials INTEGER NOT NULL DEFAULT 0,
    appts INTEGER NOT NULL DEFAULT 0,
    shows INTEGER NOT NULL DEFAULT 0,
    closes INTEGER NOT NULL DEFAULT 0
  );

  CREATE TABLE IF NOT EXISTS settings (
    id INTEGER PRIMARY KEY CHECK (id = 1),
    goal_type TEXT NOT NULL,
    goal_number REAL NOT NULL
  );

  CREATE TABLE IF NOT EXISTS conversation (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    role TEXT NOT NULL,
    content TEXT NOT NULL,
    created_at INTEGER NOT NULL
  );

  CREATE TABLE IF NOT EXISTS notes (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    content TEXT NOT NULL,
    created_at INTEGER NOT NULL
  );

  CREATE TABLE IF NOT EXISTS events (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    title TEXT NOT NULL,
    event_at INTEGER NOT NULL,
    notes TEXT,
    notified INTEGER NOT NULL DEFAULT 0,
    created_at INTEGER NOT NULL
  );

  CREATE TABLE IF NOT EXISTS push_subscriptions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    endpoint TEXT NOT NULL UNIQUE,
    subscription TEXT NOT NULL,
    created_at INTEGER NOT NULL
  );
`);

// Safe migration: existing databases from before the income-goal feature
// won't have this column yet. Adding it is a no-op if it already exists.
try { db.exec('ALTER TABLE settings ADD COLUMN revenue_per_close REAL'); } catch (e) { /* already exists */ }

function todayISO() {
  const d = new Date();
  return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
}

// ---- Entries ----

function addActivity({ date, dials = 0, appointments_set = 0, shows = 0, closes = 0 }) {
  const d = date || todayISO();
  db.prepare(`
    INSERT INTO entries (date, dials, appts, shows, closes)
    VALUES (?, ?, ?, ?, ?)
    ON CONFLICT(date) DO UPDATE SET
      dials = dials + excluded.dials,
      appts = appts + excluded.appts,
      shows = shows + excluded.shows,
      closes = closes + excluded.closes
  `).run(d, dials, appointments_set, shows, closes);
  return db.prepare('SELECT * FROM entries WHERE date = ?').get(d);
}

function correctEntry({ date, dials, appointments_set, shows, closes }) {
  const d = date || todayISO();
  const existing = db.prepare('SELECT * FROM entries WHERE date = ?').get(d);
  const next = {
    dials: dials !== undefined ? dials : (existing ? existing.dials : 0),
    appts: appointments_set !== undefined ? appointments_set : (existing ? existing.appts : 0),
    shows: shows !== undefined ? shows : (existing ? existing.shows : 0),
    closes: closes !== undefined ? closes : (existing ? existing.closes : 0),
  };
  db.prepare(`
    INSERT INTO entries (date, dials, appts, shows, closes)
    VALUES (?, ?, ?, ?, ?)
    ON CONFLICT(date) DO UPDATE SET dials=excluded.dials, appts=excluded.appts, shows=excluded.shows, closes=excluded.closes
  `).run(d, next.dials, next.appts, next.shows, next.closes);
  return db.prepare('SELECT * FROM entries WHERE date = ?').get(d);
}

function deleteEntry(date) {
  return db.prepare('DELETE FROM entries WHERE date = ?').run(date).changes > 0;
}

function getRecentEntries(limit = 15) {
  return db.prepare('SELECT * FROM entries ORDER BY date DESC LIMIT ?').all(limit);
}

function getMonthEntries(monthKey) {
  return db.prepare('SELECT * FROM entries WHERE date LIKE ? ORDER BY date ASC').all(monthKey + '%');
}

// ---- Settings ----

function getSettings() {
  return db.prepare('SELECT * FROM settings WHERE id = 1').get() || null;
}

function setGoal(goalType, goalNumber, revenuePerClose) {
  db.prepare(`
    INSERT INTO settings (id, goal_type, goal_number, revenue_per_close) VALUES (1, ?, ?, ?)
    ON CONFLICT(id) DO UPDATE SET goal_type=excluded.goal_type, goal_number=excluded.goal_number, revenue_per_close=excluded.revenue_per_close
  `).run(goalType, goalNumber, revenuePerClose !== undefined ? revenuePerClose : null);
  return getSettings();
}

// ---- Conversation memory ----
// Every message is kept forever (for browsing/search). Only a recent
// window is ever sent to Claude as context, so token cost doesn't grow
// as history accumulates.

const CONTEXT_WINDOW = 30; // messages sent to Claude as conversation context

function appendMessage(role, content) {
  db.prepare('INSERT INTO conversation (role, content, created_at) VALUES (?, ?, ?)')
    .run(role, content, Date.now());
}

// Recent window for the agent's own context (not for display).
function getHistory() {
  const rows = db.prepare('SELECT role, content FROM conversation ORDER BY id DESC LIMIT ?').all(CONTEXT_WINDOW);
  return rows.reverse();
}

// Most recent messages for the chat window on page load, oldest-first.
function getHistoryForDisplay(limit = 100) {
  const rows = db.prepare('SELECT id, role, content, created_at FROM conversation ORDER BY id DESC LIMIT ?').all(limit);
  return rows.reverse();
}

// Older messages for "load more" style pagination, oldest-first within the page.
function getHistoryBefore(beforeId, limit = 50) {
  const rows = db.prepare('SELECT id, role, content, created_at FROM conversation WHERE id < ? ORDER BY id DESC LIMIT ?').all(beforeId, limit);
  return rows.reverse();
}

// Full-text-ish search across all stored messages, newest match first.
function searchHistory(query, limit = 50) {
  const like = '%' + query.replace(/[%_]/g, c => '\\' + c) + '%';
  return db.prepare(`
    SELECT id, role, content, created_at FROM conversation
    WHERE content LIKE ? ESCAPE '\\'
    ORDER BY id DESC LIMIT ?
  `).all(like, limit);
}

function clearConversation() {
  db.prepare('DELETE FROM conversation').run();
}

function clearAll() {
  db.prepare('DELETE FROM entries').run();
  db.prepare('DELETE FROM settings').run();
  db.prepare('DELETE FROM conversation').run();
  db.prepare('DELETE FROM notes').run();
  db.prepare('DELETE FROM events').run();
  db.prepare('DELETE FROM push_subscriptions').run();
}

// ---- Knowledge base (freeform facts Kowalski should always know) ----

function addNote(content) {
  const info = db.prepare('INSERT INTO notes (content, created_at) VALUES (?, ?)').run(content, Date.now());
  return db.prepare('SELECT * FROM notes WHERE id = ?').get(info.lastInsertRowid);
}

function getNotes(limit = 200) {
  return db.prepare('SELECT * FROM notes ORDER BY id DESC LIMIT ?').all(limit);
}

function deleteNote(id) {
  return db.prepare('DELETE FROM notes WHERE id = ?').run(id).changes > 0;
}

// Compact text block of the most recent notes, for injecting into the
// agent's system prompt so it always has this context without a tool call.
function getNotesForPrompt(limit = 40) {
  const rows = db.prepare('SELECT content FROM notes ORDER BY id DESC LIMIT ?').all(limit);
  if (rows.length === 0) return '';
  return rows.map(r => '- ' + r.content).join('\n');
}

// ---- Events / reminders ----

function createEvent({ title, event_at, notes }) {
  const info = db.prepare('INSERT INTO events (title, event_at, notes, notified, created_at) VALUES (?, ?, ?, 0, ?)')
    .run(title, event_at, notes || null, Date.now());
  return db.prepare('SELECT * FROM events WHERE id = ?').get(info.lastInsertRowid);
}

function updateEvent(id, { title, event_at, notes }) {
  const existing = db.prepare('SELECT * FROM events WHERE id = ?').get(id);
  if (!existing) return null;
  const next = {
    title: title !== undefined ? title : existing.title,
    event_at: event_at !== undefined ? event_at : existing.event_at,
    notes: notes !== undefined ? notes : existing.notes,
  };
  db.prepare('UPDATE events SET title=?, event_at=?, notes=?, notified=0 WHERE id=?')
    .run(next.title, next.event_at, next.notes, id);
  return db.prepare('SELECT * FROM events WHERE id = ?').get(id);
}

function deleteEvent(id) {
  return db.prepare('DELETE FROM events WHERE id = ?').run(id).changes > 0;
}

function listUpcomingEvents(limit = 50) {
  return db.prepare('SELECT * FROM events WHERE event_at >= ? ORDER BY event_at ASC LIMIT ?').all(Date.now() - 60 * 60 * 1000, limit);
}

function listAllEvents(limit = 200) {
  return db.prepare('SELECT * FROM events ORDER BY event_at DESC LIMIT ?').all(limit);
}

function getDueUnnotifiedEvents(nowMs) {
  return db.prepare('SELECT * FROM events WHERE notified = 0 AND event_at <= ?').all(nowMs);
}

function markEventNotified(id) {
  db.prepare('UPDATE events SET notified = 1 WHERE id = ?').run(id);
}

// ---- Push notification subscriptions ----

function saveSubscription(sub) {
  db.prepare(`
    INSERT INTO push_subscriptions (endpoint, subscription, created_at) VALUES (?, ?, ?)
    ON CONFLICT(endpoint) DO UPDATE SET subscription=excluded.subscription
  `).run(sub.endpoint, JSON.stringify(sub), Date.now());
}

function getSubscriptions() {
  return db.prepare('SELECT * FROM push_subscriptions').all().map(r => JSON.parse(r.subscription));
}

function deleteSubscriptionByEndpoint(endpoint) {
  db.prepare('DELETE FROM push_subscriptions WHERE endpoint = ?').run(endpoint);
}

module.exports = {
  todayISO,
  addActivity, correctEntry, deleteEntry, getRecentEntries, getMonthEntries,
  getSettings, setGoal,
  appendMessage, getHistory, getHistoryForDisplay, getHistoryBefore, searchHistory, clearConversation, clearAll,
  addNote, getNotes, deleteNote, getNotesForPrompt,
  createEvent, updateEvent, deleteEvent, listUpcomingEvents, listAllEvents, getDueUnnotifiedEvents, markEventNotified,
  saveSubscription, getSubscriptions, deleteSubscriptionByEndpoint,
};
