import { useFocusEffect } from '@react-navigation/native';
import { addDays, differenceInCalendarDays, format, startOfMonth, startOfYear } from 'date-fns';
import { router } from 'expo-router';
import { useCallback, useMemo, useRef, useState } from 'react';
import { Animated, Pressable, StyleSheet, Text, View } from 'react-native';

import { ActivityHeatmap, type ActivityHeatmapDay } from '@/src/components/ActivityHeatmap';
import { EmptyState } from '@/src/components/EmptyState';
import { HabitCrownBadge } from '@/src/components/HabitCrownBadge';
import { HabitIcon } from '@/src/components/HabitIcon';
import { PrimaryButton } from '@/src/components/PrimaryButton';
import { Screen } from '@/src/components/Screen';
import { StatCard } from '@/src/components/StatCard';
import { WeeklyActivityChart, type WeeklyActivityDay } from '@/src/components/WeeklyActivityChart';
import { getCompletionsForHabit } from '@/src/db/completions';
import { initDatabase } from '@/src/db/database';
import { getActiveHabits } from '@/src/db/habits';
import { getSkipsForHabit } from '@/src/db/skips';
import { colors, radius, spacing, typography } from '@/src/theme';
import type { Habit, HabitCompletion, HabitSkip } from '@/src/types/Habit';
import { getTodayDateString } from '@/src/utils/dates';
import {
  calculateScheduleAwareCurrentStreak,
  getHabitAnalyticsStartDate,
  getHabitCrownMilestone,
} from '@/src/utils/milestones';
import { getScheduledHabitsForDate } from '@/src/utils/schedule';

type HabitWithCompletions = {
  habit: Habit;
  completions: HabitCompletion[];
  skips: HabitSkip[];
};

type StatsRange = 'week' | 'month' | 'year';

const RANGE_OPTIONS: { label: string; value: StatsRange }[] = [
  { label: 'Week', value: 'week' },
  { label: 'Month', value: 'month' },
  { label: 'Year', value: 'year' },
];

