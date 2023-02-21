import { z, defineCollection } from "astro:content";

const blogCollection = defineCollection({
  schema: z.object({
    title: z.string(),
    date: z.union([z.string().transform((str) => new Date(str)), z.date()]),
    categories: z.string().array().optional(),
    tags: z.string().array().optional(),
  }),
});

export const collections = {
  blog: blogCollection,
};
