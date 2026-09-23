import { describe, expect, it } from 'vitest';
import { explainStatefulSet } from './statefulset';

describe('explainStatefulSet', () => {
  it('explains serviceName, replicas, and volumeClaimTemplates plus the pod template', () => {
    const fields = explainStatefulSet({
      apiVersion: 'apps/v1',
      kind: 'StatefulSet',
      metadata: { name: 'db', namespace: 'data' },
      spec: {
        serviceName: 'db-headless',
        replicas: 3,
        selector: { matchLabels: { app: 'db' } },
        volumeClaimTemplates: [
          { metadata: { name: 'data' }, spec: { resources: { requests: { storage: '10Gi' } } } },
        ],
        template: { spec: { containers: [{ name: 'db', image: 'postgres:16' }] } },
      },
    });
    const paths = fields.map((f) => f.path);
    expect(paths).toContain('spec.serviceName');
    expect(paths).toContain('spec.replicas');
    expect(paths).toContain('spec.volumeClaimTemplates');
    expect(paths).toContain('spec.template.spec.containers[0].image');
  });
});
