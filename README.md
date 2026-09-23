# \_shipsolid.github.io

The public Astro site behind **<https://shipsolid.github.io>** — portfolio homepage, blog,
flashcards, and ~35 self-hosted engineering tools: a lighter hub linking out to the independent
gita/notes products. Self-contained: its own `package.json`, unrelated to the rest of the monorepo's
tooling. (Both the Bhagavad Gita reader and Notes — plus `/search` and its Pagefind index — were
extracted into their own standalone repos, `shipsolid/gita` and `shipsolid/notes`. Each still lands
at `/gita/*` / `/notes/*` on the domain via its own repo's GitHub Pages deployment, but neither is
part of this site's build anymore.)

## Commands

```bash
npm install
npm run dev        # localhost:4321 — NOTE: does not serve src/content/ images
npm run build      # full static build, 123 pages, well under a minute
npm run preview    # serve dist/ — use this to check images, OG tags
npm test           # vitest (src/lib/**/*.test.ts)
npm run check      # astro check — type errors (362 pre-existing; not a CI gate yet)
```

## Layout

| Path                     | What                                                                                                                                                                                                                                     |
| ------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `src/pages/`             | Routes. Standalone pages wrap `src/layouts/Page.astro`; content pages use `BlogPost` / `ToolLayout`, which also wrap `Page`.                                                                                                             |
| `src/layouts/Page.astro` | The one shell: `Base` + `Header` + `<main id="main">` + `Footer`. `<main>` top padding is derived from `subNavFor(pathname)`.                                                                                                            |
| `src/components/`        | Flat. Shell, homepage sections, blog UI.                                                                                                                                                                                                 |
| `src/lib/`               | Pure logic + `*.test.ts`. `tools/`, `srs/`, `pomo/`, `k8s-explainer/` are foldered.                                                                                                                                                      |
| `src/data/`              | Manifests: `nav.ts` (all site chrome), `tools.ts` (the tools workbench).                                                                                                                                                                 |
| `src/content/`           | Collections: `blog`, `projects`, `flashcards` (`data`). Schemas + rationale in `src/content.config.ts` — all `.strict()`.                                                                                                                |
| `src/styles/global.css`  | The whole Tailwind 4 config (`@theme`, `@source`, the `light:` `@custom-variant`, `@utility`) plus design tokens (`--color-*-rgb` triplets), `@layer base/components`, print + reduced-motion resets. There is no `tailwind.config.mjs`. |

## Conventions

- **Theme:** dark is the unprefixed default; light is opt-in via `data-theme="light"` + the Tailwind
  `light:` variant. First visit defaults to light (OS preference ignored).
- **Colours:** use the semantic Tailwind tokens — `text-ink/body/muted/dim/faint`, `bg-surface`,
  `border-line`, `text-accent`, `text-success` — not raw `text-slate-*`. They're CSS-var-backed so
  opacity modifiers work.
- **Column standard:** `.doc-grid` / `.doc-grid-2` in `global.css` own the 3-column doc layout (300
  / minmax(1000px,1fr) / 300 at the `3xl` = 1760px shell). Don't re-hand-roll the grid string.
- **Client JS:** every script is either inline `define:vars` or `is:inline` CDN import — neither can
  resolve a local module. Build-time-only helpers (e.g. `src/lib/content/markdown.ts`) are the
  exception and are never imported from a `<script>`.
- **Motion:** guard animations behind `prefers-reduced-motion` (global reset in `global.css` +
  per-component `matchMedia` checks).
- **Env:** copy `.env.example` → `.env`; leave blank locally. Real `PUBLIC_*` values are GitHub
  Actions secrets in CI.

## Deploy

Push to `main` touching `_shipsolid.github.io/**` →
`.github/workflows/shipsolid-portfolio-deploy.yml` runs tests + checks + `npm run build`, then
force-pushes `dist/` to `shipsolid/shipsolid.github.io`. ~4–6 min. See
[`blog-usage.md`](blog-usage.md) for the post-authoring workflow.
