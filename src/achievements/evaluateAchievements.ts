import { addDays, differenceInCalendarDays, format } from 'date-fns';

import {
  ACHIEVEMENT_DEFINITIONS,
  type AchievementDefinition,
  type EvaluatedAchievement,
} from '@/src/achievements/achievementDefinitions';
import { getAllCompletions } from '@/src/db/completions';
import { getAllHabits } from '@/src/db/habits';
import { getAllNumericEntries } from '@/src/db/numericEntries';
import { getAllSkips } from '@/src/db/skips';
import { getAllSubtaskCompletions, getAllSubtasks } from '@/src/db/subtasks';
import type {
  Habit,
  HabitCompletion,
  HabitNumericEntry,
  HabitSkip,
  HabitSubtask,
  HabitSubtaskCompletion,
} from '@/src/types/Habit';
import { getTodayDateString } from '@/src/utils/dates';
import {
  calculateOverallLongestDayStreak,
  getRangeDayStats,
  type DayStatsHabit,
} from '@/src/utils/dayStats';
import { calculateScheduleAwareLongestStreak } from '@/src/utils/milestones';
import { getScheduledDatesForHabit, getScheduledHabitsForDate } from '@/src/utils/schedule';

export type AchievementEvaluationData = {
  habits: Habit[];
  completions: HabitCompletion[];
  skips: HabitSkip[];
  subtasks: HabitSubtask[];
  subtaskCompletions: HabitSubtaskCompletion[];
  numericEntries: HabitNumericEntry[];
  today: string;
};

export type AchievementSummary = {
  unlocked: number;
  total: number;
  unsupported: number;
};

type AchievementMetrics = {
  habitsCreated: number;
  totalCompletions: number;
  skipReasons: number;
  backOnTrack: number;
  noExcusesWeek: number;
  longestHabitStreak: number;
  perfectDayCount: number;
  longestPerfectRun: number;
  maxFullSubtaskDaysForHabit: number;
  noLooseEnds: number;
  totalSubtaskCompletions: number;
  numericGoalCompletions: number;
  overachiever: number;
  doubleGoal: number;
  comeback: number;
  bounceBack: number;
  resetStrong: number;
  notDoneYet: number;
  backInRhythm: number;
  recoveredStreak: number;
  trackedSpanDays: number;
};

export async function loadAchievementData(): Promise<AchievementEvaluationData> {
  const [habits, completions, skips, subtasks, subtaskCompletions, numericEntries] =
    await Promise.all([
      getAllHabits(),
      getAllCompletions(),
      getAllSkips(),
      getAllSubtasks(),
      getAllSubtaskCompletions(),
      getAllNumericEntries(),
    ]);

  return {
    completions,
    habits,
    numericEntries,
    skips,
    subtaskCompletions,
    subtasks,
    today: getTodayDateString(),
  };
}

export function evaluateAchievements(data: AchievementEvaluationData): EvaluatedAchievement[] {
  const metrics = calculateAchievementMetrics(data);

  return ACHIEVEMENT_DEFINITIONS.map((definition) =>
    evaluateDefinition(definition, metrics)
  );
}

export function getAchievementSummary(
  achievements: EvaluatedAchievement[]
): AchievementSummary {
  const supportedAchievements = achievements.filter((achievement) => !achievement.unsupported);

  return {
    total: supportedAchievements.length,
    unlocked: supportedAchievements.filter((achievement) => achievement.unlocked).length,
    unsupported: achievements.length - supportedAchievements.length,
  };
}

function evaluateDefinition(
  definition: AchievementDefinition,
  metrics: AchievementMetrics
): EvaluatedAchievement {
  const value = getMetricForDefinition(definition, metrics);
  const progress = Math.min(value, definition.target);

  return {
    ...definition,
    progress,
    progressLabel: `${formatNumber(progress)} / ${formatNumber(definition.target)}`,
    unlocked: value >= definition.target,
  };
}

