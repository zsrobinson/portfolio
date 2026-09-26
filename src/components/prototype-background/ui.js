// PROTOTYPE: variant switcher (Matt Pocock `prototype` skill, UI branch),
// tweaks panel and a live state readout for the dithered background.
// Plain DOM on purpose so the same file runs in Astro and in the
// standalone HTML build.

import { createDitherBackground, EFFECTS, DITHERS } from "./engine.js";
import { THEMES, resolveTheme } from "./themes.js";

export const VARIANTS = EFFECTS.map((e, i) => ({ key: "abcde"[i], ...e }));

const DEFAULTS = {
  variant: "a",
  theme: "auto",
  dither: "bayer4",
  preset: "",
  px: 3,
  intensity: 1,
  // on a phone the text column is the whole screen, so keep more of the effect
  calm: window.matchMedia("(max-width: 700px)").matches ? 0.55 : 0.35,
  speed: 1,
  fps: 60,
  motion: "auto",
  adaptive: 1,
  idle: 1,
  hud: window.matchMedia("(max-width: 700px)").matches ? 0 : 1,
};
const NUMERIC = [
  "px",
  "intensity",
  "calm",
  "speed",
  "fps",
  "adaptive",
  "idle",
  "hud",
];
const KEYS = Object.keys(DEFAULTS);

function coerce(raw) {
  const out = {};
  for (const k of KEYS) {
    if (raw[k] == null || raw[k] === "") continue;
    out[k] = NUMERIC.includes(k) ? Number(raw[k]) : String(raw[k]);
    if (NUMERIC.includes(k) && !Number.isFinite(out[k])) delete out[k];
  }
  return out;
}

function safeStore(store, key, value) {
  try {
    if (value === undefined) return JSON.parse(store.getItem(key) || "{}");
    store.setItem(key, JSON.stringify(value));
  } catch {
    return {};
  }
}

// ?variant=b&theme=ink&dither=bayer8 ... (sessionStorage carries it across
// page navigations inside the site)
export function urlPersist() {
  const KEY = "proto-bg";
  return {
    load() {
      const q = new URLSearchParams(location.search);
      const fromUrl = {};
      for (const k of KEYS) if (q.has(k)) fromUrl[k] = q.get(k);
      return { ...safeStore(sessionStorage, KEY), ...fromUrl };
    },
    save(s) {
      safeStore(sessionStorage, KEY, s);
      const q = new URLSearchParams(location.search);
      for (const k of KEYS) {
        if (k === "variant" || s[k] !== DEFAULTS[k]) q.set(k, s[k]);
        else q.delete(k);
      }
      history.replaceState(
        history.state,
        "",
        `${location.pathname}?${q}${location.hash}`,
      );
    },
  };
}

// #b for the variant (the only deep link an artifact frame passes through),
// everything else in localStorage.
export function hashPersist() {
  const KEY = "proto-bg";
  return {
    load() {
      const h = location.hash.slice(1).toLowerCase();
      const s = safeStore(localStorage, KEY);
      if (VARIANTS.some((v) => v.key === h)) s.variant = h;
      return s;
    },
    save(s) {
      safeStore(localStorage, KEY, s);
      try {
        history.replaceState(history.state, "", "#" + s.variant);
      } catch {}
    },
  };
}

const opt = (value, label, current) =>
  `<option value="${value}"${String(value) === String(current) ? " selected" : ""}>${label}</option>`;

