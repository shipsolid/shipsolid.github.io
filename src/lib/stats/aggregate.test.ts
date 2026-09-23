import { describe, expect, it } from 'vitest';
import {
  computeAccuracyTrend,
  computeAvgElapsedMs,
  computeDailyAccuracy,
  computeDailyCounts,
  computeDeckMastery,
  computeDeckProgress,
  computeForecast,
  computeHeatmap,
  computeLearningCounts,
  computeLowestEaseUnits,
  computeMostLapsedUnits,
  computeRecallAccuracy,
  computeReviewsTrend,
  computeStreak,
  computeTagMastery,
  computeTagProgress,
  computeTotalLearningTimeMs,
  computeUnitMasteryScores,
  dayKeyFromTimestamp,
  filterEventsSince,
} from './aggregate';
import type { DeckMeta, ReviewEvent, SrsByDeck } from './aggregate';
import type { CardSrsState } from '../srs/sm2';

function ts(y: number, m: number, d: number): number {
  return new Date(y, m, d).getTime();
}

function makeEvent(overrides: Partial<ReviewEvent> = {}): ReviewEvent {
  return {
    reviewId: 'r1',
    deckSlug: 'deck-a',
    grade: 'good',
    timestamp: 0,
    elapsedMs: 0,
    mode: 'due',
    ...overrides,
  };
}

function makeState(overrides: Partial<CardSrsState> = {}): CardSrsState {
  return { reviewId: 'r1', ease: 2.5, interval: 0, repetitions: 0, dueDate: '2026-01-01', lapses: 0, ...overrides };
}

describe('dayKeyFromTimestamp', () => {
  it('formats a timestamp as a zero-padded YYYY-MM-DD local date', () => {
    expect(dayKeyFromTimestamp(ts(2026, 0, 5))).toBe('2026-01-05');
    expect(dayKeyFromTimestamp(ts(2026, 8, 3))).toBe('2026-09-03');
  });
});

describe('computeDailyCounts', () => {
  it('groups events by their local calendar day', () => {
    const events = [
      makeEvent({ timestamp: ts(2026, 0, 5) }),
      makeEvent({ timestamp: ts(2026, 0, 5) }),
      makeEvent({ timestamp: ts(2026, 0, 6) }),
    ];
    expect(computeDailyCounts(events)).toEqual({ '2026-01-05': 2, '2026-01-06': 1 });
  });
});

describe('computeDailyAccuracy', () => {
  it('computes a per-day recall fraction and omits days with no events', () => {
    const events = [
      makeEvent({ timestamp: ts(2026, 0, 5), grade: 'good' }),
      makeEvent({ timestamp: ts(2026, 0, 5), grade: 'good' }),
      makeEvent({ timestamp: ts(2026, 0, 5), grade: 'again' }),
    ];
    const result = computeDailyAccuracy(events);
    expect(result['2026-01-05']).toBeCloseTo(2 / 3);
    expect(result['2026-01-06']).toBeUndefined();
  });
});

describe('filterEventsSince', () => {
  it('keeps events within an inclusive [today - (daysBack-1), today] window', () => {
    const events = [
      makeEvent({ reviewId: 'before', timestamp: ts(2026, 0, 7) }),
      makeEvent({ reviewId: 'lower-bound', timestamp: ts(2026, 0, 8) }),
      makeEvent({ reviewId: 'middle', timestamp: ts(2026, 0, 9) }),
      makeEvent({ reviewId: 'today', timestamp: ts(2026, 0, 10) }),
      makeEvent({ reviewId: 'after', timestamp: ts(2026, 0, 11) }),
    ];
    const result = filterEventsSince(events, '2026-01-10', 3);
    expect(result.map((e) => e.reviewId)).toEqual(['lower-bound', 'middle', 'today']);
  });
});

describe('computeHeatmap', () => {
  it('buckets counts into quartile levels 0-4 across a spread of values', () => {
    const dailyCounts = { '2026-01-02': 1, '2026-01-03': 2, '2026-01-04': 3, '2026-01-05': 4 };
    const heatmap = computeHeatmap(dailyCounts, '2026-01-05', 5);
    expect(heatmap.map((c) => c.level)).toEqual([0, 1, 2, 3, 4]);
    expect(heatmap.map((c) => c.date)).toEqual([
      '2026-01-01',
      '2026-01-02',
      '2026-01-03',
      '2026-01-04',
      '2026-01-05',
    ]);
  });

  it('gives every day tied for the window maximum level 4, even when quartiles collapse', () => {
    const dailyCounts = { '2026-01-01': 5, '2026-01-02': 5, '2026-01-03': 5 };
    const heatmap = computeHeatmap(dailyCounts, '2026-01-03', 3);
    expect(heatmap.every((c) => c.level === 4)).toBe(true);
  });
});

