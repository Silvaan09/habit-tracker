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
