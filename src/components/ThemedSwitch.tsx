import { Switch } from 'react-native';

import { colors } from '@/src/theme';

type ThemedSwitchProps = {
  value: boolean;
  onValueChange: (value: boolean) => void;
  disabled?: boolean;
  accessibilityLabel?: string;
};

export function ThemedSwitch({
  value,
  onValueChange,
  disabled = false,
  accessibilityLabel,
}: ThemedSwitchProps) {
  return (
    <Switch
      accessibilityLabel={accessibilityLabel}
      disabled={disabled}
      ios_backgroundColor={colors.surfaceMuted}
      onValueChange={onValueChange}
      thumbColor={value ? '#bdfe54' : colors.textMuted}
      trackColor={{ false: colors.surfaceMuted, true: colors.surfaceMuted }}
      value={value}
    />
  );
}