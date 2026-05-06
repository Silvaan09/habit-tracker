import { useState } from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, Switch, Text, View } from 'react-native';

import { HabitIcon } from '@/src/components/HabitIcon';
import {
  IconPicker,
  type HabitIconSelection,
} from '@/src/components/IconPicker';
import { DEFAULT_LUCIDE_HABIT_ICON, LucideCheck } from '@/src/components/lucideHabitIcons';
import { PrimaryButton } from '@/src/components/PrimaryButton';
import { TextInputField } from '@/src/components/TextInputField';
import { colors, radius, spacing, typography } from '@/src/theme';
import type { HabitIconType, HabitScheduleType, HabitTrackingType } from '@/src/types/Habit';
import { getTodayDateString } from '@/src/utils/dates';
import {
  isValidReminderTime,
  parseReminderTime,
  REMINDER_TIME_VALIDATION_MESSAGE,
} from '@/src/utils/reminders';

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
  scheduleType: HabitScheduleType;
  scheduleWeekdays: number[] | null;
  scheduleIntervalDays: number | null;
  scheduleStartDate: string | null;
  trackingType: HabitTrackingType;
  targetValue: number | null;
  targetUnit: string | null;
  subtaskTitles: string[];
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
  colors.primary,
  colors.warning,
  '#FFC247',
  '#FF9F45',
  '#FF6F61',
  colors.habitBlue,
  '#55DDE0',
  '#4ECDC4',
  colors.habitPink,
  colors.habitPurple,
  colors.habitOrange,
  colors.habitGreen,
  '#9EF01A',
  '#8E9AAF',
];
const WEEKDAY_OPTIONS = [
  { label: 'Mon', value: 1 },
  { label: 'Tue', value: 2 },
  { label: 'Wed', value: 3 },
  { label: 'Thu', value: 4 },
  { label: 'Fri', value: 5 },
  { label: 'Sat', value: 6 },
  { label: 'Sun', value: 7 },
];
const HOUR_OPTIONS = Array.from({ length: 24 }, (_, hour) => hour);
const MINUTE_OPTIONS = Array.from({ length: 60 }, (_, minute) => minute);
const DEFAULT_HABIT_ICON = DEFAULT_LUCIDE_HABIT_ICON;

