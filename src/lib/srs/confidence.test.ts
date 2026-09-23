import { describe, expect, it } from 'vitest';
import { computeUnitConfidenceScores, recordConfidence } from './confidence';
import type { ConfidenceStore } from './confidence';

describe('recordConfidence', () => {
  it('does not mutate the input store', () => {
    const store: ConfidenceStore = { u1: { rating: 3, ratedAt: '2026-01-01' } };
    const snapshot = { ...store };
    recordConfidence(store, 'u1', 5, '2026-01-02');
    expect(store).toEqual(snapshot);
  });

  it('overwrites an existing rating for the same reviewId', () => {
    const store: ConfidenceStore = { u1: { rating: 2, ratedAt: '2026-01-01' } };
    const next = recordConfidence(store, 'u1', 4, '2026-01-02');
    expect(next.u1).toEqual({ rating: 4, ratedAt: '2026-01-02' });
  });

  it('lets independent reviewIds coexist', () => {
    const store: ConfidenceStore = { u1: { rating: 2, ratedAt: '2026-01-01' } };
    const next = recordConfidence(store, 'u2', 5, '2026-01-02');
    expect(next.u1).toEqual({ rating: 2, ratedAt: '2026-01-01' });
    expect(next.u2).toEqual({ rating: 5, ratedAt: '2026-01-02' });
  });
});

describe('computeUnitConfidenceScores', () => {
  it('maps ratings to the 0-100 scale (rating * 20) per deck', () => {
    const confidenceByDeck: Record<string, ConfidenceStore> = {
      d1: {
        u1: { rating: 1, ratedAt: '2026-01-01' },
        u2: { rating: 5, ratedAt: '2026-01-01' },
      },
      d2: {
        u1: { rating: 3, ratedAt: '2026-01-01' },
      },
    };
    expect(computeUnitConfidenceScores(confidenceByDeck)).toEqual({
      d1: { u1: 20, u2: 100 },
      d2: { u1: 60 },
    });
  });

  it('handles an empty store', () => {
    expect(computeUnitConfidenceScores({})).toEqual({});
    expect(computeUnitConfidenceScores({ d1: {} })).toEqual({});
  });
});
