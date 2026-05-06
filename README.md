# Habit Tracker - Habito

A local-first mobile habit tracking app built with **Expo React Native** and **TypeScript**. Habito helps users build routines, track flexible habits, manage daily progress, and review consistency through visual stats, heatmaps, streaks, and completion history.

## Overview

Habito is designed as an offline-first personal productivity app. Users can create habits, customize how and when they appear, complete or skip them for specific dates, track subtasks or numeric goals, and review progress through a polished dark neon interface.

The app currently runs in **Expo Go** for development and is structured to support future **EAS Build** workflows for iOS and Android.

## Features

### Core Habit Tracking

- **Local-first habit tracking** using SQLite
- **Create, edit, archive, and restore habits**
- **Custom Lucide habit icons**
- **Habit descriptions, colors, and live preview cards**
- **Improved icon background color selector**
- **Compact dark neon habit cards**
- **Offline support** with no required account or cloud sync

### Flexible Scheduling

Habits can be scheduled in multiple ways:

- **Daily habits**
- **Specific weekdays**
- **Every X days / interval-based habits**
- **Selected-date tracking**
  - Scroll through weeks
  - Open a date selector from the week label
  - Mark habits complete for past dates
  - Prevent completion of future dates
  - Jump back to today from the Today tab

### Completion, Skips, and Progress

- **Complete habits for a selected date**
- **Skip habits with required reasons**
- **Weekly skip limits**
- **Skipped days are tracked separately from missed days**
- **Skipped days are excluded from failure-based stats**
- **Subtask-based habits**
  - Example: supplements, morning routines, checklists
- **Numeric goal habits**
  - Example: pages read, liters of water, minutes studied
- **Inline Today interactions**
  - Check off subtasks directly from the Today screen
  - Update numeric progress directly from the Today screen
- **Partial progress indicators**
  - Subtask and numeric habits show percentage progress instead of only complete/incomplete state

### Today Dashboard

- **Build the Day dashboard**
  - Selected date summary
  - Completion percentage
  - Done / skipped / remaining counts
  - Animated progress bar
- **Compact habit box layout**
- **Mini recent-history overview for each habit**
  - Shows recent scheduled occurrences
  - Distinguishes completed, skipped, and missed days
- **Cleaner bottom tab navigation**
  - Today
  - Stats
  - Add Habit
  - Notifications
  - Settings

### Stats and History

- **Stats tab** with range selector:
  - Last 7 days
  - Month
  - Year
- **Corrected range-based completion percentages**
  - Week-to-date
  - Month-to-date
  - Year-to-date
- **GitHub-style completion heatmaps**
- **Habit detail pages** with:
  - Streaks
  - Completion history
  - Heatmap overview
  - Subtask/numeric progress
- **Current streak and longest streak tracking**
- **Habit-specific milestone/crown support**
- **More distinct yellow-based stat color intensity levels**

### Notifications

- **Local reminder notifications**
- **Improved notification copy**
- **Notifications tab**
  - Shows real upcoming reminders
  - Hides permission request after permission is granted
  - Avoids fake/promotional notification content

### Settings and Data

- **Settings screen** with local app preferences
- **Export local data**
- **Import local data**
- **Reset local data**
- **Local privacy note**
- **No account required**
- **No cloud sync required**

## Tech Stack

- **Expo React Native**
- **TypeScript**
- **Expo Router**
- **SQLite** via `expo-sqlite`
- **Expo Notifications**
- **Lucide React Native**
- **date-fns**
- **Local-first architecture**

## Project Status

This project is currently in active development. The core habit tracking experience is functional, including:

- Habit creation and editing
- Flexible scheduling
- Selected-date tracking
- Skips with reasons and limits
- Subtasks
- Numeric goals
- Inline Today progress updates
- Stats and heatmaps
- Local reminders
- Import/export/reset data management
- Dark neon UI redesign

Current development and testing is done through **Expo Go**. A future version may use **EAS Build** for native iOS/Android testing, TestFlight, and App Store deployment.

## Getting Started

Install dependencies:

```bash
npm install
```

Start the Expo development server:

```bash
npx expo start
```

Then open the app in **Expo Go** on your phone.

Run checks:

```bash
npm run lint
npx tsc --noEmit
```

## Development Notes

The app is intentionally local-first. Habit data is stored on the device unless the user manually exports it.

Some native features, especially notification behavior, may behave differently in Expo Go compared to a custom development build. A future EAS development build will be useful for more reliable native testing.

## Planned Improvements

Possible future improvements include:

- Habit templates
- Categories
- Morning and evening routines
- Calendar picker refinements
- Archive management
- More detailed achievements and crowns
- Better advanced analytics
- Optional cloud sync
- iOS/Android widgets
- TestFlight and App Store deployment

## License

This project is currently private/personal. Add a license before publishing or accepting contributions.
