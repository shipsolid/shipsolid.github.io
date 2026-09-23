import { describe, expect, it } from 'vitest';
import { filterByCategory, parseEntries, parseLine, rollupCounts, toMarkdown } from './bullet-journal';

describe('parseLine', () => {
  it('matches a 1-char token line', () => {
    expect(parseLine('- Review Alloy configuration')).toEqual({
      raw: '- Review Alloy configuration',
      category: 'task',
      text: 'Review Alloy configuration',
    });
  });

  it('matches a 2-char token line', () => {
    expect(parseLine('$m Platform sync')).toEqual({
      raw: '$m Platform sync',
      category: 'meeting',
      text: 'Platform sync',
    });
  });

  it('distinguishes lowercase x (done) from uppercase X (cancelled)', () => {
    expect(parseLine('x Finished the POC')).toEqual({
      raw: 'x Finished the POC',
      category: 'done',
      text: 'Finished the POC',
    });
    expect(parseLine('X Cancelled the sync')).toEqual({
      raw: 'X Cancelled the sync',
      category: 'cancelled',
      text: 'Cancelled the sync',
    });
  });

  it('reads a leading ?? as the unresolved token, not as ? matched twice', () => {
    const entry = parseLine('?? Still unclear whether ownership maps to team or service tier');
    expect(entry.category).toBe('unresolved');
    expect(entry.text).toBe('Still unclear whether ownership maps to team or service tier');
    // The key regression this guards against: a naive 1-char-first scan would match the first
    // `?` as the `question` token and leave a stray leading `?` in the text.
    expect(entry.category).not.toBe('question');
    expect(entry.text.startsWith('?')).toBe(false);
  });

  it('returns unrecognized for a line with no matching token', () => {
    const line = 'Just some free text with no leading symbol';
    expect(parseLine(line)).toEqual({
      raw: line,
      category: 'unrecognized',
      text: line,
    });
  });
});

describe('parseEntries', () => {
  it('splits on newlines, skips blank lines, and parses the rest', () => {
    const block = [
      '# 23 Aug 2026',
      '',
      '- Review Grafana Application Observability',
      '? How should service ownership be represented?',
      '',
      '> Use Entity Graph as the source of truth for ownership',
    ].join('\n');

    const entries = parseEntries(block);

    expect(entries).toHaveLength(4);
    expect(entries.map((e) => e.category)).toEqual(['heading', 'task', 'question', 'decision']);
  });
});

describe('rollupCounts', () => {
  it('counts entries per category and leaves untouched categories at 0', () => {
    const entries = parseEntries(
      [
        '- Review Alloy configuration',
        '- Document entity relationships',
        '? How should service ownership be represented?',
        '?? Still unclear whether ownership maps to team or service tier',
        '> Use Entity Graph as the source of truth for ownership',
      ].join('\n')
    );

    const counts = rollupCounts(entries);

    expect(counts.task).toBe(2);
    expect(counts.question).toBe(1);
    expect(counts.unresolved).toBe(1);
    expect(counts.decision).toBe(1);
    // Untouched categories stay at 0 rather than being absent from the record.
    expect(counts.meeting).toBe(0);
    expect(counts.blocked).toBe(0);
    expect(counts.unrecognized).toBe(0);
  });
});

describe('filterByCategory', () => {
  it('keeps only entries whose category is in the given list', () => {
    const entries = parseEntries(
      ['- A task', '< Waiting on something', '<< Blocked on something else', '? A question'].join('\n')
    );

    const filtered = filterByCategory(entries, ['waiting', 'blocked']);

    expect(filtered.map((e) => e.category)).toEqual(['waiting', 'blocked']);
  });
});

describe('toMarkdown', () => {
  it('renders entries in order, one raw line per entry, under a heading', () => {
    const entries = parseEntries(['- Review Alloy configuration', '> Use Mimir as the central metrics backend'].join('\n'));

    const markdown = toMarkdown(entries, '23 Aug 2026');

    expect(markdown).toBe(
      '# 23 Aug 2026\n\n- Review Alloy configuration\n> Use Mimir as the central metrics backend\n'
    );
  });

  it('falls back to a default heading and a placeholder line when there are no entries', () => {
    const markdown = toMarkdown([]);

    expect(markdown).toContain('# Bullet Journal Entry');
    expect(markdown).toContain('_No entries yet._');
  });
});
