import type { CollectionEntry } from "astro:content";
import Exif from "exif";
import { formatDate, formatTime } from "./utils";

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
  photo: CollectionEntry<"photos">["data"]["photos"][0]["file"],
): Promise<Exif.ExifData> {
  return new Promise<Exif.ExifData>((resolve, reject) => {
    new Exif.ExifImage({ image: getFilePath(photo.src) }, (error, exif) => {
      error ? reject(error) : resolve(exif);
    });
  });
}

/** get info format for google maps URL */
export function formatGPS(gps: Exif.ExifData["gps"], precision: number = 6) {
  const lat = gps.GPSLatitude!;
  const long = gps.GPSLongitude!;

  let latDecimal = lat[0] + lat[1] / 60 + lat[2] / 3600;
  let longDecimal = long[0] + long[1] / 60 + long[2] / 3600;

  if (gps.GPSLongitudeRef! === "W") {
    longDecimal = -longDecimal;
  }

  return `${latDecimal.toFixed(precision)}, ${longDecimal.toFixed(precision)}`;
}

export function getExifDate(str: string) {
  return new Date(str.split(" ")[0].replaceAll(":", "-"));
}

export function formatExifDate(str: string) {
  const date = getExifDate(str);
  return formatDate(date);
}

export function addExifTime(str: string, date: Date) {
  const parts = str.split(" ")[1].split(":");
  date.setHours(parseInt(parts[0]));
  date.setMinutes(parseInt(parts[1]));
  date.setSeconds(parseInt(parts[2]));
  return date;
}

export function formatExifTime(str: string) {
  const date = addExifTime(str, new Date());
  return formatTime(date);
}