function getMetricForDefinition(
  definition: AchievementDefinition,
  metrics: AchievementMetrics
) {
  switch (definition.id) {
    case 'first_step':
      return Math.min(metrics.totalCompletions, 1);
    case 'fresh_start':
    case 'create_3_habits':
    case 'create_5_habits':
    case 'create_10_habits':
      return metrics.habitsCreated;
    case 'honest_tracker':
      return metrics.skipReasons;
    case 'back_on_track':
      return metrics.backOnTrack;
    case 'no_excuses_week':
      return metrics.noExcusesWeek;
    case 'checklist_starter':
    case 'checklist_cleaner':
    case 'checklist_master':
      return metrics.maxFullSubtaskDaysForHabit;
    case 'no_loose_ends':
      return metrics.noLooseEnds;
    case 'subtask_100':
    case 'subtask_500':
    case 'subtask_1000':
      return metrics.totalSubtaskCompletions;
    case 'goal_starter':
    case 'numeric_goal_10':
    case 'numeric_goal_50':
    case 'numeric_goal_100':
      return metrics.numericGoalCompletions;
    case 'overachiever':
      return metrics.overachiever;
    case 'double_goal':
      return metrics.doubleGoal;
    case 'comeback':
      return metrics.comeback;
    case 'bounce_back':
      return metrics.bounceBack;
    case 'reset_strong':
      return metrics.resetStrong;
    case 'not_done_yet':
      return metrics.notDoneYet;
    case 'back_in_rhythm':
      return metrics.backInRhythm;
    case 'recovered_streak':
      return metrics.recoveredStreak;
    case 'track_7_days':
    case 'track_30_days':
    case 'track_90_days':
    case 'track_180_days':
    case 'track_365_days':
      return metrics.trackedSpanDays;
    default:
      break;
  }

  if (definition.category === 'total_completions') {
    return metrics.totalCompletions;
  }

  if (definition.category === 'habit_streaks') {
    return metrics.longestHabitStreak;
  }

  if (definition.category === 'full_day_streaks') {
    return definition.id === 'perfect_run_1'
      ? metrics.perfectDayCount
      : metrics.longestPerfectRun;
  }

  return 0;
}

function calculateAchievementMetrics(data: AchievementEvaluationData): AchievementMetrics {
  const completions = data.completions.filter((completion) => completion.date <= data.today);
  const skips = data.skips.filter((skip) => skip.date <= data.today);
  const numericEntries = data.numericEntries.filter((entry) => entry.date <= data.today);
  const subtaskCompletions = data.subtaskCompletions.filter(
    (completion) => completion.date <= data.today
  );
  const completionsByHabit = groupDatesByHabit(completions);
  const skipsByHabit = groupDatesByHabit(skips);
  const activeHabits = data.habits.filter((habit) => !habit.archived);
  const activeDayStatsHabits = toDayStatsHabits(activeHabits, completionsByHabit, skipsByHabit);
  const firstDate = getFirstTrackedDate(data, activeHabits);
  const dayStats = firstDate
    ? getRangeDayStats(firstDate, data.today, activeDayStatsHabits)
    : [];
  const longestHabitStreak = data.habits.reduce((longest, habit) => {
    const completionDates = completionsByHabit.get(habit.id) ?? [];
    const skipDates = skipsByHabit.get(habit.id) ?? [];

    return Math.max(
      longest,
      calculateScheduleAwareLongestStreak(habit, completionDates, data.today, skipDates)
    );
  }, 0);
  const numericMetrics = getNumericMetrics(data.habits, numericEntries);
  const subtaskMetrics = getSubtaskMetrics(
    activeHabits,
    data.subtasks,
    subtaskCompletions,
    data.today
  );
  const recoveryMetrics = getRecoveryMetrics(
    data.habits,
    completionsByHabit,
    skipsByHabit,
    dayStats,
    data.today
  );

  return {
    backInRhythm: recoveryMetrics.backInRhythm,
    backOnTrack: hasCompletionDayAfterSkip(completionsByHabit, skipsByHabit) ? 1 : 0,
    bounceBack: recoveryMetrics.bounceBack,
    comeback: recoveryMetrics.comeback,
    doubleGoal: numericMetrics.doubleGoal,
    habitsCreated: data.habits.length,
    longestHabitStreak,
    longestPerfectRun: calculateOverallLongestDayStreak(dayStats),
    maxFullSubtaskDaysForHabit: subtaskMetrics.maxFullSubtaskDaysForHabit,
    noExcusesWeek: hasNoExcusesWeek(dayStats) ? 1 : 0,
    noLooseEnds: subtaskMetrics.noLooseEnds,
    notDoneYet: recoveryMetrics.notDoneYet,
    numericGoalCompletions: numericMetrics.numericGoalCompletions,
    overachiever: numericMetrics.overachiever,
    perfectDayCount: dayStats.filter((day) => day.isFullyCompletedDay).length,
    resetStrong: recoveryMetrics.resetStrong,
    recoveredStreak: recoveryMetrics.recoveredStreak,
    skipReasons: skips.filter((skip) => skip.reason.trim().length > 0).length,
    totalCompletions: completions.length,
    totalSubtaskCompletions: subtaskCompletions.length,
    trackedSpanDays: getTrackedSpanDays(data, firstDate),
  };
}

