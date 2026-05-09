import { addDays, addMonths, format, parseISO, startOfMonth, startOfWeek } from 'date-fns';
import { useEffect, useMemo, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { BottomSheetModal } from '@/src/components/BottomSheetModal';
import { colors, radius, spacing, typography } from '@/src/theme';
import { formatDisplayDateDDMMYYYY, getTodayDateString } from '@/src/utils/dates';

import { ChevronLeft, ChevronRight } from 'lucide-react-native';

type ScheduleDatePickerModalProps = {
  visible: boolean;
  selectedDate: string;
  onClose: () => void;
  onSelectDate: (date: string) => void;
};

export function ScheduleDatePickerModal({
  visible,
  selectedDate,
  onClose,
  onSelectDate,
}: ScheduleDatePickerModalProps) {
  const [visibleMonth, setVisibleMonth] = useState(() =>
    format(startOfMonth(parseISO(selectedDate)), 'yyyy-MM-dd')
  );
  const [draftDate, setDraftDate] = useState(selectedDate);
  const today = getTodayDateString();
  const monthLabel = useMemo(() => format(parseISO(visibleMonth), 'MMMM yyyy'), [visibleMonth]);
  const days = useMemo(
    () => getCalendarMonthDays(visibleMonth, today, draftDate),
    [draftDate, today, visibleMonth]
  );
  const weeks = useMemo(() => chunkCalendarWeeks(days), [days]);

  useEffect(() => {
    if (!visible) {
      return;
    }

    setDraftDate(selectedDate);
    setVisibleMonth(format(startOfMonth(parseISO(selectedDate)), 'yyyy-MM-dd'));
  }, [selectedDate, visible]);

  function applyDate() {
    onSelectDate(draftDate);
    onClose();
  }

  return (
    <BottomSheetModal onRequestClose={onClose} sheetStyle={styles.sheet} visible={visible}>
      <View style={styles.header}>
        <View>
          <Text style={styles.eyebrow}>Start date</Text>
          <Text style={styles.title}>{monthLabel}</Text>
        </View>
        <Pressable
          accessibilityLabel="Close date picker"
          accessibilityRole="button"
          onPress={onClose}
          style={({ pressed }) => [styles.closeButton, pressed && styles.pressed]}>
          <Text style={styles.closeButtonText}>Close</Text>
        </Pressable>
      </View>

      <View style={styles.monthNav}>
        <Pressable
          accessibilityLabel="Previous month"
          accessibilityRole="button"
          onPress={() =>
            setVisibleMonth((current) => format(addMonths(parseISO(current), -1), 'yyyy-MM-dd'))
          }
          style={({ pressed }) => [styles.monthButton, pressed && styles.pressed]}>
          <ChevronLeft size={22} color={colors.text} strokeWidth={3.5} />
        </Pressable>
        <Pressable
          accessibilityLabel="Jump to today"
          accessibilityRole="button"
          onPress={() => {
            setVisibleMonth(format(startOfMonth(parseISO(today)), 'yyyy-MM-dd'));
            setDraftDate(today);
          }}
          style={({ pressed }) => [styles.jumpTodayButton, pressed && styles.pressed]}>
          <Text style={styles.jumpTodayText}>Jump to today</Text>
        </Pressable>
        <Pressable
          accessibilityLabel="Next month"
          accessibilityRole="button"
          onPress={() =>
            setVisibleMonth((current) => format(addMonths(parseISO(current), 1), 'yyyy-MM-dd'))
          }
          style={({ pressed }) => [styles.monthButton, pressed && styles.pressed]}>
          <ChevronRight size={22} color={colors.text} strokeWidth={3.5} />
        </Pressable>
      </View>

      <View style={styles.weekdays}>
        {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map((weekday) => (
          <Text key={weekday} style={styles.weekdayText}>
            {weekday}
          </Text>
        ))}
      </View>

      <View style={styles.calendarGrid}>
        {weeks.map((week) => (
          <View key={week.map((day) => day.date).join('-')} style={styles.calendarWeekRow}>
            {week.map((day) => (
              <Pressable
                accessibilityLabel={`Choose ${formatDisplayDateDDMMYYYY(day.date)}`}
                accessibilityRole="button"
                accessibilityState={{ selected: day.isSelected }}
                key={day.date}
                onPress={() => setDraftDate(day.date)}
                style={({ pressed }) => [
                  styles.dayButton,
                  !day.isCurrentMonth && styles.outsideMonthDay,
                  day.isToday && styles.todayDay,
                  day.isSelected && styles.selectedDay,
                  pressed && styles.pressed,
                ]}>
                <Text
                  style={[
                    styles.dayText,
                    !day.isCurrentMonth && styles.outsideMonthDayText,
                    day.isSelected && styles.selectedDayText,
                  ]}>
                  {day.day}
                </Text>
              </Pressable>
            ))}
          </View>
        ))}
      </View>

      <View style={styles.actions}>
        <Pressable
          accessibilityLabel={`Apply ${formatDisplayDateDDMMYYYY(draftDate)} as start date`}
          accessibilityRole="button"
          onPress={applyDate}
          style={({ pressed }) => [styles.applyButton, pressed && styles.pressed]}>
          <Text style={styles.applyButtonText}>Apply date</Text>
        </Pressable>
      </View>
    </BottomSheetModal>
  );
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

const styles = StyleSheet.create({
  sheet: {
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
  eyebrow: {
    color: colors.primary,
    ...typography.small,
    fontWeight: '900',
    textTransform: 'uppercase',
  },
  title: {
    color: colors.text,
    ...typography.heading,
  },
  closeButton: {
    minHeight: 38,
    justifyContent: 'center',
    paddingHorizontal: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.pill,
    backgroundColor: colors.surfaceElevated,
  },
  closeButtonText: {
    color: colors.textMuted,
    ...typography.caption,
    fontWeight: '900',
  },
  monthNav: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  monthButton: {
    width: 42,
    height: 42,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radius.pill,
    backgroundColor: colors.surfaceElevated,
  },
  monthButtonText: {
    color: colors.primary,
    fontSize: 22,
    fontWeight: '900',
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
  weekdays: {
    flexDirection: 'row',
    gap: spacing.xs,
  },
  weekdayText: {
    flex: 1,
    color: colors.textSubtle,
    ...typography.small,
    textAlign: 'center',
  },
  calendarGrid: {
    gap: spacing.xs,
  },
  calendarWeekRow: {
    flexDirection: 'row',
    gap: spacing.xs,
  },
  dayButton: {
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
  todayDay: {
    borderColor: colors.primary,
  },
  selectedDay: {
    borderColor: colors.primary,
    backgroundColor: colors.primary,
  },
  dayText: {
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
  selectedDayText: {
    color: colors.background,
  },
  actions: {
    gap: spacing.md,
  },
  applyButton: {
    minHeight: 46,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radius.pill,
    backgroundColor: colors.primary,
  },
  applyButtonText: {
    color: colors.background,
    ...typography.caption,
    fontWeight: '900',
  },
  pressed: {
    opacity: 0.74,
  },
});
