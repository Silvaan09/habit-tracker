import { router } from 'expo-router';
import { useState } from 'react';
import { Alert, StyleSheet, Text, View } from 'react-native';

import { HabitForm, type HabitFormValues } from '@/src/components/HabitForm';
import { Screen } from '@/src/components/Screen';
import { createHabit, updateHabitNotificationId } from '@/src/db/habits';
import { createSubtask } from '@/src/db/subtasks';
import { rescheduleHabitReminderForHabit } from '@/src/notifications/notifications';
import { colors, radius, spacing, typography } from '@/src/theme';

export default function NewHabitScreen() {
  const [saving, setSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

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
          Alert.alert(
            'Reminder not scheduled',
            'Notifications are not enabled, so this reminder was not scheduled.',
            [{ text: 'OK', onPress: () => router.replace('/') }]
          );
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
    <Screen contentContainerStyle={styles.content}>
      <View style={styles.header}>
        <Text style={styles.eyebrow}>Habits</Text>
        <Text style={styles.title}>New habit</Text>
        <Text style={styles.subtitle}>
          Shape a daily habit with a color, icon, and optional local reminder.
        </Text>
      </View>

      <HabitForm
        error={errorMessage}
        onCancel={() => router.back()}
        onSubmit={handleSubmit}
        saving={saving}
        submitTitle="Save Habit"
      />
    </Screen>
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
});
