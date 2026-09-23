import { describe, expect, it } from 'vitest';
import { explainCronJob } from './cronjob';

describe('explainCronJob', () => {
  it('explains schedule/concurrencyPolicy and resolves the pod spec through the extra jobTemplate nesting', () => {
    const fields = explainCronJob({
      apiVersion: 'batch/v1',
      kind: 'CronJob',
      metadata: { name: 'nightly-backup' },
      spec: {
        schedule: '0 2 * * *',
        concurrencyPolicy: 'Forbid',
        jobTemplate: {
          spec: {
            backoffLimit: 2,
            template: { spec: { containers: [{ name: 'backup', image: 'backup:1.0' }] } },
          },
        },
      },
    });
    const paths = fields.map((f) => f.path);
    expect(paths).toContain('spec.schedule');
    expect(paths).toContain('spec.concurrencyPolicy');
    expect(paths).toContain('spec.jobTemplate.spec.backoffLimit');
    expect(paths).toContain('spec.jobTemplate.spec.template.spec.containers[0].image');
  });
});
