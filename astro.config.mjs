import { defineConfig } from 'astro/config';
import sitemap from '@astrojs/sitemap';
import tailwindcss from '@tailwindcss/vite';
import { remarkRewriteMdLinks } from './remark-rewrite-md-links.mjs';

// Set only in CI (GitHub Actions secret) — never committed. Absent locally, so
// dev/build stay sourcemap-free and the plugin is skipped entirely.
const faroSourcemapApiKey = process.env.FARO_SOURCEMAP_API_KEY;

// Import lazily: @grafana/faro-rollup-plugin pulls in undici@8, which requires
// Node >=22.19 and throws at import time on older runtimes. Loading it only
// when the feature is actually enabled keeps a plain `npm test`/`astro dev`
// unaffected regardless of Node version.
const faroUploader = faroSourcemapApiKey ? (await import('@grafana/faro-rollup-plugin')).default : null;

// Two deploy targets, both serving from the domain root (this repo's GitHub
// Pages deploy is the org's root user page, not a subpath like gita's) — only
// `site` (canonical URLs, sitemap) and `outDir` differ. `npm run build:cloudflare`
// flips it via DEPLOY_TARGET — see package.json.
const CLOUDFLARE = process.env.DEPLOY_TARGET === 'cloudflare';

export default defineConfig({
  site: CLOUDFLARE ? 'https://amit.shipsolid.workers.dev' : 'https://shipsolid.github.io',
  outDir: CLOUDFLARE ? './dist-cloudflare' : './dist',
  // SignalForge's write-up moved to its own repo's Pages deploy at /signal-forge/.
  // Static output turns this into dist/projects/signal-forge/index.html — a meta-refresh
  // + <link rel="canonical"> page, the only redirect kind GitHub Pages static hosting
  // supports — so old inbound links to the retired route still land in the right place.
  redirects: {
    '/projects/signal-forge': '/signal-forge/',
  },
  // Tailwind 4 is a first-class Vite plugin (see vite.plugins below), not an
  // Astro integration: @astrojs/tailwind has no Astro 7 release and v4 needs
  // none — @tailwindcss/vite replaces both it and the PostCSS bridge.
  integrations: [sitemap()],
  output: 'static',
  markdown: {
    remarkPlugins: [remarkRewriteMdLinks],
  },
  vite: {
    build: {
      sourcemap: Boolean(faroSourcemapApiKey),
    },
    plugins: [
      tailwindcss(),
      ...(faroUploader
        ? [
            faroUploader({
              appName: 'shipsolid',
              // Sourcemap upload API, distinct from the Faro Collector URL — Frontend
              // Observability → Settings → Source Maps → Configure source map uploads.
              endpoint: 'https://faro-api-prod-ap-south-1.grafana.net/faro/api/v1',
              appId: '2098',
              stackId: '1402689',
              apiKey: faroSourcemapApiKey,
              gzipContents: true,
              // Astro's build also emits sourcemaps for its internal SSR pass (the
              // one it uses to prerender static HTML) — those never run in a
              // browser and would otherwise get swept up too. Client-side hoisted
              // scripts are the only ones that matter here.
              outputFiles: /\.js\.map$/,
            }),
          ]
        : []),
    ],
  },
});
