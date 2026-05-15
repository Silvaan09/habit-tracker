import { useFocusEffect } from '@react-navigation/native';
import { router, useLocalSearchParams } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { EmptyState } from '@/src/components/EmptyState';
import { HabitForm, type HabitFormValues } from '@/src/components/HabitForm';
import { PrimaryButton } from '@/src/components/PrimaryButton';
import { Screen } from '@/src/components/Screen';
import { UnsavedChangesModal } from '@/src/components/UnsavedChangesModal';
import { initDatabase } from '@/src/db/database';
import { getHabitById, updateHabit, updateHabitNotificationId } from '@/src/db/habits';
import {
  archiveSubtask,
  createSubtask,
  getSubtasksForHabit,
  updateSubtask,
} from '@/src/db/subtasks';
import {
  cancelHabitReminderForHabit,
  rescheduleHabitReminderForHabit,
} from '@/src/notifications/notifications';
import { colors, radius, spacing, typography } from '@/src/theme';
import type { Habit, HabitSubtask } from '@/src/types/Habit';
import { setHeaderBackHandler } from '@/src/utils/backGuard';
import { safeBack } from '@/src/utils/navigation';

export default function EditHabitScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const habitId = Array.isArray(id) ? id[0] : id;
  const [habit, setHabit] = useState<Habit | null>(null);
  const [subtasks, setSubtasks] = useState<HabitSubtask[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [formDirty, setFormDirty] = useState(false);
  const [unsavedPromptVisible, setUnsavedPromptVisible] = useState(false);
  const [submitRequestKey, setSubmitRequestKey] = useState(0);
  const fallbackRoute = useCallback(() => {
    safeBack({ pathname: '/habits/[id]', params: { id: habitId ?? '' } });
  }, [habitId]);

  const promptForUnsavedChanges = useCallback(() => {
    setUnsavedPromptVisible(true);
  }, []);

  const saveFromUnsavedPrompt = useCallback(() => {
    setUnsavedPromptVisible(false);
    setSubmitRequestKey((current) => current + 1);
  }, []);

  const discardFromUnsavedPrompt = useCallback(() => {
    setUnsavedPromptVisible(false);
    fallbackRoute();
  }, [fallbackRoute]);

  const requestLeave = useCallback(() => {
    if (saving || !formDirty) {
      fallbackRoute();
      return;
    }

    promptForUnsavedChanges();
  }, [fallbackRoute, formDirty, promptForUnsavedChanges, saving]);

  useEffect(() => {
    return setHeaderBackHandler(() => {
      if (saving || !formDirty) {
        return false;
      }

      promptForUnsavedChanges();
      return true;
    });
  }, [formDirty, promptForUnsavedChanges, saving]);

  useFocusEffect(
    useCallback(() => {
      let isActive = true;

      async function loadHabit() {
        if (!habitId) {
          setLoading(false);
          return;
        }

        try {
          setLoading(true);
          setErrorMessage(null);
          await initDatabase();
          const [nextHabit, nextSubtasks] = await Promise.all([
            getHabitById(habitId),
            getSubtasksForHabit(habitId),
          ]);

          if (isActive) {
            setHabit(nextHabit && !nextHabit.archived ? nextHabit : null);
            setSubtasks(nextHabit?.archived ? [] : nextSubtasks);
          }
        } catch (error) {
          console.error('Failed to load habit for editing', error);

          if (isActive) {
            setErrorMessage('Could not load this habit.');
          }
        } finally {
          if (isActive) {
            setLoading(false);
          }
        }
      }

      loadHabit();

      return () => {
        isActive = false;
      };
    }, [habitId])
  );

  async function handleSubmit(values: HabitFormValues) {
    if (!habitId) {
      return;
    }

    try {
      setSaving(true);
      setErrorMessage(null);
      await updateHabit(habitId, values);
      await syncSubtasksForHabit(habitId, subtasks, values);
      const updatedHabit = await getHabitById(habitId);

      if (!updatedHabit) {
        setErrorMessage('Could not reload this habit after saving.');
        return;
      }

      if (habit && shouldCancelReminder(habit, values)) {
        await cancelHabitReminderForHabit(habit);
        await updateHabitNotificationId(habitId, null);
      } else if (habit && shouldRescheduleReminder(habit, values)) {
        const notificationId = await rescheduleHabitReminderForHabit(updatedHabit);
        await updateHabitNotificationId(habitId, notificationId);

        if (values.reminderEnabled && !notificationId) {
          setErrorMessage('Notifications are not enabled, so this reminder was not scheduled.');
          return;
        }
      }

      safeBack({ pathname: '/habits/[id]', params: { id: habitId } });
    } catch (error) {
      console.error('Failed to update habit', error);
      setErrorMessage('Could not save your changes. Please try again.');
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <Screen contentContainerStyle={[styles.content, styles.centeredState]}>
        <Text style={styles.stateTitle}>Loading habit...</Text>
      </Screen>
    );
  }

  if (!habit) {
    return (
      <Screen contentContainerStyle={styles.content}>
        <EmptyState
          title="Habit not found"
          message="This habit may have been archived or removed from the active list."
        />
        <PrimaryButton onPress={() => router.replace('/')} title="Back to Today" />
      </Screen>
    );
  }

  return (
    <>
      <Screen contentContainerStyle={styles.content}>
        <View style={styles.header}>
          <Text style={styles.eyebrow}>Habits</Text>
          <Text style={styles.title}>Edit habit</Text>
          <Text style={styles.subtitle}>
            Adjust the look, name, and reminder without losing your history.
          </Text>
        </View>

        <HabitForm
          error={errorMessage}
          initialValues={{
            ...habit,
            subtaskTitles:
              habit.trackingType === 'subtasks'
                ? subtasks.map((subtask) => subtask.title)
                : undefined,
          }}
          onCancel={requestLeave}
          onDirtyChange={setFormDirty}
          onSubmit={handleSubmit}
          saving={saving}
          submitRequestKey={submitRequestKey}
          submitTitle="Save Changes"
        />
      </Screen>
      <UnsavedChangesModal
        onCancel={() => setUnsavedPromptVisible(false)}
        onDiscard={discardFromUnsavedPrompt}
        onSave={saveFromUnsavedPrompt}
        saving={saving}
        visible={unsavedPromptVisible}
      />
    </>
  );
}

