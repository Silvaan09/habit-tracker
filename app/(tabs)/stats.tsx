import { useFocusEffect } from '@react-navigation/native';
import { addDays, differenceInCalendarDays, format } from 'date-fns';
import { router } from 'expo-router';
import { useCallback, useMemo, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { EmptyState } from '@/src/components/EmptyState';
import { HabitIcon } from '@/src/components/HabitIcon';
import { PrimaryButton } from '@/src/components/PrimaryButton';
import { Screen } from '@/src/components/Screen';
import { StatCard } from '@/src/components/StatCard';
import { WeeklyActivityChart, type WeeklyActivityDay } from '@/src/components/WeeklyActivityChart';
import { getCompletionsForDate, getCompletionsForHabit } from '@/src/db/completions';
import { initDatabase } from '@/src/db/database';
import { getActiveHabits } from '@/src/db/habits';
import { colors, radius, spacing, typography } from '@/src/theme';
import type { Habit, HabitCompletion } from '@/src/types/Habit';
import { getTodayDateString } from '@/src/utils/dates';
import {
  calculateCurrentStreak,
  calculateLongestStreak,
} from '@/src/utils/streaks';

type HabitWithCompletions = {
  habit: Habit;
  completions: HabitCompletion[];
};

export default function StatsScreen() {
  const [habitStats, setHabitStats] = useState<HabitWithCompletions[]>([]);
  const [todayCompletionCount, setTodayCompletionCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const today = getTodayDateString();
  const loadStats = useCallback(async () => {
    setLoading(true);
    setErrorMessage(null);
    await initDatabase();

    const activeHabits = await getActiveHabits();
    const [todayCompletions, completionsByHabit] = await Promise.all([
      getCompletionsForDate(today),
      Promise.all(activeHabits.map((habit) => getCompletionsForHabit(habit.id))),
    ]);
    const activeHabitIds = new Set(activeHabits.map((habit) => habit.id));

    setTodayCompletionCount(
      todayCompletions.filter((completion) => activeHabitIds.has(completion.habitId)).length
    );
    setHabitStats(
      activeHabits.map((habit, index) => ({
        habit,
        completions: completionsByHabit[index],
      }))
    );
    setLoading(false);
  }, [today]);

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

  const stats = useMemo(() => {
    let totalCompletions = 0;
    let totalPossibleHabitDays = 0;
    let totalCompletedPossibleHabitDays = 0;
    let bestCurrentStreak = 0;
    let bestLongestStreak = 0;

    for (const item of habitStats) {
      const completionDates = item.completions.map((completion) => completion.date);
      const createdDate = getLocalDateStringFromValue(item.habit.createdAt);
      const possibleDays = Math.max(getInclusiveDayCount(createdDate, today), 0);
      const completedPossibleDays = Array.from(new Set(completionDates)).filter(
        (date) => date >= createdDate && date <= today
      ).length;

      totalCompletions += item.completions.length;
      totalPossibleHabitDays += possibleDays;
      totalCompletedPossibleHabitDays += completedPossibleDays;
      bestCurrentStreak = Math.max(
        bestCurrentStreak,
        calculateCurrentStreak(completionDates, today)
      );
      bestLongestStreak = Math.max(bestLongestStreak, calculateLongestStreak(completionDates));
    }

    return {
      activeHabitsCount: habitStats.length,
      bestCurrentStreak,
      bestLongestStreak,
      overallCompletionRate:
        totalPossibleHabitDays === 0
          ? 0
          : totalCompletedPossibleHabitDays / totalPossibleHabitDays,
      totalCompletions,
    };
  }, [habitStats, today]);
  const weeklyActivity = useMemo(
    () => getWeeklyActivity(habitStats, today),
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
            {Math.round(stats.overallCompletionRate * 100)}%
          </Text>
          <Text style={styles.headerPillLabel}>overall</Text>
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
                <Text style={styles.analyticsEyebrow}>Weekly completion</Text>
                <Text style={styles.analyticsValue}>
                  {Math.round(stats.overallCompletionRate * 100)}%
                </Text>
              </View>
              <View style={styles.analyticsPill}>
                <Text style={styles.analyticsPillText}>Last 7 days</Text>
              </View>
            </View>
            <WeeklyActivityChart days={weeklyActivity} />
          </View>

          <View style={styles.statsGrid}>
            <StatCard label="Active habits" value={String(stats.activeHabitsCount)} />
            <StatCard label="Completed today" value={String(todayCompletionCount)} />
            <StatCard label="Total completions" value={String(stats.totalCompletions)} />
            <StatCard
              label="Overall completion"
              value={`${Math.round(stats.overallCompletionRate * 100)}%`}
            />
            <StatCard
              label="Best current streak"
              value={`${stats.bestCurrentStreak} day${stats.bestCurrentStreak === 1 ? '' : 's'}`}
            />
            <StatCard
              label="Best longest streak"
              value={`${stats.bestLongestStreak} day${stats.bestLongestStreak === 1 ? '' : 's'}`}
            />
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Active habits</Text>
            <View style={styles.habitList}>
              {habitStats.map((item) => {
                const completionDates = item.completions.map((completion) => completion.date);
                const currentStreak = calculateCurrentStreak(completionDates, today);
                const completionRate = getHabitCompletionRate(item, today);

                return (
                  <View key={item.habit.id} style={styles.habitRow}>
                    <HabitIcon
                      color={item.habit.color ?? colors.habitGreen}
                      fallbackIcon={item.habit.icon ?? item.habit.name.charAt(0).toUpperCase()}
                      iconLibrary={item.habit.iconLibrary}
                      iconType={item.habit.iconType}
                      iconValue={item.habit.iconValue}
                      size={42}
                    />
                    <View style={styles.habitText}>
                      <Text style={styles.habitName}>{item.habit.name}</Text>
                      <Text style={styles.habitMeta}>
                        {currentStreak} day{currentStreak === 1 ? '' : 's'} current streak
                      </Text>
                      <View style={styles.habitProgressTrack}>
                        <View
                          style={[
                            styles.habitProgressFill,
                            { width: `${Math.round(completionRate * 100)}%` },
                          ]}
                        />
                      </View>
                    </View>
                    <View style={styles.habitRatePill}>
                      <Text style={styles.completionCount}>{Math.round(completionRate * 100)}%</Text>
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

function getInclusiveDayCount(startDate: string, endDate: string) {
  const start = parseDateString(startDate);
  const end = parseDateString(endDate);

  return differenceInCalendarDays(end, start) + 1;
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
    const completedCount = habitStats.filter((item) =>
      item.completions.some((completion) => completion.date === dateString)
    ).length;
    const totalCount = habitStats.length;

    return {
      date: dateString,
      weekday: format(date, 'EEE'),
      completedCount,
      totalCount,
      percentage: totalCount === 0 ? 0 : completedCount / totalCount,
    };
  });
}

function getHabitCompletionRate(item: HabitWithCompletions, today: string) {
  const createdDate = getLocalDateStringFromValue(item.habit.createdAt);
  const possibleDays = Math.max(getInclusiveDayCount(createdDate, today), 0);

  if (possibleDays === 0) {
    return 0;
  }

  const completedDays = Array.from(new Set(item.completions.map((completion) => completion.date)))
    .filter((date) => date >= createdDate && date <= today).length;

  return Math.min(completedDays / possibleDays, 1);
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
    textTransform: 'uppercase',
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
