import PocketBase from "pocketbase";
import type { ExpandedBlogPost } from "./types";

export default async function getBlogPostBySlug(slug: string) {
  const pb = new PocketBase(import.meta.env.DB_URL);
  await pb
    .collection(import.meta.env.DB_AUTH_COLLECTION)
    .authWithPassword(import.meta.env.DB_USERNAME, import.meta.env.DB_PASSWORD);

  const post = await pb
    .collection("blog_posts")
    .getFirstListItem<ExpandedBlogPost>(`slug="${slug}"`, {
      expand: "tags",
    });

  return post;
}
