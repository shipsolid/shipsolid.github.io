// Build-time-only rendering helpers for flashcard card content. Never imported from a
// client <script> — every client script on this site is either `define:vars` (inline,
// unbundled) or `is:inline` CDN import, neither of which can resolve a local module import.
//
// Reuses Astro's own internal markdown processor (@astrojs/markdown-remark) rather than a
// hand-rolled unified pipeline, so flashcard content gets identical Shiki/GFM behavior to
// blog/notes for free. This is an internal, undocumented Astro package — accepted risk,
// pinned explicitly in package.json.

import { createMarkdownProcessor } from '@astrojs/markdown-remark';
import { codeToHtml } from 'shiki';
import katex from 'katex';
import { remarkCallouts } from './remark-callouts';

const THEME = 'github-dark'; // matches astro.config.mjs's implicit default (no shikiConfig override)

let processorPromise: ReturnType<typeof createMarkdownProcessor> | null = null;
function getProcessor() {
  return (processorPromise ??= createMarkdownProcessor({
    syntaxHighlight: 'shiki',
    shikiConfig: { theme: THEME },
    remarkPlugins: [remarkCallouts],
    gfm: true,
  }));
}

export async function renderCardMarkdown(source: string): Promise<string> {
  const processor = await getProcessor();
  const { code } = await processor.render(source);
  return code.trim();
}

// For phrasing-only contexts (e.g. MCQ option labels) — strips a single wrapping <p>...</p>.
// Only correct when `source` renders to exactly one paragraph; falls back to the full output
// (including the <p>) for anything else rather than mangling multi-block content.
export async function renderInlineMarkdown(source: string): Promise<string> {
  const html = await renderCardMarkdown(source);
  const match = /^<p>([\s\S]*)<\/p>$/.exec(html);
  return match ? match[1] : html;
}

// Bypasses markdown entirely — code is guaranteed-verbatim, and going through the markdown
// pipeline would mean fence-escaping gymnastics for no benefit.
export async function renderCodeBlock(code: string, lang: string): Promise<string> {
  try {
    return await codeToHtml(code, { lang, theme: THEME });
  } catch {
    return await codeToHtml(code, { lang: 'text', theme: THEME });
  }
}

// Bypasses markdown entirely — diagram syntax (e.g. `-->`) would otherwise misparse.
// Matches the exact shape Astro's own markdown pipeline emits for fenced ```mermaid blocks,
// so MermaidRenderer's `pre[data-language="mermaid"]` selector needs no special-casing.
export function renderMermaidBlock(diagram: string): string {
  return `<pre data-language="mermaid"><code>${escapeHtml(diagram)}</code></pre>`;
}

// Bypasses markdown entirely — raw LaTeX (`_`, `*`, `{}`, `\`) would otherwise misparse.
export function renderMathBlock(expr: string): string {
  return katex.renderToString(expr, { throwOnError: false, displayMode: true });
}

export function escapeHtml(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}
