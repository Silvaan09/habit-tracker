import { type DimensionValue, StyleSheet, Text, View } from 'react-native';

import { colors, radius, spacing, typography } from '@/src/theme';

export type WeeklyActivityDay = {
  date: string;
  weekday: string;
  completedCount: number;
  totalCount: number;
  percentage: number;
};

type WeeklyActivityChartProps = {
  days: WeeklyActivityDay[];
};

export function WeeklyActivityChart({ days }: WeeklyActivityChartProps) {
  return (
    <View style={styles.container}>
      {days.map((day) => {
        const barHeight: DimensionValue = `${Math.max(
          day.percentage * 100,
          day.percentage > 0 ? 8 : 0
        )}%`;
        const barColor = getActivityIntensityColor(day.percentage);

        return (
          <View key={day.date} style={styles.dayColumn}>
            <View style={styles.barTrack}>
              <View
                accessibilityLabel={`${day.weekday}: ${day.completedCount} of ${day.totalCount} habits completed`}
                accessible
                style={[styles.barFill, { backgroundColor: barColor, height: barHeight }]}
              />
            </View>
            <Text style={styles.dayLabel}>{day.weekday}</Text>
            <Text style={styles.countLabel}>
              {day.completedCount}/{day.totalCount}
            </Text>
          </View>
        );
      })}
    </View>
  );
}

function getActivityIntensityColor(percentage: number) {
  if (percentage >= 0.9) {
    return colors.activityIntensity[4];
  }

  if (percentage >= 0.7) {
    return colors.activityIntensity[3];
  }

  if (percentage >= 0.45) {
    return colors.activityIntensity[2];
  }

  if (percentage >= 0.2) {
    return colors.activityIntensity[1];
  }

  if (percentage > 0) {
    return colors.activityIntensity[0];
  }

  return colors.surfaceMuted;
}

const styles = StyleSheet.create({
  container: {
    minHeight: 180,
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: spacing.sm,
  },
  dayColumn: {
    flex: 1,
    alignItems: 'center',
    gap: spacing.sm,
  },
  barTrack: {
    width: '100%',
    height: 116,
    justifyContent: 'flex-end',
    overflow: 'hidden',
    borderRadius: radius.pill,
    backgroundColor: colors.surfaceMuted,
  },
  barFill: {
    width: '100%',
    minHeight: 0,
    borderRadius: radius.pill,
  },
  dayLabel: {
    color: colors.textMuted,
    ...typography.small,
    textTransform: 'uppercase',
  },
  countLabel: {
    color: colors.textSubtle,
    ...typography.small,
  },
});
