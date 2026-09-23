// Pure metric-name checker for Prometheus and OpenTelemetry naming conventions. No DOM, no
// localStorage. A bad name is the tool's whole job — it surfaces as failed checks, not a throw.
// The only throw is an unknown convention.

export type MetricConvention = 'prometheus' | 'otel';
export type MetricType = 'counter' | 'gauge' | 'histogram' | 'summary' | 'unknown';

export interface NamingCheck {
  id: string;
  label: string;
  pass: boolean;
  detail: string;
}

export interface NamingResult {
  name: string;
  convention: MetricConvention;
  checks: NamingCheck[];
  /** Fraction of checks that passed, 0..1. */
  score: number;
  suggestedType: MetricType;
  suggestions: string[];
}

const PROM_CHARSET = /^[a-zA-Z_:][a-zA-Z0-9_:]*$/;
const PROM_UNIT_SUFFIX = /_(seconds|bytes|ratio|total|info|celsius|kelvin|joules|grams|meters|volts|amperes|percent)$/;
const NON_BASE_UNIT = /_(milliseconds|millis|ms|nanoseconds|nanos|ns|microseconds|micros|us|minutes|hours|kilobytes|kb|megabytes|mb|gigabytes|gb|kib|mib|gib)$/i;
const RESERVED_SUFFIX = /_(count|sum|bucket)$/;
const OTEL_DOTTED = /^[a-z][a-z0-9_]*(\.[a-z][a-z0-9_]*)+$/;

function suggestType(name: string): MetricType {
  if (/_total$/.test(name)) return 'counter';
  if (/_bucket$/.test(name)) return 'histogram';
  if (/(duration|latency|response_time|_seconds$)/.test(name)) return 'histogram';
  if (/(request|response|payload|message).*_bytes$|_size_bytes$/.test(name)) return 'histogram';
  if (/(_ratio$|_info$|_percent$|utilization|saturation|_usage$|_current$|in_use|active_)/.test(name)) return 'gauge';
  if (/_errors$|_requests$|_events$|_operations$|_failures$/.test(name)) return 'counter';
  return 'unknown';
}

function toSnakeCase(name: string): string {
  return name
    .replace(/([a-z0-9])([A-Z])/g, '$1_$2')
    .replace(/[-\s.]+/g, '_')
    .replace(/__+/g, '_')
    .toLowerCase();
}

