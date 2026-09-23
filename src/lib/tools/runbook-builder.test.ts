import { describe, expect, it } from 'vitest';
import { blankRunbook, toFilename, toMarkdown, validateRunbook } from './runbook-builder';
import type { Runbook } from './runbook-builder';

function filled(overrides: Partial<Runbook> = {}): Runbook {
  return {
    ...blankRunbook(),
    title: 'Checkout latency',
    alertName: 'CheckoutP99High',
    severity: 'SEV2',
    summary: 'p99 latency on /checkout is above 2s.',
    symptoms: ['Alert CheckoutP99High firing', 'Users report slow checkout'],
    diagnosisSteps: [
      { id: 's1', kind: 'check', text: 'Check the checkout dashboard', expected: 'p99 < 500ms', onFail: 'go to step 2' },
      { id: 's2', kind: 'action', text: 'Check recent deploys', expected: '', onFail: '' },
    ],
    remediation: ['Roll back the latest checkout deploy', 'Scale the checkout deployment to 8 replicas'],
    escalation: 'Page the Payments on-call via Grafana IRM.',
    dashboards: ['https://grafana/d/checkout'],
    ...overrides,
  };
}

describe('validateRunbook', () => {
  it('lists every missing required field for a blank runbook', () => {
    const errors = validateRunbook(blankRunbook());
    expect(errors).toEqual(
      expect.arrayContaining([
        'Title is required.',
        'Alert name is required.',
        'Add at least one symptom.',
        'Add at least one diagnosis step.',
        'Add at least one remediation step.',
      ])
    );
  });

  it('returns [] for a fully filled runbook', () => {
    expect(validateRunbook(filled())).toEqual([]);
  });
});

describe('toMarkdown', () => {
  const md = toMarkdown(filled());

  it('includes every populated section', () => {
    expect(md).toContain('# Runbook: Checkout latency');
    expect(md).toContain('**Alert:** CheckoutP99High');
    expect(md).toContain('## Summary');
    expect(md).toContain('## Symptoms');
    expect(md).toContain('## Diagnosis');
    expect(md).toContain('## Remediation');
    expect(md).toContain('## Escalation');
    expect(md).toContain('## Dashboards');
  });

  it('numbers diagnosis steps and renders expected / if-not sub-lines', () => {
    expect(md).toContain('1. **[CHECK]** Check the checkout dashboard');
    expect(md).toContain('   - Expected: p99 < 500ms');
    expect(md).toContain('   - If not: go to step 2');
    expect(md).toContain('2. **[ACTION]** Check recent deploys');
  });

  it('omits the Dashboards section when there are none', () => {
    expect(toMarkdown(filled({ dashboards: [] }))).not.toContain('## Dashboards');
  });
});

describe('toFilename', () => {
  it('slugifies the alert name', () => {
    expect(toFilename(filled())).toBe('runbook-checkoutp99high.md');
  });
});
