// Wires the Life background to the page: settings popover, theme, and the
// mask that keeps the pattern out from behind anything you read.

import { createLifeBackground } from "./life.js";
import { ACCENTS } from "./panel.js";

const TONES = {
  light: { bg: "#FFFCF0", ink: "#100F0F" },
  dark: { bg: "#100F0F", ink: "#878580" },
};
const KEY = "background";
// Content the pattern fades out around (anything else can opt in with a
// data-bg-mask attribute). The .hr dividers are left open, so between
// header, main and footer the pattern runs the full width of the page.
const CONTENT = "header, main > :not(.hr), footer > :not(.hr), [data-bg-mask]";
const SEAMS = ".hr";
// how far the dithered fade reaches out from content, in CSS px [x, y]
const FADE = [48, 40];
// side margins narrower than this (phones) are masked completely
const MIN_MARGIN = 64;

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
    accent: "cyan",
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
    const a =
      ACCENTS.find((x) => x.id === settings.accent) ||
      ACCENTS.find((x) => x.id === "cyan");
    html.classList.toggle("dark", dark);
    html.style.setProperty("--accent", dark ? a.dark : a.light);
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

  // ---- mask, in document coordinates so scrolling only moves a uniform
  let queued = false;
  function measureText() {
    queued = false;
    if (!engine) return;
    const sx = window.scrollX;
    const sy = window.scrollY;
    const d = document.documentElement;
    const width = Math.max(d.scrollWidth, window.innerWidth);
    const height = Math.max(d.scrollHeight, window.innerHeight);
    const rects = [];
    let left = width;
    let right = 0;
    for (const el of document.querySelectorAll(CONTENT)) {
      const r = el.getBoundingClientRect();
      if (!r.width || !r.height) continue;
      rects.push(r.left + sx, r.top + sy, r.width, r.height);
      left = Math.min(left, r.left + sx);
      right = Math.max(right, r.right + sx);
    }
    // no room on the sides (phones): run the mask edge to edge, so the pattern
    // only shows in the strips between sections
    if (left < MIN_MARGIN || width - right < MIN_MARGIN) {
      for (let i = 0; i < rects.length; i += 4) {
        rects[i] = -FADE[0];
        rects[i + 2] = width + FADE[0] * 2;
      }
    }
    // places worth keeping alive: the strips between sections, and the side
    // margins when there's room for them
    const zones = [];
    for (const el of document.querySelectorAll(SEAMS)) {
      const r = el.getBoundingClientRect();
      if (r.height) zones.push(0, r.top + sy, width, r.height);
    }
    if (left - FADE[0] > 32) zones.push(0, 0, left - FADE[0], height);
    if (width - right - FADE[0] > 32)
      zones.push(right + FADE[0], 0, width - right - FADE[0], height);
    engine.setMask({ rects, width, height, fade: FADE, zones });
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
    html.classList.add("bg-live");
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
