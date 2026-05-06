import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';

import type { Habit } from '@/src/types/Habit';
import { parseReminderTime } from '@/src/utils/reminders';

const ANDROID_REMINDERS_CHANNEL_ID = 'habit-reminders';

export type ScheduleHabitReminderInput = {
  habitId: string;
  habitName: string;
  reminderTime: string;
};

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

export async function requestNotificationPermissions(): Promise<boolean> {
  const currentPermissions = await Notifications.getPermissionsAsync();

  if (allowsNotifications(currentPermissions)) {
    return true;
  }

  const requestedPermissions = await Notifications.requestPermissionsAsync({
    ios: {
      allowAlert: true,
      allowBadge: true,
      allowSound: true,
    },
  });

  return allowsNotifications(requestedPermissions);
}

export async function getNotificationPermissionStatus(): Promise<string> {
  const permissions = await Notifications.getPermissionsAsync();

  if (allowsNotifications(permissions)) {
    return 'granted';
  }

  return permissions.status;
}

export async function scheduleHabitReminder(
  input: ScheduleHabitReminderInput
): Promise<string | null> {
  const reminderTime = parseReminderTime(input.reminderTime);

  if (!reminderTime) {
    throw new Error('Invalid reminder time.');
  }

  const hasPermission = await requestNotificationPermissions();

  if (!hasPermission) {
    return null;
  }

  await ensureAndroidReminderChannel();

  return Notifications.scheduleNotificationAsync({
    content: {
      title: getHabitReminderTitle(input.habitName),
      body: getHabitReminderBody(input.habitName),
      data: {
        habitId: input.habitId,
      },
      sound: true,
    },
    trigger: {
      type: Notifications.SchedulableTriggerInputTypes.DAILY,
      hour: reminderTime.hour,
      minute: reminderTime.minute,
      channelId: Platform.OS === 'android' ? ANDROID_REMINDERS_CHANNEL_ID : undefined,
    },
  });
}

export async function cancelHabitReminder(
  notificationId: string | null | undefined
): Promise<void> {
  if (!notificationId) {
    return;
  }

  await Notifications.cancelScheduledNotificationAsync(notificationId);
}

export async function rescheduleHabitReminderForHabit(habit: Habit): Promise<string | null> {
  await cancelHabitReminder(habit.notificationId);

  if (!habit.reminderEnabled || !habit.reminderTime) {
    return null;
  }

  return scheduleHabitReminder({
    habitId: habit.id,
    habitName: habit.name,
    reminderTime: habit.reminderTime,
  });
}

export async function cancelHabitReminderForHabit(habit: Habit): Promise<void> {
  await cancelHabitReminder(habit.notificationId);
}

function allowsNotifications(
  permissions: Awaited<ReturnType<typeof Notifications.getPermissionsAsync>>
) {
  return (
    permissions.granted ||
    permissions.ios?.status === Notifications.IosAuthorizationStatus.PROVISIONAL
  );
}

async function ensureAndroidReminderChannel() {
  if (Platform.OS !== 'android') {
    return;
  }

  await Notifications.setNotificationChannelAsync(ANDROID_REMINDERS_CHANNEL_ID, {
    name: 'Habit reminders',
    importance: Notifications.AndroidImportance.DEFAULT,
    sound: 'default',
  });
}

function getHabitReminderTitle(habitName: string) {
  const trimmedHabitName = habitName.trim();

  if (trimmedHabitName.length === 0) {
    return 'Habit check-in';
  }

  return `Time for ${trimmedHabitName}`;
}

function getHabitReminderBody(habitName: string) {
  const trimmedHabitName = habitName.trim();

  if (trimmedHabitName.length === 0) {
    return 'Tap to open your habits.';
  }

  return `${trimmedHabitName} is scheduled for today.`;
}
