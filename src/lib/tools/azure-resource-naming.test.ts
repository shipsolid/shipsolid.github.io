import { describe, expect, it } from 'vitest';
import { buildResourceName, validateName } from './azure-resource-naming';

describe('buildResourceName', () => {
  it('builds the doc example', () => {
    const { name, warnings } = buildResourceName({
      resourceType: 'function app',
      workload: 'payments',
      environment: 'prod',
      region: 'centralindia',
    });
    expect(name).toBe('func-payments-prod-cin');
    expect(warnings).toEqual([]);
  });

  it('includes the instance segment when given', () => {
    const { name } = buildResourceName({
      resourceType: 'virtual machine',
      workload: 'api',
      environment: 'dev',
      region: 'eastus',
      instance: '01',
    });
    expect(name).toBe('vm-api-dev-eus-01');
  });

  it('strips dashes and truncates for a storage account', () => {
    const { name, warnings } = buildResourceName({
      resourceType: 'storage account',
      workload: 'payments-gateway-service',
      environment: 'prod',
      region: 'centralindia',
    });
    expect(name).not.toContain('-');
    expect(name.length).toBe(24);
    expect(warnings.some((w) => /truncated/.test(w))).toBe(true);
  });

  it('warns and passes an unknown resource type through', () => {
    const { name, warnings } = buildResourceName({
      resourceType: 'quantum widget',
      workload: 'x',
      environment: 'dev',
      region: 'eastus',
    });
    expect(name).toBe('quantumwidget-x-dev-eus');
    expect(warnings.some((w) => /Unknown resource type/.test(w))).toBe(true);
  });

  it('warns on an unknown region but still emits a short code', () => {
    const { name, warnings } = buildResourceName({
      resourceType: 'key vault',
      workload: 'core',
      environment: 'prod',
      region: 'marsnorth1',
    });
    expect(name).toBe('kv-core-prod-marsnorth1');
    expect(warnings.some((w) => /Unknown region/.test(w))).toBe(true);
  });

  it('honours a custom segment order', () => {
    const { name } = buildResourceName({
      resourceType: 'function app',
      workload: 'payments',
      environment: 'prod',
      region: 'centralindia',
      order: ['workload', 'environment', 'type', 'region'],
    });
    expect(name).toBe('payments-prod-func-cin');
  });
});

describe('validateName', () => {
  it('flags a too-long storage account name', () => {
    const warnings = validateName('storage account', 'a'.repeat(30));
    expect(warnings.some((w) => /24-char maximum/.test(w))).toBe(true);
  });

  it('returns [] for a compliant key vault name', () => {
    expect(validateName('key vault', 'kv-core-prod-cin')).toEqual([]);
  });

  it('returns [] for a type with no special rules', () => {
    expect(validateName('function app', 'anything-goes-here')).toEqual([]);
  });
});
