import { describe, expect, it } from 'vitest';
import { explainJob } from './job';

describe('explainJob', () => {
  it('explains completions, parallelism, backoffLimit, and the pod template', () => {
    const fields = explainJob({
      apiVersion: 'batch/v1',
      kind: 'Job',
      metadata: { name: 'migrate' },
      spec: {
        completions: 1,
        parallelism: 1,
        backoffLimit: 3,
        template: {
          spec: { containers: [{ name: 'migrate', image: 'migrate:1.0' }], restartPolicy: 'Never' },
        },
      },
    });
    const paths = fields.map((f) => f.path);
    expect(paths).toContain('spec.completions');
    expect(paths).toContain('spec.parallelism');
    expect(paths).toContain('spec.backoffLimit');
    expect(paths).toContain('spec.template.spec.containers[0].image');
  });
});
