import { StyleSheet, View } from 'react-native';

import { getLucideHabitIcon } from '@/src/components/lucideHabitIcons';
import { colors, radius } from '@/src/theme';
import type { HabitIconType } from '@/src/types/Habit';

type IconLibrary = 'lucide' | string | null | undefined;

type HabitIconProps = {
  iconType?: HabitIconType | null;
  iconValue?: string | null;
  iconLibrary?: IconLibrary;
  fallbackIcon?: string | null;
  color?: string | null;
  size?: number;
};

export function HabitIcon({
  iconType,
  iconValue,
  iconLibrary,
  fallbackIcon,
  color = colors.habitGreen,
  size = 44,
}: HabitIconProps) {
  const iconSize = Math.max(18, Math.round(size * 0.48));
  const Icon = getLucideHabitIcon(
    iconType === 'icon' && iconLibrary === 'lucide' ? iconValue : fallbackIcon
  );

  return (
    <View
      style={[
        styles.container,
        {
          width: size,
          height: size,
          borderRadius: size >= 64 ? radius.pill : Math.round(size * 0.35),
          backgroundColor: color ?? colors.habitGreen,
        },
      ]}>
      <Icon color={colors.background} size={iconSize} strokeWidth={2.8} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
  },
});
