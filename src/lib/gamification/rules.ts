// Pure gamification math (XP, levels, badges, goal progress) — no localStorage/document
// references here, same discipline as src/lib/stats/aggregate.ts. Real-importable from both
// stats.astro and FlashcardStudySession.astro.
//
// XP is naturally a cumulative-forever counter, but fc:log is FIFO-capped at 20000 events. A
// live-replay-only computation (consistent with how badges/stats are derived elsewhere) would
// make a long-term user's total XP silently shrink as old events age out from under it. Fixed by
// stamping each event's `xpAwarded` at grading time (the only moment `streakDays`/`priorEase` are
// knowable) and banking evicted events' xpAwarded into fc:gamify's `bankedXp` at trim time (see
// FlashcardStudySession.astro's appendLogEvent) — from then on, totalXp is always just a sum.

import type { Grade } from '../srs/sm2';
import { computeRecallAccuracy, computeDeckMastery } from '../stats/aggregate';
import type { ReviewEvent, DeckMeta, SrsByDeck, UnitMasteryScores } from '../stats/aggregate';
import { addDays } from '../srs/sm2';
import type { GamifyState } from './state';

export const XP_BASE = 10;
export const GRADE_XP_MULTIPLIER: Record<Grade, number> = {
  again: 0.2,
  hard: 0.6,
  good: 1.0,
  easy: 1.3,
};
export const STREAK_BONUS_PER_DAY = 0.02;
export const STREAK_BONUS_CAP = 0.5; // reached at a 25-day streak
export const HARD_CARD_EASE_THRESHOLD = 2.0; // matches review.astro's WEAK_EASE_THRESHOLD
export const HARD_CARD_BONUS = 0.15;
// Cram is unbounded (a user can replay a deck indefinitely without touching SM-2 state), so
// undamped XP would make cram-spam strictly dominant for leveling. Dampened, not blocked, since
// cram still represents genuine engagement and there's no leaderboard to "protect" — trivially
// reversible to 1 if this turns out to feel punitive.
export const CRAM_XP_MULTIPLIER = 0.25;

export interface ComputeReviewXpInput {
  grade: Grade;
  streakDays: number;
  priorEase: number | undefined;
  mode: 'due' | 'cram' | 'custom';
}

export function computeReviewXp(input: ComputeReviewXpInput): number {
  const { grade, streakDays, priorEase, mode } = input;
  const streakBonus = Math.min(streakDays * STREAK_BONUS_PER_DAY, STREAK_BONUS_CAP);
  const difficultyBonus =
    priorEase !== undefined && priorEase < HARD_CARD_EASE_THRESHOLD && grade !== 'again' ? HARD_CARD_BONUS : 0;
  const modeMultiplier = mode === 'cram' ? CRAM_XP_MULTIPLIER : 1;
  return Math.round(XP_BASE * GRADE_XP_MULTIPLIER[grade] * (1 + streakBonus + difficultyBonus) * modeMultiplier);
}

export const LEVEL_XP_COEFF = 50;

// Incremental cost of level n -> n+1 (not cumulative-from-zero): level 1->2 costs 50, 2->3 costs
// 200, 3->4 costs 450 — fast early levels, quadratically more expensive later.
export function xpForLevel(n: number): number {
  return LEVEL_XP_COEFF * n * n;
}

export interface LevelInfo {
  level: number;
  xpIntoLevel: number;
  xpForNextLevel: number;
  progressFraction: number;
}

export function levelInfo(totalXp: number): LevelInfo {
  let level = 1;
  let remaining = totalXp;
  while (remaining >= xpForLevel(level)) {
    remaining -= xpForLevel(level);
    level++;
  }
  const xpForNextLevel = xpForLevel(level);
  return {
    level,
    xpIntoLevel: remaining,
    xpForNextLevel,
    progressFraction: xpForNextLevel === 0 ? 0 : remaining / xpForNextLevel,
  };
}

export const DECK_MASTERY_BADGE_THRESHOLD = 80;

export interface GamificationStats {
  totalReviewsEver: number;
  currentStreak: number;
  bestStreak: number;
  last20Accuracy: number | null;
  masteredDeckCount: number;
  totalXp: number;
  level: number;
}

export interface Achievement {
  id: string;
  icon: string;
  label: string;
  desc: string;
  check: (s: GamificationStats) => boolean;
}

