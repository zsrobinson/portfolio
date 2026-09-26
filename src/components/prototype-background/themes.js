// PROTOTYPE: Flexoki-based palettes for the dithered background.
// Values from https://stephango.com/flexoki (kepano/flexoki css/flexoki.css).
//
// `ramp` runs from the page background toward "ink". The dither only ever
// picks between neighbouring ramp steps, so quiet themes keep the whole
// background inside bg..ui-3 and body text stays at full contrast.

const f = {
  black: "#100F0F",
  b950: "#1C1B1A",
  b900: "#282726",
  b850: "#343331",
  b800: "#403E3C",
  b700: "#575653",
  b600: "#6F6E69",
  b500: "#878580",
  b400: "#9F9D96",
  b300: "#B7B5AC",
  b200: "#CECDC3",
  b150: "#DAD8CE",
  b100: "#E6E4D9",
  b50: "#F2F0E5",
  paper: "#FFFCF0",
};

export const THEMES = [
  {
    id: "paper",
    name: "flexoki paper",
    dark: false,
    ramp: [f.paper, f.b50, f.b100, f.b150, f.b200],
    accent: "#87D3C3", // cyan-200
    page: {
      bg: f.paper,
      tx: f.black,
      tx2: f.b600,
      tx3: f.b300,
      ui: f.b100,
      link: "#205EA6",
      visited: "#5E409D",
    },
  },
  {
    id: "ink",
    name: "flexoki ink",
    dark: true,
    ramp: [f.black, f.b950, f.b900, f.b850, f.b800],
    accent: "#1C6C66", // cyan-700
    page: {
      bg: f.black,
      tx: f.b200,
      tx2: f.b500,
      tx3: f.b700,
      ui: f.b900,
      link: "#4385BE",
      visited: "#8B7EC8",
    },
  },
  {
    id: "onebit",
    name: "1-bit",
    dark: false,
    ramp: [f.paper, f.black],
    accent: "#AF3029", // red-600, a single spot colour
    page: {
      bg: f.paper,
      tx: f.black,
      tx2: f.b700,
      tx3: f.b400,
      ui: f.b150,
      link: f.black,
      visited: f.b700,
    },
  },
  {
    id: "riso",
    name: "riso blue",
    dark: false,
    ramp: [f.paper, "#E1ECEB", "#C6DDE8", "#ABCFE2", "#92BFDB"], // blue-50..200
    accent: "#F4A4C2", // magenta-200
    page: {
      bg: f.paper,
      tx: "#101A24",
      tx2: "#1A4F8C",
      tx3: "#66A0C8",
      ui: "#C6DDE8",
      link: "#205EA6",
      visited: "#A02F6F",
    },
  },
  {
    id: "cyanotype",
    name: "cyanotype",
    dark: true,
    ramp: ["#101A24", "#12253B", "#133051", "#163B66", "#1A4F8C"], // blue-950..700
    accent: "#24837B", // cyan-600
    page: {
      bg: "#101A24",
      tx: "#E1ECEB",
      tx2: "#92BFDB",
      tx3: "#3171B2",
      ui: "#163B66",
      link: "#ABCFE2",
      visited: "#C4B9E0",
    },
  },
  {
    id: "phosphor",
    name: "phosphor",
    dark: true,
    ramp: [f.black, "#1A1E0C", "#252D09", "#3D4C07", "#536907"], // green-950..700
    accent: "#AD8301", // yellow-600
    page: {
      bg: f.black,
      tx: "#CDD597",
      tx2: "#879A39",
      tx3: "#3D4C07",
      ui: "#252D09",
      link: "#DFB431",
      visited: "#BE9207",
    },
  },
  {
    id: "ember",
    name: "ember",
    dark: true,
    ramp: [f.black, "#261312", "#3E1715", "#6C201C", "#9D4310", "#DA702C"], // red-950..orange-400
    accent: "#D0A215", // yellow-400
    page: {
      bg: f.black,
      tx: f.b100,
      tx2: "#F9AE77",
      tx3: "#6C201C",
      ui: "#3E1715",
      link: "#EC8B49",
      visited: "#E8705F",
    },
  },
];

// "auto" follows the system theme, like the live site does today.
export function resolveTheme(id) {
  if (id === "auto") {
    const forced = document.documentElement.dataset.theme; // artifact viewers set this
    const dark =
      forced === "dark" ||
      (forced !== "light" &&
        window.matchMedia("(prefers-color-scheme: dark)").matches);
    return THEMES.find((t) => t.id === (dark ? "ink" : "paper"));
  }
  return THEMES.find((t) => t.id === id) || THEMES[0];
}
