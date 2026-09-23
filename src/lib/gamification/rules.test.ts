import { describe, expect, it } from 'vitest';
import {
  ACHIEVEMENTS,
  computeDailyGoalProgress,
  computeGamificationStats,
  computeReviewXp,
  computeWeeklyGoalProgress,
  levelInfo,
  xpForLevel,
} from './rules';
import type { GamificationStats } from './rules';
import type { DeckMeta, ReviewEvent, SrsByDeck, UnitMasteryScores } from '../stats/aggregate';
import type { GamifyState } from './state';

describe('computeReviewXp', () => {
  it('scales base XP by the grade multiplier with no bonuses', () => {
    expect(computeReviewXp({ grade: 'again', streakDays: 0, priorEase: undefined, mode: 'due' })).toBe(2);
    expect(computeReviewXp({ grade: 'hard', streakDays: 0, priorEase: undefined, mode: 'due' })).toBe(6);
    expect(computeReviewXp({ grade: 'good', streakDays: 0, priorEase: undefined, mode: 'due' })).toBe(10);
    expect(computeReviewXp({ grade: 'easy', streakDays: 0, priorEase: undefined, mode: 'due' })).toBe(13);
  });

  it('adds a streak bonus proportional to streak length', () => {
    expect(computeReviewXp({ grade: 'good', streakDays: 10, priorEase: undefined, mode: 'due' })).toBe(12);
  });

  it('caps the streak bonus at a 25-day streak', () => {
    const at25 = computeReviewXp({ grade: 'good', streakDays: 25, priorEase: undefined, mode: 'due' });
    const at100 = computeReviewXp({ grade: 'good', streakDays: 100, priorEase: undefined, mode: 'due' });
    expect(at25).toBe(15);
    expect(at100).toBe(at25);
  });

  it('adds a difficulty bonus only when priorEase is below threshold and the grade is not "again"', () => {
    const withBonus = computeReviewXp({ grade: 'good', streakDays: 0, priorEase: 1.5, mode: 'due' });
    const withoutBonusHighEase = computeReviewXp({ grade: 'good', streakDays: 0, priorEase: 2.5, mode: 'due' });
    expect(withBonus).toBe(12);
    expect(withoutBonusHighEase).toBe(10);
  });

  it('withholds the difficulty bonus on an "again" grade even with a low prior ease', () => {
    const again = computeReviewXp({ grade: 'again', streakDays: 0, priorEase: 1.5, mode: 'due' });
    expect(again).toBe(2);
  });

  it('dampens XP in cram mode', () => {
    expect(computeReviewXp({ grade: 'good', streakDays: 0, priorEase: undefined, mode: 'cram' })).toBe(3);
  });
});

describe('xpForLevel', () => {
  it('grows quadratically with level number', () => {
    expect(xpForLevel(1)).toBe(50);
    expect(xpForLevel(2)).toBe(200);
    expect(xpForLevel(3)).toBe(450);
  });
});

describe('levelInfo', () => {
  it('starts at level 1 with zero XP', () => {
    expect(levelInfo(0)).toEqual({ level: 1, xpIntoLevel: 0, xpForNextLevel: 50, progressFraction: 0 });
  });

  it('computes partial progress within the current level', () => {
    const info = levelInfo(30);
    expect(info.level).toBe(1);
    expect(info.xpIntoLevel).toBe(30);
    expect(info.progressFraction).toBeCloseTo(0.6);
  });

  it('rolls over to the next level exactly at the level boundary', () => {
    expect(levelInfo(50)).toEqual({ level: 2, xpIntoLevel: 0, xpForNextLevel: 200, progressFraction: 0 });
  });

  it('rolls over multiple levels when total XP covers several level costs', () => {
    // level 1->2 costs 50, level 2->3 costs 200: 250 total XP reaches level 3 exactly.
    expect(levelInfo(250)).toEqual({ level: 3, xpIntoLevel: 0, xpForNextLevel: 450, progressFraction: 0 });
  });
});

