import { describe, expect, it } from 'vitest';

import { formatDisplayDateDDMMYYYY, isFutureDate } from '@/src/utils/dates';

describe('date utilities', () => {
  it('formats internal yyyy-mm-dd dates for display as dd-mm-yyyy', () => {
    expect(formatDisplayDateDDMMYYYY('2026-05-10')).toBe('10-05-2026');
  });

  it('leaves invalid display date input unchanged', () => {
    expect(formatDisplayDateDDMMYYYY('May 10, 2026')).toBe('May 10, 2026');
  });

  it('compares internal date strings lexically for future checks', () => {
    expect(isFutureDate('2026-05-11', '2026-05-10')).toBe(true);
    expect(isFutureDate('2026-05-10', '2026-05-10')).toBe(false);
    expect(isFutureDate('2026-05-09', '2026-05-10')).toBe(false);
  });
});
