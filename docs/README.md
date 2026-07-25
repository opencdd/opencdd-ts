# opencdd-ts docs site

This directory holds the Astro documentation site for `@opencdd/opencdd`,
the TypeScript port of the Ruby `opencdd` gem. The site is published at
**<https://opencdd.github.io/opencdd-ts/>**.

## Local development

```bash
cd docs
npm install
npm run dev
```

Serves at <http://localhost:4321/opencdd-ts/>.

## Build

```bash
npm run build
```

Outputs static HTML to `docs/dist/`. Preview with:

```bash
npm run preview
```

## Deployment

Automated via [`.github/workflows/docs.yml`](../.github/workflows/docs.yml).
Every push to `main` that touches `docs/` rebuilds and deploys to
GitHub Pages. Requires Pages to be enabled in the repo settings with
source set to "GitHub Actions".

## Structure

```
docs/
├── astro.config.mjs           # Astro config (base: /opencdd-ts)
├── package.json               # Node deps
├── tsconfig.json
├── public/                    # static assets (favicons, logo)
├── src/
│   ├── assets/                # images
│   ├── components/
│   │   ├── layout/            # Header, Footer
│   │   └── ui/                # Card, SkipToContent
│   ├── layouts/               # BaseLayout, ProseLayout, DocsLayout
│   ├── lib/cn.ts              # classname join helper
│   ├── pages/                 # Astro routes
│   └── content/
│       └── docs/              # ← markdown source of truth
```

## Editing docs

Edit the Markdown files in `src/content/docs/`. The sidebar is generated
from each entry's frontmatter (`section` and `order` fields). The design
system (palette, typography, prose styles) is in `src/styles/global.css`
and is mirrored from the sibling browser site at
<https://opencdd.github.io/>.
