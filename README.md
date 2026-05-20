# Habito

Habito is a local-first mobile habit tracker built with Expo, React Native, TypeScript, and SQLite. It is designed for flexible daily routines, quiet progress tracking, and a polished dark interface that keeps the focus on showing up.

The app supports simple checkbox habits, checklist-style habits with subtasks, and numeric goals such as pages read, minutes practiced, or water intake. Progress is stored on-device, works offline, and can be reviewed through Today cards, habit detail pages, stats, heatmaps, crowns, and achievements.

## Highlights

- Local SQLite storage with no required account or cloud sync
- Flexible habit scheduling for daily, weekday, and cycle-based routines
- Today dashboard with multiple card sizes and quick progress actions
- Checkbox, subtask, and numeric goal tracking
- Skips with reasons and local history
- Habit detail pages with history, stats, and progress views
- Activity stats, heatmaps, streaks, crowns, and achievements
- Local reminder notifications
- Archived habit restore/delete management
- Import, export, and reset tools for local data
- Custom dark neon UI with Lucide habit icons

## Tech Stack

- Expo React Native
- TypeScript
- Expo Router
- SQLite via `expo-sqlite`
- Expo Notifications
- PWA/static web export for GitHub Pages
- Lucide React Native
- date-fns

## Getting Started

Install dependencies:

```bash
npm install
```

Start the Expo development server:

```bash
npx expo start
```

Then open the app in Expo Go.

Run project checks:

```bash
npm run lint
npx tsc --noEmit
```

Build the PWA/static web version:

```bash
npm run build:web
```

The exported site is written to `dist/`. The web build is configured for GitHub Pages at `/habit-tracker`, with a web app manifest, service worker, install icons, `.nojekyll`, and a `404.html` fallback for client-side routes.

Preview the exported site locally with the same base path GitHub Pages will use:

```bash
npm run preview:pages
```

## GitHub Pages Deployment

This repo includes a GitHub Actions workflow at `.github/workflows/pages.yml`. To publish:

1. Push the project to GitHub on `main` or `master`.
2. In the GitHub repository, open **Settings > Pages**.
3. Set **Build and deployment > Source** to **GitHub Actions**.
4. Push a commit or run the **Deploy PWA to GitHub Pages** workflow manually.

If the repository name changes from `habit-tracker`, update the `/habit-tracker` base path in `app.json`, `app/+html.tsx`, and `public/manifest.json`.

## Development Notes

Habito is intentionally local-first. Habit data stays on the device/browser unless the user manually exports it.

The app currently targets Expo Go for native development and Expo web/PWA for browser deployment. Notification behavior can vary between Expo Go, native development builds, and browsers, so EAS builds may still be useful for deeper native testing later.

## Status

This project is in active development. The core tracking, scheduling, stats, reminders, achievements, archive management, and local data tools are functional, with ongoing polish across interaction design and reliability.

## License

This project is currently private/personal. Add a license before publishing or accepting contributions.