describe('computeStreak', () => {
  it('continues counting backward from yesterday when today has no reviews yet', () => {
    const dailyCounts = { '2026-01-04': 1, '2026-01-03': 1 };
    expect(computeStreak(dailyCounts, '2026-01-05')).toBe(2);
  });

  it('includes today in the streak when today already has a review', () => {
    const dailyCounts = { '2026-01-05': 1, '2026-01-04': 1 };
    expect(computeStreak(dailyCounts, '2026-01-05')).toBe(2);
  });

  it('reports a zero streak when yesterday also had no reviews', () => {
    expect(computeStreak({}, '2026-01-05')).toBe(0);
  });
});

describe('computeTotalLearningTimeMs / computeAvgElapsedMs', () => {
  it('sums elapsed time across events and averages it', () => {
    const events = [makeEvent({ elapsedMs: 1000 }), makeEvent({ elapsedMs: 2000 }), makeEvent({ elapsedMs: 3000 })];
    expect(computeTotalLearningTimeMs(events)).toBe(6000);
    expect(computeAvgElapsedMs(events)).toBe(2000);
  });

  it('returns null average for an empty event list', () => {
    expect(computeAvgElapsedMs([])).toBeNull();
  });
});

describe('computeRecallAccuracy', () => {
  it('returns null for an empty event list', () => {
    expect(computeRecallAccuracy([])).toBeNull();
  });

  it('computes the recalled fraction otherwise', () => {
    const events = [makeEvent({ grade: 'good' }), makeEvent({ grade: 'again' }), makeEvent({ grade: 'good' })];
    expect(computeRecallAccuracy(events)).toBeCloseTo(2 / 3);
  });
});

describe('computeLearningCounts', () => {
  it('derives new by subtracting mature+learning from the deck-declared total', () => {
    const deckMeta: DeckMeta[] = [{ slug: 'd1', title: 'D1', tags: [], totalReviewUnits: 10 }];
    const srsByDeck: SrsByDeck = {
      d1: { u1: makeState({ interval: 25 }), u2: makeState({ interval: 5 }) },
    };
    const result = computeLearningCounts(srsByDeck, deckMeta);
    expect(result).toEqual({ total: 10, mature: 1, learning: 1, new: 8 });
  });

  it('floors new at zero when stale SRS entries outnumber the declared total', () => {
    const deckMeta: DeckMeta[] = [{ slug: 'd1', title: 'D1', tags: [], totalReviewUnits: 1 }];
    const srsByDeck: SrsByDeck = {
      d1: { u1: makeState({ interval: 25 }), u2: makeState({ interval: 5 }) },
    };
    const result = computeLearningCounts(srsByDeck, deckMeta);
    expect(result.new).toBe(0);
  });
});

describe('computeMostLapsedUnits / computeLowestEaseUnits', () => {
  const srsByDeck: SrsByDeck = {
    d1: {
      a: makeState({ ease: 2.0, lapses: 3 }),
      b: makeState({ ease: 2.5, lapses: 5 }),
      c: makeState({ ease: 1.5, lapses: 5 }),
    },
  };

  it('ranks by lapses desc, breaking ties by ease asc', () => {
    const result = computeMostLapsedUnits(srsByDeck);
    expect(result.map((u) => u.reviewId)).toEqual(['c', 'b', 'a']);
  });

  it('ranks purely by ease asc, independent of lapses', () => {
    const result = computeLowestEaseUnits(srsByDeck);
    expect(result.map((u) => u.reviewId)).toEqual(['c', 'a', 'b']);
  });

  it('respects topN', () => {
    expect(computeLowestEaseUnits(srsByDeck, 1)).toHaveLength(1);
  });

  it('excludes units with zero lapses from the most-lapsed list', () => {
    const withUnlapsed: SrsByDeck = { d1: { ...srsByDeck.d1, d: makeState({ ease: 3.0, lapses: 0 }) } };
    const result = computeMostLapsedUnits(withUnlapsed);
    expect(result.find((u) => u.reviewId === 'd')).toBeUndefined();
  });
});

describe('computeUnitMasteryScores', () => {
  it('scores a normally-reviewed unit from maturity, recent accuracy, and lapse rate', () => {
    const srsByDeck: SrsByDeck = { d1: { u1: makeState({ interval: 21, lapses: 0 }) } };
    const events: ReviewEvent[] = [
      makeEvent({ deckSlug: 'd1', reviewId: 'u1', grade: 'good' }),
      makeEvent({ deckSlug: 'd1', reviewId: 'u1', grade: 'good' }),
    ];
    const scores = computeUnitMasteryScores(srsByDeck, events);
    expect(scores.d1.u1).toBe(100);
  });

  it('scores a cram-only unit (events but no SRS state) with zero maturity', () => {
    const events: ReviewEvent[] = [makeEvent({ deckSlug: 'd1', reviewId: 'u1', grade: 'good', mode: 'cram' })];
    const scores = computeUnitMasteryScores({}, events);
    expect(scores.d1.u1).toBe(50);
  });

  it('falls back to the SRS lapse ratio when a unit has state but its event history was evicted', () => {
    const srsByDeck: SrsByDeck = { d1: { u1: makeState({ interval: 21, repetitions: 4, lapses: 1 }) } };
    const scores = computeUnitMasteryScores(srsByDeck, []);
    expect(scores.d1.u1).toBe(62);
  });
});

