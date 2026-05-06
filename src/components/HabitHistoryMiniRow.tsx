import { StyleSheet, Text, View } from 'react-native';

import { colors, radius, typography } from '@/src/theme';
import type { HabitHistoryItem, HabitHistoryStatus } from '@/src/utils/recentHabitHistory';

type HabitHistoryMiniRowProps = {
  items: HabitHistoryItem[];
};

const STATUS_COLORS: Record<HabitHistoryStatus, string> = {
  completed: colors.primary,
  skipped: colors.warning,
  missed: colors.surfaceMuted,
};

export function HabitHistoryMiniRow({ items }: HabitHistoryMiniRowProps) {
  if (items.length === 0) {
    return null;
  }

  return (
    <View
      accessibilityLabel={items.map((item) => `${item.date} ${item.status}`).join(', ')}
      accessible
      style={styles.container}>
      <View style={styles.cells}>
        {items.map((item) => (
          <View
            key={item.date}
            style={[
              styles.cell,
              {
                backgroundColor: STATUS_COLORS[item.status],
                borderColor:
                  item.status === 'missed' ? colors.border : STATUS_COLORS[item.status],
              },
            ]}
          />
        ))}
      </View>
      <Text style={styles.label}>Recent</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: 3,
  },
  cells: {
    flexDirection: 'row',
    gap: 3,
  },
  cell: {
    width: 11,
    height: 11,
    borderWidth: 1,
    borderRadius: radius.sm,
  },
  label: {
    color: colors.textSubtle,
    ...typography.small,
    fontWeight: '800',
    textTransform: 'uppercase',
  },
});
