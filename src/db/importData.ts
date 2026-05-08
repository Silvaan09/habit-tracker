import { getDatabase } from '@/src/db/database';
import type {
  Habit,
  HabitCardLayoutSize,
  HabitCompletion,
  HabitIconType,
  HabitNumericEntry,
  HabitScheduleType,
  HabitSkip,
  HabitSubtask,
  HabitSubtaskCompletion,
  HabitTrackingType,
} from '@/src/types/Habit';

type ImportedSetting = {
  key: string;
  value: string | null;
};

export type ImportedLocalData = {
  habits: Habit[];
  habit_completions: HabitCompletion[];
  habit_skips: HabitSkip[];
  habit_subtasks: HabitSubtask[];
  habit_subtask_completions: HabitSubtaskCompletion[];
  habit_numeric_entries: HabitNumericEntry[];
  settings: ImportedSetting[];
};

const REQUIRED_ARRAY_KEYS = [
  'habits',
  'habit_completions',
  'habit_skips',
  'habit_subtasks',
  'habit_subtask_completions',
  'habit_numeric_entries',
  'settings',
] as const;

export function parseImportedLocalData(jsonText: string): ImportedLocalData {
  let parsedJson: unknown;

  try {
    parsedJson = JSON.parse(jsonText);
  } catch {
    throw new Error('Invalid JSON. Paste the full export JSON and try again.');
  }

  if (!isRecord(parsedJson)) {
    throw new Error('Import must be a JSON object.');
  }

  for (const key of REQUIRED_ARRAY_KEYS) {
    if (!Array.isArray(parsedJson[key])) {
      throw new Error(`Import is missing "${key}".`);
    }
  }

  const data: ImportedLocalData = {
    habits: getImportArray(parsedJson, 'habits').map(parseHabit),
    habit_completions: getImportArray(parsedJson, 'habit_completions').map(parseCompletion),
    habit_skips: getImportArray(parsedJson, 'habit_skips').map(parseSkip),
    habit_subtasks: getImportArray(parsedJson, 'habit_subtasks').map(parseSubtask),
    habit_subtask_completions: getImportArray(parsedJson, 'habit_subtask_completions').map(
      parseSubtaskCompletion
    ),
    habit_numeric_entries: getImportArray(parsedJson, 'habit_numeric_entries').map(
      parseNumericEntry
    ),
    settings: getImportArray(parsedJson, 'settings').map(parseSetting),
  };

  validateRelationships(data);

  return data;
}

function getImportArray(
  parsedJson: Record<string, unknown>,
  key: (typeof REQUIRED_ARRAY_KEYS)[number]
): unknown[] {
  const value = parsedJson[key];

  if (!Array.isArray(value)) {
    throw new Error(`Import is missing "${key}".`);
  }

  return value;
}

export async function replaceAllDataWithImportedData(data: ImportedLocalData): Promise<void> {
  const db = await getDatabase();

  await db.withTransactionAsync(async () => {
    await db.runAsync('DELETE FROM habit_numeric_entries;');
    await db.runAsync('DELETE FROM habit_subtask_completions;');
    await db.runAsync('DELETE FROM habit_subtasks;');
    await db.runAsync('DELETE FROM habit_skips;');
    await db.runAsync('DELETE FROM habit_completions;');
    await db.runAsync('DELETE FROM habits;');
    await db.runAsync('DELETE FROM settings;');

    for (const habit of data.habits) {
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
          0,
          habit.reminderTime,
          null,
          habit.scheduleType,
          habit.scheduleWeekdays ? JSON.stringify(habit.scheduleWeekdays) : null,
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
    }

    for (const completion of data.habit_completions) {
      await db.runAsync(
        `INSERT INTO habit_completions (id, habit_id, date, completed_at)
        VALUES (?, ?, ?, ?);`,
        completion.id,
        completion.habitId,
        completion.date,
        completion.completedAt
      );
    }

    for (const skip of data.habit_skips) {
      await db.runAsync(
        `INSERT INTO habit_skips (id, habit_id, date, reason, created_at)
        VALUES (?, ?, ?, ?, ?);`,
        skip.id,
        skip.habitId,
        skip.date,
        skip.reason,
        skip.createdAt
      );
    }

    for (const subtask of data.habit_subtasks) {
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
    }

    for (const completion of data.habit_subtask_completions) {
      await db.runAsync(
        `INSERT INTO habit_subtask_completions (
          id,
          habit_id,
          subtask_id,
          date,
          completed_at
        ) VALUES (?, ?, ?, ?, ?);`,
        completion.id,
        completion.habitId,
        completion.subtaskId,
        completion.date,
        completion.completedAt
      );
    }

    for (const entry of data.habit_numeric_entries) {
      await db.runAsync(
        `INSERT INTO habit_numeric_entries (id, habit_id, date, value, updated_at)
        VALUES (?, ?, ?, ?, ?);`,
        entry.id,
        entry.habitId,
        entry.date,
        entry.value,
        entry.updatedAt
      );
    }

    for (const setting of data.settings) {
      await db.runAsync(
        `INSERT INTO settings (key, value)
        VALUES (?, ?);`,
        setting.key,
        setting.value
      );
    }
  });
}

