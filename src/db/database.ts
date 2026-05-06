import { openDatabaseAsync, type SQLiteDatabase } from 'expo-sqlite';

import {
  CREATE_HABIT_COMPLETIONS_TABLE_SQL,
  CREATE_HABIT_NUMERIC_ENTRIES_TABLE_SQL,
  CREATE_HABIT_SKIPS_TABLE_SQL,
  CREATE_HABIT_SUBTASK_COMPLETIONS_TABLE_SQL,
  CREATE_HABIT_SUBTASKS_TABLE_SQL,
  CREATE_HABITS_TABLE_SQL,
  CREATE_SETTINGS_TABLE_SQL,
} from '@/src/db/schema';

const DATABASE_NAME = 'habit-tracker.db';

let databasePromise: Promise<SQLiteDatabase> | null = null;
let initPromise: Promise<void> | null = null;

export async function getDatabase(): Promise<SQLiteDatabase> {
  if (!databasePromise) {
    databasePromise = openDatabaseAsync(DATABASE_NAME);
  }

  return databasePromise;
}

export async function initDatabase(): Promise<void> {
  if (!initPromise) {
    initPromise = setupDatabase().catch((error) => {
      initPromise = null;
      throw error;
    });
  }

  return initPromise;
}

export function createLocalId(prefix: string): string {
  if (typeof globalThis.crypto?.randomUUID === 'function') {
    return `${prefix}_${globalThis.crypto.randomUUID()}`;
  }

  const timestamp = Date.now().toString(36);
  const randomPart = Math.random().toString(36).slice(2, 12);

  return `${prefix}_${timestamp}_${randomPart}`;
}

async function setupDatabase() {
  const db = await getDatabase();

  await db.execAsync('PRAGMA foreign_keys = ON;');
  await db.execAsync(CREATE_HABITS_TABLE_SQL);
  await ensureHabitColumns(db);
  await db.execAsync(CREATE_HABIT_COMPLETIONS_TABLE_SQL);
  await db.execAsync(CREATE_HABIT_SKIPS_TABLE_SQL);
  await db.execAsync(CREATE_HABIT_SUBTASKS_TABLE_SQL);
  await db.execAsync(CREATE_HABIT_SUBTASK_COMPLETIONS_TABLE_SQL);
  await db.execAsync(CREATE_HABIT_NUMERIC_ENTRIES_TABLE_SQL);
  await db.execAsync(CREATE_SETTINGS_TABLE_SQL);
}

async function ensureHabitColumns(db: SQLiteDatabase) {
  const columns = await db.getAllAsync<{ name: string }>('PRAGMA table_info(habits);');
  const columnNames = new Set(columns.map((column) => column.name));

  const migrations = [
    { name: 'description', sql: 'ALTER TABLE habits ADD COLUMN description TEXT;' },
    { name: 'icon_type', sql: 'ALTER TABLE habits ADD COLUMN icon_type TEXT;' },
    { name: 'icon_value', sql: 'ALTER TABLE habits ADD COLUMN icon_value TEXT;' },
    { name: 'icon_library', sql: 'ALTER TABLE habits ADD COLUMN icon_library TEXT;' },
    { name: 'notification_id', sql: 'ALTER TABLE habits ADD COLUMN notification_id TEXT;' },
    {
      name: 'schedule_type',
      sql: "ALTER TABLE habits ADD COLUMN schedule_type TEXT NOT NULL DEFAULT 'daily';",
    },
    { name: 'schedule_weekdays', sql: 'ALTER TABLE habits ADD COLUMN schedule_weekdays TEXT;' },
    {
      name: 'schedule_interval_days',
      sql: 'ALTER TABLE habits ADD COLUMN schedule_interval_days INTEGER;',
    },
    { name: 'schedule_start_date', sql: 'ALTER TABLE habits ADD COLUMN schedule_start_date TEXT;' },
    {
      name: 'tracking_type',
      sql: "ALTER TABLE habits ADD COLUMN tracking_type TEXT NOT NULL DEFAULT 'checkbox';",
    },
    { name: 'target_value', sql: 'ALTER TABLE habits ADD COLUMN target_value REAL;' },
    { name: 'target_unit', sql: 'ALTER TABLE habits ADD COLUMN target_unit TEXT;' },
    {
      name: 'today_layout_size',
      sql: "ALTER TABLE habits ADD COLUMN today_layout_size TEXT NOT NULL DEFAULT 'auto';",
    },
    {
      name: 'today_layout_order',
      sql: 'ALTER TABLE habits ADD COLUMN today_layout_order INTEGER NOT NULL DEFAULT 0;',
    },
  ];

  for (const migration of migrations) {
    if (!columnNames.has(migration.name)) {
      await db.execAsync(migration.sql);
    }
  }
}
