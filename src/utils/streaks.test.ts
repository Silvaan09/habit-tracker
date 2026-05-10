import { describe, expect, it } from 'vitest';

import {
  calculateCurrentStreak,
  calculateLongestStreak,
  getRecentDateRange,
} from '@/src/utils/streaks';

describe('streak utilities', () => {
  it('calculates a current streak ending today', () => {
    expect(
      calculateCurrentStreak(['2026-05-08', '2026-05-09', '2026-05-10'], '2026-05-10')
    ).toBe(3);
  });

  it('keeps yesterday as the current streak when today is not completed', () => {
    expect(calculateCurrentStreak(['2026-05-08', '2026-05-09'], '2026-05-10')).toBe(2);
  });

  it('breaks current streak on a missed date', () => {
    expect(calculateCurrentStreak(['2026-05-07', '2026-05-08', '2026-05-10'], '2026-05-10')).toBe(
      1
    );
  });

  it('does not inflate streaks with duplicate completion dates', () => {
    expect(
      calculateLongestStreak(['2026-05-08', '2026-05-08', '2026-05-09', '2026-05-10'])
    ).toBe(3);
  });

  it('returns 0 for empty completions', () => {
    expect(calculateCurrentStreak([], '2026-05-10')).toBe(0);
    expect(calculateLongestStreak([])).toBe(0);
  });

  it('bridges ignored dates when calculating longest streaks', () => {
    expect(calculateLongestStreak(['2026-05-08', '2026-05-10'], ['2026-05-09'])).toBe(2);
  });

  it('builds a fixed recent date range', () => {
    expect(getRecentDateRange(3, '2026-05-10')).toEqual([
      '2026-05-08',
      '2026-05-09',
      '2026-05-10',
    ]);
  });
});
