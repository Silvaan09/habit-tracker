# Habit Tracker - Habito

A local-first mobile habit tracking app built with **Expo React Native** and **TypeScript**. Habito helps users build routines, track flexible habits, manage daily progress, and review consistency through visual stats, heatmaps, streaks, and completion history.

## Overview

Habito is designed as an offline-first personal productivity app. Users can create habits, customize how and when they appear, complete or skip them for specific dates, track subtasks or numeric goals, and review progress through a polished dark neon interface.

The app currently runs in **Expo Go** for development and is structured to support future **EAS Build** workflows for iOS and Android.

## Features

### Core Habit Tracking

- **Local-first habit tracking** using SQLite
- **Create, edit, archive, and restore habits**
- **Archived habit management**
  - View archived habits from Settings
  - Restore archived habits without losing history
  - Permanently delete archived habits and their dependent data
- **Custom Lucide habit icons**
- **Habit descriptions, colors, and live preview cards**
- **Improved icon background color selector**
- **Compact dark neon habit cards**
- **Saved Today card layout preferences**
- **Offline support** with no required account or cloud sync

### Flexible Scheduling

Habits can be scheduled in multiple ways:

- **Daily habits**
- **Specific days**
- **On/off cycle habits** such as 3 days on, 1 day off
- **Schedule start dates** so habits do not appear before they begin
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
- **Custom app-styled confirmations**
  - Unsaved changes prompts
  - Archive confirmations
  - Permanent delete confirmations

### Today Dashboard

- **Build the Day dashboard**
  - Selected date summary
  - Completion percentage
  - Done / skipped / remaining counts
  - Animated progress bar
- **Compact habit box layout**
- **Responsive habit card sizes**
  - 1x1 compact cards
  - 1x2 tall cards
  - 2x1 wide cards
  - 2x2 dashboard cards
  - Type-specific layouts for checkbox, subtask, and numeric habits
- **Drag-and-drop Today layout edit mode**
  - Choose card sizes: auto, small, tall, wide, or large
  - Hold a card briefly, then drag it over another card to reorder
  - Preview the drop target while dragging
  - Persist card sizes and ordering locally
  - Keep completion, skip, numeric, and subtask actions disabled while editing layout
- **Mini recent-history overview for each habit**
  - Shows recent scheduled occurrences
  - Distinguishes completed, skipped, and missed days
- **Week navigation and custom date picker**
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
- **Range-based completion percentages**
  - Last 7 days
  - Month-to-date
  - Year-to-date
- **Whole-day stats**
  - Complete days across tracked days
  - Average daily completion
  - Current streak and longest streak based on fully completed scheduled days
- **Skipped habits are excluded from daily denominators**
- **GitHub-style completion heatmaps**
  - Month and Year activity views
  - Readable month labels
- **Habit detail pages** with:
  - Streaks
  - Completion history
  - Heatmap overview
  - Subtask/numeric progress
- **Habit-specific milestone/crown support**
- **Crown unlock feedback**
  - In-app styled notification when a new crown milestone is earned
- **More distinct yellow-based stat color intensity levels**

### Achievements

- **Dedicated Achievements page**
  - Open from the Stats tab
  - Summary progress for unlocked achievements
  - Category filters
  - Grouped achievement list
- **Derived local achievements**
  - First steps
  - Total completions
  - Individual habit streaks
  - Perfect day streaks
  - Subtasks
  - Numeric goals
  - Recovery
  - Long-term tracking
- **No cloud account or remote achievement service**
- **Achievements are evaluated from existing local history**

### Notifications

- **Local reminder notifications**
- **Improved notification copy**
- **Focused reminder editor**
  - Edit reminder time without opening the full habit editor
  - Turn reminders on or off from the Notifications tab
- **Shared 5-minute time picker**
- **Notifications tab**
  - Shows real upcoming reminders
  - Hides permission request after permission is granted
  - Avoids fake/promotional notification content

### Settings and Data

- **Settings screen** with simple local data controls
- **Archived habits**
  - View paused habits
  - Restore habits to Today
  - Delete archived habits forever with a custom confirmation
- **Back up local data**
- **Restore local data from exported backup text**
- **Delete all local data with confirmation**
- **Local privacy note**
- **No account required**
- **No cloud sync required**

### UI and Navigation Polish

- **Dark neon design system**
- **Lucide-only habit icon selection**
- **Cleaner stack headers and custom back button**
- **Bottom sheets with fade-only backdrops and smoother sheet motion**
- **Custom dark neon modals for important confirmations**
- **Bottom tab bar with visible labels and a center Add button**
- **Scroll position preservation when returning to Today**

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
- Drag-and-drop Today layout editing
- Stats and heatmaps
- Achievements
- Local reminders
- Archived habit restore/delete management
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
- More detailed crown history
- Better advanced analytics
- Optional cloud sync
- iOS/Android widgets
- TestFlight and App Store deployment

## License

This project is currently private/personal. Add a license before publishing or accepting contributions.
