import { describe, expect, it } from 'vitest';
import { explainManifest } from './explain';

describe('explainManifest', () => {
  it('happy path: explains a single known-kind resource', () => {
    const result = explainManifest(
      ['apiVersion: v1', 'kind: Service', 'metadata:', '  name: web', 'spec:', '  type: ClusterIP', '  selector:', '    app: web'].join(
        '\n'
      )
    );
    expect(result.errors).toEqual([]);
    expect(result.resources).toHaveLength(1);
    expect(result.resources[0].kind).toBe('Service');
    expect(result.resources[0].isGenericFallback).toBe(false);
    expect(result.resources[0].name).toBe('web');
  });

  it('generic-fallback path: unknown kind still explains the envelope', () => {
    const result = explainManifest(
      ['apiVersion: cert-manager.io/v1', 'kind: Certificate', 'metadata:', '  name: web-cert'].join('\n')
    );
    expect(result.resources).toHaveLength(1);
    expect(result.resources[0].isGenericFallback).toBe(true);
    expect(result.resources[0].fields.map((f) => f.path)).toEqual(['apiVersion', 'kind', 'metadata.name']);
  });

  it('malformed-YAML path: garbage input produces zero resources and one error', () => {
    const result = explainManifest('foo: [1, 2,');
    expect(result.resources).toEqual([]);
    expect(result.errors).toHaveLength(1);
  });

  it('empty input asks the user to paste a manifest instead of showing nothing', () => {
    const result = explainManifest('   \n  ');
    expect(result.resources).toEqual([]);
    expect(result.errors).toHaveLength(1);
    expect(result.errors[0].message).toMatch(/paste/i);
  });

  it('missing-kind path: a valid mapping without "kind" is an error, not a fabricated resource', () => {
    const result = explainManifest(['apiVersion: v1', 'metadata:', '  name: x'].join('\n'));
    expect(result.resources).toEqual([]);
    expect(result.errors).toHaveLength(1);
    expect(result.errors[0].message).toMatch(/missing a "kind"/);
  });

  it('multi-document path: a bad document in the middle does not block its siblings', () => {
    const text = [
      'apiVersion: v1',
      'kind: ConfigMap',
      'metadata:',
      '  name: cm',
      '---',
      'kind: Bad',
      'name: [1, 2,',
      '---',
      'apiVersion: v1',
      'kind: Service',
      'metadata:',
      '  name: svc',
    ].join('\n');
    const result = explainManifest(text);
    expect(result.resources).toHaveLength(2);
    expect(result.resources.map((r) => r.docIndex)).toEqual([0, 2]);
    expect(result.resources.map((r) => r.kind)).toEqual(['ConfigMap', 'Service']);
    expect(result.errors).toHaveLength(1);
    expect(result.errors[0].docIndex).toBe(1);
  });
});
