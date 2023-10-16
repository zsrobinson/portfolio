import { defineCollection, z } from "astro:content";

const posts = defineCollection({
  schema: ({ image }) =>
    z.object({
      title: z.string(),
      date: z.date(),
      updatedDate: z.date().optional(),
      tags: z.string().array().optional(),
      hackerNews: z.string().url().optional(),

      cover: image().optional(),
      coverAlt: z.string().optional(),
      disclaimer: z.string().optional(),
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

const aspectRatio = z.enum(["3:2", "2:3", "4:3", "3:4", "16:9", "9:16", "1:1"]);

const galleryPosts = defineCollection({
  schema: ({ image }) =>
    z.object({
      title: z.string(),
      date: z.date(),
      photos: z
        .object({
          path: image(),
          aspectRatio: aspectRatio.or(z.string()),
        })
        .array(),
    }),
});

export const collections = { posts, projects, "gallery-posts": galleryPosts };
