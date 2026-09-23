// GitHub-style callouts: a blockquote whose first line is `[!NOTE]`, `[!TIP]`, `[!WARNING]`,
// `[!IMPORTANT]`, or `[!CAUTION]`. Transforms the blockquote into a styled <div> via the
// standard mdast -> hast override (node.data.hName/hProperties), rather than emitting a
// different node type — keeps the blockquote's own children/formatting intact.
//
// Scoped to the flashcards markdown pipeline only (src/lib/content/markdown.ts) — not
// registered in astro.config.mjs, so blog/notes rendering is unaffected.

import { visit } from 'unist-util-visit';

const CALLOUT_RE = /^\[!(NOTE|TIP|WARNING|IMPORTANT|CAUTION)\]\s*/i;

export function remarkCallouts() {
  return (tree: any) => {
    visit(tree, 'blockquote', (node: any) => {
      const firstChild = node.children?.[0];
      if (!firstChild || firstChild.type !== 'paragraph') return;
      const firstText = firstChild.children?.[0];
      if (!firstText || firstText.type !== 'text') return;

      const match = CALLOUT_RE.exec(firstText.value);
      if (!match) return;

      const kind = match[1].toLowerCase();
      firstText.value = firstText.value.slice(match[0].length);
      if (firstText.value === '') firstChild.children.shift();

      node.data = node.data || {};
      node.data.hName = 'div';
      node.data.hProperties = { className: ['callout', `callout-${kind}`] };
      node.children.unshift({
        type: 'paragraph',
        data: { hName: 'p', hProperties: { className: ['callout-title'] } },
        children: [{ type: 'text', value: kind.charAt(0).toUpperCase() + kind.slice(1) }],
      });
    });
  };
}
