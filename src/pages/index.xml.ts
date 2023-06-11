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
    customData: `<atom:link href="${
      context.site?.toString() ?? ""
    }index.xml" rel="self" type="application/rss+xml"/>`,
    xmlns: { atom: "http://www.w3.org/2005/Atom" },

    items: blog.map((post) => ({
      title: post.data.title,
      pubDate: post.data.date,
      link: `/blog/${post.slug}/`,
      description: post.body.split(" ").slice(0, 50).join(" ") + "...",
    })),
  });
};