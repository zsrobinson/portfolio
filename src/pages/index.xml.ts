import { getCollection } from "astro:content";
import rss from "@astrojs/rss";
import type { APIRoute } from "astro";

export const get: APIRoute = async (context) => {
  const posts = await getCollection("posts");
  return rss({
    title: "Zachary Robinson",
    description:
      "Hey there, my name's Zach! I'm a Computer Science at the University of Maryland who's passionate about learning new technology and building cool stuff. I enjoy occasionally writing about my experiences and projects here on this site.",
    site: context.site?.toString() ?? "",
    customData: `<atom:link href="${
      context.site?.toString() ?? ""
    }index.xml" rel="self" type="application/rss+xml"/>`,
    xmlns: { atom: "http://www.w3.org/2005/Atom" },

    items: posts.map((post) => ({
      title: post.data.title,
      pubDate: post.data.date,
      link: `/posts/${post.slug}/`,
      description: post.body.split(" ").slice(0, 50).join(" ") + "...",
    })),
  });
};