export function validateMetricName(name: string, convention: MetricConvention = 'prometheus'): NamingResult {
  if (convention !== 'prometheus' && convention !== 'otel') {
    throw new Error(`Unknown convention "${convention}" — expected "prometheus" or "otel"`);
  }

  const trimmed = name.trim();
  // Suffix checks run against the snake_cased form so a camelCase name like
  // `httpRequestDurationMs` still trips the base-unit / reserved-suffix rules
  // (the casing itself is caught separately by the snake-case check).
  const snake = toSnakeCase(trimmed);
  const checks: NamingCheck[] = [];
  const add = (id: string, label: string, pass: boolean, detail: string) =>
    checks.push({ id, label, pass, detail });

  if (convention === 'prometheus') {
    add('non-empty', 'Name is not empty', trimmed.length > 0, 'Enter a metric name to validate.');
    add(
      'charset',
      'Valid characters ([a-zA-Z_:][a-zA-Z0-9_:]*)',
      PROM_CHARSET.test(trimmed),
      'Prometheus metric names match [a-zA-Z_:][a-zA-Z0-9_:]* — no dashes, spaces, or leading digits.'
    );
    add(
      'snake-case',
      'snake_case',
      trimmed !== '' && !/[A-Z]/.test(trimmed) && !/[-\s]/.test(trimmed),
      'Use lowercase snake_case: http_request_duration_seconds, not httpRequestDuration.'
    );
    add(
      'no-double-underscore',
      'No "__" (reserved for internal use)',
      !trimmed.includes('__'),
      'Double underscores are reserved for internal Prometheus labels — avoid them in metric names.'
    );
    add(
      'unit-suffix',
      'Ends with a unit (_total, _seconds, _bytes, _ratio, …)',
      PROM_UNIT_SUFFIX.test(snake),
      'End counters with _total and gauges/histograms with a base unit like _seconds or _bytes.'
    );
    add(
      'base-unit',
      'Uses base units (seconds, bytes — not ms, kb)',
      !NON_BASE_UNIT.test(snake),
      'Use base units: _seconds not _milliseconds, _bytes not _kilobytes. Prometheus convention is unprefixed SI.'
    );
    add(
      'no-reserved-suffix',
      'No hand-authored _count / _sum / _bucket',
      !RESERVED_SUFFIX.test(snake),
      'Prometheus generates _count, _sum, and _bucket automatically from a histogram or summary — do not name a metric that way.'
    );
    add('length', 'At most 200 characters', trimmed.length <= 200, 'Keep names well under 200 characters for readability and tooling limits.');
  } else {
    add('non-empty', 'Name is not empty', trimmed.length > 0, 'Enter a metric name to validate.');
    add(
      'dotted-namespace',
      'Dotted, lowercase namespace (http.server.request.duration)',
      OTEL_DOTTED.test(trimmed),
      'OpenTelemetry names are dot-namespaced and lowercase: http.server.request.duration.'
    );
    add(
      'no-total-suffix',
      'No _total suffix',
      !/_total$/.test(trimmed),
      'In OTel, monotonicity is a property of the instrument (Counter), not the name — drop _total.'
    );
    add(
      'unit-in-metadata',
      'Unit is not baked into the name',
      !/(seconds|milliseconds|_ms|bytes|kib|mib)$/i.test(trimmed),
      'OTel carries the unit in the instrument metadata (the `unit` field), not the metric name.'
    );
    add('lowercase', 'All lowercase', trimmed === trimmed.toLowerCase(), 'OTel metric names are all lowercase.');
    add('length', 'At most 255 characters', trimmed.length <= 255, 'Keep the name under 255 characters.');
  }

  const passed = checks.filter((c) => c.pass).length;
  const score = checks.length === 0 ? 0 : passed / checks.length;
  const suggestedType = suggestType(trimmed);

  const suggestions: string[] = [];
  const failed = new Set(checks.filter((c) => !c.pass).map((c) => c.id));

  if (convention === 'prometheus') {
    if (failed.has('snake-case') || failed.has('charset')) {
      suggestions.push(`Rewrite as snake_case: ${toSnakeCase(trimmed) || '(name)'}`);
    }
    if (failed.has('base-unit')) {
      suggestions.push('Convert to base units: _ms → _seconds, _kb → _bytes, _minutes → _seconds.');
    }
    if (failed.has('no-reserved-suffix')) {
      suggestions.push('Drop the _count / _sum / _bucket suffix — expose the histogram/summary itself.');
    }
    if (failed.has('unit-suffix') && suggestedType === 'counter') {
      suggestions.push(`Counters should end with _total, e.g. ${toSnakeCase(trimmed).replace(RESERVED_SUFFIX, '')}_total.`);
    }
    if (failed.has('unit-suffix') && suggestedType === 'histogram') {
      suggestions.push('Duration histograms end with _seconds; size histograms end with _bytes.');
    }
  } else {
    if (failed.has('dotted-namespace')) {
      suggestions.push(`Namespace it with dots: ${trimmed.replace(/[_\s]+/g, '.').toLowerCase()}`);
    }
    if (failed.has('no-total-suffix')) {
      suggestions.push(`Drop _total: ${trimmed.replace(/_total$/, '')}`);
    }
    if (failed.has('unit-in-metadata')) {
      suggestions.push('Move the unit to the instrument metadata and remove it from the name.');
    }
  }

  return { name: trimmed, convention, checks, score, suggestedType, suggestions };
}
