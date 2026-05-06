import type { BottomTabBarButtonProps } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';
import { Tabs, router } from 'expo-router';
import React from 'react';
import { DeviceEventEmitter, Pressable, StyleSheet, Text, View } from 'react-native';

import { HapticTab } from '@/components/haptic-tab';
import { colors, radius } from '@/src/theme';
import { TODAY_TAB_RESELECT_EVENT } from '@/src/utils/navigation';

export default function TabLayout() {
  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.textSubtle,
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
        tabBarLabelStyle: {
          fontWeight: '800',
          fontSize: 11,
          marginTop: 2,
        },
        tabBarShowLabel: true,
        tabBarItemStyle: {
          paddingTop: 8,
          paddingBottom: 8,
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
            <Ionicons name={focused ? 'home' : 'home-outline'} size={24} color={color} />
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
            <Ionicons name={focused ? 'stats-chart' : 'stats-chart-outline'} size={24} color={color} />
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
          tabBarLabel: ({ color }) => (
            <Text numberOfLines={1} style={[styles.notificationsLabel, { color }]}>
              Reminders
            </Text>
          ),
          tabBarIcon: ({ color, focused }) => (
            <Ionicons
              name={focused ? 'notifications' : 'notifications-outline'}
              size={24}
              color={color}
            />
          ),
        }}
      />
      <Tabs.Screen
        name="settings"
        options={{
          title: 'Settings',
          tabBarIcon: ({ color, focused }) => (
            <Ionicons name={focused ? 'settings' : 'settings-outline'} size={24} color={color} />
          ),
        }}
      />
    </Tabs>
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
  notificationsLabel: {
    width: 96,
    marginTop: 2,
    fontSize: 11,
    fontWeight: '800',
    textAlign: 'center',
  },
  pressed: {
    opacity: 0.78,
  },
});
