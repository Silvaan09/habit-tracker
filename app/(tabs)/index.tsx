import { useFocusEffect } from '@react-navigation/native';
import { addDays, addWeeks, format, parseISO, startOfWeek } from 'date-fns';
import { router } from 'expo-router';
import { useCallback, useMemo, useRef, useState } from 'react';
import { PanResponder, Pressable, StyleSheet, Text, View } from 'react-native';

import { EmptyState } from '@/src/components/EmptyState';
import { HabitRow } from '@/src/components/HabitRow';
import { PrimaryButton } from '@/src/components/PrimaryButton';
import { Screen } from '@/src/components/Screen';
import {
  completeHabitForDate,
  getCompletionsForDate,
  uncompleteHabitForDate,
} from '@/src/db/completions';
import { initDatabase } from '@/src/db/database';
import { getActiveHabits } from '@/src/db/habits';
import { colors, radius, spacing, typography } from '@/src/theme';
import type { Habit, HabitCompletion } from '@/src/types/Habit';
import { getTodayDateString } from '@/src/utils/dates';

export default function TodayScreen() {
  const [habits, setHabits] = useState<Habit[]>([]);
  const [completions, setCompletions] = useState<HabitCompletion[]>([]);
  const [actualTodayDate, setActualTodayDate] = useState(getTodayDateString);
  const [selectedDate, setSelectedDate] = useState(getTodayDateString);
  const [visibleWeekStart, setVisibleWeekStart] = useState(() =>
    getWeekStartDateString(getTodayDateString())
  );
  const selectedDateRef = useRef(selectedDate);
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [busyHabitIds, setBusyHabitIds] = useState<Record<string, boolean>>({});

  const loadTodayData = useCallback(async (dateToLoad: string) => {
    const currentToday = getTodayDateString();

    setActualTodayDate(currentToday);
    await initDatabase();

    const [activeHabits, dateCompletions] = await Promise.all([
      getActiveHabits(),
      getCompletionsForDate(dateToLoad),
    ]);

    setHabits(activeHabits);
    setCompletions(dateCompletions);
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

  const completedCount = useMemo(
    () => habits.filter((habit) => completedHabitIds.has(habit.id)).length,
    [completedHabitIds, habits]
  );
  const completionPercent =
    habits.length === 0 ? 0 : Math.round((completedCount / habits.length) * 100);
  const dateStripDays = useMemo(
    () => getDateStripDays(visibleWeekStart, actualTodayDate, selectedDate),
    [actualTodayDate, selectedDate, visibleWeekStart]
  );
  const formattedToday = useMemo(
    () => format(parseISO(selectedDate), 'EEEE, MMMM d'),
    [selectedDate]
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

  async function refreshTodayCompletions() {
    setCompletions(await getCompletionsForDate(selectedDate));
  }

  async function toggleHabit(habitId: string) {
    try {
      setErrorMessage(null);
      setBusyHabitIds((current) => ({ ...current, [habitId]: true }));

      if (completedHabitIds.has(habitId)) {
        await uncompleteHabitForDate(habitId, selectedDate);
      } else {
        await completeHabitForDate(habitId, selectedDate);
      }

      await refreshTodayCompletions();
    } catch (error) {
      console.error('Failed to toggle habit completion', error);
      setErrorMessage('Could not update that habit. Please try again.');
    } finally {
      setBusyHabitIds((current) => ({ ...current, [habitId]: false }));
    }
  }

  function openNewHabitScreen() {
    router.push('/habits/new');
  }

  function openHabitDetail(habitId: string) {
    router.push({ pathname: '/habits/[id]', params: { id: habitId } });
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
      <View style={styles.hero}>
        <View style={styles.header}>
          <View style={styles.headerText}>
            <Text style={styles.eyebrow}>Today</Text>
            <Text style={styles.title}>Build the day</Text>
            <Text style={styles.subtitle}>{formattedToday}</Text>
          </View>

          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Create a new habit"
            onPress={openNewHabitScreen}
            style={({ pressed }) => [styles.addButton, pressed && styles.pressed]}>
            <Text style={styles.addButtonText}>+</Text>
          </Pressable>
        </View>

        <View style={styles.summaryPill}>
          <Text style={styles.summaryText}>
            {completedCount}/{habits.length}
          </Text>
          <Text style={styles.summaryLabel}>completed</Text>
        </View>
      </View>

      <View style={styles.weekCard} {...weekPanResponder.panHandlers}>
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

      <View style={styles.progressCard}>
        <View style={styles.progressHeader}>
          <View>
            <Text style={styles.progressEyebrow}>Daily check-in</Text>
            <Text style={styles.progressLabel}>Your progress</Text>
          </View>
          <View style={styles.progressPill}>
            <Text style={styles.progressValue}>{completionPercent}%</Text>
          </View>
        </View>
        <Text style={styles.progressCopy}>
          {completedCount} of {habits.length} habits complete for {selectedDateLabel}
        </Text>
        <View style={styles.progressTrack}>
          <View style={[styles.progressFill, { width: `${completionPercent}%` }]} />
        </View>
      </View>

      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>Habits</Text>
        <Text style={styles.dateText}>{selectedDate}</Text>
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
      ) : (
        <View style={styles.habitList}>
          {habits.map((habit) => (
            <HabitRow
              key={habit.id}
              habit={habit}
              completed={completedHabitIds.has(habit.id)}
              disabled={Boolean(busyHabitIds[habit.id])}
              completionDateLabel={selectedDateLabel}
              onToggle={toggleHabit}
              onPress={openHabitDetail}
            />
          ))}
        </View>
      )}
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

const styles = StyleSheet.create({
  screenContent: {
    gap: spacing.lg,
    paddingBottom: 112,
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
  progressCopy: {
    color: colors.textMuted,
    ...typography.caption,
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
});
