import { describe, expect, it } from 'vitest';
import { explainService } from './service';

describe('explainService', () => {
  it('explains type, selector, and ports for a ClusterIP Service', () => {
    const fields = explainService({
      apiVersion: 'v1',
      kind: 'Service',
      metadata: { name: 'web' },
      spec: { type: 'ClusterIP', selector: { app: 'web' }, ports: [{ port: 80, targetPort: 8080 }] },
    });
    const paths = fields.map((f) => f.path);
    expect(paths).toContain('spec.type');
    expect(paths).toContain('spec.selector');
    expect(paths).toContain('spec.ports');
  });

  it('explains a headless Service via clusterIP: None', () => {
    const fields = explainService({
      apiVersion: 'v1',
      kind: 'Service',
      metadata: { name: 'db-headless' },
      spec: { clusterIP: 'None', selector: { app: 'db' } },
    });
    const clusterIP = fields.find((f) => f.path === 'spec.clusterIP');
    expect(clusterIP?.explanation).toMatch(/headless/i);
  });

  it('flags a missing selector on a non-ExternalName Service', () => {
    const fields = explainService({
      apiVersion: 'v1',
      kind: 'Service',
      metadata: { name: 'manual-endpoints' },
      spec: { type: 'ClusterIP' },
    });
    const selector = fields.find((f) => f.path === 'spec.selector');
    expect(selector?.explanation).toMatch(/no automatic endpoints/i);
  });
});
