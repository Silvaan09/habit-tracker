import { createLocalId, getDatabase } from '@/src/db/database';
import type { HabitSkip } from '@/src/types/Habit';

type HabitSkipRow = {
  id: string;
  habit_id: string;
  date: string;
  reason: string;
  created_at: string;
};

export async function skipHabitForDate(
  habitId: string,
  date: string,
  reason: string
): Promise<void> {
  const trimmedReason = reason.trim();

  if (!trimmedReason) {
    throw new Error('Skip reason is required.');
  }

  const db = await getDatabase();

  await db.withTransactionAsync(async () => {
    await db.runAsync(
      'DELETE FROM habit_completions WHERE habit_id = ? AND date = ?;',
      habitId,
      date
    );
    await db.runAsync(
      `INSERT OR REPLACE INTO habit_skips (
        id,
        habit_id,
        date,
        reason,
        created_at
      ) VALUES (?, ?, ?, ?, ?);`,
      createLocalId('skip'),
      habitId,
      date,
      trimmedReason,
      new Date().toISOString()
    );
  });
}

export async function unskipHabitForDate(habitId: string, date: string): Promise<void> {
  const db = await getDatabase();

  await db.runAsync('DELETE FROM habit_skips WHERE habit_id = ? AND date = ?;', habitId, date);
}

export async function getSkipsForDate(date: string): Promise<HabitSkip[]> {
  const db = await getDatabase();
  const rows = await db.getAllAsync<HabitSkipRow>(
    `SELECT id, habit_id, date, reason, created_at
    FROM habit_skips
    WHERE date = ?
    ORDER BY created_at ASC;`,
    date
  );

  return rows.map(mapSkipRow);
}

export async function getSkipsForHabit(habitId: string): Promise<HabitSkip[]> {
  const db = await getDatabase();
  const rows = await db.getAllAsync<HabitSkipRow>(
    `SELECT id, habit_id, date, reason, created_at
    FROM habit_skips
    WHERE habit_id = ?
    ORDER BY date ASC;`,
    habitId
  );

  return rows.map(mapSkipRow);
}

export async function getAllSkips(): Promise<HabitSkip[]> {
  const db = await getDatabase();
  const rows = await db.getAllAsync<HabitSkipRow>(
    `SELECT id, habit_id, date, reason, created_at
    FROM habit_skips
    ORDER BY date ASC, created_at ASC;`
  );

  return rows.map(mapSkipRow);
}

export async function deleteAllSkips(): Promise<void> {
  const db = await getDatabase();

  await db.runAsync('DELETE FROM habit_skips;');
}

function mapSkipRow(row: HabitSkipRow): HabitSkip {
  return {
    id: row.id,
    habitId: row.habit_id,
    date: row.date,
    reason: row.reason,
    createdAt: row.created_at,
  };
}
