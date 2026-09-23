// Pure client-side log parsing / filtering / grouping. Best-effort: handles plain lines with a
// timestamp + level + key=value fields, and JSON-per-line logs. No DOM, no localStorage.

export interface ParsedLogLine {
  raw: string;
  lineNumber: number;
  timestamp: string | null;
  level: string | null;
  message: string;
  fields: Record<string, string>;
}

export interface LogFilter {
  query?: string;
  levels?: string[];
  regex?: boolean;
}

const ISO_TS_RE =
  /\b\d{4}-\d{2}-\d{2}[T ]\d{2}:\d{2}:\d{2}(?:\.\d+)?(?:Z|[+-]\d{2}:?\d{2})?/;
const EPOCH_TS_RE = /^\s*(\d{10}|\d{13})\b/;
const LEVEL_RE = /\b(TRACE|DEBUG|INFO|INFORMATION|NOTICE|WARN|WARNING|ERROR|ERR|FATAL|CRIT|CRITICAL)\b/i;
const KV_RE = /([A-Za-z_][\w.\-]*)=(?:"([^"]*)"|'([^']*)'|(\S+))/g;

function normalizeLevel(raw: string): string {
  const up = raw.toUpperCase();
  if (up === 'WARNING') return 'WARN';
  if (up === 'ERR') return 'ERROR';
  if (up === 'INFORMATION') return 'INFO';
  if (up === 'CRIT') return 'CRITICAL';
  return up;
}

function coerce(value: unknown): string {
  if (value === null || value === undefined) return '';
  if (typeof value === 'object') return JSON.stringify(value);
  return String(value);
}

function parseJsonLine(obj: Record<string, unknown>, raw: string, lineNumber: number): ParsedLogLine {
  const LEVEL_KEYS = ['level', 'severity', 'lvl', 'levelname', 'loglevel'];
  const TS_KEYS = ['timestamp', 'ts', 'time', '@timestamp', 'datetime', 'date'];
  const MSG_KEYS = ['message', 'msg', 'text', 'body'];

  const levelKey = LEVEL_KEYS.find((k) => k in obj);
  const tsKey = TS_KEYS.find((k) => k in obj);
  const msgKey = MSG_KEYS.find((k) => k in obj);

  const lifted = new Set([levelKey, tsKey, msgKey].filter(Boolean) as string[]);
  const fields: Record<string, string> = {};
  for (const [k, v] of Object.entries(obj)) {
    if (!lifted.has(k)) fields[k] = coerce(v);
  }

  return {
    raw,
    lineNumber,
    timestamp: tsKey ? coerce(obj[tsKey]) || null : null,
    level: levelKey ? normalizeLevel(coerce(obj[levelKey])) : null,
    message: msgKey ? coerce(obj[msgKey]) : raw,
    fields,
  };
}

function parsePlainLine(raw: string, lineNumber: number): ParsedLogLine {
  const isoMatch = raw.match(ISO_TS_RE);
  const epochMatch = raw.match(EPOCH_TS_RE);
  const timestamp = isoMatch ? isoMatch[0] : epochMatch ? epochMatch[1] : null;

  const levelMatch = raw.match(LEVEL_RE);
  const level = levelMatch ? normalizeLevel(levelMatch[1]) : null;

  const fields: Record<string, string> = {};
  let kv: RegExpExecArray | null;
  KV_RE.lastIndex = 0;
  while ((kv = KV_RE.exec(raw)) !== null) {
    const key = kv[1];
    const value = kv[2] ?? kv[3] ?? kv[4] ?? '';
    fields[key] = value;
  }

  // Message = the line with a leading timestamp and level token trimmed off, if present.
  let message = raw;
  if (timestamp && message.includes(timestamp)) {
    message = message.slice(message.indexOf(timestamp) + timestamp.length);
  }
  message = message.replace(LEVEL_RE, '').replace(/^[\s\-:|\]]+/, '').trim() || raw.trim();

  return { raw, lineNumber, timestamp, level, message, fields };
}

export function parseLogs(text: string): ParsedLogLine[] {
  const out: ParsedLogLine[] = [];
  const rawLines = text.split('\n');
  for (let i = 0; i < rawLines.length; i++) {
    const raw = rawLines[i];
    if (raw.trim() === '') continue;
    const lineNumber = i + 1;
    const trimmed = raw.trim();
    if (trimmed.startsWith('{') && trimmed.endsWith('}')) {
      try {
        const obj = JSON.parse(trimmed);
        if (obj && typeof obj === 'object' && !Array.isArray(obj)) {
          out.push(parseJsonLine(obj, raw, lineNumber));
          continue;
        }
      } catch {
        // not valid JSON — fall through
      }
    }
    out.push(parsePlainLine(raw, lineNumber));
  }
  return out;
}

export function filterLogs(lines: ParsedLogLine[], filter: LogFilter): ParsedLogLine[] {
  let matcher: ((line: ParsedLogLine) => boolean) | null = null;
  const query = filter.query?.trim();

  if (query) {
    if (filter.regex) {
      let re: RegExp;
      try {
        re = new RegExp(query, 'i');
      } catch (err) {
        throw new Error(`Invalid regex: ${err instanceof Error ? err.message : String(err)}`);
      }
      matcher = (line) => re.test(line.raw);
    } else {
      const needle = query.toLowerCase();
      matcher = (line) => line.raw.toLowerCase().includes(needle);
    }
  }

  const levelSet =
    filter.levels && filter.levels.length > 0
      ? new Set(filter.levels.map((l) => l.toUpperCase()))
      : null;

  return lines.filter((line) => {
    if (levelSet && !(line.level && levelSet.has(line.level))) return false;
    if (matcher && !matcher(line)) return false;
    return true;
  });
}

export function levelCounts(lines: ParsedLogLine[]): Record<string, number> {
  const counts: Record<string, number> = {};
  for (const line of lines) {
    const key = line.level ?? '(none)';
    counts[key] = (counts[key] ?? 0) + 1;
  }
  return counts;
}

export function groupBy(
  lines: ParsedLogLine[],
  key: 'level' | 'field',
  fieldName?: string
): { key: string; count: number }[] {
  if (key === 'field' && !fieldName) {
    throw new Error('groupBy("field") requires a field name');
  }
  const counts = new Map<string, number>();
  for (const line of lines) {
    const bucket =
      key === 'level' ? line.level ?? '(none)' : line.fields[fieldName as string] ?? '(missing)';
    counts.set(bucket, (counts.get(bucket) ?? 0) + 1);
  }
  return [...counts.entries()]
    .map(([k, count]) => ({ key: k, count }))
    .sort((a, b) => b.count - a.count);
}
