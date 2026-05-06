import { useMemo, useState } from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { PrimaryButton } from '@/src/components/PrimaryButton';
import { colors, radius, spacing, typography } from '@/src/theme';
import {
  formatReminderTime,
  padReminderTimePart,
  parseReminderTime,
  REMINDER_MINUTE_OPTIONS,
} from '@/src/utils/reminders';

type ReminderTimePickerProps = {
  value: string | null;
  onChange: (value: string) => void;
  disabled?: boolean;
  helper?: string;
  label?: string;
};

const HOUR_OPTIONS = Array.from({ length: 24 }, (_, hour) => hour);

export function ReminderTimePicker({
  value,
  onChange,
  disabled = false,
  helper = 'Choose a local daily reminder time.',
  label = 'Reminder time',
}: ReminderTimePickerProps) {
  const [visible, setVisible] = useState(false);
  const initialDraft = useMemo(() => getInitialDraftTime(value), [value]);
  const [draftHour, setDraftHour] = useState(initialDraft.hour);
  const [draftMinute, setDraftMinute] = useState(initialDraft.minute);

  function openPicker() {
    const nextDraft = getInitialDraftTime(value);

    setDraftHour(nextDraft.hour);
    setDraftMinute(nextDraft.minute);
    setVisible(true);
  }

  function saveTime() {
    onChange(formatReminderTime(draftHour, draftMinute));
    setVisible(false);
  }

  return (
    <View style={styles.fieldGroup}>
      <Text style={styles.label}>{label}</Text>
      <Text style={styles.helperText}>{helper}</Text>
      <Pressable
        accessibilityLabel="Open reminder time selector"
        accessibilityRole="button"
        disabled={disabled}
        onPress={openPicker}
        style={({ pressed }) => [
          styles.timeSelectorButton,
          pressed && styles.pressed,
          disabled && styles.disabled,
        ]}>
        <View>
          <Text style={styles.timeSelectorLabel}>Selected time</Text>
          <Text style={styles.timeSelectorValue}>{value || '08:00'}</Text>
        </View>
        <Text style={styles.timeSelectorAction}>Change</Text>
      </Pressable>

      <Modal
        animationType="slide"
        onRequestClose={() => setVisible(false)}
        transparent
        visible={visible}>
        <View style={styles.timeModalBackdrop}>
          <View style={styles.timeModalCard}>
            <View style={styles.timeModalHeader}>
              <Text style={styles.sectionEyebrow}>Reminder time</Text>
              <Text style={styles.timeModalTitle}>
                {formatReminderTime(draftHour, draftMinute)}
              </Text>
              <Text style={styles.helperText}>Minutes are shown in 5-minute steps.</Text>
            </View>

            <View style={styles.timeColumns}>
              <View style={[styles.timeColumn, styles.hourColumn]}>
                <Text style={styles.label}>Hour</Text>
                <ScrollView
                  style={styles.timeOptionsScroll}
                  contentContainerStyle={styles.timeOptionGrid}>
                  {HOUR_OPTIONS.map((hour) => (
                    <Pressable
                      accessibilityLabel={`Select hour ${padReminderTimePart(hour)}`}
                      accessibilityRole="button"
                      accessibilityState={{ selected: draftHour === hour }}
                      key={hour}
                      onPress={() => setDraftHour(hour)}
                      style={[
                        styles.timeOption,
                        styles.hourTimeOption,
                        draftHour === hour && styles.selectedTimeOption,
                      ]}>
                      <Text
                        style={[
                          styles.timeOptionText,
                          draftHour === hour && styles.selectedTimeOptionText,
                        ]}>
                        {padReminderTimePart(hour)}
                      </Text>
                    </Pressable>
                  ))}
                </ScrollView>
              </View>

              <View style={[styles.timeColumn, styles.minuteColumn]}>
                <Text style={styles.label}>Minute</Text>
                <ScrollView
                  style={styles.timeOptionsScroll}
                  contentContainerStyle={styles.timeOptionGrid}>
                  {REMINDER_MINUTE_OPTIONS.map((minute) => (
                    <Pressable
                      accessibilityLabel={`Select minute ${padReminderTimePart(minute)}`}
                      accessibilityRole="button"
                      accessibilityState={{ selected: draftMinute === minute }}
                      key={minute}
                      onPress={() => setDraftMinute(minute)}
                      style={[
                        styles.timeOption,
                        styles.minuteTimeOption,
                        draftMinute === minute && styles.selectedTimeOption,
                      ]}>
                      <Text
                        style={[
                          styles.timeOptionText,
                          draftMinute === minute && styles.selectedTimeOptionText,
                        ]}>
                        {padReminderTimePart(minute)}
                      </Text>
                    </Pressable>
                  ))}
                </ScrollView>
              </View>
            </View>

            <View style={styles.timeModalActions}>
              <PrimaryButton onPress={() => setVisible(false)} title="Cancel" variant="secondary" />
              <PrimaryButton onPress={saveTime} title="Save time" />
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

function getInitialDraftTime(value: string | null) {
  const parsedStrictTime = value ? parseReminderTime(value) : null;

  if (parsedStrictTime) {
    return parsedStrictTime;
  }

  const relaxedMatch = value ? /^([01]\d|2[0-3]):([0-5]\d)$/.exec(value.trim()) : null;
  const hour = relaxedMatch ? Number(relaxedMatch[1]) : 8;
  const minute = relaxedMatch ? Number(relaxedMatch[2]) : 0;

  return {
    hour,
    minute: roundToNearestFiveMinutes(minute),
  };
}

function roundToNearestFiveMinutes(minute: number) {
  const roundedMinute = Math.round(minute / 5) * 5;

  if (roundedMinute >= 60) {
    return 55;
  }

  return roundedMinute;
}

const styles = StyleSheet.create({
  fieldGroup: {
    gap: spacing.sm,
  },
  label: {
    color: colors.text,
    ...typography.caption,
    fontWeight: '900',
  },
  helperText: {
    color: colors.textMuted,
    ...typography.caption,
  },
  timeSelectorButton: {
    minHeight: 72,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.lg,
    backgroundColor: colors.surfaceElevated,
  },
  timeSelectorLabel: {
    color: colors.textMuted,
    ...typography.small,
    fontWeight: '800',
    textTransform: 'uppercase',
  },
  timeSelectorValue: {
    color: colors.text,
    fontSize: 28,
    fontWeight: '900',
  },
  timeSelectorAction: {
    color: colors.primary,
    ...typography.caption,
    fontWeight: '900',
  },
  timeModalBackdrop: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0, 0, 0, 0.72)',
  },
  timeModalCard: {
    maxHeight: '82%',
    gap: spacing.lg,
    padding: spacing.xl,
    borderTopLeftRadius: radius.xl,
    borderTopRightRadius: radius.xl,
    backgroundColor: colors.surface,
  },
  timeModalHeader: {
    gap: spacing.xs,
  },
  sectionEyebrow: {
    color: colors.primary,
    ...typography.small,
    fontWeight: '900',
    textTransform: 'uppercase',
  },
  timeModalTitle: {
    color: colors.text,
    fontSize: 44,
    fontWeight: '900',
  },
  timeColumns: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  timeColumn: {
    gap: spacing.sm,
  },
  hourColumn: {
    flex: 2,
  },
  minuteColumn: {
    flex: 1,
  },
  timeOptionGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  timeOptionsScroll: {
    maxHeight: 260,
  },
  timeOption: {
    width: 46,
    height: 42,
    minHeight: 42,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    backgroundColor: colors.surfaceElevated,
  },
  hourTimeOption: {},
  minuteTimeOption: {},
  selectedTimeOption: {
    borderColor: colors.primary,
    backgroundColor: colors.primary,
  },
  timeOptionText: {
    color: colors.text,
    ...typography.caption,
    fontWeight: '900',
  },
  selectedTimeOptionText: {
    color: colors.background,
  },
  timeModalActions: {
    gap: spacing.md,
  },
  pressed: {
    opacity: 0.78,
  },
  disabled: {
    opacity: 0.46,
  },
});
