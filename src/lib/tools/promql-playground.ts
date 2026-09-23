// Pure PromQL helpers for an educational, no-backend playground: best-effort linting (no real
// parser), a curated function reference, query templates, and a lightweight tokenizer for syntax
// highlighting. No DOM, no localStorage.

export interface PromqlLintIssue {
  severity: 'error' | 'warning';
  message: string;
}

export interface PromqlFunctionDoc {
  name: string;
  signature: string;
  summary: string;
  category: string;
}

export interface PromqlTemplate {
  id: string;
  title: string;
  query: string;
  note: string;
}

export type PromqlTokenType =
  | 'string'
  | 'duration'
  | 'number'
  | 'function'
  | 'keyword'
  | 'metric'
  | 'operator'
  | 'brace'
  | 'text';

export interface PromqlToken {
  type: PromqlTokenType;
  text: string;
}

export const AGGREGATION_OPS = [
  'sum',
  'avg',
  'min',
  'max',
  'count',
  'count_values',
  'group',
  'stddev',
  'stdvar',
  'topk',
  'bottomk',
  'quantile',
];

export const PROMQL_FUNCTIONS: PromqlFunctionDoc[] = [
  { name: 'rate', signature: 'rate(v range-vector)', summary: 'Per-second average rate of increase of a counter over the range.', category: 'counter' },
  { name: 'irate', signature: 'irate(v range-vector)', summary: 'Instant per-second rate using the last two samples. Volatile — use for graphs, not alerts.', category: 'counter' },
  { name: 'increase', signature: 'increase(v range-vector)', summary: 'Total increase of a counter over the range (rate × seconds).', category: 'counter' },
  { name: 'delta', signature: 'delta(v range-vector)', summary: 'Difference between first and last value of a gauge over the range.', category: 'gauge' },
  { name: 'idelta', signature: 'idelta(v range-vector)', summary: 'Difference between the last two samples of a gauge.', category: 'gauge' },
  { name: 'deriv', signature: 'deriv(v range-vector)', summary: 'Per-second derivative of a gauge via simple linear regression.', category: 'gauge' },
  { name: 'predict_linear', signature: 'predict_linear(v range-vector, t scalar)', summary: 'Extrapolate a gauge t seconds into the future via linear regression.', category: 'gauge' },
  { name: 'histogram_quantile', signature: 'histogram_quantile(φ scalar, b instant-vector)', summary: 'φ-quantile from classic histogram buckets. Wrap buckets in rate() first.', category: 'histogram' },
  { name: 'sum_over_time', signature: 'sum_over_time(v range-vector)', summary: 'Sum of all values in the range.', category: 'over_time' },
  { name: 'avg_over_time', signature: 'avg_over_time(v range-vector)', summary: 'Average of all values in the range.', category: 'over_time' },
  { name: 'min_over_time', signature: 'min_over_time(v range-vector)', summary: 'Minimum value in the range.', category: 'over_time' },
  { name: 'max_over_time', signature: 'max_over_time(v range-vector)', summary: 'Maximum value in the range.', category: 'over_time' },
  { name: 'count_over_time', signature: 'count_over_time(v range-vector)', summary: 'Number of samples in the range.', category: 'over_time' },
  { name: 'quantile_over_time', signature: 'quantile_over_time(φ, v range-vector)', summary: 'φ-quantile of the samples in the range.', category: 'over_time' },
  { name: 'stddev_over_time', signature: 'stddev_over_time(v range-vector)', summary: 'Population standard deviation over the range.', category: 'over_time' },
  { name: 'clamp_max', signature: 'clamp_max(v instant-vector, max scalar)', summary: 'Clamp all sample values to at most max.', category: 'math' },
  { name: 'clamp_min', signature: 'clamp_min(v instant-vector, min scalar)', summary: 'Clamp all sample values to at least min.', category: 'math' },
  { name: 'abs', signature: 'abs(v instant-vector)', summary: 'Absolute value of each sample.', category: 'math' },
  { name: 'ceil', signature: 'ceil(v instant-vector)', summary: 'Round each sample up to the nearest integer.', category: 'math' },
  { name: 'floor', signature: 'floor(v instant-vector)', summary: 'Round each sample down to the nearest integer.', category: 'math' },
  { name: 'round', signature: 'round(v instant-vector, to_nearest=1 scalar)', summary: 'Round each sample to the nearest multiple of to_nearest.', category: 'math' },
  { name: 'ln', signature: 'ln(v instant-vector)', summary: 'Natural logarithm of each sample.', category: 'math' },
  { name: 'exp', signature: 'exp(v instant-vector)', summary: 'e raised to each sample value.', category: 'math' },
  { name: 'label_replace', signature: 'label_replace(v, dst, repl, src, regex)', summary: 'Set label dst on each series from a regex capture of label src.', category: 'label' },
  { name: 'label_join', signature: 'label_join(v, dst, sep, src1, src2, …)', summary: 'Join several source label values into label dst with a separator.', category: 'label' },
  { name: 'vector', signature: 'vector(s scalar)', summary: 'Turn a scalar into a single-sample instant vector (useful for OR fallbacks).', category: 'misc' },
  { name: 'scalar', signature: 'scalar(v instant-vector)', summary: 'Return the single sample value of v as a scalar (NaN if not exactly one).', category: 'misc' },
  { name: 'time', signature: 'time()', summary: 'Current evaluation timestamp as a scalar (Unix seconds).', category: 'misc' },
  { name: 'timestamp', signature: 'timestamp(v instant-vector)', summary: 'Timestamp of each sample as Unix seconds.', category: 'misc' },
  { name: 'absent', signature: 'absent(v instant-vector)', summary: '1-element vector when v has no elements — for "no data" alerts.', category: 'misc' },
  { name: 'absent_over_time', signature: 'absent_over_time(v range-vector)', summary: 'Like absent(), but true only if v had no samples across the whole range.', category: 'misc' },
  { name: 'changes', signature: 'changes(v range-vector)', summary: 'Number of times each series value changed within the range.', category: 'over_time' },
  { name: 'resets', signature: 'resets(v range-vector)', summary: 'Number of counter resets within the range.', category: 'counter' },
];

