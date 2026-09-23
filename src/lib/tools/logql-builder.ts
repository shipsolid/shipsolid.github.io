// Pure LogQL assembly — turn a structured spec (stream matchers, line filters, a parser stage,
// optional label filters / line_format / metric wrapper) into a LogQL string, plus a validator.
// No DOM, no localStorage.

export type MatcherOp = '=' | '!=' | '=~' | '!~';
export interface LabelMatcher {
  label: string;
  op: MatcherOp;
  value: string;
}

export type LineFilterOp = '|=' | '!=' | '|~' | '!~';
export interface LineFilter {
  op: LineFilterOp;
  match: string;
}

export type LogqlParser = 'none' | 'json' | 'logfmt' | 'pattern' | 'regexp' | 'unpack';

export interface LabelFilter {
  label: string;
  op: string; // = != =~ !~ > < >= <= ==
  value: string;
}

export type MetricFn = 'none' | 'rate' | 'count_over_time' | 'bytes_rate' | 'bytes_over_time' | 'sum by';

export interface MetricWrap {
  fn: MetricFn;
  range?: string;
  by?: string[];
}

export interface LogqlSpec {
  stream: LabelMatcher[];
  lineFilters: LineFilter[];
  parser: LogqlParser;
  parserArg?: string;
  labelFilters?: LabelFilter[];
  lineFormat?: string;
  metricWrap?: MetricWrap;
}

const QUOTED_LABEL_FILTER_OPS = new Set(['=', '!=', '=~', '!~']);
const RANGE_FNS = new Set<MetricFn>(['rate', 'count_over_time', 'bytes_rate', 'bytes_over_time', 'sum by']);

function quote(value: string): string {
  return `"${value.replace(/\\/g, '\\\\').replace(/"/g, '\\"')}"`;
}

function buildLogExpr(spec: LogqlSpec): string {
  const matchers = spec.stream
    .filter((m) => m.label.trim() !== '')
    .map((m) => `${m.label.trim()}${m.op}${quote(m.value)}`)
    .join(', ');
  let expr = `{${matchers}}`;

  for (const f of spec.lineFilters) {
    if (f.match === '' && (f.op === '|=' || f.op === '!=')) continue;
    expr += ` ${f.op} ${quote(f.match)}`;
  }

  if (spec.parser && spec.parser !== 'none') {
    if (spec.parser === 'pattern' || spec.parser === 'regexp') {
      expr += ` | ${spec.parser} ${quote(spec.parserArg ?? '')}`;
    } else {
      expr += ` | ${spec.parser}`;
    }
  }

  for (const lf of spec.labelFilters ?? []) {
    if (lf.label.trim() === '') continue;
    const value = QUOTED_LABEL_FILTER_OPS.has(lf.op) ? quote(lf.value) : lf.value;
    expr += ` | ${lf.label.trim()} ${lf.op} ${value}`;
  }

  if (spec.lineFormat && spec.lineFormat.trim() !== '') {
    expr += ` | line_format ${quote(spec.lineFormat)}`;
  }

  return expr;
}

export function buildLogql(spec: LogqlSpec): string {
  const logExpr = buildLogExpr(spec);
  const wrap = spec.metricWrap;
  if (!wrap || wrap.fn === 'none') return logExpr;

  // The range selector sits at the end of the log expression; LogQL wants a space
  // before it when the expression has a pipeline, and none for a bare selector.
  const rangeStr = (wrap.range ?? '$__range').trim();
  const hasPipeline = /[|]| /.test(logExpr.replace(/^\{[^}]*\}/, ''));
  const ranged = `${logExpr}${hasPipeline ? ' ' : ''}[${rangeStr}]`;

  switch (wrap.fn) {
    case 'rate':
      return `rate(${ranged})`;
    case 'count_over_time':
      return `count_over_time(${ranged})`;
    case 'bytes_rate':
      return `bytes_rate(${ranged})`;
    case 'bytes_over_time':
      return `bytes_over_time(${ranged})`;
    case 'sum by': {
      const by = (wrap.by ?? []).map((b) => b.trim()).filter(Boolean).join(', ');
      return `sum by (${by}) (count_over_time(${ranged}))`;
    }
    default:
      return logExpr;
  }
}

export function validateSpec(spec: LogqlSpec): string[] {
  const errors: string[] = [];

  const nonEmptyMatchers = spec.stream.filter((m) => m.label.trim() !== '');
  if (nonEmptyMatchers.length === 0) {
    errors.push('LogQL requires at least one stream label matcher.');
  }
  if (spec.stream.some((m) => m.label.trim() === '' && m.value.trim() !== '')) {
    errors.push('A stream matcher has a value but no label.');
  }

  if ((spec.parser === 'pattern' || spec.parser === 'regexp') && !(spec.parserArg ?? '').trim()) {
    errors.push(`The ${spec.parser} parser needs a pattern argument, e.g. "<ip> - <_> \\"<method> <path>\\""`);
  }

  if (spec.metricWrap && RANGE_FNS.has(spec.metricWrap.fn) && !(spec.metricWrap.range ?? '').trim()) {
    errors.push(`The ${spec.metricWrap.fn} metric wrapper needs a range, e.g. 5m.`);
  }
  if (spec.metricWrap?.fn === 'sum by' && (spec.metricWrap.by ?? []).filter((b) => b.trim()).length === 0) {
    errors.push('"sum by" needs at least one label to group by.');
  }

  return errors;
}
