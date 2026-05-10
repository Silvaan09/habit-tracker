import { router } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { ConfirmActionModal } from '@/src/components/ConfirmActionModal';
import { HabitForm, type HabitFormValues } from '@/src/components/HabitForm';
import { Screen } from '@/src/components/Screen';
import { UnsavedChangesModal } from '@/src/components/UnsavedChangesModal';
import { createHabit, updateHabitNotificationId } from '@/src/db/habits';
import { createSubtask } from '@/src/db/subtasks';
import { rescheduleHabitReminderForHabit } from '@/src/notifications/notifications';
import { colors, spacing, typography } from '@/src/theme';
import { setHeaderBackHandler } from '@/src/utils/backGuard';
import { safeBack } from '@/src/utils/navigation';

export default function NewHabitScreen() {
  const [saving, setSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [formDirty, setFormDirty] = useState(false);
  const [reminderWarningVisible, setReminderWarningVisible] = useState(false);
  const [unsavedPromptVisible, setUnsavedPromptVisible] = useState(false);
  const [submitRequestKey, setSubmitRequestKey] = useState(0);

  const leaveScreen = useCallback(() => {
    safeBack('/');
  }, []);

  const promptForUnsavedChanges = useCallback(() => {
    setUnsavedPromptVisible(true);
  }, []);

  const saveFromUnsavedPrompt = useCallback(() => {
    setUnsavedPromptVisible(false);
    setSubmitRequestKey((current) => current + 1);
  }, []);

  const discardFromUnsavedPrompt = useCallback(() => {
    setUnsavedPromptVisible(false);
    leaveScreen();
  }, [leaveScreen]);

  const requestLeave = useCallback(() => {
    if (saving || !formDirty) {
      leaveScreen();
      return;
    }

    promptForUnsavedChanges();
  }, [formDirty, leaveScreen, promptForUnsavedChanges, saving]);

  useEffect(() => {
    return setHeaderBackHandler(() => {
      if (saving || !formDirty) {
        return false;
      }

      promptForUnsavedChanges();
      return true;
    });
  }, [formDirty, promptForUnsavedChanges, saving]);

  async function handleSubmit(values: HabitFormValues) {
    try {
      setSaving(true);
      setErrorMessage(null);
      const habit = await createHabit(values);

      if (values.trackingType === 'subtasks') {
        await Promise.all(
          values.subtaskTitles.map((title, index) => createSubtask(habit.id, title, index))
        );
      }

      if (habit.reminderEnabled) {
        const notificationId = await rescheduleHabitReminderForHabit(habit);
        await updateHabitNotificationId(habit.id, notificationId);

        if (!notificationId) {
          setReminderWarningVisible(true);
          return;
        }
      }

      router.replace('/');
    } catch (error) {
      console.error('Failed to create habit', error);
      setErrorMessage('Could not create that habit. Please try again.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <>
      <Screen contentContainerStyle={styles.content}>
        <View style={styles.header}>
          <Text style={styles.eyebrow}>Habits</Text>
          <Text style={styles.title}>New habit</Text>
          <Text style={styles.subtitle}>Build a habit that fits your day.</Text>
        </View>

        <HabitForm
          error={errorMessage}
          onCancel={requestLeave}
          onDirtyChange={setFormDirty}
          onSubmit={handleSubmit}
          saving={saving}
          submitRequestKey={submitRequestKey}
          submitTitle="Save Habit"
        />
      </Screen>
      <UnsavedChangesModal
        onCancel={() => setUnsavedPromptVisible(false)}
        onDiscard={discardFromUnsavedPrompt}
        onSave={saveFromUnsavedPrompt}
        saving={saving}
        visible={unsavedPromptVisible}
      />
      <ConfirmActionModal
        confirmLabel="OK"
        message="Notifications are not enabled, so this reminder was not scheduled."
        onCancel={() => router.replace('/')}
        onConfirm={() => router.replace('/')}
        showCancel={false}
        title="Reminder not scheduled"
        visible={reminderWarningVisible}
      />
    </>
  );
}

const styles = StyleSheet.create({
  content: {
    gap: spacing.xl,
    paddingBottom: spacing.xxl,
  },
  header: {
    gap: spacing.sm,
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
});
