import { addDays, differenceInCalendarDays, format, parseISO, startOfWeek } from 'date-fns';
import { useMemo } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';

import { colors, spacing, typography } from '@/src/theme';

export type ActivityHeatmapDay = {
  date: string;
  completedCount: number;
  totalCount: number;
  percentage: number;
  isFullyCompletedDay?: boolean;
  isTrackedDay?: boolean;
};

type ActivityHeatmapProps = {
  days: ActivityHeatmapDay[];
  endDate: string;
  startDate: string;
  emptyMessage?: string;
  rangeTitle?: string;
  scrollable?: boolean;
  showMonthLabels?: boolean;
  summaryText?: string;
};

type HeatmapCell = ActivityHeatmapDay & {
  inRange: boolean;
};

type HeatmapWeek = {
  key: string;
  monthLabel: string | null;
  cells: HeatmapCell[];
};

const WEEKDAY_LABELS = ['M', '', 'W', '', 'F', '', 'S'];
const CELL_SIZE = 13;
const CELL_GAP = 4;
const WEEKDAY_WIDTH = 18;

export function ActivityHeatmap({
  days,
  endDate,
  startDate,
  emptyMessage = 'No completions in this range yet.',
  rangeTitle,
  scrollable = false,
  showMonthLabels = true,
  summaryText,
}: ActivityHeatmapProps) {
  const activityByDate = useMemo(
    () => new Map(days.map((day) => [day.date, day])),
    [days]
  );
  const weeks = useMemo(
    () => getHeatmapWeeks(startDate, endDate, activityByDate),
    [activityByDate, endDate, startDate]
  );
  const hasCompletions = days.some((day) => day.completedCount > 0);
  const grid = (
    <View style={styles.gridWrap}>
      {showMonthLabels ? (
        <View style={styles.monthRow}>
          {weeks.map((week, weekIndex) =>
            week.monthLabel ? (
              <Text
                key={week.key}
                numberOfLines={1}
                style={[styles.monthLabel, { left: getMonthLabelLeft(weekIndex) }]}>
                {week.monthLabel}
              </Text>
            ) : null
          )}
        </View>
      ) : null}

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
                    getCellIntensityStyle(cell.percentage),
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
      {rangeTitle ? <Text style={styles.rangeTitle}>{rangeTitle}</Text> : null}
      <Text style={styles.summary}>
        {summaryText ??
          `${days.filter((day) => day.isFullyCompletedDay).length} complete days across ${
            days.filter((day) => day.isTrackedDay).length
          } tracked days`}
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
        {colors.activityIntensity.map((activityColor) => (
          <View
            key={activityColor}
            style={[
              styles.legendCell,
              { backgroundColor: activityColor, borderColor: activityColor },
            ]}
          />
        ))}
        <Text style={styles.legendText}>More</Text>
      </View>

      {!hasCompletions ? <Text style={styles.emptyText}>{emptyMessage}</Text> : null}
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
  const gridStart = startOfWeek(start, { weekStartsOn: 1 });
  const totalGridDays = differenceInCalendarDays(end, gridStart) + 1;
  const totalWeeks = Math.ceil(totalGridDays / 7);

  return Array.from({ length: totalWeeks }, (_, weekIndex) => {
    const weekStart = addDays(gridStart, weekIndex * 7);

    return {
      key: format(weekStart, 'yyyy-MM-dd'),
      monthLabel: getMonthLabelForWeek(weekStart, weekIndex, start, end),
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

function getMonthLabelForWeek(weekStart: Date, weekIndex: number, start: Date, end: Date) {
  const weekDates = Array.from({ length: 7 }, (_, dayIndex) => addDays(weekStart, dayIndex));
  const startDateString = format(start, 'yyyy-MM-dd');
  const firstInRangeDate = weekDates.find((date) => format(date, 'yyyy-MM-dd') === startDateString);
  const firstOfMonthDate = weekDates.find(
    (date) => date >= start && date <= end && format(date, 'd') === '1'
  );

  if (weekIndex === 0 && firstInRangeDate) {
    return format(firstInRangeDate, 'MMM');
  }

  if (firstOfMonthDate) {
    return format(firstOfMonthDate, 'MMM');
  }

  return null;
}

function getMonthLabelLeft(weekIndex: number) {
  return WEEKDAY_WIDTH + spacing.sm + weekIndex * (CELL_SIZE + CELL_GAP);
}

function getCellIntensityStyle(percentage: number) {
  if (percentage >= 0.9) {
    return {
      borderColor: colors.activityIntensity[4],
      backgroundColor: colors.activityIntensity[4],
    };
  }

  if (percentage >= 0.7) {
    return {
      borderColor: colors.activityIntensity[3],
      backgroundColor: colors.activityIntensity[3],
    };
  }

  if (percentage >= 0.45) {
    return {
      borderColor: colors.activityIntensity[2],
      backgroundColor: colors.activityIntensity[2],
    };
  }

  if (percentage >= 0.2) {
    return {
      borderColor: colors.activityIntensity[1],
      backgroundColor: colors.activityIntensity[1],
    };
  }

  if (percentage > 0) {
    return {
      borderColor: colors.activityIntensity[0],
      backgroundColor: colors.activityIntensity[0],
    };
  }

  return null;
}

const styles = StyleSheet.create({
  container: {
    gap: spacing.lg,
    alignItems: 'center',
  },
  rangeTitle: {
    color: colors.text,
    ...typography.body,
    fontWeight: '900',
    textAlign: 'center',
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
    position: 'relative',
    height: 14,
  },
  monthLabel: {
    position: 'absolute',
    width: 32,
    color: colors.textSubtle,
    fontSize: 9,
    fontWeight: '800',
  },
  heatmapBody: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  weekdayColumn: {
    gap: CELL_GAP,
  },
  weekdayLabel: {
    width: WEEKDAY_WIDTH,
    height: CELL_SIZE,
    color: colors.textSubtle,
    fontSize: 9,
    lineHeight: CELL_SIZE,
    fontWeight: '800',
  },
  weeksRow: {
    flexDirection: 'row',
    gap: CELL_GAP,
  },
  weekColumn: {
    gap: CELL_GAP,
  },
  cell: {
    width: CELL_SIZE,
    height: CELL_SIZE,
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
  emptyText: {
    color: colors.textSubtle,
    ...typography.caption,
    textAlign: 'center',
  },
});
