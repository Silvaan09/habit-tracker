import { PropsWithChildren, useEffect, useRef, useState } from 'react';
import {
  Animated,
  Easing,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  StyleProp,
  StyleSheet,
  View,
  ViewStyle,
} from 'react-native';

const SHEET_OFFSET = 88;
const ENTER_DURATION = 260;
const EXIT_DURATION = 200;
const BACKDROP_ENTER_DURATION = 180;
const BACKDROP_EXIT_DURATION = 150;

type BottomSheetModalProps = PropsWithChildren<{
  visible: boolean;
  onRequestClose: () => void;
  sheetStyle?: StyleProp<ViewStyle>;
  closeOnBackdropPress?: boolean;
}>;

export function BottomSheetModal({
  children,
  closeOnBackdropPress = true,
  onRequestClose,
  sheetStyle,
  visible,
}: BottomSheetModalProps) {
  const [mounted, setMounted] = useState(visible);
  const backdropOpacity = useRef(new Animated.Value(0)).current;
  const frameRef = useRef<number | null>(null);
  const sheetOpacity = useRef(new Animated.Value(0)).current;
  const sheetTranslateY = useRef(new Animated.Value(SHEET_OFFSET)).current;

  useEffect(() => {
    if (frameRef.current !== null) {
      cancelAnimationFrame(frameRef.current);
      frameRef.current = null;
    }

    if (visible) {
      setMounted(true);
      sheetTranslateY.stopAnimation();
      backdropOpacity.stopAnimation();
      sheetOpacity.stopAnimation();
      sheetTranslateY.setValue(SHEET_OFFSET);
      backdropOpacity.setValue(0);
      sheetOpacity.setValue(0);

      frameRef.current = requestAnimationFrame(() => {
        frameRef.current = null;
        Animated.parallel([
          Animated.timing(backdropOpacity, {
            duration: BACKDROP_ENTER_DURATION,
            easing: Easing.out(Easing.cubic),
            toValue: 1,
            useNativeDriver: true,
          }),
          Animated.timing(sheetOpacity, {
            duration: 120,
            easing: Easing.out(Easing.cubic),
            toValue: 1,
            useNativeDriver: true,
          }),
          Animated.timing(sheetTranslateY, {
            duration: ENTER_DURATION,
            easing: Easing.out(Easing.cubic),
            toValue: 0,
            useNativeDriver: true,
          }),
        ]).start();
      });
      return () => {
        if (frameRef.current !== null) {
          cancelAnimationFrame(frameRef.current);
          frameRef.current = null;
        }
      };
    }

    sheetTranslateY.stopAnimation();
    backdropOpacity.stopAnimation();
    sheetOpacity.stopAnimation();

    Animated.parallel([
      Animated.timing(backdropOpacity, {
        duration: BACKDROP_EXIT_DURATION,
        easing: Easing.in(Easing.cubic),
        toValue: 0,
        useNativeDriver: true,
      }),
      Animated.timing(sheetOpacity, {
        duration: 120,
        easing: Easing.in(Easing.cubic),
        toValue: 0,
        useNativeDriver: true,
      }),
      Animated.timing(sheetTranslateY, {
        duration: EXIT_DURATION,
        easing: Easing.in(Easing.cubic),
        toValue: SHEET_OFFSET,
        useNativeDriver: true,
      }),
    ]).start(({ finished }) => {
      if (finished) {
        setMounted(false);
      }
    });
  }, [backdropOpacity, sheetOpacity, sheetTranslateY, visible]);

  if (!mounted) {
    return null;
  }

  return (
    <Modal animationType="none" onRequestClose={onRequestClose} transparent visible={mounted}>
      <View style={styles.root}>
        <Animated.View
          pointerEvents="none"
          style={[styles.backdrop, { opacity: backdropOpacity }]}
        />
        {closeOnBackdropPress ? (
          <Pressable
            accessibilityLabel="Close modal"
            accessibilityRole="button"
            onPress={onRequestClose}
            style={styles.backdropPressTarget}
          />
        ) : null}
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          pointerEvents="box-none"
          style={styles.sheetPosition}>
          <Animated.View
            style={[
              sheetStyle,
              {
                opacity: sheetOpacity,
                transform: [{ translateY: sheetTranslateY }],
              },
            ]}>
            {children}
          </Animated.View>
        </KeyboardAvoidingView>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.72)',
  },
  backdropPressTarget: {
    ...StyleSheet.absoluteFillObject,
  },
  sheetPosition: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'flex-end',
  },
});
