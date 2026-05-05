export const CREATE_HABITS_TABLE_SQL = `
CREATE TABLE IF NOT EXISTS habits (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  icon TEXT,
  icon_type TEXT,
  icon_value TEXT,
  icon_library TEXT,
  color TEXT,
  reminder_enabled INTEGER NOT NULL DEFAULT 0,
  reminder_time TEXT,
  notification_id TEXT,
  archived INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);
`;

export const CREATE_HABIT_COMPLETIONS_TABLE_SQL = `
CREATE TABLE IF NOT EXISTS habit_completions (
  id TEXT PRIMARY KEY,
  habit_id TEXT NOT NULL,
  date TEXT NOT NULL,
  completed_at TEXT NOT NULL,
  UNIQUE(habit_id, date),
  FOREIGN KEY(habit_id) REFERENCES habits(id) ON DELETE CASCADE
);
`;

export const CREATE_SETTINGS_TABLE_SQL = `
CREATE TABLE IF NOT EXISTS settings (
  key TEXT PRIMARY KEY,
  value TEXT
);
`;
