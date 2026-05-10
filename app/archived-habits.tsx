import { useFocusEffect } from '@react-navigation/native';
import { format } from 'date-fns';
import { useCallback, useMemo, useRef, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { BottomSheetModal } from '@/src/components/BottomSheetModal';
import { EmptyState } from '@/src/components/EmptyState';
import { HabitIcon } from '@/src/components/HabitIcon';
import { PrimaryButton } from '@/src/components/PrimaryButton';
import { Screen } from '@/src/components/Screen';
import { getAllCompletions } from '@/src/db/completions';
import { initDatabase } from '@/src/db/database';
import { getArchivedHabits, permanentlyDeleteHabit, restoreHabit } from '@/src/db/habits';
import { getAllSkips } from '@/src/db/skips';
import { getAllSubtasks } from '@/src/db/subtasks';
import { cancelHabitReminderForHabit } from '@/src/notifications/notifications';
import { colors, radius, spacing, typography } from '@/src/theme';
import type { Habit, HabitCompletion, HabitSkip, HabitSubtask } from '@/src/types/Habit';

type ArchivedHabitStats = {
  completions: number;
  skips: number;
  subtasks: number;
};

export default function ArchivedHabitsScreen() {
  const [habits, setHabits] = useState<Habit[]>([]);
  const [statsByHabitId, setStatsByHabitId] = useState<Record<string, ArchivedHabitStats>>({});
  const [deleteTarget, setDeleteTarget] = useState<Habit | null>(null);
  const [restoreTarget, setRestoreTarget] = useState<Habit | null>(null);
  const [loading, setLoading] = useState(true);
  const [savingHabitId, setSavingHabitId] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const hasLoadedArchivedHabitsRef = useRef(false);

  const deleteTargetStats = useMemo(
    () => (deleteTarget ? statsByHabitId[deleteTarget.id] : null),
    [deleteTarget, statsByHabitId]
  );
  const restoreTargetStats = useMemo(
    () => (restoreTarget ? statsByHabitId[restoreTarget.id] : null),
    [restoreTarget, statsByHabitId]
  );

  const loadArchivedHabits = useCallback(async (options?: { showLoading?: boolean }) => {
    const showLoading = options?.showLoading ?? !hasLoadedArchivedHabitsRef.current;

    if (showLoading) {
      setLoading(true);
    }

    setErrorMessage(null);
    await initDatabase();

    const [archivedHabits, completions, skips, subtasks] = await Promise.all([
      getArchivedHabits(),
      getAllCompletions(),
      getAllSkips(),
      getAllSubtasks(),
    ]);

    setHabits(archivedHabits);
    setStatsByHabitId(createStatsByHabitId(archivedHabits, completions, skips, subtasks));
    hasLoadedArchivedHabitsRef.current = true;
    setLoading(false);
  }, []);

  useFocusEffect(
    useCallback(() => {
      let isActive = true;

      async function setup() {
        const shouldShowInitialLoading = !hasLoadedArchivedHabitsRef.current;

        try {
          await loadArchivedHabits({ showLoading: shouldShowInitialLoading });
        } catch (error) {
          console.error('Failed to load archived habits', error);

          if (isActive) {
            setErrorMessage('Could not load archived habits.');
            if (shouldShowInitialLoading) {
              setLoading(false);
            }
          }
        }
      }

      setup();

      return () => {
        isActive = false;
      };
    }, [loadArchivedHabits])
  );

  async function handleRestore() {
    if (!restoreTarget) {
      return;
    }

    try {
      setSavingHabitId(restoreTarget.id);
      setMessage(null);
      await restoreHabit(restoreTarget.id);
      setHabits((current) => current.filter((item) => item.id !== restoreTarget.id));
      setRestoreTarget(null);
      setMessage(`Restored ${restoreTarget.name}. Reminders are off until you re-enable them.`);
    } catch (error) {
      console.error('Failed to restore archived habit', error);
      setMessage('Could not restore that habit. Please try again.');
    } finally {
      setSavingHabitId(null);
    }
  }

  async function handleDeleteForever() {
    if (!deleteTarget) {
      return;
    }

    try {
      setSavingHabitId(deleteTarget.id);
      setMessage(null);
      await cancelHabitReminderForHabit(deleteTarget);
      await permanentlyDeleteHabit(deleteTarget.id);
      setHabits((current) => current.filter((item) => item.id !== deleteTarget.id));
      setDeleteTarget(null);
      setMessage('Archived habit deleted forever.');
    } catch (error) {
      console.error('Failed to permanently delete archived habit', error);
      setMessage('Could not delete that habit. Please try again.');
    } finally {
      setSavingHabitId(null);
    }
  }

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
        <Text style={styles.eyebrow}>Data</Text>
        <Text style={styles.title}>Archived habits</Text>
        <Text style={styles.subtitle}>
          Restore habits you paused, or permanently delete habits you no longer want.
        </Text>
      </View>

      {errorMessage ? (
        <View style={styles.errorBanner}>
          <Text style={styles.errorText}>{errorMessage}</Text>
          <PrimaryButton
            onPress={() => loadArchivedHabits({ showLoading: true })}
            title="Retry"
            variant="secondary"
          />
        </View>
      ) : null}

      {message ? (
        <View style={styles.messageCard}>
          <Text style={styles.message}>{message}</Text>
        </View>
      ) : null}

      {habits.length === 0 ? (
        <EmptyState
          title="No archived habits"
          message="Archived habits will appear here when you pause them."
        />
      ) : (
        <View style={styles.habitList}>
          {habits.map((habit) => {
            const habitStats = statsByHabitId[habit.id] ?? {
              completions: 0,
              skips: 0,
              subtasks: 0,
            };
            const busy = savingHabitId === habit.id;

            return (
              <View key={habit.id} style={styles.habitCard}>
                <View style={styles.habitHeader}>
                  <HabitIcon
                    color={habit.color ?? colors.habitGreen}
                    fallbackIcon={habit.icon}
                    iconLibrary={habit.iconLibrary}
                    iconType={habit.iconType}
                    iconValue={habit.iconValue}
                    size={48}
                  />
                  <View style={styles.habitText}>
                    <Text numberOfLines={2} style={styles.habitName}>
                      {habit.name}
                    </Text>
                    {habit.description ? (
                      <Text numberOfLines={2} style={styles.habitDescription}>
                        {habit.description}
                      </Text>
                    ) : null}
                    <Text style={styles.archivedDate}>
                      Archived {formatArchivedDate(habit.updatedAt)}
                    </Text>
                  </View>
                </View>

                <View style={styles.metaRow}>
                  <MetaPill label="Done" value={String(habitStats.completions)} />
                  <MetaPill label="Skips" value={String(habitStats.skips)} />
                  <MetaPill label="Subtasks" value={String(habitStats.subtasks)} />
                </View>

                <View style={styles.cardActions}>
                  <PrimaryButton
                    disabled={busy}
                    onPress={() => setRestoreTarget(habit)}
                    title="Restore"
                  />
                  <PrimaryButton
                    disabled={busy}
                    onPress={() => setDeleteTarget(habit)}
                    title="Delete forever"
                    variant="danger"
                  />
                </View>
              </View>
            );
          })}
        </View>
      )}

      <BottomSheetModal
        onRequestClose={() => {
          if (!savingHabitId) {
            setDeleteTarget(null);
          }
        }}
        sheetStyle={styles.deleteSheet}
        visible={Boolean(deleteTarget)}>
        <View style={styles.deleteHeader}>
          <View style={styles.deleteIcon}>
            <Text style={styles.deleteIconText}>!</Text>
          </View>
          <View style={styles.deleteCopy}>
            <Text style={styles.deleteTitle}>Delete forever?</Text>
            <Text style={styles.deleteMessage}>
              This removes the habit and all of its history. This cannot be undone.
            </Text>
          </View>
        </View>
        {deleteTarget ? (
          <View style={styles.deletePreview}>
            <HabitIcon
              color={deleteTarget.color ?? colors.habitGreen}
              fallbackIcon={deleteTarget.icon}
              iconLibrary={deleteTarget.iconLibrary}
              iconType={deleteTarget.iconType}
              iconValue={deleteTarget.iconValue}
              size={44}
            />
            <View style={styles.deletePreviewText}>
              <Text numberOfLines={1} style={styles.deletePreviewName}>
                {deleteTarget.name}
              </Text>
              <Text style={styles.deletePreviewMeta}>
                {deleteTargetStats?.completions ?? 0} completions ·{' '}
                {deleteTargetStats?.skips ?? 0} skips
              </Text>
            </View>
          </View>
        ) : null}
        <View style={styles.cardActions}>
          <PrimaryButton
            disabled={Boolean(savingHabitId)}
            onPress={() => setDeleteTarget(null)}
            title="Cancel"
            variant="secondary"
          />
          <PrimaryButton
            disabled={Boolean(savingHabitId)}
            onPress={handleDeleteForever}
            title={savingHabitId ? 'Deleting...' : 'Delete forever'}
            variant="danger"
          />
        </View>
      </BottomSheetModal>

      <BottomSheetModal
        onRequestClose={() => {
          if (!savingHabitId) {
            setRestoreTarget(null);
          }
        }}
        sheetStyle={styles.deleteSheet}
        visible={Boolean(restoreTarget)}>
        <View style={styles.deleteHeader}>
          <View style={[styles.deleteIcon, styles.restoreIcon]}>
            <Text style={[styles.deleteIconText, styles.restoreIconText]}>R</Text>
          </View>
          <View style={styles.deleteCopy}>
            <Text style={styles.deleteTitle}>Restore habit?</Text>
            <Text style={styles.deleteMessage}>
              This makes the habit active again with its original history.
            </Text>
          </View>
        </View>
        {restoreTarget ? (
          <View style={styles.deletePreview}>
            <HabitIcon
              color={restoreTarget.color ?? colors.habitGreen}
              fallbackIcon={restoreTarget.icon}
              iconLibrary={restoreTarget.iconLibrary}
              iconType={restoreTarget.iconType}
              iconValue={restoreTarget.iconValue}
              size={44}
            />
            <View style={styles.deletePreviewText}>
              <Text numberOfLines={1} style={styles.deletePreviewName}>
                {restoreTarget.name}
              </Text>
              <Text style={styles.deletePreviewMeta}>
                {restoreTargetStats?.completions ?? 0} completions ·{' '}
                {restoreTargetStats?.skips ?? 0} skips
              </Text>
            </View>
          </View>
        ) : null}
        <View style={styles.cardActions}>
          <PrimaryButton
            disabled={Boolean(savingHabitId)}
            onPress={() => setRestoreTarget(null)}
            title="Cancel"
            variant="secondary"
          />
          <PrimaryButton
            disabled={Boolean(savingHabitId)}
            onPress={handleRestore}
            title={savingHabitId ? 'Restoring...' : 'Restore'}
          />
        </View>
      </BottomSheetModal>
    </Screen>
  );
}

