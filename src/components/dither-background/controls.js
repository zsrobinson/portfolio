// Wires the Life background to the page: settings popover, theme, and the
// mask that keeps the pattern out from behind anything you read.

import { createLifeBackground } from "./life.js";
import { ACCENTS } from "./panel.js";

const TONES = {
  light: { bg: "#FFFCF0", ink: "#100F0F" },
  dark: { bg: "#100F0F", ink: "#878580" },
};
const KEY = "background";
// The pattern keeps clear of what you read: the actual lines of text and
// the boxes of media, not the blocks they sit in, so the space beside a
// short line or a balanced heading stays open.
const ROOTS = "header, main, footer, [data-bg-mask]";
const SOLID =
  "pre, img, svg, video, iframe, canvas, table, input, textarea, select, button";
const SKIP = ".hr, [hidden], script, style, noscript";
// the dividers are left open, so between header, main and footer the
// pattern runs the full width of the page
const SEAMS = ".hr";
// clear space around content, then a dithered dissolve, in CSS px [x, y]
const MARGIN = [20, 14];
const FADE = [24, 24];
// content this close to the viewport edge (phones) is masked right to it
const EDGE = MARGIN[0] + FADE[0] + 16;
// a gap beside a line (the ragged end of prose, an indent) only opens up if
// it's at least this wide; smaller ones would just sprinkle single cells
// next to the text
const MIN_OPEN = 96;
// ...and only if it isn't a slot pinched between longer lines this close
// above and below (a short title between two full paragraphs)
const SLOT = 26;

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
  const styles = new Map();
  const style = (el) => {
    if (!styles.has(el)) styles.set(el, getComputedStyle(el));
    return styles.get(el);
  };

  // nearest clipping ancestor inside `root` (e.g. a line-clamped quote), so
  // lines hidden by overflow don't mask anything
  const clips = new Map();
  function clipOf(el, root) {
    if (!el || el === root.parentElement) return null;
    if (clips.has(el)) return clips.get(el);
    const st = style(el);
    const c =
      st.overflowX !== "visible" || st.overflowY !== "visible"
        ? el.getBoundingClientRect()
        : clipOf(el.parentElement, root);
    clips.set(el, c);
    return c;
  }

  function contentBoxes() {
    styles.clear();
    clips.clear();
    const boxes = [];
    const add = (l, t, r, b) => r > l && b > t && boxes.push([l, t, r, b]);
    const range = document.createRange();
    for (const root of document.querySelectorAll(ROOTS)) {
      if (root.closest(SKIP)) continue;
      for (const el of root.querySelectorAll(SOLID)) {
        if (el.closest(SKIP) || el.parentElement?.closest(SOLID)) continue;
        const r = el.getBoundingClientRect();
        add(r.left, r.top, r.right, r.bottom);
      }
      const walk = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
      for (let n = walk.nextNode(); n; n = walk.nextNode()) {
        const el = n.parentElement;
        if (!n.data.trim() || !el || el.closest(SKIP) || el.closest(SOLID))
          continue;
        const c = clipOf(el, root);
        range.selectNodeContents(n);
        for (const r of range.getClientRects()) {
          if (!c) add(r.left, r.top, r.right, r.bottom);
          else
            add(
              Math.max(r.left, c.left),
              Math.max(r.top, c.top),
              Math.min(r.right, c.right),
              Math.min(r.bottom, c.bottom),
            );
        }
      }
      // markers drawn by CSS that the text walk can't see
      for (const el of root.querySelectorAll("blockquote, li")) {
        const st = style(el);
        const r = el.getBoundingClientRect();
        const line = parseFloat(st.lineHeight) || 24;
        if (el.tagName === "BLOCKQUOTE")
          add(r.left, r.top, r.left + parseFloat(st.paddingLeft), r.top + line);
        else if (st.display === "list-item" && st.listStyleType !== "none")
          add(r.left - line, r.top, r.left, r.top + line);
      }
    }
    // merge pieces of the same line (links, bold, etc.)
    boxes.sort((a, b) => a[1] - b[1] || a[0] - b[0]);
    const lines = [];
    for (const b of boxes) {
      const m = lines[lines.length - 1];
      if (
        m &&
        Math.abs(m[1] - b[1]) < 4 &&
        Math.abs(m[3] - b[3]) < 4 &&
        b[0] - m[2] < MARGIN[0] * 2
      ) {
        m[0] = Math.min(m[0], b[0]);
        m[2] = Math.max(m[2], b[2]);
        m[3] = Math.max(m[3], b[3]);
      } else lines.push(b.slice());
    }
    return lines;
  }

  let queued = false;
  function measureText() {
    queued = false;
    if (!engine) return;
    const sx = window.scrollX;
    const sy = window.scrollY;
    const d = document.documentElement;
    const width = Math.max(d.scrollWidth, window.innerWidth);
    const height = Math.max(d.scrollHeight, window.innerHeight);
    const view = d.clientWidth || window.innerWidth;
    const lines = contentBoxes();
    let left = view;
    let right = 0;
    for (const [l, , r] of lines) {
      left = Math.min(left, l);
      right = Math.max(right, r);
    }
    // fill slots: a gap beside a line with longer lines just above and below
    const neighbour = (i, dir) => {
      const [l, t, , b] = lines[i];
      let best = null;
      for (let j = i + dir; j >= 0 && j < lines.length; j += dir) {
        const o = lines[j];
        const gap = dir < 0 ? t - o[3] : o[1] - b;
        if (gap > SLOT) break;
        if (gap >= -2 && o[2] > l && o[0] < lines[i][2]) best ??= o;
      }
      return best;
    };
    const filled = lines.map((line, i) => {
      const up = neighbour(i, -1);
      const down = neighbour(i, 1);
      if (!up || !down) return line;
      // extend toward the nearer of the two longer neighbours, on each side
      return [
        Math.min(line[0], Math.max(up[0], down[0])),
        line[1],
        Math.max(line[2], Math.min(up[2], down[2])),
        line[3],
      ];
    });
    const rects = [];
    for (let [l, t, r, b] of filled) {
      if (l - left < MIN_OPEN) l = Math.min(l, left);
      if (right - r < MIN_OPEN) r = Math.max(r, right);
      // no room to breathe between content and the screen edge (phones):
      // run the mask to the edge rather than leave a speckled sliver
      if (l < EDGE) l = -EDGE;
      if (view - r < EDGE) r = view + EDGE;
      rects.push(l + sx, t + sy, r - l, b - t);
    }
    // places worth keeping alive: the strips between sections, and the side
    // margins when there's room for them
    const zones = [];
    for (const el of document.querySelectorAll(SEAMS)) {
      const r = el.getBoundingClientRect();
      if (r.height) zones.push(0, r.top + sy, width, r.height);
    }
    const reach = MARGIN[0] + FADE[0];
    if (left - reach > 32) zones.push(0, 0, left - reach, height);
    if (view - right - reach > 32)
      zones.push(right + reach, 0, view - right - reach, height);
    engine.setMask({
      rects,
      width,
      height,
      margin: MARGIN,
      fade: FADE,
      zones,
    });
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
