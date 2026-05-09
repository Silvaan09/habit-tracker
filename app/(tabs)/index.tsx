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
  Keyboard,
  Modal,
  NativeScrollEvent,
  NativeSyntheticEvent,
  PanResponder,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  useWindowDimensions,
  View,
  type ViewStyle,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Circle } from 'react-native-svg';

import { ChevronLeft, ChevronRight } from 'lucide-react-native';
import { EmptyState } from '@/src/components/EmptyState';
import { BottomSheetModal } from '@/src/components/BottomSheetModal';
import { HabitCrownBadge } from '@/src/components/HabitCrownBadge';
import { HabitHistoryMiniRow } from '@/src/components/HabitHistoryMiniRow';
import { HabitIcon } from '@/src/components/HabitIcon';
import { LucideCrown } from '@/src/components/lucideHabitIcons';
import { PrimaryButton } from '@/src/components/PrimaryButton';
import { Screen } from '@/src/components/Screen';
import { UnsavedChangesModal } from '@/src/components/UnsavedChangesModal';
import {
  completeHabitForDate,
  getCompletionsForHabit,
  getCompletionsForDate,
  uncompleteHabitForDate,
} from '@/src/db/completions';
import { initDatabase } from '@/src/db/database';
import { getActiveHabits, updateHabitLayout, updateHabitLayoutOrder } from '@/src/db/habits';
import { getNumericEntryForDate, setNumericEntryForDate } from '@/src/db/numericEntries';
import { getSettingValue, setSettingValue } from '@/src/db/settings';
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
  type HabitCrownTier,
  type HabitCrownMilestone,
} from '@/src/utils/milestones';
import {
  getRecentHabitHistoryItems,
  type HabitHistoryItem,
} from '@/src/utils/recentHabitHistory';

type HabitProgress = {
  label: string;
  percent: number;
  targetValue?: number;
  subtaskPreview?: { id: string; title: string; completed: boolean }[];
  remainingSubtaskCount?: number;
  unit?: string | null;
  value?: number;
};

type HabitCardVariant = 'small' | 'tall' | 'wide' | 'large';

