import { describe, expect, it } from 'vitest';
import { explainDaemonSet } from './daemonset';

describe('explainDaemonSet', () => {
  it('explains the pod template but never emits a replicas field', () => {
    const fields = explainDaemonSet({
      apiVersion: 'apps/v1',
      kind: 'DaemonSet',
      metadata: { name: 'node-agent' },
      spec: {
        selector: { matchLabels: { app: 'node-agent' } },
        template: { spec: { containers: [{ name: 'agent', image: 'agent:1.0' }] } },
      },
    });
    const paths = fields.map((f) => f.path);
    expect(paths).toContain('spec.selector.matchLabels');
    expect(paths).toContain('spec.template.spec.containers[0].image');
    expect(paths).not.toContain('spec.replicas');
  });
});
