// Single source of truth for site chrome — the primary header nav, the
// per-section sub-nav strips, and the footer's social links. Header.astro and
// Footer.astro used to carry these as literal arrays each; keeping them here
// means adding a section (or a social link) is a one-file edit and the two
// components can't drift.

import { TOOL_FAMILIES } from './tools';

export interface NavLink {
  href: string;
  label: string;
}

// Primary desktop + mobile nav. Flashcards is deliberately kept out of this
// bar — it's reached via its own sub-nav strip. Notes and Gita are their own
// independently-deployed products now (still reachable at /notes/* and
// /gita/* on the domain) — linked out from here rather than owned by this
// site's build.
export const PRIMARY_NAV: readonly NavLink[] = [
  { href: '/#about', label: 'About' },
  { href: '/#projects', label: 'Projects' },
  { href: '/#stack', label: 'Stack' },
  { href: '/blog', label: 'Blog' },
  { href: '/tools', label: 'Tools' },
  { href: '/gita', label: 'Bhagavad Gita' },
  { href: '/notes', label: 'Notes' },
];

// Second nav strip shown on /flashcards/* — surfaces sibling knowledge tools
// that have no home in the primary bar without crowding it.
export const NOTES_NAV: readonly NavLink[] = [
  { href: '/flashcards', label: 'Flashcards' },
];

// Second nav strip shown on /tools and /tools/* — family jump-links to the
// index's <section> anchors, plus an "All" reset. Derived from the same
// manifest the /tools index renders from.
export const TOOLS_NAV: readonly NavLink[] = [
  ...TOOL_FAMILIES.map((f) => ({ href: `/tools#${f.id}`, label: f.label })),
  { href: '/tools', label: 'All' },
];

export type SubNav = 'tools' | 'notes' | null;

// Which second-row strip (if any) a given path gets. Centralised so the header
// offset (scroll-padding / <main> top padding) can key off the same decision.
export function subNavFor(pathname: string): SubNav {
  if (pathname === '/tools' || pathname.startsWith('/tools/')) return 'tools';
  if (pathname.startsWith('/flashcards')) return 'notes';
  return null;
}

export const FOOTER_SOCIALS: readonly (NavLink & { icon: string })[] = [
  {
    label: 'GitHub',
    href: 'https://github.com/shipsolid',
    icon: `<svg viewBox="0 0 24 24" fill="currentColor" class="w-5 h-5"><path d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z"/></svg>`,
  },
  {
    label: 'LinkedIn',
    href: 'https://linkedin.com/in/amitsingh007s',
    icon: `<svg viewBox="0 0 24 24" fill="currentColor" class="w-5 h-5"><path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 01-2.063-2.065 2.064 2.064 0 112.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/></svg>`,
  },
  {
    label: 'Email',
    href: 'mailto:amitsingh007s@gmail.com',
    icon: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="w-5 h-5"><path stroke-linecap="round" stroke-linejoin="round" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"/></svg>`,
  },
];