export default function StatsScreen() {
  const [habitStats, setHabitStats] = useState<HabitWithCompletions[]>([]);
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [selectedRange, setSelectedRange] = useState<StatsRange>('week');
  const chartOpacity = useRef(new Animated.Value(1)).current;

  const today = getTodayDateString();
  const loadStats = useCallback(async () => {
    setLoading(true);
    setErrorMessage(null);
    await initDatabase();

    const activeHabits = await getActiveHabits();
    const [completionsByHabit, skipsByHabit] = await Promise.all([
      Promise.all(activeHabits.map((habit) => getCompletionsForHabit(habit.id))),
      Promise.all(activeHabits.map((habit) => getSkipsForHabit(habit.id))),
    ]);

    setHabitStats(
      activeHabits.map((habit, index) => ({
        habit,
        completions: completionsByHabit[index],
        skips: skipsByHabit[index],
      }))
    );
    setLoading(false);
  }, []);

  useFocusEffect(
    useCallback(() => {
      let isActive = true;

      async function setup() {
        try {
          await loadStats();
        } catch (error) {
          console.error('Failed to load overall stats', error);

          if (isActive) {
            setErrorMessage('Could not load your stats.');
            setLoading(false);
          }
        }
      }

      setup();

      return () => {
        isActive = false;
      };
    }, [loadStats])
  );

  async function handleRetry() {
    try {
      await loadStats();
    } catch (error) {
      console.error('Failed to retry loading stats', error);
      setErrorMessage('Still could not load your stats. Please try again.');
      setLoading(false);
    }
  }

  function selectRange(range: StatsRange) {
    if (range === selectedRange) {
      return;
    }

    Animated.timing(chartOpacity, {
      duration: 120,
      toValue: 0,
      useNativeDriver: true,
    }).start(() => {
      setSelectedRange(range);
      Animated.timing(chartOpacity, {
        duration: 180,
        toValue: 1,
        useNativeDriver: true,
      }).start();
    });
  }

  const stats = useMemo(() => {
    let totalCompletions = 0;
    let totalSkips = 0;

    for (const item of habitStats) {
      totalCompletions += item.completions.length;
      totalSkips += item.skips.length;
    }

    const completeDayStats = getCompleteDayStreakStats(habitStats, today);

    return {
      activeHabitsCount: habitStats.length,
      currentStreak: completeDayStats.currentStreak,
      longestStreak: completeDayStats.longestStreak,
      totalCompletions,
      totalSkips,
    };
  }, [habitStats, today]);
  const weeklyActivity = useMemo(
    () => getWeeklyActivity(habitStats, today),
    [habitStats, today]
  );
  const rangeStartDate = useMemo(
    () => getRangeStartDate(selectedRange, today),
    [selectedRange, today]
  );
  const rangeActivity = useMemo(
    () =>
      selectedRange === 'week'
        ? weeklyActivity
        : getActivityForDateRange(habitStats, rangeStartDate, today),
    [habitStats, rangeStartDate, selectedRange, today, weeklyActivity]
  );
  const selectedRangeCompletionRate = useMemo(
    () => getActivityCompletionRate(rangeActivity),
    [rangeActivity]
  );
  const todayActivity = useMemo(() => getActivityForDate(habitStats, today), [habitStats, today]);
  const habitBreakdown = useMemo(
    () => getHabitBreakdownForDateRange(habitStats, getRangeStartDate('week', today), today),
    [habitStats, today]
  );

  if (loading) {
    return (
      <Screen contentContainerStyle={[styles.content, styles.centeredState]}>
        <Text style={styles.stateTitle}>Loading stats...</Text>
      </Screen>
    );
  }

  return (
    <Screen contentContainerStyle={styles.content}>
      <View style={styles.header}>
        <View style={styles.headerCopy}>
          <Text style={styles.eyebrow}>Stats</Text>
          <Text style={styles.title}>Activity</Text>
          <Text style={styles.subtitle}>Your habit progress at a glance.</Text>
        </View>
        <View style={styles.headerPill}>
          <Text style={styles.headerPillValue}>
            {Math.round(todayActivity.percentage * 100)}%
          </Text>
          <Text style={styles.headerPillLabel}>Today</Text>
        </View>
      </View>

      {errorMessage ? (
        <View style={styles.errorBanner}>
          <Text style={styles.errorText}>{errorMessage}</Text>
          <PrimaryButton onPress={handleRetry} title="Retry" variant="secondary" />
        </View>
      ) : null}

      {habitStats.length === 0 ? (
        <View style={styles.emptyStack}>
          <EmptyState
            title="No activity yet"
            message="Create habits and complete them to see your progress here."
          />
          <PrimaryButton onPress={() => router.push('/habits/new')} title="New Habit" />
        </View>
      ) : (
        <>
          <View style={styles.analyticsCard}>
            <View style={styles.analyticsHeader}>
              <View>
                <Text style={styles.analyticsEyebrow}>Activity range</Text>
                <Text style={styles.analyticsValue}>
                  {Math.round(selectedRangeCompletionRate * 100)}%
                </Text>
              </View>
            </View>

            <View style={styles.rangeSelector}>
              {RANGE_OPTIONS.map((option) => {
                const selected = selectedRange === option.value;

                return (
                  <Pressable
                    accessibilityLabel={`Show ${option.label} activity`}
                    accessibilityRole="button"
                    accessibilityState={{ selected }}
                    key={option.value}
                    onPress={() => selectRange(option.value)}
                    style={({ pressed }) => [
                      styles.rangeButton,
                      selected && styles.selectedRangeButton,
                      pressed && styles.pressed,
                    ]}>
                    <Text
                      style={[styles.rangeButtonText, selected && styles.selectedRangeButtonText]}>
                      {option.label}
                    </Text>
                  </Pressable>
                );
              })}
            </View>

            <Animated.View style={[styles.chartTransition, { opacity: chartOpacity }]}>
              {selectedRange === 'week' ? (
                <WeeklyActivityChart days={weeklyActivity} />
              ) : (
                <ActivityHeatmap
                  days={rangeActivity}
                  endDate={today}
                  startDate={rangeStartDate}
                  scrollable={selectedRange === 'year'}
                />
              )}
            </Animated.View>
          </View>

          <View style={styles.statsGrid}>
            <StatCard label="Active habits" value={String(stats.activeHabitsCount)} />
            <StatCard label="Total completions" value={String(stats.totalCompletions)} />
            <StatCard label="Skipped days" value={String(stats.totalSkips)} />
            <StatCard
              label="Current streak"
              value={`${stats.currentStreak} day${stats.currentStreak === 1 ? '' : 's'}`}
            />
            <StatCard
              label="Longest streak"
              value={`${stats.longestStreak} day${stats.longestStreak === 1 ? '' : 's'}`}
            />
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Active habits</Text>
            <View style={styles.habitList}>
              {habitBreakdown.map((item) => {
                return (
                  <View key={item.habit.id} style={styles.habitRow}>
                    <HabitIcon
                      color={item.habit.color ?? colors.habitGreen}
                      fallbackIcon={item.habit.icon}
                      iconLibrary={item.habit.iconLibrary}
                      iconType={item.habit.iconType}
                      iconValue={item.habit.iconValue}
                      size={42}
                    />
                    <View style={styles.habitText}>
                      <Text style={styles.habitName}>{item.habit.name}</Text>
                      <Text style={styles.habitMeta}>
                        Last 7 days: {item.scheduledCount} scheduled - {item.completedCount} done -{' '}
                        {item.skippedCount} skipped
                      </Text>
                      <View style={styles.habitProgressTrack}>
                        <View
                          style={[
                            styles.habitProgressFill,
                            { width: `${Math.round(item.completionRate * 100)}%` },
                          ]}
                        />
                      </View>
                    </View>
                    <View style={styles.habitRatePill}>
                      <HabitCrownBadge compact milestone={item.crownMilestone} />
                      <Text style={styles.completionCount}>
                        {Math.round(item.completionRate * 100)}%
                      </Text>
                    </View>
                  </View>
                );
              })}
            </View>
          </View>
        </>
      )}
    </Screen>
  );
}

