# Habit Tracker

A local-first mobile habit tracking app built with **Expo React Native** and **TypeScript**.

The app helps users build routines, track habits across different schedules, manage skips, view progress over time, and analyze consistency with visual heatmaps and statistics. It is designed as an offline-first app with local SQLite storage and no account requirement.

---

## Overview

Habit Tracker is a mobile app for creating, managing, and tracking habits. It started as a simple daily habit checklist and has grown into a more complete habit-tracking system with custom schedules, skips, subtasks, numeric goals, reminders, stats, and a dark neon visual design.

The app is currently built and tested through **Expo Go**, with future support planned for EAS development builds, TestFlight, and App Store release.

---

## Features

### Habit Management

- Create, edit, archive, and manage habits
- Choose custom habit icons or emojis
- Add habit descriptions
- Select custom accent colors
- View habit details and historical progress
- Restore or manage archived habits, if enabled in the current build

### Flexible Habit Scheduling

Habits are not limited to daily repetition.

Supported schedule types include:

- Daily habits
- Specific weekday habits
- Interval habits, such as every 3 days
- Selected-date tracking through the Today screen

The Today screen updates based on the selected date, not only the current day.

### Completion Tracking

- Mark habits as completed for a selected date
- Unmark habits if completed by mistake
- Track completions locally by date
- Prevent future dates from being completed
- View past completions through history and heatmaps

### Skips With Reasons

Users can skip a habit for a specific day, but they must provide a reason.

Skipped days are treated differently from missed days:

- Skipped habits are not counted as completed
- Skipped habits are not treated as failures
- Skips are shown distinctly in the overview/history
- Completing a skipped habit removes the skip
- Skipping a completed habit removes the completion

### Subtasks

Habits can contain subtasks.

Example:

```text
Supplements
- Vitamin D
- Magnesium
- Omega 3
