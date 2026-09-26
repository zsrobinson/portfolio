// PROTOTYPE: throwaway dithered background engine. See ./README.md.
//
// Pipeline, all at a low "grid" resolution (one cell = `pixel` CSS px):
//   effect sim passes (ping-pong RGBA8)  ->  field pass (R = tone, G = accent)
//   -> present pass (ordered dither / ascii into the palette, upscaled with
//   image-rendering: pixelated).
// Sim state is packed into RGBA8 as two 16-bit fixed-point channels, so it
// runs on any WebGL2 device without float render-target extensions.

const VERT = `#version 300 es
out vec2 vUv;
void main() {
  vec2 p = vec2((gl_VertexID << 1) & 2, gl_VertexID & 2);
  vUv = p;
  gl_Position = vec4(p * 2.0 - 1.0, 0.0, 1.0);
}`;

const COMMON = `#version 300 es
precision highp float;
precision highp int;
precision highp sampler2D;
in vec2 vUv;
out vec4 o;
uniform float uTime;
uniform vec2 uPtr, uPtrPrev;
uniform float uPtrOn, uDown, uCss;

vec2 pk(float v) {
  v = floor(clamp(v, 0.0, 1.0) * 65535.0 + 0.5);
  float hi = floor(v / 256.0);
  return vec2(hi, v - hi * 256.0) / 255.0;
}
float upk(vec2 c) {
  c = floor(c * 255.0 + 0.5);
  return (c.x * 256.0 + c.y) / 65535.0;
}
float hash12(vec2 p) {
  vec3 p3 = fract(vec3(p.xyx) * 0.1031);
  p3 += dot(p3, p3.yzx + 33.33);
  return fract((p3.x + p3.y) * p3.z);
}
float vnoise(vec2 p) {
  vec2 i = floor(p), f = fract(p);
  vec2 u = f * f * (3.0 - 2.0 * f);
  float a = hash12(i), b = hash12(i + vec2(1, 0));
  float c = hash12(i + vec2(0, 1)), d = hash12(i + vec2(1, 1));
  return mix(mix(a, b, u.x), mix(c, d, u.x), u.y);
}
float fbm(vec2 p) {
  float s = 0.0, a = 0.5;
  for (int i = 0; i < 5; i++) {
    s += a * vnoise(p);
    p = p * 2.03 + vec2(17.1, 9.2);
    a *= 0.5;
  }
  return s;
}
float segDist(vec2 p, vec2 a, vec2 b) {
  vec2 pa = p - a, ba = b - a;
  float h = clamp(dot(pa, ba) / max(dot(ba, ba), 1e-4), 0.0, 1.0);
  return length(pa - ba * h);
}
// soft brush along the pointer's path this frame, 0..1
float brush(vec2 p, float r) {
  float d = segDist(p, uPtrPrev, uPtr);
  return uPtrOn * exp(-d * d / (r * r));
}
`;

// ---------------------------------------------------------------- effects

const DRIFT_TRAIL = `
uniform sampler2D uState;
uniform float uRadius;
void main() {
  ivec2 c = ivec2(gl_FragCoord.xy);
  ivec2 sz = textureSize(uState, 0) - 1;
  vec4 s = texelFetch(uState, c, 0);
  float i0 = upk(s.rg);
  float avg = 0.25 * (
    upk(texelFetch(uState, clamp(c + ivec2(1, 0), ivec2(0), sz), 0).rg) +
    upk(texelFetch(uState, clamp(c - ivec2(1, 0), ivec2(0), sz), 0).rg) +
    upk(texelFetch(uState, clamp(c + ivec2(0, 1), ivec2(0), sz), 0).rg) +
    upk(texelFetch(uState, clamp(c - ivec2(0, 1), ivec2(0), sz), 0).rg));
  float I = mix(i0, avg, 0.5) * 0.975;
  vec2 dir = s.ba * 2.0 - 1.0;
  vec2 v = uPtr - uPtrPrev;
  float vl = length(v);
  float k = brush(gl_FragCoord.xy, uRadius);
  if (vl > 0.05) dir = normalize(mix(dir, v / vl, k) + 1e-5);
  I = max(I, k * clamp(vl * 0.12 + uDown * 0.6, 0.0, 1.0));
  o = vec4(pk(I), dir * 0.5 + 0.5);
}`;

const DRIFT_FIELD = `
uniform sampler2D uState;
uniform float uMode;
void main() {
  vec2 fc = gl_FragCoord.xy;
  vec4 tr = texelFetch(uState, ivec2(fc), 0);
  float I = upk(tr.rg);
  vec2 dir = tr.ba * 2.0 - 1.0;
  vec2 p = fc * uCss / 260.0;
  p -= dir * I * 0.9;
  float t = uTime * 0.035;
  vec2 q = vec2(fbm(p + vec2(0.0, t)), fbm(p + vec2(5.2, 1.3) - t));
  vec2 r = vec2(fbm(p + 3.0 * q + vec2(1.7, 9.2) + t * 1.6),
                fbm(p + 3.0 * q + vec2(8.3, 2.8) - t * 1.3));
  float v = fbm(p + 3.0 * r);
  float tone;
  if (uMode < 0.5) {            // clouds
    tone = smoothstep(0.28, 0.78, v);
  } else if (uMode < 1.5) {     // contour: topographic lines
    float x = v * 14.0;
    float w = fwidth(x) * 1.2;
    float l = 1.0 - smoothstep(0.0, w, abs(fract(x) - 0.5) - 0.5 + w);
    tone = max(l * 0.9, smoothstep(0.55, 0.9, v) * 0.35);
  } else {                      // marble bands
    tone = 0.5 + 0.5 * sin(p.x * 3.0 + v * 12.0 + q.y * 4.0);
    tone = smoothstep(0.1, 0.95, tone);
  }
  o = vec4(tone, I, 0.0, 1.0);
}`;

