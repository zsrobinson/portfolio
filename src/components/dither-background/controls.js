// Wires the Life background to the page: settings popover, theme, and the
// text mask that keeps the pattern out from behind anything you read.

import { createLifeBackground } from "./life.js";
import { ACCENTS } from "./panel.js";

const TONES = {
  light: { bg: "#FFFCF0", ink: "#100F0F" },
  dark: { bg: "#100F0F", ink: "#878580" },
};
const KEY = "background";
// Everything a reader reads. The pattern is blanked behind these boxes;
// anything else can opt in with a data-bg-mask attribute.
const TEXT =
  "header, .hr, [data-bg-mask], main :is(p, li, h1, h2, h3, h4, h5, h6, pre, blockquote, table, img, figure, hr), footer p";
const PAD = 4;

function load() {
  try {
    return JSON.parse(localStorage.getItem(KEY) || "{}");
  } catch {
    return {};
  }
}
function save(s) {
  try {
    localStorage.setItem(KEY, JSON.stringify(s));
  } catch {}
}
function loadTheme() {
  try {
    return localStorage.getItem("theme") || "system";
  } catch {
    return "system";
  }
}
function saveTheme(t) {
  try {
    if (t === "system") localStorage.removeItem("theme");
    else localStorage.setItem("theme", t);
  } catch {}
}

export function mountBackground({ allowSoftware = false } = {}) {
  const html = document.documentElement;
  const canvas = document.getElementById("bg-canvas");
  const panel = document.getElementById("bg-panel");
  const toggle = document.getElementById("bg-toggle");
  const systemDark = window.matchMedia("(prefers-color-scheme: dark)");
  const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  const settings = {
    accent: "green",
    pixel: 4,
    dither: "bayer4",
    motion: reduced ? "off" : "on",
    ...load(),
    theme: loadTheme(),
  };

  // an embedding host (like an artifact viewer) may force a theme
  const isDark = () =>
    settings.theme === "dark" ||
    (settings.theme === "system" &&
      (html.dataset.theme
        ? html.dataset.theme === "dark"
        : systemDark.matches));

  function colors() {
    const dark = isDark();
    const a = ACCENTS.find((x) => x.id === settings.accent) || ACCENTS[0];
    html.classList.toggle("dark", dark);
    return {
      ...TONES[dark ? "dark" : "light"],
      accent: dark ? a.dark : a.light,
    };
  }

  function engineOptions() {
    return {
      ...colors(),
      pixel: Number(settings.pixel),
      dither: settings.dither,
      motion: settings.motion === "on",
    };
  }

  let engine = null;
  function apply() {
    const { theme, ...rest } = settings;
    save(rest);
    saveTheme(theme);
    engine?.set(engineOptions());
    if (!engine) colors();
  }

  // ---- popover (native where supported, a hidden-toggle fallback otherwise)
  for (const [name, key] of [
    ["bg-accent", "accent"],
    ["bg-theme", "theme"],
    ["bg-pixel", "pixel"],
    ["bg-dither", "dither"],
    ["bg-motion", "motion"],
  ]) {
    for (const input of panel.querySelectorAll(`input[name="${name}"]`)) {
      input.checked = String(settings[key]) === input.value;
      input.addEventListener("change", () => {
        settings[key] = input.value;
        apply();
      });
    }
  }
  panel.addEventListener("submit", (e) => e.preventDefault());
  document
    .getElementById("bg-reseed")
    .addEventListener("click", () => engine?.reseed());

  if (!("popover" in HTMLElement.prototype)) {
    panel.removeAttribute("popover");
    panel.hidden = true;
    toggle.addEventListener("click", () => (panel.hidden = !panel.hidden));
    document.addEventListener("click", (e) => {
      if (
        !panel.hidden &&
        !panel.contains(e.target) &&
        !toggle.contains(e.target)
      )
        panel.hidden = true;
    });
    document.addEventListener(
      "keydown",
      (e) => e.key === "Escape" && (panel.hidden = true),
    );
  }

  systemDark.addEventListener?.(
    "change",
    () => settings.theme === "system" && apply(),
  );

  // ---- text mask, in document coordinates so scrolling only moves a uniform
  let queued = false;
  function measureText() {
    queued = false;
    if (!engine) return;
    const sx = window.scrollX;
    const sy = window.scrollY;
    const rects = [];
    for (const el of document.querySelectorAll(TEXT)) {
      const r = el.getBoundingClientRect();
      if (!r.width || !r.height) continue;
      rects.push(
        r.left + sx - PAD,
        r.top + sy - PAD,
        r.width + PAD * 2,
        r.height + PAD * 2,
      );
    }
    const d = document.documentElement;
    engine.setMask(
      rects,
      Math.max(d.scrollWidth, window.innerWidth),
      Math.max(d.scrollHeight, window.innerHeight),
    );
  }
  const queueMeasure = () => {
    if (queued) return;
    queued = true;
    requestAnimationFrame(measureText);
  };

  colors();
  const boot = () => {
    engine = createLifeBackground(canvas, {
      ...engineOptions(),
      allowSoftware,
    });
    if (!engine) return; // no WebGL2 (or software only): the flat page background stays
    measureText();
    document.fonts?.ready.then(queueMeasure);
    new ResizeObserver(queueMeasure).observe(document.body);
    window.addEventListener("resize", queueMeasure, { passive: true });
  };
  // start once the page is idle so it never competes with first paint
  if ("requestIdleCallback" in window)
    requestIdleCallback(boot, { timeout: 600 });
  else setTimeout(boot, 50);

  return {
    get engine() {
      return engine;
    },
  };
}
