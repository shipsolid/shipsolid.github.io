import { describe, expect, it } from 'vitest';
import { formatTimestamp, isoToUnix, relativeTime, unixToIso } from './timestamp-converter';

describe('unixToIso', () => {
  it('converts a unix seconds value to an ISO 8601 UTC string', () => {
    expect(unixToIso(0)).toBe('1970-01-01T00:00:00.000Z');
    expect(unixToIso(1735689600)).toBe('2025-01-01T00:00:00.000Z');
  });

  it('throws for a non-finite value', () => {
    expect(() => unixToIso(NaN)).toThrow();
    expect(() => unixToIso(Infinity)).toThrow();
  });

  it('throws for a non-number value', () => {
    // @ts-expect-error deliberately passing a bad type to verify the runtime guard
    expect(() => unixToIso('not a number')).toThrow();
  });
});

describe('isoToUnix', () => {
  it('parses an ISO 8601 string to unix seconds', () => {
    expect(isoToUnix('1970-01-01T00:00:00.000Z')).toBe(0);
    expect(isoToUnix('2025-01-01T00:00:00.000Z')).toBe(1735689600);
  });

  it('floors fractional seconds down', () => {
    expect(isoToUnix('1970-01-01T00:00:00.999Z')).toBe(0);
  });

  it('throws for an invalid date string', () => {
    expect(() => isoToUnix('not a date')).toThrow();
  });
});

describe('formatTimestamp', () => {
  it('formats a timestamp in UTC', () => {
    const result = formatTimestamp(1735689600, 'UTC');
    expect(result).toContain('2025');
    expect(result).toContain('January');
  });

  it('formats the same instant differently across timezones', () => {
    const utc = formatTimestamp(1735689600, 'UTC');
    const kolkata = formatTimestamp(1735689600, 'Asia/Kolkata');
    expect(utc).not.toBe(kolkata);
  });

  it('throws a descriptive error for an invalid IANA time zone', () => {
    expect(() => formatTimestamp(0, 'Not/A_Zone')).toThrow(/time zone/i);
  });
});

describe('relativeTime', () => {
  const now = 1_700_000_000;

  it('returns "just now" for deltas under 10 seconds in either direction', () => {
    expect(relativeTime(now, now)).toBe('just now');
    expect(relativeTime(now + 5, now)).toBe('just now');
    expect(relativeTime(now - 5, now)).toBe('just now');
  });

  it('formats a past delta in minutes', () => {
    expect(relativeTime(now - 3 * 60, now)).toBe('3 minutes ago');
  });

  it('formats a future delta in hours', () => {
    expect(relativeTime(now + 2 * 3600, now)).toBe('in 2 hours');
  });

  it('formats a past delta in days', () => {
    expect(relativeTime(now - 5 * 86400, now)).toBe('5 days ago');
  });

  it('formats a future delta in months', () => {
    expect(relativeTime(now + 3 * 30 * 86400, now)).toBe('in 3 months');
  });

  it('formats a past delta in years', () => {
    expect(relativeTime(now - 2 * 365 * 86400, now)).toBe('2 years ago');
  });

  it('uses singular units when the amount rounds to 1', () => {
    expect(relativeTime(now - 60, now)).toBe('1 minute ago');
    expect(relativeTime(now + 3600, now)).toBe('in 1 hour');
  });
});
