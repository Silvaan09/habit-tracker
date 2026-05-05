import { completeHabitForDate, uncompleteHabitForDate } from '@/src/db/completions';
import { createLocalId, getDatabase } from '@/src/db/database';
import type { HabitSubtask, HabitSubtaskCompletion } from '@/src/types/Habit';

type HabitSubtaskRow = {
  id: string;
  habit_id: string;
  title: string;
  position: number;
  required: number;
  archived: number;
  created_at: string;
  updated_at: string;
};

type HabitSubtaskCompletionRow = {
  id: string;
  habit_id: string;
  subtask_id: string;
  date: string;
  completed_at: string;
};

type UpdateSubtaskInput = {
  title?: string;
  position?: number;
  required?: boolean;
};

export async function createSubtask(
  habitId: string,
  title: string,
  position: number
): Promise<HabitSubtask> {
  const trimmedTitle = title.trim();

  if (!trimmedTitle) {
    throw new Error('Subtask title is required.');
  }

  const db = await getDatabase();
  const now = new Date().toISOString();
  const subtask: HabitSubtask = {
    id: createLocalId('subtask'),
    habitId,
    title: trimmedTitle,
    position,
    required: true,
    archived: false,
    createdAt: now,
    updatedAt: now,
  };

  await db.runAsync(
    `INSERT INTO habit_subtasks (
      id,
      habit_id,
      title,
      position,
      required,
      archived,
      created_at,
      updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?);`,
    subtask.id,
    subtask.habitId,
    subtask.title,
    subtask.position,
    subtask.required ? 1 : 0,
    subtask.archived ? 1 : 0,
    subtask.createdAt,
    subtask.updatedAt
  );

  return subtask;
}

export async function updateSubtask(id: string, input: UpdateSubtaskInput): Promise<void> {
  const updates: string[] = [];
  const params: (string | number)[] = [];

  if (input.title !== undefined) {
    const title = input.title.trim();

    if (!title) {
      throw new Error('Subtask title is required.');
    }

    updates.push('title = ?');
    params.push(title);
  }

  if (input.position !== undefined) {
    updates.push('position = ?');
    params.push(input.position);
  }

  if (input.required !== undefined) {
    updates.push('required = ?');
    params.push(input.required ? 1 : 0);
  }

  if (updates.length === 0) {
    return;
  }

  const db = await getDatabase();
  updates.push('updated_at = ?');
  params.push(new Date().toISOString(), id);

  await db.runAsync(`UPDATE habit_subtasks SET ${updates.join(', ')} WHERE id = ?;`, params);
}

export async function archiveSubtask(id: string): Promise<void> {
  const db = await getDatabase();

  await db.runAsync(
    'UPDATE habit_subtasks SET archived = 1, updated_at = ? WHERE id = ?;',
    new Date().toISOString(),
    id
  );
}

export async function getSubtasksForHabit(habitId: string): Promise<HabitSubtask[]> {
  const db = await getDatabase();
  const rows = await db.getAllAsync<HabitSubtaskRow>(
    `SELECT id, habit_id, title, position, required, archived, created_at, updated_at
    FROM habit_subtasks
    WHERE habit_id = ? AND archived = 0
    ORDER BY position ASC, created_at ASC;`,
    habitId
  );

  return rows.map(mapSubtaskRow);
}

export async function getAllSubtasks(): Promise<HabitSubtask[]> {
  const db = await getDatabase();
  const rows = await db.getAllAsync<HabitSubtaskRow>(
    `SELECT id, habit_id, title, position, required, archived, created_at, updated_at
    FROM habit_subtasks
    ORDER BY habit_id ASC, position ASC;`
  );

  return rows.map(mapSubtaskRow);
}

export async function completeSubtaskForDate(
  subtaskId: string,
  habitId: string,
  date: string
): Promise<void> {
  const db = await getDatabase();

  await db.runAsync(
    `INSERT OR IGNORE INTO habit_subtask_completions (
      id,
      habit_id,
      subtask_id,
      date,
      completed_at
    ) VALUES (?, ?, ?, ?, ?);`,
    createLocalId('subtask_completion'),
    habitId,
    subtaskId,
    date,
    new Date().toISOString()
  );

  await syncHabitCompletionFromSubtasks(habitId, date);
}

export async function uncompleteSubtaskForDate(subtaskId: string, date: string): Promise<void> {
  const db = await getDatabase();
  const row = await db.getFirstAsync<{ habit_id: string }>(
    'SELECT habit_id FROM habit_subtask_completions WHERE subtask_id = ? AND date = ? LIMIT 1;',
    subtaskId,
    date
  );

  await db.runAsync(
    'DELETE FROM habit_subtask_completions WHERE subtask_id = ? AND date = ?;',
    subtaskId,
    date
  );

  if (row?.habit_id) {
    await syncHabitCompletionFromSubtasks(row.habit_id, date);
  }
}

export async function getSubtaskCompletionsForHabitDate(
  habitId: string,
  date: string
): Promise<HabitSubtaskCompletion[]> {
  const db = await getDatabase();
  const rows = await db.getAllAsync<HabitSubtaskCompletionRow>(
    `SELECT id, habit_id, subtask_id, date, completed_at
    FROM habit_subtask_completions
    WHERE habit_id = ? AND date = ?
    ORDER BY completed_at ASC;`,
    habitId,
    date
  );

  return rows.map(mapSubtaskCompletionRow);
}

export async function getAllSubtaskCompletions(): Promise<HabitSubtaskCompletion[]> {
  const db = await getDatabase();
  const rows = await db.getAllAsync<HabitSubtaskCompletionRow>(
    `SELECT id, habit_id, subtask_id, date, completed_at
    FROM habit_subtask_completions
    ORDER BY date ASC, completed_at ASC;`
  );

  return rows.map(mapSubtaskCompletionRow);
}

export async function deleteAllSubtasks(): Promise<void> {
  const db = await getDatabase();

  await db.runAsync('DELETE FROM habit_subtasks;');
}

export async function deleteAllSubtaskCompletions(): Promise<void> {
  const db = await getDatabase();

  await db.runAsync('DELETE FROM habit_subtask_completions;');
}

async function syncHabitCompletionFromSubtasks(habitId: string, date: string) {
  const subtasks = await getSubtasksForHabit(habitId);
  const requiredSubtasks = subtasks.filter((subtask) => subtask.required);

  if (requiredSubtasks.length === 0) {
    await uncompleteHabitForDate(habitId, date);
    return;
  }

  const completions = await getSubtaskCompletionsForHabitDate(habitId, date);
  const completedSubtaskIds = new Set(completions.map((completion) => completion.subtaskId));
  const completed = requiredSubtasks.every((subtask) => completedSubtaskIds.has(subtask.id));

  if (completed) {
    await completeHabitForDate(habitId, date);
  } else {
    await uncompleteHabitForDate(habitId, date);
  }
}

function mapSubtaskRow(row: HabitSubtaskRow): HabitSubtask {
  return {
    id: row.id,
    habitId: row.habit_id,
    title: row.title,
    position: row.position,
    required: Boolean(row.required),
    archived: Boolean(row.archived),
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function mapSubtaskCompletionRow(row: HabitSubtaskCompletionRow): HabitSubtaskCompletion {
  return {
    id: row.id,
    habitId: row.habit_id,
    subtaskId: row.subtask_id,
    date: row.date,
    completedAt: row.completed_at,
  };
}
