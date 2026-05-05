import { useState } from 'react';
import { Pressable, StyleSheet, Switch, Text, View } from 'react-native';

import { HabitIcon } from '@/src/components/HabitIcon';
import {
  IconEmojiPicker,
  type HabitIconSelection,
} from '@/src/components/IconEmojiPicker';
import { PrimaryButton } from '@/src/components/PrimaryButton';
import { TextInputField } from '@/src/components/TextInputField';
import { colors, radius, spacing, typography } from '@/src/theme';
import type { HabitIconType } from '@/src/types/Habit';
import { isValidReminderTime, REMINDER_TIME_VALIDATION_MESSAGE } from '@/src/utils/reminders';

export type HabitFormValues = {
  name: string;
  description: string | null;
  icon: string | null;
  iconType: HabitIconType | null;
  iconValue: string | null;
  iconLibrary: string | null;
  color: string | null;
  reminderEnabled: boolean;
  reminderTime: string | null;
};

type HabitFormProps = {
  initialValues?: Partial<HabitFormValues>;
  submitTitle: string;
  saving: boolean;
  error?: string | null;
  onSubmit: (values: HabitFormValues) => void;
  onCancel: () => void;
};

const COLOR_OPTIONS = [
  colors.habitBlue,
  colors.habitPink,
  colors.habitPurple,
  colors.habitOrange,
  colors.habitGreen,
  colors.primary,
];

