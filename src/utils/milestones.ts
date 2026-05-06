import type { Habit } from '@/src/types/Habit';
import { getScheduledDatesForHabit } from '@/src/utils/schedule';

export type HabitCrownTier = 'none' | 'bronze' | 'silver' | 'gold' | 'diamond';

export type HabitCrownMilestone = {
  tier: HabitCrownTier;
  label: string;
  streakDays: number;
};

const CROWN_MILESTONES: { tier: HabitCrownTier; label: string; threshold: number }[] = [
  { tier: 'diamond', label: 'Diamond Crown', threshold: 365 },
  { tier: 'gold', label: 'Gold Crown', threshold: 90 },
  { tier: 'silver', label: 'Silver Crown', threshold: 30 },
  { tier: 'bronze', label: 'Bronze Crown', threshold: 7 },
];

export function calculateScheduleAwareCurrentStreak(
  habit: Habit,
  completionDates: string[],
  today: string,
  skippedDates: string[] = []
): number {
  const startDate = getHabitAnalyticsStartDate(habit, completionDates, skippedDates);
  const scheduledDates = getScheduledDatesForHabit(habit, startDate, today);
  const completionDateSet = new Set(completionDates);
  const skippedDateSet = new Set(skippedDates);
  let streak = 0;
  let canIgnoreIncompleteToday = true;

  for (let index = scheduledDates.length - 1; index >= 0; index -= 1) {
    const date = scheduledDates[index];

    if (skippedDateSet.has(date)) {
      continue;
    }

    if (completionDateSet.has(date)) {
      streak += 1;
      canIgnoreIncompleteToday = false;
      continue;
    }

    if (canIgnoreIncompleteToday && date === today) {
      canIgnoreIncompleteToday = false;
      continue;
    }

    break;
  }

  return streak;
}

export function calculateScheduleAwareLongestStreak(
  habit: Habit,
  completionDates: string[],
  today: string,
  skippedDates: string[] = []
): number {
  const startDate = getHabitAnalyticsStartDate(habit, completionDates, skippedDates);
  const scheduledDates = getScheduledDatesForHabit(habit, startDate, today);
  const completionDateSet = new Set(completionDates);
  const skippedDateSet = new Set(skippedDates);
  let longestStreak = 0;
  let runningStreak = 0;

  for (const date of scheduledDates) {
    if (skippedDateSet.has(date)) {
      continue;
    }

    if (completionDateSet.has(date)) {
      runningStreak += 1;
      longestStreak = Math.max(longestStreak, runningStreak);
      continue;
    }

    runningStreak = 0;
  }

  return longestStreak;
}

export function getHabitCrownMilestone(currentStreak: number): HabitCrownMilestone {
  const milestone = CROWN_MILESTONES.find((item) => currentStreak >= item.threshold);

  if (!milestone) {
    return {
      label: 'No crown yet',
      streakDays: currentStreak,
      tier: 'none',
    };
  }

  return {
    label: milestone.label,
    streakDays: currentStreak,
    tier: milestone.tier,
  };
}

export function getHabitAnalyticsStartDate(
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