function parseHabit(value: unknown): Habit {
  const row = requireRecord(value, 'habit');
  const now = new Date().toISOString();

  return {
    id: requireString(row.id, 'habit.id'),
    name: requireString(row.name, 'habit.name'),
    description: optionalString(row.description),
    icon: optionalString(row.icon),
    iconType: parseIconType(row.iconType),
    iconValue: optionalString(row.iconValue),
    iconLibrary: optionalString(row.iconLibrary),
    color: optionalString(row.color),
    reminderEnabled: false,
    reminderTime: optionalString(row.reminderTime),
    notificationId: null,
    scheduleType: parseScheduleType(row.scheduleType),
    scheduleWeekdays: parseWeekdays(row.scheduleWeekdays),
    scheduleIntervalDays: optionalPositiveInteger(row.scheduleIntervalDays),
    scheduleOnDays: parseScheduleOnDays(row.scheduleOnDays, row.scheduleIntervalDays),
    scheduleOffDays: parseScheduleOffDays(row.scheduleOffDays, row.scheduleIntervalDays),
    scheduleStartDate: optionalDateString(row.scheduleStartDate),
    trackingType: parseTrackingType(row.trackingType),
    targetValue: optionalPositiveNumber(row.targetValue),
    targetUnit: optionalString(row.targetUnit),
    todayLayoutSize: parseTodayLayoutSize(row.todayLayoutSize),
    todayLayoutOrder: optionalInteger(row.todayLayoutOrder),
    archived: optionalBoolean(row.archived),
    createdAt: optionalString(row.createdAt) ?? now,
    updatedAt: optionalString(row.updatedAt) ?? now,
  };
}

function parseCompletion(value: unknown): HabitCompletion {
  const row = requireRecord(value, 'completion');

  return {
    id: requireString(row.id, 'completion.id'),
    habitId: requireString(row.habitId, 'completion.habitId'),
    date: requireDateString(row.date, 'completion.date'),
    completedAt: requireString(row.completedAt, 'completion.completedAt'),
  };
}

function parseSkip(value: unknown): HabitSkip {
  const row = requireRecord(value, 'skip');

  return {
    id: requireString(row.id, 'skip.id'),
    habitId: requireString(row.habitId, 'skip.habitId'),
    date: requireDateString(row.date, 'skip.date'),
    reason: requireString(row.reason, 'skip.reason'),
    createdAt: requireString(row.createdAt, 'skip.createdAt'),
  };
}

function parseSubtask(value: unknown): HabitSubtask {
  const row = requireRecord(value, 'subtask');

  return {
    id: requireString(row.id, 'subtask.id'),
    habitId: requireString(row.habitId, 'subtask.habitId'),
    title: requireString(row.title, 'subtask.title'),
    position: requireNumber(row.position, 'subtask.position'),
    required: optionalBoolean(row.required, true),
    archived: optionalBoolean(row.archived),
    createdAt: requireString(row.createdAt, 'subtask.createdAt'),
    updatedAt: requireString(row.updatedAt, 'subtask.updatedAt'),
  };
}

function parseSubtaskCompletion(value: unknown): HabitSubtaskCompletion {
  const row = requireRecord(value, 'subtask completion');

  return {
    id: requireString(row.id, 'subtaskCompletion.id'),
    habitId: requireString(row.habitId, 'subtaskCompletion.habitId'),
    subtaskId: requireString(row.subtaskId, 'subtaskCompletion.subtaskId'),
    date: requireDateString(row.date, 'subtaskCompletion.date'),
    completedAt: requireString(row.completedAt, 'subtaskCompletion.completedAt'),
  };
}

function parseNumericEntry(value: unknown): HabitNumericEntry {
  const row = requireRecord(value, 'numeric entry');

  return {
    id: requireString(row.id, 'numericEntry.id'),
    habitId: requireString(row.habitId, 'numericEntry.habitId'),
    date: requireDateString(row.date, 'numericEntry.date'),
    value: requireNumber(row.value, 'numericEntry.value'),
    updatedAt: requireString(row.updatedAt, 'numericEntry.updatedAt'),
  };
}

function parseSetting(value: unknown): ImportedSetting {
  const row = requireRecord(value, 'setting');

  return {
    key: requireString(row.key, 'setting.key'),
    value: optionalString(row.value),
  };
}