export function HabitForm({
  initialValues,
  submitTitle,
  saving,
  error,
  onSubmit,
  onCancel,
}: HabitFormProps) {
  const initialReminderTime = initialValues?.reminderTime ?? '';
  const initialParsedReminderTime = parseReminderTime(initialReminderTime);
  const [name, setName] = useState(initialValues?.name ?? '');
  const [description, setDescription] = useState(initialValues?.description ?? '');
  const [selectedIcon, setSelectedIcon] = useState<HabitIconSelection>(() => ({
    iconType: 'icon',
    iconValue:
      initialValues?.iconType === 'icon' && initialValues.iconLibrary === 'lucide'
        ? initialValues.iconValue ?? DEFAULT_HABIT_ICON
        : DEFAULT_HABIT_ICON,
    iconLibrary: 'lucide',
  }));
  const [pickerVisible, setPickerVisible] = useState(false);
  const [color, setColor] = useState(initialValues?.color ?? COLOR_OPTIONS[0]);
  const [reminderEnabled, setReminderEnabled] = useState(initialValues?.reminderEnabled ?? false);
  const [reminderTime, setReminderTime] = useState(
    initialValues?.reminderEnabled && !initialParsedReminderTime ? '08:00' : initialReminderTime
  );
  const [timeSelectorVisible, setTimeSelectorVisible] = useState(false);
  const [draftReminderHour, setDraftReminderHour] = useState(
    initialParsedReminderTime?.hour ?? 8
  );
  const [draftReminderMinute, setDraftReminderMinute] = useState(
    initialParsedReminderTime?.minute ?? 0
  );
  const [scheduleType, setScheduleType] = useState<HabitScheduleType>(
    initialValues?.scheduleType ?? 'daily'
  );
  const [scheduleWeekdays, setScheduleWeekdays] = useState<number[]>(
    initialValues?.scheduleWeekdays ?? [1, 2, 3, 4, 5]
  );
  const [scheduleIntervalDays, setScheduleIntervalDays] = useState(
    String(initialValues?.scheduleIntervalDays ?? 3)
  );
  const [scheduleStartDate, setScheduleStartDate] = useState(
    initialValues?.scheduleStartDate ?? getTodayDateString()
  );
  const [trackingType, setTrackingType] = useState<HabitTrackingType>(
    initialValues?.trackingType ?? 'checkbox'
  );
  const [subtaskTitles, setSubtaskTitles] = useState<string[]>(
    initialValues?.subtaskTitles?.length ? initialValues.subtaskTitles : ['', '', '']
  );
  const [targetValue, setTargetValue] = useState(
    initialValues?.targetValue ? String(initialValues.targetValue) : ''
  );
  const [targetUnit, setTargetUnit] = useState(initialValues?.targetUnit ?? '');
  const [validationMessage, setValidationMessage] = useState<string | null>(null);
  const [reminderTimeValidationMessage, setReminderTimeValidationMessage] = useState<string | null>(
    null
  );
  const [scheduleValidationMessage, setScheduleValidationMessage] = useState<string | null>(null);
  const [trackingValidationMessage, setTrackingValidationMessage] = useState<string | null>(null);

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

    const parsedIntervalDays = Number(scheduleIntervalDays);

    if (scheduleType === 'weekdays' && scheduleWeekdays.length === 0) {
      setScheduleValidationMessage('Choose at least one weekday.');
      return;
    }

    if (scheduleType === 'interval' && (!Number.isInteger(parsedIntervalDays) || parsedIntervalDays < 1)) {
      setScheduleValidationMessage('Interval must be a positive whole number.');
      return;
    }

    if (scheduleType === 'interval' && !isDateString(scheduleStartDate)) {
      setScheduleValidationMessage('Use a start date like 2026-05-05.');
      return;
    }

    const trimmedSubtaskTitles = subtaskTitles.map((title) => title.trim()).filter(Boolean);
    const parsedTargetValue = Number(targetValue.replace(',', '.'));

    if (trackingType === 'subtasks' && trimmedSubtaskTitles.length === 0) {
      setTrackingValidationMessage('Add at least one subtask.');
      return;
    }

    if (trackingType === 'numeric' && (!Number.isFinite(parsedTargetValue) || parsedTargetValue <= 0)) {
      setTrackingValidationMessage('Target must be greater than 0.');
      return;
    }

    setValidationMessage(null);
    setReminderTimeValidationMessage(null);
    setScheduleValidationMessage(null);
    setTrackingValidationMessage(null);
    onSubmit({
      name: trimmedName,
      description: description.trim() || null,
      icon: null,
      iconType: selectedIcon.iconType,
      iconValue: selectedIcon.iconValue,
      iconLibrary: selectedIcon.iconLibrary,
      color,
      reminderEnabled,
      reminderTime: reminderEnabled ? trimmedReminderTime : null,
      scheduleType,
      scheduleWeekdays: scheduleType === 'weekdays' ? scheduleWeekdays : null,
      scheduleIntervalDays: scheduleType === 'interval' ? parsedIntervalDays : null,
      scheduleStartDate: scheduleType === 'interval' ? scheduleStartDate : null,
      trackingType,
      targetValue: trackingType === 'numeric' ? parsedTargetValue : null,
      targetUnit: trackingType === 'numeric' ? targetUnit.trim() || null : null,
      subtaskTitles: trackingType === 'subtasks' ? trimmedSubtaskTitles : [],
    });
  }

  function toggleReminder() {
    if (saving) {
      return;
    }

    setReminderEnabled((current) => {
      const nextValue = !current;

      if (nextValue && !isValidReminderTime(reminderTime)) {
        setReminderTime('08:00');
        setDraftReminderHour(8);
        setDraftReminderMinute(0);
      }

      return nextValue;
    });
  }

  function handleReminderSwitch(value: boolean) {
    if (value && !isValidReminderTime(reminderTime)) {
      setReminderTime('08:00');
      setDraftReminderHour(8);
      setDraftReminderMinute(0);
    }

    setReminderEnabled(value);
  }

  function openTimeSelector() {
    const parsedTime = parseReminderTime(reminderTime);

    setDraftReminderHour(parsedTime?.hour ?? 8);
    setDraftReminderMinute(parsedTime?.minute ?? 0);
    setReminderTimeValidationMessage(null);
    setTimeSelectorVisible(true);
  }

  function saveReminderTime() {
    setReminderTime(`${padTimePart(draftReminderHour)}:${padTimePart(draftReminderMinute)}`);
    setReminderTimeValidationMessage(null);
    setTimeSelectorVisible(false);
  }

  function updateSubtaskTitle(index: number, value: string) {
    setSubtaskTitles((current) =>
      current.map((title, titleIndex) => (titleIndex === index ? value : title))
    );
    setTrackingValidationMessage(null);
  }

  function addSubtaskTitle() {
    setSubtaskTitles((current) => [...current, '']);
  }

  function removeSubtaskTitle(index: number) {
    setSubtaskTitles((current) => current.filter((_, titleIndex) => titleIndex !== index));
    setTrackingValidationMessage(null);
  }

  function moveSubtaskTitle(index: number, direction: -1 | 1) {
    setSubtaskTitles((current) => {
      const nextIndex = index + direction;

      if (nextIndex < 0 || nextIndex >= current.length) {
        return current;
      }

      const next = [...current];
      [next[index], next[nextIndex]] = [next[nextIndex], next[index]];

      return next;
    });
  }

  const previewName = name.trim() || 'Habit name';
  const previewDescription = description.trim();
  const hasReminderPreview = reminderEnabled && reminderTime.trim().length > 0;
  const schedulePreview = getSchedulePreview(
    scheduleType,
    scheduleWeekdays,
    scheduleIntervalDays,
    scheduleStartDate
  );
  const trackingPreview = getTrackingPreview(trackingType, subtaskTitles, targetValue, targetUnit);

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
          label="Description"
          multiline
          onChangeText={setDescription}
          placeholder="A few quiet pages before bed"
          style={styles.descriptionInput}
          value={description ?? ''}
        />

        <View style={styles.fieldGroup}>
          <Text style={styles.label}>Icon</Text>
          <Text style={styles.helperText}>Choose your icon for this habit.</Text>
          <Pressable
            accessibilityLabel="Open icon picker"
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
              fallbackIcon={DEFAULT_HABIT_ICON}
              iconLibrary={selectedIcon.iconLibrary}
              iconType={selectedIcon.iconType}
              iconValue={selectedIcon.iconValue ?? DEFAULT_HABIT_ICON}
              size={58}
            />
            <View style={styles.iconPickerText}>
              <Text style={styles.iconPickerTitle}>Selected icon</Text>
              <Text style={styles.iconPickerMeta}>
                tap to change
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
                <View style={[styles.swatch, { backgroundColor: option }]}>
                  {color === option ? (
                    <LucideCheck size={16} color={colors.background} strokeWidth={3.2} />
                  ) : null}
                </View>
              </Pressable>
            ))}
          </View>
        </View>
      </View>

      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionEyebrow}>Tracking</Text>
          <Text style={styles.sectionTitle}>Choose how progress is measured.</Text>
        </View>

        <View style={styles.trackingTypeGrid}>
          {(['checkbox', 'subtasks', 'numeric'] as const).map((type) => (
            <Pressable
              accessibilityLabel={`Set tracking to ${getTrackingTypeLabel(type)}`}
              accessibilityRole="button"
              accessibilityState={{ selected: trackingType === type }}
              disabled={saving}
              key={type}
              onPress={() => {
                setTrackingType(type);
                setTrackingValidationMessage(null);
              }}
              style={({ pressed }) => [
                styles.trackingTypeButton,
                trackingType === type && styles.selectedTrackingTypeButton,
                pressed && styles.pressed,
                saving && styles.disabled,
              ]}>
              <Text
                style={[
                  styles.trackingTypeTitle,
                  trackingType === type && styles.selectedTrackingTypeText,
                ]}>
                {getTrackingTypeLabel(type)}
              </Text>
              <Text
                style={[
                  styles.trackingTypeMeta,
                  trackingType === type && styles.selectedTrackingTypeMeta,
                ]}>
                {getTrackingTypeDescription(type)}
              </Text>
            </Pressable>
          ))}
        </View>

        {trackingType === 'subtasks' ? (
          <View style={styles.fieldGroup}>
            <Text style={styles.label}>Subtasks</Text>
            <Text style={styles.helperText}>All active subtasks must be checked to complete it.</Text>
            <View style={styles.subtaskList}>
              {subtaskTitles.map((subtaskTitle, index) => (
                <View key={`${index}-${subtaskTitles.length}`} style={styles.subtaskEditorRow}>
                  <View style={styles.subtaskInputWrap}>
                    <TextInputField
                      editable={!saving}
                      label={`Item ${index + 1}`}
                      onChangeText={(value) => updateSubtaskTitle(index, value)}
                      placeholder="Vitamin D"
                      value={subtaskTitle}
                    />
                  </View>
                  <View style={styles.subtaskActions}>
                    <Pressable
                      accessibilityLabel={`Move item ${index + 1} up`}
                      accessibilityRole="button"
                      disabled={saving || index === 0}
                      onPress={() => moveSubtaskTitle(index, -1)}
                      style={[styles.subtaskActionButton, (saving || index === 0) && styles.disabled]}>
                      <Text style={styles.subtaskActionText}>Up</Text>
                    </Pressable>
                    <Pressable
                      accessibilityLabel={`Move item ${index + 1} down`}
                      accessibilityRole="button"
                      disabled={saving || index === subtaskTitles.length - 1}
                      onPress={() => moveSubtaskTitle(index, 1)}
                      style={[
                        styles.subtaskActionButton,
                        (saving || index === subtaskTitles.length - 1) && styles.disabled,
                      ]}>
                      <Text style={styles.subtaskActionText}>Down</Text>
                    </Pressable>
                    <Pressable
                      accessibilityLabel={`Remove item ${index + 1}`}
                      accessibilityRole="button"
                      disabled={saving || subtaskTitles.length === 1}
                      onPress={() => removeSubtaskTitle(index)}
                      style={[
                        styles.subtaskActionButton,
                        styles.subtaskRemoveButton,
                        (saving || subtaskTitles.length === 1) && styles.disabled,
                      ]}>
                      <Text style={styles.subtaskRemoveText}>Remove</Text>
                    </Pressable>
                  </View>
                </View>
              ))}
            </View>
            <PrimaryButton
              disabled={saving}
              onPress={addSubtaskTitle}
              title="Add subtask"
              variant="secondary"
            />
          </View>
        ) : null}

        {trackingType === 'numeric' ? (
          <View style={styles.intervalFields}>
            <TextInputField
              editable={!saving}
              keyboardType="decimal-pad"
              label="Target value"
              onChangeText={(value) => {
                setTargetValue(value.replace(/[^0-9.,]/g, ''));
                setTrackingValidationMessage(null);
              }}
              placeholder="20"
              value={targetValue}
            />
            <TextInputField
              editable={!saving}
              helper="Optional. Examples: pages, liters, minutes."
              label="Unit"
              onChangeText={setTargetUnit}
              placeholder="pages"
              value={targetUnit}
            />
          </View>
        ) : null}

        {trackingValidationMessage ? (
          <Text style={styles.scheduleError}>{trackingValidationMessage}</Text>
        ) : null}
      </View>

      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionEyebrow}>Schedule</Text>
          <Text style={styles.sectionTitle}>Choose when it appears.</Text>
        </View>

        <View style={styles.scheduleTypeGrid}>
          {(['daily', 'weekdays', 'interval'] as const).map((type) => (
            <Pressable
              accessibilityLabel={`Set schedule to ${getScheduleTypeLabel(type)}`}
              accessibilityRole="button"
              accessibilityState={{ selected: scheduleType === type }}
              disabled={saving}
              key={type}
              onPress={() => {
                setScheduleType(type);
                setScheduleValidationMessage(null);
              }}
              style={({ pressed }) => [
                styles.scheduleTypeButton,
                scheduleType === type && styles.selectedScheduleTypeButton,
                pressed && styles.pressed,
                saving && styles.disabled,
              ]}>
              <Text
                style={[
                  styles.scheduleTypeTitle,
                  scheduleType === type && styles.selectedScheduleTypeText,
                ]}>
                {getScheduleTypeLabel(type)}
              </Text>
              <Text
                style={[
                  styles.scheduleTypeMeta,
                  scheduleType === type && styles.selectedScheduleTypeMeta,
                ]}>
                {getScheduleTypeDescription(type)}
              </Text>
            </Pressable>
          ))}
        </View>

        {scheduleType === 'weekdays' ? (
          <View style={styles.fieldGroup}>
            <Text style={styles.label}>Weekdays</Text>
            <View style={styles.weekdayChips}>
              {WEEKDAY_OPTIONS.map((weekday) => {
                const selected = scheduleWeekdays.includes(weekday.value);

                return (
                  <Pressable
                    accessibilityLabel={`${selected ? 'Remove' : 'Add'} ${weekday.label}`}
                    accessibilityRole="button"
                    accessibilityState={{ selected }}
                    disabled={saving}
                    key={weekday.value}
                    onPress={() => {
                      setScheduleWeekdays((current) =>
                        selected
                          ? current.filter((value) => value !== weekday.value)
                          : [...current, weekday.value].sort((a, b) => a - b)
                      );
                      setScheduleValidationMessage(null);
                    }}
                    style={[
                      styles.weekdayChip,
                      selected && styles.selectedWeekdayChip,
                      saving && styles.disabled,
                    ]}>
                    <Text
                      style={[
                        styles.weekdayChipText,
                        selected && styles.selectedWeekdayChipText,
                      ]}>
                      {weekday.label}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          </View>
        ) : null}

        {scheduleType === 'interval' ? (
          <View style={styles.intervalFields}>
            <TextInputField
              editable={!saving}
              keyboardType="number-pad"
              label="Every X days"
              onChangeText={(value) => {
                setScheduleIntervalDays(value.replace(/[^0-9]/g, ''));
                setScheduleValidationMessage(null);
              }}
              placeholder="3"
              value={scheduleIntervalDays}
            />
            <TextInputField
              editable={!saving}
              helper="This habit appears every X days starting from this date."
              label="Start date"
              onChangeText={(value) => {
                setScheduleStartDate(value);
                setScheduleValidationMessage(null);
              }}
              placeholder="2026-05-05"
              value={scheduleStartDate}
            />
          </View>
        ) : null}

        {scheduleValidationMessage ? (
          <Text style={styles.scheduleError}>{scheduleValidationMessage}</Text>
        ) : null}
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
            onValueChange={handleReminderSwitch}
            pointerEvents="none"
            thumbColor={reminderEnabled ? colors.primary : colors.textMuted}
            trackColor={{ false: colors.surfaceMuted, true: colors.primaryMuted }}
            value={reminderEnabled}
          />
        </Pressable>

        {reminderEnabled ? (
          <View style={styles.fieldGroup}>
            <Text style={styles.label}>Reminder time</Text>
            <Text style={styles.helperText}>Choose a local daily reminder time.</Text>
            <Pressable
              accessibilityLabel="Open reminder time selector"
              accessibilityRole="button"
              disabled={saving}
              onPress={openTimeSelector}
              style={({ pressed }) => [
                styles.timeSelectorButton,
                pressed && styles.pressed,
                saving && styles.disabled,
              ]}>
              <View>
                <Text style={styles.timeSelectorLabel}>Selected time</Text>
                <Text style={styles.timeSelectorValue}>{reminderTime || '08:00'}</Text>
              </View>
              <Text style={styles.timeSelectorAction}>Change</Text>
            </Pressable>
            {reminderTimeValidationMessage ? (
              <Text style={styles.scheduleError}>{reminderTimeValidationMessage}</Text>
            ) : null}
          </View>
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
            fallbackIcon={DEFAULT_HABIT_ICON}
            iconLibrary={selectedIcon.iconLibrary}
            iconType={selectedIcon.iconType}
            iconValue={selectedIcon.iconValue ?? DEFAULT_HABIT_ICON}
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
              {schedulePreview}
              {` - ${trackingPreview}`}
              {hasReminderPreview ? ` - reminder at ${reminderTime.trim()}` : ''}
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

      <IconPicker
        accentColor={color}
        onClose={() => setPickerVisible(false)}
        onSelect={setSelectedIcon}
        selected={selectedIcon}
        visible={pickerVisible}
      />

      <Modal
        animationType="slide"
        onRequestClose={() => setTimeSelectorVisible(false)}
        transparent
        visible={timeSelectorVisible}>
        <View style={styles.timeModalBackdrop}>
          <View style={styles.timeModalCard}>
            <View style={styles.timeModalHeader}>
              <Text style={styles.sectionEyebrow}>Reminder time</Text>
              <Text style={styles.timeModalTitle}>
                {padTimePart(draftReminderHour)}:{padTimePart(draftReminderMinute)}
              </Text>
              <Text style={styles.helperText}>Pick an hour and minute. Times are stored as HH:mm.</Text>
            </View>

            <View style={styles.timeColumns}>
              <View style={styles.timeColumn}>
                <Text style={styles.label}>Hour</Text>
                <ScrollView
                  style={styles.timeOptionsScroll}
                  contentContainerStyle={styles.timeOptionGrid}>
                  {HOUR_OPTIONS.map((hour) => (
                    <Pressable
                      accessibilityLabel={`Select hour ${padTimePart(hour)}`}
                      accessibilityRole="button"
                      accessibilityState={{ selected: draftReminderHour === hour }}
                      key={hour}
                      onPress={() => setDraftReminderHour(hour)}
                      style={[
                        styles.timeOption,
                        draftReminderHour === hour && styles.selectedTimeOption,
                      ]}>
                      <Text
                        style={[
                          styles.timeOptionText,
                          draftReminderHour === hour && styles.selectedTimeOptionText,
                        ]}>
                        {padTimePart(hour)}
                      </Text>
                    </Pressable>
                  ))}
                </ScrollView>
              </View>

              <View style={styles.timeColumn}>
                <Text style={styles.label}>Minute</Text>
                <ScrollView
                  style={styles.timeOptionsScroll}
                  contentContainerStyle={styles.timeOptionGrid}>
                  {MINUTE_OPTIONS.map((minute) => (
                    <Pressable
                      accessibilityLabel={`Select minute ${padTimePart(minute)}`}
                      accessibilityRole="button"
                      accessibilityState={{ selected: draftReminderMinute === minute }}
                      key={minute}
                      onPress={() => setDraftReminderMinute(minute)}
                      style={[
                        styles.timeOption,
                        draftReminderMinute === minute && styles.selectedTimeOption,
                      ]}>
                      <Text
                        style={[
                          styles.timeOptionText,
                          draftReminderMinute === minute && styles.selectedTimeOptionText,
                        ]}>
                        {padTimePart(minute)}
                      </Text>
                    </Pressable>
                  ))}
                </ScrollView>
              </View>
            </View>

            <View style={styles.timeModalActions}>
              <PrimaryButton
                onPress={() => setTimeSelectorVisible(false)}
                title="Cancel"
                variant="secondary"
              />
              <PrimaryButton onPress={saveReminderTime} title="Save time" />
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

function getScheduleTypeLabel(scheduleType: HabitScheduleType) {
  if (scheduleType === 'weekdays') {
    return 'Weekdays';
  }

  if (scheduleType === 'interval') {
    return 'Every X days';
  }

  return 'Daily';
}

function getScheduleTypeDescription(scheduleType: HabitScheduleType) {
  if (scheduleType === 'weekdays') {
    return 'Pick days';
  }

  if (scheduleType === 'interval') {
    return 'Custom rhythm';
  }

  return 'Every day';
}

function getTrackingTypeLabel(trackingType: HabitTrackingType) {
  if (trackingType === 'subtasks') {
    return 'Subtasks';
  }

  if (trackingType === 'numeric') {
    return 'Numeric goal';
  }

  return 'Checkbox';
}

function getTrackingTypeDescription(trackingType: HabitTrackingType) {
  if (trackingType === 'subtasks') {
    return 'Checklist';
  }

  if (trackingType === 'numeric') {
    return 'Target amount';
  }

  return 'One tap';
}

function getTrackingPreview(
  trackingType: HabitTrackingType,
  subtaskTitles: string[],
  targetValue: string,
  targetUnit: string
) {
  if (trackingType === 'subtasks') {
    const count = subtaskTitles.map((title) => title.trim()).filter(Boolean).length;

    return `${count || 0} subtask${count === 1 ? '' : 's'}`;
  }

  if (trackingType === 'numeric') {
    return `Target ${targetValue || '0'}${targetUnit.trim() ? ` ${targetUnit.trim()}` : ''}`;
  }

  return 'Checkbox habit';
}

function getSchedulePreview(
  scheduleType: HabitScheduleType,
  weekdays: number[],
  intervalDays: string,
  startDate: string
) {
  if (scheduleType === 'weekdays') {
    const labels = WEEKDAY_OPTIONS.filter((weekday) => weekdays.includes(weekday.value))
      .map((weekday) => weekday.label)
      .join(', ');

    return labels || 'No weekdays selected';
  }

  if (scheduleType === 'interval') {
    return `Every ${intervalDays || 'X'} day${intervalDays === '1' ? '' : 's'} from ${startDate}`;
  }

  return 'Every day';
}

function isDateString(value: string) {
  return /^\d{4}-\d{2}-\d{2}$/.test(value);
}

function padTimePart(value: number) {
  return String(value).padStart(2, '0');
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
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radius.pill,
  },
  scheduleTypeGrid: {
    gap: spacing.sm,
  },
  trackingTypeGrid: {
    gap: spacing.sm,
  },
  trackingTypeButton: {
    gap: spacing.xs,
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.lg,
    backgroundColor: colors.surfaceElevated,
  },
  selectedTrackingTypeButton: {
    borderColor: colors.primary,
    backgroundColor: colors.primaryMuted,
  },
  trackingTypeTitle: {
    color: colors.text,
    ...typography.body,
    fontWeight: '900',
  },
  selectedTrackingTypeText: {
    color: colors.primary,
  },
  trackingTypeMeta: {
    color: colors.textMuted,
    ...typography.caption,
  },
  selectedTrackingTypeMeta: {
    color: colors.text,
  },
  subtaskList: {
    gap: spacing.md,
  },
  subtaskEditorRow: {
    gap: spacing.sm,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.lg,
    backgroundColor: colors.surfaceElevated,
  },
  subtaskInputWrap: {
    flex: 1,
  },
  subtaskActions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  subtaskActionButton: {
    minHeight: 34,
    justifyContent: 'center',
    paddingHorizontal: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.pill,
    backgroundColor: colors.surface,
  },
  subtaskActionText: {
    color: colors.textMuted,
    ...typography.small,
    fontWeight: '900',
  },
  subtaskRemoveButton: {
    borderColor: colors.destructive,
  },
  subtaskRemoveText: {
    color: colors.destructive,
    ...typography.small,
    fontWeight: '900',
  },
  scheduleTypeButton: {
    gap: spacing.xs,
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.lg,
    backgroundColor: colors.surfaceElevated,
  },
  selectedScheduleTypeButton: {
    borderColor: colors.primary,
    backgroundColor: colors.primaryMuted,
  },
  scheduleTypeTitle: {
    color: colors.text,
    ...typography.body,
    fontWeight: '900',
  },
  selectedScheduleTypeText: {
    color: colors.primary,
  },
  scheduleTypeMeta: {
    color: colors.textMuted,
    ...typography.caption,
  },
  selectedScheduleTypeMeta: {
    color: colors.text,
  },
  weekdayChips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  weekdayChip: {
    minHeight: 42,
    minWidth: 58,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.pill,
    backgroundColor: colors.surfaceElevated,
  },
  selectedWeekdayChip: {
    borderColor: colors.primary,
    backgroundColor: colors.primary,
  },
  weekdayChipText: {
    color: colors.textMuted,
    ...typography.caption,
    fontWeight: '900',
  },
  selectedWeekdayChipText: {
    color: colors.background,
  },
  intervalFields: {
    gap: spacing.lg,
  },
  scheduleError: {
    color: colors.destructive,
    ...typography.caption,
    fontWeight: '700',
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
  timeSelectorButton: {
    minHeight: 82,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.lg,
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.lg,
    backgroundColor: colors.surfaceElevated,
  },
  timeSelectorLabel: {
    color: colors.textMuted,
    ...typography.caption,
    fontWeight: '800',
  },
  timeSelectorValue: {
    color: colors.text,
    fontSize: 34,
    lineHeight: 40,
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
    maxHeight: '88%',
    gap: spacing.lg,
    padding: spacing.xl,
    borderTopLeftRadius: radius.xl,
    borderTopRightRadius: radius.xl,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  timeModalHeader: {
    gap: spacing.xs,
  },
  timeModalTitle: {
    color: colors.text,
    fontSize: 42,
    lineHeight: 48,
    fontWeight: '900',
  },
  timeColumns: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  timeColumn: {
    flex: 1,
    gap: spacing.sm,
  },
  timeOptionGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
    paddingBottom: spacing.md,
  },
  timeOptionsScroll: {
    maxHeight: 238,
  },
  timeOption: {
    width: 48,
    minHeight: 40,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.pill,
    backgroundColor: colors.surfaceElevated,
  },
  selectedTimeOption: {
    borderColor: colors.primary,
    backgroundColor: colors.primary,
  },
  timeOptionText: {
    color: colors.textMuted,
    ...typography.caption,
    fontWeight: '900',
  },
  selectedTimeOptionText: {
    color: colors.background,
  },
  timeModalActions: {
    gap: spacing.md,
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
