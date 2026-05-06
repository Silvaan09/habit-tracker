import { addDays, differenceInCalendarDays, format } from 'date-fns';

import type { Habit } from '@/src/types/Habit';
import { getScheduledHabitsForDate } from '@/src/utils/schedule';

export type DayStatsHabit = {
  habit: Habit;
  completionDates: string[];
  skipDates: string[];
};

export type DayCompletionStatus = {
  date: string;
  scheduledCount: number;
  skippedCount: number;
  completedCount: number;
  denominator: number;
  completionRate: number;
  isTrackedDay: boolean;
  isFullyCompletedDay: boolean;
};

export function getDayCompletionStatus(
  date: string,
  habitStats: DayStatsHabit[]
): DayCompletionStatus {
  const eligibleHabits = habitStats.filter((item) => getHabitStartDate(item.habit) <= date);
  const scheduledHabits = getScheduledHabitsForDate(
    eligibleHabits.map((item) => item.habit),
    date
  );
  const scheduledHabitIds = new Set(scheduledHabits.map((habit) => habit.id));
  const skippedHabitIds = new Set(
    eligibleHabits
      .filter((item) => scheduledHabitIds.has(item.habit.id))
      .filter((item) => item.skipDates.includes(date))
      .map((item) => item.habit.id)
  );
  const completedCount = eligibleHabits.filter(
    (item) =>
      scheduledHabitIds.has(item.habit.id) &&
      !skippedHabitIds.has(item.habit.id) &&
      item.completionDates.includes(date)
  ).length;
  const denominator = Math.max(scheduledHabits.length - skippedHabitIds.size, 0);

  return {
    completedCount,
    completionRate: denominator === 0 ? 0 : completedCount / denominator,
    date,
    denominator,
    isFullyCompletedDay:
      scheduledHabits.length > 0 && denominator > 0 && completedCount === denominator,
    isTrackedDay: scheduledHabits.length > 0 && denominator > 0,
    scheduledCount: scheduledHabits.length,
    skippedCount: skippedHabitIds.size,
  };
}

export function getRangeDayStats(
  startDate: string,
  endDate: string,
  habitStats: DayStatsHabit[]
): DayCompletionStatus[] {
  const start = parseDateString(startDate);
  const totalDays = differenceInCalendarDays(parseDateString(endDate), start) + 1;

  return Array.from({ length: Math.max(totalDays, 0) }, (_, index) => {
    const date = format(addDays(start, index), 'yyyy-MM-dd');

    return getDayCompletionStatus(date, habitStats);
  });
}

export function countFullyCompletedDays(dayStats: DayCompletionStatus[]): number {
  return dayStats.filter((day) => day.isFullyCompletedDay).length;
}

export function countTrackedDays(dayStats: DayCompletionStatus[]): number {
  return dayStats.filter((day) => day.isTrackedDay).length;
}

export function calculateAverageDailyCompletion(dayStats: DayCompletionStatus[]): number {
  const trackedDays = dayStats.filter((day) => day.isTrackedDay);

  if (trackedDays.length === 0) {
    return 0;
  }

  const totalRate = trackedDays.reduce((sum, day) => sum + day.completionRate, 0);

  return totalRate / trackedDays.length;
}

export function calculateOverallCurrentDayStreak(dayStats: DayCompletionStatus[]): number {
  let streak = 0;

  for (let index = dayStats.length - 1; index >= 0; index -= 1) {
    const day = dayStats[index];

    if (!day.isTrackedDay) {
      continue;
    }

    // Overall current streak is intentionally strict: an incomplete tracked today
    // returns 0 instead of preserving yesterday's streak.
    if (!day.isFullyCompletedDay) {
      break;
    }

    streak += 1;
  }

  return streak;
}

export function calculateOverallLongestDayStreak(dayStats: DayCompletionStatus[]): number {
  let longestStreak = 0;
  let runningStreak = 0;

  for (const day of dayStats) {
    if (!day.isTrackedDay) {
      continue;
    }

    if (day.isFullyCompletedDay) {
      runningStreak += 1;
      longestStreak = Math.max(longestStreak, runningStreak);
      continue;
    }

    runningStreak = 0;
  }

  return longestStreak;
}

function getHabitStartDate(habit: Habit) {
  return habit.scheduleStartDate ?? getLocalDateStringFromValue(habit.createdAt);
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

function parseDateString(dateString: string) {
  const [year, month, day] = dateString.split('-').map(Number);

  return new Date(year, month - 1, day);
}
