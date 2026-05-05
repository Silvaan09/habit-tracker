import { addDays, differenceInCalendarDays, format, parseISO, startOfWeek } from 'date-fns';
import { useMemo } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { colors, radius, spacing, typography } from '@/src/theme';

type HabitHeatmapProps = {
  completionDates: string[];
  today: string;
  color?: string | null;
  days?: number;
};

type HeatmapCell = {
  date: string;
  inRange: boolean;
  completed: boolean;
};

type HeatmapWeek = {
  key: string;
  monthLabel: string | null;
  cells: HeatmapCell[];
};

const WEEKDAY_LABELS = ['', 'M', '', 'W', '', 'F', ''];

export function HabitHeatmap({
  completionDates,
  today,
  color = colors.primary,
  days = 90,
}: HabitHeatmapProps) {
  const completedDateSet = useMemo(() => new Set(completionDates), [completionDates]);
  const weeks = useMemo(
    () => getHeatmapWeeks(today, days, completedDateSet),
    [completedDateSet, days, today]
  );
  const recentCompletions = useMemo(
    () => {
      const uniqueCompletionDates = Array.from(new Set(completionDates));

      return uniqueCompletionDates.filter((date) => {
        const distance = differenceInCalendarDays(parseISO(today), parseISO(date));

        return distance >= 0 && distance < days;
      }).length;
    },
    [completionDates, days, today]
  );

  return (
    <View style={styles.card}>
      <View style={styles.header}>
        <View>
          <Text style={styles.title}>Completion heatmap</Text>
          <Text style={styles.subtitle}>
            {recentCompletions} completion{recentCompletions === 1 ? '' : 's'} in the last {days}{' '}
            days
          </Text>
        </View>
      </View>

      <View style={styles.monthRow}>
        <View style={styles.weekdaySpacer} />
        {weeks.map((week) => (
          <Text key={week.key} numberOfLines={1} style={styles.monthLabel}>
            {week.monthLabel ?? ''}
          </Text>
        ))}
      </View>

      <View style={styles.heatmapBody}>
        <View style={styles.weekdayColumn}>
          {WEEKDAY_LABELS.map((label, index) => (
            <Text key={`${label}-${index}`} style={styles.weekdayLabel}>
              {label}
            </Text>
          ))}
        </View>

        <View style={styles.weeksRow}>
          {weeks.map((week) => (
            <View key={week.key} style={styles.weekColumn}>
              {week.cells.map((cell) => (
                <View
                  accessible={cell.inRange}
                  accessibilityLabel={
                    cell.inRange
                      ? `${cell.date}: ${cell.completed ? 'completed' : 'not completed'}`
                      : undefined
                  }
                  key={cell.date}
                  style={[
                    styles.cell,
                    !cell.inRange && styles.outsideCell,
                    cell.completed && {
                      borderColor: color ?? colors.primary,
                      backgroundColor: color ?? colors.primary,
                    },
                  ]}
                />
              ))}
            </View>
          ))}
        </View>
      </View>

      <View style={styles.legend}>
        <Text style={styles.legendText}>Missed</Text>
        <View style={styles.legendCell} />
        <View style={[styles.legendCell, { backgroundColor: color ?? colors.primary }]} />
        <Text style={styles.legendText}>Completed</Text>
      </View>

      {completionDates.length === 0 ? (
        <View style={styles.emptyNote}>
          <Text style={styles.emptyTitle}>No completions yet</Text>
          <Text style={styles.emptyText}>
            Check this habit from Today to start filling in your history.
          </Text>
        </View>
      ) : null}
    </View>
  );
}

function getHeatmapWeeks(
  today: string,
  days: number,
  completedDateSet: Set<string>
): HeatmapWeek[] {
  const todayDate = parseISO(today);
  const firstVisibleDate = addDays(todayDate, -(days - 1));
  const gridStartDate = startOfWeek(firstVisibleDate);
  const totalGridDays = differenceInCalendarDays(todayDate, gridStartDate) + 1;
  const totalWeeks = Math.ceil(totalGridDays / 7);

  return Array.from({ length: totalWeeks }, (_, weekIndex) => {
    const weekStart = addDays(gridStartDate, weekIndex * 7);

    return {
      key: format(weekStart, 'yyyy-MM-dd'),
      monthLabel: getMonthLabelForWeek(weekStart, weekIndex),
      cells: Array.from({ length: 7 }, (_, dayIndex) => {
        const date = addDays(weekStart, dayIndex);
        const dateString = format(date, 'yyyy-MM-dd');
        const inRange = date >= firstVisibleDate && date <= todayDate;

        return {
          date: dateString,
          inRange,
          completed: inRange && completedDateSet.has(dateString),
        };
      }),
    };
  });
}

function getMonthLabelForWeek(weekStart: Date, weekIndex: number) {
  const hasFirstOfMonth = Array.from({ length: 7 }, (_, dayIndex) => addDays(weekStart, dayIndex))
    .some((date) => format(date, 'd') === '1');

  if (weekIndex === 0 || hasFirstOfMonth) {
    return format(weekStart, 'MMM');
  }

  return null;
}

const styles = StyleSheet.create({
  card: {
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
    gap: spacing.md,
  },
  title: {
    color: colors.text,
    ...typography.heading,
  },
  subtitle: {
    color: colors.textMuted,
    ...typography.caption,
  },
  monthRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
  },
  weekdaySpacer: {
    width: 18,
  },
  monthLabel: {
    width: 11,
    color: colors.textSubtle,
    ...typography.small,
    fontSize: 9,
  },
  heatmapBody: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  weekdayColumn: {
    gap: 3,
  },
  weekdayLabel: {
    width: 18,
    height: 11,
    color: colors.textSubtle,
    fontSize: 9,
    lineHeight: 11,
    fontWeight: '800',
  },
  weeksRow: {
    flexDirection: 'row',
    gap: 3,
  },
  weekColumn: {
    gap: 3,
  },
  cell: {
    width: 11,
    height: 11,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 3,
    backgroundColor: colors.surfaceMuted,
  },
  outsideCell: {
    opacity: 0,
  },
  legend: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    gap: spacing.sm,
  },
  legendText: {
    color: colors.textSubtle,
    ...typography.small,
  },
  legendCell: {
    width: 12,
    height: 12,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 3,
    backgroundColor: colors.surfaceMuted,
  },
  emptyNote: {
    gap: spacing.xs,
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.lg,
    backgroundColor: colors.surfaceElevated,
  },
  emptyTitle: {
    color: colors.text,
    ...typography.body,
    fontWeight: '900',
  },
  emptyText: {
    color: colors.textMuted,
    ...typography.caption,
  },
});
