// Pure aggregation functions over the flashcards feature's localStorage data (`fc:log` +
// `fc:srs:*`). No `localStorage`/`document` references here — callers load the raw data and pass
// it in, along with an explicit `today` string, so these stay trivially testable and reusable
// from both a plain Node script and the browser.
//
// Composite-key discipline (established in Phase 3, carried forward here): `reviewId` is only
// unique *within one deck's file* — grouping across decks must always key on
// `${deckSlug}::${reviewId}`, and that composite key is only ever used as a Map/Set key, never
// parsed back apart (a bare `reviewId` can itself contain "::", e.g. "card-id::reverse").

import type { Grade, CardSrsState } from '../srs/sm2';
import { addDays, isRecalled } from '../srs/sm2';

export interface ReviewEvent {
  reviewId: string;
  deckSlug: string;
  grade: Grade;
  timestamp: number;
  elapsedMs: number;
  mode: 'due' | 'cram' | 'custom';
  // Stamped at grading time (Phase 5) — the only moment the inputs to the XP formula (streak,
  // prior ease) are actually knowable. Absent on events logged before Phase 5 shipped, which
  // correctly contribute 0 XP rather than inventing retroactive history.
  xpAwarded?: number;
}

export interface DeckMeta {
  slug: string;
  title: string;
  tags: string[];
  totalReviewUnits: number;
}

export type SrsByDeck = Record<string /* deckSlug */, Record<string /* reviewId */, CardSrsState>>;
export type UnitMasteryScores = Record<string /* deckSlug */, Record<string /* reviewId */, number>>;

export const MATURE_INTERVAL_DAYS = 21; // Anki's own "mature card" convention

function unitKey(deckSlug: string, reviewId: string): string {
  return `${deckSlug}::${reviewId}`;
}

