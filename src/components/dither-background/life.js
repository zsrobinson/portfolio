// Game of Life background, ordered-dithered into two tones plus an accent.
//
// Renders at a low grid resolution (one cell = `pixel` CSS px, snapped to
// whole device pixels) and lets CSS upscale it with `image-rendering:
// pixelated`. The sim runs at half that resolution, ticks at a fixed rate,
// and the canvas only redraws when the sim ticked, the cursor painted or the
// page scrolled, so an idle page costs ~10 tiny draws a second.
//
// Text stays readable through a mask: the host passes the page's text blocks
// (document coordinates) and the shader blanks the pattern behind them.

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
`;

// state: r = alive, g = trail, b = accent lineage
const SEED = `
uniform float uSeed, uDensity;
void main() {
  float a = step(hash12(gl_FragCoord.xy + uSeed), uDensity);
  o = vec4(a, a, 0.0, 1.0);
}`;

const STEP = `
uniform sampler2D uState;
uniform vec3 uDrop;
void main() {
  ivec2 sz = textureSize(uState, 0);
  ivec2 c = ivec2(gl_FragCoord.xy);
  vec4 s = texelFetch(uState, c, 0);
  float n = 0.0, lin = 0.0;
  for (int y = -1; y <= 1; y++)
    for (int x = -1; x <= 1; x++) {
      if (x == 0 && y == 0) continue;
      vec4 q = texelFetch(uState, (c + ivec2(x, y) + sz) % sz, 0);
      n += q.r;
      lin = max(lin, q.b * q.r);
    }
  bool was = s.r > 0.5;
  bool alive = was ? (n > 1.5 && n < 3.5) : (n > 2.5 && n < 3.5);
  if (length(gl_FragCoord.xy - uDrop.xy) < uDrop.z &&
      hash12(gl_FragCoord.xy + uTime) < 0.4) alive = true;
  o = vec4(
    alive ? 1.0 : 0.0,
    alive ? 1.0 : max(s.g - 0.07, 0.0),
    alive ? (was ? s.b : lin * 0.97) : s.b * 0.85,
    1.0);
}`;

// cells the cursor spawns carry the accent, and pass it to their offspring
const PAINT = `
uniform sampler2D uState;
uniform vec2 uFrom, uTo;
uniform float uRadius;
void main() {
  vec4 s = texelFetch(uState, ivec2(gl_FragCoord.xy), 0);
  vec2 p = gl_FragCoord.xy, ba = uTo - uFrom;
  float h = clamp(dot(p - uFrom, ba) / max(dot(ba, ba), 1e-4), 0.0, 1.0);
  float d = length(p - uFrom - ba * h);
  if (d < uRadius && hash12(p + fract(uTime * 7.13) * 91.0) < 0.35)
    s = vec4(1.0);
  o = s;
}`;

const PRESENT = `
uniform sampler2D uState, uMask;
uniform vec3 uBg, uInk, uAccent;
uniform int uDither;
uniform float uCss, uViewH, uScroll, uHasMask;
uniform vec2 uMaskSize;

float bayer2(vec2 a) { a = floor(a); return fract(a.x / 2.0 + a.y * a.y * 0.75); }
float bayer4(vec2 a) { return bayer2(0.5 * a) * 0.25 + bayer2(a); }
float bayer8(vec2 a) { return bayer4(0.5 * a) * 0.25 + bayer2(a); }

