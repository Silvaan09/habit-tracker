import { Ionicons } from '@expo/vector-icons';
import { GestureResponderEvent, Pressable, StyleSheet, Text, View } from 'react-native';

import { HabitIcon } from '@/src/components/HabitIcon';
import { colors, radius, spacing, typography } from '@/src/theme';
import type { Habit } from '@/src/types/Habit';

type HabitRowProps = {
  habit: Habit;
  completed: boolean;
  onToggle: (habitId: string) => void;
  onPress?: (habitId: string) => void;
  disabled?: boolean;
  completionDateLabel?: string;
};

export function HabitRow({
  habit,
  completed,
  onToggle,
  onPress,
  disabled = false,
  completionDateLabel = 'today',
}: HabitRowProps) {
  const accentColor = habit.color ?? colors.habitGreen;

  function handleToggle(event: GestureResponderEvent) {
    event.stopPropagation();
    onToggle(habit.id);
  }

  return (
    <Pressable
      accessibilityLabel={`Open ${habit.name}. ${
        completed ? `Done for ${completionDateLabel}.` : `Not done for ${completionDateLabel}.`
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
        <Text style={styles.status}>
          {completed ? `Done for ${completionDateLabel}` : `Not done for ${completionDateLabel}`}
        </Text>
      </View>

      <Pressable
        accessibilityRole="checkbox"
        accessibilityState={{ checked: completed }}
        accessibilityLabel={`${completed ? 'Uncheck' : 'Check'} ${
          habit.name
        } for ${completionDateLabel}`}
        disabled={disabled}
        hitSlop={8}
        onPress={handleToggle}
        style={[
          styles.checkbox,
          completed ? styles.completedCheckbox : undefined,
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
});