export function dayKeyFromTimestamp(ms: number): string {
  const d = new Date(ms);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

export function computeDailyCounts(events: ReviewEvent[]): Record<string, number> {
  const out: Record<string, number> = {};
  for (const e of events) {
    const key = dayKeyFromTimestamp(e.timestamp);
    out[key] = (out[key] ?? 0) + 1;
  }
  return out;
}

// A day absent from the result had no reviews at all — distinct from "0% accuracy" — callers
// must treat `undefined` as "no data," never coerce it to 0.
export function computeDailyAccuracy(events: ReviewEvent[]): Record<string, number> {
  const byDay = new Map<string, ReviewEvent[]>();
  for (const e of events) {
    const key = dayKeyFromTimestamp(e.timestamp);
    if (!byDay.has(key)) byDay.set(key, []);
    byDay.get(key)!.push(e);
  }
  const out: Record<string, number> = {};
  for (const [day, dayEvents] of byDay) {
    out[day] = dayEvents.filter((e) => isRecalled(e.grade)).length / dayEvents.length;
  }
  return out;
}

export function filterEventsSince(events: ReviewEvent[], today: string, daysBack: number): ReviewEvent[] {
  const cutoff = addDays(today, -(daysBack - 1));
  return events.filter((e) => {
    const day = dayKeyFromTimestamp(e.timestamp);
    return day >= cutoff && day <= today;
  });
}

// --- Heatmap: 371-day contiguous window (not calendar-week-aligned), GitHub-style quartile
// buckets computed from this window's own nonzero days only, so a light user and a heavy user
// get gradients meaningful to their own activity rather than one fixed absolute scale. ---

export type HeatmapLevel = 0 | 1 | 2 | 3 | 4;
export interface HeatmapCell {
  date: string;
  count: number;
  level: HeatmapLevel;
}

function nearestRankPercentile(sorted: number[], p: number): number {
  if (sorted.length === 0) return 0;
  const idx = Math.min(sorted.length, Math.max(1, Math.ceil(p * sorted.length))) - 1;
  return sorted[idx];
}

export function computeHeatmap(dailyCounts: Record<string, number>, today: string, windowDays = 371): HeatmapCell[] {
  const raw: { date: string; count: number }[] = [];
  for (let i = windowDays - 1; i >= 0; i--) {
    const date = addDays(today, -i);
    raw.push({ date, count: dailyCounts[date] ?? 0 });
  }

  const nonZero = raw.map((c) => c.count).filter((c) => c > 0).sort((a, b) => a - b);
  const q1 = nearestRankPercentile(nonZero, 0.25);
  const q2 = nearestRankPercentile(nonZero, 0.5);
  const max = nonZero.length > 0 ? nonZero[nonZero.length - 1] : 0;

  return raw.map(({ date, count }) => {
    // count === 0 is checked first and unconditionally — avoids any 0 <= q1 false-positive when
    // there's little/no history yet (q1/q2/q3 all 0 in that case).
    // A day tied with the window's actual maximum always reaches level 4, checked before the
    // quartile bands. With few distinct values — e.g. a consistent daily habit, where every
    // active day ties for the max — nearest-rank quartiles can collapse to q1 == q2 == q3 ==
    // count; checking q1 first would then bucket every one of those days at level 1 (the
    // palest), which undercuts the exact consistency the streak/goal gamification is meant to
    // reward. Comparing against the max directly ensures a tied-for-best day is always the
    // hottest color, regardless of how the quartiles happen to fall.
    let level: HeatmapLevel = 0;
    if (count > 0) {
      if (count >= max) level = 4;
      else if (count <= q1) level = 1;
      else if (count <= q2) level = 2;
      else level = 3;
    }
    return { date, count, level };
  });
}

// --- Streak: today with zero reviews yet doesn't break the streak (today isn't over), but
// doesn't extend it either — the backward walk simply starts from yesterday in that case. ---

export function computeStreak(dailyCounts: Record<string, number>, today: string): number {
  let streak = 0;
  let cursor = dailyCounts[today] ? today : addDays(today, -1);
  while ((dailyCounts[cursor] ?? 0) > 0) {
    streak++;
    cursor = addDays(cursor, -1);
  }
  return streak;
}

export function computeTotalLearningTimeMs(events: ReviewEvent[]): number {
  return events.reduce((sum, e) => sum + e.elapsedMs, 0);
}

export function computeAvgElapsedMs(events: ReviewEvent[]): number | null {
  if (events.length === 0) return null;
  return computeTotalLearningTimeMs(events) / events.length;
}

export function computeRecallAccuracy(events: ReviewEvent[]): number | null {
  if (events.length === 0) return null;
  return events.filter((e) => isRecalled(e.grade)).length / events.length;
}

export interface LearningCounts {
  total: number;
  new: number;
  learning: number;
  mature: number;
}

// `new` is derived by subtraction (deck metadata carries only a review-unit *count*, not a
// reviewId list, to keep stats.astro's frontmatter light). Known limitation: if a deck's YAML
// later drops a card id that already has stored progress, that stale entry still counts toward
// mature/learning, silently deflating `new` — a pre-existing content-drift class of risk, not
// introduced or solved here.
export function computeLearningCounts(srsByDeck: SrsByDeck, deckMeta: DeckMeta[]): LearningCounts {
  const total = deckMeta.reduce((sum, d) => sum + d.totalReviewUnits, 0);
  let mature = 0;
  let learning = 0;
  for (const cards of Object.values(srsByDeck)) {
    for (const state of Object.values(cards)) {
      if (state.interval >= MATURE_INTERVAL_DAYS) mature++;
      else learning++;
    }
  }
  return { total, new: Math.max(0, total - (mature + learning)), learning, mature };
}

export interface DifficultUnit {
  deckSlug: string;
  reviewId: string;
  ease: number;
  interval: number;
  lapses: number;
  dueDate: string;
}

function allUnitsFlat(srsByDeck: SrsByDeck): DifficultUnit[] {
  const out: DifficultUnit[] = [];
  for (const [deckSlug, cards] of Object.entries(srsByDeck)) {
    for (const [reviewId, state] of Object.entries(cards)) {
      out.push({ deckSlug, reviewId, ease: state.ease, interval: state.interval, lapses: state.lapses, dueDate: state.dueDate });
    }
  }
  return out;
}

// Two separate lists, not one blended difficulty score — mirrors review.astro's own existing
// Weak-cards (low ease) vs. Forgotten-cards (recent lapses) distinction.
export function computeMostLapsedUnits(srsByDeck: SrsByDeck, topN = 10): DifficultUnit[] {
  return allUnitsFlat(srsByDeck)
    .filter((u) => u.lapses > 0)
    .sort((a, b) => b.lapses - a.lapses || a.ease - b.ease)
    .slice(0, topN);
}

export function computeLowestEaseUnits(srsByDeck: SrsByDeck, topN = 10): DifficultUnit[] {
  return allUnitsFlat(srsByDeck)
    .sort((a, b) => a.ease - b.ease)
    .slice(0, topN);
}

// --- Mastery score: 0-100 per review-unit. 50% interval-maturity, 35% recent accuracy (last 5
// events for that specific unit), 15% lifetime lapse-rate. Tunable weights, not derived
// constants. ---

export function computeUnitMasteryScores(srsByDeck: SrsByDeck, events: ReviewEvent[]): UnitMasteryScores {
  const groups = new Map<string, ReviewEvent[]>();
  const touched = new Map<string, { deckSlug: string; reviewId: string }>();

  for (const e of events) {
    const key = unitKey(e.deckSlug, e.reviewId);
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key)!.push(e);
    if (!touched.has(key)) touched.set(key, { deckSlug: e.deckSlug, reviewId: e.reviewId });
  }
  for (const list of groups.values()) list.sort((a, b) => a.timestamp - b.timestamp);

  // A cram-only-reviewed unit has events but no SRS entry (FlashcardStudySession's cram path
  // logs without ever writing SRS state) — union both sources rather than trusting either alone.
  for (const [deckSlug, cards] of Object.entries(srsByDeck)) {
    for (const reviewId of Object.keys(cards)) {
      const key = unitKey(deckSlug, reviewId);
      if (!touched.has(key)) touched.set(key, { deckSlug, reviewId });
    }
  }

  const scores: UnitMasteryScores = {};
  for (const [key, { deckSlug, reviewId }] of touched) {
    const state = srsByDeck[deckSlug]?.[reviewId];
    const group = groups.get(key) ?? [];

    const maturity = state ? Math.min(1, state.interval / MATURE_INTERVAL_DAYS) : 0;

    const last5 = group.slice(-5);
    const recentAccuracy = last5.length ? last5.filter((e) => isRecalled(e.grade)).length / last5.length : 0;

    let lapseComponent: number;
    if (group.length > 0) {
      const againCount = group.filter((e) => e.grade === 'again').length;
      lapseComponent = 1 - againCount / group.length;
    } else if (state) {
      // The event log's history for this unit was evicted by fc:log's 20000-event FIFO cap —
      // fall back to the SRS state's own lapse ratio (a coarser but still reasonable proxy).
      lapseComponent = 1 - Math.min(1, state.lapses / Math.max(1, state.repetitions + state.lapses));
    } else {
      lapseComponent = 0;
    }

    const score = Math.round(100 * (0.5 * maturity + 0.35 * recentAccuracy + 0.15 * lapseComponent));
    (scores[deckSlug] ??= {})[reviewId] = score;
  }
  return scores;
}

