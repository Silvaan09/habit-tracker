import { useFocusEffect } from '@react-navigation/native';
import { useCallback, useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import {
  ACHIEVEMENT_CATEGORIES,
  type AchievementCategory,
  type EvaluatedAchievement,
} from '@/src/achievements/achievementDefinitions';
import {
  evaluateAchievements,
  getAchievementSummary,
  loadAchievementData,
  type AchievementSummary,
} from '@/src/achievements/evaluateAchievements';
import { EmptyState } from '@/src/components/EmptyState';
import { PrimaryButton } from '@/src/components/PrimaryButton';
import { Screen } from '@/src/components/Screen';
import { initDatabase } from '@/src/db/database';
import { colors, radius, spacing, typography } from '@/src/theme';

type CategoryFilter = 'all' | AchievementCategory;

const FILTER_OPTIONS: { id: CategoryFilter; label: string }[] = [
  { id: 'all', label: 'All' },
  ...ACHIEVEMENT_CATEGORIES,
];

export default function AchievementsScreen() {
  const [achievements, setAchievements] = useState<EvaluatedAchievement[]>([]);
  const [summary, setSummary] = useState<AchievementSummary>({
    total: 0,
    unlocked: 0,
    unsupported: 0,
  });
  const [selectedCategory, setSelectedCategory] = useState<CategoryFilter>('all');
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const loadAchievements = useCallback(async () => {
    setLoading(true);
    setErrorMessage(null);
    await initDatabase();

    const data = await loadAchievementData();
    const nextAchievements = evaluateAchievements(data);

    setAchievements(nextAchievements);
    setSummary(getAchievementSummary(nextAchievements));
    setLoading(false);
  }, []);

  useFocusEffect(
    useCallback(() => {
      let isActive = true;

      async function setup() {
        try {
          await loadAchievements();
        } catch (error) {
          console.error('Failed to load achievements', error);

          if (isActive) {
            setErrorMessage('Could not load achievements.');
            setLoading(false);
          }
        }
      }

      setup();

      return () => {
        isActive = false;
      };
    }, [loadAchievements])
  );

  const completionPercent =
    summary.total === 0 ? 0 : Math.round((summary.unlocked / summary.total) * 100);
  const visibleGroups = useMemo(
    () =>
      ACHIEVEMENT_CATEGORIES.map((category) => ({
        ...category,
        achievements: achievements.filter(
          (achievement) =>
            achievement.category === category.id &&
            (selectedCategory === 'all' || selectedCategory === category.id)
        ),
      })).filter((group) => group.achievements.length > 0),
    [achievements, selectedCategory]
  );

  if (loading) {
    return (
      <Screen contentContainerStyle={[styles.content, styles.centeredState]}>
        <Text style={styles.stateTitle}></Text>
      </Screen>
    );
  }

  return (
    <Screen contentContainerStyle={styles.content}>
      <View style={styles.header}>
        <Text style={styles.eyebrow}>Progress</Text>
        <Text style={styles.title}>Achievements</Text>
        <Text style={styles.subtitle}>Milestones you unlock by showing up.</Text>
      </View>

      {errorMessage ? (
        <View style={styles.errorBanner}>
          <Text style={styles.errorText}>{errorMessage}</Text>
          <PrimaryButton onPress={loadAchievements} title="Retry" variant="secondary" />
        </View>
      ) : null}

      <View style={styles.summaryCard}>
        <View>
          <Text style={styles.summaryLabel}>Unlocked</Text>
          <Text style={styles.summaryValue}>
            {summary.unlocked}/{summary.total}
          </Text>
        </View>
        <View style={styles.summarySide}>
          <Text style={styles.summaryPercent}>{completionPercent}%</Text>
          <Text style={styles.summaryHint}>
            {summary.unsupported > 0 ? `${summary.unsupported} later` : 'Completion'}
          </Text>
        </View>
        <View style={styles.summaryTrack}>
          <View style={[styles.summaryFill, { width: `${completionPercent}%` }]} />
        </View>
      </View>

      <ScrollView
        horizontal
        contentContainerStyle={styles.filterContent}
        showsHorizontalScrollIndicator={false}>
        {FILTER_OPTIONS.map((option) => {
          const selected = selectedCategory === option.id;

          return (
            <Pressable
              accessibilityRole="button"
              key={option.id}
              onPress={() => setSelectedCategory(option.id)}
              style={[styles.filterChip, selected && styles.selectedFilterChip]}>
              <Text style={[styles.filterChipText, selected && styles.selectedFilterChipText]}>
                {option.label}
              </Text>
            </Pressable>
          );
        })}
      </ScrollView>

      {achievements.length === 0 ? (
        <EmptyState
          title="No achievements yet"
          message="Create habits and complete them to start unlocking milestones."
        />
      ) : (
        <View style={styles.groupStack}>
          {visibleGroups.map((group) => (
            <View key={group.id} style={styles.group}>
              {selectedCategory === 'all' ? (
                <Text style={styles.groupTitle}>{group.label}</Text>
              ) : null}
              <View style={styles.cardStack}>
                {group.achievements.map((achievement) => (
                  <AchievementCard achievement={achievement} key={achievement.id} />
                ))}
              </View>
            </View>
          ))}
        </View>
      )}
    </Screen>
  );
}

function AchievementCard({ achievement }: { achievement: EvaluatedAchievement }) {
  const progressPercent =
    achievement.target === 0
      ? 0
      : Math.min(100, Math.round((achievement.progress / achievement.target) * 100));
  const unlocked = achievement.unlocked && !achievement.unsupported;

  return (
    <View
      style={[
        styles.achievementCard,
        unlocked && styles.unlockedCard,
        achievement.unsupported && styles.unsupportedCard,
      ]}>
      <View
        style={[
          styles.badgeCircle,
          unlocked && styles.unlockedBadge,
          achievement.unsupported && styles.unsupportedBadge,
        ]}>
        <Text style={[styles.badgeText, unlocked && styles.unlockedBadgeText]}>
          {achievement.unsupported ? '...' : unlocked ? 'OK' : '--'}
        </Text>
      </View>

      <View style={styles.achievementBody}>
        <View style={styles.achievementHeader}>
          <Text
            numberOfLines={2}
            style={[styles.achievementTitle, !unlocked && styles.lockedTitle]}>
            {achievement.title}
          </Text>
          <View
            style={[
              styles.achievementStatus,
              unlocked && styles.unlockedStatus,
              achievement.unsupported && styles.unsupportedStatus,
            ]}>
            <Text
              style={[
                styles.achievementStatusText,
                unlocked && styles.unlockedStatusText,
              ]}>
              {achievement.unsupported ? 'Later' : unlocked ? 'Unlocked' : 'Locked'}
            </Text>
          </View>
        </View>
        <Text style={styles.achievementDescription}>{achievement.description}</Text>
        <Text style={styles.progressLabel}>{achievement.progressLabel}</Text>
        {!unlocked && !achievement.unsupported ? (
          <View style={styles.progressTrack}>
            <View style={[styles.progressFill, { width: `${progressPercent}%` }]} />
          </View>
        ) : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  content: {
    gap: spacing.xl,
    paddingBottom: 112,
  },
  header: {
    gap: spacing.xs,
  },
  eyebrow: {
    color: colors.primary,
    ...typography.small,
    fontWeight: '900',
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },
  title: {
    color: colors.text,
    ...typography.title,
  },
  subtitle: {
    color: colors.textMuted,
    ...typography.body,
  },
  summaryCard: {
    gap: spacing.md,
    padding: spacing.xl,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.xl,
    backgroundColor: colors.surface,
  },
  summaryLabel: {
    color: colors.textMuted,
    ...typography.small,
    fontWeight: '800',
    textTransform: 'uppercase',
  },
  summaryValue: {
    color: colors.text,
    fontSize: 42,
    lineHeight: 48,
    fontWeight: '900',
  },
  summarySide: {
    position: 'absolute',
    right: spacing.xl,
    top: spacing.xl,
    alignItems: 'flex-end',
    gap: 2,
  },
  summaryPercent: {
    color: colors.primary,
    ...typography.heading,
    fontWeight: '900',
  },
  summaryHint: {
    color: colors.textMuted,
    ...typography.caption,
    fontWeight: '700',
  },
  summaryTrack: {
    height: 7,
    overflow: 'hidden',
    borderRadius: radius.pill,
    backgroundColor: colors.surfaceMuted,
  },
  summaryFill: {
    height: '100%',
    borderRadius: radius.pill,
    backgroundColor: colors.primary,
  },
  filterContent: {
    gap: spacing.sm,
    paddingRight: spacing.xl,
  },
  filterChip: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.pill,
    backgroundColor: colors.surface,
  },
  selectedFilterChip: {
    borderColor: colors.primary,
    backgroundColor: colors.primaryMuted,
  },
  filterChipText: {
    color: colors.textMuted,
    ...typography.small,
    fontWeight: '800',
  },
  selectedFilterChipText: {
    color: colors.primary,
  },
  groupStack: {
    gap: spacing.xl,
  },
  group: {
    gap: spacing.md,
  },
  groupTitle: {
    color: colors.text,
    ...typography.heading,
  },
  cardStack: {
    gap: spacing.md,
  },
  achievementCard: {
    flexDirection: 'row',
    gap: spacing.md,
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.xl,
    backgroundColor: colors.surface,
  },
  unlockedCard: {
    borderColor: colors.primary,
    backgroundColor: colors.surfaceElevated,
  },
  unsupportedCard: {
    opacity: 0.72,
  },
  badgeCircle: {
    width: 46,
    height: 46,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 23,
    backgroundColor: colors.surfaceElevated,
  },
  unlockedBadge: {
    borderColor: colors.primary,
    backgroundColor: colors.primaryMuted,
  },
  unsupportedBadge: {
    borderColor: colors.textSubtle,
  },
  badgeText: {
    color: colors.textMuted,
    ...typography.caption,
    fontWeight: '900',
  },
  unlockedBadgeText: {
    color: colors.primary,
  },
  achievementBody: {
    flex: 1,
    gap: spacing.xs,
  },
  achievementHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: spacing.sm,
  },
  achievementTitle: {
    flex: 1,
    color: colors.text,
    ...typography.body,
    fontWeight: '900',
  },
  lockedTitle: {
    color: colors.textMuted,
  },
  achievementStatus: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 5,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.pill,
    backgroundColor: colors.surfaceElevated,
  },
  unlockedStatus: {
    borderColor: colors.primary,
    backgroundColor: colors.primaryMuted,
  },
  unsupportedStatus: {
    borderColor: colors.textSubtle,
  },
  achievementStatusText: {
    color: colors.textMuted,
    ...typography.small,
    fontWeight: '900',
  },
  unlockedStatusText: {
    color: colors.primary,
  },
  achievementDescription: {
    color: colors.textMuted,
    ...typography.small,
  },
  progressLabel: {
    color: colors.text,
    ...typography.caption,
    fontWeight: '800',
  },
  progressTrack: {
    height: 5,
    overflow: 'hidden',
    borderRadius: radius.pill,
    backgroundColor: colors.surfaceMuted,
  },
  progressFill: {
    height: '100%',
    borderRadius: radius.pill,
    backgroundColor: colors.primary,
  },
  errorBanner: {
    gap: spacing.md,
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: colors.destructive,
    borderRadius: radius.lg,
    backgroundColor: colors.surface,
  },
  errorText: {
    color: colors.destructive,
    ...typography.caption,
    fontWeight: '600',
  },
  centeredState: {
    justifyContent: 'center',
  },
  stateTitle: {
    color: colors.text,
    ...typography.heading,
    textAlign: 'center',
  },
});
