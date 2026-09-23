import { describe, expect, it } from 'vitest';
import { explainPodSpec } from './pod-spec';

function containerFixture(overrides: Record<string, any> = {}) {
  return {
    name: 'app',
    image: 'myrepo/app:1.2.3',
    ports: [{ containerPort: 8080 }],
    env: [{ name: 'LOG_LEVEL', value: 'info' }],
    resources: {
      requests: { cpu: '100m', memory: '128Mi' },
      limits: { cpu: '500m', memory: '512Mi' },
    },
    readinessProbe: { httpGet: { path: '/healthz', port: 8080 } },
    livenessProbe: { tcpSocket: { port: 8080 } },
    volumeMounts: [{ name: 'data', mountPath: '/data' }],
    ...overrides,
  };
}

describe('explainPodSpec', () => {
  it('explains a single fully-specified container', () => {
    const fields = explainPodSpec('spec', { containers: [containerFixture()] });
    const paths = fields.map((f) => f.path);
    expect(paths).toContain('spec.containers[0].image');
    expect(paths).toContain('spec.containers[0].ports');
    expect(paths).toContain('spec.containers[0].env');
    expect(paths).toContain('spec.containers[0].resources.requests');
    expect(paths).toContain('spec.containers[0].resources.limits');
    expect(paths).toContain('spec.containers[0].readinessProbe');
    expect(paths).toContain('spec.containers[0].livenessProbe');
    expect(paths).toContain('spec.containers[0].volumeMounts');
  });

  it('explains probe mechanisms in plain English', () => {
    const fields = explainPodSpec('spec', { containers: [containerFixture()] });
    const readiness = fields.find((f) => f.path === 'spec.containers[0].readinessProbe');
    const liveness = fields.find((f) => f.path === 'spec.containers[0].livenessProbe');
    expect(readiness?.explanation).toContain('HTTP GET');
    expect(readiness?.explanation).toContain('/healthz');
    expect(liveness?.explanation).toContain('TCP connection');
  });

  it('handles multiple containers with independent indices', () => {
    const fields = explainPodSpec('spec', {
      containers: [containerFixture({ name: 'a', image: 'a:1' }), containerFixture({ name: 'b', image: 'b:1' })],
    });
    const paths = fields.map((f) => f.path);
    expect(paths).toContain('spec.containers[0].image');
    expect(paths).toContain('spec.containers[1].image');
  });

  it('does not crash on a minimal container with no optional fields', () => {
    const fields = explainPodSpec('spec', { containers: [{ name: 'bare', image: 'bare:1' }] });
    expect(fields.map((f) => f.path)).toEqual(['spec.containers[0].image']);
  });

  it('explains pod-level fields: volumes, restartPolicy, serviceAccountName', () => {
    const fields = explainPodSpec('spec', {
      containers: [containerFixture()],
      volumes: [{ name: 'data', emptyDir: {} }],
      restartPolicy: 'Always',
      serviceAccountName: 'web-sa',
    });
    const paths = fields.map((f) => f.path);
    expect(paths).toContain('spec.volumes');
    expect(paths).toContain('spec.restartPolicy');
    expect(paths).toContain('spec.serviceAccountName');
  });

  it('explains initContainers separately from containers', () => {
    const fields = explainPodSpec('spec', {
      initContainers: [{ name: 'init', image: 'init:1' }],
      containers: [{ name: 'app', image: 'app:1' }],
    });
    const paths = fields.map((f) => f.path);
    expect(paths).toContain('spec.initContainers[0].image');
    expect(paths).toContain('spec.containers[0].image');
  });
});
