import { describe, expect, it } from 'vitest';
import { describeCron, nextRunTimes, validateCron } from './cron-builder';

describe('validateCron', () => {
  it('accepts a standard 5-field expression', () => {
    expect(validateCron('*/15 * * * *')).toEqual({ valid: true, error: null });
  });

  it('accepts comma lists, ranges, and steps together', () => {
    expect(validateCron('1,15,30 0-5 1-30/5 * 1-5')).toEqual({ valid: true, error: null });
  });

  it('rejects an expression with the wrong number of fields', () => {
    const result = validateCron('* * * *');
    expect(result.valid).toBe(false);
    expect(result.error).toMatch(/5 fields/);
  });

  it('rejects an out-of-range value', () => {
    const result = validateCron('60 * * * *');
    expect(result.valid).toBe(false);
    expect(result.error).toMatch(/minute/);
  });

  it('rejects a non-numeric field', () => {
    const result = validateCron('a * * * *');
    expect(result.valid).toBe(false);
    expect(result.error).toMatch(/minute/);
  });

  it('rejects an empty expression', () => {
    const result = validateCron('');
    expect(result.valid).toBe(false);
    expect(result.error).toBeTruthy();
  });

  it('rejects a malformed range (start greater than end)', () => {
    const result = validateCron('0 10-5 * * *');
    expect(result.valid).toBe(false);
    expect(result.error).toMatch(/hour/);
  });

  it('rejects a zero step', () => {
    const result = validateCron('*/0 * * * *');
    expect(result.valid).toBe(false);
  });

  it('never throws, even for garbage input', () => {
    expect(() => validateCron('not a cron expression at all')).not.toThrow();
  });
});

describe('describeCron', () => {
  it('describes a step-based minute expression', () => {
    expect(describeCron('*/15 * * * *')).toBe('Every 15 minutes');
  });

  it('describes a fixed weekday business-hours expression', () => {
    expect(describeCron('0 9 * * 1-5')).toBe('At 09:00, Monday through Friday');
  });

  it('describes a monthly expression', () => {
    expect(describeCron('0 0 1 * *')).toBe('At 00:00, on day 1 of the month');
  });

  it('describes every minute', () => {
    expect(describeCron('* * * * *')).toBe('Every minute');
  });

  it('describes a fixed minute repeated every hour', () => {
    expect(describeCron('30 * * * *')).toBe('At minute 30 past every hour');
  });

  it('describes a single weekly occurrence', () => {
    expect(describeCron('0 0 * * 0')).toBe('At 00:00, Sunday');
  });

  it('describes an expression with a specific month', () => {
    expect(describeCron('0 12 1 1 *')).toBe('At 12:00, on day 1 of the month, in January');
  });

  it('throws with the validateCron error message for an invalid expression', () => {
    expect(() => describeCron('* * *')).toThrow(/5 fields/);
  });
});

describe('nextRunTimes', () => {
  const from = new Date('2026-01-01T00:00:00Z');

  it('returns the next N matches for a simple step expression, strictly after `from`', () => {
    const results = nextRunTimes('*/15 * * * *', 5, from);
    expect(results).toHaveLength(5);
    expect(results.map((d) => d.toISOString())).toEqual([
      '2026-01-01T00:15:00.000Z',
      '2026-01-01T00:30:00.000Z',
      '2026-01-01T00:45:00.000Z',
      '2026-01-01T01:00:00.000Z',
      '2026-01-01T01:15:00.000Z',
    ]);
  });

  it('rounds a `from` with seconds/minutes already in-progress up to the next full minute', () => {
    const midMinute = new Date('2026-01-01T00:07:30Z');
    const results = nextRunTimes('*/15 * * * *', 1, midMinute);
    expect(results[0].toISOString()).toBe('2026-01-01T00:15:00.000Z');
  });

  it('matches a fixed daily time expression', () => {
    const results = nextRunTimes('0 9 * * *', 2, from);
    expect(results.map((d) => d.toISOString())).toEqual([
      '2026-01-01T09:00:00.000Z',
      '2026-01-02T09:00:00.000Z',
    ]);
  });

  it('matches weekday-restricted expressions, skipping the weekend', () => {
    // 2026-01-01 is a Thursday (UTC), so the next weekday 09:00 matches are that same
    // Thursday, then Friday, then (skipping Sat/Sun) the following Monday.
    const results = nextRunTimes('0 9 * * 1-5', 3, from);
    expect(results.map((d) => d.getUTCDay())).toEqual([4, 5, 1]);
  });

  it('returns an empty array when count is 0', () => {
    expect(nextRunTimes('* * * * *', 0, from)).toEqual([]);
  });

  it('throws a descriptive error for an expression that can never match', () => {
    // Day-of-month 31 in February never occurs.
    expect(() => nextRunTimes('0 0 31 2 *', 1, from)).toThrow(/No match found/);
  });

  it('throws for an invalid cron expression', () => {
    expect(() => nextRunTimes('bad expr', 1, from)).toThrow();
  });
});
