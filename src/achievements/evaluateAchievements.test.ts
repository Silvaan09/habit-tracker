import { describe, expect, it } from 'vitest';

import { ACHIEVEMENT_DEFINITIONS } from '@/src/achievements/achievementDefinitions';
import {
  evaluateAchievements,
  getAchievementSummary,
  type AchievementEvaluationData,
} from '@/src/achievements/evaluateAchievements';
import type {
  Habit,
  HabitCompletion,
  HabitNumericEntry,
  HabitSkip,
  HabitSubtask,
  HabitSubtaskCompletion,
} from '@/src/types/Habit';

function habit(overrides: Partial<Habit> = {}): Habit {
  return {
    archived: false,
    color: null,
    createdAt: '2026-01-01T08:00:00.000Z',
    description: null,
    icon: null,
    iconLibrary: null,
    iconType: null,
    iconValue: null,
    id: overrides.id ?? 'habit_1',
    name: 'Test habit',
    notificationId: null,
    numericStepValues: null,
    reminderEnabled: false,
    reminderTime: null,
    scheduleIntervalDays: null,
    scheduleOffDays: null,
    scheduleOnDays: null,
    scheduleStartDate: '2026-01-01',
    scheduleType: 'daily',
    scheduleWeekdays: null,
    targetUnit: null,
    targetValue: null,
    todayLayoutOrder: 0,
    todayLayoutSize: 'auto',
    trackingType: 'checkbox',
    updatedAt: '2026-01-01T08:00:00.000Z',
    ...overrides,
  };
}

function completion(habitId: string, date: string): HabitCompletion {
  return {
    completedAt: `${date}T08:00:00.000Z`,
    date,
    habitId,
    id: `completion_${habitId}_${date}`,
  };
}

function skip(habitId: string, date: string): HabitSkip {
  return {
    createdAt: `${date}T08:00:00.000Z`,
    date,
    habitId,
    id: `skip_${habitId}_${date}`,
    reason: 'Rest day',
  };
}

function numericEntry(habitId: string, date: string, value: number): HabitNumericEntry {
  return {
    date,
    habitId,
    id: `numeric_${habitId}_${date}`,
    updatedAt: `${date}T08:00:00.000Z`,
    value,
  };
}

function subtask(habitId: string, id = `subtask_${habitId}`): HabitSubtask {
  return {
    archived: false,
    createdAt: '2026-01-01T08:00:00.000Z',
    habitId,
    id,
    position: 0,
    required: true,
    title: 'Step',
    updatedAt: '2026-01-01T08:00:00.000Z',
  };
}

function subtaskCompletion(
  habitId: string,
  subtaskId: string,
  date: string
): HabitSubtaskCompletion {
  return {
    completedAt: `${date}T08:00:00.000Z`,
    date,
    habitId,
    id: `subtask_completion_${subtaskId}_${date}`,
    subtaskId,
  };
}

function data(overrides: Partial<AchievementEvaluationData> = {}): AchievementEvaluationData {
  return {
    completions: [],
    habits: [],
    numericEntries: [],
    skips: [],
    subtaskCompletions: [],
    subtasks: [],
    today: '2026-01-31',
    ...overrides,
  };
}

function evaluated(id: string, input: AchievementEvaluationData) {
  const achievement = evaluateAchievements(input).find((item) => item.id === id);

  if (!achievement) {
    throw new Error(`Missing achievement ${id}`);
  }

  return achievement;
}

