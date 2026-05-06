import { useState } from 'react';
import { Alert, Modal, Share, StyleSheet, Text, TextInput, View } from 'react-native';

import { PrimaryButton } from '@/src/components/PrimaryButton';
import { Screen } from '@/src/components/Screen';
import { getAllCompletions } from '@/src/db/completions';
import { initDatabase } from '@/src/db/database';
import {
  parseImportedLocalData,
  replaceAllDataWithImportedData,
  type ImportedLocalData,
} from '@/src/db/importData';
import { getAllNumericEntries } from '@/src/db/numericEntries';
import { resetAllData } from '@/src/db/reset';
import { getAllHabits } from '@/src/db/habits';
import { getAllSkips } from '@/src/db/skips';
import { getAllSettings } from '@/src/db/settings';
import { getAllSubtaskCompletions, getAllSubtasks } from '@/src/db/subtasks';
import { cancelHabitReminderForHabit } from '@/src/notifications/notifications';
import { colors, radius, spacing, typography } from '@/src/theme';

export default function SettingsScreen() {
  const [exporting, setExporting] = useState(false);
  const [importing, setImporting] = useState(false);
  const [importModalVisible, setImportModalVisible] = useState(false);
  const [importJsonText, setImportJsonText] = useState('');
  const [importErrorMessage, setImportErrorMessage] = useState<string | null>(null);
  const [resetting, setResetting] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

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

  function openImportModal() {
    setImportJsonText('');
    setImportErrorMessage(null);
    setImportModalVisible(true);
  }

  function confirmImportData() {
    let importedData: ImportedLocalData;

    try {
      importedData = parseImportedLocalData(importJsonText);
      setImportErrorMessage(null);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Could not read that import.';

      setImportErrorMessage(message);
      return;
    }

    Alert.alert(
      'Replace local data?',
      'This will replace all current local habit data on this device with the pasted import. Existing habits, completions, skips, and settings will be removed first.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Replace data',
          style: 'destructive',
          onPress: () => handleImportData(importedData),
        },
      ]
    );
  }

  async function handleImportData(importedData: ImportedLocalData) {
    try {
      setImporting(true);
      setMessage(null);
      await initDatabase();
      const habits = await getAllHabits();
      const cancelResults = await Promise.allSettled(
        habits.map((habit) => cancelHabitReminderForHabit(habit))
      );

      for (const result of cancelResults) {
        if (result.status === 'rejected') {
          console.error('Failed to cancel a habit reminder during import', result.reason);
        }
      }

      await replaceAllDataWithImportedData(importedData);
      setImportModalVisible(false);
      setImportJsonText('');
      setImportErrorMessage(null);
      setMessage(
        'Import complete. Reminder schedules were disabled during import; re-enable reminders on habits that need them.'
      );
    } catch (error) {
      console.error('Failed to import local data', error);
      setImportErrorMessage('Could not import local data. Check the JSON and try again.');
    } finally {
      setImporting(false);
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
        <Text style={styles.subtitle}>Manage local data and app info.</Text>
      </View>

      {message ? (
        <View style={styles.messageCard}>
          <Text style={styles.message}>{message}</Text>
        </View>
      ) : null}

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
            disabled={exporting || importing || resetting}
            onPress={handleExportData}
            title={exporting ? 'Preparing export...' : 'Export local data'}
            variant="secondary"
          />
          <PrimaryButton
            disabled={exporting || importing || resetting}
            onPress={openImportModal}
            title={importing ? 'Importing...' : 'Import local data'}
            variant="secondary"
          />
          <PrimaryButton
            disabled={exporting || importing || resetting}
            onPress={confirmResetAllData}
            title={resetting ? 'Resetting...' : 'Reset all data'}
            variant="danger"
          />
        </View>
      </View>

      <Modal
        animationType="slide"
        onRequestClose={() => {
          if (!importing) {
            setImportModalVisible(false);
          }
        }}
        transparent
        visible={importModalVisible}>
        <View style={styles.importModalBackdrop}>
          <View style={styles.importModalCard}>
            <View style={styles.sectionHeader}>
              <View>
                <Text style={styles.sectionEyebrow}>Import</Text>
                <Text style={styles.cardTitle}>Paste export JSON</Text>
              </View>
            </View>
            <Text style={styles.bodyText}>
              Replace mode only. The JSON is validated before anything is written.
            </Text>
            <TextInput
              accessibilityLabel="Paste exported JSON"
              autoCapitalize="none"
              autoCorrect={false}
              editable={!importing}
              multiline
              onChangeText={(value) => {
                setImportJsonText(value);
                setImportErrorMessage(null);
              }}
              placeholder="Paste your exported JSON here"
              placeholderTextColor={colors.textSubtle}
              style={styles.importInput}
              value={importJsonText}
            />
            {importErrorMessage ? (
              <Text style={styles.importErrorText}>{importErrorMessage}</Text>
            ) : null}
            <View style={styles.actions}>
              <PrimaryButton
                disabled={importing}
                onPress={() => setImportModalVisible(false)}
                title="Cancel"
                variant="secondary"
              />
              <PrimaryButton
                disabled={importing || importJsonText.trim().length === 0}
                onPress={confirmImportData}
                title={importing ? 'Importing...' : 'Import and replace'}
                variant="danger"
              />
            </View>
          </View>
        </View>
      </Modal>

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
  importModalBackdrop: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0, 0, 0, 0.72)',
  },
  importModalCard: {
    maxHeight: '88%',
    gap: spacing.lg,
    padding: spacing.xl,
    borderTopLeftRadius: radius.xl,
    borderTopRightRadius: radius.xl,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  importInput: {
    minHeight: 260,
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.lg,
    color: colors.text,
    backgroundColor: colors.surfaceElevated,
    textAlignVertical: 'top',
    ...typography.caption,
  },
  importErrorText: {
    color: colors.destructive,
    ...typography.caption,
    fontWeight: '700',
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
