import react from "@astrojs/react";
import sitemap from "@astrojs/sitemap";
import tailwind from "@astrojs/tailwind";
import vercel from "@astrojs/vercel/serverless";
import { defineConfig } from "astro/config";
import { remarkReadingTime } from "./src/plugins/remarkReadingTime.mjs";

export default defineConfig({
  integrations: [tailwind(), react(), sitemap()],
  markdown: {
    remarkPlugins: [remarkReadingTime],
    shikiConfig: {
      theme: "material-darker",
    },
  },
  output: "hybrid",
  adapter: vercel(),
  site: "https://beta.zsrobinson.com",
});
