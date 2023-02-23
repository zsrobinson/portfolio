import PocketBase from "pocketbase";
import type { ExpandedBlogPost } from "./types";

export default async function getBlogPosts() {
  const pb = new PocketBase(import.meta.env.DB_URL);
  await pb
    .collection(import.meta.env.DB_AUTH_COLLECTION)
    .authWithPassword(import.meta.env.DB_USERNAME, import.meta.env.DB_PASSWORD);

  const posts = await pb
    .collection("blog_posts")
    .getFullList<ExpandedBlogPost>(200, {
      expand: "tags",
    });

  return posts;
}