function MetaPill({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.metaPill}>
      <Text style={styles.metaValue}>{value}</Text>
      <Text style={styles.metaLabel}>{label}</Text>
    </View>
  );
}

function createStatsByHabitId(
  habits: Habit[],
  completions: HabitCompletion[],
  skips: HabitSkip[],
  subtasks: HabitSubtask[]
) {
  const habitIds = new Set(habits.map((habit) => habit.id));
  const stats = Object.fromEntries(
    habits.map((habit) => [
      habit.id,
      {
        completions: 0,
        skips: 0,
        subtasks: 0,
      },
    ])
  ) as Record<string, ArchivedHabitStats>;

  for (const completion of completions) {
    if (habitIds.has(completion.habitId)) {
      stats[completion.habitId].completions += 1;
    }
  }

  for (const skip of skips) {
    if (habitIds.has(skip.habitId)) {
      stats[skip.habitId].skips += 1;
    }
  }

  for (const subtask of subtasks) {
    if (habitIds.has(subtask.habitId) && !subtask.archived) {
      stats[subtask.habitId].subtasks += 1;
    }
  }

  return stats;
}

function formatArchivedDate(value: string) {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return 'recently';
  }

  return format(date, 'MMM d, yyyy');
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
  habitList: {
    gap: spacing.md,
  },
  habitCard: {
    gap: spacing.lg,
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.xl,
    backgroundColor: colors.surface,
  },
  habitHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  habitText: {
    flex: 1,
    gap: spacing.xs,
  },
  habitName: {
    color: colors.text,
    ...typography.body,
    fontWeight: '900',
  },
  habitDescription: {
    color: colors.textMuted,
    ...typography.caption,
  },
  archivedDate: {
    color: colors.textSubtle,
    ...typography.small,
    fontWeight: '800',
  },
  metaRow: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  metaPill: {
    flex: 1,
    gap: 2,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.sm,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.lg,
    backgroundColor: colors.surfaceElevated,
  },
  metaValue: {
    color: colors.text,
    ...typography.body,
    fontWeight: '900',
  },
  metaLabel: {
    color: colors.textMuted,
    ...typography.small,
    fontWeight: '800',
  },
  cardActions: {
    gap: spacing.md,
  },
  messageCard: {
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.lg,
    backgroundColor: colors.surfaceElevated,
  },
  message: {
    color: colors.text,
    ...typography.caption,
    fontWeight: '600',
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
  deleteSheet: {
    gap: spacing.lg,
    padding: spacing.xl,
    borderTopLeftRadius: radius.xl,
    borderTopRightRadius: radius.xl,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  deleteHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  deleteIcon: {
    width: 46,
    height: 46,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: colors.destructive,
    borderRadius: 23,
    backgroundColor: colors.surfaceElevated,
  },
  deleteIconText: {
    color: colors.destructive,
    ...typography.heading,
    fontWeight: '900',
  },
  restoreIcon: {
    borderColor: colors.primary,
  },
  restoreIconText: {
    color: colors.primary,
  },
  deleteCopy: {
    flex: 1,
    gap: spacing.xs,
  },
  deleteTitle: {
    color: colors.text,
    ...typography.heading,
  },
  deleteMessage: {
    color: colors.textMuted,
    ...typography.body,
  },
  deletePreview: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.lg,
    backgroundColor: colors.surfaceElevated,
  },
  deletePreviewText: {
    flex: 1,
    gap: spacing.xs,
  },
  deletePreviewName: {
    color: colors.text,
    ...typography.body,
    fontWeight: '900',
  },
  deletePreviewMeta: {
    color: colors.textMuted,
    ...typography.caption,
    fontWeight: '700',
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
