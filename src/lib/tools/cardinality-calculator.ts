// Pure metric-cardinality math — estimate active series from a label set, rank the contributors,
// and flag high-churn labels. No DOM, no localStorage; the caller (cardinality-calculator.astro)
// owns reading inputs and persisting state, same separation as sre-calculator.ts.
//
// Mirrors the repo's own `cardinality-budget-calculator` skill: active series is the product of
// per-label cardinalities, and any unbounded-looking label (request id, user id, pod, …) is an
// automatic stop.

export interface LabelDef {
  name: string;
  cardinality: number;
}

export interface CardinalityInput {
  labels: LabelDef[];
  scrapeIntervalSeconds: number;
  /** Optional — enables the monthly ingest estimate. Vendor-neutral: you supply the rate. */
  costPerMillionSeriesUsd?: number;
}

export interface CardinalityContributor {
  name: string;
  cardinality: number;
  /** cardinality as a share of the summed label cardinalities — a rough "who dominates" signal. */
  sharePercent: number;
}

export type CardinalityRisk = 'low' | 'medium' | 'high';
export type CardinalityVerdict = 'within-budget' | 'marginal' | 'over-budget';

export interface CardinalityResult {
  activeSeries: number;
  samplesPerSecond: number;
  estMonthlyIngestUsd: number | null;
  risk: CardinalityRisk;
  verdict: CardinalityVerdict;
  contributors: CardinalityContributor[];
  highChurnFlags: string[];
  notes: string[];
}

export const HIGH_CARDINALITY_THRESHOLD = 10_000;
export const MARGINAL_SERIES = 100_000;
export const OVER_BUDGET_SERIES = 1_000_000;

const SECONDS_PER_MONTH = 2_592_000; // 30 * 86400

// Label names that tend to carry unbounded or high-churn values — pushing metric cost through the
// roof one series at a time. Matched case-insensitively on whole \b-ish segments so `user_id` and
// `trace.id` hit but `guid_type` or `void` (contains "id") do not.
const HIGH_CHURN_RE =
  /(^|[_.])(id|uuid|guid|user|session|request|req|trace|span|pod|replica|instance|container|ip|host|hostname|email|url|uri|path|query|timestamp|ts|build|commit|version|hash|token)([_.]|$)/i;

export function calcCardinality(input: CardinalityInput): CardinalityResult {
  const { labels, scrapeIntervalSeconds, costPerMillionSeriesUsd } = input;

  if (!Number.isFinite(scrapeIntervalSeconds) || scrapeIntervalSeconds <= 0) {
    throw new Error(`scrapeIntervalSeconds must be greater than 0, got ${scrapeIntervalSeconds}`);
  }

  const seen = new Set<string>();
  for (const label of labels) {
    const name = label.name.trim();
    if (name === '') {
      throw new Error('Every label must have a non-empty name');
    }
    if (seen.has(name)) {
      throw new Error(`Duplicate label name: "${name}"`);
    }
    seen.add(name);
    if (!Number.isFinite(label.cardinality) || label.cardinality <= 0) {
      throw new Error(`Label "${name}" cardinality must be a positive number, got ${label.cardinality}`);
    }
  }

  const activeSeries = labels.reduce((product, label) => product * label.cardinality, 1);
  const samplesPerSecond = activeSeries / scrapeIntervalSeconds;

  const sumCardinality = labels.reduce((sum, label) => sum + label.cardinality, 0);
  const contributors: CardinalityContributor[] = labels
    .map((label) => ({
      name: label.name.trim(),
      cardinality: label.cardinality,
      sharePercent: sumCardinality === 0 ? 0 : Math.round((label.cardinality / sumCardinality) * 1000) / 10,
    }))
    .sort((a, b) => b.cardinality - a.cardinality);

  const highChurnFlags = labels
    .map((label) => label.name.trim())
    .filter((name, i) => HIGH_CHURN_RE.test(name) || labels[i].cardinality >= HIGH_CARDINALITY_THRESHOLD);

  let verdict: CardinalityVerdict;
  if (activeSeries > OVER_BUDGET_SERIES) verdict = 'over-budget';
  else if (activeSeries > MARGINAL_SERIES) verdict = 'marginal';
  else verdict = 'within-budget';

  let risk: CardinalityRisk;
  if (highChurnFlags.length > 0 || verdict === 'over-budget') risk = 'high';
  else if (verdict === 'marginal') risk = 'medium';
  else risk = 'low';

  const estMonthlyIngestUsd =
    costPerMillionSeriesUsd !== undefined && Number.isFinite(costPerMillionSeriesUsd)
      ? (activeSeries / 1_000_000) * costPerMillionSeriesUsd
      : null;

  const notes: string[] = [
    'Active series = the product of every label’s distinct-value count (an empty label set is 1 series).',
    `Samples/sec = active series ÷ scrape interval (${scrapeIntervalSeconds}s).`,
    `Risk thresholds: > ${MARGINAL_SERIES.toLocaleString()} series is marginal, > ${OVER_BUDGET_SERIES.toLocaleString()} is over budget.`,
    `Any label named like an unbounded value, or with ≥ ${HIGH_CARDINALITY_THRESHOLD.toLocaleString()} distinct values, is flagged as high-churn — push it to logs, traces, or exemplars instead.`,
  ];
  if (estMonthlyIngestUsd === null) {
    notes.push('Add a cost per million series to estimate monthly ingest spend.');
  } else {
    notes.push(`Monthly ingest ≈ active series ÷ 1,000,000 × your rate. ~${SECONDS_PER_MONTH.toLocaleString()}s per 30-day month.`);
  }

  return {
    activeSeries,
    samplesPerSecond,
    estMonthlyIngestUsd,
    risk,
    verdict,
    contributors,
    highChurnFlags,
    notes,
  };
}
