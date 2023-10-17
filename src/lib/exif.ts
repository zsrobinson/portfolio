import type { CollectionEntry } from "astro:content";
import Exif from "exif";

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
