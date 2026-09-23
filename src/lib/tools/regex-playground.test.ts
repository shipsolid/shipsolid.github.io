import { describe, expect, it } from 'vitest';
import { testRegex } from './regex-playground';

describe('testRegex', () => {
  it('finds a simple literal match', () => {
    const result = testRegex('cat', '', 'the cat sat on the mat');
    expect(result.isValid).toBe(true);
    expect(result.error).toBeNull();
    expect(result.matches).toHaveLength(1);
    expect(result.matches[0].match).toBe('cat');
    expect(result.matches[0].index).toBe(4);
    expect(result.matches[0].groups).toBeNull();
  });

  it('finds multiple occurrences with the g flag', () => {
    const result = testRegex('\\d+', 'g', 'order 12 shipped 34 items to 56 addresses');
    expect(result.isValid).toBe(true);
    expect(result.matches.map((m) => m.match)).toEqual(['12', '34', '56']);
  });

  it('only finds the first match without the g flag', () => {
    const result = testRegex('\\d+', '', 'order 12 shipped 34 items to 56 addresses');
    expect(result.isValid).toBe(true);
    expect(result.matches).toHaveLength(1);
    expect(result.matches[0].match).toBe('12');
  });

  it('captures named groups', () => {
    const result = testRegex('(?<year>\\d{4})-(?<month>\\d{2})', 'g', '2026-08-27 and 2025-01-01');
    expect(result.isValid).toBe(true);
    expect(result.matches).toHaveLength(2);
    expect(result.matches[0].groups).toEqual({ year: '2026', month: '08' });
    expect(result.matches[1].groups).toEqual({ year: '2025', month: '01' });
  });

  it('returns null groups when the pattern has no named capture groups', () => {
    const result = testRegex('\\d+', 'g', '42');
    expect(result.matches[0].groups).toBeNull();
  });

  it('does not filter out undefined values for non-participating alternation groups', () => {
    const result = testRegex('(?<a>foo)|(?<b>bar)', 'g', 'bar');
    expect(result.isValid).toBe(true);
    expect(result.matches[0].groups).toEqual({ a: undefined, b: 'bar' });
  });

  it('returns isValid: false with a non-null error for an invalid pattern, without throwing', () => {
    expect(() => testRegex('(unbalanced', 'g', 'text')).not.toThrow();
    const result = testRegex('(unbalanced', 'g', 'text');
    expect(result.isValid).toBe(false);
    expect(result.error).not.toBeNull();
    expect(result.matches).toEqual([]);
  });

  it('returns isValid: false with a non-null error for an invalid flag, without throwing', () => {
    expect(() => testRegex('abc', 'q', 'text')).not.toThrow();
    const result = testRegex('abc', 'q', 'text');
    expect(result.isValid).toBe(false);
    expect(result.error).not.toBeNull();
    expect(result.matches).toEqual([]);
  });

  it('returns an empty matches array with isValid true when there are no matches', () => {
    const result = testRegex('xyz', 'g', 'no matches here');
    expect(result.isValid).toBe(true);
    expect(result.error).toBeNull();
    expect(result.matches).toEqual([]);
  });
});
