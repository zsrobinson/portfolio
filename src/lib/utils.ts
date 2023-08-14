import type { CollectionEntry } from "astro:content";
import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function slugify(str: string) {
  return str.split(" ").join("-").toLowerCase();
}

export function getSortedTags(posts: CollectionEntry<"posts">[]) {
  const tags = new Map<string, number>();

  posts.forEach(
    (post) =>
      post.data.tags?.forEach((tag) => {
        const count = tags.get(tag) ?? 0;
        tags.set(tag, count + 1);
      }),
  );

  // sort by occurrence and then alphabetically
  return Array.from(tags).sort((a, b) => {
    if (a[1] === b[1]) return a[0].localeCompare(b[0]);
    return b[1] - a[1];
  });
}
