// Pure telemetry-volume + cost modelling — turn fleet size (services, hosts, metrics, log/trace
// GB) into monthly metric samples, log/trace volume, and, when you supply unit costs, an estimate
// of the cost drivers. Vendor-neutral: no prices are baked in. No DOM, no localStorage.

export interface TelemetryUnitCost {
  perMillionSeriesUsd?: number;
  perLogGbUsd?: number;
  perTraceGbUsd?: number;
}

export interface TelemetryInput {
  services: number;
  hostsCount: number;
  metricsPerService: number;
  metricIntervalSeconds: number;
  logsGbPerDay: number;
  tracesGbPerDay: number;
  /** Average distinct label combinations per metric. Defaults to 10. */
  avgLabelCardinality?: number;
  retentionDays?: number;
  unitCost?: TelemetryUnitCost;
}

export interface TelemetryCostDriver {
  driver: string;
  monthlyUsd: number;
  sharePercent: number;
}

export interface TelemetryResult {
  estActiveSeries: number;
  samplesPerSecond: number;
  metricSamplesPerMonth: number;
  logVolumeGbPerMonth: number;
  traceVolumeGbPerMonth: number;
  estMonthlyCost: {
    metrics: number | null;
    logs: number | null;
    traces: number | null;
    total: number | null;
  };
  costDrivers: TelemetryCostDriver[];
  notes: string[];
}

export const DEFAULT_LABEL_CARDINALITY = 10;
export const HOST_BASELINE_SERIES = 500; // node/host-exporter baseline series per host
const DAYS_PER_MONTH = 30;
const SECONDS_PER_MONTH = 2_592_000; // 30 * 86400

const NON_NEGATIVE_FIELDS: (keyof TelemetryInput)[] = [
  'services',
  'hostsCount',
  'metricsPerService',
  'logsGbPerDay',
  'tracesGbPerDay',
];

export function calcTelemetryEconomics(input: TelemetryInput): TelemetryResult {
  for (const field of NON_NEGATIVE_FIELDS) {
    const value = input[field] as number;
    if (!Number.isFinite(value) || value < 0) {
      throw new Error(`${field} must be a number >= 0, got ${value}`);
    }
  }
  if (!Number.isFinite(input.metricIntervalSeconds) || input.metricIntervalSeconds <= 0) {
    throw new Error(`metricIntervalSeconds must be greater than 0, got ${input.metricIntervalSeconds}`);
  }

  const cardinality =
    input.avgLabelCardinality !== undefined && Number.isFinite(input.avgLabelCardinality) && input.avgLabelCardinality > 0
      ? input.avgLabelCardinality
      : DEFAULT_LABEL_CARDINALITY;

  const serviceSeries = input.services * input.metricsPerService * cardinality;
  const hostSeries = input.hostsCount * HOST_BASELINE_SERIES;
  const estActiveSeries = Math.round(serviceSeries + hostSeries);

  const logVolumeGbPerMonth = input.logsGbPerDay * DAYS_PER_MONTH;
  const traceVolumeGbPerMonth = input.tracesGbPerDay * DAYS_PER_MONTH;

  if (estActiveSeries <= 0 && logVolumeGbPerMonth <= 0 && traceVolumeGbPerMonth <= 0) {
    throw new Error('Enter at least one non-zero telemetry source (metrics, logs, or traces)');
  }

  const samplesPerSecond = estActiveSeries / input.metricIntervalSeconds;
  const metricSamplesPerMonth = samplesPerSecond * SECONDS_PER_MONTH;

  const uc = input.unitCost ?? {};
  const metricsCost =
    uc.perMillionSeriesUsd !== undefined && Number.isFinite(uc.perMillionSeriesUsd)
      ? (estActiveSeries / 1_000_000) * uc.perMillionSeriesUsd
      : null;
  const logsCost =
    uc.perLogGbUsd !== undefined && Number.isFinite(uc.perLogGbUsd)
      ? logVolumeGbPerMonth * uc.perLogGbUsd
      : null;
  const tracesCost =
    uc.perTraceGbUsd !== undefined && Number.isFinite(uc.perTraceGbUsd)
      ? traceVolumeGbPerMonth * uc.perTraceGbUsd
      : null;

  const components: { driver: string; monthlyUsd: number }[] = [];
  if (metricsCost !== null) components.push({ driver: 'Metrics', monthlyUsd: metricsCost });
  if (logsCost !== null) components.push({ driver: 'Logs', monthlyUsd: logsCost });
  if (tracesCost !== null) components.push({ driver: 'Traces', monthlyUsd: tracesCost });

  const total = components.length > 0 ? components.reduce((sum, c) => sum + c.monthlyUsd, 0) : null;

  const costDrivers: TelemetryCostDriver[] = components
    .map((c) => ({
      driver: c.driver,
      monthlyUsd: c.monthlyUsd,
      sharePercent: total && total > 0 ? Math.round((c.monthlyUsd / total) * 1000) / 10 : 0,
    }))
    .sort((a, b) => b.monthlyUsd - a.monthlyUsd);

  const notes: string[] = [
    `Active series ≈ services × metrics/service × avg label cardinality (${cardinality}) + hosts × ${HOST_BASELINE_SERIES} baseline series.`,
    `Metric samples/month = active series ÷ interval (${input.metricIntervalSeconds}s) × ${SECONDS_PER_MONTH.toLocaleString()}s.`,
    `Log/trace volume/month = GB per day × ${DAYS_PER_MONTH} days.`,
  ];
  if (total === null) {
    notes.push('Add unit costs (per M series, per log GB, per trace GB) to estimate monthly spend.');
  } else {
    notes.push('Costs use the rates you entered — no vendor pricing is assumed.');
  }
  if (input.retentionDays !== undefined) {
    notes.push(`Retention of ${input.retentionDays} days affects storage cost, not the ingest volumes above.`);
  }

  return {
    estActiveSeries,
    samplesPerSecond,
    metricSamplesPerMonth,
    logVolumeGbPerMonth,
    traceVolumeGbPerMonth,
    estMonthlyCost: { metrics: metricsCost, logs: logsCost, traces: tracesCost, total },
    costDrivers,
    notes,
  };
}