function validateRelationships(data: ImportedLocalData) {
  const habitIds = new Set(data.habits.map((habit) => habit.id));
  const subtaskIds = new Set(data.habit_subtasks.map((subtask) => subtask.id));

  for (const completion of data.habit_completions) {
    requireKnownId(habitIds, completion.habitId, 'completion.habitId');
  }

  for (const skip of data.habit_skips) {
    requireKnownId(habitIds, skip.habitId, 'skip.habitId');
  }

  for (const subtask of data.habit_subtasks) {
    requireKnownId(habitIds, subtask.habitId, 'subtask.habitId');
  }

  for (const completion of data.habit_subtask_completions) {
    requireKnownId(habitIds, completion.habitId, 'subtaskCompletion.habitId');
    requireKnownId(subtaskIds, completion.subtaskId, 'subtaskCompletion.subtaskId');
  }

  for (const entry of data.habit_numeric_entries) {
    requireKnownId(habitIds, entry.habitId, 'numericEntry.habitId');
  }
}

function requireKnownId(knownIds: Set<string>, value: string, field: string) {
  if (!knownIds.has(value)) {
    throw new Error(`Import has an unknown ${field}.`);
  }
}

function parseIconType(value: unknown): HabitIconType | null {
  return value === 'emoji' || value === 'icon' ? value : null;
}

function parseScheduleType(value: unknown): HabitScheduleType {
  if (value === 'weekdays' || value === 'cycle') {
    return value;
  }

  if (value === 'interval') {
    return 'cycle';
  }

  return 'daily';
}

function parseTrackingType(value: unknown): HabitTrackingType {
  return value === 'subtasks' || value === 'numeric' ? value : 'checkbox';
}

function parseTodayLayoutSize(value: unknown): HabitCardLayoutSize {
  return value === 'small' || value === 'tall' || value === 'wide' || value === 'large'
    ? value
    : 'auto';
}

function parseWeekdays(value: unknown): number[] | null {
  if (!Array.isArray(value)) {
    return null;
  }

  const weekdays = Array.from(new Set(value))
    .filter((day): day is number => Number.isInteger(day) && day >= 1 && day <= 7)
    .sort((first, second) => first - second);

  return weekdays.length > 0 ? weekdays : null;
}

function optionalPositiveInteger(value: unknown): number | null {
  return Number.isInteger(value) && Number(value) > 0 ? Number(value) : null;
}

function parseScheduleOnDays(value: unknown, legacyIntervalValue: unknown): number | null {
  if (Number.isInteger(value) && Number(value) >= 1) {
    return Number(value);
  }

  if (Number.isInteger(legacyIntervalValue) && Number(legacyIntervalValue) >= 1) {
    return 1;
  }

  return null;
}

function parseScheduleOffDays(value: unknown, legacyIntervalValue: unknown): number | null {
  if (Number.isInteger(value) && Number(value) >= 0) {
    return Number(value);
  }

  if (Number.isInteger(legacyIntervalValue) && Number(legacyIntervalValue) >= 1) {
    return Math.max(Number(legacyIntervalValue) - 1, 0);
  }

  return null;
}

function optionalInteger(value: unknown): number {
  return Number.isInteger(value) ? Number(value) : 0;
}

function optionalPositiveNumber(value: unknown): number | null {
  return typeof value === 'number' && Number.isFinite(value) && value > 0 ? value : null;
}

function optionalDateString(value: unknown): string | null {
  return typeof value === 'string' && isDateString(value) ? value : null;
}

function optionalBoolean(value: unknown, fallback = false): boolean {
  return typeof value === 'boolean' ? value : fallback;
}

function optionalString(value: unknown): string | null {
  return typeof value === 'string' ? value : null;
}

function requireDateString(value: unknown, field: string): string {
  const dateString = requireString(value, field);

  if (!isDateString(dateString)) {
    throw new Error(`Import has an invalid ${field}.`);
  }

  return dateString;
}

function requireString(value: unknown, field: string): string {
  if (typeof value !== 'string' || value.trim().length === 0) {
    throw new Error(`Import has an invalid ${field}.`);
  }

  return value;
}

function requireNumber(value: unknown, field: string): number {
  if (typeof value !== 'number' || !Number.isFinite(value)) {
    throw new Error(`Import has an invalid ${field}.`);
  }

  return value;
}

function requireRecord(value: unknown, label: string): Record<string, unknown> {
  if (!isRecord(value)) {
    throw new Error(`Import has an invalid ${label}.`);
  }

  return value;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function isDateString(value: string) {
  return /^\d{4}-\d{2}-\d{2}$/.test(value);
}
