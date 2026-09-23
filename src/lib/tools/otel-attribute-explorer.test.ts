import { describe, expect, it } from 'vitest';
import { classifyAttributes, parseAttributeText } from './otel-attribute-explorer';

describe('parseAttributeText', () => {
  it('parses a JSON object', () => {
    const pairs = parseAttributeText('{"service.name":"checkout","deployment.environment":"prod"}');
    expect(pairs).toEqual([
      { key: 'service.name', value: 'checkout' },
      { key: 'deployment.environment', value: 'prod' },
    ]);
  });

  it('parses key=value lines with quotes and trailing commas', () => {
    const pairs = parseAttributeText('service.name = "checkout",\nhttp.route: /api/orders\n');
    expect(pairs).toEqual([
      { key: 'service.name', value: 'checkout' },
      { key: 'http.route', value: '/api/orders' },
    ]);
  });

  it('throws on empty input', () => {
    expect(() => parseAttributeText('   ')).toThrow(/Could not parse attributes/);
  });

  it('throws on unparseable garbage', () => {
    expect(() => parseAttributeText('!!! not attributes !!!')).toThrow(/Could not parse attributes/);
  });
});

describe('classifyAttributes', () => {
  it('classifies the doc example as low-risk resource attributes', () => {
    const result = classifyAttributes([
      { key: 'service.name', value: 'checkout' },
      { key: 'deployment.environment', value: 'prod' },
      { key: 'cloud.region', value: 'centralindia' },
    ]);
    expect(result.every((a) => a.scope === 'resource')).toBe(true);
    expect(result.every((a) => a.highCardinalityRisk === 'low')).toBe(true);
  });

  it('flags an id-shaped key as high risk', () => {
    const [attr] = classifyAttributes([{ key: 'user.id', value: 'u_9182' }]);
    expect(attr.highCardinalityRisk).toBe('high');
    expect(attr.note).toMatch(/keep off metric labels/i);
  });

  it('treats http.route as a span attribute with medium risk', () => {
    const [attr] = classifyAttributes([{ key: 'http.route', value: '/api/orders/:id' }]);
    expect(attr.scope).toBe('span');
    expect(attr.highCardinalityRisk).toBe('medium');
  });

  it('keeps well-known enum attributes low even under the span prefix', () => {
    const result = classifyAttributes([
      { key: 'http.request.method', value: 'GET' },
      { key: 'http.response.status_code', value: '200' },
    ]);
    expect(result.every((a) => a.highCardinalityRisk === 'low')).toBe(true);
  });

  it('flags http.target and url.full as high risk span attributes', () => {
    const result = classifyAttributes([
      { key: 'http.target', value: '/search?q=abc' },
      { key: 'url.full', value: 'https://x/y?z=1' },
    ]);
    expect(result.map((a) => a.highCardinalityRisk)).toEqual(['high', 'high']);
    expect(result.every((a) => a.scope === 'span')).toBe(true);
  });

  it('classifies k8s.pod.name as a resource attribute with medium risk', () => {
    const [attr] = classifyAttributes([{ key: 'k8s.pod.name', value: 'checkout-abc123' }]);
    expect(attr.scope).toBe('resource');
    expect(attr.highCardinalityRisk).toBe('medium');
  });

  it('marks an unknown prefix as unknown scope', () => {
    const [attr] = classifyAttributes([{ key: 'custom.tenant', value: 'acme' }]);
    expect(attr.scope).toBe('unknown');
  });
});