describe('computeDeckMastery', () => {
  it('returns null for a deck with zero declared review units', () => {
    expect(computeDeckMastery('d1', 0, {})).toBeNull();
  });

  it('averages scored units over the full declared total, not just scored units', () => {
    const unitScores = { d1: { u1: 80, u2: 60 } };
    // 3 declared units, only 2 ever scored — the unreviewed 3rd effectively counts as 0.
    expect(computeDeckMastery('d1', 3, unitScores)).toBeCloseTo(140 / 3);
  });
});

describe('computeTagMastery', () => {
  it('returns null when no deck carries the tag', () => {
    expect(computeTagMastery('missing-tag', [], {})).toBeNull();
  });

  it('weights by each member deck\'s review-unit count, not a flat mean of deck averages', () => {
    const deckMeta: DeckMeta[] = [
      { slug: 'd1', title: 'D1', tags: ['t1'], totalReviewUnits: 2 },
      { slug: 'd2', title: 'D2', tags: ['t1'], totalReviewUnits: 8 },
    ];
    const unitScores = { d1: { u1: 100, u2: 80 }, d2: { u1: 80 } };
    expect(computeTagMastery('t1', deckMeta, unitScores)).toBeCloseTo((180 + 80) / 10);
  });
});

describe('computeDeckProgress / computeTagProgress', () => {
  const deckMeta: DeckMeta[] = [{ slug: 'd1', title: 'Deck 1', tags: ['t1'], totalReviewUnits: 2 }];
  const srsByDeck: SrsByDeck = {
    d1: {
      u1: makeState({ interval: 25, dueDate: '2026-01-01' }),
      u2: makeState({ interval: 5, dueDate: '2026-01-10' }),
    },
  };
  const unitScores = { d1: { u1: 90, u2: 40 } };
  const confidenceScores = { d1: { u1: 100, u2: 60 } };

  it('computes per-deck rows', () => {
    const result = computeDeckProgress(deckMeta, srsByDeck, unitScores, '2026-01-05', confidenceScores);
    expect(result).toEqual([
      {
        key: 'd1',
        label: 'Deck 1',
        kind: 'deck',
        totalReviewUnits: 2,
        matureCount: 1,
        masteryScore: 65,
        confidenceScore: 80,
        nextDueCount: 1,
      },
    ]);
  });

  it('computes per-tag rows aggregated across member decks', () => {
    const result = computeTagProgress(deckMeta, srsByDeck, unitScores, '2026-01-05', confidenceScores);
    expect(result).toEqual([
      {
        key: 't1',
        label: 't1',
        kind: 'tag',
        totalReviewUnits: 2,
        matureCount: 1,
        masteryScore: 65,
        confidenceScore: 80,
        nextDueCount: 1,
      },
    ]);
  });

  it('scores unrated cards as 0 (not null) when confidence data is empty, mirroring masteryScore', () => {
    const result = computeDeckProgress(deckMeta, srsByDeck, unitScores, '2026-01-05', {});
    expect(result[0].confidenceScore).toBe(0);
  });
});

describe('computeForecast', () => {
  it('buckets overdue cards separately and excludes anything beyond the window', () => {
    const srsByDeck: SrsByDeck = {
      d1: {
        overdue: makeState({ dueDate: '2026-01-05' }),
        today: makeState({ dueDate: '2026-01-10' }),
        atHorizon: makeState({ dueDate: '2026-01-23' }),
        beyond: makeState({ dueDate: '2026-01-24' }),
      },
    };
    const forecast = computeForecast(srsByDeck, '2026-01-10', 14);
    const byDate = new Map(forecast.map((b) => [b.date, b.count]));
    expect(byDate.get('overdue')).toBe(1);
    expect(byDate.get('2026-01-10')).toBe(1);
    expect(byDate.get('2026-01-23')).toBe(1);
    expect(byDate.has('2026-01-24')).toBe(false);
    expect(forecast).toHaveLength(15); // 1 overdue bucket + 14 day buckets
  });
});

describe('computeReviewsTrend', () => {
  it('averages review counts over a trailing 7-day window per point', () => {
    const dailyCounts = { '2026-01-10': 7 };
    const trend = computeReviewsTrend(dailyCounts, '2026-01-10', 3);
    expect(trend).toEqual([
      { date: '2026-01-08', value: 0 },
      { date: '2026-01-09', value: 0 },
      { date: '2026-01-10', value: 1 },
    ]);
  });
});

describe('computeAccuracyTrend', () => {
  it('reports null for a point whose entire trailing window has no accuracy data', () => {
    const events = [makeEvent({ timestamp: ts(2026, 0, 10), grade: 'good' }), makeEvent({ timestamp: ts(2026, 0, 10), grade: 'again' })];
    const trend = computeAccuracyTrend(events, '2026-01-10', 2);
    expect(trend[0]).toEqual({ date: '2026-01-09', value: null });
    expect(trend[1].date).toBe('2026-01-10');
    expect(trend[1].value).toBeCloseTo(0.5);
  });
});
