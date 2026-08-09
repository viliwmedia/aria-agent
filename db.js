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
    goal_number INTEGER NOT NULL
  );

  CREATE TABLE IF NOT EXISTS conversation (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    role TEXT NOT NULL,
    content TEXT NOT NULL,
    created_at INTEGER NOT NULL
  );
`);

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

function setGoal(goalType, goalNumber) {
  db.prepare(`
    INSERT INTO settings (id, goal_type, goal_number) VALUES (1, ?, ?)
    ON CONFLICT(id) DO UPDATE SET goal_type=excluded.goal_type, goal_number=excluded.goal_number
  `).run(goalType, goalNumber);
  return getSettings();
}

// ---- Conversation memory ----

function appendMessage(role, content) {
  db.prepare('INSERT INTO conversation (role, content, created_at) VALUES (?, ?, ?)')
    .run(role, content, Date.now());
  const rows = db.prepare('SELECT id FROM conversation ORDER BY id DESC LIMIT 1000').all();
  if (rows.length > 60) {
    db.prepare('DELETE FROM conversation WHERE id < ?').run(rows[59].id);
  }
}

function getHistory() {
  return db.prepare('SELECT role, content FROM conversation ORDER BY id ASC').all();
}

function getHistoryForDisplay(limit = 100) {
  return db.prepare('SELECT role, content, created_at FROM conversation ORDER BY id ASC LIMIT ?').all(limit);
}

function clearConversation() {
  db.prepare('DELETE FROM conversation').run();
}

function clearAll() {
  db.prepare('DELETE FROM entries').run();
  db.prepare('DELETE FROM settings').run();
  db.prepare('DELETE FROM conversation').run();
}

module.exports = {
  todayISO,
  addActivity, correctEntry, deleteEntry, getRecentEntries, getMonthEntries,
  getSettings, setGoal,
  appendMessage, getHistory, getHistoryForDisplay, clearConversation, clearAll,
};
