import { describe, expect, it } from 'vitest';
import { explainDeployment } from './deployment';

function deploymentFixture() {
  return {
    apiVersion: 'apps/v1',
    kind: 'Deployment',
    metadata: { name: 'web', namespace: 'default' },
    spec: {
      replicas: 3,
      selector: { matchLabels: { app: 'web' } },
      strategy: { type: 'RollingUpdate' },
      template: {
        metadata: { labels: { app: 'web' } },
        spec: { containers: [{ name: 'web', image: 'web:1.0.0' }] },
      },
    },
  };
}

describe('explainDeployment', () => {
  it('explains the core Deployment-specific fields plus the pod template', () => {
    const fields = explainDeployment(deploymentFixture());
    const paths = fields.map((f) => f.path);
    expect(paths).toContain('spec.replicas');
    expect(paths).toContain('spec.selector.matchLabels');
    expect(paths).toContain('spec.strategy.type');
    expect(paths).toContain('spec.template.spec.containers[0].image');
  });

  it('describes Recreate strategy as causing downtime', () => {
    const doc = deploymentFixture();
    doc.spec.strategy.type = 'Recreate';
    const fields = explainDeployment(doc);
    const strategy = fields.find((f) => f.path === 'spec.strategy.type');
    expect(strategy?.explanation).toMatch(/downtime/i);
  });
});
