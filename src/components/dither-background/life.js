// Game of Life background, ordered-dithered into two tones plus an accent.
//
// Renders at a low grid resolution (one cell = `pixel` CSS px, snapped to
// whole device pixels) and lets CSS upscale it with `image-rendering:
// pixelated`. The sim runs at half that resolution and ticks at a fixed rate.
//
// Heat: every sim cell carries a heat value that cools over time. Tiles of
// cells only advance a generation with probability heat², so the page starts
// lively and gradually freezes, neighbourhood by neighbourhood. Drawing on the
// page reheats just the area around the cursor. Once everything is frozen the
// sim stops entirely and the canvas only redraws on scroll.
//
// Text stays readable through a mask: the host passes the page's lines of
// text and other content (document coordinates), and the pattern stays clear
// of them by a margin, then dissolves back in cell by cell in a Bayer order.

const VERT = `#version 300 es
void main() {
  vec2 p = vec2((gl_VertexID << 1) & 2, gl_VertexID & 2);
  gl_Position = vec4(p * 2.0 - 1.0, 0.0, 1.0);
}`;

const HEAD = `#version 300 es
precision highp float;
precision highp int;
precision highp sampler2D;
out vec4 o;
uniform float uTime;
float hash12(vec2 p) {
  vec3 p3 = fract(vec3(p.xyx) * 0.1031);
  p3 += dot(p3, p3.yzx + 33.33);
  return fract((p3.x + p3.y) * p3.z);
}
float bayer2(vec2 a) { a = floor(a); return fract(a.x / 2.0 + a.y * a.y * 0.75); }
float bayer4(vec2 a) { return bayer2(0.5 * a) * 0.25 + bayer2(a); }
float bayer8(vec2 a) { return bayer4(0.5 * a) * 0.25 + bayer2(a); }
`;

// state: r = alive, g = trail, b = accent lineage, a = heat
const SEED = `
uniform float uSeed, uDensity;
void main() {
  float a = step(hash12(gl_FragCoord.xy + uSeed), uDensity);
  o = vec4(a, a, 0.0, 1.0);
}`;

const STEP = `
uniform sampler2D uState;
uniform vec3 uDrop;
uniform float uStep, uCool;
void main() {
  ivec2 sz = textureSize(uState, 0);
  ivec2 c = ivec2(gl_FragCoord.xy);
  vec4 s = texelFetch(uState, c, 0);
  float n = 0.0, lin = 0.0, warm = 0.0;
  for (int y = -1; y <= 1; y++)
    for (int x = -1; x <= 1; x++) {
      ivec2 at = c + ivec2(x, y);
      // hard edges (not a torus), so warming one side never wakes the other
      if ((x == 0 && y == 0) || any(lessThan(at, ivec2(0))) ||
          any(greaterThanEqual(at, sz))) continue;
      vec4 q = texelFetch(uState, at, 0);
      n += q.r;
      lin = max(lin, q.b * q.r);
      warm = max(warm, q.a);
    }
  // cool down, but stay within reach of warmer neighbours so heat has a
  // soft edge (and no cell can keep itself warm)
  float heat = clamp(max(s.a - uCool, warm - 0.1), 0.0, 1.0);
  // whole 4x4 tiles tick together so Life stays coherent inside them
  vec2 tile = floor(gl_FragCoord.xy / 4.0);
  if (hash12(tile + vec2(uStep * 17.13, uStep * 3.71)) >= heat * heat) {
    o = vec4(s.rgb, heat);
    return;
  }
  bool was = s.r > 0.5;
  bool alive = was ? (n > 1.5 && n < 3.5) : (n > 2.5 && n < 3.5);
  if (heat > 0.3 && length(gl_FragCoord.xy - uDrop.xy) < uDrop.z &&
      hash12(gl_FragCoord.xy + uTime) < 0.4) alive = true;
  o = vec4(
    alive ? 1.0 : 0.0,
    alive ? 1.0 : max(s.g - 0.07, 0.0),
    alive ? (was ? s.b : lin * 0.97) : s.b * 0.85,
    heat);
}`;