export const PROMQL_TEMPLATES: PromqlTemplate[] = [
  {
    id: 'request-rate',
    title: 'Request rate by route',
    query: 'sum by (route) (rate(http_requests_total[5m]))',
    note: 'Per-second request rate, grouped by the route label.',
  },
  {
    id: 'error-ratio',
    title: 'Error ratio (SLI)',
    query:
      'sum(rate(http_requests_total{status=~"5.."}[5m]))\n  /\nsum(rate(http_requests_total[5m]))',
    note: 'Fraction of requests failing — the availability SLI. Multiply by 100 for a percentage.',
  },
  {
    id: 'p99-latency',
    title: 'p99 latency',
    query: 'histogram_quantile(0.99, sum by (le) (rate(http_request_duration_seconds_bucket[5m])))',
    note: 'The canonical classic-histogram quantile pattern — always rate() the buckets first.',
  },
  {
    id: 'saturation',
    title: 'CPU saturation',
    query: '1 - avg by (instance) (rate(node_cpu_seconds_total{mode="idle"}[5m]))',
    note: 'Fraction of CPU time not spent idle, per host.',
  },
  {
    id: 'burn-rate',
    title: 'Multi-window burn rate',
    query:
      '(\n  sum(rate(http_requests_total{status=~"5.."}[1h]))\n  /\n  sum(rate(http_requests_total[1h]))\n) / (1 - 0.999)',
    note: 'How fast the error budget for a 99.9% SLO is burning over the last hour (1 = on-pace).',
  },
  {
    id: 'top-memory',
    title: 'Top 5 memory consumers',
    query: 'topk(5, sum by (pod) (container_memory_working_set_bytes))',
    note: 'The five pods using the most working-set memory right now.',
  },
];

const FUNCTION_NAMES = new Set([
  ...PROMQL_FUNCTIONS.map((f) => f.name).filter((n) => /^[a-z_]+$/.test(n)),
  'rate',
  'increase',
  'irate',
  'delta',
  'idelta',
  'deriv',
  'predict_linear',
  'histogram_quantile',
  'histogram_count',
  'histogram_sum',
  'histogram_fraction',
  'sgn',
  'sqrt',
  'sort',
  'sort_desc',
  'day_of_week',
  'day_of_month',
  'days_in_month',
  'hour',
  'minute',
  'month',
  'year',
  ...AGGREGATION_OPS,
]);

const KEYWORDS = new Set(['by', 'without', 'on', 'ignoring', 'group_left', 'group_right', 'offset', 'bool', 'and', 'or', 'unless']);

