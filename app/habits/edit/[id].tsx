import { useFocusEffect } from '@react-navigation/native';
import { router, useLocalSearchParams } from 'expo-router';
import { useCallback, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { EmptyState } from '@/src/components/EmptyState';
import { HabitForm, type HabitFormValues } from '@/src/components/HabitForm';
import { PrimaryButton } from '@/src/components/PrimaryButton';
import { Screen } from '@/src/components/Screen';
import { initDatabase } from '@/src/db/database';
import { getHabitById, updateHabit, updateHabitNotificationId } from '@/src/db/habits';
import {
  cancelHabitReminderForHabit,
  rescheduleHabitReminderForHabit,
} from '@/src/notifications/notifications';
import { colors, radius, spacing, typography } from '@/src/theme';
import type { Habit } from '@/src/types/Habit';

export default function EditHabitScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const habitId = Array.isArray(id) ? id[0] : id;
  const [habit, setHabit] = useState<Habit | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

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
          const nextHabit = await getHabitById(habitId);

          if (isActive) {
            setHabit(nextHabit && !nextHabit.archived ? nextHabit : null);
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

      router.back();
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
        initialValues={habit}
        onCancel={() => router.back()}
        onSubmit={handleSubmit}
        saving={saving}
        submitTitle="Save Changes"
      />
    </Screen>
  );
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
    previousHabit.reminderTime !== values.reminderTime
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
