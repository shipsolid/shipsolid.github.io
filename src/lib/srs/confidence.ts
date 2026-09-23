// Self-rated confidence: a genuine, user-entered axis independent of SM-2's performance-derived
// mastery score (sm2.ts / aggregate.ts's computeUnitMasteryScores). Grading (again/hard/good/easy)
// drives scheduling; this is a separate, optional signal that never touches SM-2 state.

export type ConfidenceRating = 1 | 2 | 3 | 4 | 5;

export interface ConfidenceEntry {
  rating: ConfidenceRating;
  ratedAt: string;
}

// reviewId -> entry, one store per deck (mirrors fc:srs:<deckSlug> sharding).
export type ConfidenceStore = Record<string, ConfidenceEntry>;

export function recordConfidence(
  store: ConfidenceStore,
  reviewId: string,
  rating: ConfidenceRating,
  ratedAt: string
): ConfidenceStore {
  return { ...store, [reviewId]: { rating, ratedAt } };
}

// Produces the same generic Record<deckSlug, Record<reviewId, number>> shape as aggregate.ts's
// UnitMasteryScores, scaled 0-100 (rating * 20), so it's a drop-in argument to
// computeDeckMastery/computeTagMastery for confidence instead of duplicating those functions.
export function computeUnitConfidenceScores(
  confidenceByDeck: Record<string, ConfidenceStore>
): Record<string, Record<string, number>> {
  const scores: Record<string, Record<string, number>> = {};
  for (const [deckSlug, store] of Object.entries(confidenceByDeck)) {
    for (const [reviewId, entry] of Object.entries(store)) {
      (scores[deckSlug] ??= {})[reviewId] = entry.rating * 20;
    }
  }
  return scores;
}
