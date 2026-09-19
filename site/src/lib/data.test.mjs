import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const projects = JSON.parse(readFileSync(new URL("../../../data/projects.json", import.meta.url)));

test("data has sections and entries", () => {
  assert.ok(projects.entries.length > 300);
  assert.ok(projects.sections.some((s) => s.name === "Coding agents"));
});

test("every gallery tile matches an entry url", () => {
  const urls = new Set(projects.entries.map((e) => e.url));
  for (const g of projects.gallery) assert.ok(urls.has(g.url), g.url);
});

test("entry ids are unique", () => {
  const ids = projects.entries.map((e) => e.id);
  assert.equal(new Set(ids).size, ids.length);
});
