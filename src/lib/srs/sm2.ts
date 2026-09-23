// Textbook SM-2 spaced-repetition scheduler. Deliberately does not implement Anki-style
// same-day "learning steps" — that's session-only queue-reinsertion logic living in the study
// page instead (see src/pages/flashcards/[...deck].astro), keeping this module a pure,
// cross-session scheduler.
//
// FlashcardStudySession.astro's study-session script imports this module directly (via a plain
// bundled <script>, with server props passed through a JSON data island rather than
// `define:vars`) — there is no separate hand-transcribed copy to keep in sync anymore.

export type Grade = 'again' | 'hard' | 'good' | 'easy';

export interface CardSrsState {
  reviewId: string;
  ease: number;
  interval: number;
  repetitions: number;
  dueDate: string; // "YYYY-MM-DD", local calendar date
  lapses: number;
}

const MIN_EASE = 1.3;
const DEFAULT_EASE = 2.5;

export const GRADE_TO_QUALITY: Record<Grade, 0 | 3 | 4 | 5> = {
  again: 0,
  hard: 3,
  good: 4,
  easy: 5,
};

export function createCardState(reviewId: string, today: string): CardSrsState {
  return { reviewId, ease: DEFAULT_EASE, interval: 0, repetitions: 0, dueDate: today, lapses: 0 };
}

export function addDays(dateStr: string, days: number): string {
  const d = new Date(`${dateStr}T00:00:00`);
  d.setDate(d.getDate() + Math.round(days));
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

export function schedule(state: CardSrsState, grade: Grade, today: string): CardSrsState {
  const quality = GRADE_TO_QUALITY[grade];
  const nextEase = Math.max(
    MIN_EASE,
    state.ease + (0.1 - (5 - quality) * (0.08 + (5 - quality) * 0.02))
  );

  if (quality < 3) {
    return {
      ...state,
      ease: nextEase,
      repetitions: 0,
      interval: 1,
      dueDate: addDays(today, 1),
      lapses: state.lapses + 1,
    };
  }

  const repetitions = state.repetitions + 1;
  const interval = repetitions === 1 ? 1 : repetitions === 2 ? 6 : Math.round(state.interval * nextEase);

  return {
    ...state,
    ease: nextEase,
    repetitions,
    interval,
    dueDate: addDays(today, interval),
  };
}

export function isDue(state: CardSrsState | undefined, today: string): boolean {
  if (!state) return true; // never graded == "new", always eligible
  return state.dueDate <= today;
}

export function isRecalled(grade: Grade): boolean {
  return grade !== 'again';
}
