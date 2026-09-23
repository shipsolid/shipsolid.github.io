import { describe, expect, it } from 'vitest';
import { filterLogs, groupBy, levelCounts, parseLogs } from './log-explorer';

const SAMPLE = [
  '2026-08-27 10:14:02 INFO  192.168.1.42 GET /api/orders status=200 dur=34ms',
  '2026-08-27 10:14:05 WARN  10.0.0.17 POST /api/checkout status=429 dur=812ms',
  '{"ts":"2026-08-27T10:14:11Z","level":"error","msg":"inventory timeout","service":"inventory","status":500}',
  '',
  '2026-08-27 10:15:44 info 192.168.1.42 GET /api/orders status=200 dur=29ms',
].join('\n');

describe('parseLogs', () => {
  it('parses mixed plain and JSON lines and skips blanks', () => {
    const lines = parseLogs(SAMPLE);
    expect(lines).toHaveLength(4);
    expect(lines[0].lineNumber).toBe(1);
    expect(lines[3].lineNumber).toBe(5); // blank line 4 skipped, numbering preserved
  });

  it('extracts timestamp, level and key=value fields from a plain line', () => {
    const [first] = parseLogs(SAMPLE);
    expect(first.timestamp).toBe('2026-08-27 10:14:02');
    expect(first.level).toBe('INFO');
    expect(first.fields).toMatchObject({ status: '200', dur: '34ms' });
  });

  it('normalises level casing and synonyms', () => {
    const lines = parseLogs(SAMPLE);
    expect(lines[1].level).toBe('WARN');
    expect(lines[3].level).toBe('INFO'); // lowercase "info"
  });

  it('lifts level/ts/msg out of a JSON line and keeps the rest as fields', () => {
    const jsonLine = parseLogs(SAMPLE)[2];
    expect(jsonLine.level).toBe('ERROR');
    expect(jsonLine.timestamp).toBe('2026-08-27T10:14:11Z');
    expect(jsonLine.message).toBe('inventory timeout');
    expect(jsonLine.fields).toMatchObject({ service: 'inventory', status: '500' });
  });

  it('extracts a quoted key="value with spaces" field', () => {
    const [line] = parseLogs('2026-01-01 00:00:00 INFO msg="hello world" code=7');
    expect(line.fields.msg).toBe('hello world');
    expect(line.fields.code).toBe('7');
  });

  it('returns [] for empty input', () => {
    expect(parseLogs('')).toEqual([]);
  });
});

describe('filterLogs', () => {
  const lines = parseLogs(SAMPLE);

  it('filters by substring on the raw line', () => {
    expect(filterLogs(lines, { query: 'checkout' })).toHaveLength(1);
  });

  it('filters by level', () => {
    expect(filterLogs(lines, { levels: ['INFO'] })).toHaveLength(2);
    expect(filterLogs(lines, { levels: ['ERROR', 'WARN'] })).toHaveLength(2);
  });

  it('filters by a valid regex', () => {
    // matches the plain "status=429" line and the JSON "status":500 line
    expect(filterLogs(lines, { query: '\\b(429|500)\\b', regex: true })).toHaveLength(2);
    expect(filterLogs(lines, { query: 'status=200', regex: true })).toHaveLength(2);
  });

  it('throws on an invalid regex', () => {
    expect(() => filterLogs(lines, { query: '(', regex: true })).toThrow(/Invalid regex/);
  });
});

describe('grouping', () => {
  const lines = parseLogs(SAMPLE);

  it('groupBy level, sorted by count desc', () => {
    const groups = groupBy(lines, 'level');
    expect(groups[0]).toEqual({ key: 'INFO', count: 2 });
  });

  it('groupBy a named field', () => {
    const groups = groupBy(lines, 'field', 'status');
    const byKey = Object.fromEntries(groups.map((g) => [g.key, g.count]));
    expect(byKey['200']).toBe(2);
  });

  it('groupBy field throws without a field name', () => {
    expect(() => groupBy(lines, 'field')).toThrow(/requires a field name/);
  });

  it('levelCounts tallies every level', () => {
    expect(levelCounts(lines)).toEqual({ INFO: 2, WARN: 1, ERROR: 1 });
  });
});
