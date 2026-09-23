import { describe, expect, it } from 'vitest';
import { explainConfigMap } from './configmap';

describe('explainConfigMap', () => {
  it('explains data keys generically without per-key business logic', () => {
    const fields = explainConfigMap({
      apiVersion: 'v1',
      kind: 'ConfigMap',
      metadata: { name: 'app-config' },
      data: { 'app.properties': 'debug=false', 'log-level': 'info' },
    });
    const data = fields.find((f) => f.path === 'data');
    expect(data?.explanation).toMatch(/2 keys/);
    expect(data?.value).toContain('app.properties');
  });

  it('handles a ConfigMap with no data without throwing', () => {
    expect(() =>
      explainConfigMap({ apiVersion: 'v1', kind: 'ConfigMap', metadata: { name: 'empty' } })
    ).not.toThrow();
  });
});