describe('computeGamificationStats', () => {
  function makeGamify(overrides: Partial<GamifyState> = {}): GamifyState {
    return { v: 1, bankedXp: 0, bankedReviewCount: 0, bestStreak: 0, ...overrides };
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

  it('combines banked and live review counts', () => {
    const stats = computeGamificationStats({
      events: [makeEvent(), makeEvent()],
      gamify: makeGamify({ bankedReviewCount: 5 }),
      deckMeta: [],
      srsByDeck: {},
      unitScores: {},
      currentStreak: 0,
    });
    expect(stats.totalReviewsEver).toBe(7);
  });

  it('reports the higher of gamify.bestStreak and the live currentStreak', () => {
    const stats = computeGamificationStats({
      events: [],
      gamify: makeGamify({ bestStreak: 2 }),
      deckMeta: [],
      srsByDeck: {},
      unitScores: {},
      currentStreak: 9,
    });
    expect(stats.bestStreak).toBe(9);
  });

  it('reports last20Accuracy as null until at least 20 events exist', () => {
    const stats = computeGamificationStats({
      events: Array.from({ length: 19 }, () => makeEvent({ grade: 'good' })),
      gamify: makeGamify(),
      deckMeta: [],
      srsByDeck: {},
      unitScores: {},
      currentStreak: 0,
    });
    expect(stats.last20Accuracy).toBeNull();
  });

  it('computes last20Accuracy over exactly the last 20 events once the threshold is met', () => {
    const events = [
      ...Array.from({ length: 5 }, () => makeEvent({ grade: 'again' })),
      ...Array.from({ length: 20 }, () => makeEvent({ grade: 'good' })),
    ];
    const stats = computeGamificationStats({
      events,
      gamify: makeGamify(),
      deckMeta: [],
      srsByDeck: {},
      unitScores: {},
      currentStreak: 0,
    });
    expect(stats.last20Accuracy).toBe(1);
  });

  it('counts a deck as mastered only once its mastery score reaches the badge threshold', () => {
    const deckMeta: DeckMeta[] = [
      { slug: 'deck-a', title: 'A', tags: [], totalReviewUnits: 2 },
      { slug: 'deck-b', title: 'B', tags: [], totalReviewUnits: 2 },
    ];
    const unitScores: UnitMasteryScores = {
      'deck-a': { u1: 90, u2: 90 },
      'deck-b': { u1: 50, u2: 50 },
    };
    const stats = computeGamificationStats({
      events: [],
      gamify: makeGamify(),
      deckMeta,
      srsByDeck: {} as SrsByDeck,
      unitScores,
      currentStreak: 0,
    });
    expect(stats.masteredDeckCount).toBe(1);
  });

  it('sums banked XP with live events XP for the total, driving the derived level', () => {
    const stats = computeGamificationStats({
      events: [makeEvent({ xpAwarded: 100 })],
      gamify: makeGamify({ bankedXp: 150 }),
      deckMeta: [],
      srsByDeck: {},
      unitScores: {},
      currentStreak: 0,
    });
    expect(stats.totalXp).toBe(250);
    expect(stats.level).toBe(3);
  });
});

describe('computeDailyGoalProgress', () => {
  it('reports unmet progress below the target', () => {
    const progress = computeDailyGoalProgress({ '2026-01-05': 5 }, '2026-01-05', 20);
    expect(progress).toEqual({ current: 5, target: 20, met: false, fraction: 0.25 });
  });

  it('reports the goal as met once current reaches the target', () => {
    const progress = computeDailyGoalProgress({ '2026-01-05': 20 }, '2026-01-05', 20);
    expect(progress.met).toBe(true);
    expect(progress.fraction).toBe(1);
  });

  it('treats a day with no reviews as zero, not undefined', () => {
    const progress = computeDailyGoalProgress({}, '2026-01-05', 20);
    expect(progress.current).toBe(0);
  });
});

describe('computeWeeklyGoalProgress', () => {
  it('counts only distinct days with at least one review in the trailing window', () => {
    const dailyCounts = { '2026-01-05': 3, '2026-01-04': 1, '2026-01-01': 2 };
    const progress = computeWeeklyGoalProgress(dailyCounts, '2026-01-05', 5, 7);
    expect(progress.daysStudied).toBe(3);
    expect(progress.met).toBe(false);
  });

  it('reports the goal as met once enough distinct days are covered', () => {
    const dailyCounts = { '2026-01-05': 1, '2026-01-04': 1, '2026-01-03': 1 };
    const progress = computeWeeklyGoalProgress(dailyCounts, '2026-01-05', 3, 7);
    expect(progress.met).toBe(true);
  });
});

describe('ACHIEVEMENTS', () => {
  function makeStats(overrides: Partial<GamificationStats> = {}): GamificationStats {
    return {
      totalReviewsEver: 0,
      currentStreak: 0,
      bestStreak: 0,
      last20Accuracy: null,
      masteredDeckCount: 0,
      totalXp: 0,
      level: 1,
      ...overrides,
    };
  }

  it('unlocks First Card at exactly 1 review, not 0', () => {
    const firstCard = ACHIEVEMENTS.find((a) => a.id === 'first-card')!;
    expect(firstCard.check(makeStats({ totalReviewsEver: 0 }))).toBe(false);
    expect(firstCard.check(makeStats({ totalReviewsEver: 1 }))).toBe(true);
  });

  it('gates streak achievements on bestStreak, not currentStreak', () => {
    const weekWarrior = ACHIEVEMENTS.find((a) => a.id === 'streak-7')!;
    expect(weekWarrior.check(makeStats({ currentStreak: 7, bestStreak: 2 }))).toBe(false);
    expect(weekWarrior.check(makeStats({ currentStreak: 1, bestStreak: 7 }))).toBe(true);
  });

  it('requires exactly 100% recent recall for Sharp Recall', () => {
    const sharpRecall = ACHIEVEMENTS.find((a) => a.id === 'sharp-recall')!;
    expect(sharpRecall.check(makeStats({ last20Accuracy: 0.95 }))).toBe(false);
    expect(sharpRecall.check(makeStats({ last20Accuracy: 1 }))).toBe(true);
  });

  it('requires 3+ mastered decks for Polyglot but only 1 for Deck Master', () => {
    const deckMaster = ACHIEVEMENTS.find((a) => a.id === 'deck-master')!;
    const polyglot = ACHIEVEMENTS.find((a) => a.id === 'polyglot')!;
    const twoMastered = makeStats({ masteredDeckCount: 2 });
    expect(deckMaster.check(twoMastered)).toBe(true);
    expect(polyglot.check(twoMastered)).toBe(false);
    expect(polyglot.check(makeStats({ masteredDeckCount: 3 }))).toBe(true);
  });
});