function parseDateString(date: string) {
  const [year, month, day] = date.split('-').map(Number);

  return new Date(year, month - 1, day);
}

function getWeeklyActivity(
  habitStats: HabitWithCompletions[],
  today: string
): WeeklyActivityDay[] {
  const todayDate = parseDateString(today);

  return Array.from({ length: 7 }, (_, index) => {
    const date = addDays(todayDate, index - 6);
    const dateString = format(date, 'yyyy-MM-dd');
    const activity = getActivityForDate(habitStats, dateString);

    return {
      date: dateString,
      weekday: format(date, 'EEE'),
      completedCount: activity.completedCount,
      totalCount: activity.totalCount,
      percentage: activity.percentage,
    };
  });
}

function getActivityForDateRange(
  habitStats: HabitWithCompletions[],
  startDate: string,
  endDate: string
): ActivityHeatmapDay[] {
  const start = parseDateString(startDate);
  const totalDays = differenceInCalendarDays(parseDateString(endDate), start) + 1;

  return Array.from({ length: Math.max(totalDays, 0) }, (_, index) => {
    const dateString = format(addDays(start, index), 'yyyy-MM-dd');

    return getActivityForDate(habitStats, dateString);
  });
}

function getActivityForDate(
  habitStats: HabitWithCompletions[],
  dateString: string
): ActivityHeatmapDay {
  const eligibleHabitStats = habitStats.filter(
    (item) => getHabitStatsStartDate(item) <= dateString
  );
  const scheduledItems = getScheduledHabitsForDate(
    eligibleHabitStats.map((item) => item.habit),
    dateString
  );
  const scheduledHabitIds = new Set(scheduledItems.map((habit) => habit.id));
  const skippedHabitIds = new Set(
    eligibleHabitStats
      .filter((item) => scheduledHabitIds.has(item.habit.id))
      .filter((item) => item.skips.some((skip) => skip.date === dateString))
      .map((item) => item.habit.id)
  );
  const completedCount = eligibleHabitStats.filter(
    (item) =>
      scheduledHabitIds.has(item.habit.id) &&
      !skippedHabitIds.has(item.habit.id) &&
      item.completions.some((completion) => completion.date === dateString)
  ).length;
  const totalCount = Math.max(scheduledItems.length - skippedHabitIds.size, 0);

  return {
    date: dateString,
    completedCount,
    totalCount,
    percentage: totalCount === 0 ? 0 : completedCount / totalCount,
  };
}

