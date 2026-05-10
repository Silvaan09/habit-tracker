import type { BottomTabBarButtonProps } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';
import { Tabs, router } from 'expo-router';
import React from 'react';
import { DeviceEventEmitter, Pressable, StyleSheet, Text, View } from 'react-native';

import { HapticTab } from '@/components/haptic-tab';
import { colors, radius } from '@/src/theme';
import { TODAY_TAB_RESELECT_EVENT } from '@/src/utils/navigation';

type IoniconName = React.ComponentProps<typeof Ionicons>['name'];

export default function TabLayout() {
  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.textSubtle,
        sceneStyle: {
          backgroundColor: colors.background,
        },
        tabBarStyle: {
          position: 'absolute',
          height: 84,
          marginHorizontal: 16,
          marginBottom: 12,
          borderTopWidth: 0,
          borderWidth: 1,
          borderColor: colors.border,
          borderRadius: radius.xl,
          backgroundColor: colors.surfaceElevated,
          shadowColor: colors.background,
          shadowOffset: { width: 0, height: 10 },
          shadowOpacity: 0.32,
          shadowRadius: 18,
          elevation: 12,
          overflow: 'visible',
        },
        tabBarShowLabel: false,
        tabBarIconStyle: {
          marginTop: 0,
          marginBottom: 0,
        },
        tabBarItemStyle: {
          alignItems: 'center',
          justifyContent: 'center',
          paddingTop: 0,
          paddingBottom: 0,
          overflow: 'visible',
        },
        headerShown: false,
        tabBarButton: HapticTab,
      }}>
      <Tabs.Screen
        name="index"
        options={{
          title: 'Today',
          tabBarIcon: ({ color, focused }) => (
            <TabIconLabel
              color={color}
              focused={focused}
              icon="home"
              label="Today"
              outlineIcon="home-outline"
            />
          ),
        }}
        listeners={{
          tabPress: () => DeviceEventEmitter.emit(TODAY_TAB_RESELECT_EVENT),
        }}
      />
      <Tabs.Screen
        name="stats"
        options={{
          title: 'Stats',
          tabBarIcon: ({ color, focused }) => (
            <TabIconLabel
              color={color}
              focused={focused}
              icon="stats-chart"
              label="Stats"
              outlineIcon="stats-chart-outline"
            />
          ),
        }}
      />
      <Tabs.Screen
        name="create"
        options={{
          title: '',
          tabBarAccessibilityLabel: 'Create a new habit',
          tabBarButton: PlusTabButton,
          tabBarIcon: () => null,
          tabBarLabel: () => null,
        }}
      />
      <Tabs.Screen
        name="notifications"
        options={{
          title: 'Notifications',
          tabBarIcon: ({ color, focused }) => (
            <TabIconLabel
              color={color}
              focused={focused}
              icon="notifications"
              label="Reminders"
              outlineIcon="notifications-outline"
            />
          ),
        }}
      />
      <Tabs.Screen
        name="settings"
        options={{
          title: 'Settings',
          tabBarIcon: ({ color, focused }) => (
            <TabIconLabel
              color={color}
              focused={focused}
              icon="settings"
              label="Settings"
              outlineIcon="settings-outline"
            />
          ),
        }}
      />
    </Tabs>
  );
}

function TabIconLabel({
  color,
  focused,
  icon,
  label,
  outlineIcon,
}: {
  color: string;
  focused: boolean;
  icon: IoniconName;
  label: string;
  outlineIcon: IoniconName;
}) {
  return (
    <View style={styles.tabIconLabel}>
      <Ionicons name={focused ? icon : outlineIcon} size={24} color={color} />
      <Text numberOfLines={1} style={[styles.tabLabel, { color }]}>
        {label}
      </Text>
    </View>
  );
}

function PlusTabButton(_: BottomTabBarButtonProps) {
  return (
    <Pressable
      accessibilityLabel="Create a new habit"
      accessibilityRole="button"
      onPress={() => router.push('/habits/new')}
      style={({ pressed }) => [styles.plusButtonWrap, pressed && styles.pressed]}>
      <View style={styles.plusButton}>
        <Ionicons name="add" size={32} color={colors.background} />
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  plusButtonWrap: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'visible',
    paddingTop: 0,
    transform: [{ translateY: -8 }],
  },
  plusButton: {
    width: 54,
    height: 54,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 27,
    backgroundColor: colors.primary,
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 5 },
    shadowOpacity: 0.22,
    shadowRadius: 8,
    elevation: 6,
    zIndex: 2,
  },
  tabIconLabel: {
    height: 42,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 3,
    transform: [{ translateY: 20 }],
  },
  tabLabel: {
    width: 96,
    fontSize: 11,
    lineHeight: 13,
    fontWeight: '800',
    textAlign: 'center',
  },
  pressed: {
    opacity: 0.78,
  },
});