export function HabitForm({
  initialValues,
  submitTitle,
  saving,
  error,
  onSubmit,
  onCancel,
}: HabitFormProps) {
  const [name, setName] = useState(initialValues?.name ?? '');
  const [description, setDescription] = useState(initialValues?.description ?? '');
  const [selectedIcon, setSelectedIcon] = useState<HabitIconSelection>(() => ({
    iconType: initialValues?.iconType ?? 'emoji',
    iconValue: initialValues?.iconValue ?? initialValues?.icon ?? '\u{1F4DA}',
    iconLibrary: initialValues?.iconLibrary ?? null,
  }));
  const [pickerVisible, setPickerVisible] = useState(false);
  const [color, setColor] = useState(initialValues?.color ?? COLOR_OPTIONS[0]);
  const [reminderEnabled, setReminderEnabled] = useState(initialValues?.reminderEnabled ?? false);
  const [reminderTime, setReminderTime] = useState(initialValues?.reminderTime ?? '');
  const [validationMessage, setValidationMessage] = useState<string | null>(null);
  const [reminderTimeValidationMessage, setReminderTimeValidationMessage] = useState<string | null>(
    null
  );

  function handleSubmit() {
    const trimmedName = name.trim();

    if (!trimmedName) {
      setValidationMessage('Habit name is required.');
      return;
    }

    const trimmedReminderTime = reminderTime.trim();

    if (reminderEnabled && !isValidReminderTime(trimmedReminderTime)) {
      setReminderTimeValidationMessage(REMINDER_TIME_VALIDATION_MESSAGE);
      return;
    }

    setValidationMessage(null);
    setReminderTimeValidationMessage(null);
    onSubmit({
      name: trimmedName,
      description: description.trim() || null,
      icon: selectedIcon.iconType === 'emoji' ? selectedIcon.iconValue : null,
      iconType: selectedIcon.iconType,
      iconValue: selectedIcon.iconValue,
      iconLibrary: selectedIcon.iconLibrary,
      color,
      reminderEnabled,
      reminderTime: reminderEnabled ? trimmedReminderTime : null,
    });
  }

  function toggleReminder() {
    if (saving) {
      return;
    }

    setReminderEnabled((current) => !current);
  }

  const previewName = name.trim() || 'Habit name';
  const previewDescription = description.trim();
  const hasReminderPreview = reminderEnabled && reminderTime.trim().length > 0;

  return (
    <View style={styles.form}>
      {error ? (
        <View style={styles.errorBanner}>
          <Text style={styles.errorText}>{error}</Text>
        </View>
      ) : null}

      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionEyebrow}>Basics</Text>
          <Text style={styles.sectionTitle}>Make it recognizable.</Text>
        </View>

        <TextInputField
          autoCapitalize="sentences"
          editable={!saving}
          error={validationMessage}
          label="Habit name"
          onChangeText={(value) => {
            setName(value);
            setValidationMessage(null);
          }}
          placeholder="Read 10 pages"
          returnKeyType="done"
          value={name}
        />

        <TextInputField
          autoCapitalize="sentences"
          editable={!saving}
          helper="Optional. Add a short note about what this habit means."
          label="Description"
          multiline
          onChangeText={setDescription}
          placeholder="A few quiet pages before bed"
          style={styles.descriptionInput}
          value={description ?? ''}
        />

        <View style={styles.fieldGroup}>
          <Text style={styles.label}>Icon</Text>
          <Text style={styles.helperText}>Choose an emoji or a simple line icon.</Text>
          <Pressable
            accessibilityLabel="Open icon and emoji picker"
            accessibilityRole="button"
            disabled={saving}
            onPress={() => setPickerVisible(true)}
            style={({ pressed }) => [
              styles.iconPickerButton,
              pressed && styles.pressed,
              saving && styles.disabled,
            ]}>
            <HabitIcon
              color={color}
              iconLibrary={selectedIcon.iconLibrary}
              iconType={selectedIcon.iconType}
              iconValue={selectedIcon.iconValue}
              size={58}
            />
            <View style={styles.iconPickerText}>
              <Text style={styles.iconPickerTitle}>Selected symbol</Text>
              <Text style={styles.iconPickerMeta}>
                {selectedIcon.iconType === 'emoji' ? 'Emoji' : 'Vector icon'} - tap to change
              </Text>
            </View>
          </Pressable>
        </View>

        <View style={styles.fieldGroup}>
          <Text style={styles.label}>Color</Text>
          <Text style={styles.helperText}>Choose a soft accent for this habit.</Text>
          <View style={styles.swatches}>
            {COLOR_OPTIONS.map((option) => (
              <Pressable
                accessibilityLabel={`Select color ${option}`}
                accessibilityRole="button"
                disabled={saving}
                key={option}
                onPress={() => setColor(option)}
                style={[
                  styles.swatchButton,
                  color === option && styles.selectedSwatchButton,
                  saving && styles.disabled,
                ]}>
                <View style={[styles.swatch, { backgroundColor: option }]} />
              </Pressable>
            ))}
          </View>
        </View>
      </View>

      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionEyebrow}>Reminder</Text>
          <Text style={styles.sectionTitle}>A gentle daily nudge.</Text>
        </View>

        <Pressable
          accessibilityRole="switch"
          accessibilityState={{ checked: reminderEnabled }}
          accessibilityLabel={`${reminderEnabled ? 'Disable' : 'Enable'} daily reminder`}
          disabled={saving}
          onPress={toggleReminder}
          style={({ pressed }) => [
            styles.reminderRow,
            pressed && styles.pressed,
            saving && styles.disabled,
          ]}>
          <View style={styles.reminderText}>
            <Text style={styles.label}>Daily reminder</Text>
            <Text style={styles.helperText}>
              {reminderEnabled ? 'Reminder is on.' : 'Turn this on to schedule a local reminder.'}
            </Text>
          </View>
          <Text style={styles.reminderState}>{reminderEnabled ? 'On' : 'Off'}</Text>
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
          <TextInputField
            editable={!saving}
            error={reminderTimeValidationMessage}
            helper="Use 24-hour time like 08:00 or 21:30."
            label="Reminder time"
            onChangeText={(value) => {
              setReminderTime(value);
              setReminderTimeValidationMessage(null);
            }}
            placeholder="08:00"
            value={reminderTime ?? ''}
          />
        ) : (
          <View style={styles.disabledReminderTime}>
            <Text style={styles.disabledReminderLabel}>Reminder time</Text>
            <Text style={styles.disabledReminderText}>Enable reminders to set a time.</Text>
          </View>
        )}
      </View>

      <View style={styles.previewCard}>
        <Text style={styles.sectionEyebrow}>Preview</Text>
        <View style={styles.previewRow}>
          <HabitIcon
            color={color}
            fallbackIcon={previewName.charAt(0).toUpperCase()}
            iconLibrary={selectedIcon.iconLibrary}
            iconType={selectedIcon.iconType}
            iconValue={selectedIcon.iconValue}
            size={58}
          />
          <View style={styles.previewText}>
            <Text style={styles.previewName}>{previewName}</Text>
            {previewDescription ? (
              <Text numberOfLines={2} style={styles.previewDescription}>
                {previewDescription}
              </Text>
            ) : null}
            <Text style={styles.previewMeta}>
              {hasReminderPreview ? `Daily reminder at ${reminderTime.trim()}` : 'Daily habit'}
            </Text>
          </View>
        </View>
      </View>

      <View style={styles.actions}>
        <PrimaryButton
          disabled={saving}
          onPress={handleSubmit}
          title={saving ? 'Saving...' : submitTitle}
        />
        <PrimaryButton disabled={saving} onPress={onCancel} title="Cancel" variant="secondary" />
      </View>

      <IconEmojiPicker
        accentColor={color}
        onClose={() => setPickerVisible(false)}
        onSelect={setSelectedIcon}
        selected={selectedIcon}
        visible={pickerVisible}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  form: {
    gap: spacing.lg,
  },
  section: {
    gap: spacing.lg,
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.xl,
    backgroundColor: colors.surface,
  },
  sectionHeader: {
    gap: spacing.xs,
  },
  sectionEyebrow: {
    color: colors.primary,
    ...typography.small,
    fontWeight: '900',
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },
  sectionTitle: {
    color: colors.text,
    ...typography.heading,
  },
  fieldGroup: {
    gap: spacing.sm,
  },
  label: {
    color: colors.text,
    ...typography.caption,
    fontWeight: '800',
  },
  descriptionInput: {
    minHeight: 88,
    paddingTop: spacing.lg,
    textAlignVertical: 'top',
  },
  iconPickerButton: {
    minHeight: 88,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.lg,
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.lg,
    backgroundColor: colors.surfaceElevated,
  },
  iconPickerText: {
    flex: 1,
    gap: spacing.xs,
  },
  iconPickerTitle: {
    color: colors.text,
    ...typography.body,
    fontWeight: '900',
  },
  iconPickerMeta: {
    color: colors.textMuted,
    ...typography.caption,
  },
  swatches: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  swatchButton: {
    width: 46,
    height: 46,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.pill,
    backgroundColor: colors.surfaceElevated,
  },
  selectedSwatchButton: {
    borderColor: colors.primary,
    backgroundColor: colors.primaryMuted,
  },
  swatch: {
    width: 30,
    height: 30,
    borderRadius: radius.pill,
  },
  reminderRow: {
    minHeight: 72,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.lg,
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.lg,
    backgroundColor: colors.surfaceMuted,
  },
  reminderText: {
    flex: 1,
    gap: spacing.xs,
  },
  reminderState: {
    color: colors.primary,
    ...typography.caption,
    fontWeight: '900',
  },
  helperText: {
    color: colors.textMuted,
    ...typography.caption,
  },
  disabledReminderTime: {
    gap: spacing.xs,
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.lg,
    backgroundColor: colors.surfaceElevated,
    opacity: 0.72,
  },
  disabledReminderLabel: {
    color: colors.textMuted,
    ...typography.caption,
    fontWeight: '800',
  },
  disabledReminderText: {
    color: colors.textSubtle,
    ...typography.caption,
  },
  previewCard: {
    gap: spacing.md,
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.xl,
    backgroundColor: colors.surfaceElevated,
  },
  previewRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  previewText: {
    flex: 1,
    gap: spacing.xs,
  },
  previewName: {
    color: colors.text,
    ...typography.body,
    fontWeight: '900',
  },
  previewDescription: {
    color: colors.textMuted,
    ...typography.caption,
  },
  previewMeta: {
    color: colors.textMuted,
    ...typography.caption,
  },
  pressed: {
    opacity: 0.78,
  },
  disabled: {
    opacity: 0.42,
  },
  actions: {
    gap: spacing.md,
    paddingTop: spacing.xs,
  },
  errorBanner: {
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
});
