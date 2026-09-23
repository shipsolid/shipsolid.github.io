// Single source of truth for the blog post category taxonomy — shared by
// src/content.config.ts (schema enum) and the blog UI (labels, descriptions).
//
// Distinct from the freeform `tags[]` folksonomy on the same posts: exactly
// one category per post, drawn from this closed set, describing the *kind* of
// post it is rather than what it's about. Values are already URL-safe
// kebab-case, so the /blog/category/[category] route needs no slug transform
// (unlike /blog/tag/[tag], which slugifies arbitrary tag strings).
export const BLOG_CATEGORIES = [
  'technology',
  'educational',
  'how-to',
  'personal',
  'opinion',
  'review',
] as const;
export type BlogCategory = (typeof BLOG_CATEGORIES)[number];

export const BLOG_CATEGORY_LABELS: Record<BlogCategory, string> = {
  technology: 'Technology',
  educational: 'Educational',
  'how-to': 'How-To',
  personal: 'Personal',
  opinion: 'Opinion',
  review: 'Review',
};

export const BLOG_CATEGORY_DESCRIPTIONS: Record<BlogCategory, string> = {
  technology: 'Tools, systems, and technical deep-dives.',
  educational: 'Explainers that teach a concept or model.',
  'how-to': 'Step-by-step guides, playbooks, and frameworks.',
  personal: 'Experiences, event write-ups, and reflections.',
  opinion: 'Commentary and practitioner hot-takes.',
  review: 'Evaluations of a tool, product, or approach.',
};
