export type ExtendedBlogPost = {
  collectionId: string;
  collectionName: string;
  cover_image: string;
  cover_image_alt: string;
  created: string;
  date: string;
  draft: boolean;
  expand: {
    tags: BlogTag[];
  };
  id: string;
  markdown: string;
  slug: string;
  tags: string[];
  title: string;
  updated: string;
};

export type BlogTag = {
  collectionId: string;
  collectionName: string;
  created: string;
  id: string;
  name: string;
  updated: string;
};
