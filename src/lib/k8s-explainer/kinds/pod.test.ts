import { describe, expect, it } from 'vitest';
import { explainPod } from './pod';

describe('explainPod', () => {
  it('explains a bare Pod: envelope fields plus pod spec fields', () => {
    const fields = explainPod({
      apiVersion: 'v1',
      kind: 'Pod',
      metadata: { name: 'debug', namespace: 'default' },
      spec: {
        containers: [{ name: 'shell', image: 'busybox:1.36' }],
        restartPolicy: 'Never',
      },
    });
    const paths = fields.map((f) => f.path);
    expect(paths).toEqual(
      expect.arrayContaining([
        'apiVersion',
        'kind',
        'metadata.name',
        'metadata.namespace',
        'spec.containers[0].image',
        'spec.restartPolicy',
      ])
    );
  });
});
