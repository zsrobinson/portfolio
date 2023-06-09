import { defineCollection, z } from "astro:content";

const blog = defineCollection({
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

export const collections = { blog };
