import { defineCollection, z } from 'astro:content';
import { glob } from 'astro/loaders';
import { BLOG_CATEGORIES } from './lib/blog-categories';

// No `generateId` overrides below: the glob loader's default already runs each path
// segment through github-slugger and strips a trailing `/index`, which is byte-for-byte
// the rule the pre-Content-Layer `entry.slug` used. Verified across every entry —
// each `id` equals the slug that produced the current route list.
//
// `[^_]*` reproduces the other half of the old contract: the legacy content-collection
// loader silently skipped underscore-prefixed files, and five `_template.md` scaffolds
// rely on that (a plain `**/*.md` would publish them as real pages).

const blog = defineCollection({
  loader: glob({ pattern: '**/[^_]*.md', base: './src/content/blog' }),
  schema: z.object({
    title: z.string(),
    description: z.string(),
    pubDate: z.coerce.date(),
    updatedDate: z.coerce.date().optional(),
    // Curated post *kind*, exactly one, required — see src/lib/blog-categories.ts.
    // Orthogonal to the freeform `tags[]` below (which is about subject matter).
    category: z.enum(BLOG_CATEGORIES),
    tags: z.array(z.string()).default([]),
    draft: z.boolean().default(false),
    readTime: z.number().optional(),
    cover: z.string().optional(),
  }).strict(),
});

const projects = defineCollection({
  loader: glob({ pattern: '**/[^_]*.md', base: './src/content/projects' }),
  schema: z.object({
    title: z.string(),
    description: z.string(),
    tags: z.array(z.string()).default([]),
    github: z.string().optional(),
    demo: z.string().optional(),
    // Set when the project's write-up lives on its own site (a separate deploy this
    // portfolio doesn't own, e.g. https://signal-forge.shipsolid.workers.dev/). The
    // /projects and homepage cards link straight here, and
    // src/pages/projects/[slug].astro skips route generation for the entry — there
    // is no local prose page to render.
    externalUrl: z.string().optional(),
    status: z.enum(['active', 'archived', 'wip']).default('active'),
    featured: z.boolean().default(false),
    order: z.number().default(99),
    // Headline, resume-bullet-style outcomes — rendered as a scannable
    // "Impact" callout, separate from the prose body's own Architecture /
    // Trade-offs / Lessons Learned `##` sections.
    results: z.array(z.string()).default([]),
  }).strict(),
});

// Stable per-card identity, author-assigned. Unique only within a single deck file (checked
// below), not across the whole collection — SRS/review-log state is always namespaced by
// deckSlug, so cross-deck id collisions are harmless. Without this, reordering a deck's YAML
// would silently corrupt a visitor's stored spaced-repetition progress (the old schema only had
// positional {q, a} pairs, tracked by array index).
const cardId = z
  .string()
  .min(1)
  .regex(/^[a-z0-9]+(-[a-z0-9]+)*$/, 'card id must be a lowercase kebab-case slug, e.g. "fan-out-definition"');

const cardBase = z.object({
  id: cardId,
  source: z.string().optional(),
  hint: z.string().optional(),
});

const basicCard = cardBase.extend({
  type: z.literal('basic'),
  q: z.string(),
  a: z.string(),
  // Runtime-expanded into a second, independently-scheduled review unit (see
  // src/lib/srs/units.ts) rather than authored as a separate card, so forward/backward recall
  // text never drifts out of sync.
  autoReverse: z.boolean().default(false),
});

const clozeCard = cardBase.extend({
  type: z.literal('cloze'),
  // Anki-style {{cN::answer}} markers; each distinct N becomes its own review unit.
  text: z.string(),
});

const mcqCard = cardBase.extend({
  type: z.literal('mcq'),
  question: z.string(),
  options: z.array(z.string()).min(2),
  correctIndex: z.number().int().min(0),
});

const trueFalseCard = cardBase.extend({
  type: z.literal('true-false'),
  statement: z.string(),
  answer: z.boolean(),
});

const fillBlankCard = cardBase.extend({
  type: z.literal('fill-blank'),
  // Must contain a literal "___" placeholder.
  text: z.string(),
  answer: z.string(),
});

const typingCard = cardBase.extend({
  type: z.literal('typing'),
  prompt: z.string(),
  answer: z.string(),
});

const codeCard = cardBase.extend({
  type: z.literal('code'),
  q: z.string(),
  lang: z.string(),
  code: z.string(),
});

const mermaidCard = cardBase.extend({
  type: z.literal('mermaid'),
  q: z.string(),
  diagram: z.string(),
});

const mathCard = cardBase.extend({
  type: z.literal('math'),
  q: z.string(),
  expr: z.string(),
  format: z.literal('latex').default('latex'),
});

const card = z.discriminatedUnion('type', [
  basicCard,
  clozeCard,
  mcqCard,
  trueFalseCard,
  fillBlankCard,
  typingCard,
  codeCard,
  mermaidCard,
  mathCard,
]);

const CLOZE_MARKER_RE = /\{\{c\d+::[^}]+\}\}/;

const cards = z
  .array(card)
  .min(1)
  .superRefine((cards, ctx) => {
    const seenIds = new Set<string>();
    cards.forEach((c, i) => {
      if (seenIds.has(c.id)) {
        ctx.addIssue({
          code: 'custom',
          path: [i, 'id'],
          message: `duplicate card id "${c.id}" — ids must be unique within a deck`,
        });
      }
      seenIds.add(c.id);

      if (c.type === 'cloze' && !CLOZE_MARKER_RE.test(c.text)) {
        ctx.addIssue({
          code: 'custom',
          path: [i, 'text'],
          message: 'cloze card text must contain at least one {{cN::answer}} marker',
        });
      }
      if (c.type === 'mcq' && c.correctIndex >= c.options.length) {
        ctx.addIssue({
          code: 'custom',
          path: [i, 'correctIndex'],
          message: `correctIndex (${c.correctIndex}) is out of range for ${c.options.length} options`,
        });
      }
      if (c.type === 'fill-blank' && !c.text.includes('___')) {
        ctx.addIssue({
          code: 'custom',
          path: [i, 'text'],
          message: 'fill-blank card text must contain a literal "___" placeholder',
        });
      }
    });
  });

const flashcards = defineCollection({
  loader: glob({ pattern: '**/[^_]*.yaml', base: './src/content/flashcards' }),
  // `.strict()` matches the other five collections, and here it also closes an id-hijack
  // trap: a stray top-level `slug:` key would be picked up by the glob loader's
  // generateIdDefault short-circuit and silently become the deck's entry id, moving its
  // route and its `fc:srs:*` / `fc:confidence:*` localStorage keys with no error.
  schema: z.object({
    title: z.string(),
    description: z.string().optional(),
    tags: z.array(z.string()).default([]),
    cards,
  }).strict(),
});

export const collections = { blog, projects, flashcards };