export function mountPrototype({
  persist = urlPersist(),
  allowSoftware = false,
} = {}) {
  let state = { ...DEFAULTS, ...coerce(persist.load()) };
  if (!VARIANTS.some((v) => v.key === state.variant)) state.variant = "a";

  const html = document.documentElement;
  html.dataset.protoBg = "";

  let canvas = document.getElementById("proto-bg-canvas");
  if (!canvas) {
    canvas = document.createElement("canvas");
    canvas.id = "proto-bg-canvas";
    canvas.setAttribute("aria-hidden", "true");
    document.body.prepend(canvas);
  }

  const root = document.createElement("div");
  root.className = "proto-ui";
  root.innerHTML = `
    <div class="proto-hud" id="proto-hud" aria-live="off"></div>
    <form class="proto-panel" id="proto-panel" hidden>
      <div class="proto-panel-head">tweaks <span>applies to every variant</span></div>
      <label>theme <select id="proto-theme"></select></label>
      <label>dither <select id="proto-dither"></select></label>
      <label>preset <select id="proto-preset"></select></label>
      <label>pixel <input id="proto-px" type="range" min="1" max="8" step="1"><output id="proto-px-out"></output></label>
      <label>strength <input id="proto-intensity" type="range" min="0" max="1" step="0.05"><output id="proto-intensity-out"></output></label>
      <label>text column <input id="proto-calm" type="range" min="0" max="1" step="0.05"><output id="proto-calm-out"></output></label>
      <label>speed <input id="proto-speed" type="range" min="0.25" max="3" step="0.25"><output id="proto-speed-out"></output></label>
      <label>fps cap <select id="proto-fps">${opt(30, "30", 0)}${opt(60, "60", 0)}${opt(0, "uncapped", 0)}</select></label>
      <label>motion <select id="proto-motion">${opt("auto", "auto (reduced-motion aware)", 0)}${opt("on", "always", 0)}${opt("off", "still frame", 0)}</select></label>
      <div class="proto-checks">
        <label><input id="proto-adaptive" type="checkbox"> auto-coarsen when slow</label>
        <label><input id="proto-idle" type="checkbox"> idle throttle after 8s</label>
        <label><input id="proto-hud-toggle" type="checkbox"> state readout</label>
      </div>
      <button type="button" id="proto-reset">reset tweaks</button>
    </form>
    <nav class="proto-bar" aria-label="Prototype variant switcher">
      <button type="button" id="proto-prev" aria-label="Previous variant">&larr;</button>
      <span class="proto-label" id="proto-label"></span>
      <button type="button" id="proto-next" aria-label="Next variant">&rarr;</button>
      <button type="button" id="proto-tweaks" aria-expanded="false" aria-controls="proto-panel">tweaks</button>
    </nav>`;
  document.body.append(root);

  const $ = (id) => root.querySelector("#" + id);
  const el = {
    hud: $("proto-hud"),
    panel: $("proto-panel"),
    theme: $("proto-theme"),
    dither: $("proto-dither"),
    preset: $("proto-preset"),
    px: $("proto-px"),
    intensity: $("proto-intensity"),
    calm: $("proto-calm"),
    speed: $("proto-speed"),
    fps: $("proto-fps"),
    motion: $("proto-motion"),
    adaptive: $("proto-adaptive"),
    idle: $("proto-idle"),
    hudToggle: $("proto-hud-toggle"),
    label: $("proto-label"),
    tweaks: $("proto-tweaks"),
  };

  el.theme.innerHTML =
    opt("auto", "auto (paper / ink)", state.theme) +
    THEMES.map((t) => opt(t.id, t.name, state.theme)).join("");
  el.dither.innerHTML = DITHERS.map((d) =>
    opt(d.id, d.name, state.dither),
  ).join("");

  const variant = () => VARIANTS.find((v) => v.key === state.variant);

  function applyPageTheme() {
    const t = resolveTheme(state.theme);
    const p = t.page;
    const s = html.style;
    s.setProperty("--bg", p.bg);
    s.setProperty("--tx", p.tx);
    s.setProperty("--tx-2", p.tx2);
    s.setProperty("--tx-3", p.tx3);
    s.setProperty("--ui", p.ui);
    s.setProperty("--link", p.link);
    s.setProperty("--link-visited", p.visited);
    s.setProperty("--proto-accent", t.accent);
    s.colorScheme = t.dark ? "dark" : "light";
    return t;
  }

  function measureColumn() {
    const r = document.body.getBoundingClientRect();
    return [r.left, r.right];
  }

  function engineOpts() {
    const v = variant();
    return {
      effect: v.id,
      preset: state.preset || v.presets[0],
      theme: resolveTheme(state.theme),
      dither: state.dither,
      pixel: state.px,
      intensity: state.intensity,
      calm: state.calm,
      speed: state.speed,
      fps: state.fps,
      motion: state.motion,
      adaptive: !!state.adaptive,
      idle: !!state.idle,
      column: measureColumn(),
    };
  }

  let engine = null;
  let failed = false;

  function syncControls() {
    const v = variant();
    el.label.textContent = `${v.key.toUpperCase()} (${v.name})`;
    el.label.title = v.blurb;
    el.preset.innerHTML = v.presets
      .map((p) => opt(p, p, state.preset || v.presets[0]))
      .join("");
    el.theme.value = state.theme;
    el.dither.value = state.dither;
    el.px.value = state.px;
    el.px.disabled = state.dither === "ascii";
    el.intensity.value = state.intensity;
    el.calm.value = state.calm;
    el.speed.value = state.speed;
    el.fps.value = String(state.fps);
    el.motion.value = state.motion;
    el.adaptive.checked = !!state.adaptive;
    el.idle.checked = !!state.idle;
    el.hudToggle.checked = !!state.hud;
    $("proto-px-out").textContent =
      state.dither === "ascii" ? "n/a" : `${state.px}px`;
    $("proto-intensity-out").textContent =
      Math.round(state.intensity * 100) + "%";
    $("proto-calm-out").textContent = Math.round(state.calm * 100) + "%";
    $("proto-speed-out").textContent = state.speed + "×";
    el.hud.hidden = !state.hud;
  }

  function update(patch) {
    const prevVariant = state.variant;
    state = { ...state, ...patch };
    if (state.variant !== prevVariant && !("preset" in patch))
      state.preset = "";
    persist.save(state);
    applyPageTheme();
    syncControls();
    engine?.set(engineOpts());
    renderHud(engine?.state());
  }

  function cycle(dir) {
    const i = VARIANTS.findIndex((v) => v.key === state.variant);
    update({
      variant: VARIANTS[(i + dir + VARIANTS.length) % VARIANTS.length].key,
    });
  }

  const fmt = (n) => n.toLocaleString("en-US");
  function renderHud(s) {
    if (!state.hud) return;
    const v = variant();
    const t = resolveTheme(state.theme);
    const d = DITHERS.find((x) => x.id === state.dither);
    if (failed || !s) {
      el.hud.textContent =
        `variant  ${v.key.toUpperCase()} ${v.name.toLowerCase()}\n` +
        `status   webgl2 unavailable or software-only;\n         showing the flat theme background`;
      return;
    }
    const devPx = Math.round(state.px * s.dpr);
    el.hud.textContent = [
      `variant  ${v.key.toUpperCase()} ${v.name.toLowerCase()} · ${state.preset || v.presets[0]}`,
      `theme    ${t.name}${state.theme === "auto" ? " (auto)" : ""} · ${t.ramp.length} tones`,
      `dither   ${d.name}` +
        (state.dither === "ascii"
          ? " · 7×12px cells"
          : ` · ${s.pixel}px = ${devPx} dev px @${s.dpr}x`),
      `grid     ${s.gw}×${s.gh} = ${fmt(s.cells)} cells`,
      `sim      ${s.hz} hz · ${fmt(s.steps)} steps/s`,
      `frame    ${s.fps} fps · js ${s.js.toFixed(2)} ms/frame`,
      `mode     ${s.animated ? (s.idle ? "idle (throttled)" : "live") : "still"}` +
        (s.governor ? ` · ${s.governor}` : ""),
    ].join("\n");
  }

  // ----- wiring
  $("proto-prev").addEventListener("click", () => cycle(-1));
  $("proto-next").addEventListener("click", () => cycle(1));
  el.tweaks.addEventListener("click", () => {
    el.panel.hidden = !el.panel.hidden;
    el.tweaks.setAttribute("aria-expanded", String(!el.panel.hidden));
  });
  el.panel.addEventListener("submit", (e) => e.preventDefault());
  el.theme.addEventListener("change", () => update({ theme: el.theme.value }));
  el.dither.addEventListener("change", () =>
    update({ dither: el.dither.value }),
  );
  el.preset.addEventListener("change", () =>
    update({ preset: el.preset.value }),
  );
  el.px.addEventListener("input", () => update({ px: Number(el.px.value) }));
  el.intensity.addEventListener("input", () =>
    update({ intensity: Number(el.intensity.value) }),
  );
  el.calm.addEventListener("input", () =>
    update({ calm: Number(el.calm.value) }),
  );
  el.speed.addEventListener("input", () =>
    update({ speed: Number(el.speed.value) }),
  );
  el.fps.addEventListener("change", () =>
    update({ fps: Number(el.fps.value) }),
  );
  el.motion.addEventListener("change", () =>
    update({ motion: el.motion.value }),
  );
  el.adaptive.addEventListener("change", () =>
    update({ adaptive: el.adaptive.checked ? 1 : 0 }),
  );
  el.idle.addEventListener("change", () =>
    update({ idle: el.idle.checked ? 1 : 0 }),
  );
  el.hudToggle.addEventListener("change", () =>
    update({ hud: el.hudToggle.checked ? 1 : 0 }),
  );
  $("proto-reset").addEventListener("click", () =>
    update({ ...DEFAULTS, variant: state.variant }),
  );

  window.addEventListener("keydown", (e) => {
    if (e.key !== "ArrowLeft" && e.key !== "ArrowRight") return;
    if (e.metaKey || e.ctrlKey || e.altKey || e.shiftKey) return;
    const a = document.activeElement;
    if (
      a &&
      (a.closest("input, select, textarea, [contenteditable]") ||
        a.isContentEditable)
    )
      return;
    e.preventDefault();
    cycle(e.key === "ArrowLeft" ? -1 : 1);
  });

  window
    .matchMedia("(prefers-color-scheme: dark)")
    .addEventListener?.("change", () => state.theme === "auto" && update({}));

  let resizeQueued = false;
  window.addEventListener(
    "resize",
    () => {
      if (resizeQueued) return;
      resizeQueued = true;
      requestAnimationFrame(() => {
        resizeQueued = false;
        engine?.set({ column: measureColumn() });
      });
    },
    { passive: true },
  );

  applyPageTheme();
  syncControls();
  persist.save(state);

  // Start once the page is idle so the background never competes with first paint.
  const boot = () => {
    engine = createDitherBackground(canvas, {
      ...engineOpts(),
      allowSoftware,
      onStats(st) {
        // the engine may coarsen the grid on its own; reflect that in the UI
        if (st.pixel !== state.px && state.dither !== "ascii") {
          state.px = st.pixel; // in memory only; a reload goes back to your choice
          syncControls();
        }
        renderHud(st);
      },
    });
    failed = !engine;
    renderHud(engine?.state());
  };
  if ("requestIdleCallback" in window)
    requestIdleCallback(boot, { timeout: 600 });
  else setTimeout(boot, 50);

  return {
    get engine() {
      return engine;
    },
    update,
  };
}