const RIPPLE_STEP = `
uniform sampler2D uState;
uniform float uDamp, uRadius;
uniform vec3 uDrop;
float H(ivec2 c, ivec2 sz) {
  return upk(texelFetch(uState, clamp(c, ivec2(0), sz), 0).rg) * 2.0 - 1.0;
}
void main() {
  ivec2 c = ivec2(gl_FragCoord.xy);
  ivec2 sz = textureSize(uState, 0) - 1;
  vec4 s = texelFetch(uState, c, 0);
  float cur = upk(s.rg) * 2.0 - 1.0;
  float prev = upk(s.ba) * 2.0 - 1.0;
  float n = H(c + ivec2(1, 0), sz) + H(c - ivec2(1, 0), sz) +
            H(c + ivec2(0, 1), sz) + H(c - ivec2(0, 1), sz);
  float h = (n * 0.5 - prev) * uDamp;
  vec2 p = gl_FragCoord.xy;
  float mv = length(uPtr - uPtrPrev);
  h -= brush(p, uRadius) * clamp(mv * 0.05, 0.0, 0.35);
  float dd = length(p - uDrop.xy);
  h += uDrop.z * (1.0 - smoothstep(0.0, uRadius * 1.3, dd));
  o = vec4(pk(h * 0.5 + 0.5), pk(cur * 0.5 + 0.5));
}`;

const RIPPLE_FIELD = `
uniform sampler2D uState;
uniform float uMode;
float H(ivec2 c, ivec2 sz) {
  return upk(texelFetch(uState, clamp(c, ivec2(0), sz), 0).rg) * 2.0 - 1.0;
}
void main() {
  ivec2 c = ivec2(gl_FragCoord.xy);
  ivec2 sz = textureSize(uState, 0) - 1;
  float h = H(c, sz);
  vec2 g = vec2(H(c + ivec2(1, 0), sz) - H(c - ivec2(1, 0), sz),
                H(c + ivec2(0, 1), sz) - H(c - ivec2(0, 1), sz));
  // refracted "pool floor": a dot grid on the monospace rhythm (1ch x 1.5em)
  vec2 fp = (gl_FragCoord.xy + g * 18.0) * uCss / vec2(19.2, 24.0);
  vec2 cell = abs(fract(fp) - 0.5);
  float dots = uMode < 0.5 ? step(max(cell.x, cell.y), 0.12)
                           : step(min(cell.x, cell.y), 0.04);
  vec3 n = normalize(vec3(-g * 5.0, 1.0));
  float spec = pow(max(dot(n, normalize(vec3(-0.4, 0.6, 0.7))), 0.0), 24.0);
  float slope = g.x * 5.0 + g.y * 8.0;
  float tone = dots * 0.45 + clamp(slope, -0.4, 0.8) + smoothstep(0.5, 0.9, spec) * 0.3;
  float accent = smoothstep(0.08, 0.3, length(g));
  o = vec4(clamp(tone, 0.0, 1.0), accent, 0.0, 1.0);
}`;

const CORAL_SEED = `
uniform float uSeed;
void main() {
  vec2 p = gl_FragCoord.xy;
  vec2 b = floor(p * uCss / 14.0);
  float v = step(hash12(b + uSeed), 0.035) * step(0.5, hash12(p + uSeed));
  o = vec4(pk(1.0), pk(v * 0.5));
}`;

const CORAL_STEP = `
uniform sampler2D uState;
uniform vec2 uFK;
uniform vec3 uDrop;
uniform float uRadius;
ivec2 SZ;
vec2 S(ivec2 c) {
  vec4 s = texelFetch(uState, (c + SZ) % SZ, 0);
  return vec2(upk(s.rg), upk(s.ba));
}
void main() {
  SZ = textureSize(uState, 0);
  ivec2 c = ivec2(gl_FragCoord.xy);
  vec2 s = S(c);
  vec2 lap = -s
    + 0.2 * (S(c + ivec2(1, 0)) + S(c - ivec2(1, 0)) +
             S(c + ivec2(0, 1)) + S(c - ivec2(0, 1)))
    + 0.05 * (S(c + ivec2(1, 1)) + S(c + ivec2(-1, 1)) +
              S(c + ivec2(1, -1)) + S(c - ivec2(1, 1)));
  float u = s.x, v = s.y, uvv = u * v * v;
  u += lap.x - uvv + uFK.x * (1.0 - u);
  v += 0.5 * lap.y + uvv - (uFK.x + uFK.y) * v;
  vec2 p = gl_FragCoord.xy;
  float k = brush(p, uRadius);
  if (k > 0.35) { v = max(v, 0.5); u = min(u, 0.5); }
  if (length(p - uDrop.xy) < uDrop.z) { v = 0.5; u = 0.5; }
  o = vec4(pk(u), pk(v));
}`;

const CORAL_FIELD = `
uniform sampler2D uState;
uniform float uRadius;
void main() {
  vec4 s = texelFetch(uState, ivec2(gl_FragCoord.xy), 0);
  float v = upk(s.ba);
  float tone = smoothstep(0.06, 0.34, v);
  float glow = brush(gl_FragCoord.xy, uRadius * 2.5);
  o = vec4(tone, glow * 0.8, 0.0, 1.0);
}`;

const LIFE_SEED = `
uniform float uSeed;
void main() {
  vec2 p = gl_FragCoord.xy;
  float a = step(hash12(p + uSeed), 0.14);
  o = vec4(a, a, 0.0, 1.0);
}`;

