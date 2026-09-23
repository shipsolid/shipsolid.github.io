import { describe, expect, it } from 'vitest';
import { formatSql, minifySql } from './sql-formatter';

describe('formatSql', () => {
  it('pretty-prints a flat query onto multiple lines', () => {
    const out = formatSql('select a,b from t where x=1');
    expect(out.split('\n').length).toBeGreaterThan(1);
    expect(out.toLowerCase()).toContain('from');
    expect(out).toContain('x = 1');
  });

  it('uppercases keywords when asked', () => {
    const out = formatSql('select a from t', { uppercase: true });
    expect(out).toContain('SELECT');
    expect(out).toContain('FROM');
  });

  it('returns empty string for empty input', () => {
    expect(formatSql('   ')).toBe('');
  });

  it('accepts a dialect without throwing', () => {
    expect(() => formatSql('select 1', { dialect: 'postgresql' })).not.toThrow();
    expect(() => formatSql('select 1', { dialect: 'tsql' })).not.toThrow();
  });

  it('wraps a parse error in a friendly message', () => {
    expect(() => formatSql('select * from (')).toThrow(/Could not format SQL:/);
  });
});

describe('minifySql', () => {
  it('collapses whitespace outside string literals', () => {
    expect(minifySql('select  a,\n  b\nfrom   t')).toBe('select a, b from t');
  });

  it('preserves whitespace inside a quoted string', () => {
    expect(minifySql("select 'a   b' from t")).toBe("select 'a   b' from t");
  });

  it('round-trips a formatted query back to one line', () => {
    const formatted = formatSql('select a, b from t where x = 1');
    expect(minifySql(formatted)).toBe('select a, b from t where x = 1');
  });
});
