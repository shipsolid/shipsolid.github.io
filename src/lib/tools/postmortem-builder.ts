// Pure incident-postmortem model + Markdown renderer. No DOM, no localStorage. Section shape
// follows the incident-post-mortem-writer skill.

export interface TimelineEntry {
  time: string;
  event: string;
}

export interface ActionItem {
  text: string;
  owner?: string;
  due?: string;
}

export interface Postmortem {
  id: string;
  createdIso: string;
  title: string;
  status: 'draft' | 'final';
  date: string;
  severity: string;
  authors: string;
  summary: string;
  impact: string;
  detection: string;
  timeline: TimelineEntry[];
  rootCause: string;
  contributingFactors: string[];
  resolution: string;
  whatWentWell: string[];
  whatWentPoorly: string[];
  actionItems: ActionItem[];
}

export function blankPostmortem(): Postmortem {
  return {
    id: '',
    createdIso: '',
    title: '',
    status: 'draft',
    date: '',
    severity: 'SEV2',
    authors: '',
    summary: '',
    impact: '',
    detection: '',
    timeline: [{ time: '', event: '' }],
    rootCause: '',
    contributingFactors: [],
    resolution: '',
    whatWentWell: [],
    whatWentPoorly: [],
    actionItems: [{ text: '', owner: '', due: '' }],
  };
}

export function validatePostmortem(p: Partial<Postmortem>): string[] {
  const errors: string[] = [];
  if (!p.title?.trim()) errors.push('Title is required.');
  if (!p.summary?.trim()) errors.push('Summary is required.');
  if (!p.impact?.trim()) errors.push('Impact is required.');
  if (!p.rootCause?.trim()) errors.push('Root cause is required.');
  if (!(p.timeline ?? []).some((t) => t.event.trim() !== '')) errors.push('Add at least one timeline entry.');
  if (!(p.actionItems ?? []).some((a) => a.text.trim() !== '')) errors.push('Add at least one action item.');
  return errors;
}

function mdEscapeCell(value: string): string {
  return value.replace(/\|/g, '\\|').replace(/\n/g, ' ');
}

function bulletSection(title: string, items: string[]): string[] {
  const nonEmpty = items.filter((s) => s.trim() !== '');
  if (nonEmpty.length === 0) return [];
  return [`## ${title}`, '', ...nonEmpty.map((s) => `- ${s.trim()}`), ''];
}

export function toMarkdown(p: Postmortem): string {
  const lines: string[] = [];
  lines.push(`# Postmortem: ${p.title || 'Untitled'}`, '');

  const meta = [
    `**Status:** ${p.status}`,
    `**Date:** ${p.date || '—'}`,
    `**Severity:** ${p.severity || '—'}`,
  ];
  if (p.authors.trim()) meta.push(`**Authors:** ${p.authors.trim()}`);
  lines.push(meta.join('  \n'), '');

  lines.push('## Summary', '', p.summary.trim() || '_TBD_', '');
  lines.push('## Impact', '', p.impact.trim() || '_TBD_', '');

  if (p.detection.trim()) lines.push('## Detection', '', p.detection.trim(), '');

  lines.push('## Timeline', '');
  const entries = p.timeline
    .filter((t) => t.event.trim() !== '')
    .slice()
    .sort((a, b) => a.time.localeCompare(b.time));
  if (entries.length === 0) {
    lines.push('_No timeline recorded._', '');
  } else {
    lines.push('| Time | Event |', '| --- | --- |');
    for (const e of entries) lines.push(`| ${mdEscapeCell(e.time || '—')} | ${mdEscapeCell(e.event.trim())} |`);
    lines.push('');
  }

  lines.push('## Root Cause', '', p.rootCause.trim() || '_TBD_', '');
  lines.push(...bulletSection('Contributing Factors', p.contributingFactors));
  if (p.resolution.trim()) lines.push('## Resolution', '', p.resolution.trim(), '');
  lines.push(...bulletSection('What Went Well', p.whatWentWell));
  lines.push(...bulletSection('What Went Poorly', p.whatWentPoorly));

  lines.push('## Action Items', '');
  const actions = p.actionItems.filter((a) => a.text.trim() !== '');
  if (actions.length === 0) {
    lines.push('_No action items recorded._', '');
  } else {
    lines.push('| Action | Owner | Due |', '| --- | --- | --- |');
    for (const a of actions) {
      lines.push(`| ${mdEscapeCell(a.text.trim())} | ${mdEscapeCell(a.owner ?? '')} | ${mdEscapeCell(a.due ?? '')} |`);
    }
    lines.push('');
  }

  return lines.join('\n').trimEnd() + '\n';
}