export function computeDeckMastery(deckSlug: string, totalReviewUnits: number, unitScores: UnitMasteryScores): number | null {
  if (totalReviewUnits === 0) return null;
  const scores = unitScores[deckSlug] ?? {};
  const sum = Object.values(scores).reduce((s, v) => s + v, 0);
  return sum / totalReviewUnits;
}

// Weighted by review-unit count across member decks (not a flat mean-of-deck-means) — a tag
// spanning one huge deck and one tiny deck should weight proportionally to card count.
export function computeTagMastery(tag: string, deckMeta: DeckMeta[], unitScores: UnitMasteryScores): number | null {
  const memberDecks = deckMeta.filter((d) => d.tags.includes(tag));
  const totalUnits = memberDecks.reduce((s, d) => s + d.totalReviewUnits, 0);
  if (totalUnits === 0) return null;
  let sum = 0;
  for (const deck of memberDecks) {
    const scores = unitScores[deck.slug] ?? {};
    sum += Object.values(scores).reduce((s, v) => s + v, 0);
  }
  return sum / totalUnits;
}

export interface ProgressRow {
  key: string;
  label: string;
  kind: 'deck' | 'tag';
  totalReviewUnits: number;
  matureCount: number;
  masteryScore: number | null;
  confidenceScore: number | null;
  nextDueCount: number;
}

function countMature(cards: Record<string, CardSrsState>): number {
  return Object.values(cards).filter((s) => s.interval >= MATURE_INTERVAL_DAYS).length;
}
function countDue(cards: Record<string, CardSrsState>, today: string): number {
  return Object.values(cards).filter((s) => s.dueDate <= today).length;
}

