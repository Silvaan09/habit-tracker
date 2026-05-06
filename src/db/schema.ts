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
  schedule_type TEXT NOT NULL DEFAULT 'daily',
  schedule_weekdays TEXT,
  schedule_interval_days INTEGER,
  schedule_start_date TEXT,
  tracking_type TEXT NOT NULL DEFAULT 'checkbox',
  target_value REAL,
  target_unit TEXT,
  today_layout_size TEXT NOT NULL DEFAULT 'auto',
  today_layout_order INTEGER NOT NULL DEFAULT 0,
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

export const CREATE_HABIT_SKIPS_TABLE_SQL = `
CREATE TABLE IF NOT EXISTS habit_skips (
  id TEXT PRIMARY KEY,
  habit_id TEXT NOT NULL,
  date TEXT NOT NULL,
  reason TEXT NOT NULL,
  created_at TEXT NOT NULL,
  UNIQUE(habit_id, date),
  FOREIGN KEY(habit_id) REFERENCES habits(id) ON DELETE CASCADE
);
`;

export const CREATE_HABIT_SUBTASKS_TABLE_SQL = `
CREATE TABLE IF NOT EXISTS habit_subtasks (
  id TEXT PRIMARY KEY,
  habit_id TEXT NOT NULL,
  title TEXT NOT NULL,
  position INTEGER NOT NULL,
  required INTEGER NOT NULL DEFAULT 1,
  archived INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  FOREIGN KEY(habit_id) REFERENCES habits(id) ON DELETE CASCADE
);
`;

export const CREATE_HABIT_SUBTASK_COMPLETIONS_TABLE_SQL = `
CREATE TABLE IF NOT EXISTS habit_subtask_completions (
  id TEXT PRIMARY KEY,
  habit_id TEXT NOT NULL,
  subtask_id TEXT NOT NULL,
  date TEXT NOT NULL,
  completed_at TEXT NOT NULL,
  UNIQUE(subtask_id, date),
  FOREIGN KEY(habit_id) REFERENCES habits(id) ON DELETE CASCADE,
  FOREIGN KEY(subtask_id) REFERENCES habit_subtasks(id) ON DELETE CASCADE
);
`;

export const CREATE_HABIT_NUMERIC_ENTRIES_TABLE_SQL = `
CREATE TABLE IF NOT EXISTS habit_numeric_entries (
  id TEXT PRIMARY KEY,
  habit_id TEXT NOT NULL,
  date TEXT NOT NULL,
  value REAL NOT NULL,
  updated_at TEXT NOT NULL,
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
