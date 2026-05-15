import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';

import type { Habit, HabitScheduleType } from '@/src/types/Habit';
import { parseReminderTime } from '@/src/utils/reminders';

const ANDROID_REMINDERS_CHANNEL_ID = 'habit-reminders';
const CYCLE_LOOKAHEAD_DAYS = 14;

export type ScheduleHabitReminderInput = {
  habitId: string;
  habitName: string;
  reminderTime: string;
  trackingType?: Habit['trackingType'];
  scheduleType: HabitScheduleType;
  scheduleWeekdays?: number[] | null;
  scheduleOnDays?: number | null;
  scheduleOffDays?: number | null;
  scheduleStartDate?: string | null;
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

  const content = {
    title: getHabitReminderTitle(input.habitName),
    body: getHabitReminderBody(input.trackingType),
    data: { habitId: input.habitId },
    sound: true,
  };

  let notificationIds: string[];

  if (input.scheduleType === 'weekdays') {
    notificationIds = await scheduleWeekdayReminders(
      content,
      reminderTime,
      input.scheduleWeekdays ?? []
    );
  } else if (input.scheduleType === 'cycle' || input.scheduleType === 'interval') {
    notificationIds = await scheduleCycleReminders(content, reminderTime, {
      scheduleOnDays: input.scheduleOnDays ?? 1,
      scheduleOffDays: input.scheduleOffDays ?? 0,
      scheduleStartDate: input.scheduleStartDate ?? null,
    });
  } else {
    // daily
    const id = await Notifications.scheduleNotificationAsync({
      content,
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.DAILY,
        hour: reminderTime.hour,
        minute: reminderTime.minute,
        channelId: Platform.OS === 'android' ? ANDROID_REMINDERS_CHANNEL_ID : undefined,
      },
    });
    notificationIds = [id];
  }

  if (notificationIds.length === 0) {
    return null;
  }

  return notificationIds.join(',');
}

async function scheduleWeekdayReminders(
  content: Notifications.NotificationContentInput,
  reminderTime: { hour: number; minute: number },
  scheduleWeekdays: number[]
): Promise<string[]> {
  if (scheduleWeekdays.length === 0) {
    return [];
  }

  // Habit weekdays are 1=Mon..7=Sun. Expo WEEKLY trigger uses 1=Sun..7=Sat.
  const toExpoWeekday = (habitDay: number) => (habitDay % 7) + 1;

  const scheduled = await Promise.all(
    scheduleWeekdays.map((day) =>
      Notifications.scheduleNotificationAsync({
        content,
        trigger: {
          type: Notifications.SchedulableTriggerInputTypes.WEEKLY,
          weekday: toExpoWeekday(day),
          hour: reminderTime.hour,
          minute: reminderTime.minute,
          channelId: Platform.OS === 'android' ? ANDROID_REMINDERS_CHANNEL_ID : undefined,
        },
      })
    )
  );

  return scheduled;
}

async function scheduleCycleReminders(
  content: Notifications.NotificationContentInput,
  reminderTime: { hour: number; minute: number },
  options: {
    scheduleOnDays: number;
    scheduleOffDays: number;
    scheduleStartDate: string | null;
  }
): Promise<string[]> {
  const scheduledDates = getCycleScheduledDates(options);

  if (scheduledDates.length === 0) {
    return [];
  }

  const scheduled = await Promise.all(
    scheduledDates.map((date) => {
      const trigger = new Date(date);
      trigger.setHours(reminderTime.hour, reminderTime.minute, 0, 0);

      return Notifications.scheduleNotificationAsync({
        content,
        trigger: {
          type: Notifications.SchedulableTriggerInputTypes.DATE,
          date: trigger,
          channelId: Platform.OS === 'android' ? ANDROID_REMINDERS_CHANNEL_ID : undefined,
        },
      });
    })
  );

  return scheduled;
}

function getCycleScheduledDates(options: {
  scheduleOnDays: number;
  scheduleOffDays: number;
  scheduleStartDate: string | null;
}): Date[] {
  const { scheduleOnDays, scheduleOffDays, scheduleStartDate } = options;
  const cycleLength = scheduleOnDays + scheduleOffDays;

  if (cycleLength <= 0) {
    return [];
  }

  // Use start date if provided, otherwise treat today as day 0 of a cycle
  const startDate = scheduleStartDate ? new Date(scheduleStartDate) : new Date();
  startDate.setHours(0, 0, 0, 0);

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const scheduledDates: Date[] = [];

  for (let offset = 0; offset < CYCLE_LOOKAHEAD_DAYS; offset++) {
    const candidate = new Date(today);
    candidate.setDate(today.getDate() + offset);

    const daysSinceStart = Math.round(
      (candidate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)
    );

    // Negative means the candidate is before the habit started — skip
    if (daysSinceStart < 0) {
      continue;
    }

    const positionInCycle = daysSinceStart % cycleLength;

    if (positionInCycle < scheduleOnDays) {
      scheduledDates.push(candidate);
    }
  }

  return scheduledDates;
}

export async function cancelHabitReminder(
  notificationId: string | null | undefined
): Promise<void> {
  if (!notificationId) {
    return;
  }

  const ids = notificationId.split(',').map((id) => id.trim()).filter(Boolean);

  await Promise.all(ids.map((id) => Notifications.cancelScheduledNotificationAsync(id)));
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
    trackingType: habit.trackingType,
    scheduleType: habit.scheduleType,
    scheduleWeekdays: habit.scheduleWeekdays,
    scheduleOnDays: habit.scheduleOnDays,
    scheduleOffDays: habit.scheduleOffDays,
    scheduleStartDate: habit.scheduleStartDate,
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
    return 'Reminder';
  }

  return trimmedHabitName;
}

function getHabitReminderBody(trackingType?: Habit['trackingType']) {
  if (trackingType === 'numeric') {
    return "Add your progress when you're ready.";
  }

  if (trackingType === 'subtasks') {
    return "Check off what you've done today.";
  }

  return 'Reminder for today.';
}