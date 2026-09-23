import * as yaml from 'js-yaml';
import type { FieldExplanation } from './types';

// K8s manifests are dynamic, arbitrarily-shaped YAML — these helpers deliberately traffic in
// `any` past this boundary so kind modules can read nested fields (container.image,
// spec.template.spec, ...) without a cast at every step. The public contract in types.ts stays
// precisely typed; this looseness is contained to the explainer implementations.

export function asRecord(value: unknown): Record<string, any> | undefined {
  return value !== null && typeof value === 'object' && !Array.isArray(value)
    ? (value as Record<string, any>)
    : undefined;
}

export function asArray(value: unknown): any[] | undefined {
  return Array.isArray(value) ? value : undefined;
}

export function formatValue(value: unknown): string {
  if (value === undefined || value === null) return '(not set)';
  if (typeof value === 'string') return value;
  if (typeof value === 'number' || typeof value === 'boolean') return String(value);
  return yaml.dump(value, { flowLevel: -1 }).trim();
}

export function field(path: string, value: unknown, explanation: string): FieldExplanation {
  return { path, value: formatValue(value), explanation };
}
