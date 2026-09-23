import { describe, expect, it } from 'vitest';
import { explainEnvelope, extractName, extractNamespace } from './envelope';

function baseDoc(overrides: Record<string, any> = {}) {
  return {
    apiVersion: 'apps/v1',
    kind: 'Deployment',
    metadata: {
      name: 'web',
      namespace: 'default',
      labels: { app: 'web' },
      annotations: { 'cert-manager.io/issuer': 'letsencrypt' },
    },
    ...overrides,
  };
}

describe('explainEnvelope', () => {
  it('explains apiVersion, kind, and all metadata fields when present', () => {
    const fields = explainEnvelope(baseDoc());
    expect(fields.map((f) => f.path)).toEqual([
      'apiVersion',
      'kind',
      'metadata.name',
      'metadata.namespace',
      'metadata.labels',
      'metadata.annotations',
    ]);
  });

  it('omits namespace/labels/annotations when absent, without throwing', () => {
    const fields = explainEnvelope({ apiVersion: 'v1', kind: 'Pod', metadata: { name: 'solo' } });
    expect(fields.map((f) => f.path)).toEqual(['apiVersion', 'kind', 'metadata.name']);
  });

  it('handles a completely empty document without throwing', () => {
    expect(() => explainEnvelope({})).not.toThrow();
    expect(explainEnvelope({})).toEqual([]);
  });
});

describe('extractName / extractNamespace', () => {
  it('reads name and namespace from metadata', () => {
    const doc = baseDoc();
    expect(extractName(doc)).toBe('web');
    expect(extractNamespace(doc)).toBe('default');
  });

  it('returns null when metadata or the field is missing', () => {
    expect(extractName({})).toBeNull();
    expect(extractNamespace({ metadata: { name: 'x' } })).toBeNull();
  });
});
