import { addDays, differenceInCalendarDays, format, parseISO, startOfWeek } from 'date-fns';
import { useMemo } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { colors, radius, spacing, typography } from '@/src/theme';

type HabitHeatmapProps = {
  completionDates: string[];
  skippedDates?: string[];
  today: string;
  color?: string | null;
  days?: number;
  title?: string;
  subtitle?: string | null;
};

type HeatmapCell = {
  date: string;
  inRange: boolean;
  completed: boolean;
  skipped: boolean;
};

type HeatmapWeek = {
  key: string;
  monthLabel: string | null;
  cells: HeatmapCell[];
};

const WEEKDAY_LABELS = ['M', '', 'W', '', 'F', '', 'S'];
const COMPLETED_COLOR = colors.warning;
const SKIPPED_COLOR = '#FFB84D';

export function HabitHeatmap({
  completionDates,
  skippedDates = [],
  today,
  days = 90,
  title = 'Completion heatmap',
  subtitle,
}: HabitHeatmapProps) {
  const completedDateSet = useMemo(() => new Set(completionDates), [completionDates]);
  const skippedDateSet = useMemo(() => new Set(skippedDates), [skippedDates]);
  const weeks = useMemo(
    () => getHeatmapWeeks(today, days, completedDateSet, skippedDateSet),
    [completedDateSet, days, skippedDateSet, today]
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
        <View style={styles.headerCopy}>
          <Text style={styles.eyebrow}>History</Text>
          <Text style={styles.title}>{title}</Text>
          {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
        </View>
        <View style={styles.summaryPill}>
          <Text style={styles.summaryValue}>{recentCompletions}</Text>
          <Text style={styles.summaryLabel}>
            completion{recentCompletions === 1 ? '' : 's'}
          </Text>
        </View>
      </View>

      <View style={styles.gridPanel}>
        <Text style={styles.gridSummary}>
          {recentCompletions} completed day{recentCompletions === 1 ? '' : 's'} in the last {days}{' '}
          days
        </Text>

        <View style={styles.gridWrap}>
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
                          ? `${cell.date}: ${
                              cell.completed
                                ? 'completed'
                                : cell.skipped
                                  ? 'skipped'
                                  : 'not completed'
                            }`
                          : undefined
                      }
                      key={cell.date}
                      style={[
                        styles.cell,
                        !cell.inRange && styles.outsideCell,
                        cell.completed && styles.completedCell,
                        cell.skipped && !cell.completed && styles.skippedCell,
                      ]}
                    />
                  ))}
                </View>
              ))}
            </View>
          </View>
        </View>

        <View style={styles.legend}>
          <View style={styles.legendCell} />
          <Text style={styles.legendText}>Missed</Text>
          <View style={[styles.legendCell, styles.legendCompletedCell]} />
          <Text style={styles.legendText}>Completed</Text>
          <View style={[styles.legendCell, styles.legendSkippedCell]} />
          <Text style={styles.legendText}>Skipped</Text>
        </View>

        {completionDates.length === 0 && skippedDates.length === 0 ? (
          <View style={styles.emptyNote}>
            <Text style={styles.emptyTitle}>No completions yet</Text>
            <Text style={styles.emptyText}>
              Check this habit from Today to start filling in your history.
            </Text>
          </View>
        ) : null}
      </View>
    </View>
  );
}

function getHeatmapWeeks(
  today: string,
  days: number,
  completedDateSet: Set<string>,
  skippedDateSet: Set<string>
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
          skipped: inRange && skippedDateSet.has(dateString),
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
    gap: spacing.xl,
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
    ...typography.heading,
  },
  subtitle: {
    color: colors.textMuted,
    ...typography.caption,
  },
  summaryPill: {
    minWidth: 82,
    alignItems: 'center',
    gap: 2,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.lg,
    backgroundColor: colors.surfaceElevated,
  },
  summaryValue: {
    color: colors.primary,
    fontSize: 24,
    lineHeight: 28,
    fontWeight: '900',
  },
  summaryLabel: {
    color: colors.textMuted,
    ...typography.small,
    textAlign: 'center',
  },
  gridPanel: {
    gap: spacing.lg,
    alignItems: 'center',
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.xl,
    backgroundColor: colors.surfaceElevated,
  },
  gridSummary: {
    color: colors.textMuted,
    ...typography.caption,
    textAlign: 'center',
  },
  gridWrap: {
    alignSelf: 'center',
    maxWidth: '100%',
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
  completedCell: {
    borderColor: COMPLETED_COLOR,
    backgroundColor: COMPLETED_COLOR,
  },
  skippedCell: {
    borderColor: SKIPPED_COLOR,
    backgroundColor: SKIPPED_COLOR,
  },
  legend: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    justifyContent: 'center',
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
  legendCompletedCell: {
    borderColor: COMPLETED_COLOR,
    backgroundColor: COMPLETED_COLOR,
  },
  legendSkippedCell: {
    borderColor: SKIPPED_COLOR,
    backgroundColor: SKIPPED_COLOR,
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
