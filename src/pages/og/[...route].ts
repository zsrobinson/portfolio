import { OGImageRoute } from "astro-og-canvas";
import { getCollection } from "astro:content";

const posts = await getCollection("posts");
const pages: Record<string, { title: string; description: string }> = {
  index: {
    title: "Hey there, my name's Zach!",
    description:
      "I'm a Computer Science major at the University of Maryland who's passionate about learning new technology and building cool stuff. I enjoy occasionally writing about my experiences and projects here on this site.",
  },
  posts: {
    title: "Posts",
    description: posts
      .sort((a, b) => b.data.date.getTime() - a.data.date.getTime())
      .map((post) => post.data.title)
      .join("\n"),
  },
  tags: {
    title: "Tags",
    description: posts
      .flatMap((post) => post.data.tags)
      .filter((tag) => tag)
      .join(", "),
  },
};

for (const post of posts) {
  const title = post.data.title;
  const description = post.body.split(" ").slice(0, 80).join(" ");

  pages["posts/" + post.slug] = { title, description };
}

export const { getStaticPaths, get } = OGImageRoute({
  param: "route",
  pages,

  getImageOptions: (_, post) => ({
    title: post.title,
    description: post.description,
    logo: { path: "./public/logo.png" },

    // zinc-900 to zinc-950
    bgGradient: [
      [39, 39, 42],
      [9, 9, 11],
    ],

    // blue-900
    border: {
      color: [30, 58, 138],
      width: 50,
    },

    padding: 50,

    font: {
      title: {
        families: ["Inter"],
        weight: "SemiBold",
        lineHeight: 1.1,
        color: [250, 250, 250],
      },

      description: {
        families: ["Inter"],
        weight: "Normal",
        lineHeight: 1.5,
        color: [212, 212, 216],
      },
    },

    fonts: [
      "https://api.fontsource.org/v1/fonts/inter/latin-400-normal.ttf",
      "https://api.fontsource.org/v1/fonts/inter/latin-600-normal.ttf",
    ],
  }),
});
