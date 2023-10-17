import type { CollectionEntry } from "astro:content";
import { clsx, type ClassValue } from "clsx";
import Exif from "exif";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function slugify(str: string) {
  return str.split(" ").join("-").toLowerCase();
}

export function getSortedTags(posts: CollectionEntry<"posts">[]) {
  const tags = new Map<string, number>();

  posts.forEach(
    (post) =>
      post.data.tags?.forEach((tag) => {
        const count = tags.get(tag) ?? 0;
        tags.set(tag, count + 1);
      }),
  );

  // sort by occurrence and then alphabetically
  return Array.from(tags).sort((a, b) => {
    if (a[1] === b[1]) return a[0].localeCompare(b[0]);
    return b[1] - a[1];
  });
}

export function formatDate(date: Date) {
  return date.toLocaleDateString("en-us", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

export function formatMonth(date: Date) {
  return date.toLocaleDateString("en-us", {
    year: "numeric",
    month: "long",
  });
}

/** Doubt this works more generally but props to trial and error */
export function getFilePath(path: string) {
  if (path.includes("_astro")) {
    return (
      "src/assets/gallery/" +
      path.split("/")[2].split(".")[0] +
      "." +
      path.split("/")[2].split(".")[2]
    );
  } else {
    return "src/" + path.split("/src/")[1].split("?")[0];
  }
}

/** Given an Image object, return the metadata embedded in that image */
export async function getExif(
  photo: CollectionEntry<"gallery-posts">["data"]["photos"][0]["path"],
): Promise<Exif.ExifData> {
  return new Promise<Exif.ExifData>((resolve, reject) => {
    new Exif.ExifImage({ image: getFilePath(photo.src) }, (error, exif) => {
      error ? reject(error) : resolve(exif);
    });
  });
}

/** get info format for google maps URL */
export function formatGPS(gps: Exif.ExifData["gps"]) {
  const latitude = gps.GPSLatitude!;
  const longitude = gps.GPSLongitude!;

  let latitudeDecimal = latitude[0] + latitude[1] / 60 + latitude[2] / 3600;
  let longitudeDecimal = longitude[0] + longitude[1] / 60 + longitude[2] / 3600;

  if (gps.GPSLongitudeRef! === "W") {
    longitudeDecimal = -longitudeDecimal;
  }

  return `${latitudeDecimal.toFixed(6)}, ${longitudeDecimal.toFixed(6)}`;
}

/** @link https://stackoverflow.com/a/17445304/15938350 */
function gcd(a: number, b: number) {
  if (!b) return a;
  return gcd(b, a % b);
}

/** Returns a string representation of an aspect ratio */
export function aspectRatio(width: number, height: number) {
  const gcdResult = gcd(width, height);
  return `${width / gcdResult}:${height / gcdResult}`;
}
