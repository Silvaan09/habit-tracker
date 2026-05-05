import { StyleSheet, Text, View } from 'react-native';

import { colors, radius, spacing, typography } from '@/src/theme';

type HistoryDotsProps = {
  dates: string[];
  completedDates: string[];
};

const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

export function HistoryDots({ dates, completedDates }: HistoryDotsProps) {
  const completedDateSet = new Set(completedDates);

  return (
    <View style={styles.container}>
      {dates.map((date) => {
        const completed = completedDateSet.has(date);

        return (
          <View key={date} style={styles.day}>
            <View
              accessible
              accessibilityLabel={`${date}: ${completed ? 'completed' : 'not completed'}`}
              style={[styles.dot, completed && styles.completedDot]}>
              <Text style={[styles.dayNumber, completed && styles.completedDayNumber]}>
                {date.slice(-2)}
              </Text>
            </View>
            <Text style={styles.weekday}>{getWeekdayLabel(date)}</Text>
          </View>
        );
      })}
    </View>
  );
}

function getWeekdayLabel(date: string) {
  const [year, month, day] = date.split('-').map(Number);

  return WEEKDAYS[new Date(year, month - 1, day).getDay()];
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.md,
  },
  day: {
    width: 42,
    alignItems: 'center',
    gap: spacing.xs,
  },
  dot: {
    width: 38,
    height: 38,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.pill,
    backgroundColor: colors.surfaceElevated,
  },
  completedDot: {
    borderColor: colors.primary,
    backgroundColor: colors.primary,
  },
  dayNumber: {
    color: colors.textMuted,
    ...typography.caption,
    fontWeight: '800',
  },
  completedDayNumber: {
    color: colors.background,
  },
  weekday: {
    color: colors.textSubtle,
    ...typography.small,
  },
});
