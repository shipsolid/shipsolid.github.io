import { describe, expect, it } from 'vitest';
import { formatJson, jsonToYaml, minifyJson, yamlToJson } from './json-yaml';

describe('jsonToYaml', () => {
  it('converts a JSON object to YAML', () => {
    const result = jsonToYaml('{"name": "Amit", "role": "SRE", "tags": ["obs", "sre"]}');
    expect(result).toBe('name: Amit\nrole: SRE\ntags:\n  - obs\n  - sre\n');
  });

  it('throws a descriptive error for invalid JSON', () => {
    expect(() => jsonToYaml('{not valid json')).toThrow(/Invalid JSON input/);
  });
});

describe('yamlToJson', () => {
  it('converts YAML to pretty-printed JSON with the default indent', () => {
    const result = yamlToJson('name: Amit\nrole: SRE\n');
    expect(result).toBe(JSON.stringify({ name: 'Amit', role: 'SRE' }, null, 2));
  });

  it('respects a custom indent', () => {
    const result = yamlToJson('name: Amit\n', 4);
    expect(result).toBe(JSON.stringify({ name: 'Amit' }, null, 4));
  });

  it('throws a descriptive error for invalid YAML', () => {
    expect(() => yamlToJson('key: [unclosed')).toThrow(/Invalid YAML input/);
  });
});

describe('formatJson', () => {
  it('reformats compact JSON with the default 2-space indent', () => {
    const result = formatJson('{"a":1,"b":2}');
    expect(result).toBe('{\n  "a": 1,\n  "b": 2\n}');
  });

  it('respects a custom indent', () => {
    const result = formatJson('{"a":1}', 4);
    expect(result).toBe('{\n    "a": 1\n}');
  });

  it('throws a descriptive error for invalid JSON', () => {
    expect(() => formatJson('{a:1}')).toThrow(/Invalid JSON input/);
  });
});

describe('minifyJson', () => {
  it('strips all whitespace from formatted JSON', () => {
    const result = minifyJson('{\n  "a": 1,\n  "b": [1, 2, 3]\n}');
    expect(result).toBe('{"a":1,"b":[1,2,3]}');
  });

  it('throws a descriptive error for invalid JSON', () => {
    expect(() => minifyJson('not json at all')).toThrow(/Invalid JSON input/);
  });
});
