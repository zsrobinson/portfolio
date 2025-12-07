import { OGImageRoute } from "astro-og-canvas";
import { getCollection } from "astro:content";

const posts = await getCollection("posts");
const pages: Record<string, { title: string; description: string }> = {
  index: {
    title: "Hey there, my name’s Zach!",
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

export const { getStaticPaths, GET } = OGImageRoute({
  param: "route",
  pages,

  getImageOptions: (_, post) => ({
    title: "# " + post.title,
    description: post.description,

    bgGradient: [[255, 255, 255]],

    font: {
      title: {
        families: ["DejaVu Sans Mono"],
        weight: "Bold",
        lineHeight: 1.1,
        color: [0, 0, 0],
      },

      description: {
        families: ["DejaVu Sans Mono"],
        weight: "Normal",
        lineHeight: 1.5,
        color: [0, 0, 0],
      },
    },

    fonts: [
      "https://cdn.jsdelivr.net/fontsource/fonts/dejavu-mono@latest/latin-400-normal.ttf",
      "https://cdn.jsdelivr.net/fontsource/fonts/dejavu-mono@latest/latin-700-normal.ttf",
    ],
  }),
});
