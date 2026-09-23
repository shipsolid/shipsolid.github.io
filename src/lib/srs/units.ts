// Expands authored cards into independently-schedulable "review units". Most card types are a
// 1:1 mapping (reviewId === card id); autoReverse basics and cloze cards fan out into multiple
// units so forward/backward recall and each cloze deletion get their own SM-2 state.
//
// Runs at build time (Astro frontmatter) only — pure content transformation, no localStorage.

import type { CollectionEntry } from 'astro:content';

export type FlashCard = CollectionEntry<'flashcards'>['data']['cards'][number];

export interface ReviewUnit {
  reviewId: string;
  cardId: string;
  variant: 'default' | 'reverse' | `c${number}`;
}

const CLOZE_MARKER = /\{\{c(\d+)::[^}]+\}\}/g;

export function expandReviewUnits(cards: FlashCard[]): ReviewUnit[] {
  const units: ReviewUnit[] = [];

  for (const card of cards) {
    if (card.type === 'basic' && card.autoReverse) {
      units.push({ reviewId: card.id, cardId: card.id, variant: 'default' });
      units.push({ reviewId: `${card.id}::reverse`, cardId: card.id, variant: 'reverse' });
      continue;
    }

    if (card.type === 'cloze') {
      const groupNumbers = new Set<number>();
      for (const match of card.text.matchAll(CLOZE_MARKER)) {
        groupNumbers.add(Number(match[1]));
      }
      for (const n of groupNumbers) {
        units.push({ reviewId: `${card.id}::c${n}`, cardId: card.id, variant: `c${n}` });
      }
      continue;
    }

    units.push({ reviewId: card.id, cardId: card.id, variant: 'default' });
  }

  return units;
}
