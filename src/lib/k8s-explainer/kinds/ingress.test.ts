import { describe, expect, it } from 'vitest';
import { explainIngress } from './ingress';

describe('explainIngress', () => {
  it('explains ingressClassName, rules, and tls', () => {
    const fields = explainIngress({
      apiVersion: 'networking.k8s.io/v1',
      kind: 'Ingress',
      metadata: { name: 'web' },
      spec: {
        ingressClassName: 'nginx',
        rules: [
          {
            host: 'example.com',
            http: { paths: [{ path: '/', pathType: 'Prefix', backend: { service: { name: 'web', port: { number: 80 } } } }] },
          },
        ],
        tls: [{ hosts: ['example.com'], secretName: 'web-tls' }],
      },
    });
    const paths = fields.map((f) => f.path);
    expect(paths).toContain('spec.ingressClassName');
    expect(paths).toContain('spec.rules');
    expect(paths).toContain('spec.tls');
  });
});
