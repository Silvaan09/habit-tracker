import { useState, useCallback, useMemo } from 'react';
import { Pressable, Share, StyleSheet, Text, TextInput, View } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { router } from 'expo-router';

import { BottomSheetModal } from '@/src/components/BottomSheetModal';
import { ConfirmActionModal } from '@/src/components/ConfirmActionModal';
import { PrimaryButton } from '@/src/components/PrimaryButton';
import { Screen } from '@/src/components/Screen';
import { getAllCompletions, getCompletionsForHabit } from '@/src/db/completions';
import { initDatabase } from '@/src/db/database';
import {
  parseImportedLocalData,
  replaceAllDataWithImportedData,
  type ImportedLocalData,
} from '@/src/db/importData';
import { getAllNumericEntries } from '@/src/db/numericEntries';
import { resetAllData } from '@/src/db/reset';
import { getAllHabits, getActiveHabits, getArchivedHabitCount } from '@/src/db/habits';
import { getAllSkips, getSkipsForHabit } from '@/src/db/skips';
import { getAllSettings } from '@/src/db/settings';
import { getAllSubtaskCompletions, getAllSubtasks } from '@/src/db/subtasks';
import { cancelHabitReminderForHabit } from '@/src/notifications/notifications';
import { colors, radius, spacing, typography } from '@/src/theme';
import type { Habit } from '@/src/types/Habit';
import { getTodayDateString } from '@/src/utils/dates';
import { getDayCompletionStatus, type DayStatsHabit } from '@/src/utils/dayStats';

