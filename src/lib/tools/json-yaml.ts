// Pure JSON <-> YAML conversion + formatting helpers. No DOM, no localStorage; the caller
// (json-yaml.astro) owns reading the textarea/select and persisting state, same separation as
// ../sre-calculator.ts. All functions throw descriptive Errors on invalid input rather than
// returning a sentinel — the page's render function is expected to catch and display them.
import * as yaml from 'js-yaml';

export function jsonToYaml(json: string): string {
  let parsed: unknown;
  try {
    parsed = JSON.parse(json);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    throw new Error(`Invalid JSON input: ${message}`);
  }

  try {
    return yaml.dump(parsed);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    throw new Error(`Failed to convert JSON to YAML: ${message}`);
  }
}

export function yamlToJson(yamlText: string, indent = 2): string {
  let parsed: unknown;
  try {
    parsed = yaml.load(yamlText);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    throw new Error(`Invalid YAML input: ${message}`);
  }

  try {
    return JSON.stringify(parsed, null, indent);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    throw new Error(`Failed to convert YAML to JSON: ${message}`);
  }
}

export function formatJson(json: string, indent = 2): string {
  try {
    const parsed = JSON.parse(json);
    return JSON.stringify(parsed, null, indent);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    throw new Error(`Invalid JSON input: ${message}`);
  }
}

export function minifyJson(json: string): string {
  try {
    const parsed = JSON.parse(json);
    return JSON.stringify(parsed);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    throw new Error(`Invalid JSON input: ${message}`);
  }
}
