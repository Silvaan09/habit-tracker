import { StyleSheet, Text, View } from 'react-native';

import { colors, radius, spacing, typography } from '@/src/theme';
import type { HabitSubtask, HabitSubtaskCompletion } from '@/src/types/Habit';

type SubtaskCompletionBreakdownProps = {
  subtasks: HabitSubtask[];
  completions: HabitSubtaskCompletion[];
};

export function SubtaskCompletionBreakdown({
  completions,
  subtasks,
}: SubtaskCompletionBreakdownProps) {
  const countsBySubtaskId = completions.reduce<Record<string, number>>((counts, completion) => {
    counts[completion.subtaskId] = (counts[completion.subtaskId] ?? 0) + 1;
    return counts;
  }, {});
  const maxCount = Math.max(1, ...subtasks.map((subtask) => countsBySubtaskId[subtask.id] ?? 0));

  return (
    <View style={styles.card}>
      <View style={styles.header}>
        <Text style={styles.eyebrow}>Subtask progress</Text>
        <Text style={styles.title}>Subtask breakdown</Text>
        <Text style={styles.subtitle}>Which subtasks are getting checked most often.</Text>
      </View>

      {subtasks.length === 0 ? (
        <Text style={styles.emptyText}>No subtasks yet.</Text>
      ) : (
        <View style={styles.list}>
          {subtasks.map((subtask) => {
            const count = countsBySubtaskId[subtask.id] ?? 0;
            const percent = count / maxCount;

            return (
              <View key={subtask.id} style={styles.row}>
                <View style={styles.rowHeader}>
                  <Text style={styles.subtaskTitle}>{subtask.title}</Text>
                  <Text style={styles.countText}>{count}</Text>
                </View>
                <View style={styles.track}>
                  <View style={[styles.fill, { width: `${percent * 100}%` }]} />
                </View>
              </View>
            );
          })}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    gap: spacing.lg,
    padding: spacing.xl,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.xl,
    backgroundColor: colors.surface,
  },
  header: {
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
  list: {
    gap: spacing.md,
  },
  row: {
    gap: spacing.sm,
  },
  rowHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.md,
  },
  subtaskTitle: {
    flex: 1,
    color: colors.text,
    ...typography.caption,
    fontWeight: '900',
  },
  countText: {
    color: colors.primary,
    ...typography.small,
    fontWeight: '900',
  },
  track: {
    height: 9,
    overflow: 'hidden',
    borderRadius: radius.pill,
    backgroundColor: colors.surfaceMuted,
  },
  fill: {
    height: '100%',
    borderRadius: radius.pill,
    backgroundColor: colors.warning,
  },
  emptyText: {
    color: colors.textMuted,
    ...typography.caption,
  },
});
