import { describe, expect, it } from 'vitest';
import { calcApdex, calcBurnRate, calcErrorBudget, calcMttrMtbf, formatDuration } from './sre-calculator';

describe('calcErrorBudget', () => {
  it('computes allowed/remaining budget and percent consumed for a 99.9% / 30-day SLO', () => {
    const result = calcErrorBudget(99.9, 30, 10);
    expect(result.windowMinutes).toBe(43200);
    expect(result.allowedDowntimeMinutes).toBeCloseTo(43.2, 5);
    expect(result.remainingBudgetMinutes).toBeCloseTo(33.2, 5);
    expect(result.percentConsumed).toBeCloseTo(23.148148, 5);
  });

  it('leaves remainingBudgetMinutes/percentConsumed null when actualDowntimeMinutes is omitted', () => {
    const result = calcErrorBudget(99.9, 30);
    expect(result.remainingBudgetMinutes).toBeNull();
    expect(result.percentConsumed).toBeNull();
  });

  it('throws for an out-of-range sloPercent', () => {
    expect(() => calcErrorBudget(0, 30)).toThrow();
    expect(() => calcErrorBudget(100, 30)).toThrow();
  });

  it('throws for a non-positive windowDays', () => {
    expect(() => calcErrorBudget(99.9, 0)).toThrow();
  });
});

describe('calcBurnRate', () => {
  it('computes burn rate and days-to-exhaust for a 99.9% SLO burning at 0.5% errors', () => {
    const result = calcBurnRate(99.9, 0.5, 30);
    expect(result.burnRate).toBeCloseTo(5, 5);
    expect(result.daysToExhaustBudget).toBeCloseTo(6, 5);
  });

  it('returns Infinity days-to-exhaust when the observed error rate is zero', () => {
    const result = calcBurnRate(99.9, 0, 30);
    expect(result.burnRate).toBe(0);
    expect(result.daysToExhaustBudget).toBe(Infinity);
  });

  it('throws for an out-of-range sloPercent', () => {
    expect(() => calcBurnRate(100, 0.5, 30)).toThrow();
    expect(() => calcBurnRate(-1, 0.5, 30)).toThrow();
  });
});

describe('calcApdex', () => {
  it('scores 80 satisfied / 15 tolerating / 100 total as Good', () => {
    const result = calcApdex(80, 15, 100);
    expect(result.score).toBe(0.88);
    expect(result.rating).toBe('Good');
  });

  it('rates a perfect score as Excellent', () => {
    const result = calcApdex(100, 0, 100);
    expect(result.score).toBe(1);
    expect(result.rating).toBe('Excellent');
  });

  it('throws when satisfiedCount + toleratingCount exceeds totalCount', () => {
    expect(() => calcApdex(90, 20, 100)).toThrow();
  });

  it('throws when totalCount is not positive', () => {
    expect(() => calcApdex(0, 0, 0)).toThrow();
  });
});

describe('calcMttrMtbf', () => {
  it('computes MTTR/MTBF/availability for a 30-day window with three incidents', () => {
    const result = calcMttrMtbf([15, 25, 20], 43200);
    expect(result.mttrMinutes).toBeCloseTo(20, 5);
    expect(result.mtbfMinutes).toBeCloseTo(14380, 5);
    expect(result.availabilityPercent).toBeCloseTo(99.861111, 5);
  });

  it('returns zero MTTR and infinite MTBF when there are no incidents', () => {
    const result = calcMttrMtbf([], 43200);
    expect(result.mttrMinutes).toBe(0);
    expect(result.mtbfMinutes).toBe(Infinity);
    expect(result.availabilityPercent).toBe(100);
  });

  it('throws for a non-positive totalObservationMinutes', () => {
    expect(() => calcMttrMtbf([15], 0)).toThrow();
  });
});

describe('formatDuration', () => {
  it('formats a day-scale duration without seconds', () => {
    expect(formatDuration(1500)).toBe('1d 1h 0m');
  });

  it('formats a whole-minutes duration', () => {
    expect(formatDuration(45)).toBe('45m 0s');
  });

  it('formats a sub-minute/fractional-minute duration down to seconds', () => {
    expect(formatDuration(21.6)).toBe('21m 36s');
  });

  it('formats zero as 0s', () => {
    expect(formatDuration(0)).toBe('0s');
  });

  it('formats Infinity as the infinity symbol', () => {
    expect(formatDuration(Infinity)).toBe('∞');
  });
});
