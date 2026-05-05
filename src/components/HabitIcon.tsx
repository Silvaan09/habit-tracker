import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { StyleSheet, Text, View } from 'react-native';

import { colors, radius } from '@/src/theme';
import type { HabitIconType } from '@/src/types/Habit';

type IconLibrary = 'Ionicons' | 'MaterialCommunityIcons' | string | null | undefined;

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
  const symbol = iconValue ?? fallbackIcon;
  const iconSize = Math.max(18, Math.round(size * 0.48));
  const canRenderVectorIcon = iconType === 'icon' && symbol && hasVectorIcon(iconLibrary, symbol);
  const textFallbackSymbol = fallbackIcon ?? symbol;

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
      {canRenderVectorIcon ? (
        <VectorHabitIcon library={iconLibrary} name={symbol} size={iconSize} />
      ) : (
        <Text style={[styles.emoji, { fontSize: iconSize }]}>
          {getFallbackSymbol(textFallbackSymbol)}
        </Text>
      )}
    </View>
  );
}

function VectorHabitIcon({
  library,
  name,
  size,
}: {
  library: IconLibrary;
  name: string;
  size: number;
}) {
  if (library === 'MaterialCommunityIcons') {
    return (
      <MaterialCommunityIcons
        color={colors.background}
        name={name as React.ComponentProps<typeof MaterialCommunityIcons>['name']}
        size={size}
      />
    );
  }

  return (
    <Ionicons
      color={colors.background}
      name={name as React.ComponentProps<typeof Ionicons>['name']}
      size={size}
    />
  );
}

function hasVectorIcon(library: IconLibrary, name: string) {
  if (library === 'MaterialCommunityIcons') {
    return Object.prototype.hasOwnProperty.call(MaterialCommunityIcons.glyphMap, name);
  }

  if (library === 'Ionicons') {
    return Object.prototype.hasOwnProperty.call(Ionicons.glyphMap, name);
  }

  return false;
}

function getFallbackSymbol(symbol: string | null | undefined) {
  if (!symbol) {
    return 'H';
  }

  return Array.from(symbol.trim())[0] || 'H';
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  emoji: {
    color: colors.background,
    fontWeight: '900',
  },
});