function getNumericMetrics(habits: Habit[], numericEntries: HabitNumericEntry[]) {
  const habitById = new Map(habits.map((habit) => [habit.id, habit]));
  let numericGoalCompletions = 0;
  let overachiever = 0;
  let doubleGoal = 0;

  for (const entry of numericEntries) {
    const habit = habitById.get(entry.habitId);
    const target = habit?.targetValue;

    if (!target || target <= 0) {
      continue;
    }

    if (entry.value >= target) {
      numericGoalCompletions += 1;
    }

    if (entry.value >= target * 1.25) {
      overachiever = 1;
    }

    if (entry.value >= target * 2) {
      doubleGoal = 1;
    }
  }

  return { doubleGoal, numericGoalCompletions, overachiever };
}

function getSubtaskMetrics(
  activeHabits: Habit[],
  subtasks: HabitSubtask[],
  subtaskCompletions: HabitSubtaskCompletion[],
  today: string
) {
  const activeSubtaskHabits = activeHabits.filter((habit) => habit.trackingType === 'subtasks');
  const requiredSubtasksByHabit = new Map<string, HabitSubtask[]>();

  for (const habit of activeSubtaskHabits) {
    requiredSubtasksByHabit.set(
      habit.id,
      subtasks.filter(
        (subtask) => subtask.habitId === habit.id && subtask.required && !subtask.archived
      )
    );
  }

  const completionsByHabitDate = new Map<string, Set<string>>();

  for (const completion of subtaskCompletions) {
    const key = getHabitDateKey(completion.habitId, completion.date);
    const completedSubtaskIds = completionsByHabitDate.get(key) ?? new Set<string>();
    completedSubtaskIds.add(completion.subtaskId);
    completionsByHabitDate.set(key, completedSubtaskIds);
  }

  let maxFullSubtaskDaysForHabit = 0;

  for (const habit of activeSubtaskHabits) {
    const requiredSubtasks = requiredSubtasksByHabit.get(habit.id) ?? [];

    if (requiredSubtasks.length === 0) {
      continue;
    }

    const dates = new Set(
      subtaskCompletions
        .filter((completion) => completion.habitId === habit.id)
        .map((completion) => completion.date)
    );
    const fullDays = Array.from(dates).filter((date) =>
      didCompleteRequiredSubtasks(habit.id, date, requiredSubtasks, completionsByHabitDate)
    ).length;

    maxFullSubtaskDaysForHabit = Math.max(maxFullSubtaskDaysForHabit, fullDays);
  }

  return {
    maxFullSubtaskDaysForHabit,
    noLooseEnds: hasNoLooseEndsDay(
      activeSubtaskHabits,
      requiredSubtasksByHabit,
      completionsByHabitDate,
      today
    )
      ? 1
      : 0,
  };
}

