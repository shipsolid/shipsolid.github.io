import { describe, expect, it } from 'vitest';
import { validateMetricName } from './metric-naming-validator';

function checkById(result: ReturnType<typeof validateMetricName>, id: string) {
  const check = result.checks.find((c) => c.id === id);
  if (!check) throw new Error(`no check with id ${id}`);
  return check;
}

describe('validateMetricName — Prometheus', () => {
  it('passes a well-formed duration histogram name', () => {
    const result = validateMetricName('http_request_duration_seconds');
    expect(result.checks.every((c) => c.pass)).toBe(true);
    expect(result.score).toBe(1);
    expect(result.suggestedType).toBe('histogram');
  });

  it('fails snake_case and base-unit for a camelCase millisecond name', () => {
    const result = validateMetricName('httpRequestDurationMs');
    expect(checkById(result, 'snake-case').pass).toBe(false);
    expect(checkById(result, 'base-unit').pass).toBe(false);
    expect(result.score).toBeLessThan(1);
    expect(result.suggestions.some((s) => /snake_case/i.test(s))).toBe(true);
  });

  it('recognises a counter and requires the _total suffix', () => {
    const good = validateMetricName('http_requests_total');
    expect(good.suggestedType).toBe('counter');
    expect(checkById(good, 'unit-suffix').pass).toBe(true);

    const missing = validateMetricName('http_requests');
    expect(missing.suggestedType).toBe('counter');
    expect(checkById(missing, 'unit-suffix').pass).toBe(false);
    expect(missing.suggestions.some((s) => /_total/.test(s))).toBe(true);
  });

  it('rejects a hand-authored _bucket suffix', () => {
    const result = validateMetricName('http_request_duration_seconds_bucket');
    expect(checkById(result, 'no-reserved-suffix').pass).toBe(false);
  });

  it('rejects dashes and leading digits via the charset check', () => {
    expect(checkById(validateMetricName('5xx-errors'), 'charset').pass).toBe(false);
  });
});

describe('validateMetricName — OpenTelemetry', () => {
  it('passes a dotted lowercase name', () => {
    const result = validateMetricName('http.server.request.duration', 'otel');
    expect(checkById(result, 'dotted-namespace').pass).toBe(true);
    expect(checkById(result, 'no-total-suffix').pass).toBe(true);
  });

  it('flags a _total suffix and a flat name', () => {
    const result = validateMetricName('http_requests_total', 'otel');
    expect(checkById(result, 'no-total-suffix').pass).toBe(false);
    expect(checkById(result, 'dotted-namespace').pass).toBe(false);
    expect(result.suggestions.length).toBeGreaterThan(0);
  });
});

describe('validateMetricName — errors', () => {
  it('throws on an unknown convention', () => {
    // @ts-expect-error deliberately wrong
    expect(() => validateMetricName('x', 'graphite')).toThrow(/Unknown convention/);
  });
});
