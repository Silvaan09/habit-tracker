import { Pressable, StyleSheet, Text } from 'react-native';

import { colors, radius, spacing, typography } from '@/src/theme';

type PrimaryButtonProps = {
  title: string;
  onPress: () => void;
  disabled?: boolean;
  variant?: 'primary' | 'secondary' | 'danger';
};

export function PrimaryButton({
  title,
  onPress,
  disabled = false,
  variant = 'primary',
}: PrimaryButtonProps) {
  return (
    <Pressable
      accessibilityRole="button"
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [
        styles.button,
        variant === 'secondary' && styles.secondaryButton,
        variant === 'danger' && styles.dangerButton,
        pressed && styles.pressed,
        disabled && styles.disabled,
      ]}>
      <Text
        style={[
          styles.text,
          variant === 'secondary' && styles.secondaryText,
          variant === 'danger' && styles.dangerText,
        ]}>
        {title}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    minHeight: 52,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.xl,
    borderRadius: radius.pill,
    backgroundColor: colors.primary,
  },
  secondaryButton: {
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surfaceElevated,
  },
  dangerButton: {
    backgroundColor: colors.destructive,
  },
  text: {
    color: colors.background,
    ...typography.body,
    fontWeight: '900',
  },
  secondaryText: {
    color: colors.text,
  },
  dangerText: {
    color: colors.text,
  },
  pressed: {
    opacity: 0.78,
  },
  disabled: {
    opacity: 0.42,
  },
});
