import type { CollectionEntry } from "astro:content";

export function slugify(str: string) {
  return str.split(" ").join("-").toLowerCase();
}

export function getSortedTags(posts: CollectionEntry<"posts">[]) {
  const tags = new Map<string, number>();

  posts.forEach((post) =>
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

export function formatDate(date: Date) {
  return date.toLocaleDateString("en-us", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

export function formatMonth(date: Date) {
  return date.toLocaleDateString("en-us", {
    year: "numeric",
    month: "long",
  });
}
