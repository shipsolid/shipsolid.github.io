import { describe, expect, it } from 'vitest';
import { nextAdrNumber, slugify, toFilename, toMarkdown, validateAdr } from './adr-builder';
import type { Adr } from './adr-builder';

describe('slugify', () => {
  it('lowercases, trims, and dashes non-alphanumeric runs', () => {
    expect(slugify('Use OpenTelemetry for .NET instrumentation')).toBe(
      'use-opentelemetry-for-net-instrumentation'
    );
  });

  it('falls back to "untitled" for an empty/whitespace-only title', () => {
    expect(slugify('')).toBe('untitled');
    expect(slugify('   ')).toBe('untitled');
  });

  it('falls back to "untitled" when the title is only punctuation', () => {
    expect(slugify('!!!???')).toBe('untitled');
  });
});

describe('nextAdrNumber', () => {
  const makeAdr = (number: number): Adr => ({
    id: `id-${number}`,
    number,
    title: `ADR ${number}`,
    status: 'Proposed',
    context: 'ctx',
    decision: 'dec',
    alternatives: 'alt',
    consequences: 'cons',
    createdIso: '2026-01-01T00:00:00.000Z',
  });

  it('returns one past the max existing number', () => {
    expect(nextAdrNumber([makeAdr(1), makeAdr(5), makeAdr(3)])).toBe(6);
  });

  it('returns 1 for an empty list', () => {
    expect(nextAdrNumber([])).toBe(1);
  });
});

describe('toFilename', () => {
  it('zero-pads the number to 4 digits and appends the slugified title', () => {
    const adr: Adr = {
      id: '1',
      number: 42,
      title: 'Use OpenTelemetry for .NET instrumentation',
      status: 'Accepted',
      context: 'ctx',
      decision: 'dec',
      alternatives: 'alt',
      consequences: 'cons',
      createdIso: '2026-01-01T00:00:00.000Z',
    };
    expect(toFilename(adr)).toBe('0042-use-opentelemetry-for-net-instrumentation.md');
  });
});

describe('toMarkdown', () => {
  const baseAdr: Adr = {
    id: '1',
    number: 7,
    title: 'Adopt Grafana Alloy as the sole collector',
    status: 'Accepted',
    context: 'We run multiple collector agents across clusters.',
    decision: 'Standardize on Grafana Alloy for all telemetry collection.',
    alternatives: 'Keep the OTel Collector; keep Promtail + Grafana Agent.',
    consequences: 'Simplified pipeline, one config format to maintain.',
    createdIso: '2026-01-01T00:00:00.000Z',
  };

  it('renders the exact section structure/order without a mermaid section', () => {
    expect(toMarkdown(baseAdr)).toBe(
      '# ADR-0007: Adopt Grafana Alloy as the sole collector\n\n' +
        '**Status:** Accepted\n\n' +
        '## Context\n\nWe run multiple collector agents across clusters.\n\n' +
        '## Decision\n\nStandardize on Grafana Alloy for all telemetry collection.\n\n' +
        '## Alternatives\n\nKeep the OTel Collector; keep Promtail + Grafana Agent.\n\n' +
        '## Consequences\n\nSimplified pipeline, one config format to maintain.\n'
    );
  });

  it('inserts the Diagram section right after Decision and before Alternatives when mermaid is set', () => {
    const withMermaid: Adr = { ...baseAdr, mermaid: 'graph TD; A-->B;' };
    expect(toMarkdown(withMermaid)).toBe(
      '# ADR-0007: Adopt Grafana Alloy as the sole collector\n\n' +
        '**Status:** Accepted\n\n' +
        '## Context\n\nWe run multiple collector agents across clusters.\n\n' +
        '## Decision\n\nStandardize on Grafana Alloy for all telemetry collection.\n\n' +
        '## Diagram\n\n```mermaid\ngraph TD; A-->B;\n```\n\n' +
        '## Alternatives\n\nKeep the OTel Collector; keep Promtail + Grafana Agent.\n\n' +
        '## Consequences\n\nSimplified pipeline, one config format to maintain.\n'
    );
  });
});

describe('validateAdr', () => {
  it('returns no errors for fully populated input', () => {
    expect(
      validateAdr({
        title: 'Adopt Grafana Alloy as the sole collector',
        context: 'We run multiple collector agents across clusters.',
        decision: 'Standardize on Grafana Alloy for all telemetry collection.',
      })
    ).toEqual([]);
  });

  it('returns one error per blank required field', () => {
    const errors = validateAdr({ title: '  ', context: '', decision: '   ' });
    expect(errors).toHaveLength(3);
  });
});