function getCompleteDayStreakStats(habitStats: HabitWithCompletions[], today: string) {
  const firstDate = getFirstHabitDate(habitStats);

  if (!firstDate) {
    return { currentStreak: 0, longestStreak: 0 };
  }

  const days = getActivityForDateRange(habitStats, firstDate, today);
  let longestStreak = 0;
  let runningStreak = 0;

  for (const day of days) {
    if (isCompleteDay(day)) {
      runningStreak += 1;
      longestStreak = Math.max(longestStreak, runningStreak);
    } else {
      runningStreak = 0;
    }
  }

  const todayActivity = days[days.length - 1];
  let cursor = todayActivity && isCompleteDay(todayActivity) ? days.length - 1 : days.length - 2;
  let currentStreak = 0;

  // App convention: if today has scheduled habits but is incomplete, the current streak can still
  // continue from yesterday. Missing yesterday or any earlier scheduled day breaks it.
  while (cursor >= 0 && isCompleteDay(days[cursor])) {
    currentStreak += 1;
    cursor -= 1;
  }

  return { currentStreak, longestStreak };
}

function isCompleteDay(day: ActivityHeatmapDay) {
  return day.totalCount > 0 && day.completedCount === day.totalCount;
}

function getFirstHabitDate(habitStats: HabitWithCompletions[]) {
  const dates = habitStats.map(getHabitStatsStartDate).sort();

  return dates[0] ?? null;
}

function getHabitStatsStartDate(item: HabitWithCompletions) {
  return getHabitAnalyticsStartDate(
    item.habit,
    item.completions.map((completion) => completion.date),
    item.skips.map((skip) => skip.date)
  );
}

function getHabitBreakdownForDateRange(
  habitStats: HabitWithCompletions[],
  startDate: string,
  endDate: string
) {
  const start = parseDateString(startDate);
  const totalDays = differenceInCalendarDays(parseDateString(endDate), start) + 1;

  return habitStats.map((item) => {
    let completedCount = 0;
    let scheduledCount = 0;
    let skippedCount = 0;
    let trackableCount = 0;

    for (let index = 0; index < totalDays; index += 1) {
      const dateString = format(addDays(start, index), 'yyyy-MM-dd');

      if (getHabitStatsStartDate(item) > dateString) {
        continue;
      }

      const scheduled = getScheduledHabitsForDate([item.habit], dateString).length > 0;

      if (!scheduled) {
        continue;
      }

      scheduledCount += 1;

      const skipped = item.skips.some((skip) => skip.date === dateString);

      if (skipped) {
        skippedCount += 1;
        continue;
      }

      trackableCount += 1;

      if (item.completions.some((completion) => completion.date === dateString)) {
        completedCount += 1;
      }
    }

    return {
      habit: item.habit,
      completedCount,
      completionRate: trackableCount === 0 ? 0 : completedCount / trackableCount,
      crownMilestone: getHabitCrownMilestone(
        calculateScheduleAwareCurrentStreak(
          item.habit,
          item.completions.map((completion) => completion.date),
          endDate,
          item.skips.map((skip) => skip.date)
        )
      ),
      scheduledCount,
      skippedCount,
    };
  });
}

function getActivityCompletionRate(days: ActivityHeatmapDay[]) {
  const totals = days.reduce(
    (sum, day) => ({
      completed: sum.completed + day.completedCount,
      possible: sum.possible + day.totalCount,
    }),
    { completed: 0, possible: 0 }
  );

  return totals.possible === 0 ? 0 : totals.completed / totals.possible;
}

function getRangeStartDate(range: StatsRange, today: string) {
  const todayDate = parseDateString(today);

  if (range === 'year') {
    return format(startOfYear(todayDate), 'yyyy-MM-dd');
  }

  if (range === 'month') {
    return format(startOfMonth(todayDate), 'yyyy-MM-dd');
  }

  return format(addDays(todayDate, -6), 'yyyy-MM-dd');
}

