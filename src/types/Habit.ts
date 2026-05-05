export type HabitIconType = 'emoji' | 'icon';

export type Habit = {
  id: string;
  name: string;
  description: string | null;
  icon: string | null;
  iconType: HabitIconType | null;
  iconValue: string | null;
  iconLibrary: string | null;
  color: string | null;
  reminderEnabled: boolean;
  reminderTime: string | null;
  notificationId: string | null;
  archived: boolean;
  createdAt: string;
  updatedAt: string;
};

export type HabitCompletion = {
  id: string;
  habitId: string;
  date: string;
  completedAt: string;
};
