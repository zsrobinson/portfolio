import * as dotenv from "dotenv";
import * as fs from "fs";
import * as path from "path";

dotenv.config();
const DB_URL = process.env.DB_URL as string;
const DB_AUTH_COLLECTION = process.env.DB_AUTH_COLLECTION as string;
const DB_USERNAME = process.env.DB_USERNAME as string;
const DB_PASSWORD = process.env.DB_PASSWORD as string;

const BLOG_DIR = "./src/content/blog";

console.log("... Attempting to authenticate with DB");

const loginResponse = await fetch(
  `${DB_URL}/api/collections/${DB_AUTH_COLLECTION}/auth-with-password`,
  {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      identity: DB_USERNAME,
      password: DB_PASSWORD,
    }),
  }
);

if (!loginResponse.ok) throw new Error("Failed to authenticate with DB");

const { token }: { token: string } = await loginResponse.json();

console.log(" ✓  Authenticated with DB");

type BlogPost = {
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

console.log("... Fetching list of blog posts");

const postsResponse = await fetch(
  `${DB_URL}/api/collections/blog_posts/records?perPage=100`,
  {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  }
);

const postsJSON: { items: BlogPost[] } = await postsResponse.json();

console.log(" ✓  Number of blog posts: " + postsJSON.items.length);

if (!fs.existsSync(BLOG_DIR)) {
  fs.mkdirSync(BLOG_DIR, { recursive: true });
  console.log(" ✓  Created directory " + BLOG_DIR);
} else {
  console.log(" ✓  Directory " + BLOG_DIR + " already exists");
}

console.log("... Removing existing files in " + BLOG_DIR);

fs.readdir(BLOG_DIR, (err, files) => {
  if (err) throw err;

  for (const file of files) {
    fs.unlink(path.join(BLOG_DIR, file), (err) => {
      if (err) throw err;
    });
    console.log("      Removed " + file);
  }

  if (files.length > 0) {
    console.log(" ✓  Finished removing existing files");
  } else {
    console.log(" ✓  No existing files to remove");
  }
});

// Wait for the files to be removed so that output is in the right order
await new Promise((resolve) => setTimeout(resolve, 500));

console.log("... Saving blog posts");

await Promise.all(
  postsJSON.items.map(async (post) => {
    const path =
      `${DB_URL}/api/files/` +
      `${post.collectionId}/${post.id}/${post.markdown}`;

    const response = await fetch(path);
    if (!response.ok)
      throw new Error(`HTTP Error ${response.status} from ${path}`);

    const text = await response.text();
    fs.writeFileSync(`${BLOG_DIR}/${post.slug}.md`, text);

    console.log(`      Saved ${post.slug}.md`);
  })
);

console.log(" ✓  Finished saving blog posts");
console.log(" ✓  Done");
console.log("");
