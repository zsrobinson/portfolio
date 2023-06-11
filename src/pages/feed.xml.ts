import { getCollection } from "astro:content";
import rss from "@astrojs/rss";
import type { APIRoute } from "astro";

export const get: APIRoute = async (context) => {
  const blog = await getCollection("blog");
  return rss({
    title: "Zachary Robinson's Blog",
    description:
      "Hey there, my name's Zach! I'm a rising freshman at the University of Maryland, studying Computer Science. I love all things tech, and I'm especially interested in full-stack web development",
    site: context.site?.toString() ?? "",
    items: blog.map((post) => ({
      title: post.data.title,
      pubDate: post.data.date,
      author: "Zachary Robinson",
      link: `/blog/${post.slug}/`,
    })),
  });
};
