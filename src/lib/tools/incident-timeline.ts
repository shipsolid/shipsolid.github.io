// Pure incident-timeline helpers — no DOM, no localStorage. The calling page (or its <script>)
// owns id generation (crypto.randomUUID()) and persistence; this module just sorts/renders/validates.

export type Severity = 'SEV1' | 'SEV2' | 'SEV3' | 'SEV4';

const SEVERITIES: Severity[] = ['SEV1', 'SEV2', 'SEV3', 'SEV4'];

export interface IncidentEvent {
  id: string; // caller-generated (e.g. crypto.randomUUID() at the call site, not in this module)
  timestampIso: string; // ISO 8601 datetime string
  label: string;
  owner?: string; // person/team
  severity: Severity;
  note?: string; // free text, may include a URL
}

// Returns a NEW array sorted ascending by timestampIso. Does not mutate input.
export function sortEventsByTime(events: IncidentEvent[]): IncidentEvent[] {
  return [...events].sort((a, b) => a.timestampIso.localeCompare(b.timestampIso));
}

// Time HH:MM extracted directly from the ISO string's time portion (no timezone conversion) —
// keeps output deterministic regardless of the machine's local timezone.
function timeOf(timestampIso: string): string {
  return timestampIso.slice(11, 16);
}

// Renders a Markdown document: "# {title}" (or "# Incident Timeline" if no title given), a blank
// line, then one bullet per event (sorted via sortEventsByTime). Empty events renders just the
// heading plus an italic "no events" line.
export function toMarkdown(events: IncidentEvent[], title?: string): string {
  const heading = `# ${title || 'Incident Timeline'}`;

  if (events.length === 0) {
    return `${heading}\n\n_No events recorded yet._`;
  }

  const lines = sortEventsByTime(events).map((event) => {
    const parts: string[] = [event.severity];
    if (event.owner) parts.push(event.owner);
    const meta = parts.join(', ');
    const note = event.note ? ` — ${event.note}` : '';
    return `- **${timeOf(event.timestampIso)}** — ${event.label} (${meta})${note}`;
  });

  return `${heading}\n\n${lines.join('\n')}`;
}

// Returns an array of human-readable validation error strings (empty array = valid).
export function validateEvent(input: { timestampIso: string; label: string; severity: string }): string[] {
  const errors: string[] = [];

  if (!input.label.trim()) {
    errors.push('Label is required.');
  }

  if (isNaN(Date.parse(input.timestampIso))) {
    errors.push('Timestamp is not a valid date/time.');
  }

  if (!SEVERITIES.includes(input.severity as Severity)) {
    errors.push('Severity must be one of SEV1, SEV2, SEV3, SEV4.');
  }

  return errors;
}
