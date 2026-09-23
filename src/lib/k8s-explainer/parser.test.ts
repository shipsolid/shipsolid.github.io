import { describe, expect, it } from 'vitest';
import { parseMultiDocYaml } from './parser';

describe('parseMultiDocYaml', () => {
  it('happy path: parses 3 documents with correct docIndex', () => {
    const text = ['kind: A', '---', 'kind: B', '---', 'kind: C'].join('\n');
    const { docs, errors } = parseMultiDocYaml(text);
    expect(errors).toEqual([]);
    expect(docs.map((d) => d.docIndex)).toEqual([0, 1, 2]);
    expect(docs.map((d) => (d.raw as any).kind)).toEqual(['A', 'B', 'C']);
  });

  it('malformed YAML in the middle document is isolated: does not block its siblings', () => {
    const text = ['kind: A', '---', 'kind: B\nname: [1, 2,', '---', 'kind: C'].join('\n');
    const { docs, errors } = parseMultiDocYaml(text);
    expect(docs.map((d) => d.docIndex)).toEqual([0, 2]);
    expect(errors).toHaveLength(1);
    expect(errors[0].docIndex).toBe(1);
  });

  it('does not mistake a "---" embedded inside a block scalar for a document boundary', () => {
    const text = [
      'kind: ConfigMap',
      'data:',
      '  nginx.conf: |',
      '    server {',
      '    ---',
      '    listen 80;',
      '    }',
      '---',
      'kind: Service',
    ].join('\n');
    const { docs, errors } = parseMultiDocYaml(text);
    expect(errors).toEqual([]);
    expect(docs).toHaveLength(2);
    expect((docs[0].raw as any).kind).toBe('ConfigMap');
    expect((docs[0].raw as any).data['nginx.conf']).toContain('---');
    expect((docs[1].raw as any).kind).toBe('Service');
  });

  it('skips empty documents (leading/trailing "---") without producing an error', () => {
    const text = ['---', '', 'kind: A', '---'].join('\n');
    const { docs, errors } = parseMultiDocYaml(text);
    expect(errors).toEqual([]);
    expect(docs).toHaveLength(1);
    expect((docs[0].raw as any).kind).toBe('A');
  });
});
