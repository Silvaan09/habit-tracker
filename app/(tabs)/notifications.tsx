import { useFocusEffect } from '@react-navigation/native';
import { router } from 'expo-router';
import { useCallback, useMemo, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { EmptyState } from '@/src/components/EmptyState';
import { HabitIcon } from '@/src/components/HabitIcon';
import { PrimaryButton } from '@/src/components/PrimaryButton';
import { Screen } from '@/src/components/Screen';
import { initDatabase } from '@/src/db/database';
import { getActiveHabits } from '@/src/db/habits';
import {
  getNotificationPermissionStatus,
  requestNotificationPermissions,
} from '@/src/notifications/notifications';
import { colors, radius, spacing, typography } from '@/src/theme';
import type { Habit } from '@/src/types/Habit';

export default function NotificationsScreen() {
  const [habits, setHabits] = useState<Habit[]>([]);
  const [permissionStatus, setPermissionStatus] = useState('loading');
  const [loading, setLoading] = useState(true);
  const [requesting, setRequesting] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const reminderHabits = useMemo(
    () =>
      habits
        .filter((habit) => habit.reminderEnabled && habit.reminderTime)
        .sort((first, second) => (first.reminderTime ?? '').localeCompare(second.reminderTime ?? '')),
    [habits]
  );

  const loadNotificationsData = useCallback(async () => {
    setLoading(true);
    setErrorMessage(null);
    await initDatabase();

    const [activeHabits, status] = await Promise.all([
      getActiveHabits(),
      getNotificationPermissionStatus(),
    ]);

    setHabits(activeHabits);
    setPermissionStatus(status);
    setLoading(false);
  }, []);

  useFocusEffect(
    useCallback(() => {
      let isActive = true;

      async function setup() {
        try {
          await loadNotificationsData();
        } catch (error) {
          console.error('Failed to load notifications screen', error);

          if (isActive) {
            setErrorMessage('Could not load reminders.');
            setLoading(false);
          }
        }
      }

      setup();

      return () => {
        isActive = false;
      };
    }, [loadNotificationsData])
  );

  async function handleRequestPermission() {
    try {
      setRequesting(true);
      setMessage(null);
      const granted = await requestNotificationPermissions();
      setPermissionStatus(await getNotificationPermissionStatus());
      setMessage(
        granted
          ? 'Notifications are enabled for habit reminders.'
          : 'Notifications are not enabled, so reminders cannot be scheduled.'
      );
    } catch (error) {
      console.error('Failed to request notification permission', error);
      setMessage('Could not request notification permission on this device.');
    } finally {
      setRequesting(false);
    }
  }

  async function handleRetry() {
    try {
      await loadNotificationsData();
    } catch (error) {
      console.error('Failed to retry notifications screen', error);
      setErrorMessage('Still could not load reminders. Please try again.');
      setLoading(false);
    }
  }

  if (loading) {
    return (
      <Screen contentContainerStyle={[styles.content, styles.centeredState]}>
        <Text style={styles.stateTitle}>Loading reminders...</Text>
      </Screen>
    );
  }

  return (
    <Screen contentContainerStyle={styles.content}>
      <View style={styles.header}>
        <Text style={styles.eyebrow}>Notifications</Text>
        <Text style={styles.title}>Reminders</Text>
        <Text style={styles.subtitle}>Review local reminder times and notification access.</Text>
      </View>

      {errorMessage ? (
        <View style={styles.errorBanner}>
          <Text style={styles.errorText}>{errorMessage}</Text>
          <PrimaryButton onPress={handleRetry} title="Retry" variant="secondary" />
        </View>
      ) : null}

      {message ? (
        <View style={styles.messageCard}>
          <Text style={styles.message}>{message}</Text>
        </View>
      ) : null}

      <View style={styles.sectionCard}>
        <View style={styles.sectionHeader}>
          <View>
            <Text style={styles.sectionEyebrow}>Permission</Text>
            <Text style={styles.cardTitle}>Device notifications</Text>
          </View>
          <View style={styles.statusPill}>
            <Text style={styles.statusValue}>{permissionStatus}</Text>
          </View>
        </View>
        <Text style={styles.bodyText}>
          {permissionStatus === 'granted'
            ? 'Your device can show scheduled habit reminders.'
            : 'Enable notifications to receive scheduled habit reminders.'}
        </Text>
        <View style={styles.actions}>
          <PrimaryButton
            disabled={requesting}
            onPress={handleRequestPermission}
            title={requesting ? 'Requesting...' : 'Request permission'}
          />
          <PrimaryButton
            onPress={() => router.push('/settings')}
            title="Open Settings"
            variant="secondary"
          />
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Upcoming reminders</Text>
        {reminderHabits.length === 0 ? (
          <EmptyState
            title="No reminders set"
            message="Turn on reminders from a habit's edit screen to see them here."
          />
        ) : (
          <View style={styles.reminderList}>
            {reminderHabits.map((habit) => (
              <View key={habit.id} style={styles.reminderRow}>
                <HabitIcon
                  color={habit.color ?? colors.habitGreen}
                  fallbackIcon={habit.icon ?? habit.name.charAt(0).toUpperCase()}
                  iconLibrary={habit.iconLibrary}
                  iconType={habit.iconType}
                  iconValue={habit.iconValue}
                  size={44}
                />
                <View style={styles.reminderText}>
                  <Text style={styles.reminderName}>{habit.name}</Text>
                  <Text style={styles.reminderMeta}>Daily at {habit.reminderTime}</Text>
                </View>
                <View style={styles.timePill}>
                  <Text style={styles.timeText}>{habit.reminderTime}</Text>
                </View>
              </View>
            ))}
          </View>
        )}
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: {
    gap: spacing.xl,
    paddingBottom: 112,
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
  sectionCard: {
    gap: spacing.lg,
    padding: spacing.xl,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.xl,
    backgroundColor: colors.surface,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: spacing.md,
  },
  sectionEyebrow: {
    color: colors.primary,
    ...typography.small,
    fontWeight: '900',
    textTransform: 'uppercase',
  },
  cardTitle: {
    color: colors.text,
    ...typography.heading,
  },
  statusPill: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderWidth: 1,
    borderColor: colors.primary,
    borderRadius: radius.pill,
    backgroundColor: colors.primaryMuted,
  },
  statusValue: {
    color: colors.primary,
    ...typography.small,
    fontWeight: '900',
    textTransform: 'capitalize',
  },
  bodyText: {
    color: colors.textMuted,
    ...typography.body,
  },
  actions: {
    gap: spacing.md,
  },
  section: {
    gap: spacing.md,
  },
  sectionTitle: {
    color: colors.text,
    ...typography.heading,
  },
  reminderList: {
    gap: spacing.md,
  },
  reminderRow: {
    minHeight: 82,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.xl,
    backgroundColor: colors.surface,
  },
  reminderText: {
    flex: 1,
    gap: spacing.xs,
  },
  reminderName: {
    color: colors.text,
    ...typography.body,
    fontWeight: '900',
  },
  reminderMeta: {
    color: colors.textMuted,
    ...typography.caption,
  },
  timePill: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radius.pill,
    backgroundColor: colors.primaryMuted,
  },
  timeText: {
    color: colors.primary,
    ...typography.caption,
    fontWeight: '900',
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
  centeredState: {
    justifyContent: 'center',
  },
  stateTitle: {
    color: colors.text,
    ...typography.heading,
    textAlign: 'center',
  },
});
