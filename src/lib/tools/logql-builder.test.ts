import { describe, expect, it } from 'vitest';
import { buildLogql, validateSpec } from './logql-builder';
import type { LogqlSpec } from './logql-builder';

function spec(overrides: Partial<LogqlSpec> = {}): LogqlSpec {
  return {
    stream: [{ label: 'app', op: '=', value: 'api' }],
    lineFilters: [],
    parser: 'none',
    ...overrides,
  };
}

describe('buildLogql', () => {
  it('builds a stream-only selector', () => {
    expect(buildLogql(spec())).toBe('{app="api"}');
  });

  it('builds multiple matchers, line filters, and a parser', () => {
    const q = buildLogql(
      spec({
        stream: [
          { label: 'namespace', op: '=', value: 'production' },
          { label: 'app', op: '=~', value: 'api|web' },
        ],
        lineFilters: [
          { op: '|=', match: 'error' },
          { op: '!=', match: 'healthcheck' },
        ],
        parser: 'json',
      })
    );
    expect(q).toBe('{namespace="production", app=~"api|web"} |= "error" != "healthcheck" | json');
  });

  it('adds a label filter after the parser', () => {
    const q = buildLogql(
      spec({
        parser: 'json',
        labelFilters: [{ label: 'level', op: '=', value: 'error' }],
      })
    );
    expect(q).toBe('{app="api"} | json | level = "error"');
  });

  it('wraps in count_over_time + sum by for a metric query', () => {
    const q = buildLogql(
      spec({
        parser: 'logfmt',
        metricWrap: { fn: 'sum by', range: '5m', by: ['level'] },
      })
    );
    expect(q).toBe('sum by (level) (count_over_time({app="api"} | logfmt [5m]))');
  });

  it('wraps in rate for a rate query', () => {
    const q = buildLogql(spec({ metricWrap: { fn: 'rate', range: '1m' } }));
    expect(q).toBe('rate({app="api"}[1m])');
  });

  it('emits a pattern parser with its argument', () => {
    const q = buildLogql(spec({ parser: 'pattern', parserArg: '<ip> - <_> "<method> <path>"' }));
    expect(q).toBe('{app="api"} | pattern "<ip> - <_> \\"<method> <path>\\""');
  });
});

describe('validateSpec', () => {
  it('passes a minimal valid spec', () => {
    expect(validateSpec(spec())).toEqual([]);
  });

  it('rejects an empty stream', () => {
    const errors = validateSpec(spec({ stream: [] }));
    expect(errors.some((e) => /at least one stream label matcher/.test(e))).toBe(true);
  });

  it('rejects a regexp parser with no argument', () => {
    const errors = validateSpec(spec({ parser: 'regexp' }));
    expect(errors.some((e) => /regexp parser needs a pattern argument/.test(e))).toBe(true);
  });

  it('rejects a rate wrapper with no range', () => {
    const errors = validateSpec(spec({ metricWrap: { fn: 'rate' } }));
    expect(errors.some((e) => /needs a range/.test(e))).toBe(true);
  });

  it('rejects sum by with no grouping labels', () => {
    const errors = validateSpec(spec({ metricWrap: { fn: 'sum by', range: '5m', by: [] } }));
    expect(errors.some((e) => /needs at least one label to group by/.test(e))).toBe(true);
  });
});
