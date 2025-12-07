/** @see https://en.wikipedia.org/wiki/Ordered_dithering#Threshold_map */
const bayer_map_4 = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5];

export function bayerFilter(brightness: number, x: number, y: number) {
  const rel_x = x % 4;
  const rel_y = y % 4;
  const threshold = (bayer_map_4[rel_x * 4 + rel_y] + 0.5) / 16;
  return brightness >= threshold ? 1 : 0;
}

const bayer = document.getElementById("bayer");
console.log(bayer);