describe('achievement evaluation', () => {
  it('keeps all existing achievements supported', () => {
    const achievements = evaluateAchievements(data());
    const summary = getAchievementSummary(achievements);

    expect(ACHIEVEMENT_DEFINITIONS).toHaveLength(54);
    expect(summary.total).toBe(54);
    expect(summary.unsupported).toBe(0);
  });

  it('does not unlock long-term achievements from calendar time alone', () => {
    const oldHabit = habit({ createdAt: '2025-12-01T08:00:00.000Z', scheduleStartDate: '2025-12-01' });
    const result = evaluated('track_30_days', data({ habits: [oldHabit], today: '2026-01-31' }));

    expect(result.progress).toBe(0);
    expect(result.unlocked).toBe(false);
  });

  it('counts distinct tracked days across all tracking event types', () => {
    const checkboxHabit = habit({ id: 'checkbox' });
    const numericHabit = habit({ id: 'numeric', targetValue: 10, trackingType: 'numeric' });
    const checklistHabit = habit({ id: 'checklist', trackingType: 'subtasks' });
    const step = subtask(checklistHabit.id, 'step_1');
    const result = evaluated(
      'track_7_days',
      data({
        completions: [completion(checkboxHabit.id, '2026-01-01')],
        habits: [checkboxHabit, numericHabit, checklistHabit],
        numericEntries: [numericEntry(numericHabit.id, '2026-01-03', 4)],
        skips: [skip(checkboxHabit.id, '2026-01-02')],
        subtaskCompletions: [subtaskCompletion(checklistHabit.id, step.id, '2026-01-03')],
        subtasks: [step],
      })
    );

    expect(result.progress).toBe(3);
    expect(result.unlocked).toBe(false);
  });

  it('only counts numeric entries from numeric habits for numeric achievements', () => {
    const checkboxHabit = habit({ id: 'checkbox', targetValue: 10 });
    const result = evaluated(
      'goal_starter',
      data({
        habits: [checkboxHabit],
        numericEntries: [numericEntry(checkboxHabit.id, '2026-01-01', 10)],
      })
    );

    expect(result.progress).toBe(0);
    expect(result.unlocked).toBe(false);
  });

  it('unlocks Goal Starter for a completed numeric goal', () => {
    const numericHabit = habit({ id: 'numeric', targetValue: 10, trackingType: 'numeric' });
    const result = evaluated(
      'goal_starter',
      data({
        habits: [numericHabit],
        numericEntries: [numericEntry(numericHabit.id, '2026-01-01', 10)],
      })
    );

    expect(result.progress).toBe(1);
    expect(result.unlocked).toBe(true);
  });

  it('unlocks Perfect Day when scheduled non-skipped habits are complete', () => {
    const first = habit({ id: 'first' });
    const second = habit({ id: 'second' });
    const result = evaluated(
      'perfect_run_1',
      data({
        completions: [completion(first.id, '2026-01-01')],
        habits: [first, second],
        skips: [skip(second.id, '2026-01-01')],
        today: '2026-01-01',
      })
    );

    expect(result.progress).toBe(1);
    expect(result.unlocked).toBe(true);
  });

  it('uses total perfect-day count for 3 Perfect Days', () => {
    const dailyHabit = habit();
    const result = evaluated(
      'perfect_run_3',
      data({
        completions: [
          completion(dailyHabit.id, '2026-01-01'),
          completion(dailyHabit.id, '2026-01-03'),
          completion(dailyHabit.id, '2026-01-05'),
        ],
        habits: [dailyHabit],
        today: '2026-01-05',
      })
    );

    expect(result.progress).toBe(3);
    expect(result.unlocked).toBe(true);
  });

  it('still requires a consecutive run for 7-Day Perfect Run', () => {
    const dailyHabit = habit();
    const result = evaluated(
      'perfect_run_7',
      data({
        completions: [
          completion(dailyHabit.id, '2026-01-01'),
          completion(dailyHabit.id, '2026-01-03'),
          completion(dailyHabit.id, '2026-01-05'),
          completion(dailyHabit.id, '2026-01-07'),
          completion(dailyHabit.id, '2026-01-09'),
          completion(dailyHabit.id, '2026-01-11'),
          completion(dailyHabit.id, '2026-01-13'),
        ],
        habits: [dailyHabit],
        today: '2026-01-13',
      })
    );

    expect(result.progress).toBe(1);
    expect(result.unlocked).toBe(false);
  });

  it('counts lifetime completions for archived habits', () => {
    const archivedHabit = habit({ archived: true, id: 'archived' });
    const completions = Array.from({ length: 10 }, (_, index) =>
      completion(archivedHabit.id, `2026-01-${String(index + 1).padStart(2, '0')}`)
    );
    const result = evaluated('complete_10', data({ completions, habits: [archivedHabit] }));

    expect(result.progress).toBe(10);
    expect(result.unlocked).toBe(true);
  });

  it('does not unlock habit streaks from non-scheduled completion dates', () => {
    const weekdayHabit = habit({
      id: 'weekday',
      scheduleStartDate: '2026-05-04',
      scheduleType: 'weekdays',
      scheduleWeekdays: [1],
    });
    const result = evaluated(
      'habit_streak_3',
      data({
        completions: [
          completion(weekdayHabit.id, '2026-05-05'),
          completion(weekdayHabit.id, '2026-05-06'),
          completion(weekdayHabit.id, '2026-05-07'),
        ],
        habits: [weekdayHabit],
        today: '2026-05-07',
      })
    );

    expect(result.progress).toBe(0);
    expect(result.unlocked).toBe(false);
  });

  it('uses scheduled days for habit streak achievements', () => {
    const weekdayHabit = habit({
      id: 'weekday',
      scheduleStartDate: '2026-05-04',
      scheduleType: 'weekdays',
      scheduleWeekdays: [1, 3, 5],
    });
    const result = evaluated(
      'habit_streak_3',
      data({
        completions: [
          completion(weekdayHabit.id, '2026-05-04'),
          completion(weekdayHabit.id, '2026-05-06'),
          completion(weekdayHabit.id, '2026-05-08'),
        ],
        habits: [weekdayHabit],
        today: '2026-05-08',
      })
    );

    expect(result.progress).toBe(3);
    expect(result.unlocked).toBe(true);
  });

  it('counts only known subtask completions for subtask total achievements', () => {
    const checklistHabit = habit({ id: 'checklist', trackingType: 'subtasks' });
    const orphanCompletions = Array.from({ length: 100 }, (_, index) =>
      subtaskCompletion(checklistHabit.id, `missing_${index}`, '2026-01-01')
    );
    const result = evaluated(
      'subtask_100',
      data({
        habits: [checklistHabit],
        subtaskCompletions: orphanCompletions,
        subtasks: [],
      })
    );

    expect(result.progress).toBe(0);
    expect(result.unlocked).toBe(false);
  });
});