void main() {
  vec2 c = floor(gl_FragCoord.xy);
  vec4 s = texelFetch(uState, ivec2(c * 0.5), 0);
  float tone = s.r > 0.5 ? 1.0 : s.g * 0.5;
  float acc = s.b * max(s.r, s.g * 0.8);
  // this cell's position on the page, in CSS px from the document top
  vec2 page = vec2((c.x + 0.5) * uCss, uViewH - (c.y + 0.5) * uCss + uScroll);
  float keep = 1.0 - uHasMask * texture(uMask, page / uMaskSize).r;
  tone *= keep;
  acc *= keep;
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
  let progs,
    state,
    maskTex,
    raf = 0,
    running = false,
    lost = false;
  let dirty = true,
    acc = 0,
    last = 0,
    lastScroll = -1,
    ticks = 0;
  let maskSize = [1, 1],
    hasMask = 0,
    pendingMask = null;

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

  function draw(p, dest, w, h) {
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
    draw(p, state.b, size.sw, size.sh);
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

  function reseed() {
    const p = use(progs.seed);
    gl.uniform1f(p.u("uSeed"), Math.random() * 100);
    gl.uniform1f(p.u("uDensity"), 0.14);
    draw(p, state.a, size.sw, size.sh);
    // a few generations so the first frame already has trails
    for (let i = 0; i < 12; i++) step(false);
    dirty = true;
  }

  let sprinkle = 0;
  function step(seedMore = true) {
    const p = use(progs.step);
    let z = 0,
      x = 0,
      y = 0;
    if (seedMore && --sprinkle <= 0) {
      x = Math.random() * size.sw;
      y = Math.random() * size.sh;
      z = 4 + Math.random() * 4;
      sprinkle = 8;
    }
    gl.uniform3f(p.u("uDrop"), x, y, z);
    pass(p);
  }

  function paint() {
    const p = use(progs.paint);
    // ~22 CSS px brush, bigger on a tap or click
    const r = (ptr.burst ? 40 : 18) / (size.css * 2);
    gl.uniform2f(p.u("uFrom"), ptr.px, ptr.py);
    gl.uniform2f(p.u("uTo"), ptr.x, ptr.y);
    gl.uniform1f(p.u("uRadius"), Math.max(1.5, r));
    pass(p);
    ptr.px = ptr.x;
    ptr.py = ptr.y;
    ptr.burst = false;
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
    draw(p, null, size.gw, size.gh);
  }

  // ---- text mask
  const maskCanvas = document.createElement("canvas");
  function uploadMask(m) {
    const [rects, docW, docH] = m;
    const max = gl.getParameter(gl.MAX_TEXTURE_SIZE);
    const sx = Math.max(MASK_PX, docW / max);
    const sy = Math.max(MASK_PX, docH / max);
    maskCanvas.width = Math.max(1, Math.ceil(docW / sx));
    maskCanvas.height = Math.max(1, Math.ceil(docH / sy));
    const x = maskCanvas.getContext("2d");
    x.fillStyle = "#fff";
    for (let i = 0; i < rects.length; i += 4)
      x.fillRect(
        rects[i] / sx,
        rects[i + 1] / sy,
        rects[i + 2] / sx,
        rects[i + 3] / sy,
      );
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
      acc += Math.min(now - last, 250);
      const stepMs = 1000 / opts.speed;
      let n = 0;
      while (acc >= stepMs && n < 3) {
        step();
        acc -= stepMs;
        n++;
      }
      if (n === 3) acc = 0;
      if (ptr.live && (ptr.x !== ptr.px || ptr.y !== ptr.py || ptr.burst)) {
        paint();
        dirty = true;
      }
      if (n) dirty = true;
      ticks += n;
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
    dirty = true;
  }
  const on = {
    pointermove: (e) => e.pointerType !== "touch" && move(e.clientX, e.clientY),
    pointerdown: (e) => {
      move(e.clientX, e.clientY, true);
      ptr.burst = true;
    },
    // touchmove keeps firing while the page scrolls under a finger
    touchstart: (e) =>
      e.touches[0] && move(e.touches[0].clientX, e.touches[0].clientY, true),
    touchmove: (e) =>
      e.touches[0] && move(e.touches[0].clientX, e.touches[0].clientY),
    touchend: (e) => !e.touches.length && (ptr.live = false),
    resize: () => requestAnimationFrame(build),
    visibilitychange: () => (document.hidden ? stop() : start()),
    pagehide: stop,
    pageshow: start,
  };
  const docOn = { mouseleave: () => (ptr.live = false) };
  const passive = { passive: true };
  for (const k in on)
    (k === "visibilitychange" ? document : window).addEventListener(
      k,
      on[k],
      passive,
    );
  for (const k in docOn)
    document.documentElement.addEventListener(k, docOn[k], passive);

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
    /** Blank the pattern behind these rects: flat [x, y, w, h, ...] in document CSS px. */
    setMask(rects, docWidth, docHeight) {
      pendingMask = [rects, docWidth, docHeight];
      if (!lost) uploadMask(pendingMask);
    },
    reseed() {
      if (!lost) reseed();
    },
    stats: () => ({ grid: [size.gw, size.gh], sim: [size.sw, size.sh], ticks }),
    destroy() {
      stop();
      for (const k in on)
        (k === "visibilitychange" ? document : window).removeEventListener(
          k,
          on[k],
          passive,
        );
      for (const k in docOn)
        document.documentElement.removeEventListener(k, docOn[k], passive);
      lvh.remove();
      gl.getExtension("WEBGL_lose_context")?.loseContext();
    },
  };
}
