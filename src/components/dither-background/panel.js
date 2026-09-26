// Markup for the background toggle and its settings popover. Kept as a
// string so the Astro component and the standalone preview share it.

export const ACCENTS = [
  { id: "green", light: "#66800B", dark: "#879A39" },
  { id: "cyan", light: "#24837B", dark: "#3AA99F" },
  { id: "blue", light: "#205EA6", dark: "#4385BE" },
  { id: "purple", light: "#5E409D", dark: "#8B7EC8" },
  { id: "magenta", light: "#A02F6F", dark: "#CE5D97" },
  { id: "red", light: "#AF3029", dark: "#D14D41" },
  { id: "orange", light: "#BC5215", dark: "#DA702C" },
  { id: "yellow", light: "#AD8301", dark: "#D0A215" },
];

const radios = (name, items) =>
  items
    .map(
      ([value, label]) =>
        `<label><input type="radio" name="${name}" value="${value}"><span>${label}</span></label>`,
    )
    .join("");

export const PANEL_HTML = `
<button type="button" class="bg-toggle" id="bg-toggle" popovertarget="bg-panel" aria-label="Background settings" title="background">
  <svg viewBox="0 0 3 3" width="15" height="15" aria-hidden="true" shape-rendering="crispEdges">
    <rect x="1" y="0" width="1" height="1"/><rect x="2" y="1" width="1" height="1"/>
    <rect x="0" y="2" width="1" height="1"/><rect x="1" y="2" width="1" height="1"/><rect x="2" y="2" width="1" height="1"/>
  </svg>
</button>
<form class="bg-panel" id="bg-panel" popover aria-label="Background settings">
  <p class="bg-panel-title">background <span>conway's game of life</span></p>
  <div class="bg-row bg-swatches" role="radiogroup" aria-label="colour">
    <span class="bg-label">colour</span>
    ${ACCENTS.map(
      (a) =>
        `<label title="${a.id}"><input type="radio" name="bg-accent" value="${a.id}" aria-label="${a.id}"><span style="--sw-light:${a.light};--sw-dark:${a.dark}"></span></label>`,
    ).join("")}
  </div>
  <div class="bg-row" role="radiogroup" aria-label="theme"><span class="bg-label">theme</span>${radios(
    "bg-theme",
    [
      ["system", "system"],
      ["light", "light"],
      ["dark", "dark"],
    ],
  )}</div>
  <div class="bg-row" role="radiogroup" aria-label="pixels"><span class="bg-label">pixels</span>${radios(
    "bg-pixel",
    [
      ["3", "fine"],
      ["4", "medium"],
      ["6", "coarse"],
    ],
  )}</div>
  <div class="bg-row" role="radiogroup" aria-label="dither"><span class="bg-label">dither</span>${radios(
    "bg-dither",
    [
      ["bayer4", "4×4"],
      ["bayer8", "8×8"],
      ["none", "none"],
    ],
  )}</div>
  <div class="bg-row" role="radiogroup" aria-label="motion"><span class="bg-label">motion</span>${radios(
    "bg-motion",
    [
      ["on", "on"],
      ["off", "paused"],
    ],
  )}</div>
  <p class="bg-panel-foot"><button type="button" id="bg-reseed">reseed</button><span>drag or tap the page to add cells</span></p>
</form>`;
