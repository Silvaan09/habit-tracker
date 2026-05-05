import { createLocalId, getDatabase } from '@/src/db/database';
import type { HabitCompletion } from '@/src/types/Habit';

type HabitCompletionRow = {
  id: string;
  habit_id: string;
  date: string;
  completed_at: string;
};

export async function completeHabitForDate(habitId: string, date: string): Promise<void> {
  const db = await getDatabase();

  await db.withTransactionAsync(async () => {
    await db.runAsync('DELETE FROM habit_skips WHERE habit_id = ? AND date = ?;', habitId, date);
    await db.runAsync(
      `INSERT OR IGNORE INTO habit_completions (
        id,
        habit_id,
        date,
        completed_at
      ) VALUES (?, ?, ?, ?);`,
      createLocalId('completion'),
      habitId,
      date,
      new Date().toISOString()
    );
  });
}

export async function uncompleteHabitForDate(habitId: string, date: string): Promise<void> {
  const db = await getDatabase();

  await db.runAsync(
    'DELETE FROM habit_completions WHERE habit_id = ? AND date = ?;',
    habitId,
    date
  );
}

export async function getCompletionsForDate(date: string): Promise<HabitCompletion[]> {
  const db = await getDatabase();
  const rows = await db.getAllAsync<HabitCompletionRow>(
    `SELECT id, habit_id, date, completed_at
    FROM habit_completions
    WHERE date = ?
    ORDER BY completed_at ASC;`,
    date
  );

  return rows.map(mapCompletionRow);
}

export async function getCompletionsForHabit(habitId: string): Promise<HabitCompletion[]> {
  const db = await getDatabase();
  const rows = await db.getAllAsync<HabitCompletionRow>(
    `SELECT id, habit_id, date, completed_at
    FROM habit_completions
    WHERE habit_id = ?
    ORDER BY date ASC;`,
    habitId
  );

  return rows.map(mapCompletionRow);
}

export async function getAllCompletions(): Promise<HabitCompletion[]> {
  const db = await getDatabase();
  const rows = await db.getAllAsync<HabitCompletionRow>(
    `SELECT id, habit_id, date, completed_at
    FROM habit_completions
    ORDER BY date ASC, completed_at ASC;`
  );

  return rows.map(mapCompletionRow);
}

export async function deleteAllCompletions(): Promise<void> {
  const db = await getDatabase();

  await db.runAsync('DELETE FROM habit_completions;');
}

function mapCompletionRow(row: HabitCompletionRow): HabitCompletion {
  return {
    id: row.id,
    habitId: row.habit_id,
    date: row.date,
    completedAt: row.completed_at,
  };
}