const LIFE_STEP = `
uniform sampler2D uState;
uniform vec3 uDrop;
uniform float uFade;
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
  vec2 p = gl_FragCoord.xy;
  if (length(p - uDrop.xy) < uDrop.z && hash12(p + uTime) < 0.4) alive = true;
  float a = alive ? 1.0 : 0.0;
  float trail = alive ? 1.0 : max(s.g - uFade, 0.0);
  float b = alive ? (was ? s.b : lin * 0.97) : s.b * 0.85;
  o = vec4(a, trail, b, 1.0);
}`;

const LIFE_PAINT = `
uniform sampler2D uState;
uniform float uRadius;
void main() {
  vec4 s = texelFetch(uState, ivec2(gl_FragCoord.xy), 0);
  vec2 p = gl_FragCoord.xy;
  float k = brush(p, uRadius);
  if (k > 0.3 && hash12(p + fract(uTime * 7.13) * 91.0) < 0.35) s = vec4(1.0, 1.0, 1.0, 1.0);
  o = s;
}`;

const LIFE_FIELD = `
uniform sampler2D uState;
uniform float uScale;
void main() {
  vec4 s = texelFetch(uState, ivec2(gl_FragCoord.xy / uScale), 0);
  float tone = s.r > 0.5 ? 1.0 : s.g * 0.5;
  o = vec4(tone, s.b * max(s.r, s.g * 0.8), 0.0, 1.0);
}`;

// velocity packed as two 16-bit channels, range +-4 cells/step
const SMOKE_VEL = `
uniform sampler2D uVel;
uniform float uRadius;
vec2 V(ivec2 c) {
  vec4 s = texelFetch(uVel, clamp(c, ivec2(0), textureSize(uVel, 0) - 1), 0);
  return (vec2(upk(s.rg), upk(s.ba)) - 0.5) * 8.0;
}
vec2 Vb(vec2 p) {
  p -= 0.5;
  vec2 f = fract(p);
  ivec2 i = ivec2(floor(p));
  return mix(mix(V(i), V(i + ivec2(1, 0)), f.x),
             mix(V(i + ivec2(0, 1)), V(i + ivec2(1, 1)), f.x), f.y);
}
void main() {
  vec2 p = gl_FragCoord.xy;
  vec2 v = V(ivec2(p));
  v = Vb(p - v) * 0.985;
  v += brush(p, uRadius) * (uPtr - uPtrPrev) * 0.5;
  v = clamp(v, -3.9, 3.9);
  o = vec4(pk(v.x / 8.0 + 0.5), pk(v.y / 8.0 + 0.5));
}`;

const SMOKE_DYE = `
uniform sampler2D uVel, uDye;
uniform float uRadius, uFade;
uniform vec3 uDrop;
vec2 V(ivec2 c) {
  vec4 s = texelFetch(uVel, clamp(c, ivec2(0), textureSize(uVel, 0) - 1), 0);
  return (vec2(upk(s.rg), upk(s.ba)) - 0.5) * 8.0;
}
vec2 D(ivec2 c) {
  vec4 s = texelFetch(uDye, clamp(c, ivec2(0), textureSize(uDye, 0) - 1), 0);
  return vec2(upk(s.rg), upk(s.ba));
}
vec2 Db(vec2 p) {
  p -= 0.5;
  vec2 f = fract(p);
  ivec2 i = ivec2(floor(p));
  return mix(mix(D(i), D(i + ivec2(1, 0)), f.x),
             mix(D(i + ivec2(0, 1)), D(i + ivec2(1, 1)), f.x), f.y);
}
float psi(vec2 q) { return vnoise(q) + 0.5 * vnoise(q * 2.1 + 7.3); }
void main() {
  vec2 p = gl_FragCoord.xy;
  vec2 q = p * uCss / 180.0 + vec2(0.0, uTime * 0.05);
  float e = 0.05;
  vec2 curl = vec2(psi(q + vec2(0, e)) - psi(q - vec2(0, e)),
                   -(psi(q + vec2(e, 0)) - psi(q - vec2(e, 0)))) / (2.0 * e);
  vec2 v = curl * 0.35 + vec2(0.0, 0.22) + V(ivec2(p));
  vec2 d = Db(p - v) * uFade;
  // incense along the bottom edge
  float src = smoothstep(0.62, 0.8, vnoise(vec2(p.x * uCss / 90.0, uTime * 0.25)));
  d.x = max(d.x, src * (1.0 - smoothstep(0.0, 6.0, p.y)));
  // puffs
  float dd = length(p - uDrop.xy);
  d.x = max(d.x, uDrop.z * (1.0 - smoothstep(0.0, uRadius * 1.6, dd)));
  float k = brush(p, uRadius);
  d = max(d, vec2(k * 0.7, k));
  o = vec4(pk(d.x), pk(d.y));
}`;

const SMOKE_FIELD = `
uniform sampler2D uDye;
void main() {
  vec4 s = texelFetch(uDye, ivec2(gl_FragCoord.xy), 0);
  float a = upk(s.rg), b = upk(s.ba);
  o = vec4(smoothstep(0.02, 0.85, max(a, b * 0.8)), b, 0.0, 1.0);
}`;

// ---------------------------------------------------------------- present

