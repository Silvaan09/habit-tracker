import { useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { addDays, addWeeks, format, parseISO, startOfWeek } from 'date-fns';
import { router } from 'expo-router';
import { useCallback, useMemo, useRef, useState } from 'react';
import {
  GestureResponderEvent,
  Modal,
  PanResponder,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';

import { EmptyState } from '@/src/components/EmptyState';
import { HabitIcon } from '@/src/components/HabitIcon';
import { PrimaryButton } from '@/src/components/PrimaryButton';
import { Screen } from '@/src/components/Screen';
import {
  completeHabitForDate,
  getCompletionsForDate,
  uncompleteHabitForDate,
} from '@/src/db/completions';
import { initDatabase } from '@/src/db/database';
import { getActiveHabits } from '@/src/db/habits';
import { getNumericEntryForDate } from '@/src/db/numericEntries';
import { getSkipsForDate, skipHabitForDate, unskipHabitForDate } from '@/src/db/skips';
import {
  getSubtaskCompletionsForHabitDate,
  getSubtasksForHabit,
} from '@/src/db/subtasks';
import { colors, radius, spacing, typography } from '@/src/theme';
import type { Habit, HabitCompletion, HabitSkip } from '@/src/types/Habit';
import {
  formatDisplayDateDDMMYYYY,
  getTodayDateString,
  isFutureDate,
} from '@/src/utils/dates';
import { getScheduledHabitsForDate } from '@/src/utils/schedule';

type HabitProgress = {
  label: string;
  percent: number;
};

export default function TodayScreen() {
  const [habits, setHabits] = useState<Habit[]>([]);
  const [completions, setCompletions] = useState<HabitCompletion[]>([]);
  const [skips, setSkips] = useState<HabitSkip[]>([]);
  const [progressByHabitId, setProgressByHabitId] = useState<Record<string, HabitProgress>>({});
  const [actualTodayDate, setActualTodayDate] = useState(getTodayDateString);
  const [selectedDate, setSelectedDate] = useState(getTodayDateString);
  const [visibleWeekStart, setVisibleWeekStart] = useState(() =>
    getWeekStartDateString(getTodayDateString())
  );
  const selectedDateRef = useRef(selectedDate);
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [busyHabitIds, setBusyHabitIds] = useState<Record<string, boolean>>({});
  const [skipTargetHabitId, setSkipTargetHabitId] = useState<string | null>(null);
  const [skipReason, setSkipReason] = useState('');
  const [skipReasonError, setSkipReasonError] = useState<string | null>(null);
  const [skipping, setSkipping] = useState(false);

  const loadTodayData = useCallback(async (dateToLoad: string) => {
    const currentToday = getTodayDateString();

    setActualTodayDate(currentToday);
    await initDatabase();

    const [activeHabits, dateCompletions, dateSkips] = await Promise.all([
      getActiveHabits(),
      getCompletionsForDate(dateToLoad),
      getSkipsForDate(dateToLoad),
    ]);

    setHabits(activeHabits);
    setCompletions(dateCompletions);
    setSkips(dateSkips);
    setProgressByHabitId(await getProgressByHabitId(activeHabits, dateToLoad));
  }, []);

  useFocusEffect(
    useCallback(() => {
      let isActive = true;

      async function setup() {
        try {
          setLoading(true);
          setErrorMessage(null);
          await loadTodayData(selectedDateRef.current);
        } catch (error) {
          console.error('Failed to initialize Today screen data', error);

          if (isActive) {
            setErrorMessage('Something went wrong while loading your habits.');
          }
        } finally {
          if (isActive) {
            setLoading(false);
          }
        }
      }

      setup();

      return () => {
        isActive = false;
      };
    }, [loadTodayData])
  );

  const completedHabitIds = useMemo(
    () => new Set(completions.map((completion) => completion.habitId)),
    [completions]
  );
  const skippedHabitIds = useMemo(() => new Set(skips.map((skip) => skip.habitId)), [skips]);
  const skipByHabitId = useMemo(() => {
    const skipMap = new Map<string, HabitSkip>();

    for (const skip of skips) {
      skipMap.set(skip.habitId, skip);
    }

    return skipMap;
  }, [skips]);

  const scheduledHabits = useMemo(
    () => getScheduledHabitsForDate(habits, selectedDate),
    [habits, selectedDate]
  );
  const completedCount = useMemo(
    () => scheduledHabits.filter((habit) => completedHabitIds.has(habit.id)).length,
    [completedHabitIds, scheduledHabits]
  );
  const skippedCount = useMemo(
    () => scheduledHabits.filter((habit) => skippedHabitIds.has(habit.id)).length,
    [scheduledHabits, skippedHabitIds]
  );
  const remainingCount = Math.max(scheduledHabits.length - completedCount - skippedCount, 0);
  const selectedDateIsFuture = useMemo(
    () => isFutureDate(selectedDate, actualTodayDate),
    [actualTodayDate, selectedDate]
  );
  const selectedDateDisplay = useMemo(
    () => formatDisplayDateDDMMYYYY(selectedDate),
    [selectedDate]
  );
  const trackableHabitCount = Math.max(scheduledHabits.length - skippedCount, 0);
  const completionPercent =
    trackableHabitCount === 0 ? 0 : Math.round((completedCount / trackableHabitCount) * 100);
  const dateStripDays = useMemo(
    () => getDateStripDays(visibleWeekStart, actualTodayDate, selectedDate),
    [actualTodayDate, selectedDate, visibleWeekStart]
  );
  const selectedDayLabel = useMemo(
    () => getSelectedDayLabel(selectedDate, actualTodayDate),
    [actualTodayDate, selectedDate]
  );
  const motivationLine = useMemo(
    () => getMotivationLine(completionPercent),
    [completionPercent]
  );
  const selectedDateLabel = useMemo(
    () => (selectedDate === actualTodayDate ? 'today' : format(parseISO(selectedDate), 'MMM d')),
    [actualTodayDate, selectedDate]
  );
  const selectDate = useCallback(
    async (date: string) => {
      try {
        selectedDateRef.current = date;
        setSelectedDate(date);
        setErrorMessage(null);
        setBusyHabitIds({});
        await loadTodayData(date);
      } catch (error) {
        console.error('Failed to load completions for selected date', error);
        setErrorMessage('Could not load habits for that day. Please try again.');
      }
    },
    [loadTodayData]
  );
  const shiftWeek = useCallback(
    async (direction: -1 | 1) => {
      const nextWeekStart = format(addWeeks(parseISO(visibleWeekStart), direction), 'yyyy-MM-dd');
      const nextSelectedDate = format(
        addWeeks(parseISO(selectedDateRef.current), direction),
        'yyyy-MM-dd'
      );

      setVisibleWeekStart(nextWeekStart);
      await selectDate(nextSelectedDate);
    },
    [selectDate, visibleWeekStart]
  );
  const visibleWeekLabel = useMemo(() => {
    const weekStart = parseISO(visibleWeekStart);
    const weekEnd = addDays(weekStart, 6);

    return `${format(weekStart, 'MMM d')} - ${format(weekEnd, 'MMM d')}`;
  }, [visibleWeekStart]);
  const weekPanResponder = useMemo(
    () =>
      PanResponder.create({
        onMoveShouldSetPanResponder: (_, gestureState) =>
          Math.abs(gestureState.dx) > 24 && Math.abs(gestureState.dx) > Math.abs(gestureState.dy),
        onPanResponderRelease: (_, gestureState) => {
          if (gestureState.dx < -48) {
            shiftWeek(1);
          }

          if (gestureState.dx > 48) {
            shiftWeek(-1);
          }
        },
      }),
    [shiftWeek]
  );

  async function refreshSelectedDateStatuses() {
    const [dateCompletions, dateSkips] = await Promise.all([
      getCompletionsForDate(selectedDate),
      getSkipsForDate(selectedDate),
    ]);

    setCompletions(dateCompletions);
    setSkips(dateSkips);
    setProgressByHabitId(await getProgressByHabitId(habits, selectedDate));
  }

  async function toggleHabit(habitId: string) {
    if (selectedDateIsFuture) {
      return;
    }

    try {
      setErrorMessage(null);
      setBusyHabitIds((current) => ({ ...current, [habitId]: true }));

      if (completedHabitIds.has(habitId)) {
        await uncompleteHabitForDate(habitId, selectedDate);
      } else {
        await completeHabitForDate(habitId, selectedDate);
      }

      await refreshSelectedDateStatuses();
    } catch (error) {
      console.error('Failed to toggle habit completion', error);
      setErrorMessage('Could not update that habit. Please try again.');
    } finally {
      setBusyHabitIds((current) => ({ ...current, [habitId]: false }));
    }
  }

  function openSkipModal(habitId: string) {
    if (selectedDateIsFuture || completedHabitIds.has(habitId)) {
      return;
    }

    setSkipTargetHabitId(habitId);
    setSkipReason('');
    setSkipReasonError(null);
  }

  function closeSkipModal() {
    if (skipping) {
      return;
    }

    setSkipTargetHabitId(null);
    setSkipReason('');
    setSkipReasonError(null);
  }

  async function submitSkip() {
    if (!skipTargetHabitId || selectedDateIsFuture) {
      return;
    }

    const trimmedReason = skipReason.trim();

    if (!trimmedReason) {
      setSkipReasonError('Add a reason before skipping this habit.');
      return;
    }

    try {
      setSkipping(true);
      setErrorMessage(null);
      setBusyHabitIds((current) => ({ ...current, [skipTargetHabitId]: true }));
      await skipHabitForDate(skipTargetHabitId, selectedDate, trimmedReason);
      await refreshSelectedDateStatuses();
      setSkipTargetHabitId(null);
      setSkipReason('');
      setSkipReasonError(null);
    } catch (error) {
      console.error('Failed to skip habit', error);
      setSkipReasonError('Could not skip this habit. Please try again.');
    } finally {
      if (skipTargetHabitId) {
        setBusyHabitIds((current) => ({ ...current, [skipTargetHabitId]: false }));
      }
      setSkipping(false);
    }
  }

  async function undoSkip(habitId: string) {
    if (selectedDateIsFuture) {
      return;
    }

    try {
      setErrorMessage(null);
      setBusyHabitIds((current) => ({ ...current, [habitId]: true }));
      await unskipHabitForDate(habitId, selectedDate);
      await refreshSelectedDateStatuses();
    } catch (error) {
      console.error('Failed to undo habit skip', error);
      setErrorMessage('Could not undo that skip. Please try again.');
    } finally {
      setBusyHabitIds((current) => ({ ...current, [habitId]: false }));
    }
  }

  function openNewHabitScreen() {
    router.push('/habits/new');
  }

  function openHabitDetail(habitId: string) {
    router.push({ pathname: '/habits/[id]', params: { id: habitId, date: selectedDate } });
  }

  async function handleRetry() {
    try {
      setLoading(true);
      setErrorMessage(null);
      await loadTodayData(selectedDateRef.current);
    } catch (error) {
      console.error('Failed to retry loading Today screen data', error);
      setErrorMessage('Still could not load your habits. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  if (loading) {
    return (
      <Screen contentContainerStyle={[styles.screenContent, styles.centeredState]}>
        <Text style={styles.stateTitle}>Loading your habits...</Text>
        <Text style={styles.stateText}>Setting up local storage on this device.</Text>
      </Screen>
    );
  }

  return (
    <Screen contentContainerStyle={styles.screenContent}>
      <View style={styles.buildDayCard}>
        <View style={styles.buildDayHeader}>
          <View style={styles.buildDayCopy}>
            <Text style={styles.buildDayEyebrow}>{selectedDayLabel}</Text>
            <Text style={styles.buildDayTitle}>Build the day</Text>
            <Text style={styles.buildDayDate}>{selectedDateDisplay}</Text>
            <Text style={styles.buildDaySummary}>
              {completedCount} done · {skippedCount} skipped · {remainingCount} left
            </Text>
          </View>

          <View style={styles.buildDayPercent}>
            <Text style={styles.buildDayPercentValue}>{completionPercent}%</Text>
            <Text style={styles.buildDayPercentLabel}>done</Text>
          </View>
        </View>

        <Text style={styles.buildDayMotivation}>{motivationLine}</Text>

        <View style={styles.buildDayTrack}>
          <View style={[styles.buildDayFill, { width: `${completionPercent}%` }]} />
        </View>

        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Create a new habit"
          onPress={openNewHabitScreen}
          style={({ pressed }) => [styles.buildDayAddButton, pressed && styles.pressed]}>
          <Ionicons name="add" size={18} color={colors.background} />
          <Text style={styles.buildDayAddText}>New habit</Text>
        </Pressable>
      </View>

      <View style={styles.weekCardConnected} {...weekPanResponder.panHandlers}>
        <View style={styles.weekHeader}>
          <Pressable
            accessibilityLabel="Show previous week"
            accessibilityRole="button"
            onPress={() => shiftWeek(-1)}
            style={({ pressed }) => [styles.weekArrowButton, pressed && styles.pressed]}>
            <Text style={styles.weekArrowText}>{'<'}</Text>
          </Pressable>
          <View style={styles.weekHeaderText}>
            <Text style={styles.weekEyebrow}>Week</Text>
            <Text style={styles.weekTitle}>{visibleWeekLabel}</Text>
          </View>
          <Pressable
            accessibilityLabel="Show next week"
            accessibilityRole="button"
            onPress={() => shiftWeek(1)}
            style={({ pressed }) => [styles.weekArrowButton, pressed && styles.pressed]}>
            <Text style={styles.weekArrowText}>{'>'}</Text>
          </Pressable>
        </View>

        <View style={styles.dateStrip}>
          {dateStripDays.map((day) => (
            <Pressable
              accessibilityLabel={`Show habits for ${format(parseISO(day.date), 'EEEE, MMMM d')}`}
              accessibilityRole="button"
              accessibilityState={{ selected: day.isSelected }}
              key={day.date}
              onPress={() => selectDate(day.date)}
              style={({ pressed }) => [
                styles.dateTile,
                day.isToday && styles.todayDateTile,
                day.isSelected && styles.selectedDateTile,
                pressed && styles.pressed,
              ]}>
              <Text style={[styles.dateWeekday, day.isSelected && styles.selectedDateText]}>
                {day.weekday}
              </Text>
              <Text style={[styles.dateNumber, day.isSelected && styles.selectedDateNumber]}>
                {day.day}
              </Text>
            </Pressable>
          ))}
        </View>
      </View>

      {errorMessage ? (
        <View style={styles.errorBanner}>
          <Text style={styles.errorText}>{errorMessage}</Text>
          <PrimaryButton onPress={handleRetry} title="Retry" variant="secondary" />
        </View>
      ) : null}

      {selectedDateIsFuture ? (
        <View style={styles.infoBanner}>
          <Text style={styles.infoText}>Future days cannot be completed or skipped yet.</Text>
        </View>
      ) : null}

      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>Habits</Text>
        <Text style={styles.dateText}>{selectedDateDisplay}</Text>
      </View>

      {habits.length === 0 ? (
        <View style={styles.emptyStack}>
          <EmptyState
            title="No habits yet"
            message="Create your first habit and start tracking today."
          />
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Create your first habit"
            onPress={openNewHabitScreen}
            style={({ pressed }) => [styles.sampleButton, pressed && styles.pressed]}>
            <Text style={styles.sampleButtonText}>Create your first habit</Text>
          </Pressable>
        </View>
      ) : scheduledHabits.length === 0 ? (
        <View style={styles.emptyStack}>
          <EmptyState
            title="No habits scheduled"
            message="This day is clear."
          />
          <PrimaryButton onPress={openNewHabitScreen} title="Create habit" />
        </View>
      ) : (
        <View style={styles.habitGrid}>
          {scheduledHabits.map((habit) => {
            const progress = progressByHabitId[habit.id];
            const completed = completedHabitIds.has(habit.id);
            const skipped = skippedHabitIds.has(habit.id);
            const skip = skipByHabitId.get(habit.id);

            return (
              <TodayHabitCard
              key={habit.id}
              habit={habit}
                completed={completed}
                skipped={skipped}
                skipReason={skip?.reason}
                progress={progress}
              disabled={Boolean(busyHabitIds[habit.id])}
              skipDisabled={selectedDateIsFuture}
                toggleDisabled={selectedDateIsFuture || habit.trackingType !== 'checkbox'}
              completionDateLabel={selectedDateLabel}
              onToggle={toggleHabit}
              onSkip={openSkipModal}
              onUndoSkip={undoSkip}
              onPress={openHabitDetail}
            />
            );
          })}
        </View>
      )}

      <Modal
        animationType="fade"
        onRequestClose={closeSkipModal}
        transparent
        visible={Boolean(skipTargetHabitId)}>
        <View style={styles.modalBackdrop}>
          <View style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalEyebrow}>Skip habit</Text>
              <Text style={styles.modalTitle}>Why are you skipping?</Text>
              <Text style={styles.modalText}>
                Add a short reason for {selectedDateDisplay}. Skipped days are not counted as
                failures.
              </Text>
            </View>

            <TextInput
              accessibilityLabel="Skip reason"
              autoCapitalize="sentences"
              editable={!skipping}
              multiline
              onChangeText={(value) => {
                setSkipReason(value);
                if (skipReasonError) {
                  setSkipReasonError(null);
                }
              }}
              placeholder="Sick, travel, rest day..."
              placeholderTextColor={colors.textSubtle}
              style={styles.reasonInput}
              value={skipReason}
            />
            {skipReasonError ? <Text style={styles.reasonError}>{skipReasonError}</Text> : null}

            <View style={styles.modalActions}>
              <PrimaryButton
                disabled={skipping}
                onPress={closeSkipModal}
                title="Cancel"
                variant="secondary"
              />
              <PrimaryButton
                disabled={skipping}
                onPress={submitSkip}
                title={skipping ? 'Skipping...' : 'Skip habit'}
              />
            </View>
          </View>
        </View>
      </Modal>
    </Screen>
  );
}

function getDateStripDays(weekStartDate: string, todayDate: string, selectedDate: string) {
  const weekStart = parseISO(weekStartDate);
  return Array.from({ length: 7 }, (_, index) => {
    const date = addDays(weekStart, index);
    const dateString = format(date, 'yyyy-MM-dd');

    return {
      date: dateString,
      day: format(date, 'd'),
      weekday: format(date, 'EEE'),
      isToday: dateString === todayDate,
      isSelected: dateString === selectedDate,
    };
  });
}

function getWeekStartDateString(date: string) {
  return format(startOfWeek(parseISO(date), { weekStartsOn: 1 }), 'yyyy-MM-dd');
}

type TodayHabitCardProps = {
  habit: Habit;
  completed: boolean;
  skipped: boolean;
  skipReason?: string | null;
  progress?: HabitProgress;
  disabled: boolean;
  skipDisabled: boolean;
  toggleDisabled: boolean;
  completionDateLabel: string;
  onToggle: (habitId: string) => void;
  onSkip: (habitId: string) => void;
  onUndoSkip: (habitId: string) => void;
  onPress: (habitId: string) => void;
};

function TodayHabitCard({
  habit,
  completed,
  skipped,
  skipReason,
  progress,
  disabled,
  skipDisabled,
  toggleDisabled,
  completionDateLabel,
  onToggle,
  onSkip,
  onUndoSkip,
  onPress,
}: TodayHabitCardProps) {
  const accentColor = habit.color ?? colors.habitGreen;
  const isProgressHabit = habit.trackingType === 'subtasks' || habit.trackingType === 'numeric';
  const large = isProgressHabit || (progress?.percent ?? 0) > 0;
  const statusLabel = completed ? 'Completed' : skipped ? 'Skipped' : 'Remaining';
  const progressPercent = Math.max(0, Math.min(progress?.percent ?? (completed ? 1 : 0), 1));

  function handleToggle(event: GestureResponderEvent) {
    event.stopPropagation();
    onToggle(habit.id);
  }

  function handleSkip(event: GestureResponderEvent) {
    event.stopPropagation();
    onSkip(habit.id);
  }

  function handleUndoSkip(event: GestureResponderEvent) {
    event.stopPropagation();
    onUndoSkip(habit.id);
  }

  return (
    <Pressable
      accessibilityLabel={`Open ${habit.name}. ${statusLabel} for ${completionDateLabel}.`}
      accessibilityRole="button"
      disabled={disabled}
      onPress={() => onPress(habit.id)}
      style={({ pressed }) => [
        styles.habitCard,
        large ? styles.largeHabitCard : styles.smallHabitCard,
        completed && styles.completedHabitCard,
        skipped && styles.skippedHabitCard,
        pressed && styles.pressed,
        disabled && styles.disabledCard,
      ]}>
      <View
        style={[
          styles.habitCardAccent,
          { backgroundColor: completed ? colors.primary : skipped ? colors.warning : accentColor },
        ]}
      />

      <View style={styles.habitCardTop}>
        <HabitIcon
          color={accentColor}
          fallbackIcon={habit.icon ?? habit.name.charAt(0).toUpperCase()}
          iconLibrary={habit.iconLibrary}
          iconType={habit.iconType}
          iconValue={habit.iconValue}
          size={large ? 50 : 44}
        />

        {isProgressHabit ? (
          <View style={[styles.progressCircle, { borderColor: completed ? colors.primary : accentColor }]}>
            <Text style={styles.progressCircleText}>{Math.round(progressPercent * 100)}%</Text>
          </View>
        ) : (
          <Pressable
            accessibilityLabel={`${completed ? 'Uncheck' : 'Check'} ${
              habit.name
            } for ${completionDateLabel}`}
            accessibilityRole="checkbox"
            accessibilityState={{ checked: completed }}
            disabled={disabled || toggleDisabled}
            hitSlop={8}
            onPress={handleToggle}
            style={[
              styles.cardCheck,
              completed && styles.completedCardCheck,
              (disabled || toggleDisabled) && styles.controlDisabled,
            ]}>
            {completed ? <Ionicons name="checkmark" size={18} color={colors.background} /> : null}
          </Pressable>
        )}
      </View>

      <View style={styles.habitCardText}>
        <Text numberOfLines={large ? 2 : 1} style={styles.habitCardName}>
          {habit.name}
        </Text>
        <Text numberOfLines={1} style={styles.habitCardHint}>
          {getHabitCardHint(habit)}
        </Text>
      </View>

      {progress ? (
        <View style={styles.cardProgressBlock}>
          <Text numberOfLines={1} style={styles.cardProgressLabel}>
            {progress.label}
          </Text>
          <View style={styles.cardProgressTrack}>
            <View
              style={[
                styles.cardProgressFill,
                { width: `${progressPercent * 100}%`, backgroundColor: accentColor },
              ]}
            />
          </View>
        </View>
      ) : null}

      <View style={styles.habitCardFooter}>
        <View
          style={[
            styles.statusPill,
            completed && styles.completedStatusPill,
            skipped && styles.skippedStatusPill,
          ]}>
          <Text
            style={[
              styles.statusPillText,
              completed && styles.completedStatusText,
              skipped && styles.skippedStatusText,
            ]}>
            {statusLabel}
          </Text>
        </View>

        {!completed ? (
          skipped ? (
            <Pressable
              accessibilityLabel={`Undo skip for ${habit.name}`}
              accessibilityRole="button"
              disabled={disabled || skipDisabled}
              onPress={handleUndoSkip}
              style={[styles.cardActionButton, (disabled || skipDisabled) && styles.controlDisabled]}>
              <Text style={styles.cardActionText}>Undo</Text>
            </Pressable>
          ) : (
            <Pressable
              accessibilityLabel={`Skip ${habit.name}`}
              accessibilityRole="button"
              disabled={disabled || skipDisabled}
              onPress={handleSkip}
              style={[styles.cardActionButton, (disabled || skipDisabled) && styles.controlDisabled]}>
              <Text style={styles.cardActionText}>Skip</Text>
            </Pressable>
          )
        ) : null}
      </View>

      {skipped && skipReason ? (
        <Text numberOfLines={large ? 2 : 1} style={styles.skipReasonText}>
          {skipReason}
        </Text>
      ) : null}
    </Pressable>
  );
}

async function getProgressByHabitId(habits: Habit[], date: string) {
  const progressEntries = await Promise.all(
    habits.map(async (habit): Promise<[string, HabitProgress | null]> => {
      if (habit.trackingType === 'subtasks') {
        const [subtasks, completions] = await Promise.all([
          getSubtasksForHabit(habit.id),
          getSubtaskCompletionsForHabitDate(habit.id, date),
        ]);
        const requiredSubtasks = subtasks.filter((subtask) => subtask.required);

        if (requiredSubtasks.length === 0) {
          return [habit.id, { label: 'No subtasks yet', percent: 0 }];
        }

        const completedSubtaskIds = new Set(completions.map((completion) => completion.subtaskId));
        const completedCount = requiredSubtasks.filter((subtask) =>
          completedSubtaskIds.has(subtask.id)
        ).length;

        return [
          habit.id,
          {
            label: `${completedCount}/${requiredSubtasks.length} subtasks`,
            percent: completedCount / requiredSubtasks.length,
          },
        ];
      }

      if (habit.trackingType === 'numeric') {
        const entry = await getNumericEntryForDate(habit.id, date);
        const targetValue = habit.targetValue ?? 0;
        const currentValue = entry?.value ?? 0;
        const unit = habit.targetUnit ? ` ${habit.targetUnit}` : '';

        return [
          habit.id,
          {
            label: `${formatProgressNumber(currentValue)}/${formatProgressNumber(targetValue)}${unit}`,
            percent: targetValue > 0 ? currentValue / targetValue : 0,
          },
        ];
      }

      return [habit.id, null];
    })
  );

  return Object.fromEntries(
    progressEntries.filter((entry): entry is [string, HabitProgress] => entry[1] !== null)
  );
}

function formatProgressNumber(value: number) {
  return Number.isInteger(value) ? String(value) : value.toFixed(1);
}

function getSelectedDayLabel(selectedDate: string, todayDate: string) {
  if (selectedDate === todayDate) {
    return 'TODAY';
  }

  return format(parseISO(selectedDate), 'EEEE').toUpperCase();
}

function getMotivationLine(completionPercent: number) {
  if (completionPercent >= 100) {
    return 'All done today - great work!';
  }

  if (completionPercent > 0) {
    return 'Keep going!';
  }

  return 'Start with one small step.';
}

function getHabitCardHint(habit: Habit) {
  if (habit.trackingType === 'subtasks') {
    return 'Checklist habit';
  }

  if (habit.trackingType === 'numeric') {
    return habit.targetUnit ? `Goal in ${habit.targetUnit}` : 'Numeric goal';
  }

  if (habit.scheduleType === 'weekdays') {
    return 'Weekday schedule';
  }

  if (habit.scheduleType === 'interval') {
    return `Every ${habit.scheduleIntervalDays ?? '?'} days`;
  }

  return 'Daily habit';
}

const styles = StyleSheet.create({
  screenContent: {
    gap: spacing.lg,
    paddingBottom: 112,
  },
  buildDayCard: {
    gap: spacing.lg,
    padding: spacing.xl,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.xl,
    backgroundColor: colors.surface,
  },
  buildDayHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: spacing.lg,
  },
  buildDayCopy: {
    flex: 1,
    gap: spacing.xs,
  },
  buildDayEyebrow: {
    color: colors.primary,
    ...typography.small,
    fontWeight: '900',
    textTransform: 'uppercase',
  },
  buildDayTitle: {
    color: colors.text,
    ...typography.title,
  },
  buildDayDate: {
    color: colors.textMuted,
    ...typography.body,
    fontWeight: '800',
  },
  buildDaySummary: {
    color: colors.textMuted,
    ...typography.caption,
  },
  buildDayPercent: {
    width: 92,
    height: 92,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: colors.primary,
    borderRadius: radius.pill,
    backgroundColor: colors.primaryMuted,
  },
  buildDayPercentValue: {
    color: colors.primary,
    fontSize: 28,
    lineHeight: 32,
    fontWeight: '900',
  },
  buildDayPercentLabel: {
    color: colors.textMuted,
    ...typography.small,
    textTransform: 'uppercase',
  },
  buildDayMotivation: {
    color: colors.text,
    ...typography.body,
    fontWeight: '800',
  },
  buildDayTrack: {
    height: 12,
    overflow: 'hidden',
    borderRadius: radius.pill,
    backgroundColor: colors.surfaceMuted,
  },
  buildDayFill: {
    height: '100%',
    borderRadius: radius.pill,
    backgroundColor: colors.primary,
  },
  buildDayAddButton: {
    alignSelf: 'flex-start',
    minHeight: 40,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    paddingHorizontal: spacing.md,
    borderRadius: radius.pill,
    backgroundColor: colors.primary,
  },
  buildDayAddText: {
    color: colors.background,
    ...typography.caption,
    fontWeight: '900',
  },
  weekCardConnected: {
    gap: spacing.md,
    marginTop: -spacing.sm,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.xl,
    backgroundColor: colors.surfaceElevated,
  },
  hero: {
    gap: spacing.lg,
    padding: spacing.xl,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.xl,
    backgroundColor: colors.surface,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: spacing.lg,
  },
  headerText: {
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
  addButton: {
    width: 52,
    height: 52,
    borderRadius: radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.primary,
  },
  addButtonText: {
    color: colors.background,
    fontSize: 30,
    lineHeight: 34,
    fontWeight: '900',
  },
  summaryPill: {
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radius.pill,
    backgroundColor: colors.primaryMuted,
  },
  summaryText: {
    color: colors.primary,
    ...typography.body,
    fontWeight: '900',
  },
  summaryLabel: {
    color: colors.textMuted,
    ...typography.caption,
  },
  weekCard: {
    gap: spacing.md,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.xl,
    backgroundColor: colors.surface,
  },
  weekHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.md,
  },
  weekHeaderText: {
    flex: 1,
    alignItems: 'center',
    gap: spacing.xs,
  },
  weekEyebrow: {
    color: colors.primary,
    ...typography.small,
    fontWeight: '900',
    textTransform: 'uppercase',
  },
  weekTitle: {
    color: colors.text,
    ...typography.caption,
    fontWeight: '900',
  },
  weekArrowButton: {
    width: 42,
    height: 42,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radius.pill,
    backgroundColor: colors.surfaceElevated,
  },
  weekArrowText: {
    color: colors.text,
    fontSize: 28,
    lineHeight: 32,
    fontWeight: '900',
  },
  dateStrip: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  dateTile: {
    flex: 1,
    minHeight: 76,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.lg,
    backgroundColor: colors.surface,
  },
  selectedDateTile: {
    borderColor: colors.primary,
    backgroundColor: colors.primary,
  },
  todayDateTile: {
    borderColor: colors.primary,
  },
  dateWeekday: {
    color: colors.textSubtle,
    ...typography.small,
    textTransform: 'uppercase',
  },
  dateNumber: {
    color: colors.text,
    fontSize: 18,
    fontWeight: '900',
  },
  selectedDateText: {
    color: colors.background,
  },
  selectedDateNumber: {
    color: colors.background,
  },
  pressed: {
    opacity: 0.72,
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
  infoBanner: {
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.lg,
    backgroundColor: colors.surface,
  },
  infoText: {
    color: colors.textMuted,
    ...typography.caption,
    fontWeight: '700',
  },
  progressCard: {
    gap: spacing.lg,
    padding: spacing.xl,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.xl,
    backgroundColor: colors.surfaceElevated,
  },
  progressHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.md,
  },
  progressEyebrow: {
    color: colors.primary,
    ...typography.small,
    textTransform: 'uppercase',
  },
  progressLabel: {
    color: colors.text,
    ...typography.heading,
    fontWeight: '800',
  },
  progressPill: {
    minWidth: 58,
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radius.pill,
    backgroundColor: colors.primaryMuted,
  },
  progressValue: {
    color: colors.primary,
    ...typography.caption,
    fontWeight: '900',
  },
  selectedDateTextLabel: {
    color: colors.text,
    ...typography.body,
    fontWeight: '900',
  },
  progressCopy: {
    color: colors.textMuted,
    ...typography.caption,
  },
  progressCounts: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  progressCountPill: {
    flex: 1,
    gap: 2,
    alignItems: 'center',
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.sm,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.lg,
    backgroundColor: colors.surface,
  },
  skippedCountPill: {
    borderColor: colors.warning,
  },
  progressCountValue: {
    color: colors.primary,
    ...typography.body,
    fontWeight: '900',
  },
  skippedCountText: {
    color: colors.warning,
  },
  progressCountLabel: {
    color: colors.textSubtle,
    ...typography.small,
    textTransform: 'uppercase',
  },
  progressTrack: {
    height: 12,
    overflow: 'hidden',
    borderRadius: radius.pill,
    backgroundColor: colors.surfaceMuted,
  },
  progressFill: {
    height: '100%',
    borderRadius: radius.pill,
    backgroundColor: colors.primary,
  },
  sectionHeader: {
    marginTop: 2,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  sectionTitle: {
    color: colors.text,
    ...typography.heading,
  },
  dateText: {
    color: colors.textSubtle,
    ...typography.caption,
  },
  habitList: {
    gap: spacing.md,
  },
  habitGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.md,
  },
  habitCard: {
    position: 'relative',
    minHeight: 168,
    gap: spacing.md,
    overflow: 'hidden',
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.xl,
    backgroundColor: colors.surface,
  },
  smallHabitCard: {
    width: '47.8%',
  },
  largeHabitCard: {
    width: '100%',
    minHeight: 196,
  },
  completedHabitCard: {
    borderColor: colors.primary,
    backgroundColor: colors.primaryMuted,
  },
  skippedHabitCard: {
    borderColor: colors.warning,
  },
  disabledCard: {
    opacity: 0.52,
  },
  habitCardAccent: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    width: 5,
    backgroundColor: colors.primary,
  },
  habitCardTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.md,
  },
  cardCheck: {
    width: 34,
    height: 34,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: colors.surfaceMuted,
    borderRadius: radius.pill,
    backgroundColor: colors.surfaceElevated,
  },
  completedCardCheck: {
    borderColor: colors.primary,
    backgroundColor: colors.primary,
  },
  controlDisabled: {
    opacity: 0.42,
  },
  progressCircle: {
    width: 54,
    height: 54,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 3,
    borderRadius: radius.pill,
    backgroundColor: colors.surfaceElevated,
  },
  progressCircleText: {
    color: colors.text,
    ...typography.caption,
    fontWeight: '900',
  },
  habitCardText: {
    gap: spacing.xs,
  },
  habitCardName: {
    color: colors.text,
    ...typography.body,
    fontWeight: '900',
  },
  habitCardHint: {
    color: colors.textMuted,
    ...typography.small,
    fontWeight: '700',
  },
  cardProgressBlock: {
    gap: spacing.xs,
  },
  cardProgressLabel: {
    color: colors.textMuted,
    ...typography.caption,
    fontWeight: '800',
  },
  cardProgressTrack: {
    height: 8,
    overflow: 'hidden',
    borderRadius: radius.pill,
    backgroundColor: colors.surfaceMuted,
  },
  cardProgressFill: {
    height: '100%',
    borderRadius: radius.pill,
  },
  habitCardFooter: {
    marginTop: 'auto',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.sm,
  },
  statusPill: {
    minHeight: 28,
    justifyContent: 'center',
    paddingHorizontal: spacing.sm,
    borderRadius: radius.pill,
    backgroundColor: colors.surfaceElevated,
  },
  completedStatusPill: {
    backgroundColor: colors.primary,
  },
  skippedStatusPill: {
    backgroundColor: colors.surfaceElevated,
    borderWidth: 1,
    borderColor: colors.warning,
  },
  statusPillText: {
    color: colors.textMuted,
    ...typography.small,
    fontWeight: '900',
  },
  completedStatusText: {
    color: colors.background,
  },
  skippedStatusText: {
    color: colors.warning,
  },
  cardActionButton: {
    minHeight: 30,
    justifyContent: 'center',
    paddingHorizontal: spacing.sm,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.pill,
    backgroundColor: colors.surfaceElevated,
  },
  cardActionText: {
    color: colors.textMuted,
    ...typography.small,
    fontWeight: '900',
  },
  skipReasonText: {
    color: colors.warning,
    ...typography.small,
    fontWeight: '800',
  },
  emptyStack: {
    gap: spacing.md,
  },
  sampleButton: {
    minHeight: 54,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.xl,
    borderRadius: radius.pill,
    backgroundColor: colors.primary,
  },
  sampleButtonText: {
    color: colors.background,
    fontSize: 15,
    fontWeight: '900',
  },
  centeredState: {
    justifyContent: 'center',
  },
  stateTitle: {
    color: colors.text,
    ...typography.heading,
    textAlign: 'center',
  },
  stateText: {
    color: colors.textMuted,
    ...typography.body,
    textAlign: 'center',
  },
  modalBackdrop: {
    flex: 1,
    justifyContent: 'center',
    padding: spacing.xl,
    backgroundColor: 'rgba(0, 0, 0, 0.72)',
  },
  modalCard: {
    gap: spacing.lg,
    padding: spacing.xl,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.xl,
    backgroundColor: colors.surface,
  },
  modalHeader: {
    gap: spacing.xs,
  },
  modalEyebrow: {
    color: colors.primary,
    ...typography.small,
    fontWeight: '900',
    textTransform: 'uppercase',
  },
  modalTitle: {
    color: colors.text,
    ...typography.heading,
  },
  modalText: {
    color: colors.textMuted,
    ...typography.caption,
  },
  reasonInput: {
    minHeight: 104,
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.lg,
    color: colors.text,
    backgroundColor: colors.surfaceElevated,
    textAlignVertical: 'top',
    ...typography.body,
  },
  reasonError: {
    color: colors.destructive,
    ...typography.caption,
    fontWeight: '700',
  },
  modalActions: {
    gap: spacing.md,
  },
});
