import { getDatabase } from '@/src/db/database';

export type Setting = {
  key: string;
  value: string | null;
};

export async function getAllSettings(): Promise<Setting[]> {
  const db = await getDatabase();

  return db.getAllAsync<Setting>('SELECT key, value FROM settings ORDER BY key ASC;');
}

export async function getSettingValue(key: string): Promise<string | null> {
  const db = await getDatabase();
  const row = await db.getFirstAsync<Setting>(
    'SELECT key, value FROM settings WHERE key = ? LIMIT 1;',
    key
  );

  return row?.value ?? null;
}

export async function setSettingValue(key: string, value: string | null): Promise<void> {
  const db = await getDatabase();

  await db.runAsync(
    `INSERT INTO settings (key, value)
    VALUES (?, ?)
    ON CONFLICT(key) DO UPDATE SET value = excluded.value;`,
    key,
    value
  );
}
