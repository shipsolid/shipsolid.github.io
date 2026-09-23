import { describe, expect, it } from 'vitest';
import { calcCardinality } from './cardinality-calculator';

describe('calcCardinality', () => {
  it('multiplies label cardinalities into an active-series count', () => {
    const result = calcCardinality({
      labels: [
        { name: 'service', cardinality: 100 },
        { name: 'environment', cardinality: 4 },
        { name: 'region', cardinality: 6 },
        { name: 'pod', cardinality: 500 },
      ],
      scrapeIntervalSeconds: 15,
    });

    expect(result.activeSeries).toBe(100 * 4 * 6 * 500); // 1,200,000
    expect(result.samplesPerSecond).toBeCloseTo(1_200_000 / 15);
    expect(result.verdict).toBe('over-budget');
    expect(result.risk).toBe('high');
    expect(result.highChurnFlags).toContain('pod');
  });

  it('treats an empty label set as a single series with low risk', () => {
    const result = calcCardinality({ labels: [], scrapeIntervalSeconds: 30 });
    expect(result.activeSeries).toBe(1);
    expect(result.samplesPerSecond).toBeCloseTo(1 / 30);
    expect(result.verdict).toBe('within-budget');
    expect(result.risk).toBe('low');
    expect(result.highChurnFlags).toEqual([]);
  });

  it('flags a high-churn label by name even when its stated cardinality is small', () => {
    const result = calcCardinality({
      labels: [
        { name: 'service', cardinality: 10 },
        { name: 'user_id', cardinality: 50 },
      ],
      scrapeIntervalSeconds: 15,
    });
    expect(result.highChurnFlags).toEqual(['user_id']);
    expect(result.risk).toBe('high');
  });

  it('flags a label purely on a large distinct-value count', () => {
    const result = calcCardinality({
      labels: [{ name: 'customer', cardinality: 25_000 }],
      scrapeIntervalSeconds: 60,
    });
    expect(result.highChurnFlags).toEqual(['customer']);
  });

  it('ranks contributors by cardinality, descending', () => {
    const result = calcCardinality({
      labels: [
        { name: 'a', cardinality: 3 },
        { name: 'b', cardinality: 100 },
        { name: 'c', cardinality: 20 },
      ],
      scrapeIntervalSeconds: 15,
    });
    expect(result.contributors.map((c) => c.name)).toEqual(['b', 'c', 'a']);
    expect(result.contributors[0].sharePercent).toBeGreaterThan(result.contributors[2].sharePercent);
  });

  it('computes a monthly ingest estimate only when a rate is supplied', () => {
    const withRate = calcCardinality({
      labels: [{ name: 'service', cardinality: 2_000_000 }],
      scrapeIntervalSeconds: 15,
      costPerMillionSeriesUsd: 8,
    });
    expect(withRate.estMonthlyIngestUsd).toBeCloseTo(16);

    const withoutRate = calcCardinality({
      labels: [{ name: 'service', cardinality: 2_000_000 }],
      scrapeIntervalSeconds: 15,
    });
    expect(withoutRate.estMonthlyIngestUsd).toBeNull();
  });

  it('reports marginal / medium in the 100k–1M band', () => {
    const result = calcCardinality({
      labels: [
        { name: 'service', cardinality: 500 },
        { name: 'route', cardinality: 600 },
      ],
      scrapeIntervalSeconds: 15,
    });
    expect(result.activeSeries).toBe(300_000);
    expect(result.verdict).toBe('marginal');
    expect(result.risk).toBe('medium');
  });

  it('throws on a non-positive scrape interval', () => {
    expect(() => calcCardinality({ labels: [], scrapeIntervalSeconds: 0 })).toThrow(
      /scrapeIntervalSeconds must be greater than 0/
    );
  });

  it('throws on a negative label cardinality', () => {
    expect(() =>
      calcCardinality({ labels: [{ name: 'x', cardinality: -1 }], scrapeIntervalSeconds: 15 })
    ).toThrow(/cardinality must be a positive number/);
  });

  it('throws on a blank label name', () => {
    expect(() =>
      calcCardinality({ labels: [{ name: '   ', cardinality: 5 }], scrapeIntervalSeconds: 15 })
    ).toThrow(/non-empty name/);
  });

  it('throws on duplicate label names', () => {
    expect(() =>
      calcCardinality({
        labels: [
          { name: 'env', cardinality: 3 },
          { name: 'env', cardinality: 4 },
        ],
        scrapeIntervalSeconds: 15,
      })
    ).toThrow(/Duplicate label name: "env"/);
  });
});
