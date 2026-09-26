// PROTOTYPE: bundles the background variants plus a static copy of the
// homepage into one self-contained HTML file you can open or share.
//
//   node src/components/prototype-background/build-standalone.mjs out.html
//   node src/components/prototype-background/build-standalone.mjs out.html --final
//
// --final builds the chosen design (components/dither-background) instead.

import { readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { PANEL_HTML } from "../dither-background/panel.js";

const here = dirname(fileURLToPath(import.meta.url));
const root = join(here, "../../..");
const out = process.argv[2];
if (!out) {
  console.error("usage: node build-standalone.mjs <out.html>");
  process.exit(1);
}

const read = (p) => readFileSync(join(here, p), "utf8");
const strip = (src) =>
  src
    .replace(/^import .*?;\s*$/gm, "")
    .replace(/^export (const|function) /gm, "$1 ");

const final = process.argv.includes("--final");
const js = (
  final
    ? [
        "../dither-background/panel.js",
        "../dither-background/life.js",
        "../dither-background/controls.js",
      ]
    : ["engine.js", "themes.js", "ui.js"]
)
  .map((f) => `// ---- ${f}\n${strip(read(f))}`)
  .join("\n");
const font = readFileSync(
  join(root, "public/fonts/AppleGaramond.ttf"),
).toString("base64");

const posts = [
  [
    "2026-03-02",
    "slop-definitions-were-my-final-straw-with-google-search",
    "Slop Definitions Were My Final Straw with Google Search",
    "I’m no stranger to trying out different search engines, and I’m quite fond of switching out the technology I use for new ones to see what sticks. In the past, every time I’ve tried switching to DuckDuckGo, the inevitable would happen. One too many times, I wouldn’t be able to find what I was really",
  ],
  [
    "2025-03-12",
    "designing-products-without-databases",
    "Designing Products without Databases",
    "Most major software projects require some sort of database to persist data for users to access. At least that’s how we usually think. The problem is that databases introduce a lot of complexity to our software and infrastructure which is often unnecessary. Put in other terms, they also just cost a lot of money to",
  ],
  [
    "2024-01-14",
    "private-cloud-gaming",
    "Private Cloud Gaming with Wake on LAN and Parsec",
    "When Cities: Skylines II was released last October, I was thrilled to be able to play the successor to one of my favorite games of all time. But looking at the platforms that this sequel was available on, I was less thrilled to find that I could only play it on Windows. As I've talked",
  ],
  [
    "2023-09-27",
    "the-tiny-internet",
    "Why I Love the Tiny Internet",
    'After recently recreating my personal website from the ground up, I\'ve been reflecting a bit more on blogs and the internet more broadly. As someone born after 2000, I never really got to experience the internet in the same way that many talk about what "used to be". I never experienced AOL chat rooms, IRC',
  ],
  [
    "2023-03-06",
    "spotlight-search-got-better",
    "I Didn’t Think Spotlight Search Could Get Any Better",
    "I have been using Windows as my main operating system for just about my entire life. From a laptop running Windows 7 to a Surface Tablet running Windows 8 (gross, I know) to a few other devices running Windows 10, I’ve been through all of the recent iterations of Microsoft’s core product. After recently buying",
  ],
  [
    "2022-08-15",
    "improve-your-online-security",
    "Simple Steps to Improve Your Online Security",
    "As more of our lives move into the digital world, we must keep our online accounts secure. Weak security will inevitably lead to real-world consequences. Almost all banks have some form of online banking, and an insecure password could allow thousands of your dollars to be in a hacker’s hands. Even impersonation could be a",
  ],
];
const projects = [
  [
    "2024-10-25",
    true,
    "https://hareware.zsrobinson.com",
    "HareWare",
    "A collection of various software tools for use by the satire publication The Hare, including an article post creator for Instagram and an article exporter for Adobe InDesign. Continually updated and maintained since its release in late 2024.",
  ],
  [
    "2025-04-14",
    false,
    "https://hareware.zsrobinson.com",
    "Terpsicle",
    "A smart 4-year planner and schedule builder for computer science students at UMD, completed at the 2025 Bitcamp hackathon. Personally worked on the schedule builder page, and greatly enhanced the page following the hackathon.",
  ],
  [
    "2023-06-25",
    false,
    "https://github.com/zsrobinson/curvature",
    "MuseScore PDF Generator",
    "A tool that allows you to convert any public MuseScore link into a printable PDF document. Uses a web scraper to load the page and collect the score’s images into the document, and requires the user to run the tool themselves.",
  ],
  [
    "2023-05-12",
    false,
    "https://curvature.zsrobinson.com",
    "Concepts in Curvature",
    "An interactive tutorial of how to calculate the curvature of parametric equations. Originally created as the final project for my high school calculus class.",
  ],
];
const esc = (s) =>
  s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/"/g, "&quot;");

const labTokens = `:root {
  --bg: #FFFCF0; --tx: #100F0F; --tx-2: #6F6E69; --tx-3: #B7B5AC; --ui: #E6E4D9;
  --link: #205EA6; --link-visited: #5E409D; --proto-accent: #87D3C3;
  --font-mono: Menlo, ui-monospace, "SF Mono", "DejaVu Sans Mono", monospace;
  --font-display: "Apple Garamond", "Times New Roman", serif;
}
@media (prefers-color-scheme: dark) {
  :root:not([data-theme="light"]) { --bg: #100F0F; --tx: #CECDC3; --tx-2: #878580; --tx-3: #575653; --ui: #282726; --link: #4385BE; --link-visited: #8B7EC8; color-scheme: dark; }
}
:root[data-theme="dark"] { --bg: #100F0F; --tx: #CECDC3; --tx-2: #878580; --tx-3: #575653; --ui: #282726; --link: #4385BE; --link-visited: #8B7EC8; color-scheme: dark; }
a { color: var(--link); } a:visited { color: var(--link-visited); }`;

const html = `<title>${final ? "Life Background" : "Dither Lab"}</title>
<meta name="description" content="${final ? "Preview of the Game of Life background for zsrobinson.com." : "Prototype: five animated, mouse-reactive dithered backgrounds for zsrobinson.com."}">
${final ? `<script>(() => { let t = null; try { t = localStorage.getItem("theme"); } catch {} const f = document.documentElement.dataset.theme; if (t === "dark" || (!t && (f ? f === "dark" : matchMedia("(prefers-color-scheme: dark)").matches))) document.documentElement.classList.add("dark"); })();</script>` : ""}
<style>
@font-face { font-family: "Apple Garamond"; src: url(data:font/ttf;base64,${font}) format("truetype"); font-display: swap; }
:root { --font-mono: Menlo, ui-monospace, "SF Mono", "DejaVu Sans Mono", monospace; --font-display: "Apple Garamond", "Times New Roman", serif; }
${final ? "" : labTokens}
html { background: var(--bg); color: var(--tx); font-family: var(--font-mono); font-size: 16px; line-height: 1.5; }
body { background: transparent; font: inherit; padding: 1rem 4ch; margin: 0 auto; max-width: 76ch; }
h2 { font-family: var(--font-display); font-weight: normal; font-size: 1.875rem; margin: 32px 1rem 0 0; line-height: 1; text-wrap: balance; }
p { margin: 1rem 0; }
blockquote { padding-left: 4ch; margin: 1rem 0; color: var(--tx-2); position: relative; }
blockquote::before { content: ">"; position: absolute; top: 0; left: 2ch; }
header { line-height: 1; display: flex; justify-content: space-between; align-items: end; }
header pre { margin: 0; font: inherit; }
header a:has(pre) { text-decoration: none; color: inherit; }
nav.site > * { display: block; margin-right: 1ch; text-align: right; }
.hr { height: 1rem; overflow: hidden; width: 100%; margin: 1rem 0; color: var(--tx-3); }
header + .hr { margin-bottom: 2rem; }
footer > .hr { margin-top: 2rem; }
ul.list { list-style: none; padding: 0; }
ul.list li > :not(blockquote) { font-weight: bold; }
ul.posts blockquote { overflow: hidden; display: -webkit-box; -webkit-box-orient: vertical; -webkit-line-clamp: 3; }
.proto-note { font-size: 12px; color: var(--tx-2); margin: 0 0 1.5rem; }
.proto-note kbd { font: inherit; border: 1px solid var(--tx-3); padding: 0 4px; }
@media (max-width: 550px) { body { padding: 1rem 2ch; } header pre { font-size: min(16px, 2.8vw); } }
${final ? read("../dither-background/background.css") : read("prototype.css")}
</style>

${
  final
    ? `<canvas id="bg-canvas" aria-hidden="true"></canvas>
<p class="proto-note" data-bg-mask>// preview: game of life background for zsrobinson.com. drag or tap anywhere to add cells (they carry the accent colour). the glider button, bottom right, opens the settings.</p>`
    : `<p class="proto-note">// prototype: 5 background variants for zsrobinson.com. <kbd>&larr;</kbd> <kbd>&rarr;</kbd> switch variant, move / drag / click anywhere to interact, <b>tweaks</b> for theme, dither, pixel size and fps. the readout bottom-left shows live cost.</p>`
}

