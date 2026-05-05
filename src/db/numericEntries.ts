import { completeHabitForDate, uncompleteHabitForDate } from '@/src/db/completions';
import { createLocalId, getDatabase } from '@/src/db/database';
import { getHabitById } from '@/src/db/habits';
import type { HabitNumericEntry } from '@/src/types/Habit';

type HabitNumericEntryRow = {
  id: string;
  habit_id: string;
  date: string;
  value: number;
  updated_at: string;
};

export async function setNumericEntryForDate(
  habitId: string,
  date: string,
  value: number
): Promise<void> {
  const normalizedValue = Number.isFinite(value) ? Math.max(value, 0) : 0;
  const db = await getDatabase();
  const now = new Date().toISOString();

  await db.runAsync(
    `INSERT INTO habit_numeric_entries (
      id,
      habit_id,
      date,
      value,
      updated_at
    ) VALUES (?, ?, ?, ?, ?)
    ON CONFLICT(habit_id, date) DO UPDATE SET
      value = excluded.value,
      updated_at = excluded.updated_at;`,
    createLocalId('numeric_entry'),
    habitId,
    date,
    normalizedValue,
    now
  );

  await syncHabitCompletionFromNumericEntry(habitId, date, normalizedValue);
}

export async function getNumericEntryForDate(
  habitId: string,
  date: string
): Promise<HabitNumericEntry | null> {
  const db = await getDatabase();
  const row = await db.getFirstAsync<HabitNumericEntryRow>(
    `SELECT id, habit_id, date, value, updated_at
    FROM habit_numeric_entries
    WHERE habit_id = ? AND date = ?
    LIMIT 1;`,
    habitId,
    date
  );

  return row ? mapNumericEntryRow(row) : null;
}

export async function getNumericEntriesForHabit(habitId: string): Promise<HabitNumericEntry[]> {
  const db = await getDatabase();
  const rows = await db.getAllAsync<HabitNumericEntryRow>(
    `SELECT id, habit_id, date, value, updated_at
    FROM habit_numeric_entries
    WHERE habit_id = ?
    ORDER BY date ASC;`,
    habitId
  );

  return rows.map(mapNumericEntryRow);
}

export async function getAllNumericEntries(): Promise<HabitNumericEntry[]> {
  const db = await getDatabase();
  const rows = await db.getAllAsync<HabitNumericEntryRow>(
    `SELECT id, habit_id, date, value, updated_at
    FROM habit_numeric_entries
    ORDER BY date ASC, updated_at ASC;`
  );

  return rows.map(mapNumericEntryRow);
}

export async function deleteAllNumericEntries(): Promise<void> {
  const db = await getDatabase();

  await db.runAsync('DELETE FROM habit_numeric_entries;');
}

async function syncHabitCompletionFromNumericEntry(
  habitId: string,
  date: string,
  value: number
) {
  const habit = await getHabitById(habitId);
  const targetValue = habit?.targetValue;

  if (!targetValue || value < targetValue) {
    await uncompleteHabitForDate(habitId, date);
    return;
  }

  await completeHabitForDate(habitId, date);
}

function mapNumericEntryRow(row: HabitNumericEntryRow): HabitNumericEntry {
  return {
    id: row.id,
    habitId: row.habit_id,
    date: row.date,
    value: row.value,
    updatedAt: row.updated_at,
  };
}
