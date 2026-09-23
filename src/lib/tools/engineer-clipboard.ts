// Pure engineer-clipboard helpers — no DOM, no localStorage. The calling page (or its <script>)
// owns id generation (crypto.randomUUID()) and persistence; this module just filters/validates.

export type SnippetCategory =
  | 'kubectl'
  | 'az'
  | 'docker'
  | 'curl'
  | 'promql'
  | 'kql'
  | 'sql'
  | 'regex'
  | 'other';

export const SNIPPET_CATEGORIES: SnippetCategory[] = [
  'kubectl',
  'az',
  'docker',
  'curl',
  'promql',
  'kql',
  'sql',
  'regex',
  'other',
];

export interface Snippet {
  id: string; // caller-generated (e.g. crypto.randomUUID() at the call site, not in this module)
  label: string;
  category: SnippetCategory;
  code: string;
  notes?: string;
}

// Starter set shown on first-ever load (before anything is persisted to localStorage) — at least
// one entry per category except 'other', which is left for user-added snippets that don't fit
// the built-in buckets.
export const SEED_SNIPPETS: Snippet[] = [
  {
    id: 'seed-1',
    label: 'List pods sorted by age',
    category: 'kubectl',
    code: 'kubectl get pods -A --sort-by=.metadata.creationTimestamp',
  },
  {
    id: 'seed-2',
    label: 'List AKS clusters',
    category: 'az',
    code: 'az aks list -o table',
  },
  {
    id: 'seed-3',
    label: 'Remove dangling images',
    category: 'docker',
    code: 'docker image prune -f',
  },
  {
    id: 'seed-4',
    label: 'Verbose GET with timing',
    category: 'curl',
    code: "curl -sS -w '\\n%{time_total}s\\n' -v <url>",
  },
  {
    id: 'seed-5',
    label: 'Request rate (5m)',
    category: 'promql',
    code: 'rate(http_requests_total[5m])',
  },
  {
    id: 'seed-6',
    label: 'Requests by status code (1h)',
    category: 'kql',
    code: 'requests | where timestamp > ago(1h) | summarize count() by resultCode',
  },
  {
    id: 'seed-7',
    label: 'Row count per table (Postgres)',
    category: 'sql',
    code: 'select relname, n_live_tup from pg_stat_user_tables order by n_live_tup desc;',
    notes: 'pg_stat_user_tables counts are estimates, not exact — good enough for a quick eyeball.',
  },
  {
    id: 'seed-8',
    label: 'Extract ISO date',
    category: 'regex',
    code: '\\d{4}-\\d{2}-\\d{2}',
  },
];

// Case-insensitive substring match of `query` against label + code + notes (if present). Empty
// query matches everything. When `category` isn't 'all', results are also restricted to that
// category.
export function filterSnippets(
  snippets: Snippet[],
  query: string,
  category: SnippetCategory | 'all'
): Snippet[] {
  const needle = query.trim().toLowerCase();

  return snippets.filter((snippet) => {
    if (category !== 'all' && snippet.category !== category) return false;
    if (!needle) return true;

    const haystack = `${snippet.label}\n${snippet.code}\n${snippet.notes || ''}`.toLowerCase();
    return haystack.includes(needle);
  });
}

// Returns an array of human-readable validation error strings (empty array = valid).
export function validateSnippet(input: { label: string; code: string }): string[] {
  const errors: string[] = [];

  if (!input.label.trim()) {
    errors.push('Label is required.');
  }

  if (!input.code.trim()) {
    errors.push('Code is required.');
  }

  return errors;
}