// Icons 📅/🏆/👑 and 🌱/💯/🚀 intentionally echo pomo.astro's own streak/volume tiers (visual
// family resemblance across the two tools) — every check() condition here is flashcards-native,
// not reused Pomodoro-session logic.
//
// Monotonic vs. re-lockable, deliberate: volume/streak/level badges are strictly monotonic
// (backed by a running high-water-mark or append-only sum — they never re-lock, matching
// pomo.astro's "badges are permanent" feel). sharp-recall and deck-master/polyglot are NOT
// monotonic by construction — a rolling 20-review window can regress below 100%, and this
// module's mastery formula (35% weight on a unit's last 5 events) can genuinely drop after a bad
// run. A badge could unlock and later re-lock. Accepted, not fixed — a "best mastery ever"
// ratchet per deck would need new per-deck high-water-mark persistence, real scope creep for
// what these two badges are meant to mean.
export const ACHIEVEMENTS: Achievement[] = [
  { id: 'first-card', icon: '🌱', label: 'First Card', desc: 'Complete your first review', check: (s) => s.totalReviewsEver >= 1 },
  { id: 'century', icon: '💯', label: 'Century', desc: '100 reviews all-time', check: (s) => s.totalReviewsEver >= 100 },
  { id: 'thousand-club', icon: '🚀', label: 'Thousand Club', desc: '1,000 reviews all-time', check: (s) => s.totalReviewsEver >= 1000 },
  { id: 'ten-thousand', icon: '🌌', label: 'Ten Thousand', desc: '10,000 reviews all-time', check: (s) => s.totalReviewsEver >= 10000 },
  { id: 'streak-3', icon: '📅', label: 'Consistent', desc: '3-day streak', check: (s) => s.bestStreak >= 3 },
  { id: 'streak-7', icon: '🏆', label: 'Week Warrior', desc: '7-day streak', check: (s) => s.bestStreak >= 7 },
  { id: 'streak-30', icon: '👑', label: 'Legendary', desc: '30-day streak', check: (s) => s.bestStreak >= 30 },
  { id: 'sharp-recall', icon: '🎯', label: 'Sharp Recall', desc: '100% recall over your last 20 reviews', check: (s) => s.last20Accuracy === 1 },
  { id: 'deck-master', icon: '🧠', label: 'Deck Master', desc: 'Reach 80+ mastery in a deck', check: (s) => s.masteredDeckCount >= 1 },
  { id: 'polyglot', icon: '🌐', label: 'Polyglot', desc: '80+ mastery in 3 or more decks', check: (s) => s.masteredDeckCount >= 3 },
  { id: 'level-10', icon: '⭐', label: 'Rising Star', desc: 'Reach level 10', check: (s) => s.level >= 10 },
  { id: 'level-25', icon: '✨', label: 'Ascendant', desc: 'Reach level 25', check: (s) => s.level >= 25 },
];

export interface ComputeGamificationStatsInput {
  events: ReviewEvent[];
  gamify: GamifyState;
  deckMeta: DeckMeta[];
  srsByDeck: SrsByDeck;
  unitScores: UnitMasteryScores;
  currentStreak: number; // caller already has computeStreak(dailyCounts, today) at hand
}

export function computeGamificationStats(input: ComputeGamificationStatsInput): GamificationStats {
  const { events, gamify, deckMeta, srsByDeck, unitScores, currentStreak } = input;

  const totalReviewsEver = gamify.bankedReviewCount + events.length;
  // Defensive max — in normal operation gamify.bestStreak is always >= currentStreak (updated on
  // every grade), so this is a no-op safety net, not load-bearing.
  const bestStreak = Math.max(gamify.bestStreak, currentStreak);

  const last20 = events.slice(-20);
  const last20Accuracy = last20.length >= 20 ? computeRecallAccuracy(last20) : null;

  const masteredDeckCount = deckMeta.filter((d) => {
    const score = computeDeckMastery(d.slug, d.totalReviewUnits, unitScores);
    return score !== null && score >= DECK_MASTERY_BADGE_THRESHOLD;
  }).length;

  const totalXp = gamify.bankedXp + events.reduce((sum, e) => sum + (e.xpAwarded ?? 0), 0);
  const { level } = levelInfo(totalXp);

  return { totalReviewsEver, currentStreak, bestStreak, last20Accuracy, masteredDeckCount, totalXp, level };
}

export interface GoalProgress {
  current: number;
  target: number;
  met: boolean;
  fraction: number;
}

export function computeDailyGoalProgress(dailyCounts: Record<string, number>, today: string, target: number): GoalProgress {
  const current = dailyCounts[today] ?? 0;
  return { current, target, met: current >= target, fraction: target === 0 ? 0 : Math.min(1, current / target) };
}

export interface WeeklyGoalProgress {
  daysStudied: number;
  target: number;
  met: boolean;
  fraction: number;
}

// A rolling 7-day trailing window, not calendar-aligned — mirrors computeHeatmap's own
// established "contiguous window, not calendar-aligned" convention, sidestepping
// Monday/Sunday-start ambiguity entirely.
export function computeWeeklyGoalProgress(
  dailyCounts: Record<string, number>,
  today: string,
  target: number,
  windowDays = 7
): WeeklyGoalProgress {
  let daysStudied = 0;
  for (let i = 0; i < windowDays; i++) {
    if ((dailyCounts[addDays(today, -i)] ?? 0) > 0) daysStudied++;
  }
  return { daysStudied, target, met: daysStudied >= target, fraction: target === 0 ? 0 : Math.min(1, daysStudied / target) };
}
