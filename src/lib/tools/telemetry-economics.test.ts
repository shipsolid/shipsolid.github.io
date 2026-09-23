import { describe, expect, it } from 'vitest';
import { calcTelemetryEconomics, DEFAULT_LABEL_CARDINALITY, HOST_BASELINE_SERIES } from './telemetry-economics';

const BASE = {
  services: 120,
  hostsCount: 80,
  metricsPerService: 2000,
  metricIntervalSeconds: 15,
  logsGbPerDay: 80,
  tracesGbPerDay: 5,
};

describe('calcTelemetryEconomics', () => {
  it('models volumes from the fleet size (doc example)', () => {
    const result = calcTelemetryEconomics(BASE);

    const expectedSeries =
      120 * 2000 * DEFAULT_LABEL_CARDINALITY + 80 * HOST_BASELINE_SERIES;
    expect(result.estActiveSeries).toBe(expectedSeries);
    expect(result.samplesPerSecond).toBeCloseTo(expectedSeries / 15);
    expect(result.logVolumeGbPerMonth).toBe(80 * 30);
    expect(result.traceVolumeGbPerMonth).toBe(5 * 30);
    expect(result.estMonthlyCost.total).toBeNull();
    expect(result.costDrivers).toEqual([]);
  });

  it('honours a custom avg label cardinality', () => {
    const result = calcTelemetryEconomics({ ...BASE, avgLabelCardinality: 25 });
    expect(result.estActiveSeries).toBe(120 * 2000 * 25 + 80 * HOST_BASELINE_SERIES);
  });

  it('accepts a logs-only fleet with metrics at zero', () => {
    const result = calcTelemetryEconomics({
      services: 0,
      hostsCount: 0,
      metricsPerService: 0,
      metricIntervalSeconds: 15,
      logsGbPerDay: 40,
      tracesGbPerDay: 0,
    });
    expect(result.estActiveSeries).toBe(0);
    expect(result.logVolumeGbPerMonth).toBe(1200);
  });

  it('computes total cost and sorts drivers by spend when unit costs are supplied', () => {
    const result = calcTelemetryEconomics({
      ...BASE,
      unitCost: { perMillionSeriesUsd: 8, perLogGbUsd: 0.5, perTraceGbUsd: 0.5 },
    });
    expect(result.estMonthlyCost.metrics).not.toBeNull();
    expect(result.estMonthlyCost.logs).toBeCloseTo(80 * 30 * 0.5); // 1200
    expect(result.estMonthlyCost.traces).toBeCloseTo(5 * 30 * 0.5); // 75
    expect(result.estMonthlyCost.total).toBeCloseTo(
      (result.estMonthlyCost.metrics ?? 0) + 1200 + 75
    );
    // sorted descending
    const spends = result.costDrivers.map((d) => d.monthlyUsd);
    expect(spends).toEqual([...spends].sort((a, b) => b - a));
    const shareSum = result.costDrivers.reduce((s, d) => s + d.sharePercent, 0);
    expect(shareSum).toBeGreaterThan(99);
    expect(shareSum).toBeLessThan(101);
  });

  it('includes only the cost components whose rate was given', () => {
    const result = calcTelemetryEconomics({ ...BASE, unitCost: { perLogGbUsd: 0.4 } });
    expect(result.estMonthlyCost.metrics).toBeNull();
    expect(result.estMonthlyCost.traces).toBeNull();
    expect(result.estMonthlyCost.logs).toBeCloseTo(80 * 30 * 0.4);
    expect(result.costDrivers).toHaveLength(1);
    expect(result.costDrivers[0].driver).toBe('Logs');
  });

  it('throws on a negative field, naming it', () => {
    expect(() => calcTelemetryEconomics({ ...BASE, logsGbPerDay: -1 })).toThrow(
      /logsGbPerDay must be a number >= 0/
    );
  });

  it('throws on a non-positive metric interval', () => {
    expect(() => calcTelemetryEconomics({ ...BASE, metricIntervalSeconds: 0 })).toThrow(
      /metricIntervalSeconds must be greater than 0/
    );
  });

  it('throws when every telemetry source is zero', () => {
    expect(() =>
      calcTelemetryEconomics({
        services: 0,
        hostsCount: 0,
        metricsPerService: 0,
        metricIntervalSeconds: 15,
        logsGbPerDay: 0,
        tracesGbPerDay: 0,
      })
    ).toThrow(/at least one non-zero telemetry source/);
  });
});