function getRecoveryMetrics(
  habits: Habit[],
  completionsByHabit: Map<string, string[]>,
  skipsByHabit: Map<string, string[]>,
  dayStats: ReturnType<typeof getRangeDayStats>,
  today: string
) {
  let comeback = 0;
  let bounceBack = 0;
  let notDoneYet = 0;
  let backInRhythm = 0;
  let recoveredStreak = 0;

  for (const habit of habits) {
    const completionSet = new Set(completionsByHabit.get(habit.id) ?? []);
    const skipSet = new Set(skipsByHabit.get(habit.id) ?? []);
    const scheduledDates = getScheduledDatesForHabit(
      habit,
      getHabitStartDate(habit, completionsByHabit, skipsByHabit),
      today
    );
    let missedBeforeCompletion = 0;
    let longestBreakBeforeCompletion = 0;
    let runningMisses = 0;
    let runningStreak = 0;
    let lostThreeDayStreak = false;
    let lostSevenDayStreak = false;

    for (const date of scheduledDates) {
      if (skipSet.has(date)) {
        runningMisses = 0;
        continue;
      }

      if (completionSet.has(date)) {
        if (missedBeforeCompletion > 0) {
          comeback = 1;
        }

        if (runningMisses >= 3) {
          bounceBack = 1;
        }

        if (longestBreakBeforeCompletion >= 7) {
          notDoneYet = 1;
        }

        runningStreak += 1;

        if (lostThreeDayStreak && runningStreak >= 3) {
          backInRhythm = 1;
        }

        if (lostSevenDayStreak && runningStreak >= 7) {
          recoveredStreak = 1;
        }

        runningMisses = 0;
        continue;
      }

      if (runningStreak >= 3) {
        lostThreeDayStreak = true;
      }

      if (runningStreak >= 7) {
        lostSevenDayStreak = true;
      }

      runningStreak = 0;
      runningMisses += 1;
      missedBeforeCompletion += 1;
      longestBreakBeforeCompletion = Math.max(longestBreakBeforeCompletion, runningMisses);
    }
  }

  return {
    backInRhythm,
    bounceBack,
    comeback,
    notDoneYet,
    recoveredStreak,
    resetStrong: hasResetStrongDay(dayStats) ? 1 : 0,
  };
}

function hasNoLooseEndsDay(
  subtaskHabits: Habit[],
  requiredSubtasksByHabit: Map<string, HabitSubtask[]>,
  completionsByHabitDate: Map<string, Set<string>>,
  today: string
) {
  if (subtaskHabits.length === 0) {
    return false;
  }

  const startDate = subtaskHabits.map((habit) => getHabitStartDate(habit)).sort()[0];
  const dates = getDateRange(startDate, today);

  return dates.some((date) => {
    const scheduledSubtaskHabits = getScheduledHabitsForDate(subtaskHabits, date);
    const trackableHabits = scheduledSubtaskHabits.filter(
      (habit) => (requiredSubtasksByHabit.get(habit.id) ?? []).length > 0
    );

    return (
      trackableHabits.length > 0 &&
      trackableHabits.every((habit) =>
        didCompleteRequiredSubtasks(
          habit.id,
          date,
          requiredSubtasksByHabit.get(habit.id) ?? [],
          completionsByHabitDate
        )
      )
    );
  });
}

function didCompleteRequiredSubtasks(
  habitId: string,
  date: string,
  requiredSubtasks: HabitSubtask[],
  completionsByHabitDate: Map<string, Set<string>>
) {
  const completedSubtaskIds = completionsByHabitDate.get(getHabitDateKey(habitId, date));

  return Boolean(
    completedSubtaskIds &&
      requiredSubtasks.every((subtask) => completedSubtaskIds.has(subtask.id))
  );
}

function hasCompletionDayAfterSkip(
  completionsByHabit: Map<string, string[]>,
  skipsByHabit: Map<string, string[]>
) {
  for (const [habitId, skipDates] of skipsByHabit.entries()) {
    const completionDateSet = new Set(completionsByHabit.get(habitId) ?? []);

    if (skipDates.some((date) => completionDateSet.has(addDaysString(date, 1)))) {
      return true;
    }
  }

  return false;
}

