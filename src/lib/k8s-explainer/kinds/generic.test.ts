import { describe, expect, it } from 'vitest';
import { explainGeneric } from './generic';

describe('explainGeneric', () => {
  it('explains only the universal envelope for an unrecognized kind', () => {
    const fields = explainGeneric({
      apiVersion: 'cert-manager.io/v1',
      kind: 'Certificate',
      metadata: { name: 'web-cert', namespace: 'default' },
      spec: { secretName: 'web-tls', dnsNames: ['example.com'] },
    });
    expect(fields.map((f) => f.path)).toEqual(['apiVersion', 'kind', 'metadata.name', 'metadata.namespace']);
  });
});
