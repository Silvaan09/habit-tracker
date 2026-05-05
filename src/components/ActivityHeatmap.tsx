import { addDays, differenceInCalendarDays, format, parseISO, startOfWeek } from 'date-fns';
import { useMemo } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';

import { colors, spacing, typography } from '@/src/theme';

export type ActivityHeatmapDay = {
  date: string;
  completedCount: number;
  totalCount: number;
  percentage: number;
};

type ActivityHeatmapProps = {
  days: ActivityHeatmapDay[];
  endDate: string;
  startDate: string;
  color?: string;
  emptyMessage?: string;
  scrollable?: boolean;
};

type HeatmapCell = ActivityHeatmapDay & {
  inRange: boolean;
};

type HeatmapWeek = {
  key: string;
  monthLabel: string | null;
  cells: HeatmapCell[];
};

const WEEKDAY_LABELS = ['', 'M', '', 'W', '', 'F', ''];

export function ActivityHeatmap({
  days,
  endDate,
  startDate,
  color = colors.primary,
  emptyMessage = 'No completions in this range yet.',
  scrollable = false,
}: ActivityHeatmapProps) {
  const activityByDate = useMemo(
    () => new Map(days.map((day) => [day.date, day])),
    [days]
  );
  const weeks = useMemo(
    () => getHeatmapWeeks(startDate, endDate, activityByDate),
    [activityByDate, endDate, startDate]
  );
  const totalCompletedDays = days.filter((day) => day.completedCount > 0).length;
  const totalCompletions = days.reduce((sum, day) => sum + day.completedCount, 0);
  const grid = (
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
                  accessibilityLabel={
                    cell.inRange
                      ? `${cell.date}: ${cell.completedCount} of ${cell.totalCount} habits completed`
                      : undefined
                  }
                  accessible={cell.inRange}
                  key={cell.date}
                  style={[
                    styles.cell,
                    !cell.inRange && styles.outsideCell,
                    getCellIntensityStyle(cell.percentage, color),
                  ]}
                />
              ))}
            </View>
          ))}
        </View>
      </View>
    </View>
  );

  return (
    <View style={styles.container}>
      <Text style={styles.summary}>
        {totalCompletions} completion{totalCompletions === 1 ? '' : 's'} across{' '}
        {totalCompletedDays} active day{totalCompletedDays === 1 ? '' : 's'}
      </Text>

      {scrollable ? (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.scrollContent}>
          {grid}
        </ScrollView>
      ) : (
        grid
      )}

      <View style={styles.legend}>
        <Text style={styles.legendText}>Less</Text>
        <View style={styles.legendCell} />
        <View style={[styles.legendCell, styles.lowLegendCell]} />
        <View style={[styles.legendCell, styles.midLegendCell]} />
        <View style={[styles.legendCell, { backgroundColor: color, borderColor: color }]} />
        <Text style={styles.legendText}>More</Text>
      </View>

      {totalCompletions === 0 ? <Text style={styles.emptyText}>{emptyMessage}</Text> : null}
    </View>
  );
}

function getHeatmapWeeks(
  startDate: string,
  endDate: string,
  activityByDate: Map<string, ActivityHeatmapDay>
): HeatmapWeek[] {
  const start = parseISO(startDate);
  const end = parseISO(endDate);
  const gridStart = startOfWeek(start);
  const totalGridDays = differenceInCalendarDays(end, gridStart) + 1;
  const totalWeeks = Math.ceil(totalGridDays / 7);

  return Array.from({ length: totalWeeks }, (_, weekIndex) => {
    const weekStart = addDays(gridStart, weekIndex * 7);

    return {
      key: format(weekStart, 'yyyy-MM-dd'),
      monthLabel: getMonthLabelForWeek(weekStart, weekIndex),
      cells: Array.from({ length: 7 }, (_, dayIndex) => {
        const date = addDays(weekStart, dayIndex);
        const dateString = format(date, 'yyyy-MM-dd');
        const inRange = date >= start && date <= end;
        const activity = activityByDate.get(dateString);

        return {
          date: dateString,
          completedCount: activity?.completedCount ?? 0,
          inRange,
          percentage: activity?.percentage ?? 0,
          totalCount: activity?.totalCount ?? 0,
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

function getCellIntensityStyle(percentage: number, color: string) {
  if (percentage >= 0.75) {
    return { borderColor: color, backgroundColor: color };
  }

  if (percentage >= 0.4) {
    return styles.midCell;
  }

  if (percentage > 0) {
    return styles.lowCell;
  }

  return null;
}

const styles = StyleSheet.create({
  container: {
    gap: spacing.lg,
    alignItems: 'center',
  },
  summary: {
    color: colors.textMuted,
    ...typography.caption,
    textAlign: 'center',
  },
  scrollContent: {
    paddingHorizontal: spacing.xs,
  },
  gridWrap: {
    alignSelf: 'center',
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
    fontSize: 9,
    fontWeight: '800',
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
  lowCell: {
    borderColor: colors.primaryMuted,
    backgroundColor: colors.primaryMuted,
  },
  midCell: {
    borderColor: colors.habitGreen,
    backgroundColor: colors.habitGreen,
  },
  legend: {
    flexDirection: 'row',
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
  lowLegendCell: {
    borderColor: colors.primaryMuted,
    backgroundColor: colors.primaryMuted,
  },
  midLegendCell: {
    borderColor: colors.habitGreen,
    backgroundColor: colors.habitGreen,
  },
  emptyText: {
    color: colors.textSubtle,
    ...typography.caption,
    textAlign: 'center',
  },
});