function hasNoExcusesWeek(dayStats: ReturnType<typeof getRangeDayStats>) {
  for (let index = 0; index <= dayStats.length - 7; index += 1) {
    const week = dayStats.slice(index, index + 7);

    if (
      week.every((day) => day.completedCount > 0 || day.skippedCount > 0) &&
      week.every((day) => day.skippedCount === 0)
    ) {
      return true;
    }
  }

  return false;
}

function hasResetStrongDay(dayStats: ReturnType<typeof getRangeDayStats>) {
  for (let index = 1; index < dayStats.length; index += 1) {
    const previousDay = dayStats[index - 1];
    const day = dayStats[index];
    const previousBadDay =
      previousDay.isTrackedDay &&
      previousDay.denominator > 0 &&
      previousDay.completedCount < previousDay.denominator;

    if (previousBadDay && day.isFullyCompletedDay) {
      return true;
    }
  }

  return false;
}

function getFirstTrackedDate(data: AchievementEvaluationData, activeHabits: Habit[]) {
  const dates = [
    ...activeHabits.map((habit) => getHabitStartDate(habit)),
    ...data.completions.map((completion) => completion.date),
    ...data.skips.map((skip) => skip.date),
    ...data.numericEntries.map((entry) => entry.date),
    ...data.subtaskCompletions.map((completion) => completion.date),
  ].filter((date) => isDateString(date) && date <= data.today);

  return dates.sort()[0] ?? null;
}

function getTrackedSpanDays(data: AchievementEvaluationData, firstDate: string | null) {
  if (!firstDate) {
    return 0;
  }

  return differenceInCalendarDays(parseDateString(data.today), parseDateString(firstDate)) + 1;
}

function toDayStatsHabits(
  habits: Habit[],
  completionsByHabit: Map<string, string[]>,
  skipsByHabit: Map<string, string[]>
): DayStatsHabit[] {
  return habits.map((habit) => ({
    habit,
    completionDates: completionsByHabit.get(habit.id) ?? [],
    skipDates: skipsByHabit.get(habit.id) ?? [],
  }));
}

function groupDatesByHabit(items: { habitId: string; date: string }[]) {
  const grouped = new Map<string, string[]>();

  for (const item of items) {
    const dates = grouped.get(item.habitId) ?? [];
    dates.push(item.date);
    grouped.set(item.habitId, dates);
  }

  return grouped;
}

function getHabitDateKey(habitId: string, date: string) {
  return `${habitId}:${date}`;
}

function getHabitStartDate(
  habit: Habit,
  completionsByHabit?: Map<string, string[]>,
  skipsByHabit?: Map<string, string[]>
) {
  return [
    habit.scheduleStartDate,
    getLocalDateStringFromValue(habit.createdAt),
    ...(completionsByHabit?.get(habit.id) ?? []),
    ...(skipsByHabit?.get(habit.id) ?? []),
  ]
    .filter((date): date is string => Boolean(date && isDateString(date)))
    .sort()[0];
}

function getDateRange(startDate: string, endDate: string) {
  const totalDays = differenceInCalendarDays(parseDateString(endDate), parseDateString(startDate)) + 1;

  return Array.from({ length: Math.max(totalDays, 0) }, (_, index) =>
    addDaysString(startDate, index)
  );
}

function addDaysString(date: string, days: number) {
  return format(addDays(parseDateString(date), days), 'yyyy-MM-dd');
}

function parseDateString(date: string) {
  const [year, month, day] = date.split('-').map(Number);

  return new Date(year, month - 1, day);
}

function getLocalDateStringFromValue(value: string) {
  if (isDateString(value)) {
    return value;
  }

  return format(new Date(value), 'yyyy-MM-dd');
}

function isDateString(value: string) {
  return /^\d{4}-\d{2}-\d{2}$/.test(value);
}

function formatNumber(value: number) {
  return Math.floor(value).toLocaleString();
}
