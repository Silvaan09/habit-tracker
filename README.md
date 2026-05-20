# Habito

Habito is a local-first habit tracker packaged as a Progressive Web App. It is built for flexible routines, quick daily check-ins, and quiet progress tracking without requiring an account, backend, or cloud sync.

The app supports simple checkbox habits, checklist-style habits with subtasks, and numeric goals such as pages read, minutes practiced, or glasses of water. Habit data is stored locally in the browser and can be exported by the user.

## Live App

Habito is available at:

https://silvaan09.github.io/habit-tracker/

## Features

- Local-first habit storage with no account required
- Installable PWA with offline support
- Today dashboard with compact, regular, and large habit cards
- Checkbox, subtask, and numeric goal tracking
- Daily, weekday, interval, and cycle-based schedules
- Skips with reasons and local history
- Habit detail pages with stats, history, heatmaps, and progress charts
- Streaks, crowns, milestones, and achievements
- Reminder settings for habits
- Archived habit restore/delete management
- Import, export, and reset tools for local data
- Polished dark interface with custom habit icons

## Tech Stack

- Expo
- React Native Web
- Expo Router
- TypeScript
- SQLite via `expo-sqlite`
- PWA manifest and service worker
- GitHub Pages
- Lucide React Native
- date-fns
- Vitest

## Local Development

Install dependencies:

```bash
npm install
```

Start the web development server:

```bash
npm run web
```

Run project checks:

```bash
npm run lint
npx tsc --noEmit
npm run test
```

Create a production build:

```bash
npm run build:web
```

## Data And Privacy

Habito is designed to run locally. Habit data is stored in the user's browser storage through SQLite and stays on the device unless the user exports it manually.

Because this is a browser-based PWA, clearing browser site data, using a different browser profile, or browser storage cleanup can remove local habit data. Use the export feature before switching devices, resetting the browser, or clearing site data.

## Browser Notes

Habito works best in modern Chromium, Safari, and Firefox browsers. PWA installation, offline behavior, local storage persistence, and notification behavior can vary by browser and operating system.

## Project Status

Habito is mostly complete and available as a GitHub Pages-hosted PWA. Future work is expected to focus on small polish, browser compatibility improvements, and maintenance.

## License

This project is currently private/personal. Add a license before publishing or accepting contributions.