const styles = StyleSheet.create({
  content: {
    gap: spacing.xl,
    paddingBottom: 112,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: spacing.lg,
  },
  headerCopy: {
    flex: 1,
    gap: spacing.xs,
  },
  eyebrow: {
    color: colors.primary,
    ...typography.caption,
    fontWeight: '800',
    textTransform: 'uppercase',
  },
  title: {
    color: colors.text,
    ...typography.title,
  },
  subtitle: {
    color: colors.textMuted,
    ...typography.body,
  },
  headerPill: {
    alignItems: 'center',
    gap: spacing.xs,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radius.pill,
    backgroundColor: colors.primaryMuted,
  },
  headerPillValue: {
    color: colors.primary,
    ...typography.body,
    fontWeight: '900',
  },
  headerPillLabel: {
    color: colors.textMuted,
    ...typography.small,
  },
  analyticsCard: {
    gap: spacing.xl,
    padding: spacing.xl,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.xl,
    backgroundColor: colors.surface,
  },
  analyticsHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: spacing.lg,
  },
  analyticsEyebrow: {
    color: colors.primary,
    ...typography.small,
    fontWeight: '900',
    textTransform: 'uppercase',
  },
  analyticsValue: {
    color: colors.text,
    fontSize: 48,
    lineHeight: 56,
    fontWeight: '900',
  },
  rangeSelector: {
    flexDirection: 'row',
    gap: spacing.sm,
    padding: spacing.xs,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.pill,
    backgroundColor: colors.surfaceElevated,
  },
  rangeButton: {
    flex: 1,
    minHeight: 38,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.sm,
    borderRadius: radius.pill,
  },
  selectedRangeButton: {
    backgroundColor: colors.primary,
  },
  rangeButtonText: {
    color: colors.textMuted,
    ...typography.small,
    fontWeight: '900',
    textTransform: 'uppercase',
  },
  selectedRangeButtonText: {
    color: colors.background,
  },
  chartTransition: {
    minHeight: 200,
    justifyContent: 'center',
  },
  analyticsPill: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radius.pill,
    backgroundColor: colors.surfaceElevated,
  },
  analyticsPillText: {
    color: colors.textMuted,
    ...typography.small,
    textTransform: 'uppercase',
  },
  pressed: {
    opacity: 0.78,
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.md,
  },
  section: {
    gap: spacing.md,
  },
  sectionTitle: {
    color: colors.text,
    ...typography.heading,
  },
  habitList: {
    gap: spacing.md,
  },
  habitRow: {
    minHeight: 88,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.xl,
    backgroundColor: colors.surface,
  },
  habitText: {
    flex: 1,
    gap: spacing.xs,
  },
  habitName: {
    color: colors.text,
    ...typography.body,
    fontWeight: '800',
  },
  habitMeta: {
    color: colors.textMuted,
    ...typography.caption,
  },
  completionCount: {
    color: colors.primary,
    ...typography.caption,
    fontWeight: '900',
  },
  habitProgressTrack: {
    height: 8,
    overflow: 'hidden',
    borderRadius: radius.pill,
    backgroundColor: colors.surfaceMuted,
  },
  habitProgressFill: {
    height: '100%',
    borderRadius: radius.pill,
    backgroundColor: colors.primary,
  },
  habitRatePill: {
    minWidth: 54,
    alignItems: 'center',
    gap: spacing.xs,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: radius.pill,
    backgroundColor: colors.primaryMuted,
  },
  emptyStack: {
    gap: spacing.md,
  },
  errorBanner: {
    gap: 12,
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: colors.destructive,
    borderRadius: radius.lg,
    backgroundColor: colors.surface,
  },
  errorText: {
    color: colors.destructive,
    ...typography.caption,
    fontWeight: '600',
  },
  centeredState: {
    justifyContent: 'center',
  },
  stateTitle: {
    color: colors.text,
    ...typography.heading,
    textAlign: 'center',
  },
});
