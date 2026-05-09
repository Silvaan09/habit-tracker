import { useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { BottomSheetModal } from '@/src/components/BottomSheetModal';
import { HabitIcon } from '@/src/components/HabitIcon';
import { PrimaryButton } from '@/src/components/PrimaryButton';
import { ReminderTimePicker } from '@/src/components/ReminderTimePicker';
import { ThemedSwitch } from '@/src/components/ThemedSwitch';
import { UnsavedChangesModal } from '@/src/components/UnsavedChangesModal';
import { updateHabitReminder } from '@/src/db/habits';
import {
  cancelHabitReminder,
  getNotificationPermissionStatus,
  requestNotificationPermissions,
  rescheduleHabitReminderForHabit,
} from '@/src/notifications/notifications';
import { colors, radius, spacing, typography } from '@/src/theme';
import type { Habit } from '@/src/types/Habit';
import {
  isValidReminderTime,
  REMINDER_TIME_VALIDATION_MESSAGE,
} from '@/src/utils/reminders';

type ReminderEditorModalProps = {
  visible: boolean;
  habit: Habit | null;
  onClose: () => void;
  onSaved: () => void | Promise<void>;
};

export function ReminderEditorModal({
  visible,
  habit,
  onClose,
  onSaved,
}: ReminderEditorModalProps) {
  const [reminderEnabled, setReminderEnabled] = useState(false);
  const [reminderTime, setReminderTime] = useState('08:00');
  const [permissionStatus, setPermissionStatus] = useState('loading');
  const [saving, setSaving] = useState(false);
  const [requesting, setRequesting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [unsavedPromptVisible, setUnsavedPromptVisible] = useState(false);
  const reminderDirty = Boolean(
    habit &&
      (reminderEnabled !== habit.reminderEnabled ||
        reminderTime !== (habit.reminderTime || '08:00'))
  );

  useEffect(() => {
    if (!visible || !habit) {
      return;
    }

    setReminderEnabled(habit.reminderEnabled);
    setReminderTime(habit.reminderTime || '08:00');
    setErrorMessage(null);
    setUnsavedPromptVisible(false);
    void refreshPermissionStatus();
  }, [habit, visible]);

  async function refreshPermissionStatus() {
    setPermissionStatus(await getNotificationPermissionStatus());
  }

  async function requestPermission() {
    try {
      setRequesting(true);
      setErrorMessage(null);
      await requestNotificationPermissions();
      await refreshPermissionStatus();
    } catch (error) {
      console.error('Failed to request notification permission from reminder editor', error);
      setErrorMessage('Could not request notification permission on this device.');
    } finally {
      setRequesting(false);
    }
  }

  async function saveReminder() {
    if (!habit) {
      return;
    }

    if (reminderEnabled && !isValidReminderTime(reminderTime)) {
      setErrorMessage(REMINDER_TIME_VALIDATION_MESSAGE);
      return;
    }

    try {
      setSaving(true);
      setErrorMessage(null);

      if (!reminderEnabled) {
        await cancelHabitReminder(habit.notificationId);
        await updateHabitReminder(habit.id, {
          reminderEnabled: false,
          reminderTime: null,
          notificationId: null,
        });
        await onSaved();
        onClose();
        return;
      }

      const notificationId = await rescheduleHabitReminderForHabit({
        ...habit,
        reminderEnabled: true,
        reminderTime,
      });

      if (!notificationId) {
        await refreshPermissionStatus();
        setErrorMessage('Allow notifications to save this reminder.');
        return;
      }

      await updateHabitReminder(habit.id, {
        reminderEnabled: true,
        reminderTime,
        notificationId,
      });
      await onSaved();
      onClose();
    } catch (error) {
      console.error('Failed to save reminder', error);
      setErrorMessage('Could not save this reminder. Please try again.');
    } finally {
      setSaving(false);
    }
  }

  function requestClose() {
    if (saving || requesting) {
      return;
    }

    if (!reminderDirty) {
      onClose();
      return;
    }

    setUnsavedPromptVisible(true);
  }

  function discardReminderChanges() {
    setUnsavedPromptVisible(false);
    onClose();
  }

  function saveReminderFromPrompt() {
    setUnsavedPromptVisible(false);
    void saveReminder();
  }

  return (
    <>
      <BottomSheetModal onRequestClose={requestClose} sheetStyle={styles.card} visible={visible}>
        {habit ? (
          <>
            <View style={styles.header}>
              <Text style={styles.title}>Reminder</Text>
              <View style={styles.habitRow}>
                <HabitIcon
                  color={habit.color ?? colors.habitGreen}
                  fallbackIcon={habit.icon}
                  iconLibrary={habit.iconLibrary}
                  iconType={habit.iconType}
                  iconValue={habit.iconValue}
                  size={48}
                />
                <View style={styles.habitText}>
                  <Text style={styles.habitName}>{habit.name}</Text>
                </View>
              </View>
            </View>

            {permissionStatus === 'granted' ? null : (
              <View style={styles.permissionCard}>
                <Text style={styles.permissionText}>
                  {permissionStatus === 'denied'
                    ? 'Notifications are blocked. Enable notifications in your phone settings to receive reminders.'
                    : 'Notifications are off. Allow notifications to receive habit reminders.'}
                </Text>
                {permissionStatus === 'denied' ? null : (
                  <PrimaryButton
                    disabled={requesting}
                    onPress={requestPermission}
                    title={requesting ? 'Requesting...' : 'Allow notifications'}
                    variant="secondary"
                  />
                )}
              </View>
            )}

            <Pressable
              accessibilityLabel={reminderEnabled ? 'Disable reminder' : 'Enable reminder'}
              accessibilityRole="switch"
              accessibilityState={{ checked: reminderEnabled }}
              disabled={saving}
              onPress={() => setReminderEnabled((current) => !current)}
              style={({ pressed }) => [
                styles.toggleRow,
                pressed && styles.pressed,
                saving && styles.disabled,
              ]}>
              <View style={styles.toggleText}>
                <Text style={styles.toggleTitle}>
                  {reminderEnabled ? 'Reminder on' : 'Reminder off'}
                </Text>
                <Text style={styles.toggleMeta}>
                  {reminderEnabled ? 'Reminder is on.' : 'Reminder is off.'}
                </Text>
              </View>
              <View style={styles.toggleControlRow}>
                <Text style={styles.toggleState}>{reminderEnabled ? 'On' : 'Off'}</Text>
                <ThemedSwitch
                  accessibilityLabel={reminderEnabled ? 'Disable reminder' : 'Enable reminder'}
                  disabled={saving}
                  onValueChange={setReminderEnabled}
                  value={reminderEnabled}
                />
              </View>
            </Pressable>

            {reminderEnabled ? (
              <ReminderTimePicker
                disabled={saving}
                helper="Choose when this reminder appears."
                label="Time"
                onChange={(value) => {
                  setReminderTime(value);
                  setErrorMessage(null);
                }}
                value={reminderTime}
              />
            ) : null}

            {errorMessage ? <Text style={styles.errorText}>{errorMessage}</Text> : null}

            <View style={styles.actions}>
              <PrimaryButton
                disabled={saving}
                onPress={requestClose}
                title="Cancel"
                variant="secondary"
              />
              <PrimaryButton
                disabled={saving}
                onPress={saveReminder}
                title={saving ? 'Saving...' : 'Save reminder'}
              />
            </View>
          </>
        ) : null}
      </BottomSheetModal>
      <UnsavedChangesModal
        message="You have unsaved reminder changes. Save them before closing?"
        onCancel={() => setUnsavedPromptVisible(false)}
        onDiscard={discardReminderChanges}
        onSave={saveReminderFromPrompt}
        saving={saving}
        visible={unsavedPromptVisible}
      />
    </>
  );
}

const styles = StyleSheet.create({
  card: {
    gap: spacing.lg,
    padding: spacing.xl,
    borderTopLeftRadius: radius.xl,
    borderTopRightRadius: radius.xl,
    backgroundColor: colors.surface,
  },
  header: {
    gap: spacing.md,
  },
  eyebrow: {
    color: colors.primary,
    ...typography.small,
    fontWeight: '900',
    textTransform: 'uppercase',
  },
  habitRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  habitText: {
    flex: 1,
    gap: spacing.xs,
  },
  title: {
    color: colors.text,
    ...typography.heading,
  },
  habitName: {
    color: colors.text,
    ...typography.body,
    fontWeight: '900',
  },
  subtitle: {
    color: colors.textMuted,
    ...typography.caption,
  },
  permissionCard: {
    gap: spacing.md,
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: colors.warning,
    borderRadius: radius.lg,
    backgroundColor: colors.surfaceElevated,
  },
  permissionText: {
    color: colors.warning,
    ...typography.caption,
    fontWeight: '700',
    textTransform: 'capitalize',
  },
  toggleRow: {
    minHeight: 72,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.md,
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.lg,
    backgroundColor: colors.surfaceElevated,
  },
  toggleText: {
    flex: 1,
    justifyContent: 'center',
    gap: spacing.xs,
  },
  toggleControlRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    gap: spacing.sm,
  },
  toggleTitle: {
    color: colors.text,
    ...typography.caption,
    fontWeight: '900',
  },
  toggleState: {
    minWidth: 24,
    color: colors.primary,
    ...typography.caption,
    fontWeight: '900',
    textAlign: 'right',
  },
  toggleMeta: {
    color: colors.textMuted,
    ...typography.caption,
  },
  errorText: {
    color: colors.destructive,
    ...typography.caption,
    fontWeight: '700',
  },
  actions: {
    gap: spacing.md,
  },
  pressed: {
    opacity: 0.78,
  },
  disabled: {
    opacity: 0.46,
  },
});
