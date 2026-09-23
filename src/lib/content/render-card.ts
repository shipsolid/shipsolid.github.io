// Resolves every review unit (see src/lib/srs/units.ts) into pre-rendered front/back HTML plus
// an optional self-check interaction spec, at build time. Runs sequentially (not Promise.all)
// to avoid any concurrent first-use race on Shiki's on-demand language loading — build-time
// latency isn't a concern at this scale.

import type { CollectionEntry } from 'astro:content';
import type { ReviewUnit } from '../srs/units';
import {
  renderCardMarkdown,
  renderInlineMarkdown,
  renderCodeBlock,
  renderMermaidBlock,
  renderMathBlock,
  escapeHtml,
} from './markdown';

export type FlashCard = CollectionEntry<'flashcards'>['data']['cards'][number];

export type InteractiveSpec =
  | { kind: 'mcq'; optionsHtml: string[]; correctIndex: number }
  | { kind: 'true-false'; correct: boolean }
  | { kind: 'text'; correctAnswer: string }; // shared by fill-blank + typing

export interface ResolvedReviewUnit {
  reviewId: string;
  deckSlug: string;
  frontHtml: string;
  backHtml: string;
  interactive: InteractiveSpec | null;
}

// Inert to CommonMark (not `_`/`*`/backtick-based), astronomically unlikely in authored
// content — survives markdown parsing untouched so it can be string-replaced post-render.
const BLANK_TOKEN = '⟦BLANK⟧'; // "⟦BLANK⟧"

const CLOZE_MARKER = /\{\{c(\d+)::([^}]+)\}\}/g;

function maskedBlankHtml(): string {
  return '<span class="masked-blank" role="text" aria-label="blank">•••</span>';
}

function maskedAnswerHtml(answer: string): string {
  return `<span class="masked-answer">${escapeHtml(answer)}</span>`;
}

function firstAnswerForGroup(text: string, n: number): string {
  for (const m of text.matchAll(CLOZE_MARKER)) {
    if (Number(m[1]) === n) return m[2];
  }
  return '';
}

async function renderClozeVariant(text: string, activeN: number) {
  const answer = firstAnswerForGroup(text, activeN);
  // Non-active groups reveal as plain text so they participate in normal markdown flow; the
  // active group becomes a token, rendered once and then split two ways below. Note: if the
  // same group number appears more than once with differing answer text (unusual authoring),
  // every occurrence is revealed using this one `answer` value — an accepted simplification.
  const source = text.replace(CLOZE_MARKER, (_m, n, groupAnswer) =>
    Number(n) === activeN ? BLANK_TOKEN : groupAnswer
  );
  const rendered = await renderCardMarkdown(source);
  return {
    frontHtml: rendered.split(BLANK_TOKEN).join(maskedBlankHtml()),
    backHtml: rendered.split(BLANK_TOKEN).join(maskedAnswerHtml(answer)),
  };
}

async function renderFillBlankPair(text: string, answer: string) {
  const source = text.replace('___', BLANK_TOKEN);
  const rendered = await renderCardMarkdown(source);
  return {
    frontHtml: rendered.split(BLANK_TOKEN).join(maskedBlankHtml()),
    backHtml: rendered.split(BLANK_TOKEN).join(maskedAnswerHtml(answer)),
  };
}

type RenderResult = { frontHtml: string; backHtml: string; interactive: InteractiveSpec | null };

async function renderBasic(card: Extract<FlashCard, { type: 'basic' }>, variant: ReviewUnit['variant']): Promise<RenderResult> {
  const qHtml = await renderCardMarkdown(card.q);
  const aHtml = await renderCardMarkdown(card.a);
  return variant === 'reverse'
    ? { frontHtml: aHtml, backHtml: qHtml, interactive: null }
    : { frontHtml: qHtml, backHtml: aHtml, interactive: null };
}

async function renderMcq(card: Extract<FlashCard, { type: 'mcq' }>): Promise<RenderResult> {
  const frontHtml = await renderCardMarkdown(card.question);
  const optionsHtml: string[] = [];
  for (const opt of card.options) optionsHtml.push(await renderInlineMarkdown(opt));
  const correctLetter = String.fromCharCode(65 + card.correctIndex);
  const backHtml = `<p>Correct: <strong>${correctLetter}.</strong> ${optionsHtml[card.correctIndex]}</p>`;
  return { frontHtml, backHtml, interactive: { kind: 'mcq', optionsHtml, correctIndex: card.correctIndex } };
}

async function renderTrueFalse(card: Extract<FlashCard, { type: 'true-false' }>): Promise<RenderResult> {
  const frontHtml = await renderCardMarkdown(card.statement);
  const backHtml = `<p>${card.answer ? 'True' : 'False'}</p>`;
  return { frontHtml, backHtml, interactive: { kind: 'true-false', correct: card.answer } };
}

async function renderTyping(card: Extract<FlashCard, { type: 'typing' }>): Promise<RenderResult> {
  const frontHtml = await renderCardMarkdown(card.prompt);
  const backHtml = await renderCardMarkdown(card.answer);
  return { frontHtml, backHtml, interactive: { kind: 'text', correctAnswer: card.answer.trim() } };
}

async function renderCode(card: Extract<FlashCard, { type: 'code' }>): Promise<RenderResult> {
  const frontHtml = await renderCardMarkdown(card.q);
  const backHtml = await renderCodeBlock(card.code, card.lang);
  return { frontHtml, backHtml, interactive: null };
}

async function renderMermaid(card: Extract<FlashCard, { type: 'mermaid' }>): Promise<RenderResult> {
  const frontHtml = await renderCardMarkdown(card.q);
  const backHtml = renderMermaidBlock(card.diagram);
  return { frontHtml, backHtml, interactive: null };
}

async function renderMath(card: Extract<FlashCard, { type: 'math' }>): Promise<RenderResult> {
  const frontHtml = await renderCardMarkdown(card.q);
  const backHtml = renderMathBlock(card.expr);
  return { frontHtml, backHtml, interactive: null };
}

export async function renderReviewUnits(cards: FlashCard[], units: ReviewUnit[], deckSlug: string): Promise<ResolvedReviewUnit[]> {
  const cardsById = new Map(cards.map((c) => [c.id, c]));
  const resolved: ResolvedReviewUnit[] = [];

  for (const unit of units) {
    const card = cardsById.get(unit.cardId)!;
    let result: RenderResult;

    switch (card.type) {
      case 'basic':
        result = await renderBasic(card, unit.variant);
        break;
      case 'cloze': {
        const n = Number(unit.variant.slice(1));
        const { frontHtml, backHtml } = await renderClozeVariant(card.text, n);
        result = { frontHtml, backHtml, interactive: null };
        break;
      }
      case 'mcq':
        result = await renderMcq(card);
        break;
      case 'true-false':
        result = await renderTrueFalse(card);
        break;
      case 'fill-blank': {
        const { frontHtml, backHtml } = await renderFillBlankPair(card.text, card.answer);
        result = { frontHtml, backHtml, interactive: { kind: 'text', correctAnswer: card.answer.trim() } };
        break;
      }
      case 'typing':
        result = await renderTyping(card);
        break;
      case 'code':
        result = await renderCode(card);
        break;
      case 'mermaid':
        result = await renderMermaid(card);
        break;
      case 'math':
        result = await renderMath(card);
        break;
      default: {
        const exhaustiveCheck: never = card;
        throw new Error(`Unhandled card type: ${JSON.stringify(exhaustiveCheck)}`);
      }
    }

    resolved.push({ reviewId: unit.reviewId, deckSlug, ...result });
  }

  return resolved;
}
