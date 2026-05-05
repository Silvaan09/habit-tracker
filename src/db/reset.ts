import { getDatabase } from '@/src/db/database';

export async function resetAllData(): Promise<void> {
  const db = await getDatabase();

  await db.withTransactionAsync(async () => {
    await db.runAsync('DELETE FROM habit_numeric_entries;');
    await db.runAsync('DELETE FROM habit_subtask_completions;');
    await db.runAsync('DELETE FROM habit_subtasks;');
    await db.runAsync('DELETE FROM habit_skips;');
    await db.runAsync('DELETE FROM habit_completions;');
    await db.runAsync('DELETE FROM habits;');
    await db.runAsync('DELETE FROM settings;');
  });
}
