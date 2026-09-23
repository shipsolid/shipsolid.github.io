// Central manifest for the /tools workbench. Single source of truth for:
//   - the /tools index page (grouped into the 4 product families)
//   - the /tools family sub-nav strip in Header.astro
//   - per-tool metadata (title / description / tags) shared with each tool page
//
// Adding a tool = append one entry here + create src/pages/tools/<slug>.astro
// (+ usually src/lib/tools/<slug>.ts and its .test.ts). Nothing else needs editing.
//
// The 4 families come from 0-session-logs/shipsolid.md: BUILD / OBSERVE / OPERATE / FOCUS.
// (The doc also sketched a LEARN family — deliberately cut; the knowledge sections live in
// the Blog / Notes / Gita nav, not here.)

export type ToolFamily = 'build' | 'observe' | 'operate' | 'focus';

// 'stable'  — linked normally on the index
// 'beta'    — linked, plus a "beta" chip
// 'planned' — rendered as a dimmed, non-linked roadmap card (page not built yet)
export type ToolStatus = 'stable' | 'beta' | 'planned';

export interface ToolMeta {
  /** URL slug; also the basename of src/pages/tools/<slug>.astro and src/lib/tools/<slug>.ts. */
  slug: string;
  /** Canonical route. `/tools/${slug}` for every tool except Pomodoro, which keeps `/pomo`. */
  href: string;
  title: string;
  /** One line — feeds the index card and the tool page's <meta description>. */
  description: string;
  family: ToolFamily;
  /** Display-only chips. Reuses the site's existing tag folksonomy where possible. */
  tags: string[];
  status: ToolStatus;
}

export interface ToolFamilyMeta {
  id: ToolFamily;
  label: string;
  blurb: string;
}

export const TOOL_FAMILIES: ToolFamilyMeta[] = [
  {
    id: 'build',
    label: 'BUILD',
    blurb: 'Format, decode, generate, and diff — the inner-loop developer utilities.',
  },
  {
    id: 'observe',
    label: 'OBSERVE',
    blurb: 'SLOs, cardinality, telemetry cost, and query builders for metrics and logs.',
  },
  {
    id: 'operate',
    label: 'OPERATE',
    blurb: 'Incident timelines, runbooks, post-mortems, decision records, and diagrams.',
  },
  {
    id: 'focus',
    label: 'FOCUS',
    blurb: 'Personal workspaces — journal, clipboard, cockpit, timer, and scratchpad.',
  },
];

