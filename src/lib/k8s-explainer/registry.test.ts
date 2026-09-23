import { describe, expect, it } from 'vitest';
import { resolveExplainer } from './registry';
import { explainDeployment } from './kinds/deployment';

describe('resolveExplainer', () => {
  it('routes a known kind to its specific explainer', () => {
    const { explain, isGenericFallback } = resolveExplainer('Deployment');
    expect(isGenericFallback).toBe(false);
    expect(explain).toBe(explainDeployment);
  });

  it('routes an unknown kind to the generic fallback', () => {
    const { isGenericFallback } = resolveExplainer('Certificate');
    expect(isGenericFallback).toBe(true);
  });
});
