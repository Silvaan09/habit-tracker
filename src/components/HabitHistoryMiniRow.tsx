import { StyleSheet, View } from 'react-native';

import { colors } from '@/src/theme';
import type { HabitHistoryItem, HabitHistoryStatus } from '@/src/utils/recentHabitHistory';

type HabitHistoryMiniRowProps = {
  items: HabitHistoryItem[];
  accentColor?: string;
};

export function HabitHistoryMiniRow({ accentColor = colors.primary, items }: HabitHistoryMiniRowProps) {
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
                backgroundColor: getStatusColor(item.status, accentColor),
                borderColor:
                  item.status === 'missed' ? colors.border : getStatusColor(item.status, accentColor),
              },
            ]}
          />
        ))}
      </View>
    </View>
  );
}

function getStatusColor(status: HabitHistoryStatus, accentColor: string) {
  if (status === 'completed') {
    return accentColor;
  }

  if (status === 'skipped') {
    return colors.warning;
  }

  return colors.surfaceMuted;
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
  },
  cells: {
    flexDirection: 'row',
    gap: 3,
  },
  cell: {
    width: 11,
    height: 11,
    borderWidth: 1,
    borderRadius: 3,
  },
});
