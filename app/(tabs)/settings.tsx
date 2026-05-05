import { useFocusEffect } from '@react-navigation/native';
import { useCallback, useState } from 'react';
import { Alert, Linking, Share, StyleSheet, Text, View } from 'react-native';

import { PrimaryButton } from '@/src/components/PrimaryButton';
import { Screen } from '@/src/components/Screen';
import { getAllCompletions } from '@/src/db/completions';
import { initDatabase } from '@/src/db/database';
import { getAllNumericEntries } from '@/src/db/numericEntries';
import { resetAllData } from '@/src/db/reset';
import { getAllHabits } from '@/src/db/habits';
import { getAllSkips } from '@/src/db/skips';
import { getAllSettings } from '@/src/db/settings';
import { getAllSubtaskCompletions, getAllSubtasks } from '@/src/db/subtasks';
import {
  cancelHabitReminderForHabit,
  getNotificationPermissionStatus,
  requestNotificationPermissions,
} from '@/src/notifications/notifications';
import { colors, radius, spacing, typography } from '@/src/theme';

export default function SettingsScreen() {
  const [permissionStatus, setPermissionStatus] = useState('loading');
  const [requesting, setRequesting] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [resetting, setResetting] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const loadPermissionStatus = useCallback(async () => {
    try {
      setPermissionStatus(await getNotificationPermissionStatus());
    } catch (error) {
      console.error('Failed to load notification permission status', error);
      setPermissionStatus('unavailable');
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadPermissionStatus();
    }, [loadPermissionStatus])
  );

  async function handleRequestPermission() {
    try {
      setRequesting(true);
      setMessage(null);
      const granted = await requestNotificationPermissions();
      await loadPermissionStatus();

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

  async function handleExportData() {
    try {
      setExporting(true);
      setMessage(null);
      await initDatabase();

      const [
        habits,
        completions,
        skips,
        subtasks,
        subtaskCompletions,
        numericEntries,
        settings,
      ] = await Promise.all([
        getAllHabits(),
        getAllCompletions(),
        getAllSkips(),
        getAllSubtasks(),
        getAllSubtaskCompletions(),
        getAllNumericEntries(),
        getAllSettings(),
      ]);
      const exportJson = JSON.stringify(
        {
          exportedAt: new Date().toISOString(),
          habits,
          habit_completions: completions,
          habit_skips: skips,
          habit_subtasks: subtasks,
          habit_subtask_completions: subtaskCompletions,
          habit_numeric_entries: numericEntries,
          settings,
        },
        null,
        2
      );

      await Share.share({
        title: 'Habit Tracker export',
        message: exportJson,
      });
      setMessage('Your local data export is ready to share or save.');
    } catch (error) {
      console.error('Failed to export local data', error);
      setMessage('Could not export local data. Please try again.');
    } finally {
      setExporting(false);
    }
  }

  function confirmResetAllData() {
    Alert.alert(
      'Reset all local data?',
      'This deletes all habits, completions, skips, and app settings from this device. Historical completions will be removed. This cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Reset data',
          style: 'destructive',
          onPress: handleResetAllData,
        },
      ]
    );
  }

  async function handleResetAllData() {
    try {
      setResetting(true);
      setMessage(null);
      await initDatabase();
      const habits = await getAllHabits();
      const cancelResults = await Promise.allSettled(
        habits.map((habit) => cancelHabitReminderForHabit(habit))
      );

      for (const result of cancelResults) {
        if (result.status === 'rejected') {
          console.error('Failed to cancel a habit reminder during reset', result.reason);
        }
      }

      await resetAllData();
      setMessage('All local habit data has been reset on this device.');
    } catch (error) {
      console.error('Failed to reset all local data', error);
      setMessage('Could not reset local data. Please try again.');
    } finally {
      setResetting(false);
    }
  }

  return (
    <Screen contentContainerStyle={styles.content}>
      <View style={styles.header}>
        <Text style={styles.eyebrow}>Settings</Text>
        <Text style={styles.title}>Settings</Text>
        <Text style={styles.subtitle}>Manage reminders and local data.</Text>
      </View>

      {message ? (
        <View style={styles.messageCard}>
          <Text style={styles.message}>{message}</Text>
        </View>
      ) : null}

      <View style={styles.sectionCard}>
        <View style={styles.sectionHeader}>
          <View>
            <Text style={styles.sectionEyebrow}>Notifications</Text>
            <Text style={styles.cardTitle}>Local reminders</Text>
          </View>
          <View style={styles.statusPill}>
            <Text style={styles.statusValue}>{permissionStatus}</Text>
          </View>
        </View>

        <View style={styles.statusRow}>
          <Text style={styles.statusLabel}>Permission status</Text>
          <Text style={styles.statusDescription}>
            {permissionStatus === 'granted'
              ? 'Reminders can be scheduled on this device.'
              : 'Enable notifications to schedule habit reminders.'}
          </Text>
        </View>

        <View style={styles.actions}>
          <PrimaryButton
            disabled={requesting}
            onPress={handleRequestPermission}
            title={requesting ? 'Requesting...' : 'Request permission'}
          />
          <PrimaryButton
            disabled={requesting}
            onPress={() => Linking.openSettings()}
            title="Open system settings"
            variant="secondary"
          />
        </View>
      </View>

      <View style={styles.sectionCard}>
        <View style={styles.sectionHeader}>
          <View>
            <Text style={styles.sectionEyebrow}>Data</Text>
            <Text style={styles.cardTitle}>Local data</Text>
          </View>
        </View>
        <Text style={styles.bodyText}>
          Your habits, completions, and skips stay on this device. Export creates a local JSON
          snapshot; reset deletes local habit data after confirmation.
        </Text>
        <View style={styles.actions}>
          <PrimaryButton
            disabled={exporting || resetting}
            onPress={handleExportData}
            title={exporting ? 'Preparing export...' : 'Export local data'}
            variant="secondary"
          />
          <PrimaryButton
            disabled={exporting || resetting}
            onPress={confirmResetAllData}
            title={resetting ? 'Resetting...' : 'Reset all data'}
            variant="danger"
          />
        </View>
      </View>

      <View style={styles.sectionCard}>
        <View style={styles.sectionHeader}>
          <View>
            <Text style={styles.sectionEyebrow}>About</Text>
            <Text style={styles.cardTitle}>Habit Tracker</Text>
          </View>
        </View>
        <View style={styles.aboutList}>
          <View style={styles.aboutRow}>
            <Text style={styles.aboutLabel}>App</Text>
            <Text style={styles.aboutValue}>A local-first habit tracker.</Text>
          </View>
          <View style={styles.aboutRow}>
            <Text style={styles.aboutLabel}>Privacy</Text>
            <Text style={styles.aboutValue}>
              Your habits are stored on this device unless you export them.
            </Text>
          </View>
          <View style={styles.aboutRow}>
            <Text style={styles.aboutLabel}>Reminders</Text>
            <Text style={styles.aboutValue}>Scheduled locally with device notifications.</Text>
          </View>
        </View>
      </View>
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
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },
  cardTitle: {
    color: colors.text,
    ...typography.heading,
  },
  statusRow: {
    gap: spacing.xs,
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.lg,
    backgroundColor: colors.surfaceElevated,
  },
  statusLabel: {
    color: colors.text,
    ...typography.caption,
    fontWeight: '900',
  },
  statusDescription: {
    color: colors.textMuted,
    ...typography.caption,
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
  actions: {
    gap: spacing.md,
  },
  bodyText: {
    color: colors.textMuted,
    ...typography.body,
  },
  aboutList: {
    gap: spacing.md,
  },
  aboutRow: {
    gap: spacing.xs,
    paddingBottom: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  aboutLabel: {
    color: colors.text,
    ...typography.caption,
    fontWeight: '900',
  },
  aboutValue: {
    color: colors.textMuted,
    ...typography.caption,
  },
});
