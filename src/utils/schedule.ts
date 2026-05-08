import type { Habit } from '@/src/types/Habit';

export function isHabitScheduledForDate(habit: Habit, date: string): boolean {
  const scheduleStartDate = getHabitScheduleStartDate(habit);

  if (date < scheduleStartDate) {
    return false;
  }

  if (habit.scheduleType === 'weekdays') {
    const weekdays = habit.scheduleWeekdays ?? [];

    return weekdays.includes(getWeekdayNumber(date));
  }

  if (habit.scheduleType === 'cycle' || habit.scheduleType === 'interval') {
    const onDays = habit.scheduleOnDays ?? 1;
    const offDays =
      habit.scheduleOffDays ??
      (habit.scheduleIntervalDays ? Math.max(habit.scheduleIntervalDays - 1, 0) : 0);
    const cycleLength = onDays + offDays;

    if (onDays < 1 || offDays < 0 || cycleLength < 1) {
      return false;
    }

    return differenceInCalendarDaysLocal(scheduleStartDate, date) % cycleLength < onDays;
  }

  return true;
}

export function getScheduledHabitsForDate(habits: Habit[], date: string): Habit[] {
  return habits.filter((habit) => isHabitScheduledForDate(habit, date));
}

export function getScheduledDatesForHabit(habit: Habit, start: string, end: string): string[] {
  if (end < start) {
    return [];
  }

  const totalDays = differenceInCalendarDaysLocal(start, end) + 1;

  return Array.from({ length: totalDays }, (_, index) => addDaysLocal(start, index))
    .filter((date) => isHabitScheduledForDate(habit, date));
}

export function calculateScheduleAwareCompletionRate(
  habit: Habit,
  completionDates: string[],
  today: string,
  skippedDates: string[] = []
): number {
  const startDate = getHabitAnalyticsStartDate(habit, completionDates, skippedDates);
  const scheduledDates = getScheduledDatesForHabit(habit, startDate, today);
  const skippedDateSet = new Set(skippedDates);
  const trackableScheduledDates = scheduledDates.filter((date) => !skippedDateSet.has(date));

  if (trackableScheduledDates.length === 0) {
    return 0;
  }

  const scheduledDateSet = new Set(trackableScheduledDates);
  const completedScheduledDays = Array.from(new Set(completionDates))
    .filter((date) => scheduledDateSet.has(date)).length;

  return Math.min(completedScheduledDays / trackableScheduledDates.length, 1);
}

function getHabitAnalyticsStartDate(
  habit: Habit,
  completionDates: string[] = [],
  skippedDates: string[] = []
): string {
  return [getHabitScheduleStartDate(habit), ...completionDates, ...skippedDates]
    .filter(isDateString)
    .sort()[0];
}

function getHabitScheduleStartDate(habit: Habit) {
  return habit.scheduleStartDate ?? getLocalDateStringFromValue(habit.createdAt);
}

export function getWeekdayNumber(date: string): number {
  const [year, month, day] = date.split('-').map(Number);
  const jsWeekday = new Date(year, month - 1, day).getDay();

  return jsWeekday === 0 ? 7 : jsWeekday;
}

function addDaysLocal(date: string, days: number): string {
  const parsedDate = parseDateString(date);

  parsedDate.setDate(parsedDate.getDate() + days);

  const year = parsedDate.getFullYear();
  const month = String(parsedDate.getMonth() + 1).padStart(2, '0');
  const day = String(parsedDate.getDate()).padStart(2, '0');

  return `${year}-${month}-${day}`;
}

export function differenceInCalendarDaysLocal(start: string, end: string): number {
  const startDate = parseDateString(start);
  const endDate = parseDateString(end);
  const millisecondsPerDay = 24 * 60 * 60 * 1000;

  return Math.round((endDate.getTime() - startDate.getTime()) / millisecondsPerDay);
}

function getLocalDateStringFromValue(value: string) {
  if (/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return value;
  }

  const date = new Date(value);
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');

  return `${year}-${month}-${day}`;
}

function isDateString(value: string) {
  return /^\d{4}-\d{2}-\d{2}$/.test(value);
}

function parseDateString(dateString: string) {
  const [year, month, day] = dateString.split('-').map(Number);

  return new Date(year, month - 1, day);
}
