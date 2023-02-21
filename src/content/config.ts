import { z, defineCollection } from "astro:content";

const blogCollection = defineCollection({
  schema: z.object({
    title: z.string(),
    date: z.union([z.string().transform((str) => new Date(str)), z.date()]),
    categories: z.array(z.string()),
    tags: z.array(z.string()),
  }),
});

export const collections = {
  blog: blogCollection,
};