type CrownToastState = {
  id: string;
  title: string;
  body: string;
  tier: HabitCrownTier;
};

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
const CROWN_EARNED_SETTING_PREFIX = 'crown-earned';
const CROWN_TIER_RANK: Record<HabitCrownTier, number> = {
  none: 0,
  bronze: 1,
  silver: 2,
  gold: 3,
  diamond: 4,
};

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
  const insets = useSafeAreaInsets();
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
  const pendingToggleHabitIdsRef = useRef(new Set<string>());
  const todayScrollRef = useRef<ScrollView | null>(null);
  const todayScrollYRef = useRef(0);
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [busyHabitIds, setBusyHabitIds] = useState<Record<string, boolean>>({});
  const [skipTargetHabitId, setSkipTargetHabitId] = useState<string | null>(null);
  const [skipLimitModalVisible, setSkipLimitModalVisible] = useState(false);
  const [skipReason, setSkipReason] = useState('');
  const [skipReasonError, setSkipReasonError] = useState<string | null>(null);
  const [skipReasonHabitId, setSkipReasonHabitId] = useState<string | null>(null);
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
  const editorSubtaskCompletionsRef = useRef<HabitSubtaskCompletion[]>([]);
  const quickNumericUpdateIdsRef = useRef(new Set<string>());
  const [savingSubtaskIds, setSavingSubtaskIds] = useState<Record<string, boolean>>({});
  const [editorNumericValue, setEditorNumericValue] = useState('');
  const [editorInitialNumericValue, setEditorInitialNumericValue] = useState('');
  const [numericClosePromptVisible, setNumericClosePromptVisible] = useState(false);
  const [savingProgress, setSavingProgress] = useState(false);
  const [crownToast, setCrownToast] = useState<CrownToastState | null>(null);

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
  const skipReasonHabit = useMemo(
    () => habits.find((habit) => habit.id === skipReasonHabitId) ?? null,
    [habits, skipReasonHabitId]
  );
  const skipReasonRecord = skipReasonHabitId ? skipByHabitId.get(skipReasonHabitId) : null;
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
    if (!crownToast) {
      return;
    }

    const timeoutId = setTimeout(() => {
      setCrownToast(null);
    }, 2800);

    return () => clearTimeout(timeoutId);
  }, [crownToast]);

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

  async function refreshSelectedDateStatuses(options?: {
    crownToastHabit?: Habit;
    previousCrownMilestone?: HabitCrownMilestone;
  }) {
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
    const nextProgressByHabitId = await getProgressByHabitId(habits, selectedDate);
    const currentToday = getTodayDateString();
    const nextCrownByHabitId = await getCrownMilestonesByHabitId(habits, currentToday);
    const nextHistoryByHabitId = await getRecentHistoryByHabitId(
      habits,
      getHistoryEndDate(selectedDate, currentToday)
    );

    setProgressByHabitId(nextProgressByHabitId);
    setCrownByHabitId(nextCrownByHabitId);
    setHistoryByHabitId(nextHistoryByHabitId);

    if (options?.crownToastHabit && options.previousCrownMilestone) {
      await maybeShowNewCrownToast(
        options.crownToastHabit,
        options.previousCrownMilestone,
        nextCrownByHabitId[options.crownToastHabit.id] ?? getHabitCrownMilestone(0)
      );
    }
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

    if (pendingToggleHabitIdsRef.current.has(habitId)) {
      return;
    }

    const habit = habits.find((item) => item.id === habitId);
    const wasCompleted = completedHabitIds.has(habitId);
    const previousCrownMilestone = crownByHabitId[habitId] ?? getHabitCrownMilestone(0);
    const previousCompletions = completions;
    const previousSkips = skips;
    const previousWeeklySkips = weeklySkips;

    pendingToggleHabitIdsRef.current.add(habitId);
    setCompletions((current) =>
      syncOptimisticCompletionForHabit(current, habitId, selectedDate, !wasCompleted)
    );

    if (!wasCompleted) {
      setSkips((current) =>
        current.filter((skip) => !(skip.habitId === habitId && skip.date === selectedDate))
      );
      setWeeklySkips((current) =>
        current.filter((skip) => !(skip.habitId === habitId && skip.date === selectedDate))
      );
    }

    try {
      setErrorMessage(null);

      if (wasCompleted) {
        await uncompleteHabitForDate(habitId, selectedDate);
      } else {
        await completeHabitForDate(habitId, selectedDate);
      }

      void refreshSelectedDateStatuses(
        habit && !wasCompleted ? { crownToastHabit: habit, previousCrownMilestone } : undefined
      ).catch((error) => {
        console.error('Failed to silently refresh Today after checkbox update', error);
      });
    } catch (error) {
      console.error('Failed to toggle habit completion', error);
      setCompletions(previousCompletions);
      setSkips(previousSkips);
      setWeeklySkips(previousWeeklySkips);
      setErrorMessage('Could not update that habit. Please try again.');
    } finally {
      pendingToggleHabitIdsRef.current.delete(habitId);
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

  function openSkipReasonModal(habitId: string) {
    if (!skipByHabitId.has(habitId)) {
      return;
    }

    setSkipReasonHabitId(habitId);
  }

  function closeSkipReasonModal() {
    setSkipReasonHabitId(null);
  }

  async function undoSkipFromReasonModal() {
    if (!skipReasonHabitId) {
      return;
    }

    const habitId = skipReasonHabitId;

    setSkipReasonHabitId(null);
    await undoSkip(habitId);
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
        editorSubtaskCompletionsRef.current = subtaskCompletions;
        setEditorNumericValue('');
      }

      if (habit.trackingType === 'numeric') {
        const entry = await getNumericEntryForDate(habit.id, selectedDate);
        const nextValue = entry ? String(entry.value) : '0';

        setEditorSubtasks([]);
        setEditorSubtaskCompletions([]);
        editorSubtaskCompletionsRef.current = [];
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
    editorSubtaskCompletionsRef.current = [];
    setSavingSubtaskIds({});
    setEditorNumericValue('');
    setEditorInitialNumericValue('');
    setNumericClosePromptVisible(false);
  }

  function discardProgressEditor() {
    if (savingProgress) {
      return;
    }

    dismissProgressEditor();
  }

  function requestProgressEditorBackdropClose() {
    if (savingProgress) {
      return;
    }

    if (
      progressEditorHabit?.trackingType === 'numeric' &&
      normalizeNumericDraft(editorNumericValue) !== normalizeNumericDraft(editorInitialNumericValue)
    ) {
      setNumericClosePromptVisible(true);
      return;
    }

    dismissProgressEditor();
  }

  async function toggleEditorSubtask(subtask: HabitSubtask) {
    if (!progressEditorHabit || selectedDateIsFuture || skippedHabitIds.has(progressEditorHabit.id)) {
      return;
    }

    if (savingSubtaskIds[subtask.id]) {
      return;
    }

    const habit = progressEditorHabit;
    const previousCompletions = editorSubtaskCompletionsRef.current;
    const previousCrownMilestone = crownByHabitId[habit.id] ?? getHabitCrownMilestone(0);
    const wasChecked = previousCompletions.some((completion) => completion.subtaskId === subtask.id);
    const nextCompletions = wasChecked
      ? previousCompletions.filter((completion) => completion.subtaskId !== subtask.id)
      : [
          ...previousCompletions,
          {
            completedAt: new Date().toISOString(),
            date: selectedDate,
            habitId: habit.id,
            id: `optimistic_${subtask.id}_${Date.now()}`,
            subtaskId: subtask.id,
          },
        ];

    editorSubtaskCompletionsRef.current = nextCompletions;
    setEditorSubtaskCompletions(nextCompletions);
    setProgressByHabitId((current) => ({
      ...current,
      [habit.id]: getSubtaskProgress(editorSubtasks, nextCompletions),
    }));
    setCompletions((current) =>
      syncOptimisticCompletionForHabit(
        current,
        habit.id,
        selectedDate,
        areRequiredSubtasksComplete(editorSubtasks, nextCompletions)
      )
    );

    try {
      setSavingSubtaskIds((current) => ({ ...current, [subtask.id]: true }));
      setProgressEditorError(null);

      if (wasChecked) {
        await uncompleteSubtaskForDate(subtask.id, selectedDate);
      } else {
        await completeSubtaskForDate(subtask.id, habit.id, selectedDate);
      }

      void refreshSelectedDateStatuses({
        crownToastHabit: habit,
        previousCrownMilestone,
      }).catch((error) => {
        console.error('Failed to silently refresh Today after subtask update', error);
      });
    } catch (error) {
      console.error('Failed to update subtask from Today', error);
      editorSubtaskCompletionsRef.current = previousCompletions;
      setEditorSubtaskCompletions(previousCompletions);
      setProgressByHabitId((current) => ({
        ...current,
        [habit.id]: getSubtaskProgress(editorSubtasks, previousCompletions),
      }));
      setCompletions((current) =>
        syncOptimisticCompletionForHabit(
          current,
          habit.id,
          selectedDate,
          areRequiredSubtasksComplete(editorSubtasks, previousCompletions)
        )
      );
      setProgressEditorError('Could not update that subtask.');
    } finally {
      setSavingSubtaskIds((current) => ({ ...current, [subtask.id]: false }));
    }
  }

  async function saveEditorNumericProgress(nextValue = editorNumericValue) {
    if (!progressEditorHabit || selectedDateIsFuture || skippedHabitIds.has(progressEditorHabit.id)) {
      return;
    }

    const habit = progressEditorHabit;
    const parsedValue = Number(nextValue.replace(',', '.'));

    if (!Number.isFinite(parsedValue) || parsedValue < 0) {
      setProgressEditorError('Enter a value of 0 or more.');
      return;
    }

    const previousCrownMilestone = crownByHabitId[habit.id] ?? getHabitCrownMilestone(0);

    try {
      Keyboard.dismiss();
      setSavingProgress(true);
      setProgressEditorError(null);
      await setNumericEntryForDate(habit.id, selectedDate, parsedValue);
      setProgressByHabitId((current) => ({
        ...current,
        [habit.id]: getNumericProgress(habit, parsedValue),
      }));
      setCompletions((current) =>
        syncOptimisticCompletionForHabit(
          current,
          habit.id,
          selectedDate,
          isNumericGoalComplete(habit, parsedValue)
        )
      );
      setNumericClosePromptVisible(false);
      dismissProgressEditor();
      void refreshSelectedDateStatuses({
        crownToastHabit: habit,
        previousCrownMilestone,
      }).catch((error) => {
        console.error('Failed to silently refresh Today after numeric update', error);
      });
    } catch (error) {
      console.error('Failed to update numeric progress from Today', error);
      setProgressEditorError('Could not save progress.');
    } finally {
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

  async function adjustNumericProgressInline(habitId: string, delta: number) {
    const habit = habits.find((item) => item.id === habitId);

    if (
      !habit ||
      habit.trackingType !== 'numeric' ||
      selectedDateIsFuture ||
      skippedHabitIds.has(habitId) ||
      quickNumericUpdateIdsRef.current.has(habitId)
    ) {
      return;
    }

    quickNumericUpdateIdsRef.current.add(habitId);

    const previousProgress = progressByHabitId[habitId];
    const previousCompletions = completions;
    const previousCrownMilestone = crownByHabitId[habitId] ?? getHabitCrownMilestone(0);
    let previousValue = 0;

    try {
      previousValue =
        typeof previousProgress?.value === 'number'
          ? previousProgress.value
          : (await getNumericEntryForDate(habitId, selectedDate))?.value ?? 0;
    } catch (error) {
      console.error('Failed to read inline numeric progress', error);
      quickNumericUpdateIdsRef.current.delete(habitId);
      setErrorMessage('Could not update progress. Please try again.');
      return;
    }

    const nextValue = Math.max(0, previousValue + delta);

    if (nextValue === previousValue) {
      quickNumericUpdateIdsRef.current.delete(habitId);
      return;
    }

    setProgressByHabitId((current) => ({
      ...current,
      [habitId]: getNumericProgress(habit, nextValue),
    }));
    setCompletions((current) =>
      syncOptimisticCompletionForHabit(
        current,
        habitId,
        selectedDate,
        isNumericGoalComplete(habit, nextValue)
      )
    );

    try {
      setErrorMessage(null);
      await setNumericEntryForDate(habitId, selectedDate, nextValue);
      void refreshSelectedDateStatuses({
        crownToastHabit: habit,
        previousCrownMilestone,
      }).catch((error) => {
        console.error('Failed to silently refresh Today after inline numeric update', error);
      });
    } catch (error) {
      console.error('Failed to update inline numeric progress', error);
      setProgressByHabitId((current) => {
        const next = { ...current };

        if (previousProgress) {
          next[habitId] = previousProgress;
        } else {
          delete next[habitId];
        }

        return next;
      });
      setCompletions(previousCompletions);
      setErrorMessage('Could not update progress. Please try again.');
    } finally {
      quickNumericUpdateIdsRef.current.delete(habitId);
    }
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

  async function maybeShowNewCrownToast(
    habit: Habit,
    previousMilestone: HabitCrownMilestone,
    nextMilestone: HabitCrownMilestone
  ) {
    if (
      nextMilestone.tier === 'none' ||
      CROWN_TIER_RANK[nextMilestone.tier] <= CROWN_TIER_RANK[previousMilestone.tier]
    ) {
      return;
    }

    const settingKey = `${CROWN_EARNED_SETTING_PREFIX}:${habit.id}:${nextMilestone.tier}`;

    if ((await getSettingValue(settingKey)) === '1') {
      return;
    }

    await setSettingValue(settingKey, '1');
    setCrownToast({
      body: `${nextMilestone.label} unlocked for ${habit.name}.`,
      id: `${habit.id}:${nextMilestone.tier}:${Date.now()}`,
      tier: nextMilestone.tier,
      title: 'New crown earned',
    });
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
        onAdjustNumericProgress={adjustNumericProgressInline}
        onToggle={toggleHabit}
        onSkip={openSkipModal}
        onShowSkipReason={openSkipReasonModal}
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
    <View style={styles.root}>
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
            <ChevronLeft size={22} color={colors.text} strokeWidth={3.5} />
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
            <ChevronRight size={22} color={colors.text} strokeWidth={3.5} />
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
        onRequestClose={requestProgressEditorBackdropClose}
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
                            disabled={Boolean(savingSubtaskIds[subtask.id])}
                            key={subtask.id}
                            onPress={() => toggleEditorSubtask(subtask)}
                            style={({ pressed }) => [
                              styles.editorChecklistRow,
                              checked && styles.checkedEditorChecklistRow,
                              pressed && styles.pressed,
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
                    onPress={discardProgressEditor}
                    title="Close"
                  />
                ) : (
                  <View style={styles.modalActions}>
                    <PrimaryButton
                      disabled={savingProgress}
                      onPress={discardProgressEditor}
                      title="Close"
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

      <UnsavedChangesModal
        message="You changed your progress. Save before closing?"
        onCancel={() => setNumericClosePromptVisible(false)}
        onDiscard={dismissProgressEditor}
        onSave={() => {
          setNumericClosePromptVisible(false);
          void saveEditorNumericProgress();
        }}
        saving={savingProgress}
        title="Save changes?"
        visible={numericClosePromptVisible}
      />

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
                <ChevronLeft size={22} color={colors.text} strokeWidth={3.5} />
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
                <ChevronRight size={22} color={colors.text} strokeWidth={3.5} />
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

      <BottomSheetModal
        onRequestClose={closeSkipReasonModal}
        sheetStyle={styles.modalCard}
        visible={Boolean(skipReasonHabit && skipReasonRecord)}>
        {skipReasonHabit && skipReasonRecord ? (
          <>
            <View style={styles.modalHeader}>
              <Text style={styles.modalEyebrow}>Skipped</Text>
              <Text style={styles.modalTitle}>{skipReasonHabit.name}</Text>
              <Text style={styles.modalText}>{selectedDateDisplay}</Text>
            </View>
            <View style={styles.skipReasonModalBox}>
              <Text style={styles.skipReasonModalLabel}>Reason</Text>
              <Text style={styles.skipReasonModalText}>{skipReasonRecord.reason}</Text>
            </View>
            <View style={styles.modalActions}>
              <PrimaryButton onPress={closeSkipReasonModal} title="Close" variant="secondary" />
              <PrimaryButton onPress={undoSkipFromReasonModal} title="Undo skip" />
            </View>
          </>
        ) : null}
      </BottomSheetModal>
      </Screen>
      <CrownMilestoneToast
        onDismiss={() => setCrownToast(null)}
        topOffset={insets.top}
        toast={crownToast}
      />
    </View>
  );
}

function CrownMilestoneToast({
  onDismiss,
  topOffset,
  toast,
}: {
  onDismiss: () => void;
  topOffset: number;
  toast: CrownToastState | null;
}) {
  const visible = Boolean(toast);
  const opacity = useRef(new Animated.Value(0)).current;
  const translateY = useRef(new Animated.Value(-10)).current;

  useEffect(() => {
    if (!visible) {
      opacity.setValue(0);
      translateY.setValue(-10);
      return;
    }

    Animated.parallel([
      Animated.timing(opacity, {
        duration: 180,
        easing: EasingLikeOutCubic,
        toValue: 1,
        useNativeDriver: true,
      }),
      Animated.timing(translateY, {
        duration: 180,
        easing: EasingLikeOutCubic,
        toValue: 0,
        useNativeDriver: true,
      }),
    ]).start();
  }, [opacity, translateY, visible]);

  if (!toast) {
    return null;
  }

  const crownColor = getCrownToastColor(toast.tier);

  return (
    <Modal animationType="none" transparent visible={visible}>
      <Animated.View
        pointerEvents="box-none"
        style={[
          styles.crownToastWrap,
          {
            opacity,
            paddingTop: topOffset,
            transform: [{ translateY }],
          },
        ]}>
        <Pressable
          accessibilityLabel="Dismiss crown notification"
          accessibilityRole="button"
          onPress={onDismiss}
          style={({ pressed }) => [styles.crownToast, pressed && styles.pressed]}>
          <View style={[styles.crownToastIcon, { borderColor: crownColor }]}>
            <LucideCrown color={crownColor} size={22} strokeWidth={2.8} />
          </View>
          <View style={styles.crownToastCopy}>
            <Text style={styles.crownToastTitle}>{toast.title}</Text>
            <Text style={styles.crownToastBody}>{toast.body}</Text>
          </View>
        </Pressable>
      </Animated.View>
    </Modal>
  );
}

const EasingLikeOutCubic = (value: number) => 1 - Math.pow(1 - value, 3);

function syncOptimisticCompletionForHabit(
  current: HabitCompletion[],
  habitId: string,
  date: string,
  completed: boolean
) {
  const withoutHabit = current.filter(
    (completion) => !(completion.habitId === habitId && completion.date === date)
  );

  if (!completed) {
    return withoutHabit;
  }

  return [
    ...withoutHabit,
    {
      completedAt: new Date().toISOString(),
      date,
      habitId,
      id: `optimistic_completion_${habitId}_${date}`,
    },
  ];
}

function getNumericProgress(habit: Habit, value: number): HabitProgress {
  const targetValue = habit.targetValue ?? 0;
  const unit = habit.targetUnit ? ` ${habit.targetUnit}` : '';

  return {
    label: `${formatProgressNumber(value)}/${formatProgressNumber(targetValue)}${unit}`,
    percent: targetValue > 0 ? value / targetValue : 0,
    targetValue,
    unit: habit.targetUnit,
    value,
  };
}

function isNumericGoalComplete(habit: Habit, value: number) {
  return Boolean(habit.targetValue && value >= habit.targetValue);
}

function getSubtaskProgress(
  subtasks: HabitSubtask[],
  completions: HabitSubtaskCompletion[]
): HabitProgress {
  const requiredSubtasks = subtasks.filter((subtask) => subtask.required);

  if (requiredSubtasks.length === 0) {
    return { label: 'No subtasks yet', percent: 0 };
  }

  const completedSubtaskIds = new Set(completions.map((completion) => completion.subtaskId));
  const completedCount = requiredSubtasks.filter((subtask) =>
    completedSubtaskIds.has(subtask.id)
  ).length;

  return {
    label: `${completedCount}/${requiredSubtasks.length} subtasks`,
    percent: completedCount / requiredSubtasks.length,
    remainingSubtaskCount: Math.max(subtasks.length - 7, 0),
    subtaskPreview: subtasks.slice(0, 7).map((subtask) => ({
      completed: completedSubtaskIds.has(subtask.id),
      id: subtask.id,
      title: subtask.title,
    })),
  };
}

function areRequiredSubtasksComplete(
  subtasks: HabitSubtask[],
  completions: HabitSubtaskCompletion[]
) {
  const requiredSubtasks = subtasks.filter((subtask) => subtask.required);

  if (requiredSubtasks.length === 0) {
    return false;
  }

  const completedSubtaskIds = new Set(completions.map((completion) => completion.subtaskId));

  return requiredSubtasks.every((subtask) => completedSubtaskIds.has(subtask.id));
}

function getCrownToastColor(tier: HabitCrownTier) {
  if (tier === 'diamond') {
    return '#7DE8FF';
  }

  if (tier === 'gold') {
    return colors.warning;
  }

  if (tier === 'silver') {
    return '#C0C7D2';
  }

  return '#CD7F32';
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
  onAdjustNumericProgress: (habitId: string, delta: number) => void;
  onToggle: (habitId: string) => void;
  onSkip: (habitId: string) => void;
  onShowSkipReason: (habitId: string) => void;
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
  onAdjustNumericProgress,
  onToggle,
  onSkip,
  onShowSkipReason,
  onUndoSkip,
  onPress,
}: TodayHabitCardProps) {
  const accentColor = habit.color ?? colors.habitGreen;
  const statusLabel = completed ? 'Completed' : skipped ? 'Skipped' : 'Remaining';
  const progressPercent = Math.max(0, Math.min(progress?.percent ?? (completed ? 1 : 0), 1));
  const visibleHistoryItems = variant === 'small' ? historyItems.slice(-5) : historyItems;
  const isProgressHabit = habit.trackingType === 'subtasks' || habit.trackingType === 'numeric';
  const [controlPressActive, setControlPressActive] = useState(false);

  function handleToggle(event: GestureResponderEvent) {
    event.stopPropagation();
    onToggle(habit.id);
  }

  function handleSkip(event: GestureResponderEvent) {
    event.stopPropagation();
    onSkip(habit.id);
  }

  function handleShowSkipReason(event: GestureResponderEvent) {
    event.stopPropagation();
    onShowSkipReason(habit.id);
  }

  function handleUndoSkip(event: GestureResponderEvent) {
    event.stopPropagation();
    onUndoSkip(habit.id);
  }

  function handleEditProgress(event: GestureResponderEvent) {
    event.stopPropagation();
    onEditProgress(habit.id);
  }

  function handleInlineNumericAdjust(delta: number, event: GestureResponderEvent) {
    event.stopPropagation();
    onAdjustNumericProgress(habit.id, delta);
  }

  function renderIcon(size = 46, wrapStyle?: ViewStyle) {
    return (
      <View style={[styles.habitIconWrap, wrapStyle]}>
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

  function renderTitleBlock(options: { centered?: boolean; lines?: number | null } = {}) {
    return (
      <View style={[styles.habitCardText, options.centered && styles.centeredHabitCardText]}>
        <Text numberOfLines={options.lines === null ? undefined : options.lines ?? 1} style={styles.habitCardName}>
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

  function renderWideTitleBlock() {
    return (
      <View style={styles.wideTitleBlock}>
        <Text numberOfLines={1} style={styles.wideHabitCardName}>
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

  function renderSmallCheckboxControl() {
    return (
      <ProgressRingButton
        accessibilityLabel={
          skipped
            ? `Show skip reason for ${habit.name}`
            : `${completed ? 'Uncheck' : 'Check'} ${habit.name} for ${completionDateLabel}`
        }
        color={skipped ? colors.warning : accentColor}
        disabled={disabled || (!skipped && toggleDisabled)}
        icon={skipped ? 'skip' : completed ? 'check' : 'empty'}
        onPress={skipped ? handleShowSkipReason : handleToggle}
        onPressIn={() => setControlPressActive(true)}
        onPressOut={() => setControlPressActive(false)}
        percent={skipped || completed ? 1 : 0}
        size="compact"
      />
    );
  }

  function renderWideCheckboxControl() {
    return (
      <ProgressRingButton
        accessibilityLabel={
          skipped
            ? `Show skip reason for ${habit.name}`
            : `${completed ? 'Uncheck' : 'Check'} ${habit.name} for ${completionDateLabel}`
        }
        color={skipped ? colors.warning : accentColor}
        disabled={disabled || (!skipped && toggleDisabled)}
        icon={skipped ? 'skip' : completed ? 'check' : 'empty'}
        onPress={skipped ? handleShowSkipReason : handleToggle}
        onPressIn={() => setControlPressActive(true)}
        onPressOut={() => setControlPressActive(false)}
        percent={skipped || completed ? 1 : 0}
        size="wide"
      />
    );
  }

  function renderProgressControl(
    size: 'compact' | 'wide' | 'dashboard' | 'large' = 'compact',
    centerLabel?: string | null
  ) {
    return (
      <ProgressRingButton
        accessibilityLabel={
          skipped ? `Show skip reason for ${habit.name}` : `Update progress for ${habit.name}`
        }
        color={skipped ? colors.warning : accentColor}
        disabled={disabled || (!skipped && progressDisabled)}
        icon={skipped ? 'skip' : undefined}
        onPress={skipped ? handleShowSkipReason : handleEditProgress}
        percent={skipped ? 1 : progressPercent}
        centerLabel={centerLabel}
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

  function renderCheckboxSmallCard() {
    return (
      <>
        <View style={styles.cardTopRow}>
          {renderIcon(44)}
          {renderSmallCheckboxControl()}
        </View>
        {renderTitleBlock()}
        <View style={styles.cardSpacer} />
        {renderHistory(styles.cardHistory)}
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
          <Pressable
            accessibilityLabel={`Update progress for ${habit.name}: ${progress.label}`}
            accessibilityRole="button"
            disabled={disabled || progressDisabled}
            onPress={handleEditProgress}
            style={({ pressed }) => [
              styles.compactProgressPressable,
              pressed && styles.pressed,
              (disabled || progressDisabled) && styles.controlDisabled,
            ]}>
            <Text numberOfLines={1} style={styles.compactProgressText}>
              {progress.label}
            </Text>
          </Pressable>
        ) : null}
        <View style={styles.cardSpacer} />
        {renderHistory(styles.cardHistory)}
      </>
    );
  }

  function renderCheckboxTallCard() {
    return (
      <>
        {renderTallHeader(renderSmallCheckboxControl())}
        {renderTitleBlock({ lines: null })}
        <View style={styles.tallCardCenter}>{renderTallCheckboxMainButton()}</View>
        {renderHistory(styles.cardHistory)}
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
        {renderTallHeader(renderProgressControl('compact'))}
        {renderTitleBlock({ lines: null })}
        <View style={styles.tallCardCenter}>
          {habit.trackingType === 'subtasks' ? renderTallSubtaskPreview() : renderTallNumericModule()}
        </View>
        {renderHistory(styles.cardHistory)}
      </>
    );
  }

  function renderTallHeader(control: ReactNode) {
    return (
      <View style={styles.tallCardHeader}>
        {renderIcon(54)}
        <View style={styles.tallTopControl}>{control}</View>
      </View>
    );
  }

  function renderTallCheckboxMainButton() {
    const buttonDisabled = disabled || (!skipped && toggleDisabled);

    return (
      <Pressable
        accessibilityLabel={
          skipped
            ? `Show skip reason for ${habit.name}`
            : `${completed ? 'Uncheck' : 'Check'} ${habit.name} for ${completionDateLabel}`
        }
        accessibilityRole="checkbox"
        accessibilityState={{ checked: completed }}
        disabled={buttonDisabled}
        onPress={skipped ? handleShowSkipReason : handleToggle}
        onPressIn={() => setControlPressActive(true)}
        onPressOut={() => setControlPressActive(false)}
        style={({ pressed }) => [
          styles.tallCheckboxMainButton,
          completed && styles.completedTallCheckboxMainButton,
          skipped && styles.skippedTallCheckboxMainButton,
          (pressed || controlPressActive) && styles.controlPressed,
          buttonDisabled && styles.controlDisabled,
        ]}>
        <Ionicons
          name={skipped ? 'play-skip-forward' : 'checkmark'}
          size={skipped ? 34 : 38}
          color={completed ? colors.background : skipped ? colors.warning : colors.textMuted}
        />
      </Pressable>
    );
  }

  function renderTallSubtaskPreview() {
    const preview = progress?.subtaskPreview ?? [];
    const visiblePreview =
      (progress?.remainingSubtaskCount ?? 0) > 0 ? preview.slice(0, 6) : preview.slice(0, 7);
    const remaining =
      (progress?.remainingSubtaskCount ?? 0) + Math.max(preview.length - visiblePreview.length, 0);

    if (preview.length === 0) {
      return (
        <Pressable
          accessibilityLabel={`Open checklist for ${habit.name}`}
          accessibilityRole="button"
          disabled={disabled || progressDisabled}
          onPress={handleEditProgress}
          style={({ pressed }) => [
            styles.tallSubtaskPreview,
            pressed && styles.pressed,
            (disabled || progressDisabled) && styles.controlDisabled,
          ]}>
          <Text style={styles.wideStatusSubtitle}>No subtasks yet</Text>
        </Pressable>
      );
    }

    return (
      <Pressable
        accessibilityLabel={`Open checklist for ${habit.name}`}
        accessibilityRole="button"
        disabled={disabled || progressDisabled}
        onPress={handleEditProgress}
        style={({ pressed }) => [
          styles.tallSubtaskPreview,
          pressed && styles.pressed,
          (disabled || progressDisabled) && styles.controlDisabled,
        ]}>
        {visiblePreview.map((subtask) => (
          <View key={subtask.id} style={styles.tallSubtaskPreviewRow}>
            <View
              style={[
                styles.wideSubtaskPreviewDot,
                subtask.completed && {
                  backgroundColor: accentColor,
                  borderColor: accentColor,
                },
              ]}>
              {subtask.completed ? (
                <Ionicons name="checkmark" size={9} color={colors.background} />
              ) : null}
            </View>
            <Text
              style={[
                styles.tallSubtaskPreviewText,
                subtask.completed && { color: accentColor },
              ]}>
              {subtask.title}
            </Text>
          </View>
        ))}
        {remaining > 0 ? (
          <Text numberOfLines={1} style={styles.wideMoreSubtasksText}>
            +{remaining} more
          </Text>
        ) : null}
      </Pressable>
    );
  }

  function renderTallNumericModule() {
    if (!progress) {
      return null;
    }

    const currentValue = formatProgressNumber(progress.value ?? 0);
    const targetValue = formatProgressNumber(progress.targetValue ?? habit.targetValue ?? 0);
    const unit = progress.unit ?? habit.targetUnit;
    const updateDisabled = disabled || progressDisabled;

    return (
      <View style={styles.tallNumericModule}>
        <Pressable
          accessibilityLabel={`Open progress editor for ${habit.name}: ${progress.label}`}
          accessibilityRole="button"
          disabled={updateDisabled}
          onPress={handleEditProgress}
          style={({ pressed }) => [
            styles.tallNumericValuePanel,
            pressed && styles.pressed,
            updateDisabled && styles.controlDisabled,
          ]}>
          <View style={styles.tallNumericValueLine}>
            <Text numberOfLines={1} adjustsFontSizeToFit style={styles.tallNumericCurrentText}>
              {currentValue}
            </Text>
            <Text numberOfLines={1} adjustsFontSizeToFit style={styles.tallNumericTargetText}>
              / {targetValue}
            </Text>
          </View>
          {unit ? (
            <Text numberOfLines={1} style={styles.tallNumericUnitText}>
              {unit}
            </Text>
          ) : null}
        </Pressable>
        <View style={styles.tallNumericActions}>
          {[
            [-1, 1],
            [10, 25],
          ].map((row) => (
            <View key={row.join('-')} style={styles.tallNumericActionRow}>
              {row.map((delta) => {
                const tone = getNumericQuickButtonTone(accentColor, delta);

                return (
                  <Pressable
                    accessibilityLabel={`${delta > 0 ? 'Increase' : 'Decrease'} ${habit.name} progress by ${Math.abs(delta)}`}
                    accessibilityRole="button"
                    disabled={updateDisabled}
                    key={delta}
                    onPress={(event) => handleInlineNumericAdjust(delta, event)}
                    style={({ pressed }) => [
                      styles.tallNumericStepButton,
                      {
                        backgroundColor: tone.backgroundColor,
                        borderColor: tone.borderColor,
                      },
                      pressed && styles.controlPressed,
                      updateDisabled && styles.controlDisabled,
                    ]}>
                    <Text style={[styles.tallNumericStepText, { color: tone.textColor }]}>
                      {delta > 0 ? `+${delta}` : delta}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          ))}
        </View>
      </View>
    );
  }

  function renderCheckboxWideCard() {
    return (
      <>
        <View style={styles.wideCardHeader}>
          {renderIcon(54)}
          {renderWideTitleBlock()}
          <View style={styles.wideCardControl}>{renderWideCheckboxControl()}</View>
        </View>
        <View style={styles.wideMiddleArea}>{renderWideCheckboxStatus()}</View>
        {renderHistory(styles.wideHistory)}
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
    const wideProgressLabel = progress
      ? getWideProgressLabel(progress.label, habit.trackingType)
      : null;

    return (
      <>
        <View style={styles.wideCardHeader}>
          {renderIcon(54)}
          {renderWideTitleBlock()}
          <View style={styles.wideProgressColumn}>
            {renderProgressControl('wide')}
          </View>
        </View>
        <View style={styles.wideMiddleArea}>
          {habit.trackingType === 'subtasks'
            ? renderWideSubtaskPreview()
            : renderWideNumericSummary(wideProgressLabel)}
        </View>
        {renderHistory(styles.wideHistory)}
      </>
    );
  }

  function renderWideCheckboxStatus() {
    const title = skipped ? 'Skipped today' : completed ? 'Done for today' : 'Still open';
    const subtitle = skipped
      ? 'Tap icon for reason'
      : completed
        ? 'Tap the circle to undo'
        : 'Tap the circle when done';

    return (
      <View style={styles.wideStatusPill}>
        <Text numberOfLines={1} style={styles.wideStatusTitle}>
          {title}
        </Text>
        <Text numberOfLines={1} style={styles.wideStatusSubtitle}>
          {subtitle}
        </Text>
      </View>
    );
  }

  function renderWideSubtaskPreview() {
    const preview = progress?.subtaskPreview ?? [];
    const visiblePreview = preview.length >= 3 ? preview.slice(0, 2) : preview;
    const remaining = (progress?.remainingSubtaskCount ?? 0) + (preview.length - visiblePreview.length);

    if (preview.length === 0) {
      return (
        <Pressable
          accessibilityLabel={`Open checklist for ${habit.name}`}
          accessibilityRole="button"
          disabled={disabled || progressDisabled}
          onPress={handleEditProgress}
          style={({ pressed }) => [
            styles.wideSubtaskPreview,
            pressed && styles.pressed,
            (disabled || progressDisabled) && styles.controlDisabled,
          ]}>
          <Text style={styles.wideStatusSubtitle}>No subtasks yet</Text>
        </Pressable>
      );
    }

    return (
      <Pressable
        accessibilityLabel={`Open checklist for ${habit.name}`}
        accessibilityRole="button"
        disabled={disabled || progressDisabled}
        onPress={handleEditProgress}
        style={({ pressed }) => [
          styles.wideSubtaskPreview,
          pressed && styles.pressed,
          (disabled || progressDisabled) && styles.controlDisabled,
        ]}>
        {visiblePreview.map((subtask) => (
          <View key={subtask.id} style={styles.wideSubtaskPreviewRow}>
            <View
              style={[
                styles.wideSubtaskPreviewDot,
                subtask.completed && {
                  backgroundColor: accentColor,
                  borderColor: accentColor,
                },
              ]}>
              {subtask.completed ? (
                <Ionicons name="checkmark" size={9} color={colors.background} />
              ) : null}
            </View>
            <Text
              numberOfLines={1}
              style={[
                styles.wideSubtaskPreviewText,
                subtask.completed && { color: accentColor },
              ]}>
              {subtask.title}
            </Text>
          </View>
        ))}
        {remaining > 0 ? (
          <Text numberOfLines={1} style={styles.wideMoreSubtasksText}>
            +{remaining} more
          </Text>
        ) : null}
      </Pressable>
    );
  }

  function renderWideNumericSummary(label: string | null) {
    if (!label || !progress) {
      return null;
    }

    return (
      <Pressable
        accessibilityLabel={`Update progress for ${habit.name}: ${label}`}
        accessibilityRole="button"
        disabled={disabled || progressDisabled}
        onPress={handleEditProgress}
        style={({ pressed }) => [
          styles.wideNumericSummary,
          pressed && styles.pressed,
          (disabled || progressDisabled) && styles.controlDisabled,
        ]}>
        <Text numberOfLines={2} style={styles.wideNumericSummaryText}>
          {label}
        </Text>
        <View style={styles.wideNumericTrack}>
          <View
            style={[
              styles.wideNumericFill,
              {
                backgroundColor: accentColor,
                width: `${progressPercent * 100}%`,
              },
            ]}
          />
        </View>
      </Pressable>
    );
  }

  function renderCheckboxLargeCard() {
    return (
      <>
        {renderLargeHeader()}
        <View style={styles.largeDashboardCenter}>{renderLargeCheckboxButton()}</View>
        {renderHistory(styles.cardHistory)}
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
        {renderLargeHeader(renderProgressControl('dashboard'))}
        <View style={styles.largeDashboardCenter}>
          {habit.trackingType === 'subtasks' ? renderLargeSubtaskPreview() : renderLargeNumericModule()}
        </View>
        {renderHistory(styles.cardHistory)}
      </>
    );
  }

  function renderLargeHeader(control?: ReactNode) {
    return (
      <View style={styles.largeCardHeader}>
        {renderIcon(62, styles.largeHabitIconWrap)}
        <View style={styles.largeTitleBlock}>
          <Text numberOfLines={2} style={styles.largeHabitCardName}>
            {habit.name}
          </Text>
          <View style={styles.streakLine}>
            <View style={styles.streakDot} />
            <Text numberOfLines={1} style={styles.habitCardHint}>
              {getStreakLineText(crownMilestone.streakDays)}
            </Text>
          </View>
        </View>
        <View style={styles.largeProgressControl}>{control}</View>
      </View>
    );
  }

  function renderLargeCheckboxButton() {
    const buttonDisabled = disabled || (!skipped && toggleDisabled);
    const label = skipped ? 'Skipped today' : completed ? 'Done for today' : 'Tap when done';

    return (
      <Pressable
        accessibilityLabel={
          skipped
            ? `Show skip reason for ${habit.name}`
            : `${completed ? 'Uncheck' : 'Check'} ${habit.name} for ${completionDateLabel}`
        }
        accessibilityRole="checkbox"
        accessibilityState={{ checked: completed }}
        disabled={buttonDisabled}
        onPress={skipped ? handleShowSkipReason : handleToggle}
        onPressIn={() => setControlPressActive(true)}
        onPressOut={() => setControlPressActive(false)}
        style={({ pressed }) => [
          styles.largeCheckboxDashboardButton,
          completed && styles.completedLargeCheckboxDashboardButton,
          skipped && styles.skippedLargeCheckboxDashboardButton,
          (pressed || controlPressActive) && styles.controlPressed,
          buttonDisabled && styles.controlDisabled,
        ]}>
        <Ionicons
          name={skipped ? 'play-skip-forward' : 'checkmark'}
          size={skipped ? 44 : 50}
          color={completed ? colors.background : skipped ? colors.warning : colors.textMuted}
        />
        <Text
          numberOfLines={1}
          style={[
            styles.largeCheckboxDashboardLabel,
            completed && styles.completedLargeCheckboxDashboardLabel,
            skipped && styles.skippedLargeCheckboxDashboardLabel,
          ]}>
          {label}
        </Text>
      </Pressable>
    );
  }

  function renderLargeSubtaskPreview() {
    const preview = progress?.subtaskPreview ?? [];
    const visiblePreview =
      (progress?.remainingSubtaskCount ?? 0) > 0 ? preview.slice(0, 4) : preview.slice(0, 5);
    const remaining =
      (progress?.remainingSubtaskCount ?? 0) + Math.max(preview.length - visiblePreview.length, 0);

    return (
      <Pressable
        accessibilityLabel={`Open checklist for ${habit.name}`}
        accessibilityRole="button"
        disabled={disabled || progressDisabled}
        onPress={handleEditProgress}
        style={({ pressed }) => [
          styles.largeSubtaskDashboard,
          pressed && styles.pressed,
          (disabled || progressDisabled) && styles.controlDisabled,
        ]}>
        {visiblePreview.length === 0 ? (
          <View style={styles.largeSubtaskEmptyState}>
            <Text style={styles.largeSubtaskEmptyTitle}>Open checklist</Text>
            <Text style={styles.largeSubtaskEmptyText}>No subtasks yet</Text>
          </View>
        ) : (
          visiblePreview.map((subtask) => (
            <View key={subtask.id} style={styles.largeSubtaskRow}>
              <View
                style={[
                  styles.largeSubtaskDot,
                  subtask.completed && {
                    backgroundColor: accentColor,
                    borderColor: accentColor,
                  },
                ]}>
                {subtask.completed ? (
                  <Ionicons name="checkmark" size={11} color={colors.background} />
                ) : null}
              </View>
              <Text
                numberOfLines={2}
                style={[
                  styles.largeSubtaskText,
                  subtask.completed && { color: accentColor },
                ]}>
                {subtask.title}
              </Text>
            </View>
          ))
        )}
        {remaining > 0 ? (
          <Text numberOfLines={1} style={styles.largeMoreSubtasksText}>
            +{remaining} more
          </Text>
        ) : null}
      </Pressable>
    );
  }

  function renderLargeNumericModule() {
    if (!progress) {
      return null;
    }

    const currentValue = formatProgressNumber(progress.value ?? 0);
    const targetValue = formatProgressNumber(progress.targetValue ?? habit.targetValue ?? 0);
    const unit = progress.unit ?? habit.targetUnit;
    const updateDisabled = disabled || progressDisabled;

    return (
      <View style={styles.largeNumericDashboard}>
        <Pressable
          accessibilityLabel={`Open progress editor for ${habit.name}: ${progress.label}`}
          accessibilityRole="button"
          disabled={updateDisabled}
          onPress={handleEditProgress}
          style={({ pressed }) => [
            styles.largeNumericValuePanel,
            pressed && styles.pressed,
            updateDisabled && styles.controlDisabled,
          ]}>
          <View style={styles.largeNumericValueLine}>
            <Text numberOfLines={1} adjustsFontSizeToFit style={styles.largeNumericCurrentText}>
              {currentValue}
            </Text>
            <Text numberOfLines={1} adjustsFontSizeToFit style={styles.largeNumericTargetText}>
              / {targetValue}
            </Text>
          </View>
          {unit ? (
            <Text numberOfLines={1} style={styles.largeNumericUnitText}>
              {unit}
            </Text>
          ) : null}
        </Pressable>
        <View style={styles.largeNumericActions}>
          {[-1, 1, 10, 25].map((delta) => {
            const tone = getNumericQuickButtonTone(accentColor, delta);

            return (
              <Pressable
                accessibilityLabel={`${delta > 0 ? 'Increase' : 'Decrease'} ${habit.name} progress by ${Math.abs(delta)}`}
                accessibilityRole="button"
                disabled={updateDisabled}
                key={delta}
                onPress={(event) => handleInlineNumericAdjust(delta, event)}
                style={({ pressed }) => [
                  styles.largeNumericStepButton,
                  {
                    backgroundColor: tone.backgroundColor,
                    borderColor: tone.borderColor,
                  },
                  pressed && styles.controlPressed,
                  updateDisabled && styles.controlDisabled,
                ]}>
                <Text style={[styles.largeNumericStepText, { color: tone.textColor }]}>
                  {delta > 0 ? `+${delta}` : delta}
                </Text>
              </Pressable>
            );
          })}
        </View>
      </View>
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
        completed && isProgressHabit && styles.completedHabitCard,
        skipped && styles.skippedHabitCard,
        editMode && styles.layoutEditableHabitCard,
        selectedForLayout && styles.selectedLayoutHabitCard,
        pressed && !controlPressActive && styles.pressed,
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
  centerLabel,
  color,
  disabled,
  icon,
  onPress,
  onPressIn,
  onPressOut,
  percent,
  size,
}: {
  accessibilityLabel: string;
  centerLabel?: string | null;
  color: string;
  disabled: boolean;
  icon?: 'check' | 'skip' | 'empty';
  onPress: (event: GestureResponderEvent) => void;
  onPressIn?: () => void;
  onPressOut?: () => void;
  percent: number;
  size: 'compact' | 'wide' | 'dashboard' | 'large';
}) {
  const diameter = size === 'large' ? 96 : size === 'dashboard' ? 82 : size === 'wide' ? 78 : 42;
  const strokeWidth = size === 'large' ? 7 : size === 'dashboard' ? 6 : size === 'wide' ? 6 : 4;
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
      onPressIn={onPressIn}
      onPressOut={onPressOut}
      style={({ pressed }) => [
        styles.progressRingButton,
        size === 'large'
          ? styles.largeProgressRingButton
          : size === 'dashboard'
            ? styles.dashboardProgressRingButton
          : size === 'wide'
            ? styles.wideProgressRingButton
            : styles.compactProgressRingButton,
        pressed && styles.controlPressed,
        disabled && styles.controlDisabled,
      ]}>
      <Svg height={diameter} style={styles.progressRingSvg} width={diameter}>
        <Circle
          cx={diameter / 2}
          cy={diameter / 2}
          fill="transparent"
          r={radiusValue}
          stroke={icon === 'skip' ? colors.warning : colors.surfaceMuted}
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
      {icon === 'skip' ? (
        <Ionicons
          name="play-skip-forward"
          size={size === 'large' ? 30 : size === 'dashboard' ? 25 : size === 'wide' ? 23 : 17}
          color={colors.warning}
        />
      ) : centerLabel ? (
        <Text
          numberOfLines={1}
          adjustsFontSizeToFit
          style={[
            size === 'large'
              ? styles.largeProgressCircleText
              : size === 'dashboard'
                ? styles.dashboardProgressCircleText
              : size === 'wide'
                ? styles.wideProgressCircleText
                : styles.progressCircleText,
            styles.progressCircleCompactLabel,
          ]}>
          {centerLabel}
        </Text>
      ) : icon === 'empty' ? null : icon === 'check' || complete ? (
        <Ionicons
          name="checkmark"
          size={size === 'large' ? 32 : size === 'dashboard' ? 26 : size === 'wide' ? 24 : 18}
          color={colors.text}
        />
      ) : (
        <Text
          numberOfLines={1}
          adjustsFontSizeToFit
          style={
            size === 'large'
              ? styles.largeProgressCircleText
              : size === 'dashboard'
                ? styles.dashboardProgressCircleText
              : size === 'wide'
                ? styles.wideProgressCircleText
                : styles.progressCircleText
          }>
          {Math.floor(clampedPercent * 100)}%
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

function getWideProgressLabel(label: string, trackingType: Habit['trackingType']) {
  const [current, rest] = label.split('/');

  if (!current || !rest) {
    return label;
  }

  if (trackingType === 'subtasks') {
    const total = rest.replace(/\s*subtasks?\s*/i, '').trim();

    return `${current.trim()} of ${total} done`;
  }

  return `${current.trim()} of ${rest.trim()}`;
}

function getNumericQuickButtonTone(accentColor: string, delta: number) {
  if (delta < 0) {
    return {
      backgroundColor: colors.surface,
      borderColor: `${accentColor}66`,
      textColor: colors.textMuted,
    };
  }

  if (delta === 1) {
    return {
      backgroundColor: `${accentColor}22`,
      borderColor: `${accentColor}66`,
      textColor: colors.text,
    };
  }

  if (delta === 10) {
    return {
      backgroundColor: `${accentColor}44`,
      borderColor: `${accentColor}99`,
      textColor: colors.text,
    };
  }

  return {
    backgroundColor: accentColor,
    borderColor: accentColor,
    textColor: colors.background,
  };
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
            remainingSubtaskCount: Math.max(subtasks.length - 7, 0),
            subtaskPreview: subtasks.slice(0, 7).map((subtask) => ({
              completed: completedSubtaskIds.has(subtask.id),
              id: subtask.id,
              title: subtask.title,
            })),
          },
        ];
      }

      if (habit.trackingType === 'numeric') {
        const entry = await getNumericEntryForDate(habit.id, date);

        return [habit.id, getNumericProgress(habit, entry?.value ?? 0)];
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
  root: {
    flex: 1,
    backgroundColor: colors.background,
  },
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
    backgroundColor: colors.surface,
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
  largeHabitIconWrap: {
    alignSelf: 'center',
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
  controlPressed: {
    opacity: 0.72,
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
  wideProgressRingButton: {
    width: 78,
    height: 78,
    borderRadius: 39,
  },
  dashboardProgressRingButton: {
    width: 82,
    height: 82,
    borderRadius: 41,
  },
  progressCircleText: {
    position: 'absolute',
    color: colors.text,
    fontSize: 10,
    lineHeight: 13,
    fontWeight: '900',
  },
  progressCircleCompactLabel: {
    maxWidth: '72%',
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
  wideProgressCircleText: {
    position: 'absolute',
    color: colors.text,
    fontSize: 18,
    lineHeight: 22,
    fontWeight: '900',
  },
  dashboardProgressCircleText: {
    position: 'absolute',
    color: colors.text,
    fontSize: 17,
    lineHeight: 21,
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
  wideTitleBlock: {
    flex: 1,
    minWidth: 0,
    gap: spacing.xs,
    justifyContent: 'center',
  },
  centeredHabitCardText: {
    alignItems: 'center',
  },
  habitCardName: {
    color: colors.text,
    ...typography.caption,
    fontWeight: '900',
  },
  wideHabitCardName: {
    color: colors.text,
    ...typography.body,
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
  compactProgressPressable: {
    alignSelf: 'flex-start',
    maxWidth: '100%',
    paddingVertical: 2,
  },
  tallCardCenter: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 92,
  },
  tallCardHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: spacing.sm,
  },
  tallTopControl: {
    alignItems: 'flex-end',
  },
  tallCheckboxMainButton: {
    width: 104,
    height: 104,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: colors.surfaceMuted,
    borderRadius: 52,
    backgroundColor: colors.surfaceElevated,
  },
  completedTallCheckboxMainButton: {
    borderColor: colors.primary,
    backgroundColor: colors.primary,
  },
  skippedTallCheckboxMainButton: {
    borderColor: colors.warning,
    backgroundColor: colors.surfaceElevated,
  },
  tallSubtaskPreview: {
    alignSelf: 'stretch',
    minHeight: 154,
    maxHeight: 190,
    justifyContent: 'center',
    gap: spacing.sm,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.lg,
    backgroundColor: colors.surfaceElevated,
  },
  tallSubtaskPreviewRow: {
    minHeight: 18,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  tallSubtaskPreviewText: {
    flex: 1,
    color: colors.textMuted,
    ...typography.small,
    lineHeight: 15,
    fontWeight: '800',
  },
  tallNumericModule: {
    alignSelf: 'stretch',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.lg,
  },
  tallNumericValuePanel: {
    alignItems: 'center',
    alignSelf: 'stretch',
    gap: spacing.xs,
  },
  tallNumericValueLine: {
    minHeight: 48,
    flexDirection: 'row',
    alignItems: 'baseline',
    justifyContent: 'center',
    gap: 2,
  },
  tallNumericCurrentText: {
    color: colors.text,
    fontSize: 42,
    lineHeight: 48,
    fontWeight: '900',
  },
  tallNumericTargetText: {
    color: colors.textSubtle,
    fontSize: 23,
    lineHeight: 29,
    fontWeight: '900',
  },
  tallNumericUnitText: {
    color: colors.textMuted,
    fontSize: 13,
    lineHeight: 16,
    fontWeight: '800',
  },
  tallNumericActions: {
    alignSelf: 'center',
    width: 116,
    gap: spacing.xs,
  },
  tallNumericActionRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: spacing.xs,
  },
  tallNumericStepButton: {
    width: 54,
    minHeight: 34,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    backgroundColor: colors.surface,
  },
  tallNumericStepText: {
    color: colors.text,
    fontSize: 14,
    lineHeight: 17,
    fontWeight: '900',
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
  wideCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingRight: 86,
  },
  wideMiddleArea: {
    position: 'absolute',
    top: 74,
    right: 104,
    bottom: 38,
    left: spacing.md,
    justifyContent: 'center',
  },
  wideCardCopy: {
    flex: 1,
    alignSelf: 'stretch',
    gap: spacing.xs,
    justifyContent: 'space-between',
  },
  wideCardControl: {
    position: 'absolute',
    top: 0,
    right: 0,
    width: 84,
    alignItems: 'center',
    justifyContent: 'center',
  },
  wideProgressColumn: {
    position: 'absolute',
    top: 0,
    right: 0,
    width: 84,
    alignItems: 'center',
    gap: spacing.xs,
  },
  wideProgressPressable: {
    maxWidth: 82,
    paddingVertical: 2,
  },
  wideProgressText: {
    color: colors.textMuted,
    ...typography.small,
    fontWeight: '900',
    textAlign: 'center',
  },
  wideStatusPill: {
    alignSelf: 'flex-start',
    gap: 2,
    maxWidth: '100%',
    paddingHorizontal: spacing.md,
    paddingVertical: 7,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.lg,
    backgroundColor: colors.surfaceElevated,
  },
  wideStatusTitle: {
    color: colors.text,
    ...typography.caption,
    fontWeight: '900',
  },
  wideStatusSubtitle: {
    color: colors.textMuted,
    ...typography.small,
    fontWeight: '700',
  },
  wideSubtaskPreview: {
    gap: 2,
    alignSelf: 'stretch',
    paddingHorizontal: spacing.md,
    paddingVertical: 6,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.lg,
    backgroundColor: colors.surfaceElevated,
  },
  wideSubtaskPreviewRow: {
    minHeight: 14,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  wideSubtaskPreviewDot: {
    width: 13,
    height: 13,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: colors.surfaceMuted,
    borderRadius: radius.pill,
  },
  wideSubtaskPreviewText: {
    flex: 1,
    color: colors.textMuted,
    ...typography.small,
    fontWeight: '800',
  },
  wideMoreSubtasksText: {
    color: colors.textSubtle,
    ...typography.small,
    lineHeight: 13,
    fontWeight: '800',
  },
  wideNumericSummary: {
    gap: 6,
    alignSelf: 'stretch',
    paddingHorizontal: spacing.md,
    paddingVertical: 7,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.lg,
    backgroundColor: colors.surfaceElevated,
  },
  wideNumericSummaryText: {
    color: colors.text,
    ...typography.caption,
    fontWeight: '900',
  },
  wideNumericTrack: {
    height: 5,
    overflow: 'hidden',
    borderRadius: radius.pill,
    backgroundColor: colors.surfaceMuted,
  },
  wideNumericFill: {
    height: '100%',
    borderRadius: radius.pill,
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
  largeDashboardCenter: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingBottom: spacing.lg,
  },
  largeCardHeader: {
    minHeight: 86,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  largeTitleBlock: {
    flex: 1,
    minWidth: 0,
    alignSelf: 'center',
    gap: spacing.xs,
    justifyContent: 'center',
  },
  largeHabitCardName: {
    color: colors.text,
    ...typography.heading,
    fontWeight: '900',
  },
  largeProgressControl: {
    width: 86,
    minHeight: 82,
    alignSelf: 'center',
    alignItems: 'flex-end',
    justifyContent: 'center',
  },
  largeCheckboxDashboardButton: {
    width: 148,
    height: 148,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    borderWidth: 2,
    borderColor: colors.surfaceMuted,
    borderRadius: 74,
    backgroundColor: colors.surfaceElevated,
  },
  completedLargeCheckboxDashboardButton: {
    borderColor: colors.primary,
    backgroundColor: colors.primary,
  },
  skippedLargeCheckboxDashboardButton: {
    borderColor: colors.warning,
    backgroundColor: colors.surfaceElevated,
  },
  largeCheckboxDashboardLabel: {
    color: colors.textMuted,
    ...typography.small,
    fontWeight: '900',
    textAlign: 'center',
  },
  completedLargeCheckboxDashboardLabel: {
    color: colors.background,
  },
  skippedLargeCheckboxDashboardLabel: {
    color: colors.warning,
  },
  largeSubtaskDashboard: {
    alignSelf: 'stretch',
    gap: spacing.sm,
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.lg,
    backgroundColor: colors.surfaceElevated,
  },
  largeSubtaskRow: {
    minHeight: 20,
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.sm,
  },
  largeSubtaskDot: {
    width: 16,
    height: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 1,
    borderWidth: 1,
    borderColor: colors.surfaceMuted,
    borderRadius: radius.pill,
  },
  largeSubtaskText: {
    flex: 1,
    color: colors.textMuted,
    ...typography.caption,
    lineHeight: 18,
    fontWeight: '800',
  },
  largeMoreSubtasksText: {
    color: colors.textSubtle,
    ...typography.small,
    fontWeight: '900',
  },
  largeSubtaskEmptyState: {
    gap: spacing.xs,
  },
  largeSubtaskEmptyTitle: {
    color: colors.text,
    ...typography.caption,
    fontWeight: '900',
  },
  largeSubtaskEmptyText: {
    color: colors.textMuted,
    ...typography.small,
    fontWeight: '700',
  },
  largeNumericDashboard: {
    alignSelf: 'stretch',
    gap: spacing.xl,
    alignItems: 'center',
  },
  largeNumericValuePanel: {
    gap: spacing.sm,
    alignItems: 'center',
    alignSelf: 'stretch',
  },
  largeNumericValueLine: {
    minHeight: 70,
    flexDirection: 'row',
    alignItems: 'baseline',
    justifyContent: 'center',
    gap: spacing.xs,
  },
  largeNumericCurrentText: {
    color: colors.text,
    fontSize: 64,
    lineHeight: 70,
    fontWeight: '900',
  },
  largeNumericTargetText: {
    color: colors.textSubtle,
    fontSize: 34,
    lineHeight: 42,
    fontWeight: '900',
  },
  largeNumericUnitText: {
    color: colors.textMuted,
    fontSize: 18,
    lineHeight: 22,
    fontWeight: '800',
  },
  largeNumericActions: {
    flexDirection: 'row',
    alignSelf: 'stretch',
    gap: spacing.sm,
  },
  largeNumericStepButton: {
    flex: 1,
    minHeight: 46,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.lg,
    backgroundColor: colors.surface,
  },
  largeNumericStepText: {
    color: colors.text,
    fontSize: 18,
    lineHeight: 22,
    fontWeight: '900',
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
  skipReasonModalBox: {
    gap: spacing.xs,
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: colors.warning,
    borderRadius: radius.lg,
    backgroundColor: colors.surfaceElevated,
  },
  skipReasonModalLabel: {
    color: colors.warning,
    ...typography.small,
    fontWeight: '900',
    textTransform: 'uppercase',
  },
  skipReasonModalText: {
    color: colors.text,
    ...typography.body,
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
    height: 82,
    paddingHorizontal: spacing.lg,
    paddingVertical: 0,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.lg,
    color: colors.text,
    backgroundColor: colors.surfaceElevated,
    fontSize: 32,
    lineHeight: 38,
    fontWeight: '900',
    includeFontPadding: false,
    textAlignVertical: 'center',
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
  crownToastWrap: {
    position: 'absolute',
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
    paddingHorizontal: spacing.lg,
    zIndex: 20,
  },
  crownToast: {
    minHeight: 76,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: colors.warning,
    borderRadius: radius.lg,
    backgroundColor: colors.surface,
    shadowColor: colors.warning,
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.2,
    shadowRadius: 16,
    elevation: 8,
  },
  crownToastIcon: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderRadius: radius.pill,
    backgroundColor: colors.surfaceElevated,
  },
  crownToastCopy: {
    flex: 1,
    gap: 2,
  },
  crownToastTitle: {
    color: colors.text,
    ...typography.caption,
    fontWeight: '900',
  },
  crownToastBody: {
    color: colors.textMuted,
    ...typography.small,
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
