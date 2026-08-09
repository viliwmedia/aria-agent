const initSqlJs = require('sql.js');
const fs = require('fs');
const path = require('path');

const DB_PATH = process.env.DATABASE_PATH || './data/setter.db';
fs.mkdirSync(path.dirname(DB_PATH), { recursive: true });

let SQL = null;
let db = null;
let isInitialized = false;

// Initialize must be called once at startup (happens automatically on first use).
async function initDb() {
  if (isInitialized) return;
  if (!SQL) SQL = await initSqlJs();

  // Try to load existing database from disk, otherwise start fresh.
  let filebuffer;
  try {
    filebuffer = fs.readFileSync(DB_PATH);
  } catch (e) {
    filebuffer = null;
  }

  db = filebuffer ? new SQL.Database(filebuffer) : new SQL.Database();

  // Create schema
  db.run(`
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
      goal_number REAL NOT NULL,
      revenue_per_close REAL
    );

    CREATE TABLE IF NOT EXISTS conversation (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      role TEXT NOT NULL,
      content TEXT NOT NULL,
      created_at INTEGER NOT NULL,
      image_data TEXT
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

  isInitialized = true;
}

// Persist current DB state to disk.
function saveDb() {
  if (!db) return;
  const data = db.export();
  const buffer = Buffer.from(data);
  fs.writeFileSync(DB_PATH, buffer);
}

// Wrapper: sql.js queries return statement objects; this helps extract results.
function allRows(stmt) {
  const rows = [];
  while (stmt.step()) {
    rows.push(stmt.getAsObject());
  }
  stmt.free();
  return rows;
}

function oneRow(stmt) {
  let row = null;
  if (stmt.step()) row = stmt.getAsObject();
  stmt.free();
  return row;
}

// ---- Dates ----
function todayISO() {
  const d = new Date();
  return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
}

// ---- Activity logging ----
function addActivity({ date, dials = 0, appointments_set = 0, shows = 0, closes = 0 }) {
  const d = date || todayISO();
  const stmt = db.prepare('INSERT OR IGNORE INTO entries (date, dials, appts, shows, closes) VALUES (?, 0, 0, 0, 0)');
  stmt.bind([d]);
  stmt.step();
  stmt.free();

  const update = db.prepare('UPDATE entries SET dials=dials+?, appts=appts+?, shows=shows+?, closes=closes+? WHERE date=?');
  update.bind([dials, appointments_set, shows, closes, d]);
  update.step();
  update.free();
  saveDb();

  const get = db.prepare('SELECT * FROM entries WHERE date=?');
  get.bind([d]);
  const row = oneRow(get);
  return row || { date: d, dials: 0, appts: 0, shows: 0, closes: 0 };
}

function correctEntry({ date, dials, appointments_set, shows, closes }) {
  const d = date || todayISO();
  const get = db.prepare('SELECT * FROM entries WHERE date=?');
  get.bind([d]);
  const existing = oneRow(get);

  const next = {
    date: d,
    dials: dials !== undefined ? dials : (existing ? existing.dials : 0),
    appts: appointments_set !== undefined ? appointments_set : (existing ? existing.appts : 0),
    shows: shows !== undefined ? shows : (existing ? existing.shows : 0),
    closes: closes !== undefined ? closes : (existing ? existing.closes : 0),
  };

  const upsert = db.prepare('INSERT OR REPLACE INTO entries (date, dials, appts, shows, closes) VALUES (?, ?, ?, ?, ?)');
  upsert.bind([next.date, next.dials, next.appts, next.shows, next.closes]);
  upsert.step();
  upsert.free();
  saveDb();
  return next;
}

function deleteEntry(date) {
  const stmt = db.prepare('DELETE FROM entries WHERE date=?');
  stmt.bind([date]);
  stmt.step();
  stmt.free();
  saveDb();
  return true;
}

function getRecentEntries(limit = 15) {
  const stmt = db.prepare('SELECT * FROM entries ORDER BY date DESC LIMIT ?');
  stmt.bind([limit]);
  const rows = allRows(stmt);
  return rows;
}

function getMonthEntries(monthKey) {
  const stmt = db.prepare('SELECT * FROM entries WHERE date LIKE ? ORDER BY date ASC');
  stmt.bind([monthKey + '%']);
  const rows = allRows(stmt);
  return rows;
}

// ---- Settings / goals ----
function getSettings() {
  const stmt = db.prepare('SELECT * FROM settings WHERE id=1');
  return oneRow(stmt);
}

function setGoal(goalType, goalNumber, revenuePerClose) {
  const stmt = db.prepare(`
    INSERT INTO settings (id, goal_type, goal_number, revenue_per_close) VALUES (1, ?, ?, ?)
    ON CONFLICT(id) DO UPDATE SET goal_type=excluded.goal_type, goal_number=excluded.goal_number, revenue_per_close=excluded.revenue_per_close
  `);
  stmt.bind([goalType, goalNumber, revenuePerClose !== undefined ? revenuePerClose : null]);
  stmt.step();
  stmt.free();
  saveDb();
  return getSettings();
}

// ---- Conversation memory ----
const CONTEXT_WINDOW = 30;

function appendMessage(role, content, imageData) {
  const stmt = db.prepare('INSERT INTO conversation (role, content, created_at, image_data) VALUES (?, ?, ?, ?)');
  stmt.bind([role, content, Date.now(), imageData || null]);
  stmt.step();
  stmt.free();
  saveDb();
}

function getHistory() {
  const stmt = db.prepare('SELECT role, content FROM conversation ORDER BY id DESC LIMIT ?');
  stmt.bind([CONTEXT_WINDOW]);
  const rows = allRows(stmt);
  return rows.reverse();
}

function getHistoryForDisplay(limit = 100) {
  const stmt = db.prepare('SELECT id, role, content, created_at, image_data FROM conversation ORDER BY id DESC LIMIT ?');
  stmt.bind([limit]);
  const rows = allRows(stmt);
  return rows.reverse();
}

function getHistoryBefore(beforeId, limit = 50) {
  const stmt = db.prepare('SELECT id, role, content, created_at, image_data FROM conversation WHERE id < ? ORDER BY id DESC LIMIT ?');
  stmt.bind([beforeId, limit]);
  const rows = allRows(stmt);
  return rows.reverse();
}

function searchHistory(query, limit = 50) {
  const like = '%' + query.replace(/[%_]/g, c => '\\' + c) + '%';
  const stmt = db.prepare(`
    SELECT id, role, content, created_at, image_data FROM conversation
    WHERE content LIKE ? ESCAPE '\\'
    ORDER BY id DESC LIMIT ?
  `);
  stmt.bind([like, limit]);
  return allRows(stmt);
}

function clearConversation() {
  db.run('DELETE FROM conversation');
  saveDb();
}

// ---- Knowledge base ----
function addNote(content) {
  const stmt = db.prepare('INSERT INTO notes (content, created_at) VALUES (?, ?)');
  stmt.bind([content, Date.now()]);
  stmt.step();
  stmt.free();
  saveDb();

  const get = db.prepare('SELECT * FROM notes ORDER BY id DESC LIMIT 1');
  const row = oneRow(get);
  return row || { content, created_at: Date.now() };
}

function getNotes(limit = 200) {
  const stmt = db.prepare('SELECT * FROM notes ORDER BY id DESC LIMIT ?');
  stmt.bind([limit]);
  const rows = allRows(stmt);
  return rows.reverse();
}

function deleteNote(id) {
  const stmt = db.prepare('DELETE FROM notes WHERE id=?');
  stmt.bind([id]);
  stmt.step();
  stmt.free();
  saveDb();
  return true;
}

function getNotesForPrompt(limit = 40) {
  const stmt = db.prepare('SELECT content FROM notes ORDER BY id DESC LIMIT ?');
  stmt.bind([limit]);
  const rows = allRows(stmt);
  if (rows.length === 0) return '';
  return rows.reverse().map(r => '- ' + r.content).join('\n');
}

// ---- Events ----
function createEvent({ title, event_at, notes }) {
  const stmt = db.prepare('INSERT INTO events (title, event_at, notes, notified, created_at) VALUES (?, ?, ?, 0, ?)');
  stmt.bind([title, event_at, notes || null, Date.now()]);
  stmt.step();
  stmt.free();
  saveDb();

  const get = db.prepare('SELECT * FROM events ORDER BY id DESC LIMIT 1');
  return oneRow(get);
}

function updateEvent(id, { title, event_at, notes }) {
  const get = db.prepare('SELECT * FROM events WHERE id=?');
  get.bind([id]);
  const existing = oneRow(get);
  if (!existing) return null;

  const next = {
    title: title !== undefined ? title : existing.title,
    event_at: event_at !== undefined ? event_at : existing.event_at,
    notes: notes !== undefined ? notes : existing.notes,
  };

  const stmt = db.prepare('UPDATE events SET title=?, event_at=?, notes=?, notified=0 WHERE id=?');
  stmt.bind([next.title, next.event_at, next.notes, id]);
  stmt.step();
  stmt.free();
  saveDb();

  const fetch = db.prepare('SELECT * FROM events WHERE id=?');
  fetch.bind([id]);
  return oneRow(fetch);
}

function deleteEvent(id) {
  const stmt = db.prepare('DELETE FROM events WHERE id=?');
  stmt.bind([id]);
  stmt.step();
  stmt.free();
  saveDb();
  return true;
}

function listUpcomingEvents(limit = 50) {
  const stmt = db.prepare('SELECT * FROM events WHERE event_at >= ? ORDER BY event_at ASC LIMIT ?');
  stmt.bind([Date.now() - 60 * 60 * 1000, limit]);
  return allRows(stmt);
}

function listAllEvents(limit = 200) {
  const stmt = db.prepare('SELECT * FROM events ORDER BY event_at DESC LIMIT ?');
  stmt.bind([limit]);
  return allRows(stmt);
}

function getDueUnnotifiedEvents(nowMs) {
  const stmt = db.prepare('SELECT * FROM events WHERE notified = 0 AND event_at <= ?');
  stmt.bind([nowMs]);
  return allRows(stmt);
}

function markEventNotified(id) {
  const stmt = db.prepare('UPDATE events SET notified = 1 WHERE id = ?');
  stmt.bind([id]);
  stmt.step();
  stmt.free();
  saveDb();
}

// ---- Push subscriptions ----
function saveSubscription(sub) {
  const stmt = db.prepare(`
    INSERT INTO push_subscriptions (endpoint, subscription, created_at) VALUES (?, ?, ?)
    ON CONFLICT(endpoint) DO UPDATE SET subscription=excluded.subscription
  `);
  stmt.bind([sub.endpoint, JSON.stringify(sub), Date.now()]);
  stmt.step();
  stmt.free();
  saveDb();
}

function getSubscriptions() {
  const stmt = db.prepare('SELECT * FROM push_subscriptions');
  const rows = allRows(stmt);
  return rows.map(r => JSON.parse(r.subscription));
}

function deleteSubscriptionByEndpoint(endpoint) {
  const stmt = db.prepare('DELETE FROM push_subscriptions WHERE endpoint = ?');
  stmt.bind([endpoint]);
  stmt.step();
  stmt.free();
  saveDb();
}

function clearAll() {
  db.run('DELETE FROM entries');
  db.run('DELETE FROM settings');
  db.run('DELETE FROM conversation');
  db.run('DELETE FROM notes');
  db.run('DELETE FROM events');
  db.run('DELETE FROM push_subscriptions');
  saveDb();
}

// Must call initDb() first before using any DB functions
module.exports = {
  initDb,
  todayISO,
  addActivity, correctEntry, deleteEntry, getRecentEntries, getMonthEntries,
  getSettings, setGoal,
  appendMessage, getHistory, getHistoryForDisplay, getHistoryBefore, searchHistory, clearConversation, clearAll,
  addNote, getNotes, deleteNote, getNotesForPrompt,
  createEvent, updateEvent, deleteEvent, listUpcomingEvents, listAllEvents, getDueUnnotifiedEvents, markEventNotified,
  saveSubscription, getSubscriptions, deleteSubscriptionByEndpoint,
};
