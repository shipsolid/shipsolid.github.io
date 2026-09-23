// Pure bullet-journal parsing helpers — no DOM, no localStorage. The calling page (or its
// <script>) owns persistence and rendering; this module just tokenizes/rolls-up/renders text.
//
// Notation reference: 0-session-logs/digital-bujo.md. A line is `<token> <space> <rest of text>`.
// Token matching is longest-prefix-match: 2-char tokens (`->`, `??`, `!!`, `~>`, `<<`, `>>`, `<~`,
// `$m`, `$w`, `$1`, `$e`) must be checked before 1-char tokens, otherwise e.g. `??` would be
// misread as `?` twice, `<<` as `<` twice, `>>` as `>` twice, `~>` as `~` then `>`, `<~` as `<`
// then `~`.

export type BujoCategory =
  | 'heading' | 'task' | 'note' | 'question' | 'unresolved' | 'critical' | 'important'
  | 'low-priority' | 'actionable' | 'decision' | 'waiting' | 'blocked' | 'future'
  | 'done' | 'cancelled' | 'meeting' | 'workshop' | 'one-on-one' | 'event' | 'person'
  | 'win' | 'reflection' | 'idea' | 'emotional' | 'unrecognized';

export interface BujoEntry {
  raw: string;
  category: BujoCategory;
  text: string; // the line with the token+space stripped (raw line if unrecognized)
}

export const BUJO_TOKENS: ReadonlyArray<{ token: string; category: BujoCategory }> = [
  // Two-char tokens first — longest-prefix-match must win over a 1-char token that is itself a
  // prefix of one of these (see module comment above for the concrete misreads this avoids).
  { token: '->', category: 'note' },
  { token: '??', category: 'unresolved' },
  { token: '!!', category: 'critical' },
  { token: '~>', category: 'actionable' },
  { token: '<<', category: 'blocked' },
  { token: '>>', category: 'future' },
  { token: '$m', category: 'meeting' },
  { token: '$w', category: 'workshop' },
  { token: '$1', category: 'one-on-one' },
  { token: '$e', category: 'event' },
  { token: '<~', category: 'emotional' },
  // One-char tokens — checked only after every 2-char token above has failed to match.
  { token: '#', category: 'heading' },
  { token: '-', category: 'task' },
  { token: '?', category: 'question' },
  { token: '!', category: 'important' },
  { token: '*', category: 'low-priority' },
  { token: '>', category: 'decision' },
  { token: '<', category: 'waiting' },
  { token: 'x', category: 'done' },
  { token: 'X', category: 'cancelled' },
  { token: '@', category: 'person' },
  { token: '+', category: 'win' },
  { token: '=', category: 'reflection' },
  { token: '~', category: 'idea' },
];

const ALL_CATEGORIES: BujoCategory[] = [...BUJO_TOKENS.map((t) => t.category), 'unrecognized'];

// Parses a single line. Tries BUJO_TOKENS in order (already longest-token-first) and requires
// the token to be followed by either a space or end-of-line — this is what stops a bare word like
// "excellent" from being misread as the `!` important token followed by garbage, since after
// consuming a matched token the next character must be a space (or nothing at all).
export function parseLine(line: string): BujoEntry {
  for (const { token, category } of BUJO_TOKENS) {
    if (line.startsWith(token) && (line.length === token.length || line[token.length] === ' ')) {
      return { raw: line, category, text: line.slice(token.length).trimStart() };
    }
  }
  return { raw: line, category: 'unrecognized', text: line };
}

// Splits `text` on newlines, skips blank/whitespace-only lines, calls parseLine on the rest.
export function parseEntries(text: string): BujoEntry[] {
  return text
    .split('\n')
    .filter((line) => line.trim().length > 0)
    .map((line) => parseLine(line));
}

// Returns a count per category (0 for categories with no entries) — every category is
// initialized up front so callers never have to guard against a missing key.
export function rollupCounts(entries: BujoEntry[]): Record<BujoCategory, number> {
  const counts = Object.fromEntries(ALL_CATEGORIES.map((category) => [category, 0])) as Record<
    BujoCategory,
    number
  >;
  for (const entry of entries) {
    counts[entry.category] += 1;
  }
  return counts;
}

export function filterByCategory(entries: BujoEntry[], categories: BujoCategory[]): BujoEntry[] {
  return entries.filter((entry) => categories.includes(entry.category));
}

// Renders a Markdown document: "# {dateLabel}" (or "# Bullet Journal Entry" if none given), a
// blank line, then one raw line per entry (token + text preserved exactly, unparsed). Empty
// entries renders just the heading plus an italic "no entries" line.
export function toMarkdown(entries: BujoEntry[], dateLabel?: string): string {
  const heading = `# ${dateLabel ?? 'Bullet Journal Entry'}`;

  if (entries.length === 0) {
    return `${heading}\n\n_No entries yet._`;
  }

  const body = entries.map((entry) => `${entry.raw}\n`).join('');
  return `${heading}\n\n${body}`;
}
