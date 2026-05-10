export type AchievementCategory =
  | 'first_steps'
  | 'total_completions'
  | 'habit_streaks'
  | 'full_day_streaks'
  | 'subtasks'
  | 'numeric_goals'
  | 'recovery'
  | 'long_term';

export type AchievementDefinition = {
  id: string;
  category: AchievementCategory;
  title: string;
  description: string;
  target: number;
};

export type EvaluatedAchievement = AchievementDefinition & {
  unlocked: boolean;
  progress: number;
  progressLabel: string;
  unsupported?: boolean;
};

export const ACHIEVEMENT_CATEGORIES: {
  id: AchievementCategory;
  label: string;
}[] = [
  { id: 'first_steps', label: 'First Steps' },
  { id: 'total_completions', label: 'Completions' },
  { id: 'habit_streaks', label: 'Habit Streaks' },
  { id: 'full_day_streaks', label: 'Perfect Days' },
  { id: 'subtasks', label: 'Subtasks' },
  { id: 'numeric_goals', label: 'Numeric Goals' },
  { id: 'recovery', label: 'Recovery' },
  { id: 'long_term', label: 'Long-term' },
];

export const ACHIEVEMENT_DEFINITIONS: AchievementDefinition[] = [
  {
    id: 'first_step',
    category: 'first_steps',
    title: 'First Step',
    description: 'Complete your first habit.',
    target: 1,
  },
  {
    id: 'fresh_start',
    category: 'first_steps',
    title: 'Fresh Start',
    description: 'Create your first habit.',
    target: 1,
  },
  {
    id: 'create_3_habits',
    category: 'first_steps',
    title: 'Getting Organized',
    description: 'Create 3 habits.',
    target: 3,
  },
  {
    id: 'create_5_habits',
    category: 'first_steps',
    title: 'Routine Builder',
    description: 'Create 5 habits.',
    target: 5,
  },
  {
    id: 'create_10_habits',
    category: 'first_steps',
    title: 'System Maker',
    description: 'Create 10 habits.',
    target: 10,
  },
  {
    id: 'honest_tracker',
    category: 'first_steps',
    title: 'Honest Tracker',
    description: 'Add 5 skip reasons.',
    target: 5,
  },
  {
    id: 'back_on_track',
    category: 'first_steps',
    title: 'Back on Track',
    description: 'Complete a habit the day after skipping it.',
    target: 1,
  },
  {
    id: 'no_excuses_week',
    category: 'first_steps',
    title: 'No Excuses Week',
    description: 'Use zero skips in a week with 7 tracked days.',
    target: 1,
  },
  ...[10, 25, 50, 100, 250, 500, 1000].map((target) => ({
    id: `complete_${target}`,
    category: 'total_completions' as const,
    title: `${target.toLocaleString()} Completions`,
    description: `Complete habits ${target.toLocaleString()} times.`,
    target,
  })),
  ...[
    [3, '3-Day Spark', 'Reach a 3-day streak on any habit.'],
    [7, '7-Day Streak', 'Reach a 7-day streak on any habit.'],
    [14, '14-Day Streak', 'Reach a 14-day streak on any habit.'],
    [30, '30-Day Streak', 'Reach a 30-day streak on any habit.'],
    [60, '60-Day Streak', 'Reach a 60-day streak on any habit.'],
    [90, '90-Day Streak', 'Reach a 90-day streak on any habit.'],
    [180, '180-Day Streak', 'Reach a 180-day streak on any habit.'],
    [365, '365-Day Streak', 'Reach a 1-year streak on any habit.'],
  ].map(([target, title, description]) => ({
    id: `habit_streak_${target}`,
    category: 'habit_streaks' as const,
    title: String(title),
    description: String(description),
    target: Number(target),
  })),
  ...[
    [1, 'Perfect Day', 'Complete every scheduled non-skipped habit in a day.'],
    [3, '3 Perfect Days', 'Complete every scheduled non-skipped habit for 3 tracked days.'],
    [7, '7-Day Perfect Run', 'Complete every scheduled non-skipped habit for 7 tracked days in a row.'],
    [14, '14-Day Perfect Run', 'Complete every scheduled non-skipped habit for 14 tracked days in a row.'],
    [30, '30-Day Perfect Run', 'Complete every scheduled non-skipped habit for 30 tracked days in a row.'],
    [90, '90-Day Perfect Run', 'Complete every scheduled non-skipped habit for 90 tracked days in a row.'],
    [365, '365-Day Perfect Run', 'Complete every scheduled non-skipped habit for 365 tracked days in a row.'],
  ].map(([target, title, description]) => ({
    id: `perfect_run_${target}`,
    category: 'full_day_streaks' as const,
    title: String(title),
    description: String(description),
    target: Number(target),
  })),
  {
    id: 'checklist_starter',
    category: 'subtasks',
    title: 'Checklist Starter',
    description: 'Complete every subtask in a habit once.',
    target: 1,
  },
  {
    id: 'checklist_cleaner',
    category: 'subtasks',
    title: 'Checklist Cleaner',
    description: 'Complete all subtasks in a habit 10 times.',
    target: 10,
  },
  {
    id: 'checklist_master',
    category: 'subtasks',
    title: 'Checklist Master',
    description: 'Complete all subtasks in a habit 50 times.',
    target: 50,
  },
  {
    id: 'no_loose_ends',
    category: 'subtasks',
    title: 'No Loose Ends',
    description: 'Complete every subtask across all scheduled subtask habits in one day.',
    target: 1,
  },
  {
    id: 'subtask_100',
    category: 'subtasks',
    title: 'Subtask Grinder',
    description: 'Complete 100 subtasks.',
    target: 100,
  },
  {
    id: 'subtask_500',
    category: 'subtasks',
    title: 'Subtask Machine',
    description: 'Complete 500 subtasks.',
    target: 500,
  },
  {
    id: 'subtask_1000',
    category: 'subtasks',
    title: 'Subtask Legend',
    description: 'Complete 1,000 subtasks.',
    target: 1000,
  },
  {
    id: 'goal_starter',
    category: 'numeric_goals',
    title: 'Goal Starter',
    description: 'Complete your first numeric goal.',
    target: 1,
  },
  {
    id: 'overachiever',
    category: 'numeric_goals',
    title: 'Overachiever',
    description: 'Exceed a numeric goal by at least 25%.',
    target: 1,
  },
  {
    id: 'double_goal',
    category: 'numeric_goals',
    title: 'Double Goal',
    description: 'Reach 200% of a numeric goal.',
    target: 1,
  },
  {
    id: 'numeric_goal_10',
    category: 'numeric_goals',
    title: 'Progress Maker',
    description: 'Complete numeric goals 10 times.',
    target: 10,
  },
  {
    id: 'numeric_goal_50',
    category: 'numeric_goals',
    title: 'Goal Crusher',
    description: 'Complete numeric goals 50 times.',
    target: 50,
  },
  {
    id: 'numeric_goal_100',
    category: 'numeric_goals',
    title: 'Number Machine',
    description: 'Complete numeric goals 100 times.',
    target: 100,
  },
  {
    id: 'comeback',
    category: 'recovery',
    title: 'Comeback',
    description: 'Complete a habit after missing it.',
    target: 1,
  },
  {
    id: 'bounce_back',
    category: 'recovery',
    title: 'Bounce Back',
    description: 'Complete a habit after missing it 3 times in a row.',
    target: 1,
  },
  {
    id: 'reset_strong',
    category: 'recovery',
    title: 'Reset Strong',
    description: 'Complete all scheduled habits the day after a bad day.',
    target: 1,
  },
  {
    id: 'not_done_yet',
    category: 'recovery',
    title: 'Not Done Yet',
    description: 'Restart a habit after a 7-day break.',
    target: 1,
  },
  {
    id: 'back_in_rhythm',
    category: 'recovery',
    title: 'Back in Rhythm',
    description: 'Get back to a 3-day streak after losing one.',
    target: 1,
  },
  {
    id: 'recovered_streak',
    category: 'recovery',
    title: 'Recovered Streak',
    description: 'Reach 7 days again after losing a 7+ day streak.',
    target: 1,
  },
  ...[
    [7, 'One Week In', 'Track something for 7 days.'],
    [30, 'One Month In', 'Track something for 30 days.'],
    [90, 'Three Months In', 'Track something for 90 days.'],
    [180, 'Half-Year Tracker', 'Track something for 180 days.'],
    [365, 'One Year In', 'Track something for 365 days.'],
  ].map(([target, title, description]) => ({
    id: `track_${target}_days`,
    category: 'long_term' as const,
    title: String(title),
    description: String(description),
    target: Number(target),
  })),
];
