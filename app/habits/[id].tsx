import { useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import { useCallback, useMemo, useState } from 'react';
import { Keyboard, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';

import { BottomSheetModal } from '@/src/components/BottomSheetModal';
import { AchievementCard } from '@/src/components/detail/AchievementCard';
import { NumericProgressChart } from '@/src/components/detail/NumericProgressChart';
import { SubtaskCompletionBreakdown } from '@/src/components/detail/SubtaskCompletionBreakdown';
import { EmptyState } from '@/src/components/EmptyState';
import { HabitHeatmap } from '@/src/components/HabitHeatmap';
import { HabitIcon } from '@/src/components/HabitIcon';
import { PrimaryButton } from '@/src/components/PrimaryButton';
import { Screen } from '@/src/components/Screen';
import { getCompletionsForHabit } from '@/src/db/completions';
import { initDatabase } from '@/src/db/database';
import { archiveHabit, getHabitById } from '@/src/db/habits';
import {
  getNumericEntriesForHabit,
  getNumericEntryForDate,
  setNumericEntryForDate,
} from '@/src/db/numericEntries';
import { getSkipsForHabit } from '@/src/db/skips';
import {
  completeSubtaskForDate,
  getSubtaskCompletionsForHabit,
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
  const [allSubtaskCompletions, setAllSubtaskCompletions] = useState<HabitSubtaskCompletion[]>([]);
  const [numericEntry, setNumericEntry] = useState<HabitNumericEntry | null>(null);
  const [numericEntries, setNumericEntries] = useState<HabitNumericEntry[]>([]);
  const [numericValue, setNumericValue] = useState('');
  const [loading, setLoading] = useState(true);
  const [archiving, setArchiving] = useState(false);
  const [archivePromptVisible, setArchivePromptVisible] = useState(false);
  const [updatingProgress, setUpdatingProgress] = useState(false);
  const [updatingSubtaskIds, setUpdatingSubtaskIds] = useState<Record<string, boolean>>({});
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const today = getTodayDateString();
  const progressDate = isDateString(detailDateParam) ? detailDateParam : today;
  const progressDateIsFuture = isFutureDate(progressDate, today);
  const completionDates = useMemo(
    () => completions.map((completion) => completion.date),
    [completions]
  );
  const skippedDates = useMemo(() => skips.map((skip) => skip.date), [skips]);
  const progressDateIsSkipped = skippedDates.includes(progressDate);
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

          const nextHabit = await getHabitById(habitId);

          if (!nextHabit || nextHabit.archived) {
            if (isActive) {
              setHabit(null);
              setCompletions([]);
              setSkips([]);
              setSubtasks([]);
              setSubtaskCompletions([]);
              setAllSubtaskCompletions([]);
              setNumericEntry(null);
              setNumericEntries([]);
              setNumericValue('');
            }
            return;
          }

          const [nextCompletions, nextSkips] = await Promise.all([
            getCompletionsForHabit(habitId),
            getSkipsForHabit(habitId),
          ]);
          const [nextSubtasks, nextSubtaskCompletions, nextAllSubtaskCompletions] =
            nextHabit.trackingType === 'subtasks'
              ? await Promise.all([
                  getSubtasksForHabit(habitId),
                  getSubtaskCompletionsForHabitDate(habitId, progressDate),
                  getSubtaskCompletionsForHabit(habitId),
                ])
              : [[], [], []];
          const [nextNumericEntry, nextNumericEntries] =
            nextHabit.trackingType === 'numeric'
              ? await Promise.all([
                  getNumericEntryForDate(habitId, progressDate),
                  getNumericEntriesForHabit(habitId),
                ])
              : [null, []];

          if (isActive) {
            setHabit(nextHabit);
            setCompletions(nextCompletions);
            setSkips(nextSkips);
            setSubtasks(nextSubtasks);
            setSubtaskCompletions(nextSubtaskCompletions);
            setAllSubtaskCompletions(nextAllSubtaskCompletions);
            setNumericEntry(nextNumericEntry);
            setNumericEntries(nextNumericEntries);
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
    setArchivePromptVisible(true);
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
      setArchivePromptVisible(false);
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

    const [nextCompletions, nextSkips, nextSubtaskCompletions, nextAllSubtaskCompletions, nextNumericEntry, nextNumericEntries] =
      await Promise.all([
        getCompletionsForHabit(habitId),
        getSkipsForHabit(habitId),
        habit?.trackingType === 'subtasks'
          ? getSubtaskCompletionsForHabitDate(habitId, progressDate)
          : Promise.resolve([]),
        habit?.trackingType === 'subtasks'
          ? getSubtaskCompletionsForHabit(habitId)
          : Promise.resolve([]),
        habit?.trackingType === 'numeric'
          ? getNumericEntryForDate(habitId, progressDate)
          : Promise.resolve(null),
        habit?.trackingType === 'numeric'
          ? getNumericEntriesForHabit(habitId)
          : Promise.resolve([]),
      ]);

    setCompletions(nextCompletions);
    setSkips(nextSkips);
    setSubtaskCompletions(nextSubtaskCompletions);
    setAllSubtaskCompletions(nextAllSubtaskCompletions);
    setNumericEntry(nextNumericEntry);
    setNumericEntries(nextNumericEntries);
    setNumericValue(nextNumericEntry ? String(nextNumericEntry.value) : numericValue);
  }

  async function toggleSubtask(subtaskId: string) {
    if (!habitId || progressDateIsFuture || progressDateIsSkipped) {
      return;
    }

    if (updatingSubtaskIds[subtaskId]) {
      return;
    }

    const completedSubtaskIds = new Set(subtaskCompletions.map((completion) => completion.subtaskId));
    const wasCompleted = completedSubtaskIds.has(subtaskId);
    const previousSubtaskCompletions = subtaskCompletions;
    const previousAllSubtaskCompletions = allSubtaskCompletions;
    const optimisticCompletion: HabitSubtaskCompletion = {
      completedAt: new Date().toISOString(),
      date: progressDate,
      habitId,
      id: `optimistic_${subtaskId}_${Date.now()}`,
      subtaskId,
    };
    const nextSubtaskCompletions = wasCompleted
      ? subtaskCompletions.filter((completion) => completion.subtaskId !== subtaskId)
      : [...subtaskCompletions, optimisticCompletion];
    const nextAllSubtaskCompletions = wasCompleted
      ? allSubtaskCompletions.filter(
          (completion) => !(completion.subtaskId === subtaskId && completion.date === progressDate)
        )
      : [...allSubtaskCompletions, optimisticCompletion];

    setSubtaskCompletions(nextSubtaskCompletions);
    setAllSubtaskCompletions(nextAllSubtaskCompletions);

    try {
      setUpdatingSubtaskIds((current) => ({ ...current, [subtaskId]: true }));
      setErrorMessage(null);

      if (wasCompleted) {
        await uncompleteSubtaskForDate(subtaskId, progressDate);
      } else {
        await completeSubtaskForDate(subtaskId, habitId, progressDate);
      }

      await reloadProgress();
    } catch (error) {
      console.error('Failed to update subtask progress', error);
      setSubtaskCompletions(previousSubtaskCompletions);
      setAllSubtaskCompletions(previousAllSubtaskCompletions);
      setErrorMessage('Could not update that subtask. Please try again.');
    } finally {
      setUpdatingSubtaskIds((current) => ({ ...current, [subtaskId]: false }));
    }
  }

  async function saveNumericProgress() {
    if (!habitId || progressDateIsFuture || progressDateIsSkipped) {
      return;
    }

    const parsedValue = Number(numericValue.replace(',', '.'));

    if (!Number.isFinite(parsedValue) || parsedValue < 0) {
      setErrorMessage('Enter a progress value of 0 or more.');
      return;
    }

    try {
      Keyboard.dismiss();
      setUpdatingProgress(true);
      setErrorMessage(null);
      await setNumericEntryForDate(habitId, progressDate, parsedValue);
      setNumericEntry({
        date: progressDate,
        habitId,
        id: numericEntry?.id ?? `optimistic_numeric_${habitId}_${progressDate}`,
        updatedAt: new Date().toISOString(),
        value: parsedValue,
      });
      setNumericEntries((current) => upsertNumericEntry(current, habitId, progressDate, parsedValue));
      void reloadProgress().catch((error) => {
        console.error('Failed to silently refresh numeric detail progress', error);
      });
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
            <Text style={styles.subtitle}>{habit.description ?? 'Habit'}</Text>
          </View>
        </View>

        <View style={styles.headerSummary}>
          <View style={styles.summaryPill}>
            <Text style={styles.summaryValue}>{currentStreak}</Text>
            <Text style={styles.summaryLabel}>current streak</Text>
          </View>
          <View style={styles.summaryPill}>
            <Text style={styles.summaryValue}>{longestStreak}</Text>
            <Text style={styles.summaryLabel}>longest streak</Text>
          </View>
          <View style={styles.summaryPill}>
            <Text style={styles.summaryValue}>{Math.round(completionRate * 100)}%</Text>
            <Text style={styles.summaryLabel}>Success rate</Text>
          </View>
          <View style={styles.summaryPill}>
            <Text style={styles.summaryValue}>{getScheduleSummary(habit)}</Text>
            <Text style={styles.summaryLabel}>schedule</Text>
          </View>
        </View>
      </View>

      <AchievementCard milestone={crownMilestone} />

      {errorMessage ? (
        <View style={styles.errorBanner}>
          <Text style={styles.errorText}>{errorMessage}</Text>
        </View>
      ) : null}

      {habit.trackingType === 'subtasks' ? (
        <>
          <SubtaskProgressCard
            progressDate={progressDate}
            progressDateIsFuture={progressDateIsFuture}
            progressDateIsSkipped={progressDateIsSkipped}
            subtasks={subtasks}
            subtaskCompletions={subtaskCompletions}
            today={today}
            toggleSubtask={toggleSubtask}
            updatingSubtaskIds={updatingSubtaskIds}
          />
          <SubtaskCompletionBreakdown
            completions={allSubtaskCompletions}
            subtasks={subtasks}
          />
        </>
      ) : null}

      {habit.trackingType === 'numeric' ? (
        <>
          <NumericProgressCard
            habit={habit}
            numericEntry={numericEntry}
            numericValue={numericValue}
            onChangeNumericValue={(value) => setNumericValue(value.replace(/[^0-9.,]/g, ''))}
            progressDate={progressDate}
            progressDateIsFuture={progressDateIsFuture}
            progressDateIsSkipped={progressDateIsSkipped}
            saveNumericProgress={saveNumericProgress}
            today={today}
            updatingProgress={updatingProgress}
          />
          <NumericProgressChart
            accentColor={habit.color ?? colors.primary}
            entries={numericEntries}
            today={today}
            unit={habit.targetUnit}
          />
        </>
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

      <BottomSheetModal
        closeOnBackdropPress={!archiving}
        onRequestClose={() => {
          if (!archiving) {
            setArchivePromptVisible(false);
          }
        }}
        sheetStyle={styles.archiveSheet}
        visible={archivePromptVisible}>
        <View style={styles.archivePromptHeader}>
          <View style={styles.archivePromptIcon}>
            <Ionicons color={colors.destructive} name="archive-outline" size={24} />
          </View>
          <View style={styles.archivePromptCopy}>
            <Text style={styles.archivePromptTitle}>Archive habit?</Text>
            <Text style={styles.archivePromptMessage}>
              This pauses the habit and hides it from Today. Your history will stay saved. Any
              scheduled reminder will be canceled.
            </Text>
          </View>
        </View>
        {habit ? (
          <View style={styles.archiveHabitPreview}>
            <HabitIcon
              color={habit.color ?? colors.habitGreen}
              fallbackIcon={habit.icon}
              iconLibrary={habit.iconLibrary}
              iconType={habit.iconType}
              iconValue={habit.iconValue}
              size={42}
            />
            <View style={styles.archiveHabitText}>
              <Text numberOfLines={1} style={styles.archiveHabitName}>
                {habit.name}
              </Text>
              <Text style={styles.archiveHabitMeta}>
                {completionDates.length} completion{completionDates.length === 1 ? '' : 's'} kept
              </Text>
            </View>
          </View>
        ) : null}
        <View style={styles.archivePromptActions}>
          <PrimaryButton
            disabled={archiving}
            onPress={() => setArchivePromptVisible(false)}
            title="Cancel"
            variant="secondary"
          />
          <PrimaryButton
            disabled={archiving}
            onPress={handleArchive}
            title={archiving ? 'Archiving...' : 'Archive habit'}
            variant="danger"
          />
        </View>
      </BottomSheetModal>
    </Screen>
  );
}

function SubtaskProgressCard({
  progressDate,
  progressDateIsFuture,
  progressDateIsSkipped,
  subtasks,
  subtaskCompletions,
  today,
  toggleSubtask,
  updatingSubtaskIds,
}: {
  progressDate: string;
  progressDateIsFuture: boolean;
  progressDateIsSkipped: boolean;
  subtasks: HabitSubtask[];
  subtaskCompletions: HabitSubtaskCompletion[];
  today: string;
  toggleSubtask: (subtaskId: string) => void;
  updatingSubtaskIds: Record<string, boolean>;
}) {
  const requiredSubtasks = subtasks.filter((subtask) => subtask.required);
  const completedSubtaskIds = new Set(subtaskCompletions.map((completion) => completion.subtaskId));
  const completedRequiredCount = requiredSubtasks.filter((subtask) =>
    completedSubtaskIds.has(subtask.id)
  ).length;

  return (
    <View style={styles.progressCard}>
      <View style={styles.progressHeader}>
        <View>
          <Text style={styles.eyebrow}>
            {progressDate === today ? 'Today' : progressDate} checklist
          </Text>
          <Text style={styles.progressTitle}>Subtasks</Text>
        </View>
        <Text style={styles.progressPill}>
          {completedRequiredCount} of {requiredSubtasks.length} done
        </Text>
      </View>

      {subtasks.length === 0 ? (
        <Text style={styles.progressText}>No subtasks yet. Add them from Edit Habit.</Text>
      ) : (
        <View style={styles.subtaskList}>
          {progressDateIsFuture ? (
            <Text style={styles.progressText}>Future days cannot be completed yet.</Text>
          ) : null}
          {progressDateIsSkipped ? (
            <Text style={styles.progressText}>Undo the skip before changing this day.</Text>
          ) : null}
          {subtasks.map((subtask) => {
            const completed = completedSubtaskIds.has(subtask.id);
            const updating = Boolean(updatingSubtaskIds[subtask.id]);

            return (
              <Pressable
                accessibilityLabel={`${completed ? 'Uncheck' : 'Check'} ${subtask.title}`}
                accessibilityRole="checkbox"
                accessibilityState={{ checked: completed }}
                disabled={updating || progressDateIsFuture || progressDateIsSkipped}
                key={subtask.id}
                onPress={() => toggleSubtask(subtask.id)}
                style={({ pressed }) => [
                  styles.subtaskRow,
                  completed && styles.completedSubtaskRow,
                  pressed && styles.pressed,
                  (updating || progressDateIsFuture || progressDateIsSkipped) && styles.disabled,
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
  );
}

function NumericProgressCard({
  habit,
  numericEntry,
  numericValue,
  onChangeNumericValue,
  progressDate,
  progressDateIsFuture,
  progressDateIsSkipped,
  saveNumericProgress,
  today,
  updatingProgress,
}: {
  habit: Habit;
  numericEntry: HabitNumericEntry | null;
  numericValue: string;
  onChangeNumericValue: (value: string) => void;
  progressDate: string;
  progressDateIsFuture: boolean;
  progressDateIsSkipped: boolean;
  saveNumericProgress: () => void;
  today: string;
  updatingProgress: boolean;
}) {
  return (
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
        editable={!updatingProgress && !progressDateIsFuture && !progressDateIsSkipped}
        keyboardType="decimal-pad"
        onChangeText={onChangeNumericValue}
        placeholder="0"
        placeholderTextColor={colors.textSubtle}
        style={styles.numericInput}
        value={numericValue}
      />
      <Text style={styles.progressText}>
        Target: {formatProgressNumber(habit.targetValue ?? 0)}
        {habit.targetUnit ? ` ${habit.targetUnit}` : ''}. Reaching the target completes the habit
        for this date.
      </Text>
      {progressDateIsFuture ? (
        <Text style={styles.progressText}>Future days cannot be completed yet.</Text>
      ) : null}
      {progressDateIsSkipped ? (
        <Text style={styles.progressText}>Undo the skip before changing this day.</Text>
      ) : null}
      <PrimaryButton
        disabled={updatingProgress || progressDateIsFuture || progressDateIsSkipped}
        onPress={saveNumericProgress}
        title={updatingProgress ? 'Saving...' : 'Save Progress'}
      />
    </View>
  );
}

function formatProgressNumber(value: number) {
  return Number.isInteger(value) ? String(value) : value.toFixed(1);
}

function isDateString(value: string | undefined) {
  return Boolean(value && /^\d{4}-\d{2}-\d{2}$/.test(value));
}

function getScheduleSummary(habit: Habit) {
  if (habit.scheduleType === 'weekdays') {
    return 'Set days';
  }

  if (habit.scheduleType === 'cycle') {
    const onDays = habit.scheduleOnDays ?? 1;
    const offDays =
      habit.scheduleOffDays ??
      (habit.scheduleIntervalDays ? Math.max(habit.scheduleIntervalDays - 1, 0) : 0);

    return `${onDays}d / ${offDays}d`;
  }

  return 'Daily';
}

function upsertNumericEntry(
  entries: HabitNumericEntry[],
  habitId: string,
  date: string,
  value: number
) {
  const nextEntry: HabitNumericEntry = {
    date,
    habitId,
    id: entries.find((entry) => entry.date === date)?.id ?? `optimistic_numeric_${habitId}_${date}`,
    updatedAt: new Date().toISOString(),
    value,
  };
  const hasEntry = entries.some((entry) => entry.date === date);
  const nextEntries = hasEntry
    ? entries.map((entry) => (entry.date === date ? nextEntry : entry))
    : [...entries, nextEntry];

  return nextEntries.sort((first, second) => first.date.localeCompare(second.date));
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
  actions: {
    gap: 10,
  },
  archiveSheet: {
    gap: spacing.lg,
    padding: spacing.xl,
    borderTopLeftRadius: radius.xl,
    borderTopRightRadius: radius.xl,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  archivePromptHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  archivePromptIcon: {
    width: 48,
    height: 48,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: colors.destructive,
    borderRadius: radius.lg,
    backgroundColor: colors.surfaceElevated,
  },
  archivePromptCopy: {
    flex: 1,
    gap: spacing.xs,
  },
  archivePromptTitle: {
    color: colors.text,
    ...typography.heading,
  },
  archivePromptMessage: {
    color: colors.textMuted,
    ...typography.body,
  },
  archiveHabitPreview: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.lg,
    backgroundColor: colors.surfaceElevated,
  },
  archiveHabitText: {
    flex: 1,
    gap: spacing.xs,
  },
  archiveHabitName: {
    color: colors.text,
    ...typography.body,
    fontWeight: '900',
  },
  archiveHabitMeta: {
    color: colors.textMuted,
    ...typography.caption,
    fontWeight: '700',
  },
  archivePromptActions: {
    gap: spacing.md,
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
