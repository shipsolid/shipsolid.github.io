import { describe, expect, it } from 'vitest';
import { sortEventsByTime, toMarkdown, validateEvent } from './incident-timeline';
import type { IncidentEvent } from './incident-timeline';

describe('sortEventsByTime', () => {
  it('returns a new array sorted ascending by timestampIso, without mutating the input', () => {
    const events: IncidentEvent[] = [
      { id: '2', timestampIso: '2026-08-27T14:45:00.000Z', label: 'Customer escalation received', severity: 'SEV2' },
      { id: '1', timestampIso: '2026-08-27T10:03:00.000Z', label: 'Checkout latency spike detected', severity: 'SEV1' },
      { id: '3', timestampIso: '2026-08-27T11:30:00.000Z', label: 'Mitigation deployed', severity: 'SEV1' },
    ];
    const original = [...events];

    const sorted = sortEventsByTime(events);

    expect(sorted.map((e) => e.id)).toEqual(['1', '3', '2']);
    expect(events).toEqual(original); // input untouched
  });

  it('returns an empty array when given an empty array', () => {
    expect(sortEventsByTime([])).toEqual([]);
  });
});

describe('toMarkdown', () => {
  it('renders a default heading plus one sorted bullet per event, with owner and note formatted inline', () => {
    const events: IncidentEvent[] = [
      {
        id: '2',
        timestampIso: '2026-08-27T14:45:00.000Z',
        label: 'Customer escalation received',
        severity: 'SEV2',
        owner: 'Support',
      },
      {
        id: '1',
        timestampIso: '2026-08-27T10:03:00.000Z',
        label: 'Checkout latency spike detected',
        severity: 'SEV1',
        owner: 'Amit',
        note: 'https://dash.grafana.net/d/abc',
      },
    ];

    const expected =
      '# Incident Timeline\n\n' +
      '- **10:03** — Checkout latency spike detected (SEV1, Amit) — https://dash.grafana.net/d/abc\n' +
      '- **14:45** — Customer escalation received (SEV2, Support)';

    expect(toMarkdown(events)).toBe(expected);
  });

  it('uses a custom title heading when one is given', () => {
    const events: IncidentEvent[] = [
      { id: '1', timestampIso: '2026-08-27T10:00:00.000Z', label: 'Deploy rollback initiated', severity: 'SEV3' },
    ];

    expect(toMarkdown(events, 'Checkout Outage')).toBe(
      '# Checkout Outage\n\n- **10:00** — Deploy rollback initiated (SEV3)'
    );
  });

  it('renders the empty-state line when there are no events', () => {
    const markdown = toMarkdown([]);
    expect(markdown).toContain('# Incident Timeline');
    expect(markdown).toContain('_No events recorded yet._');
  });
});

describe('validateEvent', () => {
  it('returns no errors for a fully valid input', () => {
    expect(
      validateEvent({
        timestampIso: '2026-08-27T10:00:00.000Z',
        label: 'Deploy rollback initiated',
        severity: 'SEV3',
      })
    ).toEqual([]);
  });

  it('returns one error per broken field — missing label and an unrecognized severity', () => {
    const errors = validateEvent({
      timestampIso: '2026-08-27T10:00:00.000Z',
      label: '   ',
      severity: 'CRITICAL',
    });
    expect(errors).toHaveLength(2);
  });
});