const AGG_ALT = AGGREGATION_OPS.join('|');
const RANGE_SELECTOR_RE = /\[\s*\d+(?:ms|s|m|h|d|w|y)\s*\]/;
const RANGE_FN_RE = /\b(rate|irate|increase|delta|idelta|deriv|resets|changes|[a-z_]+_over_time)\s*\(/;

export function lintPromql(query: string): PromqlLintIssue[] {
  const issues: PromqlLintIssue[] = [];
  const q = query.trim();
  if (q === '') return issues;

  // Balanced brackets.
  const pairs: [string, string, string][] = [
    ['(', ')', 'parenthesis'],
    ['{', '}', 'brace'],
    ['[', ']', 'bracket'],
  ];
  for (const [open, close, label] of pairs) {
    const opens = (q.match(new RegExp('\\' + open, 'g')) ?? []).length;
    const closes = (q.match(new RegExp('\\' + close, 'g')) ?? []).length;
    if (opens !== closes) {
      issues.push({
        severity: 'error',
        message: `Unbalanced ${label}: ${opens} "${open}" vs ${closes} "${close}".`,
      });
    }
  }

  // Balanced double quotes.
  if (((q.match(/"/g) ?? []).length) % 2 !== 0) {
    issues.push({ severity: 'error', message: 'Unbalanced double quotes.' });
  }

  // Range functions need a range selector.
  if (RANGE_FN_RE.test(q) && !RANGE_SELECTOR_RE.test(q)) {
    issues.push({
      severity: 'warning',
      message: 'rate() / increase() / *_over_time() need a range vector, e.g. metric[5m].',
    });
  }

  // Bare _total counter without a rate function.
  if (/\b\w+_total\b/.test(q) && !RANGE_FN_RE.test(q)) {
    issues.push({
      severity: 'warning',
      message: 'A _total counter is usually wrapped in rate() or increase() — a raw counter value is rarely useful.',
    });
  }

  // by / without without an aggregation operator.
  if (/\b(by|without)\s*\(/.test(q) && !new RegExp(`\\b(${AGG_ALT})\\b`).test(q)) {
    issues.push({
      severity: 'error',
      message: 'by / without must follow an aggregation operator like sum(), avg(), or count().',
    });
  }

  // Aggregation with a grouping clause but no expression to aggregate.
  if (new RegExp(`\\b(${AGG_ALT})\\s+(by|without)\\s*\\([^)]*\\)\\s*$`).test(q)) {
    issues.push({
      severity: 'error',
      message: 'The aggregation has a by / without clause but no expression to aggregate.',
    });
  }

  // Unknown function names.
  const callRe = /([a-zA-Z_][a-zA-Z0-9_]*)\s*\(/g;
  let call: RegExpExecArray | null;
  const seen = new Set<string>();
  while ((call = callRe.exec(q)) !== null) {
    const name = call[1];
    if (seen.has(name) || FUNCTION_NAMES.has(name) || KEYWORDS.has(name)) continue;
    seen.add(name);
    issues.push({ severity: 'warning', message: `Unknown function "${name}" — check the spelling against the reference.` });
  }

  return issues;
}

const TOKEN_RE =
  /("(?:[^"\\]|\\.)*")|(\b\d+(?:ms|s|m|h|d|w|y)\b)|(\b\d+(?:\.\d+)?\b)|([a-zA-Z_:][a-zA-Z0-9_:]*)|(=~|!~|==|!=|>=|<=|[-+*/%^=<>])|([(){}\[\]])|(\s+)|(.)/g;

export function tokenizePromql(query: string): PromqlToken[] {
  const tokens: PromqlToken[] = [];
  let m: RegExpExecArray | null;
  TOKEN_RE.lastIndex = 0;
  while ((m = TOKEN_RE.exec(query)) !== null) {
    const [, str, dur, numTok, ident, op, brace, ws, other] = m;
    if (str !== undefined) tokens.push({ type: 'string', text: str });
    else if (dur !== undefined) tokens.push({ type: 'duration', text: dur });
    else if (numTok !== undefined) tokens.push({ type: 'number', text: numTok });
    else if (ident !== undefined) {
      const type: PromqlTokenType = FUNCTION_NAMES.has(ident)
        ? 'function'
        : KEYWORDS.has(ident)
          ? 'keyword'
          : 'metric';
      tokens.push({ type, text: ident });
    } else if (op !== undefined) tokens.push({ type: 'operator', text: op });
    else if (brace !== undefined) tokens.push({ type: 'brace', text: brace });
    else if (ws !== undefined) tokens.push({ type: 'text', text: ws });
    else tokens.push({ type: 'text', text: other });
  }
  return tokens;
}
