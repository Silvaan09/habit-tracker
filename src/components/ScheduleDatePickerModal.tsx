import { addDays, addMonths, format, parseISO, startOfMonth, startOfWeek } from 'date-fns';
import { useMemo, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { BottomSheetModal } from '@/src/components/BottomSheetModal';
import { colors, radius, spacing, typography } from '@/src/theme';
import { formatDisplayDateDDMMYYYY, getTodayDateString } from '@/src/utils/dates';

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
  const today = getTodayDateString();
  const monthLabel = useMemo(() => format(parseISO(visibleMonth), 'MMMM yyyy'), [visibleMonth]);
  const days = useMemo(
    () => getCalendarMonthDays(visibleMonth, today, selectedDate),
    [selectedDate, today, visibleMonth]
  );

  function chooseDate(date: string) {
    onSelectDate(date);
    onClose();
  }

  return (
    <BottomSheetModal onRequestClose={onClose} sheetStyle={styles.sheet} visible={visible}>
      <View style={styles.header}>
        <View>
          <Text style={styles.eyebrow}>Start date</Text>
          <Text style={styles.title}>{formatDisplayDateDDMMYYYY(selectedDate)}</Text>
        </View>
        <Pressable
          accessibilityLabel="Close date picker"
          accessibilityRole="button"
          onPress={onClose}
          style={({ pressed }) => [styles.closeButton, pressed && styles.pressed]}>
          <Text style={styles.closeButtonText}>Close</Text>
        </Pressable>
      </View>

      <View style={styles.monthHeader}>
        <Pressable
          accessibilityLabel="Previous month"
          accessibilityRole="button"
          onPress={() =>
            setVisibleMonth((current) => format(addMonths(parseISO(current), -1), 'yyyy-MM-dd'))
          }
          style={({ pressed }) => [styles.monthButton, pressed && styles.pressed]}>
          <Text style={styles.monthButtonText}>{'<'}</Text>
        </Pressable>
        <Text style={styles.monthTitle}>{monthLabel}</Text>
        <Pressable
          accessibilityLabel="Next month"
          accessibilityRole="button"
          onPress={() =>
            setVisibleMonth((current) => format(addMonths(parseISO(current), 1), 'yyyy-MM-dd'))
          }
          style={({ pressed }) => [styles.monthButton, pressed && styles.pressed]}>
          <Text style={styles.monthButtonText}>{'>'}</Text>
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
        {days.map((day) => (
          <Pressable
            accessibilityLabel={`Choose ${formatDisplayDateDDMMYYYY(day.date)}`}
            accessibilityRole="button"
            accessibilityState={{ selected: day.isSelected }}
            key={day.date}
            onPress={() => chooseDate(day.date)}
            style={({ pressed }) => [
              styles.dayButton,
              !day.isCurrentMonth && styles.outsideMonthDay,
              day.isToday && styles.todayDay,
              day.isSelected && styles.selectedDay,
              pressed && styles.pressed,
            ]}>
            <Text style={[styles.dayText, day.isSelected && styles.selectedDayText]}>
              {day.day}
            </Text>
          </Pressable>
        ))}
      </View>

      <Pressable
        accessibilityLabel="Jump to today"
        accessibilityRole="button"
        onPress={() => {
          setVisibleMonth(format(startOfMonth(parseISO(today)), 'yyyy-MM-dd'));
          chooseDate(today);
        }}
        style={({ pressed }) => [styles.todayButton, pressed && styles.pressed]}>
        <Text style={styles.todayButtonText}>Jump to today</Text>
      </Pressable>
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

const styles = StyleSheet.create({
  sheet: {
    gap: spacing.lg,
    padding: spacing.xl,
    borderTopLeftRadius: radius.xl,
    borderTopRightRadius: radius.xl,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.background,
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
    borderRadius: radius.pill,
    backgroundColor: colors.surface,
  },
  closeButtonText: {
    color: colors.text,
    ...typography.small,
    fontWeight: '900',
  },
  monthHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.md,
  },
  monthButton: {
    width: 42,
    height: 42,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radius.pill,
    backgroundColor: colors.surface,
  },
  monthButtonText: {
    color: colors.primary,
    fontSize: 22,
    fontWeight: '900',
  },
  monthTitle: {
    flex: 1,
    color: colors.text,
    ...typography.body,
    fontWeight: '900',
    textAlign: 'center',
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
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.xs,
  },
  dayButton: {
    width: `${100 / 7}%`,
    maxWidth: 45,
    aspectRatio: 1,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    backgroundColor: colors.surface,
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
    color: colors.textMuted,
    ...typography.small,
    fontWeight: '900',
  },
  selectedDayText: {
    color: colors.background,
  },
  todayButton: {
    minHeight: 46,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radius.pill,
    backgroundColor: colors.primary,
  },
  todayButtonText: {
    color: colors.background,
    ...typography.caption,
    fontWeight: '900',
  },
  pressed: {
    opacity: 0.74,
  },
});
