import { BottomTabBarButtonProps } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';
import { Tabs, router } from 'expo-router';
import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { HapticTab } from '@/components/haptic-tab';
import { colors, radius, typography } from '@/src/theme';

export default function TabLayout() {
  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.textSubtle,
        tabBarStyle: {
          position: 'absolute',
          height: 76,
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
        },
        tabBarLabelStyle: {
          fontWeight: '800',
          fontSize: 11,
        },
        tabBarItemStyle: {
          paddingVertical: 8,
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

function PlusTabButton({ accessibilityState }: BottomTabBarButtonProps) {
  return (
    <Pressable
      accessibilityLabel="Create a new habit"
      accessibilityRole="button"
      onPress={() => router.push('/habits/new')}
      style={({ pressed }) => [styles.plusButtonWrap, pressed && styles.pressed]}>
      <View style={styles.plusButton}>
        <Ionicons name="add" size={30} color={colors.background} />
      </View>
      <Text style={[styles.plusLabel, accessibilityState?.selected && styles.plusLabel]}>
        New
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  plusButtonWrap: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 2,
    paddingTop: 2,
  },
  plusButton: {
    width: 56,
    height: 56,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 3,
    borderColor: colors.background,
    borderRadius: radius.pill,
    backgroundColor: colors.primary,
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.32,
    shadowRadius: 12,
    elevation: 8,
  },
  plusLabel: {
    color: colors.primary,
    ...typography.small,
    fontSize: 10,
    fontWeight: '900',
  },
  pressed: {
    opacity: 0.78,
  },
});
