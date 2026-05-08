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
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ElementRef,
  type ReactNode,
} from 'react';
import {
  Animated,
  AppState,
  DeviceEventEmitter,
  GestureResponderEvent,
  NativeScrollEvent,
  NativeSyntheticEvent,
  PanResponder,
  Pressable,
  Alert,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  useWindowDimensions,
  View,
  type ViewStyle,
} from 'react-native';
import Svg, { Circle } from 'react-native-svg';

import { EmptyState } from '@/src/components/EmptyState';
import { BottomSheetModal } from '@/src/components/BottomSheetModal';
import { HabitCrownBadge } from '@/src/components/HabitCrownBadge';
import { HabitHistoryMiniRow } from '@/src/components/HabitHistoryMiniRow';
import { HabitIcon } from '@/src/components/HabitIcon';
import { PrimaryButton } from '@/src/components/PrimaryButton';
import { Screen } from '@/src/components/Screen';
import {
  completeHabitForDate,
  getCompletionsForHabit,
  getCompletionsForDate,
  uncompleteHabitForDate,
} from '@/src/db/completions';
import { initDatabase } from '@/src/db/database';
import { getActiveHabits, updateHabitLayout, updateHabitLayoutOrder } from '@/src/db/habits';
import { getNumericEntryForDate, setNumericEntryForDate } from '@/src/db/numericEntries';
import {
  getSkipsForDate,
  getSkipsForDateRange,
  getSkipsForHabit,
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
  HabitCardLayoutSize,
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
import {
  calculateScheduleAwareCurrentStreak,
  getHabitCrownMilestone,
  type HabitCrownMilestone,
} from '@/src/utils/milestones';
import {
  getRecentHabitHistoryItems,
  type HabitHistoryItem,
} from '@/src/utils/recentHabitHistory';

type HabitProgress = {
  label: string;
  percent: number;
};

type HabitCardVariant = 'small' | 'tall' | 'wide' | 'large';

type TodayGridItem = {
  habit: Habit;
  variant: HabitCardVariant;
};

type TodayGridPlacement = {
  item: TodayGridItem;
  column: 0 | 1;
  row: number;
  colSpan: 1 | 2;
  rowSpan: 1 | 2;
};

type TodayGridLayout = {
  placements: TodayGridPlacement[];
  rowCount: number;
};

type TodayGridMetrics = {
  gap: number;
  cellSize: number;
  fullWidth: number;
};

const GRID_GAP = spacing.md;
const GRID_HORIZONTAL_PADDING = 0;
const SCREEN_HORIZONTAL_PADDING = 20;
const LAYOUT_DRAG_HOLD_DELAY_MS = 200;

const LAYOUT_SIZE_OPTIONS: {
  label: string;
  meta: string;
  value: HabitCardLayoutSize;
}[] = [
  { label: 'Auto', meta: 'Default', value: 'auto' },
  { label: 'Small', meta: '1x1', value: 'small' },
  { label: 'Tall', meta: '1x2', value: 'tall' },
  { label: 'Wide', meta: '2x1', value: 'wide' },
  { label: 'Large', meta: '2x2', value: 'large' },
];

const WEEKLY_SKIP_LIMIT = 1;

export default function TodayScreen() {
  const { width: windowWidth } = useWindowDimensions();
  const [habits, setHabits] = useState<Habit[]>([]);
  const [completions, setCompletions] = useState<HabitCompletion[]>([]);
  const [skips, setSkips] = useState<HabitSkip[]>([]);
  const [weeklySkips, setWeeklySkips] = useState<HabitSkip[]>([]);
  const [progressByHabitId, setProgressByHabitId] = useState<Record<string, HabitProgress>>({});
  const [crownByHabitId, setCrownByHabitId] = useState<Record<string, HabitCrownMilestone>>({});
  const [historyByHabitId, setHistoryByHabitId] = useState<Record<string, HabitHistoryItem[]>>({});
  const [actualTodayDate, setActualTodayDate] = useState(getTodayDateString);
  const [selectedDate, setSelectedDate] = useState(getTodayDateString);
  const [visibleWeekStart, setVisibleWeekStart] = useState(() =>
    getWeekStartDateString(getTodayDateString())
  );
  const selectedDateRef = useRef(selectedDate);
  const actualTodayDateRef = useRef(actualTodayDate);
  const hasLoadedTodayDataRef = useRef(false);
  const todayScrollRef = useRef<ScrollView | null>(null);
  const todayScrollYRef = useRef(0);
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [busyHabitIds, setBusyHabitIds] = useState<Record<string, boolean>>({});
  const [skipTargetHabitId, setSkipTargetHabitId] = useState<string | null>(null);
  const [skipLimitModalVisible, setSkipLimitModalVisible] = useState(false);
  const [skipReason, setSkipReason] = useState('');
  const [skipReasonError, setSkipReasonError] = useState<string | null>(null);
  const [skipping, setSkipping] = useState(false);
  const [progressEditorHabitId, setProgressEditorHabitId] = useState<string | null>(null);
  const [progressEditorLoading, setProgressEditorLoading] = useState(false);
  const [progressEditorError, setProgressEditorError] = useState<string | null>(null);
  const [datePickerVisible, setDatePickerVisible] = useState(false);
  const [layoutEditMode, setLayoutEditMode] = useState(false);
  const [layoutSizeHabitId, setLayoutSizeHabitId] = useState<string | null>(null);
  const [savingLayoutHabitId, setSavingLayoutHabitId] = useState<string | null>(null);
  const [layoutDraggingHabitId, setLayoutDraggingHabitId] = useState<string | null>(null);
  const layoutDropPreviewRefs = useRef(new Map<string, ElementRef<typeof View>>());
  const layoutDropPreviewHabitIdRef = useRef<string | null>(null);
  const [datePickerMonth, setDatePickerMonth] = useState(() =>
    format(startOfMonth(parseISO(getTodayDateString())), 'yyyy-MM-dd')
  );
  const [editorSubtasks, setEditorSubtasks] = useState<HabitSubtask[]>([]);
  const [editorSubtaskCompletions, setEditorSubtaskCompletions] = useState<
    HabitSubtaskCompletion[]
  >([]);
  const [editorNumericValue, setEditorNumericValue] = useState('');
  const [editorInitialNumericValue, setEditorInitialNumericValue] = useState('');
  const [savingProgress, setSavingProgress] = useState(false);

  const loadTodayData = useCallback(async (dateToLoad: string) => {
    const currentToday = getTodayDateString();

    actualTodayDateRef.current = currentToday;
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
    setCrownByHabitId(await getCrownMilestonesByHabitId(activeHabits, currentToday));
    setHistoryByHabitId(
      await getRecentHistoryByHabitId(activeHabits, getHistoryEndDate(dateToLoad, currentToday))
    );
  }, []);

  const restoreTodayScrollPosition = useCallback((scrollY: number) => {
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        todayScrollRef.current?.scrollTo({ y: scrollY, animated: false });
      });
    });
  }, []);

  const scrollTodayToTop = useCallback((animated: boolean) => {
    todayScrollYRef.current = 0;
    todayScrollRef.current?.scrollTo({ y: 0, animated });
  }, []);

  const handleTodayScroll = useCallback(
    (event: NativeSyntheticEvent<NativeScrollEvent>) => {
      todayScrollYRef.current = event.nativeEvent.contentOffset.y;
    },
    []
  );

  useFocusEffect(
    useCallback(() => {
      let isActive = true;

      async function setup() {
        const shouldShowInitialLoading = !hasLoadedTodayDataRef.current;
        const scrollYBeforeRefresh = todayScrollYRef.current;

        try {
          if (shouldShowInitialLoading) {
            setLoading(true);
          }

          setErrorMessage(null);
          await loadTodayData(selectedDateRef.current);
          hasLoadedTodayDataRef.current = true;

          if (isActive && !shouldShowInitialLoading) {
            restoreTodayScrollPosition(scrollYBeforeRefresh);
          }
        } catch (error) {
          console.error('Failed to initialize Today screen data', error);

          if (isActive) {
            setErrorMessage('Something went wrong while loading your habits.');
          }
        } finally {
          if (isActive && shouldShowInitialLoading) {
            setLoading(false);
          }
        }
      }

      setup();

      return () => {
        isActive = false;
      };
    }, [loadTodayData, restoreTodayScrollPosition])
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
  const orderedScheduledHabits = useMemo(
    () => getLayoutSortedHabits(scheduledHabits),
    [scheduledHabits]
  );
  const todayGridItems = useMemo(
    () => buildTodayGridItems(orderedScheduledHabits),
    [orderedScheduledHabits]
  );
  const todayGridLayout = useMemo(() => buildTodayGridLayout(todayGridItems), [todayGridItems]);
  const todayGridMetrics = useMemo(() => {
    const availableGridWidth = Math.max(
      0,
      windowWidth - SCREEN_HORIZONTAL_PADDING * 2 - GRID_HORIZONTAL_PADDING * 2
    );
    const cellSize = Math.floor((availableGridWidth - GRID_GAP) / 2);

    return {
      cellSize,
      fullWidth: cellSize * 2 + GRID_GAP,
      gap: GRID_GAP,
    };
  }, [windowWidth]);
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
  const selectedDateFriendlyDisplay = useMemo(
    () => format(parseISO(selectedDate), 'EEEE, MMM d'),
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
    () =>
      getBuildDayHelperLine(
        completionPercent,
        remainingCount,
        scheduledHabits.length,
        selectedDate,
        actualTodayDate
      ),
    [actualTodayDate, completionPercent, remainingCount, scheduledHabits.length, selectedDate]
  );
  const selectedDateLabel = useMemo(
    () => (selectedDate === actualTodayDate ? 'today' : format(parseISO(selectedDate), 'MMM d')),
    [actualTodayDate, selectedDate]
  );
  const progressEditorHabit = useMemo(
    () => habits.find((habit) => habit.id === progressEditorHabitId) ?? null,
    [habits, progressEditorHabitId]
  );
  const layoutSizeHabit = useMemo(
    () => habits.find((habit) => habit.id === layoutSizeHabitId) ?? null,
    [habits, layoutSizeHabitId]
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

  const syncActualTodayDate = useCallback(() => {
    const nextToday = getTodayDateString();
    const previousToday = actualTodayDateRef.current;

    if (nextToday === previousToday) {
      return;
    }

    actualTodayDateRef.current = nextToday;
    setActualTodayDate(nextToday);

    if (selectedDateRef.current === previousToday) {
      setVisibleWeekStart(getWeekStartDateString(nextToday));
      void selectDate(nextToday);
    }
  }, [selectDate]);

  useEffect(() => {
    syncActualTodayDate();

    const intervalId = setInterval(syncActualTodayDate, 60 * 1000);
    const subscription = AppState.addEventListener('change', (state) => {
      if (state === 'active') {
        syncActualTodayDate();
      }
    });

    return () => {
      clearInterval(intervalId);
      subscription.remove();
    };
  }, [syncActualTodayDate]);

  useEffect(() => {
    const subscription = DeviceEventEmitter.addListener(TODAY_TAB_RESELECT_EVENT, () => {
      const today = getTodayDateString();

      selectedDateRef.current = today;
      setVisibleWeekStart(getWeekStartDateString(today));
      scrollTodayToTop(true);
      void selectDate(today).finally(() => {
        restoreTodayScrollPosition(0);
      });
    });

    return () => subscription.remove();
  }, [restoreTodayScrollPosition, scrollTodayToTop, selectDate]);

  const visibleWeekLabel = useMemo(() => {
    const weekStart = parseISO(visibleWeekStart);
    const weekEnd = addDays(weekStart, 6);

    return `${format(weekStart, 'MMM d')} - ${format(weekEnd, 'MMM d')}`;
  }, [visibleWeekStart]);
  const datePickerDays = useMemo(
    () => getCalendarMonthDays(datePickerMonth, actualTodayDate, selectedDate),
    [actualTodayDate, datePickerMonth, selectedDate]
  );
  const datePickerWeeks = useMemo(() => chunkCalendarWeeks(datePickerDays), [datePickerDays]);
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
    const currentToday = getTodayDateString();

    setCrownByHabitId(await getCrownMilestonesByHabitId(habits, currentToday));
    setHistoryByHabitId(
      await getRecentHistoryByHabitId(habits, getHistoryEndDate(selectedDate, currentToday))
    );
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
      setSkipLimitModalVisible(true);
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
        const nextValue = entry ? String(entry.value) : '0';

        setEditorSubtasks([]);
        setEditorSubtaskCompletions([]);
        setEditorNumericValue(nextValue);
        setEditorInitialNumericValue(nextValue);
      }
    } catch (error) {
      console.error('Failed to load Today progress editor', error);
      setProgressEditorError('Could not load progress for this habit.');
    } finally {
      setProgressEditorLoading(false);
    }
  }

  function dismissProgressEditor() {
    setProgressEditorHabitId(null);
    setProgressEditorError(null);
    setEditorSubtasks([]);
    setEditorSubtaskCompletions([]);
    setEditorNumericValue('');
    setEditorInitialNumericValue('');
  }

  function closeProgressEditor() {
    if (savingProgress) {
      return;
    }

    if (
      progressEditorHabit?.trackingType === 'numeric' &&
      normalizeNumericDraft(editorNumericValue) !== normalizeNumericDraft(editorInitialNumericValue)
    ) {
      Alert.alert('Save changes?', 'You have unsaved progress changes.', [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Discard', style: 'destructive', onPress: dismissProgressEditor },
        { text: 'Save', onPress: () => void saveEditorNumericProgress() },
      ]);
      return;
    }

    dismissProgressEditor();
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
      await refreshSelectedDateStatuses();
      dismissProgressEditor();
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

  function adjustEditorNumericProgress(delta: number) {
    const currentValue = Number(editorNumericValue.replace(',', '.'));
    const safeCurrentValue = Number.isFinite(currentValue) ? currentValue : 0;
    const nextValue = Math.max(0, safeCurrentValue + delta);

    setEditorNumericValue(formatProgressNumber(nextValue));
    setProgressEditorError(null);
  }

  function openNewHabitScreen() {
    router.push('/habits/new');
  }

  function openHabitDetail(habitId: string) {
    router.push({ pathname: '/habits/[id]', params: { id: habitId, date: selectedDate } });
  }

  function openLayoutSizeSelector(habitId: string) {
    setLayoutSizeHabitId(habitId);
  }

  function closeLayoutSizeSelector() {
    if (!savingLayoutHabitId) {
      setLayoutSizeHabitId(null);
    }
  }

  async function selectLayoutSize(size: HabitCardLayoutSize) {
    if (!layoutSizeHabit) {
      return;
    }

    try {
      setSavingLayoutHabitId(layoutSizeHabit.id);
      setErrorMessage(null);
      await updateHabitLayout(layoutSizeHabit.id, { todayLayoutSize: size });
      setHabits((current) =>
        current.map((habit) =>
          habit.id === layoutSizeHabit.id ? { ...habit, todayLayoutSize: size } : habit
        )
      );
    } catch (error) {
      console.error('Failed to update Today layout size', error);
      setErrorMessage('Could not update that card size. Please try again.');
    } finally {
      setSavingLayoutHabitId(null);
    }
  }

  function setLayoutDropPreviewRef(habitId: string, ref: ElementRef<typeof View> | null) {
    if (ref) {
      layoutDropPreviewRefs.current.set(habitId, ref);
      return;
    }

    layoutDropPreviewRefs.current.delete(habitId);
  }

  function setLayoutDropPreview(habitId: string | null) {
    const currentHabitId = layoutDropPreviewHabitIdRef.current;

    if (currentHabitId === habitId) {
      return;
    }

    if (currentHabitId) {
      layoutDropPreviewRefs.current.get(currentHabitId)?.setNativeProps({
        style: { opacity: 0 },
      });
    }

    if (habitId) {
      layoutDropPreviewRefs.current.get(habitId)?.setNativeProps({
        style: { opacity: 1 },
      });
    }

    layoutDropPreviewHabitIdRef.current = habitId;
  }

  function handleLayoutDragStart(habitId: string) {
    setLayoutDraggingHabitId(habitId);
    setLayoutDropPreview(null);
    setLayoutSizeHabitId(null);
  }

  function handleLayoutDragMove(habitId: string, dx: number, dy: number) {
    const dropTarget = getLayoutDragDropTarget(
      habitId,
      dx,
      dy,
      todayGridLayout,
      todayGridMetrics,
      orderedScheduledHabits
    );

    setLayoutDropPreview(dropTarget?.targetHabitId ?? null);
  }

  function handleLayoutDragCancel() {
    setLayoutDraggingHabitId(null);
    setLayoutDropPreview(null);
  }

  async function handleLayoutDragEnd(habitId: string, dx: number, dy: number) {
    const dropTarget = getLayoutDragDropTarget(
      habitId,
      dx,
      dy,
      todayGridLayout,
      todayGridMetrics,
      orderedScheduledHabits
    );

    setLayoutDraggingHabitId(null);
    setLayoutDropPreview(null);

    if (!dropTarget) {
      return;
    }

    const sourceIndex = orderedScheduledHabits.findIndex((habit) => habit.id === habitId);

    if (sourceIndex === -1 || sourceIndex === dropTarget.dropIndex) {
      return;
    }

    const reorderedScheduledHabits = reorderHabitList(
      orderedScheduledHabits,
      sourceIndex,
      dropTarget.dropIndex
    );

    await saveLayoutHabitOrder(habitId, reorderedScheduledHabits);
  }

  async function saveLayoutHabitOrder(draggedHabitId: string, reorderedScheduledHabits: Habit[]) {
    const scheduledHabitIds = new Set(reorderedScheduledHabits.map((habit) => habit.id));
    let scheduledIndex = 0;
    const reorderedActiveHabits = getLayoutSortedHabits(habits).map((habit) => {
      if (!scheduledHabitIds.has(habit.id)) {
        return habit;
      }

      const nextHabit = reorderedScheduledHabits[scheduledIndex];
      scheduledIndex += 1;

      return nextHabit;
    });
    const nextOrders = reorderedActiveHabits.map((habit, index) => ({
      habitId: habit.id,
      order: index,
    }));
    const orderByHabitId = new Map(nextOrders.map((item) => [item.habitId, item.order]));
    const previousHabits = habits;

    try {
      setSavingLayoutHabitId(draggedHabitId);
      setErrorMessage(null);
      setHabits((current) =>
        current.map((habit) => {
          const nextOrder = orderByHabitId.get(habit.id);

          return nextOrder === undefined ? habit : { ...habit, todayLayoutOrder: nextOrder };
        })
      );
      await updateHabitLayoutOrder(nextOrders);
    } catch (error) {
      console.error('Failed to update Today layout order', error);
      setHabits(previousHabits);
      setErrorMessage('Could not reorder that card. Please try again.');
    } finally {
      setSavingLayoutHabitId(null);
    }
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

  function renderTodayHabitCard(habit: Habit, variant: HabitCardVariant) {
    const progress = progressByHabitId[habit.id];
    const completed = completedHabitIds.has(habit.id);
    const skipped = skippedHabitIds.has(habit.id);
    const skip = skipByHabitId.get(habit.id);

    return (
      <TodayHabitCard
        key={habit.id}
        habit={habit}
        variant={variant}
        completed={completed}
        skipped={skipped}
        cardStyle={getHabitCardGeometryStyle(variant, todayGridMetrics)}
        skipReason={skip?.reason}
        progress={progress}
        crownMilestone={crownByHabitId[habit.id] ?? getHabitCrownMilestone(0)}
        historyItems={historyByHabitId[habit.id] ?? []}
        disabled={Boolean(busyHabitIds[habit.id])}
        editMode={layoutEditMode}
        selectedForLayout={layoutSizeHabitId === habit.id}
        progressDisabled={layoutEditMode || selectedDateIsFuture || skipped}
        skipDisabled={layoutEditMode || selectedDateIsFuture}
        toggleDisabled={layoutEditMode || selectedDateIsFuture || habit.trackingType !== 'checkbox'}
        completionDateLabel={selectedDateLabel}
        onEditProgress={openProgressEditor}
        onToggle={toggleHabit}
        onSkip={openSkipModal}
        onUndoSkip={undoSkip}
        onPress={layoutEditMode ? openLayoutSizeSelector : openHabitDetail}
      />
    );
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
    <Screen
      contentContainerStyle={styles.screenContent}
      onScroll={handleTodayScroll}
      scrollEnabled={layoutDraggingHabitId === null}
      scrollEventThrottle={16}
      scrollRef={todayScrollRef}>
      <View style={styles.buildDayCard}>
        <View style={styles.buildDayHeader}>
          <View style={styles.buildDayCopy}>
            <Text style={styles.buildDayEyebrow}>{selectedDayLabel}</Text>
            <Text style={styles.buildDayTitle}>Build the day</Text>
            <Text style={styles.buildDayDate}>{selectedDateFriendlyDisplay}</Text>
          </View>

          <View style={styles.buildDayPercent}>
            <Text style={styles.buildDayPercentValue}>{completionPercent}%</Text>
            <Text style={styles.buildDayPercentLabel}>
              {completedCount} of {trackableHabitCount} done
            </Text>
          </View>
        </View>

        <AnimatedProgressBar color={colors.primary} height={6} percent={completionPercent / 100} />

        <Text style={styles.buildDayMotivation}>{motivationLine}</Text>
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
          <Text style={styles.infoText}>Future days cannot be completed yet.</Text>
        </View>
      ) : null}

      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>Habits</Text>
        <View style={styles.sectionHeaderActions}>
          <Pressable
            accessibilityLabel={layoutEditMode ? 'Finish editing Today layout' : 'Edit Today layout'}
            accessibilityRole="button"
            onPress={() => {
              setLayoutEditMode((current) => !current);
              setLayoutSizeHabitId(null);
            }}
            style={({ pressed }) => [
              styles.layoutEditButton,
              layoutEditMode && styles.activeLayoutEditButton,
              pressed && styles.pressed,
            ]}>
            <Text
              style={[
                styles.layoutEditButtonText,
                layoutEditMode && styles.activeLayoutEditButtonText,
              ]}>
              {layoutEditMode ? 'Done' : 'Edit layout'}
            </Text>
          </Pressable>
        </View>
      </View>

      {layoutEditMode ? (
        <View style={styles.layoutEditBanner}>
          <Text style={styles.layoutEditTitle}>Layout edit mode</Text>
          <Text style={styles.layoutEditText}>
            Drag cards to reorder. Tap a card to change its size.
          </Text>
        </View>
      ) : null}

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
        <View
          style={[
            styles.habitGrid,
            {
              height: getTodayGridHeight(todayGridLayout.rowCount, todayGridMetrics),
              paddingHorizontal: GRID_HORIZONTAL_PADDING,
              width: todayGridMetrics.fullWidth + GRID_HORIZONTAL_PADDING * 2,
            },
          ]}>
          {todayGridLayout.placements.map((placement) => (
            <View
              key={placement.item.habit.id}
              style={[
                styles.gridPlacedItem,
                {
                  left: placement.column * (todayGridMetrics.cellSize + todayGridMetrics.gap),
                  top: placement.row * (todayGridMetrics.cellSize + todayGridMetrics.gap),
                },
                layoutDraggingHabitId === placement.item.habit.id && styles.draggingGridItem,
              ]}>
              <DraggableHabitCard
                disabled={Boolean(savingLayoutHabitId)}
                dragging={layoutDraggingHabitId === placement.item.habit.id}
                enabled={layoutEditMode}
                onDragCancel={handleLayoutDragCancel}
                onDragEnd={(dx, dy) => handleLayoutDragEnd(placement.item.habit.id, dx, dy)}
                onDragMove={(dx, dy) => handleLayoutDragMove(placement.item.habit.id, dx, dy)}
                onDragStart={() => handleLayoutDragStart(placement.item.habit.id)}>
                {renderTodayHabitCard(placement.item.habit, placement.item.variant)}
              </DraggableHabitCard>
              <View
                pointerEvents="none"
                ref={(ref) => setLayoutDropPreviewRef(placement.item.habit.id, ref)}
                style={[
                  styles.layoutDropPreview,
                  getHabitCardGeometryStyle(placement.item.variant, todayGridMetrics),
                ]}
              />
            </View>
          ))}
        </View>
      )}

      <BottomSheetModal
        onRequestClose={closeProgressEditor}
        sheetStyle={styles.modalCard}
        visible={Boolean(progressEditorHabit)}>
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
                  </View>
                )}

                {progressEditorError ? (
                  <Text style={styles.reasonError}>{progressEditorError}</Text>
                ) : null}

                {progressEditorHabit.trackingType === 'subtasks' ? (
                  <PrimaryButton
                    disabled={savingProgress}
                    onPress={closeProgressEditor}
                    title="Close"
                  />
                ) : (
                  <View style={styles.modalActions}>
                    <PrimaryButton
                      disabled={savingProgress}
                      onPress={closeProgressEditor}
                      title="Cancel"
                      variant="secondary"
                    />
                    <PrimaryButton
                      disabled={savingProgress}
                      onPress={() => saveEditorNumericProgress()}
                      title={savingProgress ? 'Saving...' : 'Save progress'}
                    />
                  </View>
                )}
          </View>
        ) : null}
      </BottomSheetModal>

      <BottomSheetModal
        onRequestClose={closeLayoutSizeSelector}
        sheetStyle={styles.modalCard}
        visible={Boolean(layoutSizeHabit)}>
        {layoutSizeHabit ? (
          <>
                <View style={styles.modalHeader}>
                  <Text style={styles.modalEyebrow}>Card size</Text>
                  <Text style={styles.modalTitle}>{layoutSizeHabit.name}</Text>
                  <Text style={styles.modalText}>Choose how this card appears on Today.</Text>
                </View>

                <View style={styles.layoutSizeGrid}>
                  {LAYOUT_SIZE_OPTIONS.map((option) => {
                    const selected = layoutSizeHabit.todayLayoutSize === option.value;

                    return (
                      <Pressable
                        accessibilityLabel={`Set card size to ${option.label}`}
                        accessibilityRole="button"
                        accessibilityState={{ selected }}
                        disabled={Boolean(savingLayoutHabitId)}
                        key={option.value}
                        onPress={() => selectLayoutSize(option.value)}
                        style={({ pressed }) => [
                          styles.layoutSizeOption,
                          selected && styles.selectedLayoutSizeOption,
                          pressed && styles.pressed,
                          savingLayoutHabitId && styles.controlDisabled,
                        ]}>
                        <Text
                          style={[
                            styles.layoutSizeOptionLabel,
                            selected && styles.selectedLayoutSizeText,
                          ]}>
                          {option.label}
                        </Text>
                        <Text
                          style={[
                            styles.layoutSizeOptionMeta,
                            selected && styles.selectedLayoutSizeText,
                          ]}>
                          {option.meta}
                        </Text>
                      </Pressable>
                    );
                  })}
                </View>

                <PrimaryButton
                  disabled={Boolean(savingLayoutHabitId)}
                  onPress={closeLayoutSizeSelector}
                  title="Done"
                />
          </>
        ) : null}
      </BottomSheetModal>

      <BottomSheetModal
        onRequestClose={() => setDatePickerVisible(false)}
        sheetStyle={styles.datePickerCard}
        visible={datePickerVisible}>
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
              {datePickerWeeks.map((week) => (
                <View key={week.map((day) => day.date).join('-')} style={styles.calendarWeekRow}>
                  {week.map((day) => (
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
              ))}
            </View>
      </BottomSheetModal>

      <BottomSheetModal
        onRequestClose={closeSkipModal}
        sheetStyle={styles.modalCard}
        visible={Boolean(skipTargetHabitId)}>
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
      </BottomSheetModal>

      <BottomSheetModal
        onRequestClose={() => setSkipLimitModalVisible(false)}
        sheetStyle={styles.modalCard}
        visible={skipLimitModalVisible}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalEyebrow}>Skip limit</Text>
              <Text style={styles.modalTitle}>No skips left this week</Text>
              <Text style={styles.modalText}>
                {"You've already used your skip for this week."}
              </Text>
            </View>
            <PrimaryButton onPress={() => setSkipLimitModalVisible(false)} title="Close" />
      </BottomSheetModal>
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

function chunkCalendarWeeks<T>(days: T[]) {
  return Array.from({ length: Math.ceil(days.length / 7) }, (_, index) =>
    days.slice(index * 7, index * 7 + 7)
  );
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

type DraggableHabitCardProps = {
  children: ReactNode;
  disabled: boolean;
  dragging: boolean;
  enabled: boolean;
  onDragCancel: () => void;
  onDragEnd: (dx: number, dy: number) => void;
  onDragMove: (dx: number, dy: number) => void;
  onDragStart: () => void;
};

function DraggableHabitCard({
  children,
  disabled,
  dragging,
  enabled,
  onDragCancel,
  onDragEnd,
  onDragMove,
  onDragStart,
}: DraggableHabitCardProps) {
  const pan = useRef(new Animated.ValueXY()).current;
  const lift = useRef(new Animated.Value(0)).current;
  const dragStartedRef = useRef(false);
  const dragHoldReadyRef = useRef(false);
  const [holdReady, setHoldReady] = useState(false);
  const dragHoldTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const clearDragHoldTimer = useCallback(() => {
    if (dragHoldTimerRef.current) {
      clearTimeout(dragHoldTimerRef.current);
      dragHoldTimerRef.current = null;
    }
  }, []);
  const resetDragHold = useCallback(() => {
    clearDragHoldTimer();
    dragHoldReadyRef.current = false;
    setHoldReady(false);
    Animated.spring(lift, {
      toValue: 0,
      friction: 7,
      tension: 110,
      useNativeDriver: true,
    }).start();
  }, [clearDragHoldTimer, lift]);
  const resetPan = useCallback(() => {
    Animated.spring(pan, {
      toValue: { x: 0, y: 0 },
      friction: 7,
      tension: 90,
      useNativeDriver: true,
    }).start();
  }, [pan]);

  useEffect(() => resetDragHold, [resetDragHold]);

  const panResponder = useMemo(
    () =>
      PanResponder.create({
        onStartShouldSetPanResponderCapture: () => {
          resetDragHold();

          if (enabled && !disabled) {
            dragHoldTimerRef.current = setTimeout(() => {
              dragHoldReadyRef.current = true;
              setHoldReady(true);
              Animated.spring(lift, {
                toValue: 1,
                friction: 7,
                tension: 120,
                useNativeDriver: true,
              }).start();
            }, LAYOUT_DRAG_HOLD_DELAY_MS);
          }

          return false;
        },
        onMoveShouldSetPanResponder: (_, gestureState) =>
          enabled &&
          !disabled &&
          dragHoldReadyRef.current &&
          Math.abs(gestureState.dx) + Math.abs(gestureState.dy) > 8,
        onPanResponderGrant: () => {
          dragStartedRef.current = true;
          clearDragHoldTimer();
          pan.stopAnimation();
          pan.setValue({ x: 0, y: 0 });
          onDragStart();
        },
        onPanResponderMove: (_, gestureState) => {
          pan.setValue({ x: gestureState.dx, y: gestureState.dy });
          onDragMove(gestureState.dx, gestureState.dy);
        },
        onPanResponderRelease: (_, gestureState) => {
          dragStartedRef.current = false;
          resetDragHold();
          onDragEnd(gestureState.dx, gestureState.dy);
          resetPan();
        },
        onPanResponderTerminate: () => {
          dragStartedRef.current = false;
          resetDragHold();
          onDragCancel();
          resetPan();
        },
        onPanResponderTerminationRequest: () => !dragStartedRef.current,
      }),
    [
      clearDragHoldTimer,
      disabled,
      enabled,
      lift,
      onDragCancel,
      onDragEnd,
      onDragMove,
      onDragStart,
      pan,
      resetDragHold,
      resetPan,
    ]
  );
  const scale = lift.interpolate({
    inputRange: [0, 1],
    outputRange: [1, 1.07],
  });

  return (
    <Animated.View
      {...panResponder.panHandlers}
      onTouchCancel={resetDragHold}
      onTouchEnd={resetDragHold}
      style={[
        enabled && styles.draggableHabitCard,
        dragging && styles.draggingHabitCard,
        holdReady && styles.dragHoldReadyHabitCard,
        {
          transform: [
            { translateX: pan.x },
            { translateY: pan.y },
            { scale },
          ],
        },
      ]}>
      {children}
    </Animated.View>
  );
}

type TodayHabitCardProps = {
  habit: Habit;
  variant: HabitCardVariant;
  completed: boolean;
  skipped: boolean;
  cardStyle: ViewStyle;
  skipReason?: string | null;
  progress?: HabitProgress;
  crownMilestone: HabitCrownMilestone;
  historyItems: HabitHistoryItem[];
  disabled: boolean;
  editMode: boolean;
  selectedForLayout: boolean;
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
  variant,
  completed,
  skipped,
  cardStyle,
  skipReason,
  progress,
  crownMilestone,
  historyItems,
  disabled,
  editMode,
  selectedForLayout,
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
  const statusLabel = completed ? 'Completed' : skipped ? 'Skipped' : 'Remaining';
  const progressPercent = Math.max(0, Math.min(progress?.percent ?? (completed ? 1 : 0), 1));
  const visibleHistoryItems = variant === 'small' ? historyItems.slice(-5) : historyItems;
  const isProgressHabit = habit.trackingType === 'subtasks' || habit.trackingType === 'numeric';

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

  function renderIcon(size = 46) {
    return (
      <View style={styles.habitIconWrap}>
        <HabitIcon
          color={accentColor}
          fallbackIcon={habit.icon}
          iconLibrary={habit.iconLibrary}
          iconType={habit.iconType}
          iconValue={habit.iconValue}
          size={size}
        />
        <View style={styles.crownOverlay}>
          <HabitCrownBadge compact milestone={crownMilestone} />
        </View>
      </View>
    );
  }

  function renderTitleBlock(options: { centered?: boolean; lines?: number } = {}) {
    return (
      <View style={[styles.habitCardText, options.centered && styles.centeredHabitCardText]}>
        <Text numberOfLines={options.lines ?? 1} style={styles.habitCardName}>
          {habit.name}
        </Text>
        <View style={styles.streakLine}>
          <View style={styles.streakDot} />
          <Text numberOfLines={1} style={styles.habitCardHint}>
            {getStreakLineText(crownMilestone.streakDays)}
          </Text>
        </View>
      </View>
    );
  }

  function renderCheckControl(extraStyle?: ViewStyle) {
    return (
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
          extraStyle,
          completed && styles.completedCardCheck,
          (disabled || toggleDisabled) && styles.controlDisabled,
        ]}>
        {completed ? <Ionicons name="checkmark" size={18} color={colors.background} /> : null}
      </Pressable>
    );
  }

  function renderProgressControl(size: 'compact' | 'large' = 'compact') {
    return (
      <ProgressRingButton
        accessibilityLabel={`Update progress for ${habit.name}`}
        color={skipped ? colors.warning : accentColor}
        disabled={disabled || progressDisabled}
        onPress={handleEditProgress}
        percent={progressPercent}
        size={size}
      />
    );
  }

  function renderHistory(style?: ViewStyle, count = getHistoryMarkerCount(variant)) {
    return (
      <View style={style}>
        <HabitHistoryMiniRow accentColor={accentColor} items={visibleHistoryItems.slice(-count)} />
      </View>
    );
  }

  function renderSkipAction() {
    const isUndo = skipped && !completed;
    const actionDisabled = disabled || skipDisabled || completed;

    return (
      <Pressable
        accessibilityLabel={
          isUndo
            ? `Undo skip for ${habit.name}`
            : completed
              ? `Skip unavailable for completed ${habit.name}`
              : `Skip ${habit.name}`
        }
        accessibilityRole="button"
        disabled={actionDisabled}
        onPress={isUndo ? handleUndoSkip : handleSkip}
        style={[styles.cardActionButton, actionDisabled && styles.controlDisabled]}>
        <Text style={styles.cardActionText}>{isUndo ? 'Undo' : 'Skip'}</Text>
      </Pressable>
    );
  }

  function renderSkipReason(lines = 1) {
    if (!skipped || !skipReason) {
      return null;
    }

    return (
      <Text numberOfLines={lines} style={styles.skipReasonText}>
        {skipReason}
      </Text>
    );
  }

  function renderCheckboxSmallCard() {
    return (
      <>
        <View style={styles.cardTopRow}>
          {renderIcon(44)}
          {renderCheckControl()}
        </View>
        {renderTitleBlock()}
        <View style={styles.cardSpacer} />
        {renderHistory(styles.cardHistory)}
        {renderSkipReason()}
      </>
    );
  }

  function renderNumericSmallCard() {
    return renderProgressSmallCard();
  }

  function renderSubtaskSmallCard() {
    return renderProgressSmallCard();
  }

  function renderProgressSmallCard() {
    return (
      <>
        <View style={styles.cardTopRow}>
          {renderIcon(44)}
          {renderProgressControl('compact')}
        </View>
        {renderTitleBlock()}
        {progress ? (
          <Text numberOfLines={1} style={styles.compactProgressText}>
            {progress.label}
          </Text>
        ) : null}
        <View style={styles.cardSpacer} />
        {renderHistory(styles.cardHistory)}
        {renderSkipReason()}
      </>
    );
  }

  function renderCheckboxTallCard() {
    return (
      <>
        <View style={styles.cardTopRow}>
          {renderIcon(46)}
          {renderCheckControl()}
        </View>
        {renderTitleBlock({ lines: 2 })}
        <View style={styles.tallCardCenter}>
          <View style={[styles.checkboxFocusMark, completed && styles.completedCheckboxFocusMark]}>
            {completed ? (
              <Ionicons name="checkmark" size={30} color={colors.background} />
            ) : (
              <Ionicons name="ellipse-outline" size={34} color={colors.textSubtle} />
            )}
          </View>
        </View>
        {renderHistory(styles.cardHistory)}
        {renderSkipReason(2)}
      </>
    );
  }

  function renderNumericTallCard() {
    return renderProgressTallCard();
  }

  function renderSubtaskTallCard() {
    return renderProgressTallCard();
  }

  function renderProgressTallCard() {
    return (
      <>
        <View style={styles.cardTopRow}>
          {renderIcon(46)}
        </View>
        {renderTitleBlock({ lines: 2 })}
        <View style={styles.tallCardCenter}>{renderProgressControl('large')}</View>
        {progress ? (
          <Text numberOfLines={1} style={styles.centeredProgressLabel}>
            {progress.label}
          </Text>
        ) : null}
        {renderHistory(styles.cardHistory)}
        {renderSkipReason(2)}
      </>
    );
  }

  function renderCheckboxWideCard() {
    return (
      <>
        <View style={styles.wideCardRow}>
          <View style={styles.wideCardCopy}>
            {renderIcon(44)}
            {renderTitleBlock({ lines: 1 })}
          </View>
          <View style={styles.wideCardControl}>{renderCheckControl(styles.largeCheckControl)}</View>
        </View>
        {renderHistory(styles.wideHistory)}
        {renderSkipReason()}
      </>
    );
  }

  function renderNumericWideCard() {
    return renderProgressWideCard();
  }

  function renderSubtaskWideCard() {
    return renderProgressWideCard();
  }

  function renderProgressWideCard() {
    return (
      <>
        <View style={styles.wideCardRow}>
          <View style={styles.wideCardCopy}>
            {renderIcon(44)}
            {renderTitleBlock({ lines: 1 })}
            {progress ? (
              <Text numberOfLines={1} style={styles.compactProgressText}>
                {progress.label}
              </Text>
            ) : null}
          </View>
          <View style={styles.wideCardControl}>{renderProgressControl('large')}</View>
        </View>
        {renderHistory(styles.wideHistory)}
        {renderSkipReason()}
      </>
    );
  }

  function renderCheckboxLargeCard() {
    return (
      <>
        <View style={styles.cardTopRow}>
          {renderIcon(52)}
          {renderCheckControl()}
        </View>
        {renderTitleBlock({ lines: 2 })}
        <View style={styles.largeCardCenter}>
          <View
            style={[
              styles.checkboxFocusMark,
              styles.largeCheckboxFocusMark,
              completed && styles.completedCheckboxFocusMark,
            ]}>
            {completed ? (
              <Ionicons name="checkmark" size={42} color={colors.background} />
            ) : (
              <Ionicons name="ellipse-outline" size={46} color={colors.textSubtle} />
            )}
          </View>
        </View>
        {renderHistory(styles.cardHistory)}
        {renderSkipReason(2)}
      </>
    );
  }

  function renderNumericLargeCard() {
    return renderProgressLargeCard();
  }

  function renderSubtaskLargeCard() {
    return renderProgressLargeCard();
  }

  function renderProgressLargeCard() {
    return (
      <>
        <View style={styles.cardTopRow}>
          {renderIcon(52)}
        </View>
        {renderTitleBlock({ lines: 2 })}
        <View style={styles.largeCardCenter}>{renderProgressControl('large')}</View>
        {progress ? (
          <View style={styles.largeProgressBlock}>
            <Text numberOfLines={1} style={styles.centeredProgressLabel}>
              {progress.label}
            </Text>
            <AnimatedProgressBar color={accentColor} height={8} percent={progressPercent} />
          </View>
        ) : null}
        {renderHistory(styles.cardHistory)}
        {renderSkipReason(2)}
      </>
    );
  }

  function renderCardLayout() {
    if (habit.trackingType === 'checkbox' || !isProgressHabit) {
      if (variant === 'tall') {
        return renderCheckboxTallCard();
      }

      if (variant === 'wide') {
        return renderCheckboxWideCard();
      }

      if (variant === 'large') {
        return renderCheckboxLargeCard();
      }

      return renderCheckboxSmallCard();
    }

    if (habit.trackingType === 'numeric') {
      if (variant === 'tall') {
        return renderNumericTallCard();
      }

      if (variant === 'wide') {
        return renderNumericWideCard();
      }

      if (variant === 'large') {
        return renderNumericLargeCard();
      }

      return renderNumericSmallCard();
    }

    if (variant === 'tall') {
      return renderSubtaskTallCard();
    }

    if (variant === 'wide') {
      return renderSubtaskWideCard();
    }

    if (variant === 'large') {
      return renderSubtaskLargeCard();
    }

    return renderSubtaskSmallCard();
  }

  return (
    <Pressable
      accessibilityLabel={`Open ${habit.name}. ${statusLabel} for ${completionDateLabel}.`}
      accessibilityRole="button"
      disabled={disabled}
      onPress={() => onPress(habit.id)}
      style={({ pressed }) => [
        styles.habitCard,
        variant === 'small' && styles.smallHabitCard,
        variant === 'tall' && styles.tallHabitCard,
        variant === 'wide' && styles.wideHabitCard,
        variant === 'large' && styles.largeHabitCard,
        cardStyle,
        completed && styles.completedHabitCard,
        skipped && styles.skippedHabitCard,
        editMode && styles.layoutEditableHabitCard,
        selectedForLayout && styles.selectedLayoutHabitCard,
        pressed && styles.pressed,
        disabled && styles.disabledCard,
      ]}>
      {editMode ? (
        <View style={styles.layoutSizeBadge}>
          <Text style={styles.layoutSizeBadgeText}>{getLayoutSizeBadgeLabel(habit)}</Text>
        </View>
      ) : null}

      {renderCardLayout()}
      {renderSkipAction()}
    </Pressable>
  );
}

function ProgressRingButton({
  accessibilityLabel,
  color,
  disabled,
  onPress,
  percent,
  size,
}: {
  accessibilityLabel: string;
  color: string;
  disabled: boolean;
  onPress: (event: GestureResponderEvent) => void;
  percent: number;
  size: 'compact' | 'large';
}) {
  const diameter = size === 'large' ? 96 : 42;
  const strokeWidth = size === 'large' ? 7 : 4;
  const radiusValue = (diameter - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radiusValue;
  const clampedPercent = Math.max(0, Math.min(percent, 1));
  const dashOffset = circumference * (1 - clampedPercent);
  const complete = clampedPercent >= 1;

  return (
    <Pressable
      accessibilityLabel={accessibilityLabel}
      accessibilityRole="button"
      disabled={disabled}
      onPress={onPress}
      style={[
        styles.progressRingButton,
        size === 'large' ? styles.largeProgressRingButton : styles.compactProgressRingButton,
        disabled && styles.controlDisabled,
      ]}>
      <Svg height={diameter} style={styles.progressRingSvg} width={diameter}>
        <Circle
          cx={diameter / 2}
          cy={diameter / 2}
          fill="transparent"
          r={radiusValue}
          stroke={colors.surfaceMuted}
          strokeWidth={strokeWidth}
        />
        <Circle
          cx={diameter / 2}
          cy={diameter / 2}
          fill="transparent"
          r={radiusValue}
          stroke={color}
          strokeDasharray={`${circumference} ${circumference}`}
          strokeDashoffset={dashOffset}
          strokeLinecap="round"
          strokeWidth={strokeWidth}
          transform={`rotate(-90 ${diameter / 2} ${diameter / 2})`}
        />
      </Svg>
      {complete ? (
        <Ionicons name="checkmark" size={size === 'large' ? 32 : 18} color={colors.text} />
      ) : (
        <Text
          numberOfLines={1}
          adjustsFontSizeToFit
          style={size === 'large' ? styles.largeProgressCircleText : styles.progressCircleText}>
          {Math.round(clampedPercent * 100)}%
        </Text>
      )}
    </Pressable>
  );
}

function getStreakLineText(streakDays: number) {
  if (streakDays <= 0) {
    return 'No streak yet';
  }

  return `${streakDays} day streak`;
}

function getHistoryMarkerCount(variant: HabitCardVariant) {
  return variant === 'wide' || variant === 'large' ? 7 : 5;
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

async function getCrownMilestonesByHabitId(habits: Habit[], today: string) {
  const crownEntries = await Promise.all(
    habits.map(async (habit): Promise<[string, HabitCrownMilestone]> => {
      const [completions, skips] = await Promise.all([
        getCompletionsForHabit(habit.id),
        getSkipsForHabit(habit.id),
      ]);
      const currentStreak = calculateScheduleAwareCurrentStreak(
        habit,
        completions.map((completion) => completion.date),
        today,
        skips.map((skip) => skip.date)
      );

      return [habit.id, getHabitCrownMilestone(currentStreak)];
    })
  );

  return Object.fromEntries(crownEntries);
}

async function getRecentHistoryByHabitId(habits: Habit[], endDate: string) {
  const historyEntries = await Promise.all(
    habits.map(async (habit): Promise<[string, HabitHistoryItem[]]> => {
      const [completions, skips] = await Promise.all([
        getCompletionsForHabit(habit.id),
        getSkipsForHabit(habit.id),
      ]);

      return [
        habit.id,
        getRecentHabitHistoryItems({
          completions,
          count: 7,
          endDate,
          habit,
          skips,
        }),
      ];
    })
  );

  return Object.fromEntries(historyEntries);
}

function getHistoryEndDate(selectedDate: string, today: string) {
  return selectedDate > today ? today : selectedDate;
}

function buildTodayGridItems(habits: Habit[]): TodayGridItem[] {
  return habits.map((habit) => ({
    habit,
    variant: getHabitCardVariant(habit),
  }));
}

function buildTodayGridLayout(items: TodayGridItem[]): TodayGridLayout {
  const placedLayout = placeTodayGridItems(items);
  const finalRowOccupancy = getRowOccupancy(placedLayout.placements, placedLayout.rowCount - 1);
  const lonelyFinalSmall = placedLayout.placements.find(
    (placement) =>
      placement.row === placedLayout.rowCount - 1 &&
      placement.item.variant === 'small' &&
      finalRowOccupancy === 1
  );

  if (!lonelyFinalSmall) {
    return placedLayout;
  }

  return placeTodayGridItems(
    items.map((item) =>
      item.habit.id === lonelyFinalSmall.item.habit.id ? { ...item, variant: 'wide' } : item
    )
  );
}

function placeTodayGridItems(items: TodayGridItem[]): TodayGridLayout {
  const occupiedCells = new Set<string>();
  const placements: TodayGridPlacement[] = [];
  let rowCount = 0;

  for (const item of items) {
    const { colSpan, rowSpan } = getGridSpan(item.variant);
    const placement = findNextGridPlacement(occupiedCells, colSpan, rowSpan);

    occupyGridCells(occupiedCells, placement.column, placement.row, colSpan, rowSpan);
    placements.push({
      item,
      colSpan,
      rowSpan,
      ...placement,
    });
    rowCount = Math.max(rowCount, placement.row + rowSpan);
  }

  return { placements, rowCount };
}

function findNextGridPlacement(
  occupiedCells: Set<string>,
  colSpan: 1 | 2,
  rowSpan: 1 | 2
): { column: 0 | 1; row: number } {
  for (let row = 0; ; row += 1) {
    const maxColumn = colSpan === 2 ? 0 : 1;

    for (let column = 0; column <= maxColumn; column += 1) {
      if (canPlaceGridItem(occupiedCells, column as 0 | 1, row, colSpan, rowSpan)) {
        return { column: column as 0 | 1, row };
      }
    }
  }
}

function canPlaceGridItem(
  occupiedCells: Set<string>,
  column: 0 | 1,
  row: number,
  colSpan: 1 | 2,
  rowSpan: 1 | 2
) {
  if (column + colSpan > 2) {
    return false;
  }

  for (let rowOffset = 0; rowOffset < rowSpan; rowOffset += 1) {
    for (let columnOffset = 0; columnOffset < colSpan; columnOffset += 1) {
      if (occupiedCells.has(getGridCellKey(column + columnOffset, row + rowOffset))) {
        return false;
      }
    }
  }

  return true;
}

function occupyGridCells(
  occupiedCells: Set<string>,
  column: 0 | 1,
  row: number,
  colSpan: 1 | 2,
  rowSpan: 1 | 2
) {
  for (let rowOffset = 0; rowOffset < rowSpan; rowOffset += 1) {
    for (let columnOffset = 0; columnOffset < colSpan; columnOffset += 1) {
      occupiedCells.add(getGridCellKey(column + columnOffset, row + rowOffset));
    }
  }
}

function getGridCellKey(column: number, row: number) {
  return `${column}:${row}`;
}

function getGridSpan(variant: HabitCardVariant): { colSpan: 1 | 2; rowSpan: 1 | 2 } {
  if (variant === 'tall') {
    return { colSpan: 1, rowSpan: 2 };
  }

  if (variant === 'wide') {
    return { colSpan: 2, rowSpan: 1 };
  }

  if (variant === 'large') {
    return { colSpan: 2, rowSpan: 2 };
  }

  return { colSpan: 1, rowSpan: 1 };
}

function getRowOccupancy(placements: TodayGridPlacement[], row: number) {
  return placements.reduce((count, placement) => {
    const placementEndsAfterRow = placement.row + placement.rowSpan > row;

    if (placement.row <= row && placementEndsAfterRow) {
      return count + placement.colSpan;
    }

    return count;
  }, 0);
}

function getTodayGridHeight(rowCount: number, metrics: TodayGridMetrics) {
  if (rowCount <= 0) {
    return 0;
  }

  return rowCount * metrics.cellSize + (rowCount - 1) * metrics.gap;
}

function getLayoutDragDropTarget(
  habitId: string,
  dx: number,
  dy: number,
  layout: TodayGridLayout,
  metrics: TodayGridMetrics,
  orderedHabits: Habit[]
): { targetHabitId: string; dropIndex: number } | null {
  const sourceIndex = orderedHabits.findIndex((habit) => habit.id === habitId);
  const draggedPlacement = layout.placements.find((placement) => placement.item.habit.id === habitId);

  if (sourceIndex === -1 || !draggedPlacement || layout.placements.length < 2) {
    return null;
  }

  const candidatePlacements = layout.placements.filter(
    (placement) => placement.item.habit.id !== habitId
  );
  const anchorPoint = getMovedGridPlacementLeadingAnchor(draggedPlacement, metrics, dx, dy);
  const targetPlacement = getGridPlacementAtPoint(anchorPoint, candidatePlacements, metrics);

  if (!targetPlacement) {
    return null;
  }

  const targetIndex = orderedHabits.findIndex(
    (habit) => habit.id === targetPlacement.item.habit.id
  );

  if (targetIndex === -1 || targetIndex === sourceIndex) {
    return null;
  }

  return {
    targetHabitId: targetPlacement.item.habit.id,
    dropIndex: targetIndex,
  };
}

function getGridPlacementAtPoint(
  point: { x: number; y: number },
  placements: TodayGridPlacement[],
  metrics: TodayGridMetrics
) {
  return placements.find((placement) => {
    const bounds = getGridPlacementBounds(placement, metrics);

    return (
      point.x >= bounds.left &&
      point.x <= bounds.right &&
      point.y >= bounds.top &&
      point.y <= bounds.bottom
    );
  });
}

function getGridPlacementBounds(
  placement: TodayGridPlacement,
  metrics: TodayGridMetrics
): { bottom: number; left: number; right: number; top: number } {
  const left = placement.column * (metrics.cellSize + metrics.gap);
  const top = placement.row * (metrics.cellSize + metrics.gap);
  const width = placement.colSpan === 2 ? metrics.fullWidth : metrics.cellSize;
  const height =
    placement.rowSpan === 2 ? metrics.cellSize * 2 + metrics.gap : metrics.cellSize;

  return {
    bottom: top + height,
    left,
    right: left + width,
    top,
  };
}

function getMovedGridPlacementLeadingAnchor(
  placement: TodayGridPlacement,
  metrics: TodayGridMetrics,
  dx: number,
  dy: number
) {
  const left = placement.column * (metrics.cellSize + metrics.gap);
  const top = placement.row * (metrics.cellSize + metrics.gap);

  return {
    x: left + metrics.cellSize / 2 + dx,
    y: top + dy,
  };
}

function reorderHabitList(habits: Habit[], sourceIndex: number, dropIndex: number) {
  const reorderedHabits = [...habits];
  const [movedHabit] = reorderedHabits.splice(sourceIndex, 1);

  reorderedHabits.splice(dropIndex, 0, movedHabit);

  return reorderedHabits;
}

function getHabitCardVariant(habit: Habit): HabitCardVariant {
  if (habit.todayLayoutSize !== 'auto') {
    return habit.todayLayoutSize;
  }

  if (habit.trackingType === 'numeric') {
    return 'tall';
  }

  return 'small';
}

function getHabitCardGeometryStyle(
  variant: HabitCardVariant,
  metrics: TodayGridMetrics
): ViewStyle {
  if (variant === 'tall') {
    return {
      width: metrics.cellSize,
      height: metrics.cellSize * 2 + metrics.gap,
    };
  }

  if (variant === 'wide') {
    return {
      width: metrics.fullWidth,
      height: metrics.cellSize,
    };
  }

  if (variant === 'large') {
    return {
      width: metrics.fullWidth,
      height: metrics.cellSize * 2 + metrics.gap,
    };
  }

  return {
    width: metrics.cellSize,
    height: metrics.cellSize,
  };
}

function getLayoutSortedHabits(habits: Habit[]) {
  const hasCustomOrder = habits.some((habit) => habit.todayLayoutOrder !== 0);

  if (!hasCustomOrder) {
    return habits;
  }

  const zeroOrderHabitIds = habits
    .filter((habit) => habit.todayLayoutOrder === 0)
    .map((habit) => habit.id);
  const firstZeroOrderHabitId = zeroOrderHabitIds[0] ?? null;
  const getSortableOrder = (habit: Habit) => {
    if (habit.todayLayoutOrder !== 0) {
      return habit.todayLayoutOrder;
    }

    return zeroOrderHabitIds.length <= 1 || habit.id === firstZeroOrderHabitId
      ? 0
      : Number.MAX_SAFE_INTEGER;
  };

  return habits
    .map((habit, index) => ({ habit, index }))
    .sort((first, second) => {
      const firstOrder = getSortableOrder(first.habit);
      const secondOrder = getSortableOrder(second.habit);
      const orderDifference = firstOrder - secondOrder;

      if (orderDifference !== 0) {
        return orderDifference;
      }

      return first.index - second.index;
    })
    .map((item) => item.habit);
}

function getLayoutSizeBadgeLabel(habit: Habit) {
  const size = habit.todayLayoutSize === 'auto' ? getHabitCardVariant(habit) : habit.todayLayoutSize;

  if (habit.todayLayoutSize === 'auto') {
    return 'Auto';
  }

  if (size === 'tall') {
    return '1x2';
  }

  if (size === 'wide') {
    return '2x1';
  }

  if (size === 'large') {
    return '2x2';
  }

  return '1x1';
}

function formatProgressNumber(value: number) {
  return Number.isInteger(value) ? String(value) : value.toFixed(1);
}

function normalizeNumericDraft(value: string) {
  const parsedValue = Number(value.replace(',', '.'));

  return Number.isFinite(parsedValue) ? formatProgressNumber(Math.max(0, parsedValue)) : '0';
}

function getSelectedDayLabel(selectedDate: string, todayDate: string) {
  if (selectedDate === todayDate) {
    return 'TODAY';
  }

  return format(parseISO(selectedDate), 'EEEE').toUpperCase();
}

function getBuildDayHelperLine(
  completionPercent: number,
  remainingCount: number,
  scheduledCount: number,
  selectedDate: string,
  todayDate: string
) {
  if (selectedDate > todayDate) {
    return 'Coming up!';
  }

  if (scheduledCount === 0) {
    return 'This day is clear.';
  }

  if (selectedDate < todayDate) {
    return completionPercent >= 100 ? 'Crushed it!' : "One miss doesn't stop you!";
  }

  if (completionPercent >= 100) {
    return 'All done today - great work!';
  }

  if (completionPercent > 0) {
    return `${remainingCount} habit${remainingCount === 1 ? '' : 's'} remaining - keep going!`;
  }

  return 'Start with one small step.';
}

const styles = StyleSheet.create({
  screenContent: {
    gap: spacing.lg,
    paddingBottom: 112,
  },
  buildDayCard: {
    gap: spacing.sm,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.lg,
    backgroundColor: colors.surface,
  },
  buildDayHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.md,
  },
  buildDayCopy: {
    flex: 1,
    gap: 2,
  },
  buildDayEyebrow: {
    color: colors.primary,
    ...typography.small,
    fontWeight: '900',
    textTransform: 'uppercase',
  },
  buildDayTitle: {
    color: colors.text,
    fontSize: 24,
    lineHeight: 28,
    fontWeight: '900',
  },
  buildDayDate: {
    color: colors.textMuted,
    ...typography.caption,
  },
  buildDayPercent: {
    minWidth: 86,
    alignItems: 'flex-end',
    justifyContent: 'center',
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
    textAlign: 'right',
  },
  buildDayMotivation: {
    color: colors.textMuted,
    ...typography.small,
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
  sectionHeaderActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  layoutEditButton: {
    minHeight: 32,
    justifyContent: 'center',
    paddingHorizontal: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.pill,
    backgroundColor: colors.surfaceElevated,
  },
  activeLayoutEditButton: {
    borderColor: colors.primary,
    backgroundColor: colors.primary,
  },
  layoutEditButtonText: {
    color: colors.textMuted,
    ...typography.small,
    fontWeight: '900',
  },
  activeLayoutEditButtonText: {
    color: colors.background,
  },
  layoutEditBanner: {
    gap: spacing.xs,
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: colors.primary,
    borderRadius: radius.lg,
    backgroundColor: colors.primaryMuted,
  },
  layoutEditTitle: {
    color: colors.primary,
    ...typography.caption,
    fontWeight: '900',
    textTransform: 'uppercase',
  },
  layoutEditText: {
    color: colors.text,
    ...typography.caption,
    fontWeight: '700',
  },
  habitList: {
    gap: spacing.md,
  },
  habitGrid: {
    position: 'relative',
    alignSelf: 'center',
  },
  gridPlacedItem: {
    position: 'absolute',
  },
  draggingGridItem: {
    zIndex: 3,
    elevation: 8,
  },
  draggableHabitCard: {
    zIndex: 1,
  },
  draggingHabitCard: {
    opacity: 0.92,
  },
  dragHoldReadyHabitCard: {
    zIndex: 4,
    elevation: 10,
  },
  layoutDropPreview: {
    position: 'absolute',
    left: 0,
    top: 0,
    zIndex: 2,
    opacity: 0,
    borderWidth: 2,
    borderColor: colors.primary,
    borderRadius: radius.lg,
    backgroundColor: 'rgba(182, 255, 59, 0.1)',
  },
  habitCard: {
    position: 'relative',
    gap: spacing.sm,
    overflow: 'hidden',
    padding: spacing.md,
    paddingBottom: 44,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.lg,
    backgroundColor: colors.surface,
  },
  smallHabitCard: {},
  tallHabitCard: {},
  wideHabitCard: {},
  largeHabitCard: {},
  completedHabitCard: {
    borderColor: colors.border,
    backgroundColor: colors.surfaceElevated,
  },
  skippedHabitCard: {
    borderColor: colors.border,
  },
  disabledCard: {
    opacity: 0.52,
  },
  layoutEditableHabitCard: {
    borderStyle: 'dashed',
  },
  selectedLayoutHabitCard: {
    borderColor: colors.primary,
  },
  layoutSizeBadge: {
    position: 'absolute',
    left: spacing.sm,
    bottom: spacing.sm,
    zIndex: 2,
    paddingHorizontal: spacing.sm,
    paddingVertical: 3,
    borderRadius: radius.pill,
    backgroundColor: colors.primary,
  },
  layoutSizeBadgeText: {
    color: colors.background,
    ...typography.small,
    fontWeight: '900',
  },
  cardTopRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: spacing.sm,
  },
  cardSpacer: {
    flex: 1,
  },
  cardHistory: {
    position: 'absolute',
    left: spacing.md,
    bottom: spacing.md,
    maxWidth: '68%',
  },
  habitIconWrap: {
    position: 'relative',
    alignSelf: 'flex-start',
  },
  crownOverlay: {
    position: 'absolute',
    right: -8,
    bottom: -8,
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
  progressRingButton: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surfaceElevated,
  },
  compactProgressRingButton: {
    width: 42,
    height: 42,
    borderRadius: 21,
  },
  progressCircleText: {
    position: 'absolute',
    color: colors.text,
    fontSize: 10,
    lineHeight: 13,
    fontWeight: '900',
  },
  progressRingSvg: {
    position: 'absolute',
    left: 0,
    top: 0,
  },
  largeProgressRingButton: {
    width: 96,
    height: 96,
    borderRadius: 48,
  },
  largeProgressCircleText: {
    position: 'absolute',
    color: colors.text,
    fontSize: 23,
    lineHeight: 27,
    fontWeight: '900',
  },
  largeCheckControl: {
    width: 58,
    height: 58,
    borderRadius: 29,
  },
  checkboxFocusMark: {
    width: 76,
    height: 76,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: colors.surfaceMuted,
    borderRadius: 38,
    backgroundColor: colors.surfaceElevated,
  },
  largeCheckboxFocusMark: {
    width: 110,
    height: 110,
    borderRadius: 55,
  },
  completedCheckboxFocusMark: {
    borderColor: colors.primary,
    backgroundColor: colors.primary,
  },
  habitCardText: {
    gap: spacing.xs,
  },
  centeredHabitCardText: {
    alignItems: 'center',
  },
  habitCardName: {
    color: colors.text,
    ...typography.caption,
    fontWeight: '900',
  },
  habitCardHint: {
    color: colors.textMuted,
    ...typography.small,
    fontWeight: '700',
  },
  streakLine: {
    minHeight: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  streakDot: {
    width: 5,
    height: 5,
    borderRadius: 3,
    backgroundColor: colors.warning,
  },
  compactProgressText: {
    color: colors.textMuted,
    ...typography.small,
    fontWeight: '800',
  },
  tallCardCenter: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 92,
  },
  centeredProgressLabel: {
    color: colors.textMuted,
    ...typography.caption,
    fontWeight: '900',
    textAlign: 'center',
  },
  wideCardRow: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingBottom: 12,
  },
  wideCardCopy: {
    flex: 1,
    alignSelf: 'stretch',
    gap: spacing.xs,
    justifyContent: 'space-between',
  },
  wideCardControl: {
    width: 108,
    alignItems: 'center',
    justifyContent: 'center',
  },
  wideHistory: {
    position: 'absolute',
    left: spacing.md,
    bottom: spacing.md,
    maxWidth: 150,
  },
  largeCardCenter: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
  },
  largeProgressBlock: {
    gap: spacing.sm,
  },
  cardActionButton: {
    position: 'absolute',
    right: spacing.sm,
    bottom: spacing.sm,
    zIndex: 3,
    minHeight: 28,
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
    maxWidth: '68%',
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
    gap: spacing.xs,
  },
  calendarWeekRow: {
    flexDirection: 'row',
    gap: spacing.xs,
  },
  calendarDay: {
    flex: 1,
    aspectRatio: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 0,
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
    fontSize: 13,
    lineHeight: 16,
    fontWeight: '900',
    textAlign: 'center',
    includeFontPadding: false,
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
  layoutSizeGrid: {
    gap: spacing.sm,
  },
  layoutSizeOption: {
    minHeight: 58,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.md,
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.lg,
    backgroundColor: colors.surfaceElevated,
  },
  selectedLayoutSizeOption: {
    borderColor: colors.primary,
    backgroundColor: colors.primaryMuted,
  },
  layoutSizeOptionLabel: {
    color: colors.text,
    ...typography.caption,
    fontWeight: '900',
  },
  layoutSizeOptionMeta: {
    color: colors.textMuted,
    ...typography.small,
    fontWeight: '900',
  },
  selectedLayoutSizeText: {
    color: colors.primary,
  },
});
