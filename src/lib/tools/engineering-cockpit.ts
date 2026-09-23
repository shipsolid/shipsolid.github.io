// Pure helpers for the Engineering Cockpit page. DOM/localStorage wiring lives in
// engineering-cockpit.astro; date-keying reuses dayKeyFromTimestamp from lib/stats/aggregate.ts
// directly at the call site rather than re-deriving it here.

export interface Top3Item {
  text: string;
  done: boolean;
}

export interface ScheduleEntry {
  time: string; // HH:MM, 24h
  label: string;
}

export interface CaptureItem {
  text: string;
  ts: number; // epoch ms
}

export interface WaitingItem {
  text: string;
  since: number; // epoch ms
}

export interface CockpitExport {
  exportedAt: number;
  top3: Top3Item[];
  schedule: ScheduleEntry[];
  capture: CaptureItem[];
  waiting: WaitingItem[];
}

const TIME_RE = /^([01]\d|2[0-3]):([0-5]\d)$/;

export function isValidTime(value: string): boolean {
  return TIME_RE.test(value);
}

// Zero-padded HH:MM sorts correctly as a plain string compare — no Date parsing needed.
export function sortScheduleEntries(entries: ScheduleEntry[]): ScheduleEntry[] {
  return [...entries].sort((a, b) => a.time.localeCompare(b.time));
}

function mdList(items: string[]): string {
  return items.length > 0 ? items.map((line) => `- ${line}`).join('\n') : '- (none)';
}

export function buildMarkdownExport(data: CockpitExport, dateLabel: string): string {
  const top3Lines = data.top3.map((item) => `- [${item.done ? 'x' : ' '}] ${item.text || '(empty)'}`);
  const scheduleLines = sortScheduleEntries(data.schedule).map((entry) => `- ${entry.time} — ${entry.label}`);
  const captureLines = data.capture.map((item) => item.text);
  const waitingLines = data.waiting.map((item) => item.text);

  return [
    `# Engineering Cockpit — ${dateLabel}`,
    '',
    '## Top 3',
    mdList(top3Lines),
    '',
    "## Today's Schedule",
    mdList(scheduleLines),
    '',
    '## Quick Capture',
    mdList(captureLines),
    '',
    '## Waiting',
    mdList(waitingLines),
    '',
  ].join('\n');
}

function isTop3Item(value: unknown): value is Top3Item {
  return (
    typeof value === 'object' &&
    value !== null &&
    typeof (value as Top3Item).text === 'string' &&
    typeof (value as Top3Item).done === 'boolean'
  );
}

function isScheduleEntry(value: unknown): value is ScheduleEntry {
  return (
    typeof value === 'object' &&
    value !== null &&
    typeof (value as ScheduleEntry).time === 'string' &&
    typeof (value as ScheduleEntry).label === 'string'
  );
}

function isCaptureItem(value: unknown): value is CaptureItem {
  return (
    typeof value === 'object' &&
    value !== null &&
    typeof (value as CaptureItem).text === 'string' &&
    typeof (value as CaptureItem).ts === 'number'
  );
}

function isWaitingItem(value: unknown): value is WaitingItem {
  return (
    typeof value === 'object' &&
    value !== null &&
    typeof (value as WaitingItem).text === 'string' &&
    typeof (value as WaitingItem).since === 'number'
  );
}

export function parseCockpitImport(raw: string): CockpitExport {
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    throw new Error('Not valid JSON.');
  }

  if (typeof parsed !== 'object' || parsed === null) {
    throw new Error('Expected a JSON object.');
  }

  const candidate = parsed as Partial<CockpitExport>;

  if (!Array.isArray(candidate.top3) || !candidate.top3.every(isTop3Item)) {
    throw new Error('Missing or invalid "top3" array.');
  }
  if (!Array.isArray(candidate.schedule) || !candidate.schedule.every(isScheduleEntry)) {
    throw new Error('Missing or invalid "schedule" array.');
  }
  if (!Array.isArray(candidate.capture) || !candidate.capture.every(isCaptureItem)) {
    throw new Error('Missing or invalid "capture" array.');
  }
  if (!Array.isArray(candidate.waiting) || !candidate.waiting.every(isWaitingItem)) {
    throw new Error('Missing or invalid "waiting" array.');
  }

  return {
    exportedAt: typeof candidate.exportedAt === 'number' ? candidate.exportedAt : 0,
    top3: candidate.top3,
    schedule: candidate.schedule,
    capture: candidate.capture,
    waiting: candidate.waiting,
  };
}
