// Pure ADR (Architecture Decision Record) helpers — no DOM, no localStorage. The calling page
// (or its <script>) owns id generation (crypto.randomUUID()), numbering against the current
// drafts list, and persistence; this module just slugifies, numbers, renders, and validates.

export type AdrStatus = 'Proposed' | 'Accepted' | 'Deprecated' | 'Superseded';

export interface Adr {
  id: string; // caller-generated, not this module's concern
  number: number; // sequential ADR number
  title: string;
  status: AdrStatus;
  context: string;
  decision: string;
  alternatives: string;
  consequences: string;
  mermaid?: string; // optional raw mermaid diagram source
  createdIso: string;
}

// Lowercases, trims, collapses runs of non-alphanumeric characters into a single '-', and strips
// any leading/trailing '-'. Falls back to "untitled" when nothing alphanumeric survives.
export function slugify(title: string): string {
  const slug = title
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
  return slug || 'untitled';
}

// Returns (max existing .number, or 0 if none) + 1.
export function nextAdrNumber(existing: Adr[]): number {
  const max = existing.reduce((acc, adr) => Math.max(acc, adr.number), 0);
  return max + 1;
}

function paddedNumber(number: number): string {
  return String(number).padStart(4, '0');
}

// e.g. number 42, title "Use OpenTelemetry" -> "0042-use-opentelemetry.md"
export function toFilename(adr: Adr): string {
  return `${paddedNumber(adr.number)}-${slugify(adr.title)}.md`;
}

// Renders the ADR body as Markdown. When adr.mermaid is a non-empty string, a "## Diagram"
// section (fenced ```mermaid block) is inserted right after Decision and before Alternatives.
export function toMarkdown(adr: Adr): string {
  const sections = [
    `# ADR-${paddedNumber(adr.number)}: ${adr.title}\n\n`,
    `**Status:** ${adr.status}\n\n`,
    `## Context\n\n${adr.context}\n\n`,
    `## Decision\n\n${adr.decision}\n\n`,
  ];

  if (adr.mermaid && adr.mermaid.trim()) {
    sections.push(`## Diagram\n\n\`\`\`mermaid\n${adr.mermaid}\n\`\`\`\n\n`);
  }

  sections.push(`## Alternatives\n\n${adr.alternatives}\n\n`);
  sections.push(`## Consequences\n\n${adr.consequences}\n`);

  return sections.join('');
}

// Returns an array of human-readable validation error strings (empty array = valid).
export function validateAdr(input: { title: string; context: string; decision: string }): string[] {
  const errors: string[] = [];

  if (!input.title.trim()) {
    errors.push('Title is required.');
  }
  if (!input.context.trim()) {
    errors.push('Context is required.');
  }
  if (!input.decision.trim()) {
    errors.push('Decision is required.');
  }

  return errors;
}
