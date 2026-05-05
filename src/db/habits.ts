import { createLocalId, getDatabase } from '@/src/db/database';
import type { Habit, HabitIconType } from '@/src/types/Habit';

type HabitRow = {
  id: string;
  name: string;
  description: string | null;
  icon: string | null;
  icon_type: HabitIconType | null;
  icon_value: string | null;
  icon_library: string | null;
  color: string | null;
  reminder_enabled: number;
  reminder_time: string | null;
  notification_id: string | null;
  archived: number;
  created_at: string;
  updated_at: string;
};

export type CreateHabitInput = {
  name: string;
  description?: string | null;
  icon?: string | null;
  iconType?: HabitIconType | null;
  iconValue?: string | null;
  iconLibrary?: string | null;
  color?: string | null;
  reminderEnabled?: boolean;
  reminderTime?: string | null;
  notificationId?: string | null;
};

export type UpdateHabitInput = Partial<CreateHabitInput>;

export async function createHabit(input: CreateHabitInput): Promise<Habit> {
  const name = input.name.trim();

  if (!name) {
    throw new Error('Habit name is required.');
  }

  const db = await getDatabase();
  const now = new Date().toISOString();
  const habit: Habit = {
    id: createLocalId('habit'),
    name,
    description: input.description?.trim() || null,
    icon: input.icon ?? null,
    iconType: input.iconType ?? null,
    iconValue: input.iconValue ?? input.icon ?? null,
    iconLibrary: input.iconLibrary ?? null,
    color: input.color ?? null,
    reminderEnabled: input.reminderEnabled ?? false,
    reminderTime: input.reminderTime ?? null,
    notificationId: input.notificationId ?? null,
    archived: false,
    createdAt: now,
    updatedAt: now,
  };

  await db.runAsync(
    `INSERT INTO habits (
      id,
      name,
      description,
      icon,
      icon_type,
      icon_value,
      icon_library,
      color,
      reminder_enabled,
      reminder_time,
      notification_id,
      archived,
      created_at,
      updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?);`,
    [
      habit.id,
      habit.name,
      habit.description,
      habit.icon,
      habit.iconType,
      habit.iconValue,
      habit.iconLibrary,
      habit.color,
      habit.reminderEnabled ? 1 : 0,
      habit.reminderTime,
      habit.notificationId,
      habit.archived ? 1 : 0,
      habit.createdAt,
      habit.updatedAt,
    ]
  );

  return habit;
}

export async function getActiveHabits(): Promise<Habit[]> {
  const db = await getDatabase();
  const rows = await db.getAllAsync<HabitRow>(
    `SELECT
      id,
      name,
      description,
      icon,
      icon_type,
      icon_value,
      icon_library,
      color,
      reminder_enabled,
      reminder_time,
      notification_id,
      archived,
      created_at,
      updated_at
    FROM habits
    WHERE archived = 0
    ORDER BY created_at ASC;`
  );

  return rows.map(mapHabitRow);
}

export async function getAllHabits(): Promise<Habit[]> {
  const db = await getDatabase();
  const rows = await db.getAllAsync<HabitRow>(
    `SELECT
      id,
      name,
      description,
      icon,
      icon_type,
      icon_value,
      icon_library,
      color,
      reminder_enabled,
      reminder_time,
      notification_id,
      archived,
      created_at,
      updated_at
    FROM habits
    ORDER BY created_at ASC;`
  );

  return rows.map(mapHabitRow);
}

export async function getHabitById(id: string): Promise<Habit | null> {
  const db = await getDatabase();
  const row = await db.getFirstAsync<HabitRow>(
    `SELECT
      id,
      name,
      description,
      icon,
      icon_type,
      icon_value,
      icon_library,
      color,
      reminder_enabled,
      reminder_time,
      notification_id,
      archived,
      created_at,
      updated_at
    FROM habits
    WHERE id = ?
    LIMIT 1;`,
    id
  );

  return row ? mapHabitRow(row) : null;
}

export async function updateHabit(id: string, input: UpdateHabitInput): Promise<void> {
  const db = await getDatabase();
  const updates: string[] = [];
  const params: (string | number | null)[] = [];

  if (input.name !== undefined) {
    const name = input.name.trim();

    if (!name) {
      throw new Error('Habit name is required.');
    }

    updates.push('name = ?');
    params.push(name);
  }

  if (input.icon !== undefined) {
    updates.push('icon = ?');
    params.push(input.icon);
  }

  if (input.description !== undefined) {
    updates.push('description = ?');
    params.push(input.description?.trim() || null);
  }

  if (input.iconType !== undefined) {
    updates.push('icon_type = ?');
    params.push(input.iconType);
  }

  if (input.iconValue !== undefined) {
    updates.push('icon_value = ?');
    params.push(input.iconValue);
  }

  if (input.iconLibrary !== undefined) {
    updates.push('icon_library = ?');
    params.push(input.iconLibrary);
  }

  if (input.color !== undefined) {
    updates.push('color = ?');
    params.push(input.color);
  }

  if (input.reminderEnabled !== undefined) {
    updates.push('reminder_enabled = ?');
    params.push(input.reminderEnabled ? 1 : 0);
  }

  if (input.reminderTime !== undefined) {
    updates.push('reminder_time = ?');
    params.push(input.reminderTime);
  }

  if (input.notificationId !== undefined) {
    updates.push('notification_id = ?');
    params.push(input.notificationId);
  }

  updates.push('updated_at = ?');
  params.push(new Date().toISOString(), id);

  await db.runAsync(`UPDATE habits SET ${updates.join(', ')} WHERE id = ?;`, params);
}

export async function updateHabitNotificationId(
  habitId: string,
  notificationId: string | null
): Promise<void> {
  const db = await getDatabase();

  await db.runAsync(
    'UPDATE habits SET notification_id = ?, updated_at = ? WHERE id = ?;',
    notificationId,
    new Date().toISOString(),
    habitId
  );
}

export async function archiveHabit(id: string): Promise<void> {
  const db = await getDatabase();

  await db.runAsync(
    'UPDATE habits SET archived = 1, updated_at = ? WHERE id = ?;',
    new Date().toISOString(),
    id
  );
}

export async function deleteAllHabits(): Promise<void> {
  const db = await getDatabase();

  await db.runAsync('DELETE FROM habits;');
}

function mapHabitRow(row: HabitRow): Habit {
  return {
    id: row.id,
    name: row.name,
    description: row.description,
    icon: row.icon,
    iconType: normalizeHabitIconType(row.icon_type),
    iconValue: row.icon_value ?? row.icon,
    iconLibrary: row.icon_library,
    color: row.color,
    reminderEnabled: Boolean(row.reminder_enabled),
    reminderTime: row.reminder_time,
    notificationId: row.notification_id,
    archived: Boolean(row.archived),
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function normalizeHabitIconType(iconType: string | null): HabitIconType | null {
  if (iconType === 'emoji' || iconType === 'icon') {
    return iconType;
  }

  return null;
}