async function syncSubtasksForHabit(
  habitId: string,
  existingSubtasks: HabitSubtask[],
  values: HabitFormValues
) {
  if (values.trackingType !== 'subtasks') {
    await Promise.all(existingSubtasks.map((subtask) => archiveSubtask(subtask.id)));
    return;
  }

  const titles = values.subtaskTitles;
  const updates = titles.map((title, index) => {
    const existingSubtask = existingSubtasks[index];

    if (existingSubtask) {
      return updateSubtask(existingSubtask.id, { title, position: index, required: true });
    }

    return createSubtask(habitId, title, index);
  });
  const archives = existingSubtasks
    .slice(titles.length)
    .map((subtask) => archiveSubtask(subtask.id));

  await Promise.all([...updates, ...archives]);
}

function shouldCancelReminder(previousHabit: Habit, values: HabitFormValues) {
  return previousHabit.reminderEnabled && !values.reminderEnabled;
}

function shouldRescheduleReminder(previousHabit: Habit, values: HabitFormValues) {
  if (!values.reminderEnabled) {
    return false;
  }

  return (
    !previousHabit.reminderEnabled ||
    !previousHabit.notificationId ||
    previousHabit.name !== values.name ||
    previousHabit.reminderTime !== values.reminderTime ||
    previousHabit.scheduleType !== values.scheduleType ||
    previousHabit.scheduleWeekdays?.join(',') !== values.scheduleWeekdays?.join(',') ||
    previousHabit.scheduleOnDays !== values.scheduleOnDays ||
    previousHabit.scheduleOffDays !== values.scheduleOffDays ||
    previousHabit.scheduleStartDate !== values.scheduleStartDate
  );
}

const styles = StyleSheet.create({
  content: {
    gap: spacing.xl,
    paddingBottom: spacing.xxl,
  },
  header: {
    gap: spacing.sm,
    padding: spacing.xl,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.xl,
    backgroundColor: colors.surface,
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
  centeredState: {
    justifyContent: 'center',
  },
  stateTitle: {
    color: colors.text,
    ...typography.heading,
    textAlign: 'center',
  },
});
