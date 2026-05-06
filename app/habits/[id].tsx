import { useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import { useCallback, useMemo, useState } from 'react';
import { Alert, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';

import { EmptyState } from '@/src/components/EmptyState';
import { HabitCrownBadge } from '@/src/components/HabitCrownBadge';
import { HabitHeatmap } from '@/src/components/HabitHeatmap';
import { HabitIcon } from '@/src/components/HabitIcon';
import { PrimaryButton } from '@/src/components/PrimaryButton';
import { Screen } from '@/src/components/Screen';
import { StatCard } from '@/src/components/StatCard';
import { getCompletionsForHabit } from '@/src/db/completions';
import { initDatabase } from '@/src/db/database';
import { archiveHabit, getHabitById } from '@/src/db/habits';
import { getNumericEntryForDate, setNumericEntryForDate } from '@/src/db/numericEntries';
import { getSkipsForHabit } from '@/src/db/skips';
import {
  completeSubtaskForDate,
  getSubtaskCompletionsForHabitDate,
  getSubtasksForHabit,
  uncompleteSubtaskForDate,
} from '@/src/db/subtasks';
import { cancelHabitReminderForHabit } from '@/src/notifications/notifications';
import { colors, radius, spacing, typography } from '@/src/theme';
import type {
  Habit,
  HabitCompletion,
  HabitNumericEntry,
  HabitSkip,
  HabitSubtask,
  HabitSubtaskCompletion,
} from '@/src/types/Habit';
import { getTodayDateString, isFutureDate } from '@/src/utils/dates';
import {
  calculateScheduleAwareCurrentStreak,
  calculateScheduleAwareLongestStreak,
  getHabitCrownMilestone,
} from '@/src/utils/milestones';
import { calculateScheduleAwareCompletionRate } from '@/src/utils/schedule';

export default function HabitDetailScreen() {
  const { date, id } = useLocalSearchParams<{ date?: string; id: string }>();
  const habitId = Array.isArray(id) ? id[0] : id;
  const detailDateParam = Array.isArray(date) ? date[0] : date;
  const [habit, setHabit] = useState<Habit | null>(null);
  const [completions, setCompletions] = useState<HabitCompletion[]>([]);
  const [skips, setSkips] = useState<HabitSkip[]>([]);
  const [subtasks, setSubtasks] = useState<HabitSubtask[]>([]);
  const [subtaskCompletions, setSubtaskCompletions] = useState<HabitSubtaskCompletion[]>([]);
  const [numericEntry, setNumericEntry] = useState<HabitNumericEntry | null>(null);
  const [numericValue, setNumericValue] = useState('');
  const [loading, setLoading] = useState(true);
  const [archiving, setArchiving] = useState(false);
  const [updatingProgress, setUpdatingProgress] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const today = getTodayDateString();
  const progressDate = isDateString(detailDateParam) ? detailDateParam : today;
  const progressDateIsFuture = isFutureDate(progressDate, today);
  const completionDates = useMemo(
    () => completions.map((completion) => completion.date),
    [completions]
  );
  const skippedDates = useMemo(() => skips.map((skip) => skip.date), [skips]);
  const currentStreak = useMemo(
    () =>
      habit
        ? calculateScheduleAwareCurrentStreak(habit, completionDates, today, skippedDates)
        : 0,
    [completionDates, habit, skippedDates, today]
  );
  const crownMilestone = useMemo(
    () => getHabitCrownMilestone(currentStreak),
    [currentStreak]
  );
  const longestStreak = useMemo(
    () =>
      habit
        ? calculateScheduleAwareLongestStreak(habit, completionDates, today, skippedDates)
        : 0,
    [completionDates, habit, skippedDates, today]
  );
  const completionRate = useMemo(
    () =>
      habit
        ? calculateScheduleAwareCompletionRate(habit, completionDates, today, skippedDates)
        : 0,
    [completionDates, habit, skippedDates, today]
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

          const [
            nextHabit,
            nextCompletions,
            nextSkips,
            nextSubtasks,
            nextSubtaskCompletions,
            nextNumericEntry,
          ] = await Promise.all([
            getHabitById(habitId),
            getCompletionsForHabit(habitId),
            getSkipsForHabit(habitId),
            getSubtasksForHabit(habitId),
            getSubtaskCompletionsForHabitDate(habitId, progressDate),
            getNumericEntryForDate(habitId, progressDate),
          ]);

          if (isActive) {
            setHabit(nextHabit && !nextHabit.archived ? nextHabit : null);
            setCompletions(nextHabit?.archived ? [] : nextCompletions);
            setSkips(nextHabit?.archived ? [] : nextSkips);
            setSubtasks(nextHabit?.archived ? [] : nextSubtasks);
            setSubtaskCompletions(nextHabit?.archived ? [] : nextSubtaskCompletions);
            setNumericEntry(nextHabit?.archived ? null : nextNumericEntry);
            setNumericValue(nextNumericEntry ? String(nextNumericEntry.value) : '');
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
    }, [habitId, progressDate])
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

  async function reloadProgress() {
    if (!habitId || progressDateIsFuture) {
      return;
    }

    const [nextCompletions, nextSkips, nextSubtaskCompletions, nextNumericEntry] =
      await Promise.all([
        getCompletionsForHabit(habitId),
        getSkipsForHabit(habitId),
        getSubtaskCompletionsForHabitDate(habitId, progressDate),
        getNumericEntryForDate(habitId, progressDate),
      ]);

    setCompletions(nextCompletions);
    setSkips(nextSkips);
    setSubtaskCompletions(nextSubtaskCompletions);
    setNumericEntry(nextNumericEntry);
    setNumericValue(nextNumericEntry ? String(nextNumericEntry.value) : numericValue);
  }

  async function toggleSubtask(subtaskId: string) {
    if (!habitId) {
      return;
    }

    const completedSubtaskIds = new Set(
      subtaskCompletions.map((completion) => completion.subtaskId)
    );

    try {
      setUpdatingProgress(true);
      setErrorMessage(null);

      if (completedSubtaskIds.has(subtaskId)) {
        await uncompleteSubtaskForDate(subtaskId, progressDate);
      } else {
        await completeSubtaskForDate(subtaskId, habitId, progressDate);
      }

      await reloadProgress();
    } catch (error) {
      console.error('Failed to update subtask progress', error);
      setErrorMessage('Could not update that subtask. Please try again.');
    } finally {
      setUpdatingProgress(false);
    }
  }

  async function saveNumericProgress() {
    if (!habitId) {
      return;
    }

    const parsedValue = Number(numericValue.replace(',', '.'));

    if (!Number.isFinite(parsedValue) || parsedValue < 0) {
      setErrorMessage('Enter a progress value of 0 or more.');
      return;
    }

    try {
      setUpdatingProgress(true);
      setErrorMessage(null);
      await setNumericEntryForDate(habitId, progressDate, parsedValue);
      await reloadProgress();
    } catch (error) {
      console.error('Failed to save numeric progress', error);
      setErrorMessage('Could not save progress. Please try again.');
    } finally {
      setUpdatingProgress(false);
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
            fallbackIcon={habit.icon}
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
            {crownMilestone.tier === 'none' ? (
              <Text style={styles.noCrownText}>No crown yet</Text>
            ) : (
              <HabitCrownBadge milestone={crownMilestone} />
            )}
            <Text style={styles.summaryLabel}>achievement</Text>
          </View>
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

      {habit.trackingType === 'subtasks' ? (
        <View style={styles.progressCard}>
          <View style={styles.progressHeader}>
            <View>
              <Text style={styles.eyebrow}>
                {progressDate === today ? 'Today' : progressDate} checklist
              </Text>
              <Text style={styles.progressTitle}>Subtasks</Text>
            </View>
            <Text style={styles.progressPill}>
              {subtaskCompletions.length}/{subtasks.filter((subtask) => subtask.required).length}
            </Text>
          </View>

          {subtasks.length === 0 ? (
            <Text style={styles.progressText}>No subtasks yet. Add them from Edit Habit.</Text>
          ) : (
            <View style={styles.subtaskList}>
              {progressDateIsFuture ? (
                <Text style={styles.progressText}>Future days cannot be completed yet.</Text>
              ) : null}
              {subtasks.map((subtask) => {
                const completed = subtaskCompletions.some(
                  (completion) => completion.subtaskId === subtask.id
                );

                return (
                  <Pressable
                    accessibilityLabel={`${completed ? 'Uncheck' : 'Check'} ${subtask.title}`}
                    accessibilityRole="checkbox"
                    accessibilityState={{ checked: completed }}
                    disabled={updatingProgress || progressDateIsFuture}
                    key={subtask.id}
                    onPress={() => toggleSubtask(subtask.id)}
                    style={({ pressed }) => [
                      styles.subtaskRow,
                      completed && styles.completedSubtaskRow,
                      pressed && styles.pressed,
                      (updatingProgress || progressDateIsFuture) && styles.disabled,
                    ]}>
                    <View style={[styles.subtaskCheck, completed && styles.completedSubtaskCheck]}>
                      {completed ? (
                        <Ionicons name="checkmark" size={16} color={colors.background} />
                      ) : null}
                    </View>
                    <Text style={styles.subtaskTitle}>{subtask.title}</Text>
                  </Pressable>
                );
              })}
            </View>
          )}
        </View>
      ) : null}

      {habit.trackingType === 'numeric' ? (
        <View style={styles.progressCard}>
          <View style={styles.progressHeader}>
            <View>
              <Text style={styles.eyebrow}>
                {progressDate === today ? 'Today' : progressDate} progress
              </Text>
              <Text style={styles.progressTitle}>Numeric goal</Text>
            </View>
            <Text style={styles.progressPill}>
              {formatProgressNumber(numericEntry?.value ?? 0)}/
              {formatProgressNumber(habit.targetValue ?? 0)}
              {habit.targetUnit ? ` ${habit.targetUnit}` : ''}
            </Text>
          </View>
          <TextInput
            accessibilityLabel="Numeric progress value"
            editable={!updatingProgress && !progressDateIsFuture}
            keyboardType="decimal-pad"
            onChangeText={(value) => setNumericValue(value.replace(/[^0-9.,]/g, ''))}
            placeholder="0"
            placeholderTextColor={colors.textSubtle}
            style={styles.numericInput}
            value={numericValue}
          />
          <Text style={styles.progressText}>
            Target: {formatProgressNumber(habit.targetValue ?? 0)}
            {habit.targetUnit ? ` ${habit.targetUnit}` : ''}. Reaching the target completes the
            habit for this date.
          </Text>
          {progressDateIsFuture ? (
            <Text style={styles.progressText}>Future days cannot be completed yet.</Text>
          ) : null}
          <PrimaryButton
            disabled={updatingProgress || progressDateIsFuture}
            onPress={saveNumericProgress}
            title={updatingProgress ? 'Saving...' : 'Save Progress'}
          />
        </View>
      ) : null}

      <HabitHeatmap
        color={habit.color ?? colors.primary}
        completionDates={completionDates}
        skippedDates={skippedDates}
        subtitle={habit.description}
        today={today}
        title={habit.name}
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

function formatProgressNumber(value: number) {
  return Number.isInteger(value) ? String(value) : value.toFixed(1);
}

function isDateString(value: string | undefined) {
  return Boolean(value && /^\d{4}-\d{2}-\d{2}$/.test(value));
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
    flexWrap: 'wrap',
    gap: spacing.md,
  },
  summaryPill: {
    flexGrow: 1,
    minWidth: 120,
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
  noCrownText: {
    color: colors.textMuted,
    ...typography.caption,
    fontWeight: '900',
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.md,
  },
  actions: {
    gap: 10,
  },
  progressCard: {
    gap: spacing.lg,
    padding: spacing.xl,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.xl,
    backgroundColor: colors.surface,
  },
  progressHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: spacing.md,
  },
  progressTitle: {
    color: colors.text,
    ...typography.heading,
  },
  progressPill: {
    color: colors.primary,
    ...typography.caption,
    fontWeight: '900',
  },
  progressText: {
    color: colors.textMuted,
    ...typography.caption,
  },
  subtaskList: {
    gap: spacing.sm,
  },
  subtaskRow: {
    minHeight: 54,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.lg,
    backgroundColor: colors.surfaceElevated,
  },
  completedSubtaskRow: {
    borderColor: colors.primary,
    backgroundColor: colors.primaryMuted,
  },
  subtaskCheck: {
    width: 28,
    height: 28,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: colors.surfaceMuted,
    borderRadius: radius.pill,
  },
  completedSubtaskCheck: {
    borderColor: colors.primary,
    backgroundColor: colors.primary,
  },
  subtaskTitle: {
    flex: 1,
    color: colors.text,
    ...typography.body,
    fontWeight: '800',
  },
  numericInput: {
    minHeight: 58,
    paddingHorizontal: spacing.lg,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.lg,
    color: colors.text,
    backgroundColor: colors.surfaceElevated,
    ...typography.body,
  },
  pressed: {
    opacity: 0.78,
  },
  disabled: {
    opacity: 0.42,
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
