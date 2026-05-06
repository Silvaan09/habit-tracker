import { PropsWithChildren, useEffect, useRef, useState } from 'react';
import {
  Animated,
  Easing,
  Modal,
  Pressable,
  StyleProp,
  StyleSheet,
  View,
  ViewStyle,
} from 'react-native';

const SHEET_OFFSET = 72;
const ENTER_DURATION = 260;
const EXIT_DURATION = 165;
const BACKDROP_ENTER_DURATION = 170;
const BACKDROP_EXIT_DURATION = 120;

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
  const sheetTranslateY = useRef(new Animated.Value(SHEET_OFFSET)).current;

  useEffect(() => {
    if (visible) {
      setMounted(true);
      sheetTranslateY.stopAnimation();
      backdropOpacity.stopAnimation();
      sheetTranslateY.setValue(SHEET_OFFSET);
      backdropOpacity.setValue(0);

      requestAnimationFrame(() => {
        Animated.parallel([
          Animated.timing(backdropOpacity, {
            duration: BACKDROP_ENTER_DURATION,
            easing: Easing.out(Easing.sin),
            toValue: 1,
            useNativeDriver: true,
          }),
          Animated.timing(sheetTranslateY, {
            duration: ENTER_DURATION,
            easing: Easing.inOut(Easing.sin),
            toValue: 0,
            useNativeDriver: true,
          }),
        ]).start();
      });
      return;
    }

    Animated.parallel([
      Animated.timing(backdropOpacity, {
        duration: BACKDROP_EXIT_DURATION,
        easing: Easing.in(Easing.sin),
        toValue: 0,
        useNativeDriver: true,
      }),
      Animated.timing(sheetTranslateY, {
        duration: EXIT_DURATION,
        easing: Easing.in(Easing.quad),
        toValue: SHEET_OFFSET,
        useNativeDriver: true,
      }),
    ]).start(({ finished }) => {
      if (finished) {
        setMounted(false);
      }
    });
  }, [backdropOpacity, sheetTranslateY, visible]);

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
        <View pointerEvents="box-none" style={styles.sheetPosition}>
          <Animated.View
            style={[sheetStyle, { transform: [{ translateY: sheetTranslateY }] }]}>
            {children}
          </Animated.View>
        </View>
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
