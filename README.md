# Habit Tracker

A local-first mobile habit tracking app built with **Expo React Native**, **TypeScript**, and **SQLite**.

Habit Tracker helps users build routines, track flexible habits, manage skipped days, follow progress with visual statistics, and keep their data stored locally on their device.

---

## Table of Contents

- [Overview](#overview)
- [Features](#features)
- [Screens](#screens)
- [Tech Stack](#tech-stack)
- [Project Structure](#project-structure)
- [Data Model](#data-model)
- [Getting Started](#getting-started)
- [Development Commands](#development-commands)
- [Current Status](#current-status)
- [Known Limitations](#known-limitations)
- [Roadmap](#roadmap)
- [Privacy](#privacy)
- [License](#license)
- [Author](#author)

---

## Overview

Habit Tracker is a mobile app for creating, scheduling, completing, and reviewing habits.

The app started as a simple daily habit checklist and has grown into a more complete habit-tracking system with:

- flexible schedules
- skipped days with reasons
- subtasks
- numeric goals
- local reminders
- completion heatmaps
- activity statistics
- local import/export
- a dark neon mobile UI

The app is designed to be **offline-first** and **local-first**. It does not require an account, backend, or cloud sync to work.

---

## Features

### Habit Management

Users can: 

- create habits
- edit habits
- archive habits
- choose habit colors
- choose custom icons or emojis
- add descriptions
- configure reminders
- view detailed habit history

Each habit can have its own visual identity through an icon/emoji and accent color.

---

### Flexible Habit Scheduling

Habits are not limited to daily repetition.

Supported schedule types:

#### Daily

The habit appears every day.

Example:

```text
Read 10 pages
```

#### Specific Weekdays

The habit appears only on selected weekdays.

Example:

```text
Workout every Monday, Wednesday, and Friday
```

#### Interval

The habit appears every X days from a start date.

Example:

```text
Take supplement every 3 days
```

This makes the app useful for both regular and irregular routines.

---

### Selected-Date Tracking

The Today screen is based on a selected date, not only the current day.

Users can:

- scroll through days
- select earlier dates
- complete habits for past dates
- see progress for the selected date
- avoid completing future dates

The displayed date format on the Today screen is:

```text
DD-MM-YYYY
```

Internally, dates are stored as:

```text
YYYY-MM-DD
```

---

### Completion Tracking

Users can:

- mark habits as completed
- unmark habits if completed by mistake
- track completions by date
- view completed days in a heatmap
- see progress for selected days, weeks, months, and years

Each habit can only have one completion per date.

---

### Skips With Required Reasons

Users can skip a habit for a selected date, but a reason is required.

Examples:

```text
Sick
Vacation
Rest day
Travel
```

Skipped days are treated differently from missed days:

- skipped days are not counted as completed
- skipped days are not counted as failures
- skipped days are shown separately in the UI
- completing a skipped habit removes the skip
- skipping a completed habit removes the completion

This makes the tracking system more fair and realistic.

---

### Subtasks

Habits can contain subtasks.

Example:

```text
Supplements
- Vitamin D
- Magnesium
- Omega 3
```

A subtask habit can be completed when all required subtasks are completed for the selected date.

This is useful for habits that are really small routines grouped under one larger habit.

---

### Numeric Goals

Habits can track progress toward a numeric target.

Examples:

```text
Read 20 pages
Drink 2 liters of water
Walk 10,000 steps
Study for 60 minutes
```

A numeric habit is completed when the recorded value reaches or exceeds the target.

---

### Habit Detail Heatmap

Each habit has a detailed history screen with a GitHub-style completion heatmap.

The heatmap can show:

- completed days
- missed days
- skipped days
- habit-specific consistency over time

This gives users a quick visual overview of how consistent they have been.

---

### Stats and Activity

The Stats screen provides progress insights across habits.

It includes:

- Last 7 days activity
- Month view
- Year view
- GitHub-style activity heatmaps
- weekly completion percentage
- current streak
- longest streak
- habit-level breakdowns

Stats are calculated from local SQLite data.

Skipped days are treated separately from missed days where supported.

---

### Local Reminders

The app supports local habit reminders using Expo Notifications.

Users can:

- enable reminders per habit
- choose reminder times
- update reminders when editing habits
- cancel reminders when archiving habits
- clear reminders during reset

> Note: Notification behavior may be limited in Expo Go. Reliable notification testing usually requires an EAS development build.

---

### Icon and Emoji Picker

Users can choose either:

- an emoji
- a vector icon

The app includes a searchable icon/emoji picker and stores enough information to render selected symbols consistently across:

- Today screen
- Habit detail screen
- Stats screen
- Habit form preview

Older habits with simple icon values are handled gracefully.

---

### Import, Export, and Reset

The app supports local data management.

Users can:

- export local data as JSON
- import previously exported JSON
- reset all local data after confirmation

Data export/import is designed to help users back up or move their local habit data.

---

### Dark Neon Design

The app uses a custom dark neon design system.

Design traits:

- near-black background
- neon lime primary accent
- rounded cards
- colorful habit tiles
- dark elevated surfaces
- compact heatmaps
- large tap targets
- clean mobile-first spacing
- custom bottom navigation

---

## Screens

Main app areas:

### Today

The main habit tracking screen.

Includes:

- selected-date progress
- habit cards
- completion status
- skipped status
- schedule-aware habit display
- quick access to creating habits

### Stats

The analytics screen.

Includes:

- Last 7 days bar chart
- Month heatmap
- Year heatmap
- streak information
- weekly progress
- habit breakdowns

### New Habit

Used to create habits.

Includes:

- habit name
- description
- icon/emoji picker
- color picker
- schedule settings
- tracking type
- reminder settings

### Edit Habit

Used to update existing habits.

Includes the same main settings as the New Habit screen.

### Habit Detail

Shows detailed progress for one habit.

Includes:

- habit summary
- completions
- skips
- heatmap
- stats
- edit action
- archive action

### Notifications

Shows reminder-related information.

Depending on the current build, this may include:

- upcoming reminders
- notification permission status
- links to settings

### Settings

Includes:

- notification permissions
- data export
- data import
- reset local data
- app information
- privacy note

---

## Tech Stack

### Framework

- Expo
- React Native
- TypeScript
- Expo Router

### Storage

- SQLite via `expo-sqlite`

### Notifications

- `expo-notifications`

### UI

- React Native components
- Expo-compatible vector icons
- Custom theme system

### Development Tools

- VS Code
- Git
- Node.js
- Expo Go
- EAS CLI, for future development builds

---

## Project Structure

The project is organized by app routes, reusable components, database logic, theme files, and utilities.

```text
app/
  _layout.tsx

  (tabs)/
    _layout.tsx
    index.tsx
    stats.tsx
    notifications.tsx
    settings.tsx

  habits/
    new.tsx
    [id].tsx
    edit/
      [id].tsx

src/
  components/
    EmptyState.tsx
    HabitForm.tsx
    HabitHeatmap.tsx
    HabitIcon.tsx
    HabitRow.tsx
    IconEmojiPicker.tsx
    PrimaryButton.tsx
    StatCard.tsx
    TextInputField.tsx
    WeeklyActivityChart.tsx

  db/
    database.ts
    schema.ts
    habits.ts
    completions.ts
    skips.ts
    subtasks.ts
    numericEntries.ts

  notifications/
    notifications.ts

  theme/
    colors.ts
    spacing.ts
    radius.ts
    typography.ts
    index.ts

  types/
    Habit.ts

  utils/
    dates.ts
    schedule.ts
    streaks.ts
    reminders.ts
```

The exact structure may change as the app evolves.

---

## Data Model

The app uses SQLite for local persistence.

### Habits

Stores core habit data.

Typical fields include:

```text
id
name
description
icon
iconType
iconValue
iconLibrary
color
archived
trackingType
scheduleType
scheduleWeekdays
scheduleIntervalDays
scheduleStartDate
reminderEnabled
reminderTime
notificationId
createdAt
updatedAt
```

---

### Habit Completions

Stores completed habit dates.

```text
id
habitId
date
completedAt
```

A habit can have only one completion per date.

---

### Habit Skips

Stores skipped dates and reasons.

```text
id
habitId
date
reason
createdAt
```

A habit can have only one skip per date.

A habit cannot be both completed and skipped on the same date.

---

### Habit Subtasks

Stores subtasks for subtask-based habits.

```text
id
habitId
title
position
required
archived
createdAt
updatedAt
```

---

### Habit Subtask Completions

Stores completed subtasks by date.

```text
id
habitId
subtaskId
date
completedAt
```

---

### Numeric Entries

Stores progress values for numeric habits.

```text
id
habitId
date
value
updatedAt
```

---

### Settings

Stores local settings.

```text
key
value
```

---

## Tracking Types

The app supports multiple habit tracking types.

### Checkbox

A simple yes/no habit.

Example:

```text
Meditate
```

### Subtasks

A checklist-based habit.

Example:

```text
Morning routine
- Stretch
- Drink water
- Journal
```

### Numeric

A habit with a measurable target.

Example:

```text
Read 20 pages
```

---

## Schedule Types

The app supports multiple schedule types.

### Daily

The habit appears every day.

### Weekdays

The habit appears on selected weekdays.

Example:

```text
Monday, Wednesday, Friday
```

### Interval

The habit appears every X days.

Example:

```text
Every 3 days
```

---

## Getting Started

### Prerequisites

Install:

- Node.js LTS
- Git
- Expo Go on your phone
- VS Code, recommended

Optional for later:

- EAS CLI
- Apple Developer Program membership for iOS development builds and App Store distribution

---

## Installation

Clone the repository:

```bash
git clone <your-repository-url>
cd <your-project-folder>
```

Install dependencies:

```bash
npm install
```

Start the Expo development server:

```bash
npx expo start
```

Open the app on your phone using Expo Go.

---

## Development Commands

Start the app:

```bash
npx expo start
```

Run linting:

```bash
npm run lint
```

Run TypeScript checks:

```bash
npx tsc --noEmit
```

Install dependencies:

```bash
npm install
```

Create an iOS development build later:

```bash
eas build --platform ios --profile development
```

Create an Android development build later:

```bash
eas build --platform android --profile development
```

---

## Expo Go Notes

The app can currently be tested with Expo Go.

However, some native features may behave differently in Expo Go than in a real development or production build.

This especially applies to:

- notifications
- app permissions
- future widgets
- native configuration changes

For reliable native testing, an EAS development build should be used.

---

## EAS Build Notes

A future iOS development build will require:

- Expo account
- EAS CLI
- Apple Developer Program membership
- registered iPhone device

The Apple Developer Program is required for normal iOS device builds, TestFlight, and App Store distribution.

---

## Current Status

The app currently supports:

- local habit creation and editing
- habit archiving
- custom icons and emojis
- descriptions
- flexible scheduling
- selected-date tracking
- completions
- skips with reasons
- subtasks
- numeric goals
- reminders
- stats
- heatmaps
- import/export/reset
- dark neon UI

The project is still under active development and should be tested carefully before real release.

---

## Known Limitations

Current limitations:

- no cloud sync
- no user accounts
- no cross-device backup unless data is exported manually
- notifications may be unreliable in Expo Go
- no App Store release yet
- no TestFlight build yet
- no iOS widgets yet
- advanced import validation may still need more testing
- stats logic may need more edge-case testing with complex schedules, skips, and numeric habits

---

## Roadmap

Possible future improvements:

### Short Term

- more manual QA
- better error handling
- improved import validation
- better notification testing
- cleaner empty states
- more polished onboarding
- archived habit restore
- habit templates

### Medium Term

- categories
- morning and evening routines
- achievement badges
- streak freezes
- calendar picker
- advanced analytics
- improved reminders
- EAS development builds

### Long Term

- TestFlight release
- App Store release
- Android release
- optional cloud sync
- optional account system
- iOS widgets
- Apple Watch support

---

## Privacy

Habit Tracker is designed to be local-first.

Currently:

- habit data is stored locally on the device
- no account is required
- no backend is used
- no cloud sync is used
- no third-party analytics are used
- data is only shared if the user manually exports it

This makes the app privacy-conscious by default.

---

## Development Philosophy

This project aims to stay:

- simple
- local-first
- offline-capable
- privacy-conscious
- visually polished
- useful without accounts
- useful without subscriptions

The goal is not to build a bloated productivity platform. The goal is to build a clean, reliable habit tracker that helps users follow through.

---

## Screenshots

Screenshots will be added later.

Recommended screenshots:

```text
Today screen
New Habit screen
Icon/emoji picker
Habit Detail heatmap
Stats screen
Settings screen
```

---

## Contributing

This is currently a personal project.

If contributions are opened later, useful areas would include:

- bug fixes
- accessibility improvements
- test coverage
- UI polish
- import/export reliability
- schedule/statistics edge cases

---

## License

No license has been selected yet.

Before publishing publicly, choose a license.

Common options:

- MIT License, if others may freely use and modify the project
- GPL License, if modifications should remain open-source
- No license, if all rights should be reserved for now

---

## Author

Built by `Silvan Meier`.