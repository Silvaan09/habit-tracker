export type HabitIconType = 'emoji' | 'icon';
export type HabitScheduleType = 'daily' | 'weekdays' | 'cycle' | 'interval';
export type HabitTrackingType = 'checkbox' | 'subtasks' | 'numeric';
export type HabitCardLayoutSize = 'auto' | 'small' | 'tall' | 'wide' | 'large';

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
  scheduleType: HabitScheduleType;
  scheduleWeekdays: number[] | null;
  scheduleIntervalDays: number | null;
  scheduleOnDays: number | null;
  scheduleOffDays: number | null;
  scheduleStartDate: string | null;
  trackingType: HabitTrackingType;
  targetValue: number | null;
  targetUnit: string | null;
  numericStepValues: number[] | null;
  todayLayoutSize: HabitCardLayoutSize;
  todayLayoutOrder: number;
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

export type HabitSkip = {
  id: string;
  habitId: string;
  date: string;
  reason: string;
  createdAt: string;
};

export type HabitSubtask = {
  id: string;
  habitId: string;
  title: string;
  position: number;
  required: boolean;
  archived: boolean;
  createdAt: string;
  updatedAt: string;
};

export type HabitSubtaskCompletion = {
  id: string;
  habitId: string;
  subtaskId: string;
  date: string;
  completedAt: string;
};

export type HabitNumericEntry = {
  id: string;
  habitId: string;
  date: string;
  value: number;
  updatedAt: string;
};
