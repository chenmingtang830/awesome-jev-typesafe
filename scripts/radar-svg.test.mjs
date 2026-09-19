import test from "node:test";
import assert from "node:assert/strict";
import { radarSvg } from "./radar-svg.mjs";

const sectors = ["Coding agents", "Routers", "A very long category name that runs past the gutter"];
const dots = [
  { id: "eve", name: "Eve", sector: "Coding agents", stars: 5265 },
  { id: "winnow", name: "Winnow", sector: "Routers", stars: 19, accent: "amber" },
  { id: "kev", name: "Kev & co <script>", sector: "Routers", stars: 0, accent: "muted" },
  { id: "semif", name: "Semif", sector: "A very long category name that runs past the gutter", stars: 140 },
];

test("same input renders the same string", () => {
  assert.equal(radarSvg({ dots, sectors }), radarSvg({ dots, sectors }));
});

test("one dot per entry", () => {
  const svg = radarSvg({ dots, sectors });
  assert.equal(svg.split('<circle class="dot"').length - 1, dots.length);
});

test("every dot lands inside the viewBox", () => {
  for (const size of [260, 800, 900]) {
    const svg = radarSvg({ dots, sectors, size });
    const found = [...svg.matchAll(/<circle class="dot" cx="([\d.]+)" cy="([\d.]+)"/g)];
    assert.equal(found.length, dots.length);
    for (const [, cx, cy] of found) {
      for (const v of [Number(cx), Number(cy)]) {
        assert.ok(v >= 0 && v <= size, `${v} outside 0..${size}`);
      }
    }
  }
});

test("sector labels show when asked, truncated to 22 characters", () => {
  const svg = radarSvg({ dots, sectors, labels: true });
  assert.ok(svg.includes("Coding agents"));
  assert.ok(svg.includes("A very long category …"));
  assert.ok(!radarSvg({ dots, sectors, labels: false }).includes("Coding agents"));
});

test("no animation when the sweep is off", () => {
  assert.ok(radarSvg({ dots, sectors, sweep: true }).includes("<animateTransform"));
  assert.ok(!radarSvg({ dots, sectors, sweep: false }).includes("<animateTransform"));
});

test("href wraps the dot and markup in names is escaped", () => {
  const svg = radarSvg({ dots, sectors, href: (d) => `/p/${d.id}/` });
  assert.ok(svg.includes('<a href="/p/eve/">'));
  assert.ok(svg.includes("&lt;script&gt;"));
});