// cells the cursor spawns carry the accent (and pass it on); the area
// around the cursor is reheated
const PAINT = `
uniform sampler2D uState;
uniform vec2 uFrom, uTo;
uniform float uRadius, uHeatRadius;
void main() {
  vec4 s = texelFetch(uState, ivec2(gl_FragCoord.xy), 0);
  vec2 p = gl_FragCoord.xy, ba = uTo - uFrom;
  float h = clamp(dot(p - uFrom, ba) / max(dot(ba, ba), 1e-4), 0.0, 1.0);
  float d = length(p - uFrom - ba * h);
  if (d < uRadius && hash12(p + fract(uTime * 7.13) * 91.0) < 0.35)
    s.rgb = vec3(1.0);
  s.a = max(s.a, 1.0 - smoothstep(uHeatRadius * 0.5, uHeatRadius, d));
  o = s;
}`;

const PRESENT = `
uniform sampler2D uState, uMask;
uniform vec3 uBg, uInk, uAccent;
uniform int uDither;
uniform float uCss, uViewH, uScroll, uHasMask;
uniform vec2 uMaskSize;

void main() {
  vec2 c = floor(gl_FragCoord.xy);
  vec2 cell = floor(c * 0.5);
  // the mask is judged per Life cell, at its centre on the page, and cells
  // near content drop out in Bayer order: the fade is a dither, not a blend
  vec2 page = vec2((cell.x * 2.0 + 1.0) * uCss,
                   uViewH - (cell.y * 2.0 + 1.0) * uCss + uScroll);
  float keep = 1.0 - uHasMask * texture(uMask, page / uMaskSize).r;
  if (keep <= bayer4(cell) + 0.03125) {
    o = vec4(uBg, 1.0);
    return;
  }
  vec4 s = texelFetch(uState, ivec2(cell), 0);
  float tone = s.r > 0.5 ? 1.0 : s.g * 0.5;
  float acc = s.b * max(s.r, s.g * 0.8);
  float t = uDither == 2 ? bayer8(c) + 0.0078125
          : uDither == 1 ? bayer4(c) + 0.03125
          : 0.5;
  vec3 col = tone > t ? uInk : uBg;
  if (acc > t) col = uAccent;
  o = vec4(col, 1.0);
}`;

const DITHER = { none: 0, bayer4: 1, bayer8: 2 };
const MAX_CELLS = 300_000;
const MASK_PX = 8; // CSS px per mask texel
// heat loses one 8-bit step every COOL_EVERY generations: ~50s from hot to
// frozen at 10 generations a second
const COOL_EVERY = 2;
const FROZEN_AFTER = 255 * COOL_EVERY + 20; // generations, with slack
const HEAT_RADIUS = 120; // CSS px reheated around the cursor

function rgb(hex) {
  const n = parseInt(hex.slice(1), 16);
  return [((n >> 16) & 255) / 255, ((n >> 8) & 255) / 255, (n & 255) / 255];
}

/**
 * @param {HTMLCanvasElement} canvas fixed, full-viewport, pointer-events: none
 * @param {{bg: string, ink: string, accent: string, pixel?: number,
 *   dither?: "none" | "bayer4" | "bayer8", speed?: number, motion?: boolean,
 *   allowSoftware?: boolean}} options
 */
