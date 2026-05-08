import { useEffect, useState } from 'react';
import { Alert, Pressable, StyleSheet, Switch, Text, View } from 'react-native';

import { BottomSheetModal } from '@/src/components/BottomSheetModal';
import { HabitIcon } from '@/src/components/HabitIcon';
import { PrimaryButton } from '@/src/components/PrimaryButton';
import { ReminderTimePicker } from '@/src/components/ReminderTimePicker';
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
        setErrorMessage('Notifications are not enabled, so this reminder was not scheduled.');
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

    Alert.alert('Save changes?', 'You have unsaved reminder changes.', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Discard', style: 'destructive', onPress: onClose },
      { text: 'Save', onPress: () => void saveReminder() },
    ]);
  }

  return (
    <BottomSheetModal onRequestClose={requestClose} sheetStyle={styles.card} visible={visible}>
      {habit ? (
        <>
          <View style={styles.header}>
            <Text style={styles.eyebrow}>Reminder</Text>
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
                <Text style={styles.title}>{habit.name}</Text>
                <Text style={styles.subtitle}>Edit only this reminder.</Text>
              </View>
            </View>
          </View>

          {permissionStatus === 'granted' ? null : (
            <View style={styles.permissionCard}>
              <Text style={styles.permissionText}>
                Notifications are {permissionStatus}, so reminders may not schedule.
              </Text>
              <PrimaryButton
                disabled={requesting}
                onPress={requestPermission}
                title={requesting ? 'Requesting...' : 'Request permission'}
                variant="secondary"
              />
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
              <Text style={styles.toggleTitle}>Reminder enabled</Text>
              <Text style={styles.toggleMeta}>
                {reminderEnabled ? 'Reminder is on.' : 'Reminder is off.'}
              </Text>
            </View>
            <Switch
              disabled={saving}
              onValueChange={setReminderEnabled}
              pointerEvents="none"
              thumbColor={reminderEnabled ? colors.primary : colors.textMuted}
              trackColor={{ false: colors.surfaceMuted, true: colors.primaryMuted }}
              value={reminderEnabled}
            />
          </Pressable>

          {reminderEnabled ? (
            <ReminderTimePicker
              disabled={saving}
              onChange={(value) => {
                setReminderTime(value);
                setErrorMessage(null);
              }}
              value={reminderTime}
            />
          ) : null}

          {errorMessage ? <Text style={styles.errorText}>{errorMessage}</Text> : null}

          <View style={styles.actions}>
            <PrimaryButton disabled={saving} onPress={requestClose} title="Cancel" variant="secondary" />
            <PrimaryButton
              disabled={saving}
              onPress={saveReminder}
              title={saving ? 'Saving...' : 'Save reminder'}
            />
          </View>
        </>
      ) : null}
    </BottomSheetModal>
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
    gap: spacing.md,
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.lg,
    backgroundColor: colors.surfaceElevated,
  },
  toggleText: {
    flex: 1,
    gap: spacing.xs,
  },
  toggleTitle: {
    color: colors.text,
    ...typography.caption,
    fontWeight: '900',
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