export const TOOLS: ToolMeta[] = [
  // ─────────────────────────────── BUILD ───────────────────────────────
  {
    slug: 'json-yaml',
    href: '/tools/json-yaml',
    title: 'JSON / YAML Toolkit',
    description: 'Convert between JSON and YAML, format, and minify — all client-side.',
    family: 'build',
    tags: ['data', 'productivity'],
    status: 'stable',
  },
  {
    slug: 'jwt-inspector',
    href: '/tools/jwt-inspector',
    title: 'JWT Inspector',
    description: 'Decode a JWT header and payload and check expiry. Decode only — no signature verification.',
    family: 'build',
    tags: ['security', 'productivity'],
    status: 'stable',
  },
  {
    slug: 'cron-builder',
    href: '/tools/cron-builder',
    title: 'Cron Builder',
    description: 'Validate a cron expression, get a plain-English description, and preview next run times.',
    family: 'build',
    tags: ['sre', 'productivity'],
    status: 'stable',
  },
  {
    slug: 'timestamp-converter',
    href: '/tools/timestamp-converter',
    title: 'Timestamp Converter',
    description: 'Convert between Unix time and ISO 8601, format in any timezone, and show relative time.',
    family: 'build',
    tags: ['productivity', 'observability'],
    status: 'stable',
  },
  {
    slug: 'uuid-generator',
    href: '/tools/uuid-generator',
    title: 'UUID Generator',
    description: 'Generate v4 UUIDs in bulk, or parse and validate an existing UUID.',
    family: 'build',
    tags: ['development', 'productivity'],
    status: 'stable',
  },
  {
    slug: 'base64-hash',
    href: '/tools/base64-hash',
    title: 'Base64 / Hash Toolkit',
    description: 'UTF-8 safe Base64 encode/decode plus SHA-1/256/384/512 hashing.',
    family: 'build',
    tags: ['security', 'development'],
    status: 'stable',
  },
  {
    slug: 'regex-playground',
    href: '/tools/regex-playground',
    title: 'Regex Playground',
    description: 'Test a regular expression against sample text with live match highlighting and capture groups.',
    family: 'build',
    tags: ['development', 'productivity'],
    status: 'stable',
  },
  {
    slug: 'unix-permissions',
    href: '/tools/unix-permissions',
    title: 'Unix Permissions Calculator',
    description: 'Convert between octal and symbolic file permissions, including setuid/setgid/sticky bits.',
    family: 'build',
    tags: ['sre', 'productivity'],
    status: 'stable',
  },
  {
    slug: 'http-header-inspector',
    href: '/tools/http-header-inspector',
    title: 'HTTP Header Inspector',
    description: 'Parse pasted response headers and check for common security headers.',
    family: 'build',
    tags: ['security', 'observability'],
    status: 'stable',
  },
  {
    slug: 'diff-tool',
    href: '/tools/diff-tool',
    title: 'Diff Tool',
    description: 'Line-by-line text diff with whitespace and case options, exported as a unified diff.',
    family: 'build',
    tags: ['development', 'productivity'],
    status: 'stable',
  },
  {
    slug: 'url-toolkit',
    href: '/tools/url-toolkit',
    title: 'URL Toolkit',
    description: 'Encode and decode URL components, and parse or build query strings.',
    family: 'build',
    tags: ['development', 'productivity'],
    status: 'stable',
  },
  {
    slug: 'log-explorer',
    href: '/tools/log-explorer',
    title: 'Log Explorer',
    description: 'Paste raw logs, then parse, filter, group, and search them entirely in your browser.',
    family: 'build',
    tags: ['observability', 'development'],
    status: 'stable',
  },
  {
    slug: 'sql-formatter',
    href: '/tools/sql-formatter',
    title: 'SQL Formatter',
    description: 'Format or minify SQL for Postgres, MySQL, T-SQL, BigQuery, and SQLite.',
    family: 'build',
    tags: ['data', 'development'],
    status: 'stable',
  },

  // ────────────────────────────── OBSERVE ──────────────────────────────
  {
    slug: 'sre-calculator',
    href: '/tools/sre-calculator',
    title: 'SRE Calculator',
    description: 'SLO error budgets, burn rate, Apdex, and MTTR/MTBF calculators.',
    family: 'observe',
    tags: ['sre', 'observability'],
    status: 'stable',
  },
  {
    slug: 'cidr-calculator',
    href: '/tools/cidr-calculator',
    title: 'CIDR Calculator',
    description: 'Network/broadcast address, subnet mask, and usable host range for an IPv4 CIDR block.',
    family: 'observe',
    tags: ['networking', 'sre'],
    status: 'stable',
  },
  {
    slug: 'cardinality-calculator',
    href: '/tools/cardinality-calculator',
    title: 'Cardinality Calculator',
    description: 'Estimate active series from a label set, flag high-cardinality labels, and rate the risk.',
    family: 'observe',
    tags: ['observability', 'sre'],
    status: 'stable',
  },
  {
    slug: 'telemetry-economics',
    href: '/tools/telemetry-economics',
    title: 'Telemetry Economics',
    description: 'Model metric, log, and trace volume from fleet size and estimate the cost drivers.',
    family: 'observe',
    tags: ['observability', 'sre'],
    status: 'stable',
  },
  {
    slug: 'metric-naming-validator',
    href: '/tools/metric-naming-validator',
    title: 'Metric Naming Validator',
    description: 'Check a metric name against Prometheus or OpenTelemetry naming conventions.',
    family: 'observe',
    tags: ['observability', 'prometheus'],
    status: 'stable',
  },
  {
    slug: 'capacity-estimator',
    href: '/tools/capacity-estimator',
    title: 'Capacity Estimator',
    description: 'Turn DAU, request rate, and a peak multiplier into QPS, storage, bandwidth, and server count.',
    family: 'observe',
    tags: ['sre', 'architecture'],
    status: 'stable',
  },
  {
    slug: 'otel-attribute-explorer',
    href: '/tools/otel-attribute-explorer',
    title: 'OTel Attribute Explorer',
    description: 'Classify OpenTelemetry attributes by scope and flag the ones unsafe as metric labels.',
    family: 'observe',
    tags: ['observability', 'opentelemetry'],
    status: 'stable',
  },
  {
    slug: 'promql-playground',
    href: '/tools/promql-playground',
    title: 'PromQL Playground',
    description: 'Build and explain PromQL with templates, a function reference, and best-effort linting — no backend.',
    family: 'observe',
    tags: ['observability', 'prometheus'],
    status: 'stable',
  },
  {
    slug: 'logql-builder',
    href: '/tools/logql-builder',
    title: 'LogQL Builder',
    description: 'Assemble a LogQL query from stream matchers, line filters, and a parser stage.',
    family: 'observe',
    tags: ['observability', 'loki'],
    status: 'stable',
  },

  // ────────────────────────────── OPERATE ──────────────────────────────
  {
    slug: 'incident-timeline',
    href: '/tools/incident-timeline',
    title: 'Incident Timeline Builder',
    description: 'Turn a list of timestamped events into a visual incident timeline.',
    family: 'operate',
    tags: ['sre', 'incident-response'],
    status: 'stable',
  },
  {
    slug: 'adr-builder',
    href: '/tools/adr-builder',
    title: 'ADR Builder',
    description: 'Structured Architecture Decision Record editor with Mermaid diagram preview.',
    family: 'operate',
    tags: ['architecture', 'documentation'],
    status: 'stable',
  },
  {
    slug: 'runbook-builder',
    href: '/tools/runbook-builder',
    title: 'Runbook Builder',
    description: 'Draft an alert runbook — symptoms, checks, decision points, remediation — and export Markdown.',
    family: 'operate',
    tags: ['sre', 'incident-response'],
    status: 'stable',
  },
  {
    slug: 'postmortem-builder',
    href: '/tools/postmortem-builder',
    title: 'Postmortem Builder',
    description: 'Fill in a structured incident postmortem and export it as Markdown.',
    family: 'operate',
    tags: ['sre', 'incident-response'],
    status: 'stable',
  },
  {
    slug: 'mermaid-playground',
    href: '/tools/mermaid-playground',
    title: 'Mermaid Playground',
    description: 'Edit Mermaid diagrams with a live preview, template library, and SVG export.',
    family: 'operate',
    tags: ['architecture', 'documentation'],
    status: 'stable',
  },
  {
    slug: 'azure-resource-naming',
    href: '/tools/azure-resource-naming',
    title: 'Azure Resource Naming',
    description: 'Generate Azure resource names from a configurable Cloud Adoption Framework convention.',
    family: 'operate',
    tags: ['azure', 'architecture'],
    status: 'stable',
  },

  // ─────────────────────────────── FOCUS ───────────────────────────────
  {
    slug: 'bullet-journal',
    href: '/tools/bullet-journal',
    title: 'Digital Bullet Journal',
    description: 'Rapid-log capture using a compact symbol notation, parsed into a daily rollup.',
    family: 'focus',
    tags: ['productivity', 'journaling'],
    status: 'stable',
  },
  {
    slug: 'engineer-clipboard',
    href: '/tools/engineer-clipboard',
    title: 'Engineer Clipboard',
    description: 'Searchable personal snippet library — kubectl, az, docker, PromQL, KQL, SQL, regex.',
    family: 'focus',
    tags: ['productivity', 'snippets'],
    status: 'stable',
  },
  {
    slug: 'engineering-cockpit',
    href: '/tools/engineering-cockpit',
    title: 'Engineering Cockpit',
    description:
      'A single daily dashboard — top 3, schedule, quick capture, waiting-on, and real learning progress from your flashcards.',
    family: 'focus',
    tags: ['productivity', 'planning'],
    status: 'stable',
  },
  {
    slug: 'pomodoro',
    href: '/pomo',
    title: 'Pomodoro Timer',
    description: 'A focus timer with ambient sound, session history, streak tracking, and achievements.',
    family: 'focus',
    tags: ['productivity', 'focus'],
    status: 'stable',
  },
  {
    slug: 'scratchpad',
    href: '/tools/scratchpad',
    title: 'Scratchpad',
    description: 'A tabbed, auto-saving local workspace for throwaway notes, JSON, logs, and SQL.',
    family: 'focus',
    tags: ['productivity', 'snippets'],
    status: 'stable',
  },
];

const STATUS_ORDER: Record<ToolStatus, number> = { stable: 0, beta: 1, planned: 2 };

// Shipped tools first (alphabetical), planned roadmap cards last.
export function toolsInFamily(family: ToolFamily): ToolMeta[] {
  return TOOLS.filter((t) => t.family === family).sort(
    (a, b) => STATUS_ORDER[a.status] - STATUS_ORDER[b.status] || a.title.localeCompare(b.title)
  );
}

export function getTool(slug: string): ToolMeta | undefined {
  return TOOLS.find((t) => t.slug === slug);
}

export function groupedTools(): { family: ToolFamilyMeta; tools: ToolMeta[] }[] {
  return TOOL_FAMILIES.map((family) => ({ family, tools: toolsInFamily(family.id) }));
}
