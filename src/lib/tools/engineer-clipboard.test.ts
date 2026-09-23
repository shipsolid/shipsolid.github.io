import { describe, expect, it } from 'vitest';
import { SEED_SNIPPETS, SNIPPET_CATEGORIES, filterSnippets, validateSnippet } from './engineer-clipboard';
import type { Snippet } from './engineer-clipboard';

const SNIPPETS: Snippet[] = [
  { id: '1', label: 'List pods sorted by age', category: 'kubectl', code: 'kubectl get pods -A --sort-by=.metadata.creationTimestamp' },
  { id: '2', label: 'List AKS clusters', category: 'az', code: 'az aks list -o table' },
  { id: '3', label: 'Remove dangling images', category: 'docker', code: 'docker image prune -f' },
  { id: '4', label: 'Request rate (5m)', category: 'promql', code: 'rate(http_requests_total[5m])', notes: 'good starting point for RED dashboards' },
];

describe('filterSnippets', () => {
  it('matches a query case-insensitively against label, code, or notes', () => {
    const result = filterSnippets(SNIPPETS, 'PODS', 'all');
    expect(result.map((s) => s.id)).toEqual(['1']);
  });

  it('combines a category filter with a query', () => {
    const result = filterSnippets(SNIPPETS, 'rate', 'promql');
    expect(result.map((s) => s.id)).toEqual(['4']);
  });

  it('returns an empty array when the query matches nothing', () => {
    expect(filterSnippets(SNIPPETS, 'nonexistent-term-xyz', 'all')).toEqual([]);
  });
});

describe('validateSnippet', () => {
  it('returns no errors for a fully valid input', () => {
    expect(validateSnippet({ label: 'List pods', code: 'kubectl get pods' })).toEqual([]);
  });

  it('returns one error per blank field when both label and code are blank', () => {
    const errors = validateSnippet({ label: '   ', code: '' });
    expect(errors).toHaveLength(2);
  });
});

describe('SEED_SNIPPETS', () => {
  it('ships at least one seed snippet', () => {
    expect(SEED_SNIPPETS.length).toBeGreaterThan(0);
  });

  it('covers every category except "other" with at least one seed snippet', () => {
    SNIPPET_CATEGORIES.filter((category) => category !== 'other').forEach((category) => {
      expect(SEED_SNIPPETS.some((s) => s.category === category)).toBe(true);
    });
  });
});
