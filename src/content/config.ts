import type { rssSchema } from "@astrojs/rss";
import { defineCollection, z } from "astro:content";

const posts = defineCollection({
  schema: z.object({
    title: z.string(),
    date: z.string().transform((val) => new Date(val)),
    updatedDate: z
      .string()
      .optional()
      .transform((str) => (str ? new Date(str) : undefined)),
    heroSrc: z.string().optional(),
    heroAlt: z.string().optional(),
    categories: z.string().array().optional(),
    tags: z.string().array().optional(),
  }),
});

const tech = z.enum([
  "Astro",
  "React.js",
  "Tailwind CSS",
  "Next.js",
  "TypeScript",
  "Mafs",
  "p5.js",
  "Svelte",
  "JavaScript",
  "Vanilla JavaScript",
]);

const projects = defineCollection({
  schema: z.object({
    title: z.string(),
    description: z.string(),
    date: z.string().transform((str) => new Date(str)), // Just to display Month and Year
    deploymentURL: z.string().url().optional(),
    sourceCodeURL: z.string().url().optional(),
    tech: tech.or(z.string()).array(),
  }),
});

export const collections = { posts, projects };
