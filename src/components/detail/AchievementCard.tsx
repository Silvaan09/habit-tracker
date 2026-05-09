import { StyleSheet, Text, View } from 'react-native';

import { HabitCrownBadge } from '@/src/components/HabitCrownBadge';
import { colors, radius, spacing, typography } from '@/src/theme';
import type { HabitCrownMilestone, HabitCrownTier } from '@/src/utils/milestones';

type AchievementCardProps = {
  milestone: HabitCrownMilestone;
};

const CROWN_TARGETS: { tier: Exclude<HabitCrownTier, 'none'>; label: string; days: number }[] = [
  { tier: 'bronze', label: 'Bronze Crown', days: 7 },
  { tier: 'silver', label: 'Silver Crown', days: 30 },
  { tier: 'gold', label: 'Gold Crown', days: 90 },
  { tier: 'diamond', label: 'Diamond Crown', days: 365 },
];

export function AchievementCard({ milestone }: AchievementCardProps) {
  const nextTarget = CROWN_TARGETS.find((target) => milestone.streakDays < target.days);
  const progressPercent = nextTarget
    ? Math.max(0, Math.min(milestone.streakDays / nextTarget.days, 1))
    : 1;

  return (
    <View style={styles.card}>
      <View style={styles.header}>
        <View style={styles.copy}>
          <Text style={styles.eyebrow}>Achievement</Text>
          {milestone.tier === 'none' ? (
            <>
              <Text style={styles.title}>Next achievement</Text>
              <Text style={styles.body}>Keep completing this habit to earn your first crown.</Text>
            </>
          ) : (
            <>
              <Text style={styles.title}>{milestone.label}</Text>
              <Text style={styles.body}>
                {milestone.streakDays} day current streak. Keep the chain warm.
              </Text>
            </>
          )}
        </View>
        {milestone.tier === 'none' ? null : <HabitCrownBadge milestone={milestone} />}
      </View>

      {nextTarget ? (
        <View style={styles.progressBlock}>
          <View style={styles.progressHeader}>
            <Text style={styles.progressLabel}>{nextTarget.label}</Text>
            <Text style={styles.progressValue}>
              {milestone.streakDays}/{nextTarget.days} days
            </Text>
          </View>
          <View style={styles.track}>
            <View style={[styles.fill, { width: `${progressPercent * 100}%` }]} />
          </View>
        </View>
      ) : (
        <Text style={styles.body}>Every crown is unlocked. That is a serious archive.</Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    width: '100%',
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
    gap: spacing.lg,
  },
  copy: {
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
  body: {
    color: colors.textMuted,
    ...typography.caption,
  },
  progressBlock: {
    gap: spacing.sm,
  },
  progressHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: spacing.md,
  },
  progressLabel: {
    color: colors.text,
    ...typography.caption,
    fontWeight: '900',
  },
  progressValue: {
    color: colors.primary,
    ...typography.small,
    fontWeight: '900',
  },
  track: {
    height: 8,
    overflow: 'hidden',
    borderRadius: radius.pill,
    backgroundColor: colors.surfaceMuted,
  },
  fill: {
    height: '100%',
    borderRadius: radius.pill,
    backgroundColor: colors.primary,
  },
});
