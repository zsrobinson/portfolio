export type BlogPost = {
  // PocketBase fields
  id: string;
  created: string;
  updated: string;
  collectionId: string;
  collectionName: string;

  // Custom fields
  title: string;
  date: string;
  draft: boolean;
  markdown: string;
  slug: string;
};
