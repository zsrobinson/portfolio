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

/** @link https://stackoverflow.com/a/17445304/15938350 */
function gcd(a: number, b: number) {
  if (!b) return a;
  return gcd(b, a % b);
}

/** Returns a string representation of an aspect ratio */
export function aspectRatio(width: number, height: number) {
  const gcdResult = gcd(width, height);
  return `${width / gcdResult}:${height / gcdResult}`;
}
