import { createLocalId, getDatabase } from '@/src/db/database';
import type {
  Habit,
  HabitCardLayoutSize,
  HabitIconType,
  HabitScheduleType,
  HabitTrackingType,
} from '@/src/types/Habit';
import { getTodayDateString } from '@/src/utils/dates';

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
  schedule_type: string | null;
  schedule_weekdays: string | null;
  schedule_interval_days: number | null;
  schedule_on_days: number | null;
  schedule_off_days: number | null;
  schedule_start_date: string | null;
  tracking_type: string | null;
  target_value: number | null;
  target_unit: string | null;
  today_layout_size: string | null;
  today_layout_order: number | null;
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
  scheduleType?: HabitScheduleType;
  scheduleWeekdays?: number[] | null;
  scheduleIntervalDays?: number | null;
  scheduleOnDays?: number | null;
  scheduleOffDays?: number | null;
  scheduleStartDate?: string | null;
  trackingType?: HabitTrackingType;
  targetValue?: number | null;
  targetUnit?: string | null;
  todayLayoutSize?: HabitCardLayoutSize;
  todayLayoutOrder?: number;
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
    scheduleType: normalizeScheduleType(input.scheduleType ?? 'daily'),
    scheduleWeekdays: normalizeScheduleWeekdays(input.scheduleWeekdays),
    scheduleIntervalDays: normalizeScheduleIntervalDays(input.scheduleIntervalDays),
    scheduleOnDays: normalizeScheduleOnDays(input.scheduleOnDays, input.scheduleIntervalDays),
    scheduleOffDays: normalizeScheduleOffDays(input.scheduleOffDays, input.scheduleIntervalDays),
    scheduleStartDate: input.scheduleStartDate ?? getTodayDateString(),
    trackingType: input.trackingType ?? 'checkbox',
    targetValue: normalizeTargetValue(input.targetValue),
    targetUnit: input.targetUnit?.trim() || null,
    todayLayoutSize: normalizeTodayLayoutSize(input.todayLayoutSize),
    todayLayoutOrder: normalizeTodayLayoutOrder(input.todayLayoutOrder),
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
      schedule_type,
      schedule_weekdays,
      schedule_interval_days,
      schedule_on_days,
      schedule_off_days,
      schedule_start_date,
      tracking_type,
      target_value,
      target_unit,
      today_layout_size,
      today_layout_order,
      archived,
      created_at,
      updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?);`,
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
      habit.scheduleType,
      serializeScheduleWeekdays(habit.scheduleWeekdays),
      habit.scheduleIntervalDays,
      habit.scheduleOnDays,
      habit.scheduleOffDays,
      habit.scheduleStartDate,
      habit.trackingType,
      habit.targetValue,
      habit.targetUnit,
      habit.todayLayoutSize,
      habit.todayLayoutOrder,
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
      schedule_type,
      schedule_weekdays,
      schedule_interval_days,
      schedule_on_days,
      schedule_off_days,
      schedule_start_date,
      tracking_type,
      target_value,
      target_unit,
      today_layout_size,
      today_layout_order,
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
      schedule_type,
      schedule_weekdays,
      schedule_interval_days,
      schedule_on_days,
      schedule_off_days,
      schedule_start_date,
      tracking_type,
      target_value,
      target_unit,
      today_layout_size,
      today_layout_order,
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
      schedule_type,
      schedule_weekdays,
      schedule_interval_days,
      schedule_on_days,
      schedule_off_days,
      schedule_start_date,
      tracking_type,
      target_value,
      target_unit,
      today_layout_size,
      today_layout_order,
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

  if (input.scheduleType !== undefined) {
    updates.push('schedule_type = ?');
    params.push(input.scheduleType);
  }

  if (input.scheduleWeekdays !== undefined) {
    updates.push('schedule_weekdays = ?');
    params.push(serializeScheduleWeekdays(normalizeScheduleWeekdays(input.scheduleWeekdays)));
  }

  if (input.scheduleIntervalDays !== undefined) {
    updates.push('schedule_interval_days = ?');
    params.push(normalizeScheduleIntervalDays(input.scheduleIntervalDays));
  }

  if (input.scheduleOnDays !== undefined) {
    updates.push('schedule_on_days = ?');
    params.push(normalizeScheduleOnDays(input.scheduleOnDays, input.scheduleIntervalDays));
  }

  if (input.scheduleOffDays !== undefined) {
    updates.push('schedule_off_days = ?');
    params.push(normalizeScheduleOffDays(input.scheduleOffDays, input.scheduleIntervalDays));
  }

  if (input.scheduleStartDate !== undefined) {
    updates.push('schedule_start_date = ?');
    params.push(input.scheduleStartDate);
  }

  if (input.trackingType !== undefined) {
    updates.push('tracking_type = ?');
    params.push(input.trackingType);
  }

  if (input.targetValue !== undefined) {
    updates.push('target_value = ?');
    params.push(normalizeTargetValue(input.targetValue));
  }

  if (input.targetUnit !== undefined) {
    updates.push('target_unit = ?');
    params.push(input.targetUnit?.trim() || null);
  }

  if (input.todayLayoutSize !== undefined) {
    updates.push('today_layout_size = ?');
    params.push(normalizeTodayLayoutSize(input.todayLayoutSize));
  }

  if (input.todayLayoutOrder !== undefined) {
    updates.push('today_layout_order = ?');
    params.push(normalizeTodayLayoutOrder(input.todayLayoutOrder));
  }

  updates.push('updated_at = ?');
  params.push(new Date().toISOString(), id);

  await db.runAsync(`UPDATE habits SET ${updates.join(', ')} WHERE id = ?;`, params);
}

export async function updateHabitLayout(
  habitId: string,
  input: {
    todayLayoutSize?: HabitCardLayoutSize;
    todayLayoutOrder?: number;
  }
): Promise<void> {
  await updateHabit(habitId, input);
}

export async function updateHabitLayoutOrder(
  habitOrders: { habitId: string; order: number }[]
): Promise<void> {
  if (habitOrders.length === 0) {
    return;
  }

  const db = await getDatabase();
  const updatedAt = new Date().toISOString();

  await db.withTransactionAsync(async () => {
    for (const habitOrder of habitOrders) {
      await db.runAsync(
        'UPDATE habits SET today_layout_order = ?, updated_at = ? WHERE id = ?;',
        normalizeTodayLayoutOrder(habitOrder.order),
        updatedAt,
        habitOrder.habitId
      );
    }
  });
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

export async function updateHabitReminder(
  habitId: string,
  input: {
    reminderEnabled: boolean;
    reminderTime: string | null;
    notificationId: string | null;
  }
): Promise<void> {
  const db = await getDatabase();

  await db.runAsync(
    `UPDATE habits
     SET reminder_enabled = ?, reminder_time = ?, notification_id = ?, updated_at = ?
     WHERE id = ?;`,
    input.reminderEnabled ? 1 : 0,
    input.reminderTime,
    input.notificationId,
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
    scheduleType: normalizeScheduleType(row.schedule_type),
    scheduleWeekdays: parseScheduleWeekdays(row.schedule_weekdays),
    scheduleIntervalDays: normalizeScheduleIntervalDays(row.schedule_interval_days),
    scheduleOnDays: normalizeScheduleOnDays(row.schedule_on_days, row.schedule_interval_days),
    scheduleOffDays: normalizeScheduleOffDays(row.schedule_off_days, row.schedule_interval_days),
    scheduleStartDate: row.schedule_start_date,
    trackingType: normalizeTrackingType(row.tracking_type),
    targetValue: normalizeTargetValue(row.target_value),
    targetUnit: row.target_unit,
    todayLayoutSize: normalizeTodayLayoutSize(row.today_layout_size),
    todayLayoutOrder: normalizeTodayLayoutOrder(row.today_layout_order),
    archived: Boolean(row.archived),
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function normalizeScheduleType(scheduleType: string | null): HabitScheduleType {
  if (scheduleType === 'weekdays' || scheduleType === 'cycle') {
    return scheduleType;
  }

  if (scheduleType === 'interval') {
    return 'cycle';
  }

  return 'daily';
}

function normalizeScheduleWeekdays(weekdays: number[] | null | undefined) {
  if (!weekdays) {
    return null;
  }

  const normalizedWeekdays = Array.from(new Set(weekdays))
    .filter((weekday) => Number.isInteger(weekday) && weekday >= 1 && weekday <= 7)
    .sort((a, b) => a - b);

  return normalizedWeekdays.length > 0 ? normalizedWeekdays : null;
}

function serializeScheduleWeekdays(weekdays: number[] | null) {
  return weekdays ? JSON.stringify(weekdays) : null;
}

function parseScheduleWeekdays(value: string | null) {
  if (!value) {
    return null;
  }

  try {
    const parsedValue = JSON.parse(value);

    return Array.isArray(parsedValue) ? normalizeScheduleWeekdays(parsedValue) : null;
  } catch {
    return null;
  }
}

function normalizeScheduleIntervalDays(intervalDays: number | null | undefined) {
  if (!Number.isInteger(intervalDays) || !intervalDays || intervalDays < 1) {
    return null;
  }

  return intervalDays;
}

function normalizeScheduleOnDays(
  onDays: number | null | undefined,
  legacyIntervalDays?: number | null
) {
  if (Number.isInteger(onDays) && Number(onDays) >= 1) {
    return Number(onDays);
  }

  if (Number.isInteger(legacyIntervalDays) && Number(legacyIntervalDays) >= 1) {
    return 1;
  }

  return null;
}

function normalizeScheduleOffDays(
  offDays: number | null | undefined,
  legacyIntervalDays?: number | null
) {
  if (Number.isInteger(offDays) && Number(offDays) >= 0) {
    return Number(offDays);
  }

  if (Number.isInteger(legacyIntervalDays) && Number(legacyIntervalDays) >= 1) {
    return Math.max(Number(legacyIntervalDays) - 1, 0);
  }

  return null;
}

function normalizeHabitIconType(iconType: string | null): HabitIconType | null {
  if (iconType === 'emoji' || iconType === 'icon') {
    return iconType;
  }

  return null;
}

function normalizeTrackingType(trackingType: string | null): HabitTrackingType {
  if (trackingType === 'subtasks' || trackingType === 'numeric') {
    return trackingType;
  }

  return 'checkbox';
}

function normalizeTodayLayoutSize(
  layoutSize: HabitCardLayoutSize | string | null | undefined
): HabitCardLayoutSize {
  if (
    layoutSize === 'small' ||
    layoutSize === 'tall' ||
    layoutSize === 'wide' ||
    layoutSize === 'large'
  ) {
    return layoutSize;
  }

  return 'auto';
}

function normalizeTodayLayoutOrder(order: number | null | undefined) {
  return Number.isInteger(order) ? Number(order) : 0;
}

function normalizeTargetValue(targetValue: number | null | undefined) {
  if (typeof targetValue !== 'number' || !Number.isFinite(targetValue) || targetValue <= 0) {
    return null;
  }

  return targetValue;
}
