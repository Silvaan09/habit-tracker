import { StyleSheet, Text, View } from 'react-native';

import { LucideCrown } from '@/src/components/lucideHabitIcons';
import { colors, radius, spacing, typography } from '@/src/theme';
import type { HabitCrownMilestone } from '@/src/utils/milestones';

type HabitCrownBadgeProps = {
  milestone: HabitCrownMilestone;
  compact?: boolean;
};

const CROWN_COLORS: Record<HabitCrownMilestone['tier'], string> = {
  none: colors.textSubtle,
  bronze: '#CD7F32',
  silver: '#C0C7D2',
  gold: '#FFD166',
  diamond: '#7DE8FF',
};

export function HabitCrownBadge({ compact = false, milestone }: HabitCrownBadgeProps) {
  if (milestone.tier === 'none') {
    return null;
  }

  const crownColor = CROWN_COLORS[milestone.tier];

  return (
    <View
      accessibilityLabel={`${milestone.label}, ${milestone.streakDays} day current streak`}
      accessible
      style={[styles.badge, compact && styles.compactBadge, { borderColor: crownColor }]}>
      <LucideCrown color={crownColor} size={compact ? 14 : 18} strokeWidth={2.6} />
      {compact ? null : (
        <Text style={[styles.label, { color: crownColor }]}>{milestone.label}</Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    minHeight: 34,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderWidth: 1,
    borderRadius: radius.pill,
    backgroundColor: colors.surfaceElevated,
  },
  compactBadge: {
    minWidth: 28,
    minHeight: 28,
    justifyContent: 'center',
    paddingHorizontal: spacing.xs,
    paddingVertical: spacing.xs,
  },
  label: {
    ...typography.small,
    fontWeight: '900',
  },
});