export function computeDeckProgress(
  deckMeta: DeckMeta[],
  srsByDeck: SrsByDeck,
  unitScores: UnitMasteryScores,
  today: string,
  confidenceScores: Record<string, Record<string, number>>
): ProgressRow[] {
  return deckMeta.map((deck) => {
    const cards = srsByDeck[deck.slug] ?? {};
    return {
      key: deck.slug,
      label: deck.title,
      kind: 'deck',
      totalReviewUnits: deck.totalReviewUnits,
      matureCount: countMature(cards),
      masteryScore: computeDeckMastery(deck.slug, deck.totalReviewUnits, unitScores),
      confidenceScore: computeDeckMastery(deck.slug, deck.totalReviewUnits, confidenceScores),
      nextDueCount: countDue(cards, today),
    };
  });
}

// Two separate tables (deck vs. tag) at the call site — interleaving e.g. a deck named
// "Fan-Out" with a tag "fan-out" in one sorted list is confusing UX for no benefit.
export function computeTagProgress(
  deckMeta: DeckMeta[],
  srsByDeck: SrsByDeck,
  unitScores: UnitMasteryScores,
  today: string,
  confidenceScores: Record<string, Record<string, number>>
): ProgressRow[] {
  const allTags = [...new Set(deckMeta.flatMap((d) => d.tags))].sort();
  return allTags.map((tag) => {
    const memberDecks = deckMeta.filter((d) => d.tags.includes(tag));
    const totalReviewUnits = memberDecks.reduce((s, d) => s + d.totalReviewUnits, 0);
    let matureCount = 0;
    let nextDueCount = 0;
    for (const deck of memberDecks) {
      const cards = srsByDeck[deck.slug] ?? {};
      matureCount += countMature(cards);
      nextDueCount += countDue(cards, today);
    }
    return {
      key: tag,
      label: tag,
      kind: 'tag',
      totalReviewUnits,
      matureCount,
      masteryScore: computeTagMastery(tag, deckMeta, unitScores),
      confidenceScore: computeTagMastery(tag, deckMeta, confidenceScores),
      nextDueCount,
    };
  });
}

// --- Forecast: 14-day window + one leading "overdue" bucket. Anything already past due lands
// in that single bucket regardless of how overdue, so a multi-day gap never misreads as a false
// "today" spike. Never-graded ("new") units are excluded — they have no dueDate concept yet. ---

export interface ForecastBucket {
  date: string | 'overdue';
  count: number;
}

export function computeForecast(srsByDeck: SrsByDeck, today: string, windowDays = 14): ForecastBucket[] {
  const buckets = new Map<string, number>();
  buckets.set('overdue', 0);
  for (let i = 0; i < windowDays; i++) buckets.set(addDays(today, i), 0);
  const horizon = addDays(today, windowDays - 1);

  for (const cards of Object.values(srsByDeck)) {
    for (const state of Object.values(cards)) {
      if (state.dueDate < today) buckets.set('overdue', (buckets.get('overdue') ?? 0) + 1);
      else if (state.dueDate <= horizon) buckets.set(state.dueDate, (buckets.get(state.dueDate) ?? 0) + 1);
      // else beyond the window — not counted anywhere, by design (bounded forecast)
    }
  }

  return [...buckets.entries()].map(([date, count]) => ({ date, count }));
}

// --- Trends: 30 rolling-average points by default — "7-day" describes the smoothing window,
// not the sparkline length; 7 points would barely show a shape. ---

export interface TrendPoint {
  date: string;
  value: number | null;
}

// Reviews: an absent day is a real 0 (always included in the window average).
export function computeReviewsTrend(dailyCounts: Record<string, number>, today: string, points = 30): TrendPoint[] {
  const windowDays = 7;
  const result: TrendPoint[] = [];
  for (let i = points - 1; i >= 0; i--) {
    const date = addDays(today, -i);
    let sum = 0;
    for (let j = 0; j < windowDays; j++) sum += dailyCounts[addDays(date, -j)] ?? 0;
    result.push({ date, value: sum / windowDays });
  }
  return result;
}

// Accuracy: an absent day is "no data" (excluded from both numerator and denominator) — if every
// day in a trailing window is absent, that point is `null`, never a fake 0%.
export function computeAccuracyTrend(events: ReviewEvent[], today: string, points = 30): TrendPoint[] {
  const dailyAccuracy = computeDailyAccuracy(events);
  const windowDays = 7;
  const result: TrendPoint[] = [];
  for (let i = points - 1; i >= 0; i--) {
    const date = addDays(today, -i);
    let sum = 0;
    let count = 0;
    for (let j = 0; j < windowDays; j++) {
      const v = dailyAccuracy[addDays(date, -j)];
      if (v !== undefined) {
        sum += v;
        count++;
      }
    }
    result.push({ date, value: count === 0 ? null : sum / count });
  }
  return result;
}