export function createLifeBackground(canvas, options) {
  const gl = canvas.getContext("webgl2", {
    alpha: false,
    antialias: false,
    depth: false,
    stencil: false,
    preserveDrawingBuffer: false,
    powerPreference: "low-power",
    // no software GL: the plain page background is the fallback
    failIfMajorPerformanceCaveat: !options.allowSoftware,
  });
  if (!gl) return null;

  const opts = {
    pixel: 4,
    dither: "bayer4",
    speed: 10,
    motion: true,
    ...options,
  };
  const size = { gw: 0, gh: 0, sw: 0, sh: 0, css: 1 };
  const ptr = { x: 0, y: 0, px: 0, py: 0, live: false, burst: false };
  let progs, state, maskTex;
  let raf = 0;
  let running = false;
  let lost = false;
  let dirty = true;
  let acc = 0;
  let last = 0;
  let lastScroll = -1;
  let generation = 0;
  let lastHeat = 0; // generation of the last reheat
  let maskSize = [1, 1];
  let hasMask = 0;
  let pendingMask = null;
  let zones = [];

  const lvh = document.createElement("div");
  lvh.setAttribute("aria-hidden", "true");
  lvh.style.cssText =
    "position:fixed;top:0;width:0;height:100vh;height:100lvh;visibility:hidden;pointer-events:none";
  document.body.append(lvh);

  // ---- gl plumbing
  function program(src) {
    const make = (type, text) => {
      const s = gl.createShader(type);
      gl.shaderSource(s, text);
      gl.compileShader(s);
      if (!gl.getShaderParameter(s, gl.COMPILE_STATUS) && !gl.isContextLost())
        throw new Error(gl.getShaderInfoLog(s));
      return s;
    };
    const p = gl.createProgram();
    gl.attachShader(p, make(gl.VERTEX_SHADER, VERT));
    gl.attachShader(p, make(gl.FRAGMENT_SHADER, HEAD + src));
    gl.linkProgram(p);
    const locs = new Map();
    p.u = (name) => {
      if (!locs.has(name)) locs.set(name, gl.getUniformLocation(p, name));
      return locs.get(name);
    };
    return p;
  }

  function texture(filter) {
    const t = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, t);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, filter);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, filter);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    return t;
  }

  function target(w, h) {
    const tex = texture(gl.NEAREST);
    gl.texImage2D(
      gl.TEXTURE_2D,
      0,
      gl.RGBA8,
      w,
      h,
      0,
      gl.RGBA,
      gl.UNSIGNED_BYTE,
      null,
    );
    const fbo = gl.createFramebuffer();
    gl.bindFramebuffer(gl.FRAMEBUFFER, fbo);
    gl.framebufferTexture2D(
      gl.FRAMEBUFFER,
      gl.COLOR_ATTACHMENT0,
      gl.TEXTURE_2D,
      tex,
      0,
    );
    return { tex, fbo };
  }

  function draw(dest, w, h) {
    gl.bindFramebuffer(gl.FRAMEBUFFER, dest ? dest.fbo : null);
    gl.viewport(0, 0, w, h);
    gl.drawArrays(gl.TRIANGLES, 0, 3);
  }

  function use(p) {
    gl.useProgram(p);
    gl.uniform1f(p.u("uTime"), performance.now() / 1000);
    return p;
  }

  function bindState(p) {
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, state.a.tex);
    gl.uniform1i(p.u("uState"), 0);
  }

  // one sim pass: read a, write b, swap
  function pass(p) {
    bindState(p);
    draw(state.b, size.sw, size.sh);
    const t = state.a;
    state.a = state.b;
    state.b = t;
  }

  // ---- sizing
  function measure() {
    const dpr = window.devicePixelRatio || 1;
    const W = window.innerWidth;
    const H = Math.max(window.innerHeight, lvh.offsetHeight);
    let dev = Math.max(1, Math.round(opts.pixel * dpr));
    let gw, gh;
    do {
      gw = Math.ceil((W * dpr) / dev);
      gh = Math.ceil((H * dpr) / dev);
    } while (gw * gh > MAX_CELLS && ++dev);
    return { gw, gh, css: dev / dpr };
  }

  function build() {
    if (lost) return;
    const m = measure();
    // a shorter viewport (mobile URL bar) keeps the taller canvas and the sim
    if (state && m.gw === size.gw && m.gh <= size.gh && m.css === size.css)
      return;
    if (state)
      for (const t of [state.a, state.b]) {
        gl.deleteTexture(t.tex);
        gl.deleteFramebuffer(t.fbo);
      }
    Object.assign(size, m);
    size.sw = Math.ceil(m.gw / 2);
    size.sh = Math.ceil(m.gh / 2);
    canvas.width = m.gw;
    canvas.height = m.gh;
    canvas.style.width = m.gw * m.css + "px";
    canvas.style.height = m.gh * m.css + "px";
    state = { a: target(size.sw, size.sh), b: target(size.sw, size.sh) };
    reseed();
  }

  // a fresh soup, everywhere hot
  function reseed() {
    const p = use(progs.seed);
    gl.uniform1f(p.u("uSeed"), Math.random() * 100);
    gl.uniform1f(p.u("uDensity"), 0.14);
    draw(state.a, size.sw, size.sh);
    lastHeat = generation;
    // a few generations so the first frame already has trails
    for (let i = 0; i < 12; i++) step(false);
    dirty = true;
  }

  const frozen = () => generation - lastHeat > FROZEN_AFTER;

  let sprinkle = 0;
  function step(seedMore = true) {
    const p = use(progs.step);
    let z = 0;
    let x = 0;
    let y = 0;
    if (seedMore && --sprinkle <= 0) {
      [x, y, z] = sprinklePoint();
      sprinkle = 8;
    }
    gl.uniform3f(p.u("uDrop"), x, y, z);
    gl.uniform1f(p.u("uStep"), generation % 4096);
    gl.uniform1f(p.u("uCool"), generation % COOL_EVERY ? 0 : 1 / 255);
    pass(p);
    generation++;
  }

  // Keep the parts you can actually see alive: most sprinkles land in a
  // visible zone (the strips between sections, wide side margins). They only
  // take where the sim is still warm.
  const visible = [];
  function sprinklePoint() {
    const cell = size.css * 2;
    const viewH = size.gh * size.css;
    let r = 4 + Math.random() * 4;
    visible.length = 0;
    for (const z of zones) {
      const y0 = Math.max(z[1], lastScroll);
      const y1 = Math.min(z[1] + z[3], lastScroll + viewH);
      if (y1 - y0 > cell * 2)
        visible.push(z[0], y0 - lastScroll, z[2], y1 - y0);
    }
    if (visible.length && Math.random() < 0.75) {
      const i = 4 * Math.floor((Math.random() * visible.length) / 4);
      const h = visible[i + 3];
      r = Math.min(r, h / cell / 2);
      const x = visible[i] + Math.random() * visible[i + 2];
      const y = visible[i + 1] + h / 2 + (Math.random() - 0.5) * (h - r * cell);
      return [x / cell, (viewH - y) / cell, r];
    }
    return [Math.random() * size.sw, Math.random() * size.sh, r];
  }

  function paint() {
    const p = use(progs.paint);
    const cell = size.css * 2;
    // ~18 CSS px brush, bigger on a tap or click
    const r = (ptr.burst ? 40 : 18) / cell;
    gl.uniform2f(p.u("uFrom"), ptr.px, ptr.py);
    gl.uniform2f(p.u("uTo"), ptr.x, ptr.y);
    gl.uniform1f(p.u("uRadius"), Math.max(1.5, r));
    gl.uniform1f(p.u("uHeatRadius"), HEAT_RADIUS / cell);
    pass(p);
    ptr.px = ptr.x;
    ptr.py = ptr.y;
    ptr.burst = false;
    lastHeat = generation;
  }

  const colors = { bg: [0, 0, 0], ink: [0, 0, 0], accent: [0, 0, 0] };
  function applyColors() {
    colors.bg = rgb(opts.bg);
    colors.ink = rgb(opts.ink);
    colors.accent = rgb(opts.accent);
    dirty = true;
  }

  function present() {
    const p = use(progs.present);
    bindState(p);
    gl.activeTexture(gl.TEXTURE1);
    gl.bindTexture(gl.TEXTURE_2D, maskTex);
    gl.uniform1i(p.u("uMask"), 1);
    gl.uniform3f(p.u("uBg"), ...colors.bg);
    gl.uniform3f(p.u("uInk"), ...colors.ink);
    gl.uniform3f(p.u("uAccent"), ...colors.accent);
    gl.uniform1i(p.u("uDither"), DITHER[opts.dither] ?? 1);
    gl.uniform1f(p.u("uCss"), size.css);
    gl.uniform1f(p.u("uViewH"), size.gh * size.css);
    gl.uniform1f(p.u("uScroll"), lastScroll);
    gl.uniform1f(p.u("uHasMask"), hasMask);
    gl.uniform2f(p.u("uMaskSize"), maskSize[0], maskSize[1]);
    draw(null, size.gw, size.gh);
  }

  // ---- mask
  // Each rect is drawn as N additive layers, each a little larger: the mask
  // is 1 out to `margin`, then ramps to 0 over `fade`. Overlapping ramps add
  // up, which keeps narrow gaps (between lines, paragraphs) fully clear.
  const maskCanvas = document.createElement("canvas");
  const LAYERS = 8;
  function uploadMask({ rects, width, height, margin, fade }) {
    const max = gl.getParameter(gl.MAX_TEXTURE_SIZE);
    const sx = Math.max(MASK_PX, width / max);
    const sy = Math.max(MASK_PX, height / max);
    maskCanvas.width = Math.max(1, Math.ceil(width / sx));
    maskCanvas.height = Math.max(1, Math.ceil(height / sy));
    const x = maskCanvas.getContext("2d");
    x.globalCompositeOperation = "source-over";
    x.fillStyle = "#000";
    x.fillRect(0, 0, maskCanvas.width, maskCanvas.height);
    x.globalCompositeOperation = "lighter";
    const v = Math.ceil(255 / LAYERS);
    x.fillStyle = `rgb(${v},${v},${v})`;
    for (let k = 0; k < LAYERS; k++) {
      const ex = margin[0] + (fade[0] * k) / LAYERS;
      const ey = margin[1] + (fade[1] * k) / LAYERS;
      for (let i = 0; i < rects.length; i += 4)
        x.fillRect(
          (rects[i] - ex) / sx,
          (rects[i + 1] - ey) / sy,
          (rects[i + 2] + ex * 2) / sx,
          (rects[i + 3] + ey * 2) / sy,
        );
    }
    gl.bindTexture(gl.TEXTURE_2D, maskTex);
    gl.pixelStorei(gl.UNPACK_ALIGNMENT, 1);
    gl.texImage2D(
      gl.TEXTURE_2D,
      0,
      gl.R8,
      gl.RED,
      gl.UNSIGNED_BYTE,
      maskCanvas,
    );
    maskSize = [maskCanvas.width * sx, maskCanvas.height * sy];
    hasMask = 1;
    dirty = true;
  }

  // ---- loop
  function frame(now) {
    raf = requestAnimationFrame(frame);
    const scroll = window.scrollY;
    if (scroll !== lastScroll) {
      lastScroll = scroll;
      dirty = true;
    }
    if (opts.motion) {
      if (ptr.burst || (ptr.live && (ptr.x !== ptr.px || ptr.y !== ptr.py))) {
        paint();
        dirty = true;
      }
      // fully frozen: no sim work at all until something reheats it
      if (frozen()) acc = 0;
      else acc += Math.min(now - last, 250);
      const stepMs = 1000 / opts.speed;
      let n = 0;
      while (acc >= stepMs && n < 3) {
        step();
        acc -= stepMs;
        n++;
      }
      if (n === 3) acc = 0;
      if (n) dirty = true;
    }
    last = now;
    if (dirty) {
      present();
      dirty = false;
    }
  }

  function start() {
    if (running || lost || document.hidden) return;
    running = true;
    last = performance.now();
    raf = requestAnimationFrame(frame);
  }
  function stop() {
    running = false;
    cancelAnimationFrame(raf);
  }

  // ---- input: viewport px -> sim cells (y up)
  function move(cx, cy, fresh) {
    const x = cx / (size.css * 2);
    const y = (size.gh * size.css - cy) / (size.css * 2);
    if (fresh || !ptr.live) {
      ptr.px = x;
      ptr.py = y;
    }
    ptr.x = x;
    ptr.y = y;
    ptr.live = true;
  }
  // Mouse and pen draw as they move. Touch only draws on a tap: a finger
  // scrolling the page is reading, and shouldn't wake the pattern up.
  const tap = { x: 0, y: 0, t: 0 };
  const on = {
    pointermove: (e) => {
      if (e.pointerType !== "touch") move(e.clientX, e.clientY);
    },
    pointerdown: (e) => {
      if (e.pointerType === "touch") {
        tap.x = e.clientX;
        tap.y = e.clientY;
        tap.t = e.timeStamp;
        return;
      }
      move(e.clientX, e.clientY, true);
      ptr.burst = true;
    },
    pointerup: (e) => {
      if (e.pointerType !== "touch") return;
      const still = Math.hypot(e.clientX - tap.x, e.clientY - tap.y) < 10;
      if (!still || e.timeStamp - tap.t > 400) return;
      move(e.clientX, e.clientY, true);
      ptr.live = false;
      ptr.burst = true;
    },
    resize: () => requestAnimationFrame(build),
    visibilitychange: () => (document.hidden ? stop() : start()),
    pagehide: stop,
    pageshow: start,
  };
  const docOn = { mouseleave: () => (ptr.live = false) };
  const passive = { passive: true };
  const listen = (add) => {
    const verb = add ? "addEventListener" : "removeEventListener";
    for (const k in on)
      (k === "visibilitychange" ? document : window)[verb](k, on[k], passive);
    for (const k in docOn) document.documentElement[verb](k, docOn[k], passive);
  };
  listen(true);

  function init() {
    progs = {
      seed: program(SEED),
      step: program(STEP),
      paint: program(PAINT),
      present: program(PRESENT),
    };
    maskTex = texture(gl.LINEAR);
    gl.texImage2D(
      gl.TEXTURE_2D,
      0,
      gl.R8,
      1,
      1,
      0,
      gl.RED,
      gl.UNSIGNED_BYTE,
      new Uint8Array(1),
    );
    state = null;
    build();
    if (pendingMask) uploadMask(pendingMask);
  }

  canvas.addEventListener("webglcontextlost", (e) => {
    e.preventDefault();
    lost = true;
    stop();
  });
  canvas.addEventListener("webglcontextrestored", () => {
    lost = false;
    init();
    start();
  });

  applyColors();
  init();
  start();

  return {
    /** Update colors or settings; changing `pixel` rebuilds the grid. */
    set(next) {
      const rebuild = next.pixel !== undefined && next.pixel !== opts.pixel;
      Object.assign(opts, next);
      applyColors();
      if (rebuild) {
        size.gw = 0;
        build();
      }
    },
    /**
     * Keep the pattern clear of content. All rects are flat [x, y, w, h, ...]
     * arrays in document CSS px.
     * @param {{rects: number[], width: number, height: number,
     *   margin?: [number, number], fade?: [number, number], zones?: number[]}} mask
     *   `margin` stays fully clear, then the pattern dissolves back in over
     *   `fade`; `zones` are where to keep sprinkling new cells.
     */
    setMask({
      rects,
      width,
      height,
      margin = [16, 12],
      fade = [24, 24],
      zones: z = [],
    }) {
      zones = [];
      for (let i = 0; i < z.length; i += 4) zones.push(z.slice(i, i + 4));
      pendingMask = { rects, width, height, margin, fade };
      if (!lost) uploadMask(pendingMask);
    },
    reseed() {
      if (!lost) reseed();
    },
    stats: () => ({
      grid: [size.gw, size.gh],
      sim: [size.sw, size.sh],
      generation,
      frozen: frozen(),
    }),
    destroy() {
      stop();
      listen(false);
      lvh.remove();
      gl.getExtension("WEBGL_lose_context")?.loseContext();
    },
  };
}
