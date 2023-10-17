import { getCollection } from "astro:content";
import { addExifTime, getExif, getExifDate } from "./exif";

export async function getPhotos() {
  const rawCollection = (await getCollection("photos"))[0].data.photos;

  const withMetadata = await Promise.all(
    rawCollection.map(async (photo) => {
      const data = await getExif(photo.file);

      if (data.image.Model?.startsWith(data.image.Make!)) {
        data.image.Model = data.image.Model.slice(data.image.Make!.length);
      }

      const aspectRatio =
        data.exif.ExifImageWidth! / data.exif.ExifImageHeight!;

      return { ...photo, data, aspectRatio };
    }),
  );

  const withDate = withMetadata.map((photo) => {
    const date = getExifDate(photo.data.exif.DateTimeOriginal!);
    addExifTime(photo.data.exif.DateTimeOriginal!, date);
    return { ...photo, date };
  });

  // sort by date, soonest first
  withDate.sort((a, b) => b.date.getTime() - a.date.getTime());

  return withDate;
}