<header>
  <a href="https://zsrobinson.com" target="_blank"><pre>                _    _
  _______ _ ___| |__(_)_ _  ___ ___ _ _
 |_ (_-&lt; \`_/ _ \\  _ \\ | \` \\(_-&lt;/ _ \\ \` \\
 /__/__/_| \\___/_,__/_|_||_/__/\\___/_||_|</pre></a>
  <nav class="site">
    <a href="https://zsrobinson.com/posts" target="_blank">posts</a>
    <a href="https://zsrobinson.com/index.xml" target="_blank">rss</a>
    <a href="https://zsrobinson.com/search" target="_blank">search</a>
  </nav>
</header>
<p aria-hidden="true" class="hr">${"-".repeat(80)}</p>

<main>
  <p>Hey there, my name’s Zach!</p>
  <p>I’m currently studying Computer Science and Sociology at the <a href="https://umd.edu" target="_blank">University of Maryland</a>, and serve as the Editor-in-Chief of the satire magazine <a href="https://theumdhare.com" target="_blank"><em>The Hare</em></a>. I occasionally write about my experiences and projects here on this site.</p>
  <p>My personal projects are hosted on <a href="https://github.com/zsrobinson" target="_blank">GitHub</a>, and my work experience is listed on <a href="https://www.linkedin.com/in/zsrobinson05" target="_blank">LinkedIn</a>. I’m also able to be reached via <a href="https://zsrobinson.com" target="_blank">email</a>.</p>

  <h2>Latest Posts</h2>
  <ul class="list posts">
${posts.map(([d, slug, t, desc]) => `    <li><time datetime="${d}">${d}</time> <span>|</span> <a href="https://zsrobinson.com/posts/${slug}" target="_blank">${esc(t)}</a><blockquote>${esc(desc)}</blockquote></li>`).join("\n")}
  </ul>
  <p>View all posts <a href="https://zsrobinson.com/posts" target="_blank">here</a>.</p>

  <h2>Featured Projects</h2>
  <ul class="list">
${projects.map(([d, ongoing, url, t, desc]) => `    <li><time datetime="${d}">${d}</time>${ongoing ? " <span>(ongoing)</span>" : ""} <span>|</span> <a href="${url}" target="_blank">${esc(t)}</a><blockquote>${esc(desc)}</blockquote></li>`).join("\n")}
  </ul>
  <p>View all projects <a href="https://github.com/zsrobinson" target="_blank">here</a>.</p>
</main>

<footer>
  <p aria-hidden="true" class="hr">${"-".repeat(80)}</p>
  <p>(c) 2026 Zachary Robinson. Made with &lt;3 using <a href="https://astro.build" target="_blank">Astro</a>.</p>
</footer>
${final ? PANEL_HTML : ""}
<script>
(() => {
${js}
${final ? "mountBackground" : "mountPrototype"}({ ${final ? "" : "persist: hashPersist(), "}allowSoftware: !!window.__PROTO_ALLOW_SOFTWARE });
})();
</script>
`;

writeFileSync(out, html);
console.log(`wrote ${out} (${(html.length / 1024).toFixed(0)} KB)`);
