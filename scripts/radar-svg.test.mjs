import test from "node:test";
import assert from "node:assert/strict";
import { radarSvg } from "./radar-svg.mjs";

const sectors = ["Coding agents", "Routers", "A very long category name that runs past the gutter"];
const dots = [
  { id: "eve", name: "Eve", sector: "Coding agents", stars: 5265 },
  { id: "winnow", name: "Winnow", sector: "Routers", stars: 19, accent: "rising" },
  { id: "kev", name: "Kev & co <script>", sector: "Routers", stars: 0, accent: "archived" },
  { id: "semif", name: "Semif", sector: "A very long category name that runs past the gutter", stars: 140 },
];

/** cx, cy and the ping delay of every dot, in document order. */
const readDots = (svg) =>
  [...svg.matchAll(/<circle class="dot" cx="([\d.]+)" cy="([\d.]+)" r="[\d.]+"[^>]*style="--d:([\d.]+)s"/g)].map(
    ([, cx, cy, d]) => ({ cx: Number(cx), cy: Number(cy), delay: Number(d) }),
  );

test("same input renders the same string", () => {
  assert.equal(radarSvg({ dots, sectors }), radarSvg({ dots, sectors }));
});

test("one dot per entry", () => {
  const svg = radarSvg({ dots, sectors });
  assert.equal(svg.split('<circle class="dot"').length - 1, dots.length);
});

test("every dot lands inside the viewBox", () => {
  for (const size of [260, 800, 900]) {
    const found = readDots(radarSvg({ dots, sectors, size }));
    assert.equal(found.length, dots.length);
    for (const { cx, cy } of found) {
      for (const v of [cx, cy]) assert.ok(v >= 0 && v <= size, `${v} outside 0..${size}`);
    }
  }
});

test("every dot carries a ping delay inside one sweep period", () => {
  for (const { delay } of readDots(radarSvg({ dots, sectors }))) {
    assert.ok(delay >= 0 && delay <= 8, `${delay}s outside 0..8`);
  }
});

test("delays rise with the angle, so a sector pings in order", () => {
  // Twelve of them in one wedge: the ids scatter around the sector, the delays must not.
  const many = Array.from({ length: 12 }, (_, i) => ({
    id: `r${i}`,
    name: `Repo ${i}`,
    sector: "Routers",
    stars: 40,
  }));
  const found = readDots(radarSvg({ dots: many, sectors }));
  const c = 400;
  // Same clockwise-from-twelve angle the generator uses to pick the delay.
  const angle = (d) => ((Math.atan2(d.cy - c, d.cx - c) * 180) / Math.PI + 450) % 360;
  const byAngle = found.slice().sort((a, b) => angle(a) - angle(b));
  const delays = byAngle.map((d) => d.delay);
  assert.deepEqual(delays, delays.slice().sort((a, b) => a - b));
});

test("dot labels only name the dots over the threshold", () => {
  const svg = radarSvg({ dots, sectors, dotLabels: 100 });
  const found = [...svg.matchAll(/<text class="dot-label"[^>]*>([^<]*)<\/text>/g)].map((m) => m[1]);
  assert.deepEqual(found, ["Eve", "Semif"]);
  assert.equal(radarSvg({ dots, sectors }).includes('<text class="dot-label"'), false);
});

test("a long name is cut to eighteen characters", () => {
  const long = [{ id: "l", name: "Absolutely enormous project name", sector: "Routers", stars: 900 }];
  const svg = radarSvg({ dots: long, sectors, dotLabels: 100 });
  const text = svg.match(/<text class="dot-label"[^>]*>([^<]*)<\/text>/)[1];
  assert.equal(text, "Absolutely enormo…");
  assert.equal(text.length, 18);
  // The tooltip keeps the whole name; only the drawn label is cut.
  assert.ok(svg.includes("<title>Absolutely enormous project name"));
});

test("sector labels show when asked, truncated to 22 characters", () => {
  const svg = radarSvg({ dots, sectors, labels: true });
  assert.ok(svg.includes("Coding agents"));
  assert.ok(svg.includes("A very long category …"));
  assert.ok(!radarSvg({ dots, sectors, labels: false }).includes("Coding agents"));
});

test("no sweep means no rotation and no pulse rings", () => {
  const on = radarSvg({ dots, sectors, sweep: true });
  assert.ok(on.includes("<animateTransform"));
  assert.ok(on.includes("data-pulse"));
  const off = radarSvg({ dots, sectors, sweep: false });
  assert.ok(!off.includes("<animateTransform"));
  assert.ok(!off.includes("data-pulse"));
});

test("tones map to the four data-tone values", () => {
  const svg = radarSvg({ dots: [...dots, { id: "q", name: "Q", sector: "Routers", stars: 3, accent: "quiet" }], sectors });
  for (const tone of ["active", "rising", "quiet", "archived"]) {
    assert.ok(svg.includes(`data-tone="${tone}"`), `missing ${tone}`);
  }
});

test("href wraps the dot and markup in names is escaped", () => {
  const svg = radarSvg({ dots, sectors, href: (d) => `/p/${d.id}/` });
  assert.ok(svg.includes('<a href="/p/eve/">'));
  assert.ok(svg.includes("&lt;script&gt;"));
});
