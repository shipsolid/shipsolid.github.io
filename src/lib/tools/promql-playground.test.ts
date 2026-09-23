import { describe, expect, it } from 'vitest';
import { lintPromql, tokenizePromql, PROMQL_FUNCTIONS, PROMQL_TEMPLATES } from './promql-playground';

describe('lintPromql', () => {
  it('returns nothing for an empty query', () => {
    expect(lintPromql('')).toEqual([]);
  });

  it('flags unbalanced parentheses as an error', () => {
    const issues = lintPromql('sum(rate(http_requests_total[5m])');
    expect(issues.some((i) => i.severity === 'error' && /Unbalanced parenthesis/.test(i.message))).toBe(true);
  });

  it('warns when rate() has no range selector', () => {
    const issues = lintPromql('rate(http_requests_total)');
    expect(issues.some((i) => i.severity === 'warning' && /range vector/.test(i.message))).toBe(true);
  });

  it('warns on a bare _total counter with no rate()', () => {
    const issues = lintPromql('http_requests_total');
    expect(issues.some((i) => /_total counter/.test(i.message))).toBe(true);
  });

  it('errors when by/without has no aggregation operator', () => {
    const issues = lintPromql('http_requests_total by (job)');
    expect(issues.some((i) => i.severity === 'error' && /aggregation operator/.test(i.message))).toBe(true);
  });

  it('errors when an aggregation has a grouping clause but no expression', () => {
    const issues = lintPromql('sum by (job)');
    expect(issues.some((i) => i.severity === 'error' && /no expression to aggregate/.test(i.message))).toBe(true);
  });

  it('warns on an unknown function name', () => {
    const issues = lintPromql('foo(http_requests_total[5m])');
    expect(issues.some((i) => /Unknown function "foo"/.test(i.message))).toBe(true);
  });

  it('accepts the canonical p99 latency query', () => {
    const issues = lintPromql('histogram_quantile(0.99, sum(rate(http_request_duration_seconds_bucket[5m])) by (le))');
    expect(issues).toEqual([]);
  });
});

describe('tokenizePromql', () => {
  it('classifies functions, metrics, durations, numbers and strings', () => {
    const tokens = tokenizePromql('sum(rate(http_requests_total{status="500"}[5m]))');
    const typeOf = (text: string) => tokens.find((t) => t.text === text)?.type;
    expect(typeOf('sum')).toBe('function');
    expect(typeOf('rate')).toBe('function');
    expect(typeOf('http_requests_total')).toBe('metric');
    expect(typeOf('"500"')).toBe('string');
    expect(typeOf('5m')).toBe('duration');
  });

  it('round-trips the original text', () => {
    const q = 'topk(5, sum by (pod) (container_memory_working_set_bytes))';
    expect(tokenizePromql(q).map((t) => t.text).join('')).toBe(q);
  });
});

describe('reference data', () => {
  it('every function doc has the required fields', () => {
    for (const fn of PROMQL_FUNCTIONS) {
      expect(fn.name).not.toBe('');
      expect(fn.signature).not.toBe('');
      expect(fn.summary).not.toBe('');
      expect(fn.category).not.toBe('');
    }
  });

  it('every template has a non-empty query and a unique id', () => {
    const ids = PROMQL_TEMPLATES.map((t) => t.id);
    expect(new Set(ids).size).toBe(ids.length);
    for (const t of PROMQL_TEMPLATES) expect(t.query.trim()).not.toBe('');
  });
});
