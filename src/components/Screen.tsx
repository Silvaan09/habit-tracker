import { PropsWithChildren, type Ref } from 'react';
import {
  ScrollView,
  StyleProp,
  StyleSheet,
  View,
  ViewStyle,
  type ScrollViewProps,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { colors, spacing } from '@/src/theme';

type ScreenProps = PropsWithChildren<{
  scroll?: boolean;
  scrollRef?: Ref<ScrollView>;
  onScroll?: ScrollViewProps['onScroll'];
  scrollEventThrottle?: ScrollViewProps['scrollEventThrottle'];
  scrollEnabled?: ScrollViewProps['scrollEnabled'];
  style?: StyleProp<ViewStyle>;
  contentContainerStyle?: StyleProp<ViewStyle>;
}>;

export function Screen({
  children,
  scroll = true,
  scrollRef,
  onScroll,
  scrollEventThrottle,
  scrollEnabled,
  style,
  contentContainerStyle,
}: ScreenProps) {
  if (!scroll) {
    return (
      <SafeAreaView style={[styles.safeArea, style]}>
        <View style={[styles.content, contentContainerStyle]}>{children}</View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.safeArea, style]}>
      <ScrollView
        ref={scrollRef}
        contentContainerStyle={[styles.content, contentContainerStyle]}
        onScroll={onScroll}
        scrollEnabled={scrollEnabled}
        scrollEventThrottle={scrollEventThrottle}
        showsVerticalScrollIndicator={false}>
        {children}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: colors.background,
  },
  content: {
    flexGrow: 1,
    paddingHorizontal: 20,
    paddingTop: spacing.lg,
    paddingBottom: spacing.xxl,
  },
});
