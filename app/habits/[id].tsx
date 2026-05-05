import { useFocusEffect } from '@react-navigation/native';
import { router, useLocalSearchParams } from 'expo-router';
import { useCallback, useMemo, useState } from 'react';
import { Alert, StyleSheet, Text, View } from 'react-native';

import { EmptyState } from '@/src/components/EmptyState';
import { HabitHeatmap } from '@/src/components/HabitHeatmap';
import { HabitIcon } from '@/src/components/HabitIcon';
import { PrimaryButton } from '@/src/components/PrimaryButton';
import { Screen } from '@/src/components/Screen';
import { StatCard } from '@/src/components/StatCard';
import { getCompletionsForHabit } from '@/src/db/completions';
import { initDatabase } from '@/src/db/database';
import { archiveHabit, getHabitById } from '@/src/db/habits';
import { cancelHabitReminderForHabit } from '@/src/notifications/notifications';
import { colors, radius, spacing, typography } from '@/src/theme';
import type { Habit, HabitCompletion } from '@/src/types/Habit';
import { getTodayDateString } from '@/src/utils/dates';
import {
  calculateCompletionRate,
  calculateCurrentStreak,
  calculateLongestStreak,
} from '@/src/utils/streaks';

export default function HabitDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const habitId = Array.isArray(id) ? id[0] : id;
  const [habit, setHabit] = useState<Habit | null>(null);
  const [completions, setCompletions] = useState<HabitCompletion[]>([]);
  const [loading, setLoading] = useState(true);
  const [archiving, setArchiving] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const today = getTodayDateString();
  const completionDates = useMemo(
    () => completions.map((completion) => completion.date),
    [completions]
  );
  const currentStreak = useMemo(
    () => calculateCurrentStreak(completionDates, today),
    [completionDates, today]
  );
  const longestStreak = useMemo(
    () => calculateLongestStreak(completionDates),
    [completionDates]
  );
  const completionRate = useMemo(
    () => (habit ? calculateCompletionRate(completionDates, habit.createdAt, today) : 0),
    [completionDates, habit, today]
  );

  useFocusEffect(
    useCallback(() => {
      let isActive = true;

      async function loadHabit() {
        if (!habitId) {
          setLoading(false);
          return;
        }

        try {
          setLoading(true);
          setErrorMessage(null);
          await initDatabase();

          const [nextHabit, nextCompletions] = await Promise.all([
            getHabitById(habitId),
            getCompletionsForHabit(habitId),
          ]);

          if (isActive) {
            setHabit(nextHabit && !nextHabit.archived ? nextHabit : null);
            setCompletions(nextHabit?.archived ? [] : nextCompletions);
          }
        } catch (error) {
          console.error('Failed to load habit detail', error);

          if (isActive) {
            setErrorMessage('Could not load this habit.');
          }
        } finally {
          if (isActive) {
            setLoading(false);
          }
        }
      }

      loadHabit();

      return () => {
        isActive = false;
      };
    }, [habitId])
  );

  function confirmArchive() {
    Alert.alert(
      'Archive habit?',
      'This habit will disappear from Today, but its historical completions will stay saved. Any scheduled reminder will be canceled.',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Archive', style: 'destructive', onPress: handleArchive },
      ]
    );
  }

  async function handleArchive() {
    if (!habitId) {
      return;
    }

    try {
      setArchiving(true);
      setErrorMessage(null);
      if (habit) {
        await cancelHabitReminderForHabit(habit);
      }
      await archiveHabit(habitId);
      router.replace('/');
    } catch (error) {
      console.error('Failed to archive habit', error);
      setErrorMessage('Could not archive this habit. Please try again.');
    } finally {
      setArchiving(false);
    }
  }

  if (loading) {
    return (
      <Screen contentContainerStyle={[styles.content, styles.centeredState]}>
        <Text style={styles.stateTitle}>Loading habit...</Text>
      </Screen>
    );
  }

  if (!habit) {
    return (
      <Screen contentContainerStyle={styles.content}>
        <EmptyState
          title="Habit not found"
          message="This habit may have been archived or removed from the active list."
        />
        <PrimaryButton onPress={() => router.replace('/')} title="Back to Today" />
      </Screen>
    );
  }

  return (
    <Screen contentContainerStyle={styles.content}>
      <View style={[styles.headerCard, { borderColor: habit.color ?? colors.primary }]}>
        <View style={styles.headerTop}>
          <HabitIcon
            color={habit.color ?? colors.habitGreen}
            fallbackIcon={habit.icon ?? habit.name.charAt(0).toUpperCase()}
            iconLibrary={habit.iconLibrary}
            iconType={habit.iconType}
            iconValue={habit.iconValue}
            size={70}
          />
          <View style={styles.headerCopy}>
            <Text style={styles.eyebrow}>Habit detail</Text>
            <Text style={styles.title}>{habit.name}</Text>
            <Text style={styles.subtitle}>{habit.description ?? 'Daily habit'}</Text>
          </View>
        </View>

        <View style={styles.headerSummary}>
          <View style={styles.summaryPill}>
            <Text style={styles.summaryValue}>{currentStreak}</Text>
            <Text style={styles.summaryLabel}>current streak</Text>
          </View>
          <View style={styles.summaryPill}>
            <Text style={styles.summaryValue}>{Math.round(completionRate * 100)}%</Text>
            <Text style={styles.summaryLabel}>completion</Text>
          </View>
        </View>
      </View>

      {errorMessage ? (
        <View style={styles.errorBanner}>
          <Text style={styles.errorText}>{errorMessage}</Text>
        </View>
      ) : null}

      <View style={styles.statsGrid}>
        <StatCard label="Current streak" value={`${currentStreak} day${currentStreak === 1 ? '' : 's'}`} />
        <StatCard label="Longest streak" value={`${longestStreak} day${longestStreak === 1 ? '' : 's'}`} />
        <StatCard label="Total completions" value={String(completions.length)} />
        <StatCard label="Completion rate" value={`${Math.round(completionRate * 100)}%`} />
      </View>

      <HabitHeatmap
        color={habit.color ?? colors.primary}
        completionDates={completionDates}
        today={today}
      />

      <View style={styles.actions}>
        <PrimaryButton
          onPress={() => router.push({ pathname: '/habits/edit/[id]', params: { id: habit.id } })}
          title="Edit Habit"
        />
        <PrimaryButton
          disabled={archiving}
          onPress={confirmArchive}
          title={archiving ? 'Archiving...' : 'Archive Habit'}
          variant="danger"
        />
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: {
    gap: spacing.xl,
    paddingBottom: 112,
  },
  headerCard: {
    gap: spacing.xl,
    padding: spacing.xl,
    borderWidth: 1,
    borderRadius: radius.xl,
    backgroundColor: colors.surface,
  },
  headerTop: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.lg,
  },
  headerCopy: {
    flex: 1,
    gap: spacing.xs,
  },
  eyebrow: {
    color: colors.primary,
    ...typography.small,
    fontWeight: '900',
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
  headerSummary: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  summaryPill: {
    flex: 1,
    gap: spacing.xs,
    padding: spacing.lg,
    borderRadius: radius.lg,
    backgroundColor: colors.surfaceElevated,
  },
  summaryValue: {
    color: colors.primary,
    fontSize: 26,
    fontWeight: '900',
  },
  summaryLabel: {
    color: colors.textMuted,
    ...typography.small,
    textTransform: 'uppercase',
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.md,
  },
  actions: {
    gap: 10,
  },
  errorBanner: {
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
