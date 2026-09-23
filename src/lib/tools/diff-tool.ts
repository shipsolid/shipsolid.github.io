// Pure line diff — classic LCS dynamic-programming over line arrays, with optional
// whitespace/case-insensitive comparison. No DOM, no localStorage.

export type DiffOp = 'equal' | 'insert' | 'delete';

export interface DiffLine {
  op: DiffOp;
  text: string;
  leftNumber: number | null;
  rightNumber: number | null;
}

export interface DiffResult {
  lines: DiffLine[];
  added: number;
  removed: number;
  unchanged: number;
}

export interface DiffOptions {
  ignoreWhitespace?: boolean;
  ignoreCase?: boolean;
}

// Bounds the O(n·m) DP table — a deliberate cap, not a soft limit.
export const MAX_LINES = 2000;

function splitLines(text: string): string[] {
  return text === '' ? [] : text.split('\n');
}

function normalizer(options: DiffOptions): (line: string) => string {
  return (line: string) => {
    let out = line;
    if (options.ignoreWhitespace) out = out.replace(/\s+/g, ' ').trim();
    if (options.ignoreCase) out = out.toLowerCase();
    return out;
  };
}

export function diffLines(left: string, right: string, options: DiffOptions = {}): DiffResult {
  const leftLines = splitLines(left);
  const rightLines = splitLines(right);

  if (leftLines.length > MAX_LINES || rightLines.length > MAX_LINES) {
    throw new Error(`Input too large for line diff (max ${MAX_LINES} lines per side)`);
  }

  const norm = normalizer(options);
  const a = leftLines.map(norm);
  const b = rightLines.map(norm);
  const n = a.length;
  const m = b.length;

  // dp[i][j] = LCS length of a[i:] and b[j:], stored flat, (n+1) x (m+1).
  const width = m + 1;
  const dp = new Int32Array((n + 1) * (m + 1));
  for (let i = n - 1; i >= 0; i--) {
    for (let j = m - 1; j >= 0; j--) {
      const idx = i * width + j;
      if (a[i] === b[j]) {
        dp[idx] = dp[(i + 1) * width + (j + 1)] + 1;
      } else {
        dp[idx] = Math.max(dp[(i + 1) * width + j], dp[i * width + (j + 1)]);
      }
    }
  }

  const lines: DiffLine[] = [];
  let added = 0;
  let removed = 0;
  let unchanged = 0;
  let i = 0;
  let j = 0;
  let leftNo = 1;
  let rightNo = 1;

  while (i < n && j < m) {
    if (a[i] === b[j]) {
      lines.push({ op: 'equal', text: leftLines[i], leftNumber: leftNo++, rightNumber: rightNo++ });
      unchanged++;
      i++;
      j++;
    } else if (dp[(i + 1) * width + j] >= dp[i * width + (j + 1)]) {
      lines.push({ op: 'delete', text: leftLines[i], leftNumber: leftNo++, rightNumber: null });
      removed++;
      i++;
    } else {
      lines.push({ op: 'insert', text: rightLines[j], leftNumber: null, rightNumber: rightNo++ });
      added++;
      j++;
    }
  }
  while (i < n) {
    lines.push({ op: 'delete', text: leftLines[i], leftNumber: leftNo++, rightNumber: null });
    removed++;
    i++;
  }
  while (j < m) {
    lines.push({ op: 'insert', text: rightLines[j], leftNumber: null, rightNumber: rightNo++ });
    added++;
    j++;
  }

  return { lines, added, removed, unchanged };
}

// Renders a diff as a fenced unified-diff-ish block (no hunk headers — a flat +/-/space stream).
export function toUnifiedText(result: DiffResult): string {
  return result.lines
    .map((line) => {
      const prefix = line.op === 'insert' ? '+' : line.op === 'delete' ? '-' : ' ';
      return `${prefix}${line.text}`;
    })
    .join('\n');
}
