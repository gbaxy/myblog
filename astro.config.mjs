import sitemap from "@astrojs/sitemap";
import { defineConfig } from "astro/config";
import { site } from "./src/config";

export default defineConfig({
  site: site.url,
  base: site.base,
  trailingSlash: "always",
  integrations: [sitemap({ filter: (page) => !new URL(page).pathname.endsWith("/search/") })],
  markdown: {
    shikiConfig: {
      themes: { light: "github-light", dark: "github-dark" },
      langAlias: { bb: "text", ".bb": "text" },
    },
  },
});
