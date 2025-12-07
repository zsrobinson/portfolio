import sitemap from "@astrojs/sitemap";
import vercel from "@astrojs/vercel";
import { defineConfig } from "astro/config";
import { remarkReadingTime } from "./src/plugins/remarkReadingTime.mjs";

export default defineConfig({
  integrations: [sitemap({ filter: (url) => !url.includes("/tags/") })],

  markdown: {
    remarkPlugins: [remarkReadingTime],
    syntaxHighlight: false,
  },

  output: "static",
  adapter: vercel(),
  site: "https://zsrobinson.com",
});
