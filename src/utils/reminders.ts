export const REMINDER_TIME_VALIDATION_MESSAGE = 'Choose a time in 5-minute increments.';
export const REMINDER_MINUTE_OPTIONS = [0, 5, 10, 15, 20, 25, 30, 35, 40, 45, 50, 55];

export type ReminderTime = {
  hour: number;
  minute: number;
};

export function parseReminderTime(reminderTime: string): ReminderTime | null {
  const match = /^([01]\d|2[0-3]):([0-5]\d)$/.exec(reminderTime.trim());

  if (!match) {
    return null;
  }

  const minute = Number(match[2]);

  if (!REMINDER_MINUTE_OPTIONS.includes(minute)) {
    return null;
  }

  return {
    hour: Number(match[1]),
    minute,
  };
}

export function isValidReminderTime(reminderTime: string): boolean {
  return parseReminderTime(reminderTime) !== null;
}

export function formatReminderTime(hour: number, minute: number) {
  return `${padReminderTimePart(hour)}:${padReminderTimePart(minute)}`;
}

export function padReminderTimePart(value: number) {
  return String(value).padStart(2, '0');
}
