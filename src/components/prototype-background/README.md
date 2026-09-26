# PROTOTYPE: dithered background

> Five background variants on the existing homepage (and every other page),
> switchable via `?variant=a..e` and a floating bottom bar. Throwaway: this
> lives on `claude/website-background-animations-1gz7xg`, never on `main`.

**The question:** what animated, mouse-reactive, pixel-dithered background fits
the retro monospace site without costing readability or battery?

## Run it

```sh
npm run prototype        # astro dev, opens /?variant=a
```

Only mounted when `import.meta.env.DEV` or `VERCEL_ENV === "preview"`, so a
Vercel preview of this branch shows it and production never does.

Standalone single file (same code plus a static copy of the homepage):

```sh
node src/components/prototype-background/build-standalone.mjs dither-lab.html
```

## Variants

| key | name   | what it is                                     | interaction                  | cost                    |
| --- | ------ | ---------------------------------------------- | ---------------------------- | ----------------------- |
| a   | Drift  | domain-warped fBm (clouds / contour / marble)  | cursor leaves a warping wake | 1 pass + trail          |
| b   | Ripple | height-field water over a 1ch × 1.5em dot grid | drag = wake, click = drop    | 1 sim + 1 pass          |
| c   | Coral  | Gray-Scott reaction-diffusion                  | drag / click seeds growth    | 6 sims/frame (heaviest) |
| d   | Life   | Conway's Life with fading trails, half-res     | drag spawns cells in accent  | 10 Hz sim               |
| e   | Smoke  | dye advected by curl noise + your velocity     | drag stirs, click puffs      | 2 sims + 1 pass         |

`←` / `→` cycle variants. **tweaks** covers theme (7 Flexoki-derived palettes
plus auto), dither (posterize, Bayer 2/4/8, IGN noise, ASCII), preset, pixel
size, strength, how quiet the text column is, speed, fps cap and motion. Every
tweak is in the URL (`?variant=b&theme=ink&dither=bayer8&px=4`). The readout at
the bottom left shows grid size, sim rate, fps and JS cost per frame.

## Why it should be fast (the earlier attempt's problem)

- Everything renders at a low **grid** resolution: one cell = `px` CSS px,
  snapped to whole device pixels, then CSS-upscaled with
  `image-rendering: pixelated`. At px 3 a 1440×900 window is ~144k cells, not
  1.3M+ device pixels. Hard cap of 300k cells.
- One WebGL2 context, buffer-less fullscreen triangle, no per-frame
  allocations, uniform locations cached, no `readPixels`/`getError`.
- Sim state is packed as two 16-bit fixed-point values per RGBA8 texel, so it
  needs no float render targets and works on every WebGL2 device.
- `alpha: false`, `antialias: false`, `powerPreference: "low-power"`, and
  `failIfMajorPerformanceCaveat` (no software GL; the flat Flexoki bg stays).
- Fixed canvas with `pointer-events: none` and `contain: strict`; passive
  listeners on `window`; no layout reads in handlers. Scrolling never repaints it.
- Fixed-step sims decoupled from the fps cap; idle throttle to 12–30 fps after
  8s without input; stops on hidden tab / `pagehide`; a still frame under
  `prefers-reduced-motion`; context-loss recovery.
- Governor: if fps stays under 80% of target for 2s, it coarsens the pixel
  size and says so in the readout.
- Boots in `requestIdleCallback`, so it never competes with first paint.

## Open questions to settle by playing with it

1. Which variant (or mix: "B's water with D's accent colour")?
2. Quiet (paper / ink, 5 tones) or loud (1-bit, phosphor, ember)?
3. Is the text column calm enough at 35%, or should content sit on a solid panel?
4. Keep the accent colour on cursor interaction, or monochrome only?
5. Is it everywhere, or only on the homepage / 404?

## When a winner is picked

Rewrite the winning variant as a real component (one effect, no switcher,
tweaks or readout), bring back `flexoki.css` tokens in `globals.css`, and keep
this branch as the primary source for the rest.
