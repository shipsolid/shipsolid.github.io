import { describe, expect, it } from 'vitest';
import { explainSecret } from './secret';

describe('explainSecret', () => {
  it('explains type and lists data keys without decoding values', () => {
    const fields = explainSecret({
      apiVersion: 'v1',
      kind: 'Secret',
      metadata: { name: 'db-creds' },
      type: 'Opaque',
      data: { password: 'c3VwZXJzZWNyZXQ=' },
    });
    const data = fields.find((f) => f.path === 'data');
    expect(data?.value).toContain('password');
    expect(data?.value).not.toContain('c3VwZXJzZWNyZXQ=');
    expect(data?.explanation).toMatch(/not decoded/i);
  });

  it('recognizes the kubernetes.io/tls type', () => {
    const fields = explainSecret({
      apiVersion: 'v1',
      kind: 'Secret',
      metadata: { name: 'tls-cert' },
      type: 'kubernetes.io/tls',
      data: { 'tls.crt': 'x', 'tls.key': 'y' },
    });
    const type = fields.find((f) => f.path === 'type');
    expect(type?.explanation).toMatch(/certificate/i);
  });

  it('never renders stringData values either', () => {
    const fields = explainSecret({
      apiVersion: 'v1',
      kind: 'Secret',
      metadata: { name: 'plain' },
      stringData: { token: 'super-secret-value' },
    });
    const stringData = fields.find((f) => f.path === 'stringData');
    expect(stringData?.value).not.toContain('super-secret-value');
  });
});
