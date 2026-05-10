import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { StyleSheet, Text, View } from 'react-native';
import 'react-native-reanimated';
import { SafeAreaView } from 'react-native-safe-area-context';

import '@/src/notifications/notifications';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { HeaderBackButton } from '@/src/components/HeaderBackButton';
import { colors } from '@/src/theme';

export const unstable_settings = {
  anchor: '(tabs)',
};

export default function RootLayout() {
  const colorScheme = useColorScheme();
  const appTheme = {
    ...(colorScheme === 'dark' ? DarkTheme : DefaultTheme),
    colors: {
      ...(colorScheme === 'dark' ? DarkTheme : DefaultTheme).colors,
      background: colors.background,
      card: colors.surface,
      text: colors.text,
      border: colors.border,
      primary: colors.primary,
    },
  };

  return (
    <ThemeProvider value={appTheme}>
      <Stack
        screenOptions={{
          contentStyle: { backgroundColor: colors.background },
          headerStyle: { backgroundColor: colors.background },
          headerShadowVisible: false,
          headerBackTitle: '',
          headerTintColor: colors.text,
          headerTitleStyle: { fontWeight: '900' },
          headerBackVisible: false,
          header: ({ options }) => <AppStackHeader title={options.title} />,
        }}>
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen name="habits/new" options={{ title: 'New habit' }} />
        <Stack.Screen name="habits/[id]" options={{ title: 'Habit' }} />
        <Stack.Screen name="habits/edit/[id]" options={{ title: 'Edit habit' }} />
        <Stack.Screen name="achievements" options={{ title: 'Achievements' }} />
        <Stack.Screen name="archived-habits" options={{ title: 'Archived habits' }} />
      </Stack>
      <StatusBar style="light" />
    </ThemeProvider>
  );
}

function AppStackHeader({ title }: { title?: string }) {
  return (
    <SafeAreaView edges={['top']} style={styles.headerSafeArea}>
      <View style={styles.headerRow}>
        <HeaderBackButton />
        <Text numberOfLines={1} style={styles.headerTitle}>
          {title}
        </Text>
        <View style={styles.headerSpacer} />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  headerSafeArea: {
    backgroundColor: colors.background,
  },
  headerRow: {
    height: 56,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 16,
    marginBottom: -48, // pull content closer
    backgroundColor: colors.background,
  },
  headerTitle: {
    flex: 1,
    color: colors.text,
    fontSize: 17,
    fontWeight: '900',
    textAlign: 'center',
  },
  headerSpacer: {
    width: 40,
    height: 40,
  },
});
