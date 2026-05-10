import { describe, expect, it } from 'vitest';

import type { Habit } from '@/src/types/Habit';
import {
  getScheduledDatesForHabit,
  getWeekdayNumber,
  isHabitScheduledForDate,
} from '@/src/utils/schedule';

function habit(overrides: Partial<Habit> = {}): Habit {
  return {
    archived: false,
    color: null,
    createdAt: '2026-05-01T08:00:00.000Z',
    description: null,
    icon: null,
    iconLibrary: null,
    iconType: null,
    iconValue: null,
    id: 'habit_schedule',
    name: 'Schedule habit',
    notificationId: null,
    numericStepValues: null,
    reminderEnabled: false,
    reminderTime: null,
    scheduleIntervalDays: null,
    scheduleOffDays: null,
    scheduleOnDays: null,
    scheduleStartDate: '2026-05-01',
    scheduleType: 'daily',
    scheduleWeekdays: null,
    targetUnit: null,
    targetValue: null,
    todayLayoutOrder: 0,
    todayLayoutSize: 'auto',
    trackingType: 'checkbox',
    updatedAt: '2026-05-01T08:00:00.000Z',
    ...overrides,
  };
}

describe('schedule utilities', () => {
  it('schedules daily habits after the start date', () => {
    const dailyHabit = habit();

    expect(isHabitScheduledForDate(dailyHabit, '2026-04-30')).toBe(false);
    expect(isHabitScheduledForDate(dailyHabit, '2026-05-01')).toBe(true);
    expect(isHabitScheduledForDate(dailyHabit, '2026-05-02')).toBe(true);
  });

  it('schedules weekday habits only on selected weekdays', () => {
    const weekdayHabit = habit({ scheduleType: 'weekdays', scheduleWeekdays: [1, 3, 5] });

    expect(getWeekdayNumber('2026-05-04')).toBe(1);
    expect(isHabitScheduledForDate(weekdayHabit, '2026-05-04')).toBe(true);
    expect(isHabitScheduledForDate(weekdayHabit, '2026-05-05')).toBe(false);
  });

  it('supports on/off cycle schedules', () => {
    const cycleHabit = habit({ scheduleType: 'cycle', scheduleOnDays: 2, scheduleOffDays: 1 });

    expect(isHabitScheduledForDate(cycleHabit, '2026-05-01')).toBe(true);
    expect(isHabitScheduledForDate(cycleHabit, '2026-05-02')).toBe(true);
    expect(isHabitScheduledForDate(cycleHabit, '2026-05-03')).toBe(false);
    expect(isHabitScheduledForDate(cycleHabit, '2026-05-04')).toBe(true);
  });

  it('returns scheduled dates in range only', () => {
    const weekdayHabit = habit({ scheduleType: 'weekdays', scheduleWeekdays: [1, 3, 5] });

    expect(getScheduledDatesForHabit(weekdayHabit, '2026-05-04', '2026-05-10')).toEqual([
      '2026-05-04',
      '2026-05-06',
      '2026-05-08',
    ]);
  });
});
