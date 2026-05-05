import { Ionicons } from '@expo/vector-icons';
import { GestureResponderEvent, Pressable, StyleSheet, Text, View } from 'react-native';

import { HabitIcon } from '@/src/components/HabitIcon';
import { colors, radius, spacing, typography } from '@/src/theme';
import type { Habit } from '@/src/types/Habit';

type HabitRowProps = {
  habit: Habit;
  completed: boolean;
  skipped?: boolean;
  skipReason?: string | null;
  progressLabel?: string | null;
  progressPercent?: number | null;
  onToggle: (habitId: string) => void;
  onSkip?: (habitId: string) => void;
  onUndoSkip?: (habitId: string) => void;
  onPress?: (habitId: string) => void;
  disabled?: boolean;
  skipDisabled?: boolean;
  toggleDisabled?: boolean;
  completionDateLabel?: string;
};

export function HabitRow({
  habit,
  completed,
  skipped = false,
  skipReason,
  progressLabel,
  progressPercent,
  onToggle,
  onSkip,
  onUndoSkip,
  onPress,
  disabled = false,
  skipDisabled = false,
  toggleDisabled = false,
  completionDateLabel = 'today',
}: HabitRowProps) {
  const accentColor = habit.color ?? colors.habitGreen;
  const statusText = completed
    ? `Done for ${completionDateLabel}`
    : skipped
      ? `Skipped for ${completionDateLabel}`
      : `Not done for ${completionDateLabel}`;

  function handleToggle(event: GestureResponderEvent) {
    event.stopPropagation();
    onToggle(habit.id);
  }

  function handleSkip(event: GestureResponderEvent) {
    event.stopPropagation();
    onSkip?.(habit.id);
  }

  function handleUndoSkip(event: GestureResponderEvent) {
    event.stopPropagation();
    onUndoSkip?.(habit.id);
  }

  return (
    <Pressable
      accessibilityLabel={`Open ${habit.name}. ${
        completed
          ? `Done for ${completionDateLabel}.`
          : skipped
            ? `Skipped for ${completionDateLabel}.`
            : `Not done for ${completionDateLabel}.`
      }`}
      accessibilityRole={onPress ? 'button' : 'checkbox'}
      accessibilityState={onPress ? undefined : { checked: completed }}
      disabled={disabled}
      onPress={() => {
        if (onPress) {
          onPress(habit.id);
          return;
        }

        onToggle(habit.id);
      }}
      style={({ pressed }) => [
        styles.row,
        completed && styles.completedRow,
        skipped && styles.skippedRow,
        pressed && styles.pressed,
        disabled && styles.disabled,
      ]}>
      <HabitIcon
        color={accentColor}
        fallbackIcon={habit.icon ?? habit.name.charAt(0).toUpperCase()}
        iconLibrary={habit.iconLibrary}
        iconType={habit.iconType}
        iconValue={habit.iconValue}
        size={44}
      />

      <View style={styles.textContainer}>
        <Text style={[styles.name, completed && styles.completedName]}>{habit.name}</Text>
        <Text style={[styles.status, skipped && styles.skippedStatus]}>{statusText}</Text>
        {skipped && skipReason ? (
          <Text numberOfLines={2} style={styles.skipReason}>
            Reason: {skipReason}
          </Text>
        ) : null}
        {progressLabel ? (
          <View style={styles.progressBlock}>
            <Text style={styles.progressLabel}>{progressLabel}</Text>
            <View style={styles.progressTrack}>
              <View
                style={[
                  styles.progressFill,
                  { width: `${Math.max(0, Math.min(progressPercent ?? 0, 1)) * 100}%` },
                ]}
              />
            </View>
          </View>
        ) : null}
        {!completed && onSkip ? (
          skipped ? (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={`Undo skip for ${habit.name}`}
              disabled={disabled || skipDisabled}
              hitSlop={6}
              onPress={handleUndoSkip}
              style={({ pressed }) => [
                styles.skipChip,
                pressed && styles.pressed,
                (disabled || skipDisabled) && styles.chipDisabled,
              ]}>
              <Text style={styles.skipChipText}>Undo skip</Text>
            </Pressable>
          ) : (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={`Skip ${habit.name}`}
              disabled={disabled || skipDisabled}
              hitSlop={6}
              onPress={handleSkip}
              style={({ pressed }) => [
                styles.skipChip,
                pressed && styles.pressed,
                (disabled || skipDisabled) && styles.chipDisabled,
              ]}>
              <Text style={styles.skipChipText}>Skip</Text>
            </Pressable>
          )
        ) : null}
      </View>

      <Pressable
        accessibilityRole="checkbox"
        accessibilityState={{ checked: completed }}
        accessibilityLabel={`${completed ? 'Uncheck' : 'Check'} ${
          habit.name
        } for ${completionDateLabel}`}
        disabled={disabled || toggleDisabled}
        hitSlop={8}
        onPress={handleToggle}
        style={[
          styles.checkbox,
          completed ? styles.completedCheckbox : undefined,
          toggleDisabled && styles.toggleDisabled,
        ]}>
        {completed ? <Ionicons name="checkmark" size={20} color={colors.background} /> : null}
      </Pressable>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: {
    minHeight: 76,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.lg,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.lg,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.xl,
    backgroundColor: colors.surface,
  },
  completedRow: {
    borderColor: colors.primary,
    backgroundColor: colors.primaryMuted,
  },
  skippedRow: {
    borderColor: colors.warning,
    backgroundColor: colors.surfaceElevated,
  },
  pressed: {
    opacity: 0.78,
  },
  disabled: {
    opacity: 0.42,
  },
  textContainer: {
    flex: 1,
    gap: spacing.xs,
  },
  name: {
    color: colors.text,
    ...typography.body,
    fontWeight: '800',
  },
  completedName: {
    color: colors.text,
  },
  status: {
    color: colors.textMuted,
    ...typography.caption,
  },
  skippedStatus: {
    color: colors.warning,
    fontWeight: '800',
  },
  skipReason: {
    color: colors.textMuted,
    ...typography.small,
  },
  skipChip: {
    alignSelf: 'flex-start',
    minHeight: 30,
    justifyContent: 'center',
    paddingHorizontal: spacing.md,
    borderWidth: 1,
    borderColor: colors.warning,
    borderRadius: radius.pill,
    backgroundColor: colors.surfaceElevated,
  },
  skipChipText: {
    color: colors.warning,
    ...typography.small,
    fontWeight: '900',
  },
  chipDisabled: {
    opacity: 0.42,
  },
  progressBlock: {
    gap: 4,
    paddingTop: 2,
  },
  progressLabel: {
    color: colors.textMuted,
    ...typography.small,
    fontWeight: '800',
  },
  progressTrack: {
    height: 6,
    overflow: 'hidden',
    borderRadius: radius.pill,
    backgroundColor: colors.surfaceMuted,
  },
  progressFill: {
    height: '100%',
    borderRadius: radius.pill,
    backgroundColor: colors.primary,
  },
  checkbox: {
    width: 34,
    height: 34,
    borderRadius: radius.pill,
    borderWidth: 2,
    borderColor: colors.surfaceMuted,
    alignItems: 'center',
    justifyContent: 'center',
  },
  completedCheckbox: {
    borderColor: colors.primary,
    backgroundColor: colors.primary,
  },
  toggleDisabled: {
    opacity: 0.42,
  },
});
