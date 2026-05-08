import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { Pressable, StyleSheet } from 'react-native';

import { colors } from '@/src/theme';
import { handleGuardedHeaderBack } from '@/src/utils/backGuard';

const BUTTON_SIZE = 40;

type HeaderBackButtonProps = {
  accessibilityLabel?: string;
  onPress?: () => void;
};

export function HeaderBackButton({
  accessibilityLabel = 'Go back',
  onPress,
}: HeaderBackButtonProps) {
  function handlePress() {
    if (handleGuardedHeaderBack()) {
      return;
    }

    if (onPress) {
      onPress();
      return;
    }

    if (router.canGoBack()) {
      router.back();
      return;
    }

    router.replace('/');
  }

  return (
    <Pressable
      accessibilityLabel={accessibilityLabel}
      accessibilityRole="button"
      hitSlop={10}
      onPress={handlePress}
      style={styles.button}>
      <Ionicons name="chevron-back" size={23} color={colors.background} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    width: BUTTON_SIZE,
    height: BUTTON_SIZE,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: BUTTON_SIZE / 2,
    backgroundColor: colors.primary,
  },
});
