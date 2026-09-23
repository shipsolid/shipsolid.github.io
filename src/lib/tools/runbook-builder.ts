// Pure runbook model + Markdown renderer. No DOM, no localStorage — the page owns id generation
// and draft persistence. Section shape follows the dr-runbook-writer skill.

export type RunbookStepKind = 'check' | 'action' | 'decision';

export interface RunbookStep {
  id: string;
  kind: RunbookStepKind;
  text: string;
  expected?: string;
  onFail?: string;
}

export interface Runbook {
  id: string;
  createdIso: string;
  title: string;
  alertName: string;
  severity: string;
  summary: string;
  symptoms: string[];
  diagnosisSteps: RunbookStep[];
  remediation: string[];
  escalation: string;
  owner: string;
  dashboards: string[];
}

export function blankRunbook(): Runbook {
  return {
    id: '',
    createdIso: '',
    title: '',
    alertName: '',
    severity: 'SEV3',
    summary: '',
    symptoms: [''],
    diagnosisSteps: [{ id: 'step-1', kind: 'check', text: '', expected: '', onFail: '' }],
    remediation: [''],
    escalation: '',
    owner: '',
    dashboards: [],
  };
}

export function validateRunbook(r: Partial<Runbook>): string[] {
  const errors: string[] = [];
  if (!r.title?.trim()) errors.push('Title is required.');
  if (!r.alertName?.trim()) errors.push('Alert name is required.');
  if (!(r.symptoms ?? []).some((s) => s.trim() !== '')) errors.push('Add at least one symptom.');
  if (!(r.diagnosisSteps ?? []).some((s) => s.text.trim() !== '')) errors.push('Add at least one diagnosis step.');
  if (!(r.remediation ?? []).some((s) => s.trim() !== '')) errors.push('Add at least one remediation step.');
  return errors;
}

const KIND_LABEL: Record<RunbookStepKind, string> = {
  check: 'CHECK',
  action: 'ACTION',
  decision: 'DECISION',
};

export function toMarkdown(r: Runbook): string {
  const lines: string[] = [];
  lines.push(`# Runbook: ${r.title || 'Untitled'}`, '');

  const meta = [`**Alert:** ${r.alertName || '—'}`, `**Severity:** ${r.severity || '—'}`];
  if (r.owner.trim()) meta.push(`**Owner:** ${r.owner.trim()}`);
  lines.push(meta.join('  \n'), '');

  if (r.summary.trim()) {
    lines.push('## Summary', '', r.summary.trim(), '');
  }

  lines.push('## Symptoms', '');
  const symptoms = r.symptoms.filter((s) => s.trim() !== '');
  lines.push(...(symptoms.length ? symptoms.map((s) => `- ${s.trim()}`) : ['- _none recorded_']), '');

  lines.push('## Diagnosis', '');
  const steps = r.diagnosisSteps.filter((s) => s.text.trim() !== '');
  if (steps.length === 0) {
    lines.push('_No diagnosis steps recorded._', '');
  } else {
    steps.forEach((step, i) => {
      lines.push(`${i + 1}. **[${KIND_LABEL[step.kind]}]** ${step.text.trim()}`);
      if (step.expected?.trim()) lines.push(`   - Expected: ${step.expected.trim()}`);
      if (step.onFail?.trim()) lines.push(`   - If not: ${step.onFail.trim()}`);
    });
    lines.push('');
  }

  lines.push('## Remediation', '');
  const remediation = r.remediation.filter((s) => s.trim() !== '');
  lines.push(...(remediation.length ? remediation.map((s) => `- ${s.trim()}`) : ['- _none recorded_']), '');

  lines.push('## Escalation', '', r.escalation.trim() || '_No escalation path recorded._', '');

  const dashboards = r.dashboards.filter((d) => d.trim() !== '');
  if (dashboards.length) {
    lines.push('## Dashboards', '', ...dashboards.map((d) => `- ${d.trim()}`), '');
  }

  return lines.join('\n').trimEnd() + '\n';
}

export function toFilename(r: Runbook): string {
  const slug = (r.alertName || r.title || 'runbook')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
  return `runbook-${slug || 'untitled'}.md`;
}
