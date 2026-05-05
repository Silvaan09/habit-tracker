import { format } from 'date-fns';

export function getTodayDateString(): string {
  return format(new Date(), 'yyyy-MM-dd');
}

export function formatDisplayDateDDMMYYYY(dateString: string): string {
  const [year, month, day] = dateString.split('-');

  if (!year || !month || !day) {
    return dateString;
  }

  return `${day}-${month}-${year}`;
}

export function isFutureDate(dateString: string, today: string): boolean {
  return dateString > today;
}
