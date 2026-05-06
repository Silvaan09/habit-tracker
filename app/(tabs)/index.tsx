import { useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import {
  addDays,
  addMonths,
  addWeeks,
  format,
  parseISO,
  startOfMonth,
  startOfWeek,
} from 'date-fns';
import { router } from 'expo-router';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Animated,
  DeviceEventEmitter,
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
import { getNumericEntryForDate, setNumericEntryForDate } from '@/src/db/numericEntries';
import {
  getSkipsForDate,
  getSkipsForDateRange,
  skipHabitForDate,
  unskipHabitForDate,
} from '@/src/db/skips';
import {
  completeSubtaskForDate,
  getSubtaskCompletionsForHabitDate,
  getSubtasksForHabit,
  uncompleteSubtaskForDate,
} from '@/src/db/subtasks';
import { colors, radius, spacing, typography } from '@/src/theme';
import type {
  Habit,
  HabitCompletion,
  HabitSkip,
  HabitSubtask,
  HabitSubtaskCompletion,
} from '@/src/types/Habit';
import {
  formatDisplayDateDDMMYYYY,
  getTodayDateString,
  isFutureDate,
} from '@/src/utils/dates';
import { TODAY_TAB_RESELECT_EVENT } from '@/src/utils/navigation';
import { getScheduledHabitsForDate } from '@/src/utils/schedule';

type HabitProgress = {
  label: string;
  percent: number;
};

const WEEKLY_SKIP_LIMIT = 1;

export default function TodayScreen() {
  const [habits, setHabits] = useState<Habit[]>([]);
  const [completions, setCompletions] = useState<HabitCompletion[]>([]);
  const [skips, setSkips] = useState<HabitSkip[]>([]);
  const [weeklySkips, setWeeklySkips] = useState<HabitSkip[]>([]);
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
  const [progressEditorHabitId, setProgressEditorHabitId] = useState<string | null>(null);
  const [progressEditorLoading, setProgressEditorLoading] = useState(false);
  const [progressEditorError, setProgressEditorError] = useState<string | null>(null);
  const [datePickerVisible, setDatePickerVisible] = useState(false);
  const [datePickerMonth, setDatePickerMonth] = useState(() =>
    format(startOfMonth(parseISO(getTodayDateString())), 'yyyy-MM-dd')
  );
  const [editorSubtasks, setEditorSubtasks] = useState<HabitSubtask[]>([]);
  const [editorSubtaskCompletions, setEditorSubtaskCompletions] = useState<
    HabitSubtaskCompletion[]
  >([]);
  const [editorNumericValue, setEditorNumericValue] = useState('');
  const [savingProgress, setSavingProgress] = useState(false);

  const loadTodayData = useCallback(async (dateToLoad: string) => {
    const currentToday = getTodayDateString();

    setActualTodayDate(currentToday);
    await initDatabase();

    const weekStart = getWeekStartDateString(dateToLoad);
    const weekEnd = format(addDays(parseISO(weekStart), 6), 'yyyy-MM-dd');
    const [activeHabits, dateCompletions, dateSkips, weekSkips] = await Promise.all([
      getActiveHabits(),
      getCompletionsForDate(dateToLoad),
      getSkipsForDate(dateToLoad),
      getSkipsForDateRange(weekStart, weekEnd),
    ]);

    setHabits(activeHabits);
    setCompletions(dateCompletions);
    setSkips(dateSkips);
    setWeeklySkips(weekSkips);
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
  const skipsRemainingThisWeek = Math.max(WEEKLY_SKIP_LIMIT - weeklySkips.length, 0);
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
  const progressEditorHabit = useMemo(
    () => habits.find((habit) => habit.id === progressEditorHabitId) ?? null,
    [habits, progressEditorHabitId]
  );
  const editorCompletedSubtaskIds = useMemo(
    () => new Set(editorSubtaskCompletions.map((completion) => completion.subtaskId)),
    [editorSubtaskCompletions]
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

  useEffect(() => {
    const subscription = DeviceEventEmitter.addListener(TODAY_TAB_RESELECT_EVENT, () => {
      const today = getTodayDateString();

      selectedDateRef.current = today;
      setVisibleWeekStart(getWeekStartDateString(today));
      void selectDate(today);
    });

    return () => subscription.remove();
  }, [selectDate]);

  const visibleWeekLabel = useMemo(() => {
    const weekStart = parseISO(visibleWeekStart);
    const weekEnd = addDays(weekStart, 6);

    return `${format(weekStart, 'MMM d')} - ${format(weekEnd, 'MMM d')}`;
  }, [visibleWeekStart]);
  const datePickerDays = useMemo(
    () => getCalendarMonthDays(datePickerMonth, actualTodayDate, selectedDate),
    [actualTodayDate, datePickerMonth, selectedDate]
  );
  const datePickerMonthLabel = useMemo(
    () => format(parseISO(datePickerMonth), 'MMMM yyyy'),
    [datePickerMonth]
  );
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
    const weekStart = getWeekStartDateString(selectedDate);
    const weekEnd = format(addDays(parseISO(weekStart), 6), 'yyyy-MM-dd');
    const [dateCompletions, dateSkips, weekSkips] = await Promise.all([
      getCompletionsForDate(selectedDate),
      getSkipsForDate(selectedDate),
      getSkipsForDateRange(weekStart, weekEnd),
    ]);

    setCompletions(dateCompletions);
    setSkips(dateSkips);
    setWeeklySkips(weekSkips);
    setProgressByHabitId(await getProgressByHabitId(habits, selectedDate));
  }

  function openDatePicker() {
    setDatePickerMonth(format(startOfMonth(parseISO(selectedDateRef.current)), 'yyyy-MM-dd'));
    setDatePickerVisible(true);
  }

  async function chooseDateFromPicker(date: string) {
    setVisibleWeekStart(getWeekStartDateString(date));
    setDatePickerVisible(false);
    await selectDate(date);
  }

  async function jumpToTodayFromPicker() {
    const today = getTodayDateString();

    setVisibleWeekStart(getWeekStartDateString(today));
    setDatePickerMonth(format(startOfMonth(parseISO(today)), 'yyyy-MM-dd'));
    setDatePickerVisible(false);
    await selectDate(today);
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

    if (skipsRemainingThisWeek <= 0 && !skippedHabitIds.has(habitId)) {
      setErrorMessage('You have used your skip for this week.');
      return;
    }

    setSkipTargetHabitId(habitId);
    setSkipReason('');
    setSkipReasonError(
      skipsRemainingThisWeek > 0 ? `${skipsRemainingThisWeek} skip left this week.` : null
    );
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

  async function openProgressEditor(habitId: string) {
    const habit = habits.find((item) => item.id === habitId);

    if (
      !habit ||
      selectedDateIsFuture ||
      skippedHabitIds.has(habitId) ||
      habit.trackingType === 'checkbox'
    ) {
      return;
    }

    setProgressEditorHabitId(habitId);
    setProgressEditorError(null);
    await loadProgressEditorData(habit);
  }

  async function loadProgressEditorData(habit: Habit) {
    try {
      setProgressEditorLoading(true);
      setProgressEditorError(null);

      if (habit.trackingType === 'subtasks') {
        const [subtasks, subtaskCompletions] = await Promise.all([
          getSubtasksForHabit(habit.id),
          getSubtaskCompletionsForHabitDate(habit.id, selectedDate),
        ]);

        setEditorSubtasks(subtasks);
        setEditorSubtaskCompletions(subtaskCompletions);
        setEditorNumericValue('');
      }

      if (habit.trackingType === 'numeric') {
        const entry = await getNumericEntryForDate(habit.id, selectedDate);

        setEditorSubtasks([]);
        setEditorSubtaskCompletions([]);
        setEditorNumericValue(entry ? String(entry.value) : '0');
      }
    } catch (error) {
      console.error('Failed to load Today progress editor', error);
      setProgressEditorError('Could not load progress for this habit.');
    } finally {
      setProgressEditorLoading(false);
    }
  }

  function closeProgressEditor() {
    if (savingProgress) {
      return;
    }

    setProgressEditorHabitId(null);
    setProgressEditorError(null);
    setEditorSubtasks([]);
    setEditorSubtaskCompletions([]);
    setEditorNumericValue('');
  }

  async function toggleEditorSubtask(subtask: HabitSubtask) {
    if (!progressEditorHabit || selectedDateIsFuture || skippedHabitIds.has(progressEditorHabit.id)) {
      return;
    }

    try {
      setSavingProgress(true);
      setProgressEditorError(null);
      setBusyHabitIds((current) => ({ ...current, [progressEditorHabit.id]: true }));

      if (editorCompletedSubtaskIds.has(subtask.id)) {
        await uncompleteSubtaskForDate(subtask.id, selectedDate);
      } else {
        await completeSubtaskForDate(subtask.id, progressEditorHabit.id, selectedDate);
      }

      const nextCompletions = await getSubtaskCompletionsForHabitDate(
        progressEditorHabit.id,
        selectedDate
      );
      setEditorSubtaskCompletions(nextCompletions);
      await refreshSelectedDateStatuses();
    } catch (error) {
      console.error('Failed to update subtask from Today', error);
      setProgressEditorError('Could not update that subtask.');
    } finally {
      if (progressEditorHabit) {
        setBusyHabitIds((current) => ({ ...current, [progressEditorHabit.id]: false }));
      }
      setSavingProgress(false);
    }
  }

  async function saveEditorNumericProgress(nextValue = editorNumericValue) {
    if (!progressEditorHabit || selectedDateIsFuture || skippedHabitIds.has(progressEditorHabit.id)) {
      return;
    }

    const parsedValue = Number(nextValue.replace(',', '.'));

    if (!Number.isFinite(parsedValue) || parsedValue < 0) {
      setProgressEditorError('Enter a value of 0 or more.');
      return;
    }

    try {
      setSavingProgress(true);
      setProgressEditorError(null);
      setBusyHabitIds((current) => ({ ...current, [progressEditorHabit.id]: true }));
      await setNumericEntryForDate(progressEditorHabit.id, selectedDate, parsedValue);
      const nextEntry = await getNumericEntryForDate(progressEditorHabit.id, selectedDate);

      setEditorNumericValue(nextEntry ? String(nextEntry.value) : '0');
      await refreshSelectedDateStatuses();
    } catch (error) {
      console.error('Failed to update numeric progress from Today', error);
      setProgressEditorError('Could not save progress.');
    } finally {
      if (progressEditorHabit) {
        setBusyHabitIds((current) => ({ ...current, [progressEditorHabit.id]: false }));
      }
      setSavingProgress(false);
    }
  }

  async function adjustEditorNumericProgress(delta: number) {
    const currentValue = Number(editorNumericValue.replace(',', '.'));
    const safeCurrentValue = Number.isFinite(currentValue) ? currentValue : 0;
    const nextValue = Math.max(0, safeCurrentValue + delta);

    setEditorNumericValue(formatProgressNumber(nextValue));
    await saveEditorNumericProgress(String(nextValue));
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
        <View style={styles.skipLimitPill}>
          <Text style={styles.skipLimitText}>
            {skipsRemainingThisWeek > 0
              ? `${skipsRemainingThisWeek} skip left this week`
              : 'No skips left this week'}
          </Text>
        </View>

        <AnimatedProgressBar color={colors.primary} height={12} percent={completionPercent / 100} />
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
          <Pressable
            accessibilityLabel="Open date picker"
            accessibilityRole="button"
            onPress={openDatePicker}
            style={({ pressed }) => [styles.weekHeaderText, pressed && styles.pressed]}>
            <Text style={styles.weekEyebrow}>Week</Text>
            <Text style={styles.weekTitle}>{visibleWeekLabel}</Text>
          </Pressable>
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
                progressDisabled={selectedDateIsFuture || skipped}
                skipDisabled={selectedDateIsFuture}
                toggleDisabled={selectedDateIsFuture || habit.trackingType !== 'checkbox'}
                completionDateLabel={selectedDateLabel}
                onEditProgress={openProgressEditor}
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
        animationType="slide"
        onRequestClose={closeProgressEditor}
        transparent
        visible={Boolean(progressEditorHabit)}>
        <View style={styles.modalBackdrop}>
          <View style={styles.modalCard}>
            {progressEditorHabit ? (
              <View style={styles.progressEditor}>
                <View style={styles.modalHeader}>
                  <Text style={styles.modalEyebrow}>Today progress</Text>
                  <Text style={styles.modalTitle}>{progressEditorHabit.name}</Text>
                  <Text style={styles.modalText}>{selectedDateDisplay}</Text>
                </View>

                {progressEditorLoading ? (
                  <Text style={styles.modalText}>Loading progress...</Text>
                ) : progressEditorHabit.trackingType === 'subtasks' ? (
                  <View style={styles.editorList}>
                    {editorSubtasks.length === 0 ? (
                      <Text style={styles.modalText}>No subtasks yet.</Text>
                    ) : (
                      editorSubtasks.map((subtask) => {
                        const checked = editorCompletedSubtaskIds.has(subtask.id);

                        return (
                          <Pressable
                            accessibilityLabel={`${checked ? 'Uncheck' : 'Check'} ${subtask.title}`}
                            accessibilityRole="checkbox"
                            accessibilityState={{ checked }}
                            disabled={savingProgress}
                            key={subtask.id}
                            onPress={() => toggleEditorSubtask(subtask)}
                            style={({ pressed }) => [
                              styles.editorChecklistRow,
                              checked && styles.checkedEditorChecklistRow,
                              pressed && styles.pressed,
                              savingProgress && styles.controlDisabled,
                            ]}>
                            <View
                              style={[
                                styles.editorCheck,
                                checked && styles.checkedEditorCheck,
                              ]}>
                              {checked ? (
                                <Ionicons
                                  name="checkmark"
                                  size={16}
                                  color={colors.background}
                                />
                              ) : null}
                            </View>
                            <Text
                              style={[
                                styles.editorChecklistText,
                                checked && styles.checkedEditorChecklistText,
                              ]}>
                              {subtask.title}
                            </Text>
                          </Pressable>
                        );
                      })
                    )}
                  </View>
                ) : (
                  <View style={styles.numericEditor}>
                    <Text style={styles.numericTargetText}>
                      Target {formatProgressNumber(progressEditorHabit.targetValue ?? 0)}
                      {progressEditorHabit.targetUnit ? ` ${progressEditorHabit.targetUnit}` : ''}
                    </Text>
                    <TextInput
                      accessibilityLabel="Numeric progress value"
                      editable={!savingProgress}
                      keyboardType="decimal-pad"
                      onChangeText={(value) => {
                        setEditorNumericValue(value.replace(/[^0-9.,]/g, ''));
                        setProgressEditorError(null);
                      }}
                      placeholder="0"
                      placeholderTextColor={colors.textSubtle}
                      style={styles.numericInput}
                      value={editorNumericValue}
                    />
                    <View style={styles.numericQuickActions}>
                      <Pressable
                        accessibilityLabel="Decrease progress"
                        accessibilityRole="button"
                        disabled={savingProgress}
                        onPress={() => adjustEditorNumericProgress(-1)}
                        style={[styles.numericStepButton, savingProgress && styles.controlDisabled]}>
                        <Text style={styles.numericStepText}>-1</Text>
                      </Pressable>
                      <Pressable
                        accessibilityLabel="Increase progress"
                        accessibilityRole="button"
                        disabled={savingProgress}
                        onPress={() => adjustEditorNumericProgress(1)}
                        style={[styles.numericStepButton, savingProgress && styles.controlDisabled]}>
                        <Text style={styles.numericStepText}>+1</Text>
                      </Pressable>
                    </View>
                    <PrimaryButton
                      disabled={savingProgress}
                      onPress={() => saveEditorNumericProgress()}
                      title={savingProgress ? 'Saving...' : 'Save progress'}
                    />
                  </View>
                )}

                {progressEditorError ? (
                  <Text style={styles.reasonError}>{progressEditorError}</Text>
                ) : null}

                <View style={styles.modalActions}>
                  <PrimaryButton
                    disabled={savingProgress}
                    onPress={closeProgressEditor}
                    title="Close"
                    variant="secondary"
                  />
                  <PrimaryButton
                    disabled={savingProgress}
                    onPress={() => {
                      const habitId = progressEditorHabit.id;

                      closeProgressEditor();
                      openHabitDetail(habitId);
                    }}
                    title="Open detail"
                    variant="secondary"
                  />
                </View>
              </View>
            ) : null}
          </View>
        </View>
      </Modal>

      <Modal
        animationType="slide"
        onRequestClose={() => setDatePickerVisible(false)}
        transparent
        visible={datePickerVisible}>
        <View style={styles.modalBackdrop}>
          <View style={styles.datePickerCard}>
            <View style={styles.datePickerHeader}>
              <View>
                <Text style={styles.modalEyebrow}>Select date</Text>
                <Text style={styles.modalTitle}>{datePickerMonthLabel}</Text>
              </View>
              <Pressable
                accessibilityLabel="Close date picker"
                accessibilityRole="button"
                onPress={() => setDatePickerVisible(false)}
                style={({ pressed }) => [styles.datePickerCloseButton, pressed && styles.pressed]}>
                <Text style={styles.datePickerCloseText}>Close</Text>
              </Pressable>
            </View>

            <View style={styles.datePickerMonthNav}>
              <Pressable
                accessibilityLabel="Show previous month"
                accessibilityRole="button"
                onPress={() =>
                  setDatePickerMonth((current) =>
                    format(addMonths(parseISO(current), -1), 'yyyy-MM-dd')
                  )
                }
                style={({ pressed }) => [styles.monthArrowButton, pressed && styles.pressed]}>
                <Text style={styles.weekArrowText}>{'<'}</Text>
              </Pressable>
              <Pressable
                accessibilityLabel="Jump to today"
                accessibilityRole="button"
                onPress={jumpToTodayFromPicker}
                style={({ pressed }) => [styles.jumpTodayButton, pressed && styles.pressed]}>
                <Text style={styles.jumpTodayText}>Jump to today</Text>
              </Pressable>
              <Pressable
                accessibilityLabel="Show next month"
                accessibilityRole="button"
                onPress={() =>
                  setDatePickerMonth((current) =>
                    format(addMonths(parseISO(current), 1), 'yyyy-MM-dd')
                  )
                }
                style={({ pressed }) => [styles.monthArrowButton, pressed && styles.pressed]}>
                <Text style={styles.weekArrowText}>{'>'}</Text>
              </Pressable>
            </View>

            <View style={styles.calendarWeekdays}>
              {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map((weekday) => (
                <Text key={weekday} style={styles.calendarWeekdayText}>
                  {weekday}
                </Text>
              ))}
            </View>

            <View style={styles.calendarGrid}>
              {datePickerDays.map((day) => (
                <Pressable
                  accessibilityLabel={`Select ${formatDisplayDateDDMMYYYY(day.date)}`}
                  accessibilityRole="button"
                  accessibilityState={{ selected: day.isSelected }}
                  key={day.date}
                  onPress={() => chooseDateFromPicker(day.date)}
                  style={({ pressed }) => [
                    styles.calendarDay,
                    !day.isCurrentMonth && styles.outsideMonthDay,
                    day.isToday && styles.todayCalendarDay,
                    day.isSelected && styles.selectedCalendarDay,
                    day.isFuture && styles.futureCalendarDay,
                    pressed && styles.pressed,
                  ]}>
                  <Text
                    style={[
                      styles.calendarDayText,
                      !day.isCurrentMonth && styles.outsideMonthDayText,
                      day.isSelected && styles.selectedCalendarDayText,
                    ]}>
                    {day.day}
                  </Text>
                </Pressable>
              ))}
            </View>

            <Text style={styles.modalText}>
              Future days can be viewed, but cannot be completed.
            </Text>
          </View>
        </View>
      </Modal>

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
              <Text style={styles.skipLimitModalText}>
                {skipsRemainingThisWeek > 0
                  ? `${skipsRemainingThisWeek} skip left this week.`
                  : 'You have used your skip for this week.'}
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
                disabled={skipping || skipsRemainingThisWeek <= 0}
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

function getCalendarMonthDays(monthDate: string, todayDate: string, selectedDate: string) {
  const monthStart = startOfMonth(parseISO(monthDate));
  const calendarStart = startOfWeek(monthStart, { weekStartsOn: 1 });

  return Array.from({ length: 42 }, (_, index) => {
    const date = addDays(calendarStart, index);
    const dateString = format(date, 'yyyy-MM-dd');

    return {
      date: dateString,
      day: format(date, 'd'),
      isCurrentMonth: format(date, 'yyyy-MM') === format(monthStart, 'yyyy-MM'),
      isFuture: isFutureDate(dateString, todayDate),
      isSelected: dateString === selectedDate,
      isToday: dateString === todayDate,
    };
  });
}

function getWeekStartDateString(date: string) {
  return format(startOfWeek(parseISO(date), { weekStartsOn: 1 }), 'yyyy-MM-dd');
}

function AnimatedProgressBar({
  color,
  height,
  percent,
}: {
  color: string;
  height: number;
  percent: number;
}) {
  const animatedValue = useRef(new Animated.Value(Math.max(0, Math.min(percent, 1)))).current;

  useEffect(() => {
    Animated.timing(animatedValue, {
      toValue: Math.max(0, Math.min(percent, 1)),
      duration: 220,
      useNativeDriver: false,
    }).start();
  }, [animatedValue, percent]);

  const width = animatedValue.interpolate({
    inputRange: [0, 1],
    outputRange: ['0%', '100%'],
  });

  return (
    <View style={[styles.animatedProgressTrack, { height }]}>
      <Animated.View
        style={[
          styles.animatedProgressFill,
          {
            backgroundColor: color,
            width,
          },
        ]}
      />
    </View>
  );
}

type TodayHabitCardProps = {
  habit: Habit;
  completed: boolean;
  skipped: boolean;
  skipReason?: string | null;
  progress?: HabitProgress;
  disabled: boolean;
  progressDisabled: boolean;
  skipDisabled: boolean;
  toggleDisabled: boolean;
  completionDateLabel: string;
  onEditProgress: (habitId: string) => void;
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
  progressDisabled,
  skipDisabled,
  toggleDisabled,
  completionDateLabel,
  onEditProgress,
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

  function handleEditProgress(event: GestureResponderEvent) {
    event.stopPropagation();
    onEditProgress(habit.id);
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
          fallbackIcon={habit.icon}
          iconLibrary={habit.iconLibrary}
          iconType={habit.iconType}
          iconValue={habit.iconValue}
          size={large ? 50 : 44}
        />

        {isProgressHabit ? (
          <Pressable
            accessibilityLabel={`Update progress for ${habit.name}`}
            accessibilityRole="button"
            disabled={disabled || progressDisabled}
            onPress={handleEditProgress}
            style={[
              styles.progressCircle,
              { borderColor: skipped ? colors.warning : completed ? colors.primary : accentColor },
              (disabled || progressDisabled) && styles.controlDisabled,
            ]}>
            <Text style={styles.progressCircleText}>{Math.round(progressPercent * 100)}%</Text>
          </Pressable>
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
        <Pressable
          accessibilityLabel={`Update progress for ${habit.name}`}
          accessibilityRole="button"
          disabled={disabled || progressDisabled}
          onPress={handleEditProgress}
          style={[styles.cardProgressBlock, (disabled || progressDisabled) && styles.controlDisabled]}>
          <Text numberOfLines={1} style={styles.cardProgressLabel}>
            {progress.label}
          </Text>
          <AnimatedProgressBar color={accentColor} height={8} percent={progressPercent} />
        </Pressable>
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
  skipLimitPill: {
    alignSelf: 'flex-start',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderWidth: 1,
    borderColor: colors.warning,
    borderRadius: radius.pill,
    backgroundColor: colors.surfaceElevated,
  },
  skipLimitText: {
    color: colors.warning,
    ...typography.caption,
    fontWeight: '900',
  },
  animatedProgressTrack: {
    overflow: 'hidden',
    borderRadius: radius.pill,
    backgroundColor: colors.surfaceMuted,
  },
  animatedProgressFill: {
    height: '100%',
    borderRadius: radius.pill,
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
    paddingVertical: spacing.xs,
    borderRadius: radius.lg,
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
  datePickerCard: {
    gap: spacing.lg,
    padding: spacing.xl,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.xl,
    backgroundColor: colors.surface,
  },
  datePickerHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: spacing.lg,
  },
  datePickerCloseButton: {
    minHeight: 38,
    justifyContent: 'center',
    paddingHorizontal: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.pill,
    backgroundColor: colors.surfaceElevated,
  },
  datePickerCloseText: {
    color: colors.textMuted,
    ...typography.caption,
    fontWeight: '900',
  },
  datePickerMonthNav: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  monthArrowButton: {
    width: 42,
    height: 42,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radius.pill,
    backgroundColor: colors.surfaceElevated,
  },
  jumpTodayButton: {
    flex: 1,
    minHeight: 42,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: colors.primary,
    borderRadius: radius.pill,
    backgroundColor: colors.primaryMuted,
  },
  jumpTodayText: {
    color: colors.primary,
    ...typography.caption,
    fontWeight: '900',
  },
  calendarWeekdays: {
    flexDirection: 'row',
    gap: spacing.xs,
  },
  calendarWeekdayText: {
    flex: 1,
    color: colors.textSubtle,
    ...typography.small,
    textAlign: 'center',
    textTransform: 'uppercase',
  },
  calendarGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.xs,
  },
  calendarDay: {
    width: '13.45%',
    aspectRatio: 1,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    backgroundColor: colors.surfaceElevated,
  },
  outsideMonthDay: {
    opacity: 0.34,
  },
  todayCalendarDay: {
    borderColor: colors.primary,
  },
  selectedCalendarDay: {
    borderColor: colors.primary,
    backgroundColor: colors.primary,
  },
  futureCalendarDay: {
    borderStyle: 'dashed',
  },
  calendarDayText: {
    color: colors.text,
    ...typography.caption,
    fontWeight: '900',
  },
  outsideMonthDayText: {
    color: colors.textSubtle,
  },
  selectedCalendarDayText: {
    color: colors.background,
  },
  progressEditor: {
    gap: spacing.lg,
  },
  editorList: {
    gap: spacing.sm,
  },
  editorChecklistRow: {
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
  checkedEditorChecklistRow: {
    borderColor: colors.primary,
    backgroundColor: colors.primaryMuted,
  },
  editorCheck: {
    width: 28,
    height: 28,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: colors.surfaceMuted,
    borderRadius: radius.pill,
    backgroundColor: colors.surface,
  },
  checkedEditorCheck: {
    borderColor: colors.primary,
    backgroundColor: colors.primary,
  },
  editorChecklistText: {
    flex: 1,
    color: colors.text,
    ...typography.caption,
    fontWeight: '800',
  },
  checkedEditorChecklistText: {
    color: colors.primary,
  },
  numericEditor: {
    gap: spacing.md,
  },
  numericTargetText: {
    color: colors.textMuted,
    ...typography.caption,
    fontWeight: '800',
  },
  numericInput: {
    minHeight: 76,
    paddingHorizontal: spacing.lg,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.lg,
    color: colors.text,
    backgroundColor: colors.surfaceElevated,
    fontSize: 32,
    fontWeight: '900',
  },
  numericQuickActions: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  numericStepButton: {
    flex: 1,
    minHeight: 48,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.pill,
    backgroundColor: colors.surfaceElevated,
  },
  numericStepText: {
    color: colors.text,
    ...typography.body,
    fontWeight: '900',
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
  skipLimitModalText: {
    color: colors.warning,
    ...typography.caption,
    fontWeight: '900',
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
