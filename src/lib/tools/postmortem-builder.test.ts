import { describe, expect, it } from 'vitest';
import { blankPostmortem, toMarkdown, validatePostmortem } from './postmortem-builder';
import type { Postmortem } from './postmortem-builder';

function filled(overrides: Partial<Postmortem> = {}): Postmortem {
  return {
    ...blankPostmortem(),
    title: 'Checkout outage',
    status: 'final',
    date: '2026-08-27',
    severity: 'SEV1',
    authors: 'Amit',
    summary: 'Checkout was down for 22 minutes.',
    impact: '~4% of daily orders failed.',
    detection: 'Alert CheckoutP99High fired at 14:02.',
    timeline: [
      { time: '14:17', event: 'Rollback started' },
      { time: '14:02', event: 'Alert fired' },
      { time: '14:22', event: 'Recovery confirmed' },
    ],
    rootCause: 'A bad connection-pool default shipped in the 14:00 deploy.',
    contributingFactors: ['No canary for checkout', 'Pool default undocumented'],
    resolution: 'Rolled back and pinned the pool size.',
    whatWentWell: ['Fast detection'],
    whatWentPoorly: ['Manual rollback took 8 minutes'],
    actionItems: [
      { text: 'Add a canary stage for checkout', owner: 'Platform', due: '2026-09-15' },
      { text: 'Document connection-pool defaults', owner: 'Amit' },
    ],
    ...overrides,
  };
}

describe('validatePostmortem', () => {
  it('lists every missing required field for a blank postmortem', () => {
    const errors = validatePostmortem(blankPostmortem());
    expect(errors).toEqual(
      expect.arrayContaining([
        'Title is required.',
        'Summary is required.',
        'Impact is required.',
        'Root cause is required.',
        'Add at least one timeline entry.',
        'Add at least one action item.',
      ])
    );
  });

  it('returns [] for a fully filled postmortem', () => {
    expect(validatePostmortem(filled())).toEqual([]);
  });
});

describe('toMarkdown', () => {
  const md = toMarkdown(filled());

  it('renders the timeline as a table sorted by time', () => {
    const timelineBlock = md.slice(md.indexOf('## Timeline'));
    const order = ['14:02', '14:17', '14:22'].map((t) => timelineBlock.indexOf(t));
    expect(order).toEqual([...order].sort((a, b) => a - b));
    expect(md).toContain('| Time | Event |');
  });

  it('renders action items as a table with owner and due columns', () => {
    expect(md).toContain('| Action | Owner | Due |');
    expect(md).toContain('| Add a canary stage for checkout | Platform | 2026-09-15 |');
  });

  it('omits empty optional sections', () => {
    const lean = toMarkdown(
      filled({ detection: '', contributingFactors: [], resolution: '', whatWentWell: [], whatWentPoorly: [] })
    );
    expect(lean).not.toContain('## Detection');
    expect(lean).not.toContain('## Contributing Factors');
    expect(lean).not.toContain('## Resolution');
    expect(lean).not.toContain('## What Went Well');
  });

  it('escapes pipe characters in table cells', () => {
    const md2 = toMarkdown(filled({ actionItems: [{ text: 'fix a | b parsing', owner: '', due: '' }] }));
    expect(md2).toContain('fix a \\| b parsing');
  });
});
