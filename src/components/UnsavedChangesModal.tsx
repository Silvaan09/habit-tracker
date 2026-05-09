import { PropsWithChildren, useEffect, useRef, useState } from 'react';
import {
  Animated,
  Easing,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import { colors, radius, spacing, typography } from '@/src/theme';

type UnsavedChangesModalProps = {
  visible: boolean;
  title?: string;
  message?: string;
  saveLabel?: string;
  discardLabel?: string;
  cancelLabel?: string;
  saving?: boolean;
  onSave: () => void | Promise<void>;
  onDiscard: () => void;
  onCancel: () => void;
};

export function UnsavedChangesModal({
  cancelLabel = 'Cancel',
  discardLabel = 'Discard',
  message = 'You have unsaved changes. Save them before closing?',
  onCancel,
  onDiscard,
  onSave,
  saveLabel = 'Save',
  saving = false,
  title = 'Save changes?',
  visible,
}: UnsavedChangesModalProps) {
  const [mounted, setMounted] = useState(visible);
  const opacity = useRef(new Animated.Value(0)).current;
  const scale = useRef(new Animated.Value(0.96)).current;

  useEffect(() => {
    if (visible) {
      setMounted(true);
      opacity.stopAnimation();
      scale.stopAnimation();
      opacity.setValue(0);
      scale.setValue(0.96);
      Animated.parallel([
        Animated.timing(opacity, {
          duration: 160,
          easing: Easing.out(Easing.cubic),
          toValue: 1,
          useNativeDriver: true,
        }),
        Animated.timing(scale, {
          duration: 180,
          easing: Easing.out(Easing.cubic),
          toValue: 1,
          useNativeDriver: true,
        }),
      ]).start();
      return;
    }

    opacity.stopAnimation();
    scale.stopAnimation();
    Animated.parallel([
      Animated.timing(opacity, {
        duration: 130,
        easing: Easing.in(Easing.cubic),
        toValue: 0,
        useNativeDriver: true,
      }),
      Animated.timing(scale, {
        duration: 130,
        easing: Easing.in(Easing.cubic),
        toValue: 0.98,
        useNativeDriver: true,
      }),
    ]).start(({ finished }) => {
      if (finished) {
        setMounted(false);
      }
    });
  }, [opacity, scale, visible]);

  if (!mounted) {
    return null;
  }

  return (
    <Modal animationType="none" onRequestClose={onCancel} transparent visible={mounted}>
      <Animated.View style={[styles.root, { opacity }]}>
        <Pressable
          accessibilityLabel="Cancel closing progress"
          accessibilityRole="button"
          onPress={onCancel}
          style={styles.backdrop}
        />
        <View pointerEvents="box-none" style={styles.center}>
          <Animated.View style={[styles.card, { transform: [{ scale }] }]}>
            <View style={styles.copy}>
              <Text style={styles.title}>{title}</Text>
              <Text style={styles.body}>{message}</Text>
            </View>
            <View style={styles.actions}>
              <DialogButton disabled={saving} kind="primary" onPress={onSave}>
                {saving ? 'Saving...' : saveLabel}
              </DialogButton>
              <DialogButton disabled={saving} kind="danger" onPress={onDiscard}>
                {discardLabel}
              </DialogButton>
              <DialogButton disabled={saving} kind="secondary" onPress={onCancel}>
                {cancelLabel}
              </DialogButton>
            </View>
          </Animated.View>
        </View>
      </Animated.View>
    </Modal>
  );
}

type DialogButtonProps = PropsWithChildren<{
  kind: 'primary' | 'secondary' | 'danger';
  disabled: boolean;
  onPress: () => void | Promise<void>;
}>;

function DialogButton({ children, disabled, kind, onPress }: DialogButtonProps) {
  return (
    <Pressable
      accessibilityRole="button"
      disabled={disabled}
      onPress={() => {
        void onPress();
      }}
      style={({ pressed }) => [
        styles.button,
        kind === 'primary' && styles.primaryButton,
        kind === 'secondary' && styles.secondaryButton,
        kind === 'danger' && styles.dangerButton,
        pressed && styles.pressed,
        disabled && styles.disabled,
      ]}>
      <Text
        style={[
          styles.buttonText,
          kind === 'primary' && styles.primaryButtonText,
          kind === 'danger' && styles.dangerButtonText,
        ]}>
        {children}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.76)',
  },
  center: {
    flex: 1,
    justifyContent: 'center',
    padding: spacing.xl,
  },
  card: {
    gap: spacing.lg,
    padding: spacing.xl,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.xl,
    backgroundColor: colors.surface,
  },
  copy: {
    gap: spacing.sm,
  },
  title: {
    color: colors.text,
    ...typography.heading,
  },
  body: {
    color: colors.textMuted,
    ...typography.caption,
  },
  actions: {
    gap: spacing.sm,
  },
  button: {
    minHeight: 48,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.lg,
    borderRadius: radius.pill,
  },
  primaryButton: {
    backgroundColor: colors.primary,
  },
  secondaryButton: {
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surfaceElevated,
  },
  dangerButton: {
    borderWidth: 1,
    borderColor: colors.destructive,
    backgroundColor: 'rgba(255, 95, 109, 0.12)',
  },
  buttonText: {
    color: colors.text,
    ...typography.caption,
    fontWeight: '900',
  },
  primaryButtonText: {
    color: colors.background,
  },
  dangerButtonText: {
    color: colors.destructive,
  },
  pressed: {
    opacity: 0.78,
  },
  disabled: {
    opacity: 0.42,
  },
});