const PRESENT = `
uniform sampler2D uField, uGlyphs;
uniform vec3 uRamp[8];
uniform int uLevels, uDither;
uniform vec3 uAccent;
uniform float uIntensity, uCalm, uGlyphCount;
uniform vec4 uColumn;
uniform vec2 uCell;

float bayer2(vec2 a) { a = floor(a); return fract(a.x / 2.0 + a.y * a.y * 0.75); }
float bayer4(vec2 a) { return bayer2(0.5 * a) * 0.25 + bayer2(a); }
float bayer8(vec2 a) { return bayer4(0.5 * a) * 0.25 + bayer2(a); }
float ign(vec2 p) { return fract(52.9829189 * fract(dot(floor(p), vec2(0.06711056, 0.00583715)))); }

float threshold(vec2 p) {
  if (uDither == 1) return bayer2(p) + 0.125;
  if (uDither == 2) return bayer4(p) + 0.03125;
  if (uDither == 3 || uDither == 5) return bayer8(p) + 0.0078125;
  if (uDither == 4) return ign(p);
  return 0.5;
}

void main() {
  vec2 fc = gl_FragCoord.xy;
  vec2 cell = floor(fc / uCell);
  vec4 f = texelFetch(uField, ivec2(cell), 0);
  float cx = cell.x + 0.5;
  float m = smoothstep(uColumn.x - uColumn.z, uColumn.x, cx) *
            (1.0 - smoothstep(uColumn.y, uColumn.y + uColumn.z, cx));
  float k = uIntensity * mix(1.0, uCalm, m * uColumn.w);
  float tone = f.r * k;
  float acc = f.g * uIntensity * mix(1.0, uCalm * 0.5, m * uColumn.w);
  float t = threshold(cell);
  float lv = tone * float(uLevels - 1);
  float i = floor(lv);
  i += step(t, lv - i);
  int idx = int(clamp(i, 0.0, float(uLevels - 1)));
  if (uDither == 5) {
    // ascii: glyph density carries the tone, color steps with it
    float gi = floor(tone * (uGlyphCount - 1.0) + t * 0.999);
    gi = clamp(gi, 0.0, uGlyphCount - 1.0);
    vec2 local = fract(fc / uCell);
    float g = texture(uGlyphs, vec2((gi + local.x) / uGlyphCount, 1.0 - local.y)).r;
    vec3 ink = uRamp[max(idx, 1)];
    if (acc > t) ink = uAccent;
    o = vec4(mix(uRamp[0], ink, g), 1.0);
    return;
  }
  vec3 col = uRamp[idx];
  if (acc > t) col = uAccent;
  o = vec4(col, 1.0);
}`;

// ---------------------------------------------------------------- tables

export const EFFECTS = [
  {
    id: "drift",
    name: "Drift",
    blurb:
      "domain-warped noise field. move to leave a wake, press to push harder",
    presets: ["clouds", "contour", "marble"],
  },
  {
    id: "ripple",
    name: "Ripple",
    blurb:
      "height-field water over a monospace dot grid. drag for wakes, click to drop",
    presets: ["dots", "tiles"],
  },
  {
    id: "coral",
    name: "Coral",
    blurb: "gray-scott reaction-diffusion. drag to seed growth",
    presets: ["coral", "mitosis", "maze", "worms"],
  },
  {
    id: "life",
    name: "Life",
    blurb:
      "conway's game of life with trails. drag to spawn cells, they inherit your color",
    presets: ["steady", "fast"],
  },
  {
    id: "smoke",
    name: "Smoke",
    blurb: "dye advected through curl noise plus your velocity. drag to stir",
    presets: ["incense", "still"],
  },
];

export const DITHERS = [
  { id: "none", name: "posterize" },
  { id: "bayer2", name: "bayer 2×2" },
  { id: "bayer4", name: "bayer 4×4" },
  { id: "bayer8", name: "bayer 8×8" },
  { id: "ign", name: "noise (ign)" },
  { id: "ascii", name: "ascii" },
];

const CORAL_FK = {
  coral: [0.0545, 0.062],
  mitosis: [0.0367, 0.0649],
  maze: [0.029, 0.057],
  worms: [0.078, 0.061],
};

const GLYPHS = " .:-=+*#%@";

// ---------------------------------------------------------------- engine

function hexToRgb(hex) {
  const n = parseInt(hex.slice(1), 16);
  return [((n >> 16) & 255) / 255, ((n >> 8) & 255) / 255, (n & 255) / 255];
}

