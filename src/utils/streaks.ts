import { addDays, differenceInCalendarDays, format } from 'date-fns';

export function calculateCurrentStreak(
  completionDates: string[],
  today: string,
  ignoredDates: string[] = []
): number {
  const completedDateSet = createCompletionDateSet(completionDates);
  const ignoredDateSet = createCompletionDateSet(ignoredDates);
  let cursor = completedDateSet.has(today)
    ? parseDateString(today)
    : addDays(parseDateString(today), -1);
  let streak = 0;

  while (ignoredDateSet.has(formatDateString(cursor))) {
    cursor = addDays(cursor, -1);
  }

  while (completedDateSet.has(formatDateString(cursor))) {
    streak += 1;
    cursor = addDays(cursor, -1);

    while (ignoredDateSet.has(formatDateString(cursor))) {
      cursor = addDays(cursor, -1);
    }
  }

  return streak;
}

export function calculateLongestStreak(
  completionDates: string[],
  ignoredDates: string[] = []
): number {
  const uniqueDates = getSortedUniqueDates(completionDates);
  const ignoredDateSet = createCompletionDateSet(ignoredDates);

  if (uniqueDates.length === 0) {
    return 0;
  }

  let longestStreak = 1;
  let currentStreak = 1;

  for (let index = 1; index < uniqueDates.length; index += 1) {
    const previousDate = parseDateString(uniqueDates[index - 1]);
    const currentDate = parseDateString(uniqueDates[index]);
    const dayDifference = differenceInCalendarDays(currentDate, previousDate);

    if (dayDifference === 1 || hasOnlyIgnoredDatesBetween(previousDate, currentDate, ignoredDateSet)) {
      currentStreak += 1;
    } else {
      currentStreak = 1;
    }

    longestStreak = Math.max(longestStreak, currentStreak);
  }

  return longestStreak;
}

export function calculateCompletionRate(
  completionDates: string[],
  habitCreatedAt: string,
  today: string
): number {
  const createdDate = getLocalDateStringFromValue(habitCreatedAt);
  const possibleDays = differenceInCalendarDays(parseDateString(today), parseDateString(createdDate)) + 1;

  if (possibleDays <= 0) {
    return 0;
  }

  const completedDays = getSortedUniqueDates(completionDates).filter(
    (date) => date >= createdDate && date <= today
  ).length;

  return Math.min(completedDays / possibleDays, 1);
}

export function getRecentDateRange(days: number, today: string): string[] {
  if (days <= 0) {
    return [];
  }

  const endDate = parseDateString(today);
  const startDate = addDays(endDate, -(days - 1));

  return Array.from({ length: days }, (_, index) => formatDateString(addDays(startDate, index)));
}

function createCompletionDateSet(completionDates: string[]) {
  return new Set(getSortedUniqueDates(completionDates));
}

function getSortedUniqueDates(completionDates: string[]) {
  return Array.from(new Set(completionDates.filter(isDateString))).sort();
}

function isDateString(value: string) {
  return /^\d{4}-\d{2}-\d{2}$/.test(value);
}

function getLocalDateStringFromValue(value: string) {
  if (isDateString(value)) {
    return value;
  }

  return formatDateString(new Date(value));
}

function parseDateString(dateString: string) {
  const [year, month, day] = dateString.split('-').map(Number);

  return new Date(year, month - 1, day);
}

function formatDateString(date: Date) {
  return format(date, 'yyyy-MM-dd');
}

function hasOnlyIgnoredDatesBetween(
  previousDate: Date,
  currentDate: Date,
  ignoredDateSet: Set<string>
) {
  let cursor = addDays(previousDate, 1);

  while (differenceInCalendarDays(currentDate, cursor) > 0) {
    if (!ignoredDateSet.has(formatDateString(cursor))) {
      return false;
    }

    cursor = addDays(cursor, 1);
  }

  return true;
}