export default function SettingsScreen() {
  const [exporting, setExporting] = useState(false);
  const [importing, setImporting] = useState(false);
  const [importModalVisible, setImportModalVisible] = useState(false);
  const [importJsonText, setImportJsonText] = useState('');
  const [importErrorMessage, setImportErrorMessage] = useState<string | null>(null);
  const [pendingImportData, setPendingImportData] = useState<ImportedLocalData | null>(null);
  const [importConfirmVisible, setImportConfirmVisible] = useState(false);
  const [resetConfirmVisible, setResetConfirmVisible] = useState(false);
  const [resetting, setResetting] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [habits, setHabits] = useState<Habit[]>([]);
  const [archivedHabitCount, setArchivedHabitCount] = useState<number | null>(null);
  const [habitCompletions, setHabitCompletions] = useState<Record<string, string[]>>({});
  const [habitSkips, setHabitSkips] = useState<Record<string, string[]>>({});

  const today = getTodayDateString();

  const dayStatsHabits = useMemo<DayStatsHabit[]>(
    () =>
      habits.map((habit) => ({
        habit,
        completionDates: habitCompletions[habit.id] ?? [],
        skipDates: habitSkips[habit.id] ?? [],
      })),
    [habits, habitCompletions, habitSkips]
  );

  const todayActivity = useMemo(
    () => getDayCompletionStatus(today, dayStatsHabits),
    [dayStatsHabits, today]
  );

  const loadActivityData = useCallback(async () => {
    await initDatabase();
    const [activeHabits, archivedCount] = await Promise.all([
      getActiveHabits(),
      getArchivedHabitCount(),
    ]);
    const [completionsByHabit, skipsByHabit] = await Promise.all([
      Promise.all(activeHabits.map((habit) => getCompletionsForHabit(habit.id))),
      Promise.all(activeHabits.map((habit) => getSkipsForHabit(habit.id))),
    ]);

    const completionMap = Object.fromEntries(
      activeHabits.map((habit, index) => [
        habit.id,
        completionsByHabit[index].map((c) => c.date),
      ])
    );
    const skipMap = Object.fromEntries(
      activeHabits.map((habit, index) => [
        habit.id,
        skipsByHabit[index].map((s) => s.date),
      ])
    );

    setHabits(activeHabits);
    setArchivedHabitCount(archivedCount);
    setHabitCompletions(completionMap);
    setHabitSkips(skipMap);
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadActivityData().catch((error) => {
        console.error('Failed to load activity data for settings screen', error);
      });
    }, [loadActivityData])
  );

  async function handleExportData() {
    try {
      setExporting(true);
      setMessage(null);
      await initDatabase();

      const [
        allHabits,
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
          habits: allHabits,
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
    } catch (error) {
      console.error('Failed to export local data', error);
      setMessage('Could not back up your data. Please try again.');
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

    setPendingImportData(importedData);
    setImportConfirmVisible(true);
  }

  async function handleImportData(importedData: ImportedLocalData) {
    try {
      setImporting(true);
      setMessage(null);
      await initDatabase();
      const allHabits = await getAllHabits();
      const cancelResults = await Promise.allSettled(
        allHabits.map((habit) => cancelHabitReminderForHabit(habit))
      );

      for (const result of cancelResults) {
        if (result.status === 'rejected') {
          console.error('Failed to cancel a habit reminder during import', result.reason);
        }
      }

      await replaceAllDataWithImportedData(importedData);
      setImportModalVisible(false);
      setImportConfirmVisible(false);
      setPendingImportData(null);
      setImportJsonText('');
      setImportErrorMessage(null);
      setMessage(
        'Import complete. Reminder schedules were disabled during import; re-enable reminders on habits that need them.'
      );
      await loadActivityData();
    } catch (error) {
      console.error('Failed to import local data', error);
      setImportErrorMessage('Could not import local data. Check the JSON and try again.');
    } finally {
      setImporting(false);
    }
  }

  function confirmResetAllData() {
    setResetConfirmVisible(true);
  }

  async function handleResetAllData() {
    try {
      setResetting(true);
      setMessage(null);
      await initDatabase();
      const allHabits = await getAllHabits();
      const cancelResults = await Promise.allSettled(
        allHabits.map((habit) => cancelHabitReminderForHabit(habit))
      );

      for (const result of cancelResults) {
        if (result.status === 'rejected') {
          console.error('Failed to cancel a habit reminder during reset', result.reason);
        }
      }

      await resetAllData();
      setResetConfirmVisible(false);
      setMessage('All local habit data has been reset on this device.');
      await loadActivityData();
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
        <View style={styles.headerCopy}>
          <Text style={styles.eyebrow}>App</Text>
          <Text style={styles.title}>Settings</Text>
          <Text style={styles.subtitle}>Manage local data and app info.</Text>
        </View>
        <View style={styles.headerPill}>
          <Text style={styles.headerPillValue}>
            {Math.round(todayActivity.completionRate * 100)}%
          </Text>
          <Text style={styles.headerPillLabel}>Today</Text>
        </View>
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
            <Text style={styles.cardTitle}>Your data</Text>
          </View>
        </View>
        <Text style={styles.bodyText}>
          Your habits are saved on this phone. You can make a backup, restore a backup, or delete
          everything.
        </Text>
        <Pressable
          accessibilityLabel="Open archived habits"
          accessibilityRole="button"
          onPress={() => router.push('/archived-habits')}
          style={({ pressed }) => [styles.dataLinkCard, pressed && styles.pressed]}>
          <View style={styles.dataLinkIcon}>
            <Text style={styles.dataLinkIconText}>↺</Text>
          </View>
          <View style={styles.dataLinkText}>
            <Text style={styles.dataLinkTitle}>Archived habits</Text>
            <Text style={styles.dataLinkSubtitle}>
              Restore old habits.
            </Text>
          </View>
          <View style={styles.dataLinkPill}>
            <Text style={styles.dataLinkPillText}>
              {archivedHabitCount === null
                ? 'View'
                : archivedHabitCount === 1
                  ? '1 archived'
                  : `${archivedHabitCount} archived`}
            </Text>
          </View>
        </Pressable>
        <View style={styles.actions}>
          <PrimaryButton
            disabled={exporting || importing || resetting}
            onPress={handleExportData}
            title={exporting ? 'Preparing backup...' : 'Back up data'}
            variant="secondary"
          />
          <PrimaryButton
            disabled={exporting || importing || resetting}
            onPress={openImportModal}
            title={importing ? 'Restoring...' : 'Restore backup'}
            variant="secondary"
          />
          <PrimaryButton
            disabled={exporting || importing || resetting}
            onPress={confirmResetAllData}
            title={resetting ? 'Deleting...' : 'Delete all data'}
            variant="danger"
          />
        </View>
      </View>

      <BottomSheetModal
        onRequestClose={() => {
          if (!importing) {
            setImportModalVisible(false);
          }
        }}
        sheetStyle={styles.importModalCard}
        visible={importModalVisible}>
        <View style={styles.sectionHeader}>
          <View>
            <Text style={styles.sectionEyebrow}>Restore</Text>
            <Text style={styles.cardTitle}>Paste backup text</Text>
          </View>
        </View>
        <Text style={styles.bodyText}>
          This replaces the habits currently on this phone with the backup you paste here.
        </Text>
        <TextInput
          accessibilityLabel="Paste backup text"
          autoCapitalize="none"
          autoCorrect={false}
          editable={!importing}
          multiline
          onChangeText={(value) => {
            setImportJsonText(value);
            setImportErrorMessage(null);
          }}
          placeholder="Paste your backup text here"
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
      </BottomSheetModal>

      <ConfirmActionModal
        confirmLabel={importing ? 'Replacing...' : 'Replace data'}
        destructive
        loading={importing}
        message="This replaces all current local habit data on this device with the pasted import. Existing habits, completions, skips, reminders, and settings will be removed first."
        onCancel={() => {
          if (!importing) {
            setImportConfirmVisible(false);
            setPendingImportData(null);
          }
        }}
        onConfirm={() => {
          if (pendingImportData) {
            void handleImportData(pendingImportData);
          }
        }}
        title="Replace local data?"
        visible={importConfirmVisible}
      />

      <ConfirmActionModal
        confirmLabel={resetting ? 'Resetting...' : 'Reset'}
        destructive
        loading={resetting}
        message="This removes all habits, progress, reminders, and settings from this device."
        onCancel={() => {
          if (!resetting) {
            setResetConfirmVisible(false);
          }
        }}
        onConfirm={handleResetAllData}
        title="Reset all data?"
        visible={resetConfirmVisible}
      />

      <View style={styles.sectionCard}>
        <View style={styles.sectionHeader}>
          <View>
            <Text style={styles.sectionEyebrow}>About</Text>
            <Text style={styles.cardTitle}>About Habito</Text>
          </View>
        </View>
        <Text style={styles.bodyText}>
          Habito is a private, local-first habit tracker built to help you plan your day, track
          progress, and stay consistent. Your habit data stays on this device unless you choose to
          export it.
        </Text>
        <Text style={styles.aboutNote}>
          Built for flexible routines, skips, subtasks, numeric goals, reminders, and visual
          progress tracking.
        </Text>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: {
    gap: spacing.xl,
    paddingBottom: 156,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: spacing.sm,
  },
  headerCopy: {
    flex: 1,
    gap: spacing.xs,
  },
  headerPill: {
    alignItems: 'center',
    gap: spacing.xs,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radius.pill,
    backgroundColor: colors.primaryMuted,
  },
  headerPillValue: {
    color: colors.primary,
    ...typography.body,
    fontWeight: '900',
  },
  headerPillLabel: {
    color: colors.textMuted,
    ...typography.small,
  },
  eyebrow: {
    color: colors.primary,
    ...typography.caption,
    fontWeight: '800',
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
  dataLinkCard: {
    minHeight: 92,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.lg,
    backgroundColor: colors.surfaceElevated,
  },
  dataLinkIcon: {
    width: 46,
    height: 46,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: colors.primary,
    borderRadius: radius.lg,
    backgroundColor: colors.primaryMuted,
  },
  dataLinkIconText: {
    color: colors.primary,
    fontSize: 24,
    lineHeight: 28,
    fontWeight: '900',
  },
  dataLinkText: {
    flex: 1,
    gap: spacing.xs,
  },
  dataLinkTitle: {
    color: colors.text,
    ...typography.body,
    fontWeight: '900',
  },
  dataLinkSubtitle: {
    color: colors.textMuted,
    ...typography.caption,
    fontWeight: '700',
  },
  dataLinkPill: {
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.pill,
    backgroundColor: colors.surface,
  },
  dataLinkPillText: {
    color: colors.primary,
    ...typography.small,
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
  actions: {
    gap: spacing.md,
  },
  pressed: {
    opacity: 0.78,
  },
  bodyText: {
    color: colors.textMuted,
    ...typography.body,
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
  aboutNote: {
    color: colors.textMuted,
    ...typography.caption,
  },
});
