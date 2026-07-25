import { defineConfig } from "astro/config";
import vue from "@astrojs/vue";
import mdx from "@astrojs/mdx";
import tailwindcss from "@tailwindcss/vite";

// opencdd-ts documentation site.
//
// Mirrors the design of the sibling browser site at
// https://opencdd.github.io/ — same design system (Tailwind v4
// @theme tokens, paper/ink/clay/teal/lapis/hex palette, prose-opencdd
// typography), simplified for docs-only deployment.
//
// Local dev:   cd docs && npm install && npm run dev
// Build:       cd docs && npm run build   (outputs to docs/dist/)
// Production:  https://opencdd.github.io/opencdd-ts/
export default defineConfig({
  site: "https://opencdd.github.io",
  base: "/opencdd-ts",
  trailingSlash: "ignore",
  output: "static",
  integrations: [vue(), mdx()],
  vite: {
    plugins: [tailwindcss()],
  },
});
