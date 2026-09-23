import { describe, expect, it } from 'vitest';
import { expandReviewUnits } from './units';
import type { FlashCard } from './units';

function basic(id: string, autoReverse = false): FlashCard {
  return { id, type: 'basic', q: 'q', a: 'a', autoReverse } as FlashCard;
}

function cloze(id: string, text: string): FlashCard {
  return { id, type: 'cloze', text } as FlashCard;
}

function mcq(id: string): FlashCard {
  return { id, type: 'mcq', question: 'q', options: ['a', 'b'], correctIndex: 0 } as FlashCard;
}

describe('expandReviewUnits', () => {
  it('expands a plain basic card into a single default-variant unit', () => {
    const units = expandReviewUnits([basic('card-1')]);
    expect(units).toEqual([{ reviewId: 'card-1', cardId: 'card-1', variant: 'default' }]);
  });

  it('expands an autoReverse basic card into default + reverse units', () => {
    const units = expandReviewUnits([basic('card-1', true)]);
    expect(units).toEqual([
      { reviewId: 'card-1', cardId: 'card-1', variant: 'default' },
      { reviewId: 'card-1::reverse', cardId: 'card-1', variant: 'reverse' },
    ]);
  });

  it('expands a single-cloze card into one unit', () => {
    const units = expandReviewUnits([cloze('card-1', 'The {{c1::answer}} is here.')]);
    expect(units).toEqual([{ reviewId: 'card-1::c1', cardId: 'card-1', variant: 'c1' }]);
  });

  it('expands a multi-cloze card into one unit per distinct group number', () => {
    const units = expandReviewUnits([cloze('card-1', '{{c1::a}} and {{c2::b}}')]);
    expect(units).toEqual([
      { reviewId: 'card-1::c1', cardId: 'card-1', variant: 'c1' },
      { reviewId: 'card-1::c2', cardId: 'card-1', variant: 'c2' },
    ]);
  });

  it('dedupes repeated occurrences of the same cloze group number', () => {
    const units = expandReviewUnits([cloze('card-1', '{{c1::a}} ... {{c1::a again}}')]);
    expect(units).toEqual([{ reviewId: 'card-1::c1', cardId: 'card-1', variant: 'c1' }]);
  });

  it('expands every other card type into a single default-variant unit', () => {
    const units = expandReviewUnits([mcq('card-1')]);
    expect(units).toEqual([{ reviewId: 'card-1', cardId: 'card-1', variant: 'default' }]);
  });

  it('preserves input order across a mixed array of card types', () => {
    const units = expandReviewUnits([basic('a'), cloze('b', '{{c1::x}}'), mcq('c')]);
    expect(units.map((u) => u.reviewId)).toEqual(['a', 'b::c1', 'c']);
  });

  it('returns an empty array for an empty card list', () => {
    expect(expandReviewUnits([])).toEqual([]);
  });
});
