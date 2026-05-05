import { getDatabase } from '@/src/db/database';

export type Setting = {
  key: string;
  value: string | null;
};

export async function getAllSettings(): Promise<Setting[]> {
  const db = await getDatabase();

  return db.getAllAsync<Setting>('SELECT key, value FROM settings ORDER BY key ASC;');
}
