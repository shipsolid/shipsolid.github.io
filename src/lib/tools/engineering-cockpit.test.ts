import { describe, expect, it } from 'vitest';
import {
  buildMarkdownExport,
  isValidTime,
  parseCockpitImport,
  sortScheduleEntries,
  type CockpitExport,
} from './engineering-cockpit';

describe('isValidTime', () => {
  it('accepts valid 24h HH:MM', () => {
    expect(isValidTime('00:00')).toBe(true);
    expect(isValidTime('09:05')).toBe(true);
    expect(isValidTime('23:59')).toBe(true);
  });

  it('rejects invalid formats', () => {
    expect(isValidTime('24:00')).toBe(false);
    expect(isValidTime('9:05')).toBe(false);
    expect(isValidTime('09:60')).toBe(false);
    expect(isValidTime('not-a-time')).toBe(false);
    expect(isValidTime('')).toBe(false);
  });
});

describe('sortScheduleEntries', () => {
  it('sorts by time ascending without mutating the input', () => {
    const entries = [
      { time: '14:00', label: '1:1' },
      { time: '09:00', label: 'Standup' },
      { time: '10:30', label: 'Review' },
    ];
    const sorted = sortScheduleEntries(entries);
    expect(sorted.map((e) => e.time)).toEqual(['09:00', '10:30', '14:00']);
    expect(entries.map((e) => e.time)).toEqual(['14:00', '09:00', '10:30']);
  });

  it('handles an empty list', () => {
    expect(sortScheduleEntries([])).toEqual([]);
  });
});

describe('buildMarkdownExport', () => {
  it('renders all sections with content', () => {
    const data: CockpitExport = {
      exportedAt: 0,
      top3: [
        { text: 'Ship the RFC', done: true },
        { text: 'Review PRs', done: false },
        { text: '', done: false },
      ],
      schedule: [{ time: '14:00', label: '1:1' }, { time: '09:00', label: 'Standup' }],
      capture: [{ text: 'Idea: cardinality budget doc', ts: 123 }],
      waiting: [{ text: 'Azure access approval', since: 456 }],
    };

    const md = buildMarkdownExport(data, '27 Aug 2026');

    expect(md).toContain('# Engineering Cockpit — 27 Aug 2026');
    expect(md).toContain('- [x] Ship the RFC');
    expect(md).toContain('- [ ] Review PRs');
    expect(md).toContain('- [ ] (empty)');
    expect(md).toContain('- 09:00 — Standup');
    expect(md.indexOf('09:00')).toBeLessThan(md.indexOf('14:00'));
    expect(md).toContain('- Idea: cardinality budget doc');
    expect(md).toContain('- Azure access approval');
  });

  it('renders "(none)" placeholders for empty sections', () => {
    const data: CockpitExport = {
      exportedAt: 0,
      top3: [],
      schedule: [],
      capture: [],
      waiting: [],
    };

    const md = buildMarkdownExport(data, '27 Aug 2026');
    const noneCount = md.split('- (none)').length - 1;
    expect(noneCount).toBe(4);
  });
});

describe('parseCockpitImport', () => {
  const valid: CockpitExport = {
    exportedAt: 1000,
    top3: [{ text: 'a', done: false }],
    schedule: [{ time: '09:00', label: 'Standup' }],
    capture: [{ text: 'note', ts: 1 }],
    waiting: [{ text: 'thing', since: 2 }],
  };

  it('parses a valid export round-trip', () => {
    expect(parseCockpitImport(JSON.stringify(valid))).toEqual(valid);
  });

  it('defaults a missing exportedAt to 0 rather than the current time', () => {
    const { exportedAt: _omit, ...rest } = valid;
    const result = parseCockpitImport(JSON.stringify(rest));
    expect(result.exportedAt).toBe(0);
  });

  it('throws a descriptive error on invalid JSON', () => {
    expect(() => parseCockpitImport('not json')).toThrow('Not valid JSON.');
  });

  it('throws on a non-object top level', () => {
    expect(() => parseCockpitImport('42')).toThrow('Expected a JSON object.');
  });

  it('throws when top3 is missing or malformed', () => {
    expect(() => parseCockpitImport(JSON.stringify({ ...valid, top3: undefined }))).toThrow('top3');
    expect(() => parseCockpitImport(JSON.stringify({ ...valid, top3: [{ text: 'a' }] }))).toThrow('top3');
  });

  it('throws when schedule, capture, or waiting are malformed', () => {
    expect(() => parseCockpitImport(JSON.stringify({ ...valid, schedule: [{ time: '09:00' }] }))).toThrow(
      'schedule'
    );
    expect(() => parseCockpitImport(JSON.stringify({ ...valid, capture: [{ text: 'x' }] }))).toThrow('capture');
    expect(() => parseCockpitImport(JSON.stringify({ ...valid, waiting: [{ text: 'x' }] }))).toThrow('waiting');
  });
});