export function createDitherBackground(canvas, initial = {}) {
  const gl = canvas.getContext("webgl2", {
    alpha: false,
    antialias: false,
    depth: false,
    stencil: false,
    premultipliedAlpha: false,
    preserveDrawingBuffer: false,
    powerPreference: "low-power",
    // refuse software GL (SwiftShader etc.); the page keeps its flat bg
    failIfMajorPerformanceCaveat: !initial.allowSoftware,
  });
  if (!gl) return null;

  const opts = {
    effect: "drift",
    preset: null,
    theme: { ramp: ["#fffcf0", "#100f0f"], accent: "#3aa99f" },
    dither: "bayer4",
    pixel: 3,
    intensity: 1,
    calm: 0.35,
    speed: 1,
    fps: 60,
    motion: "auto",
    adaptive: true,
    idle: true, // drop to the effect's idle fps after 8s without input
    column: null, // [x0, x1] in CSS px
    onStats: null,
    ...initial,
  };

  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
  const mouse = { x: -1e4, y: -1e4, px: -1e4, py: -1e4, down: 0, last: -1e9 };
  const size = { W: 0, H: 0, gw: 0, gh: 0, cell: 1, css: 1, dev: 1 };
  const stats = { fps: 0, js: 0, steps: 0, governor: "", idle: false };
  const MAX_CELLS = 300_000;
  const IDLE_MS = 8000;

  let progs = {};
  let targets = [];
  let field = null;
  let glyphTex = null;
  let fx = null; // live effect instance
  let raf = 0;
  let running = false;
  let lost = false;
  let needsFrame = true;
  let t0 = performance.now();
  let lastFrame = 0;
  let lastStats = performance.now();
  let frames = 0;
  let jsAccum = 0;
  let stepsAccum = 0;
  let slowSince = 0;
  let changedAt = performance.now();

  // ----- gl helpers
  function compile(src) {
    const vs = gl.createShader(gl.VERTEX_SHADER);
    gl.shaderSource(vs, VERT);
    gl.compileShader(vs);
    const fs = gl.createShader(gl.FRAGMENT_SHADER);
    gl.shaderSource(fs, COMMON + src);
    gl.compileShader(fs);
    if (!gl.getShaderParameter(fs, gl.COMPILE_STATUS) && !gl.isContextLost())
      throw new Error(gl.getShaderInfoLog(fs));
    const p = gl.createProgram();
    gl.attachShader(p, vs);
    gl.attachShader(p, fs);
    gl.linkProgram(p);
    if (!gl.getProgramParameter(p, gl.LINK_STATUS) && !gl.isContextLost())
      throw new Error(gl.getProgramInfoLog(p));
    const locs = new Map();
    const loc = (n) => {
      let l = locs.get(n);
      if (l === undefined) locs.set(n, (l = gl.getUniformLocation(p, n)));
      return l;
    };
    return { p, loc };
  }
  function prog(name, src) {
    return progs[name] || (progs[name] = compile(src));
  }

  function makeTarget(w, h) {
    const tex = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, tex);
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
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    const fbo = gl.createFramebuffer();
    gl.bindFramebuffer(gl.FRAMEBUFFER, fbo);
    gl.framebufferTexture2D(
      gl.FRAMEBUFFER,
      gl.COLOR_ATTACHMENT0,
      gl.TEXTURE_2D,
      tex,
      0,
    );
    const t = { tex, fbo, w, h };
    targets.push(t);
    return t;
  }
  function pair(w, h) {
    const p = { a: makeTarget(w, h), b: makeTarget(w, h) };
    p.swap = () => {
      const t = p.a;
      p.a = p.b;
      p.b = t;
    };
    return p;
  }
  function freeTargets() {
    for (const t of targets) {
      gl.deleteTexture(t.tex);
      gl.deleteFramebuffer(t.fbo);
    }
    targets = [];
  }

  // Bind program + target and the uniforms every shader shares. The caller
  // sets its own uniforms, then calls run().
  let cur = null;
  function use(pr, target, ptrScale = 1, ptrOn = 1) {
    cur = pr;
    gl.bindFramebuffer(gl.FRAMEBUFFER, target ? target.fbo : null);
    if (target) gl.viewport(0, 0, target.w, target.h);
    else gl.viewport(0, 0, canvas.width, canvas.height);
    gl.useProgram(pr.p);
    gl.uniform1f(pr.loc("uTime"), (performance.now() - t0) / 1000);
    gl.uniform2f(pr.loc("uPtr"), mouse.x / ptrScale, mouse.y / ptrScale);
    gl.uniform2f(pr.loc("uPtrPrev"), mouse.px / ptrScale, mouse.py / ptrScale);
    gl.uniform1f(pr.loc("uPtrOn"), ptrOn && pointerLive() ? 1 : 0);
    gl.uniform1f(pr.loc("uDown"), mouse.down);
    gl.uniform1f(pr.loc("uCss"), size.css * ptrScale);
    return pr;
  }
  let unit = 0;
  function tex(name, t) {
    gl.activeTexture(gl.TEXTURE0 + unit);
    gl.bindTexture(gl.TEXTURE_2D, t);
    gl.uniform1i(cur.loc(name), unit++);
  }
  const f1 = (n, v) => gl.uniform1f(cur.loc(n), v);
  const f2 = (n, a, b) => gl.uniform2f(cur.loc(n), a, b);
  const f3 = (n, a, b, c) => gl.uniform3f(cur.loc(n), a, b, c);
  function run() {
    gl.drawArrays(gl.TRIANGLES, 0, 3);
    unit = 0;
  }

  function pointerLive() {
    return mouse.x > -1e3 && performance.now() - mouse.last < 1500;
  }

  // brush radius: ~22 CSS px regardless of pixel size
  const radius = (scale = 1) => Math.max(1.5, 22 / (size.css * scale));

  // ----- effects. Each returns { steps: Hz, step(first), field(), warm }
  const drop = { x: 0, y: 0, z: 0 };
  function randomDrop(w, h, strength) {
    drop.x = Math.random() * w;
    drop.y = Math.random() * h;
    drop.z = strength;
  }

  const makers = {
    drift() {
      const s = pair(size.gw, size.gh);
      const mode = { clouds: 0, contour: 1, marble: 2 }[opts.preset] ?? 0;
      return {
        hz: 60,
        idleFps: 20,
        step() {
          use(prog("driftTrail", DRIFT_TRAIL), s.b);
          tex("uState", s.a.tex);
          f1("uRadius", radius() * 1.6);
          run();
          s.swap();
          consumePointer();
        },
        field() {
          use(prog("driftField", DRIFT_FIELD), field);
          tex("uState", s.a.tex);
          f1("uMode", mode);
          run();
        },
      };
    },

    ripple() {
      const s = pair(size.gw, size.gh);
      const mode = opts.preset === "tiles" ? 1 : 0;
      let rain = 0;
      return {
        hz: 60,
        idleFps: 30,
        step(first) {
          rain -= 1;
          let z = 0;
          if (first && mouse.clicked) {
            drop.x = mouse.x;
            drop.y = mouse.y;
            z = 0.9;
          } else if (rain <= 0) {
            randomDrop(size.gw, size.gh, 0.5);
            z = drop.z;
            rain = 40 + Math.random() * 90;
          }
          use(prog("rippleStep", RIPPLE_STEP), s.b, 1, first ? 1 : 0);
          tex("uState", s.a.tex);
          f1("uDamp", 0.992);
          f1("uRadius", radius());
          f3("uDrop", drop.x, drop.y, z);
          run();
          s.swap();
          if (first) consumePointer();
        },
        field() {
          use(prog("rippleField", RIPPLE_FIELD), field);
          tex("uState", s.a.tex);
          f1("uMode", mode);
          run();
        },
      };
    },

    coral() {
      const s = pair(size.gw, size.gh);
      const fk = CORAL_FK[opts.preset] || CORAL_FK.coral;
      use(prog("coralSeed", CORAL_SEED), s.a);
      f1("uSeed", Math.random() * 100);
      run();
      let seedTimer = 120;
      const it = {
        hz: 360,
        maxSteps: 12,
        warm: 400,
        idleFps: 20,
        step(first) {
          let z = 0;
          if (first && --seedTimer <= 0) {
            randomDrop(size.gw, size.gh, 3);
            z = drop.z;
            seedTimer = 90 + Math.random() * 120;
          }
          if (first && mouse.clicked) {
            drop.x = mouse.x;
            drop.y = mouse.y;
            z = radius() * 1.5;
          }
          use(prog("coralStep", CORAL_STEP), s.b, 1, first ? 1 : 0);
          tex("uState", s.a.tex);
          f2("uFK", fk[0], fk[1]);
          f1("uRadius", radius() * 0.6);
          f3("uDrop", drop.x, drop.y, z);
          run();
          s.swap();
          if (first) consumePointer();
        },
        field() {
          use(prog("coralField", CORAL_FIELD), field);
          tex("uState", s.a.tex);
          f1("uRadius", radius());
          run();
        },
      };
      return it;
    },

    life() {
      const scale = 2;
      const w = Math.ceil(size.gw / scale);
      const h = Math.ceil(size.gh / scale);
      const s = pair(w, h);
      use(prog("lifeSeed", LIFE_SEED), s.a);
      f1("uSeed", Math.random() * 100);
      run();
      let sprinkle = 0;
      const fast = opts.preset === "fast";
      return {
        hz: fast ? 24 : 10,
        idleFps: fast ? 24 : 12,
        frame() {
          if (!pointerLive()) return;
          use(prog("lifePaint", LIFE_PAINT), s.b, scale);
          tex("uState", s.a.tex);
          f1("uRadius", radius(scale) * 0.8);
          run();
          s.swap();
          consumePointer();
        },
        step() {
          let z = 0;
          if (--sprinkle <= 0) {
            randomDrop(w, h, 4 + Math.random() * 4);
            z = drop.z;
            sprinkle = fast ? 20 : 8;
          }
          use(prog("lifeStep", LIFE_STEP), s.b, scale, 0);
          tex("uState", s.a.tex);
          f3("uDrop", drop.x, drop.y, z);
          f1("uFade", fast ? 0.04 : 0.07);
          run();
          s.swap();
        },
        field() {
          use(prog("lifeField", LIFE_FIELD), field);
          tex("uState", s.a.tex);
          f1("uScale", scale);
          run();
        },
      };
    },

    smoke() {
      const vel = pair(size.gw, size.gh);
      const dye = pair(size.gw, size.gh);
      // zero velocity is 0.5 in packed space
      gl.bindFramebuffer(gl.FRAMEBUFFER, vel.a.fbo);
      gl.clearColor(0.5, 0.5, 0.5, 0.5);
      gl.clear(gl.COLOR_BUFFER_BIT);
      gl.clearColor(0, 0, 0, 0);
      const still = opts.preset === "still";
      let puff = 0;
      return {
        hz: 60,
        idleFps: 30,
        warm: still ? 0 : 240,
        step(first) {
          use(prog("smokeVel", SMOKE_VEL), vel.b, 1, first ? 1 : 0);
          tex("uVel", vel.a.tex);
          f1("uRadius", radius() * 1.4);
          run();
          vel.swap();
          let z = 0;
          if (first && mouse.clicked) {
            drop.x = mouse.x;
            drop.y = mouse.y;
            z = 1;
          } else if (--puff <= 0) {
            randomDrop(size.gw, size.gh, still ? 0.8 : 0.5);
            z = drop.z;
            puff = still ? 50 : 140;
          }
          use(prog("smokeDye", SMOKE_DYE), dye.b, 1, first ? 1 : 0);
          tex("uVel", vel.a.tex);
          tex("uDye", dye.a.tex);
          f1("uRadius", radius());
          f1("uFade", still ? 0.994 : 0.996);
          f3("uDrop", drop.x, drop.y, z);
          run();
          dye.swap();
          if (first) consumePointer();
        },
        field() {
          use(prog("smokeField", SMOKE_FIELD), field);
          tex("uDye", dye.a.tex);
          run();
        },
      };
    },
  };

  function consumePointer() {
    mouse.px = mouse.x;
    mouse.py = mouse.y;
  }

  // ----- sizing
  function measure() {
    const W = window.innerWidth;
    const H = window.innerHeight;
    const dpr = Math.min(window.devicePixelRatio || 1, 3);
    let gw, gh, cw, ch, css, cellDev, styleW, styleH;
    if (opts.dither === "ascii") {
      const r = Math.min(dpr, 2);
      const cellCss = [7, 12];
      cellDev = [Math.round(cellCss[0] * r), Math.round(cellCss[1] * r)];
      gw = Math.ceil(W / cellCss[0]);
      gh = Math.ceil(H / cellCss[1]);
      cw = gw * cellDev[0];
      ch = gh * cellDev[1];
      css = cellCss[0];
      styleW = gw * cellCss[0];
      styleH = gh * cellCss[1];
    } else {
      let dev = Math.max(1, Math.round(opts.pixel * dpr));
      do {
        gw = Math.ceil((W * dpr) / dev);
        gh = Math.ceil((H * dpr) / dev);
      } while (gw * gh > MAX_CELLS && ++dev);
      cw = gw;
      ch = gh;
      css = dev / dpr;
      cellDev = [1, 1];
      styleW = gw * css;
      styleH = gh * css;
    }
    return {
      W,
      H,
      gw,
      gh,
      cw,
      ch,
      css,
      cssY: opts.dither === "ascii" ? 12 : css,
      cellDev,
      styleW,
      styleH,
    };
  }

  function glyphAtlas(cellDev) {
    const [w, h] = cellDev;
    const c = document.createElement("canvas");
    c.width = w * GLYPHS.length;
    c.height = h;
    const x = c.getContext("2d");
    x.fillStyle = "#000";
    x.fillRect(0, 0, c.width, c.height);
    x.fillStyle = "#fff";
    x.font = `${Math.round(h * 0.82)}px Menlo, ui-monospace, "DejaVu Sans Mono", monospace`;
    x.textAlign = "center";
    x.textBaseline = "middle";
    for (let i = 0; i < GLYPHS.length; i++)
      x.fillText(GLYPHS[i], i * w + w / 2, h / 2 + 1);
    if (glyphTex) gl.deleteTexture(glyphTex);
    glyphTex = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, glyphTex);
    gl.pixelStorei(gl.UNPACK_ALIGNMENT, 1);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.R8, gl.RED, gl.UNSIGNED_BYTE, c);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
  }

  // (Re)build everything that depends on grid size or effect choice.
  function rebuild(force = false) {
    if (lost) return;
    const m = measure();
    const sameGrid =
      m.gw === size.gw &&
      m.gh === size.gh &&
      m.cw === canvas.width &&
      m.ch === canvas.height;
    // a shrinking viewport height (mobile URL bar) keeps the taller canvas,
    // so the sim isn't reset every time the bar slides in
    const onlyShrank =
      m.gw === size.gw && m.gh <= size.gh && m.css === size.css;
    if ((sameGrid || onlyShrank) && !force && fx) return;
    size.W = m.W;
    size.H = m.H;
    size.gw = m.gw;
    size.gh = m.gh;
    size.css = m.css;
    size.cssY = m.cssY;
    size.cellDev = m.cellDev;
    canvas.width = m.cw;
    canvas.height = m.ch;
    canvas.style.width = m.styleW + "px";
    canvas.style.height = m.styleH + "px";
    canvas.style.imageRendering =
      opts.dither === "ascii" ? "auto" : "pixelated";
    freeTargets();
    field = makeTarget(size.gw, size.gh);
    glyphAtlas(opts.dither === "ascii" ? m.cellDev : [1, 1]);
    const make = makers[opts.effect] || makers.drift;
    fx = make();
    fx.acc = 0;
    // pre-warm so the first still frame already looks developed
    for (let i = 0; i < (fx.warm || 0); i++) fx.step(false);
    needsFrame = true;
  }

  // ----- palette
  const ramp = new Float32Array(24);
  let levels = 2;
  let accent = [0, 0, 0];
  function applyTheme() {
    const r = opts.theme.ramp;
    levels = Math.min(8, r.length);
    for (let i = 0; i < levels; i++) ramp.set(hexToRgb(r[i]), i * 3);
    accent = hexToRgb(opts.theme.accent || r[r.length - 1]);
    needsFrame = true;
  }

  const DITHER_ID = {
    none: 0,
    bayer2: 1,
    bayer4: 2,
    bayer8: 3,
    ign: 4,
    ascii: 5,
  };

  function present() {
    const pr = use(prog("present", PRESENT), null);
    tex("uField", field.tex);
    tex("uGlyphs", glyphTex);
    gl.uniform3fv(pr.loc("uRamp"), ramp);
    gl.uniform1i(pr.loc("uLevels"), levels);
    gl.uniform1i(pr.loc("uDither"), DITHER_ID[opts.dither] ?? 2);
    f3("uAccent", accent[0], accent[1], accent[2]);
    f1("uIntensity", opts.intensity);
    f1("uCalm", opts.calm);
    f1("uGlyphCount", GLYPHS.length);
    f2("uCell", size.cellDev[0], size.cellDev[1]);
    const col = opts.column;
    if (col) {
      const k = 1 / size.css; // CSS px -> grid cells
      gl.uniform4f(pr.loc("uColumn"), col[0] * k, col[1] * k, 48 * k, 1);
    } else gl.uniform4f(pr.loc("uColumn"), 0, 0, 1, 0);
    run();
  }

  // ----- loop
  function animated() {
    if (opts.motion === "off") return false;
    if (opts.motion === "on") return true;
    return !reduceMotion.matches;
  }

  function frame(now) {
    raf = requestAnimationFrame(frame);
    stats.idle =
      opts.idle && now - mouse.last > IDLE_MS && now - changedAt > IDLE_MS;
    const cap = stats.idle
      ? Math.min(opts.fps || 999, fx.idleFps || 30)
      : opts.fps;
    const interval = cap > 0 ? 1000 / cap : 0;
    const since = now - lastFrame;
    if (since < interval - 1.5) return;
    const moving = animated();
    if (!moving && !needsFrame) return;
    const dt = Math.min(since, 100);
    lastFrame = interval ? now - (since % interval) : now;

    const js0 = performance.now();
    if (moving) {
      if (fx.frame) fx.frame();
      const stepMs = 1000 / fx.hz;
      fx.acc += dt * opts.speed;
      let n = Math.floor(fx.acc / stepMs);
      const max = fx.maxSteps || 4;
      if (n > max) {
        n = max;
        fx.acc = 0;
      } else fx.acc -= n * stepMs;
      for (let i = 0; i < n; i++) fx.step(i === 0);
      if (n > 0) mouse.clicked = false;
      stepsAccum += n;
    }
    fx.field();
    present();
    needsFrame = false;
    jsAccum += performance.now() - js0;
    frames++;

    if (now - lastStats > 500) {
      const span = now - lastStats;
      stats.fps = Math.round((frames * 1000) / span);
      stats.js = jsAccum / Math.max(frames, 1);
      stats.steps = Math.round((stepsAccum * 1000) / span);
      governor(now);
      frames = 0;
      jsAccum = 0;
      stepsAccum = 0;
      lastStats = now;
      opts.onStats?.(getState());
    }
  }

  // If we can't hold the frame budget for ~2s, coarsen the pixel grid.
  function governor(now) {
    if (!opts.adaptive || !animated() || !opts.fps || opts.dither === "ascii")
      return (slowSince = 0);
    const target = Math.min(stats.idle ? fx.idleFps || 30 : opts.fps, 60);
    if (stats.fps < target * 0.8) {
      if (!slowSince) slowSince = now;
      else if (now - slowSince > 2000 && opts.pixel < 8) {
        opts.pixel += 1;
        stats.governor = `raised pixel to ${opts.pixel} (was ${stats.fps}fps)`;
        slowSince = 0;
        rebuild(true);
      }
    } else slowSince = 0;
  }

  function start() {
    if (running || lost) return;
    running = true;
    lastFrame = 0;
    lastStats = performance.now();
    raf = requestAnimationFrame(frame);
  }
  function stop() {
    running = false;
    cancelAnimationFrame(raf);
  }

  // ----- events (passive, no allocation in handlers)
  function onMove(e) {
    const x = e.clientX / size.css;
    const y = size.gh - e.clientY / size.cssY;
    if (!pointerLive()) {
      mouse.px = x;
      mouse.py = y;
    }
    mouse.x = x;
    mouse.y = y;
    mouse.last = performance.now();
    if (!animated()) needsFrame = true;
  }
  function onDown(e) {
    onMove(e);
    mouse.down = 1;
    mouse.clicked = true;
  }
  function onUp() {
    mouse.down = 0;
  }
  function onLeave() {
    mouse.last = -1e9;
  }
  let resizeQueued = false;
  function onResize() {
    if (resizeQueued) return;
    resizeQueued = true;
    requestAnimationFrame(() => {
      resizeQueued = false;
      rebuild();
    });
  }
  function onVisibility() {
    if (document.hidden) stop();
    else start();
  }
  function onLost(e) {
    e.preventDefault();
    lost = true;
    stop();
  }
  function onRestored() {
    lost = false;
    progs = {};
    targets = [];
    glyphTex = null;
    fx = null;
    rebuild(true);
    start();
  }

  const passive = { passive: true };
  window.addEventListener("pointermove", onMove, passive);
  window.addEventListener("pointerdown", onDown, passive);
  window.addEventListener("pointerup", onUp, passive);
  window.addEventListener("pointercancel", onUp, passive);
  document.documentElement.addEventListener("pointerleave", onLeave, passive);
  window.addEventListener("resize", onResize, passive);
  document.addEventListener("visibilitychange", onVisibility);
  window.addEventListener("pagehide", stop);
  window.addEventListener("pageshow", onVisibility);
  canvas.addEventListener("webglcontextlost", onLost);
  canvas.addEventListener("webglcontextrestored", onRestored);
  reduceMotion.addEventListener?.("change", () => (needsFrame = true));

  function getState() {
    return {
      ...stats,
      gw: size.gw,
      gh: size.gh,
      cells: size.gw * size.gh,
      canvas: [canvas.width, canvas.height],
      pixel: opts.pixel,
      dpr: window.devicePixelRatio || 1,
      animated: animated(),
      hz: fx ? fx.hz : 0,
    };
  }

  applyTheme();
  rebuild(true);
  if (!document.hidden) start();

  return {
    set(next) {
      const prev = { ...opts };
      Object.assign(opts, next);
      changedAt = performance.now();
      if ("theme" in next) applyTheme();
      const structural =
        opts.effect !== prev.effect ||
        opts.preset !== prev.preset ||
        opts.pixel !== prev.pixel ||
        opts.dither !== prev.dither;
      if (structural) {
        if (opts.pixel !== prev.pixel) stats.governor = "";
        rebuild(true);
      }
      needsFrame = true;
    },
    get: () => ({ ...opts }),
    state: getState,
    destroy() {
      stop();
      window.removeEventListener("pointermove", onMove, passive);
      window.removeEventListener("pointerdown", onDown, passive);
      window.removeEventListener("pointerup", onUp, passive);
      window.removeEventListener("pointercancel", onUp, passive);
      document.documentElement.removeEventListener(
        "pointerleave",
        onLeave,
        passive,
      );
      window.removeEventListener("resize", onResize, passive);
      document.removeEventListener("visibilitychange", onVisibility);
      window.removeEventListener("pagehide", stop);
      window.removeEventListener("pageshow", onVisibility);
      freeTargets();
      gl.getExtension("WEBGL_lose_context")?.loseContext();
    },
  };
}
