import { describe, expect, it } from 'vitest';
import { estimateCapacity } from './capacity-estimator';

describe('estimateCapacity', () => {
  it('turns DAU / requests / peak into QPS (doc example)', () => {
    const result = estimateCapacity({
      dau: 10_000_000,
      requestsPerUserPerDay: 20,
      peakMultiplier: 5,
    });
    expect(result.dailyRequests).toBe(200_000_000);
    expect(result.averageRps).toBeCloseTo(200_000_000 / 86_400); // ~2314.8
    expect(result.peakRps).toBeCloseTo((200_000_000 / 86_400) * 5); // ~11574
    expect(result.peakBandwidthMbps).toBeNull();
    expect(result.storagePerDayGb).toBeNull();
    expect(result.estimatedServers).toBeNull();
  });

  it('computes bandwidth, storage, retention and server count when the optionals are supplied', () => {
    const result = estimateCapacity({
      dau: 1_000_000,
      requestsPerUserPerDay: 10,
      peakMultiplier: 3,
      avgResponseBytes: 2_000,
      bytesStoredPerRequest: 500,
      replicationFactor: 3,
      serverCapacityRps: 500,
      retentionDays: 30,
    });
    const avg = 10_000_000 / 86_400;
    const peak = avg * 3;
    expect(result.peakBandwidthMbps).toBeCloseTo((peak * 2_000 * 8) / 1_000_000);
    expect(result.storagePerDayGb).toBeCloseTo((10_000_000 * 500 * 3) / 1e9); // 15
    expect(result.storageAtRetentionGb).toBeCloseTo(15 * 30); // 450
    expect(result.estimatedServers).toBe(Math.ceil(peak / 500));
  });

  it('defaults replication factor to 1', () => {
    const result = estimateCapacity({
      dau: 100,
      requestsPerUserPerDay: 10,
      peakMultiplier: 1,
      bytesStoredPerRequest: 1_000_000,
    });
    expect(result.storagePerDayGb).toBeCloseTo((1000 * 1_000_000) / 1e9); // 1
  });

  it('throws when peakMultiplier is below 1', () => {
    expect(() =>
      estimateCapacity({ dau: 100, requestsPerUserPerDay: 10, peakMultiplier: 0.5 })
    ).toThrow(/peakMultiplier must be >= 1/);
  });

  it('throws on a negative DAU', () => {
    expect(() =>
      estimateCapacity({ dau: -1, requestsPerUserPerDay: 10, peakMultiplier: 2 })
    ).toThrow(/dau must be a number >= 0/);
  });

  it('throws on a non-positive server capacity', () => {
    expect(() =>
      estimateCapacity({ dau: 1, requestsPerUserPerDay: 1, peakMultiplier: 1, serverCapacityRps: 0 })
    ).toThrow(/serverCapacityRps must be greater than 0/);
  });
});
