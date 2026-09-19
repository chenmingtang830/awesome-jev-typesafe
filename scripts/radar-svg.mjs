/**
 * The ecosystem radar, as a self-contained SVG string.
 *
 * Pure string building with no dependencies, so the same function draws the README
 * banner in Node and the /radar/ page at build time. Everything is deterministic:
 * a repo id always lands on the same spot, which keeps git diffs on the banner small.
 * Rings are star buckets, inner is the brightest: 1k+, 100 to 1k, 10 to 100, under 10.
 */

const THEMES = {
  dark: { ring: "#222A33", spoke: "#1A222A", dot: "#4CC9F0", amber: "#FFB454", grey: "#3A434D", label: "#7C8791", canvas: "#0B0E11" },
  light: { ring: "#D9DEE3", spoke: "#E4E9ED", dot: "#0E8FB5", amber: "#B8690A", grey: "#98A1AA", label: "#5B6670", canvas: "#F4F6F8" },
};
const RINGS = [0.22, 0.42, 0.62, 0.82];
const SWEEP_DEG = 40;

const esc = (s) =>
  String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

/** FNV-1a over the id. Two repos only collide if they share an id, which the parser forbids. */
const hash = (s) => {
  let h = 0x811c9dc5;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 0x01000193) >>> 0;
  }
  return h >>> 0;
};
const frac = (s) => (hash(s) % 10000) / 10000;
const ringOf = (stars) => (stars >= 1000 ? 0 : stars >= 100 ? 1 : stars >= 10 ? 2 : 3);
const clip = (s, n) => (s.length > n ? s.slice(0, n - 1) + "…" : s);

export function radarSvg({
  dots = [],
  sectors = [],
  size = 800,
  sweep = true,
  labels = true,
  theme = "dark",
  href = () => null,
  labelHref = () => null,
} = {}) {
  const th = THEMES[theme] ?? THEMES.dark;
  const c = size / 2;
  // Labels sit outside the last ring, so the rings give up room for the gutter when they show.
  const R = c * (labels ? 0.68 : 0.95);
  // Strokes, dots and type scale with the canvas: the 260px banner radar reads like the 900px one.
  const k = size / 800;
  const n = Math.max(1, sectors.length);
  const span = (Math.PI * 2) / n;
  const startOf = (i) => -Math.PI / 2 + i * span;
  const f = (x) => x.toFixed(1);
  const at = (a, r) => [c + Math.cos(a) * r, c + Math.sin(a) * r];
  const uid = `jr-${theme}-${size}`;

  const rings = RINGS.map(
    (t) => `<circle class="ring" cx="${c}" cy="${c}" r="${f(R * t)}" fill="none" stroke="${th.ring}" stroke-width="${f(Math.max(0.5, k))}"/>`,
  ).join("");

  const spokes = sectors
    .map((_, i) => {
      const [x, y] = at(startOf(i), R * 0.92);
      return `<line class="spoke" x1="${c}" y1="${c}" x2="${f(x)}" y2="${f(y)}" stroke="${th.spoke}" stroke-width="${f(Math.max(0.5, k))}"/>`;
    })
    .join("");

  const sectorLabels = labels
    ? sectors
        .map((name, i) => {
          const a = startOf(i) + span / 2;
          const [x0, y] = at(a, R + 18 * k);
          const cos = Math.cos(a);
          const anchor = cos > 0.08 ? "start" : cos < -0.08 ? "end" : "middle";
          const text = clip(name, 22);
          // Mono at 11px runs about 0.62em per column, so the run can be kept off the edge.
          const w = text.length * 6.9 * k;
          const pad = 10 * k;
          const x =
            anchor === "start" ? Math.min(x0, size - pad - w) : anchor === "end" ? Math.max(x0, pad + w) : x0;
          const el = `<text class="slabel" x="${f(x)}" y="${f(y)}" fill="${th.label}" text-anchor="${anchor}" dominant-baseline="middle" font-family="ui-monospace, SFMono-Regular, Menlo, monospace" font-size="${f(11 * k)}">${esc(text)}</text>`;
          const url = labelHref(name);
          return url ? `<a href="${esc(url)}" class="sector">${el}</a>` : el;
        })
        .join("")
    : "";

  const marks = dots
    .map((d) => {
      const stars = Number(d.stars) || 0;
      const i = Math.max(0, sectors.indexOf(d.sector));
      const a = startOf(i) + (0.1 + 0.8 * frac(d.id)) * span;
      const jitter = (frac(d.id + "|j") - 0.5) * 0.12 * R;
      const [x, y] = at(a, RINGS[ringOf(stars)] * R + jitter);
      const r = (2.5 + 2.5 * Math.log10(stars + 1)) * k;
      const tone = d.accent === "amber" ? "amber" : d.accent === "muted" ? "grey" : "cyan";
      const fill = tone === "amber" ? th.amber : tone === "grey" ? th.grey : th.dot;
      // A canvas-colored hairline keeps overlapping dots readable where a category is crowded.
      // The colours are inline for the standalone banner; data-tone lets the site retheme them.
      const dot = `<circle class="dot" cx="${f(x)}" cy="${f(y)}" r="${f(r)}" fill="${fill}" stroke="${th.canvas}" stroke-width="${f(k)}" data-tone="${tone}" filter="url(#${uid})"><title>${esc(d.name)} · ${stars}★</title></circle>`;
      const url = href(d);
      return url ? `<a href="${esc(url)}">${dot}</a>` : dot;
    })
    .join("");

  const [sx, sy] = at(-Math.PI / 2, R);
  const [ex, ey] = at(-Math.PI / 2 + (SWEEP_DEG * Math.PI) / 180, R);
  const beam = sweep
    ? `<g data-sweep="1"><path d="M${c},${c} L${f(sx)},${f(sy)} A${f(R)},${f(R)} 0 0 1 ${f(ex)},${f(ey)} Z" fill="url(#${uid}-s)"/>` +
      `<animateTransform attributeName="transform" type="rotate" from="0 ${c} ${c}" to="360 ${c} ${c}" dur="8s" repeatCount="indefinite"/></g>`
    : "";

  return (
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${size} ${size}" width="${size}" height="${size}" role="img" aria-label="Radar of ${dots.length} repos across ${n} categories, rings are star counts">` +
    `<defs>` +
    `<filter id="${uid}" x="-60%" y="-60%" width="220%" height="220%"><feGaussianBlur stdDeviation="${f(2 * k)}" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge></filter>` +
    `<linearGradient id="${uid}-s" x1="0" y1="1" x2="1" y2="0"><stop offset="0" stop-color="${th.dot}" stop-opacity="0"/><stop offset="1" stop-color="${th.dot}" stop-opacity="0.35"/></linearGradient>` +
    `</defs>${rings}${spokes}${beam}${sectorLabels}${marks}</svg>`
  );
}
