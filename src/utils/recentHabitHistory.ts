import type { Habit, HabitCompletion, HabitSkip } from '@/src/types/Habit';
import { isHabitScheduledForDate } from '@/src/utils/schedule';

export type HabitHistoryStatus = 'completed' | 'skipped' | 'missed';

export type HabitHistoryItem = {
  date: string;
  status: HabitHistoryStatus;
};

type RecentHabitHistoryInput = {
  habit: Habit;
  endDate: string;
  count: number;
  completions: HabitCompletion[];
  skips: HabitSkip[];
};

const MAX_LOOKBACK_DAYS = 3650;

export function getRecentScheduledOccurrences(
  habit: Habit,
  endDate: string,
  count: number
): string[] {
  if (count <= 0) {
    return [];
  }

  const dates: string[] = [];
  const startDate = getHabitStartDate(habit);
  let cursor = endDate;
  let lookedBackDays = 0;

  while (dates.length < count && cursor >= startDate && lookedBackDays < MAX_LOOKBACK_DAYS) {
    if (isHabitScheduledForDate(habit, cursor)) {
      dates.push(cursor);
    }

    cursor = addDaysLocal(cursor, -1);
    lookedBackDays += 1;
  }

  return dates.reverse();
}

function getHabitStartDate(habit: Habit) {
  return habit.scheduleStartDate ?? getLocalDateStringFromValue(habit.createdAt);
}

export function getRecentHabitHistoryItems({
  completions,
  count,
  endDate,
  habit,
  skips,
}: RecentHabitHistoryInput): HabitHistoryItem[] {
  const completionDateSet = new Set(completions.map((completion) => completion.date));
  const skipDateSet = new Set(skips.map((skip) => skip.date));

  return getRecentScheduledOccurrences(habit, endDate, count).map((date) => ({
    date,
    status: completionDateSet.has(date) ? 'completed' : skipDateSet.has(date) ? 'skipped' : 'missed',
  }));
}

function addDaysLocal(date: string, days: number): string {
  const parsedDate = parseDateString(date);

  parsedDate.setDate(parsedDate.getDate() + days);

  const year = parsedDate.getFullYear();
  const month = String(parsedDate.getMonth() + 1).padStart(2, '0');
  const day = String(parsedDate.getDate()).padStart(2, '0');

  return `${year}-${month}-${day}`;
}

function parseDateString(date: string) {
  const [year, month, day] = date.split('-').map(Number);

  return new Date(year, month - 1, day);
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
