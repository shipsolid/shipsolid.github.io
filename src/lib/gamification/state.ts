// Persisted gamification config/counters. Two genuinely different shapes of "not derived":
// - fc:goals is real user config (a target the user chose) — persisting it doesn't conflict with
//   the "derive, don't store" philosophy used everywhere else in this feature.
// - fc:gamify's bankedXp/bankedReviewCount are append-only corrections for values evicted forever
//   from fc:log's 20000-event FIFO cap (see src/lib/gamification/rules.ts) — never treat them as
//   current-state derived data; they only ever grow, at the exact moment history is discarded.
//
// Both are flat settings/counters, not collection-shaped like fc:log/fc:srs:* — loadJSON here
// merges over defaults (matching pomo.astro's own settings pattern) so a future new field never
// silently reads as `undefined` for existing users.

import { loadJSON, saveJSON } from '../storage';

export const GOALS_KEY = 'fc:goals';
export const GAMIFY_KEY = 'fc:gamify';

export interface GoalsSettings {
  v: 1;
  dailyReviewTarget: number;
  weeklyDaysTarget: number;
}

export const DEFAULT_GOALS: GoalsSettings = { v: 1, dailyReviewTarget: 20, weeklyDaysTarget: 5 };

export interface GamifyState {
  v: 1;
  bankedXp: number;
  bankedReviewCount: number;
  bestStreak: number;
}

export const DEFAULT_GAMIFY: GamifyState = { v: 1, bankedXp: 0, bankedReviewCount: 0, bestStreak: 0 };

export function loadGoals(): GoalsSettings {
  return { ...DEFAULT_GOALS, ...loadJSON<Partial<GoalsSettings>>(GOALS_KEY, {}) };
}
export function saveGoals(goals: GoalsSettings): void {
  saveJSON(GOALS_KEY, goals);
}

export function loadGamifyState(): GamifyState {
  return { ...DEFAULT_GAMIFY, ...loadJSON<Partial<GamifyState>>(GAMIFY_KEY, {}) };
}
export function saveGamifyState(state: GamifyState): void {
  saveJSON(GAMIFY_KEY, state);
}
