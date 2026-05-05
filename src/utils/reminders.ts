export const REMINDER_TIME_VALIDATION_MESSAGE = 'Use 24-hour time like 08:00 or 21:30.';

export type ReminderTime = {
  hour: number;
  minute: number;
};

export function parseReminderTime(reminderTime: string): ReminderTime | null {
  const match = /^([01]\d|2[0-3]):([0-5]\d)$/.exec(reminderTime.trim());

  if (!match) {
    return null;
  }

  return {
    hour: Number(match[1]),
    minute: Number(match[2]),
  };
}

export function isValidReminderTime(reminderTime: string): boolean {
  return parseReminderTime(reminderTime) !== null;
}
