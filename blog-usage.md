# shipsolid.github.io — Blog Usage Guide

The blog is an Astro 4 static site living at `_shipsolid.github.io/`. Posts are Markdown files.
Deployment is fully automated via GitHub Actions.

---

## Directory layout

```
_shipsolid.github.io/
├── src/
│   └── content/
│       └── blog/
│           └── 2026-Q2/               ← quarter bucket (create new ones as needed)
│               ├── diagrams/          ← co-located diagram PNGs (one per quarter)
│               │   ├── my-diagram.png
│               │   └── ...
│               ├── 2026.05.25-my-post.md
│               └── ...
├── public/                            ← fully static assets (favicons, og-image, etc.)
├── astro.config.mjs
└── package.json
```

Quarter buckets: `2026-Q1` (Jan–Mar), `2026-Q2` (Apr–Jun), `2026-Q3` (Jul–Sep), `2026-Q4` (Oct–Dec).
Create the next quarter directory when you write the first post that falls into it.

---

## Creating a new post

### 1. Name the file

```
src/content/blog/<YEAR-Qn>/<YYYY.MM.DD-kebab-slug>.md
```

Example: `src/content/blog/2026-Q3/2026.07.10-alloy-pipeline-cardinality-gate.md`

### 2. Frontmatter

```yaml
---
title: "Your Post Title Here"
description: "One or two sentences that appear in the card and OG meta. Be specific."
pubDate: 2026-07-10
updatedDate: 2026-07-15        # optional — shows "Updated" badge
tags: ["Grafana", "Alloy", "FinOps"]
readTime: 8                    # minutes — estimate manually
draft: false                   # true = built but not listed; useful for WIP
---
```

**Required:** `title`, `description`, `pubDate`, `tags`, `draft` **Optional:** `updatedDate`,
`readTime`, `cover` (OG image path under `public/`)

`draft: true` posts are excluded from the blog index and tag pages but still build — useful for
previewing before publishing.

### 3. Write the body

Standard GitHub-flavoured Markdown. The layout applies Tailwind Typography (`prose-invert`) so
headings, code blocks, tables, and blockquotes all render with no extra work.

Tag pages are auto-generated from whatever strings you put in `tags:`. Use title-case consistently
(`"Platform Engineering"`, not `"platform engineering"`).

---

## Adding diagrams

Diagrams are **pre-rendered PNGs** co-located with the post's quarter directory. Do not use SVG —
Mermaid SVGs use `<foreignObject>` which browsers block when loaded via `<img>`.

### Render a diagram

You need: Chromium (`/usr/bin/chromium-browser`) and the render tooling at `/tmp/mermaid-render/`.

**One-time setup** (if `/tmp/mermaid-render/` doesn't exist):

```bash
mkdir -p /tmp/mermaid-render && cd /tmp/mermaid-render
npm init -y
npm install puppeteer-core mermaid
```

Copy `render-png.mjs` from the session history, or write a new one — see the pattern below.

**Write the diagram source** as a `.mmd` file:

```
# /tmp/mermaid-render/my-diagram.mmd
flowchart TD
    A["products.yml"] --> B["module.computed"]
    B --> C["environments/main.tf"]
    C --> D["grafana.cloud"]
    C --> E["grafana.instance"]
```

**Render tips:**

- Use `["double-quoted labels"]` for any label with special characters.
- Use `<br/>` inside double-quoted labels for multiline text — no `\n`, no `·`.
- No `{`, `}`, `[[`, `]]`, `<b>`, `<i>` inside labels — these break the Mermaid parser.
- For disconnected subgraphs that should stack vertically, add `L1 ~~~ L2` invisible edges between
  them.

**Render to PNG** (2× for retina):

```bash
cd /tmp/mermaid-render
node render-png.mjs   # renders all .mmd files listed in the script
# or run render-single.mjs for one file
```

**Copy to the repo:**

```bash
cp /tmp/mermaid-render/my-diagram.png \
   _shipsolid.github.io/src/content/blog/2026-Q3/diagrams/
```

**Reference in the post:**

```md
![Alt text describing the diagram](./diagrams/my-diagram.png)
```

Astro automatically converts PNGs to WebP at build time (content-hashed, cached by CDN).

---

## Local preview

The **dev server** (`npm run dev`) does not serve images from `src/content/` — images appear broken
in dev. Always use the build + preview flow to check diagrams:

```bash
cd _shipsolid.github.io
npm run build && npm run preview
```

Then open `http://localhost:4321`.

The build renders the whole site (123 pages), so it's well under a minute. Run it any time you want
to verify the final output.

---

## Publishing

Deployment is fully automatic. No manual steps beyond a git push.

```
git add _shipsolid.github.io/src/content/blog/...
git commit -m "post: <slug>"
git push origin main
```

GitHub Actions (`.github/workflows/shipsolid-portfolio-deploy.yml`) triggers on any push to `main`
that touches `_shipsolid.github.io/**`. It:

1. `npm ci`, then `npm test`, then `npm run build` on `ubuntu-latest`
2. Pushes the `dist/` output to the `main` branch of `shipsolid/shipsolid.github.io` via
   `PORTFOLIO_DEPLOY_TOKEN` (`force_orphan` — each deploy replaces the whole repo)
3. GitHub Pages serves it at `https://shipsolid.github.io`

Deploy takes ~4–6 minutes end-to-end (the test + build steps dominate). Check the Actions tab in the
monorepo to monitor.

### Workflow trigger paths

| Change                                                | Triggers deploy? |
| ----------------------------------------------------- | ---------------- |
| New/edited post in `_shipsolid.github.io/src/`        | Yes              |
| New diagram PNG                                       | Yes              |
| Edit to `astro.config.mjs` or `src/styles/global.css` | Yes              |
| Changes outside `_shipsolid.github.io/`               | No               |

You can also trigger a deploy manually: **Actions → Deploy Portfolio to GitHub Pages → Run
workflow**.

---

## Gotchas

| Issue                       | Cause                                                             | Fix                                           |
| --------------------------- | ----------------------------------------------------------------- | --------------------------------------------- |
| Images broken on live site  | SVG with `<foreignObject>` — blocked by browsers in `<img>`       | Use PNG, not SVG                              |
| Images broken in dev server | `npm run dev` doesn't process content-collection images           | Use `npm run build && npm run preview`        |
| Mermaid syntax error        | Special chars in labels: `{`, `}`, `[[`, `\n`, `·`, `<b>`         | Sanitize labels; use `<br/>` inside `["..."]` |
| Post not appearing in index | `draft: true` or `pubDate` is in the future                       | Flip draft or backdate                        |
| Tag page 404                | First post with a new tag — tag pages are generated at build time | Expected; resolves after first build          |
| Deploy not triggering       | Push didn't touch `_shipsolid.github.io/**`                       | Manual dispatch or touch any file in the path |
