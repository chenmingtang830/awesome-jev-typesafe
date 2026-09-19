import { test } from "node:test";
import assert from "node:assert/strict";
import { toMeta, batches } from "./enrich-github.mjs";

test("maps a GraphQL repository node", () => {
  const m = toMeta({
    stargazerCount: 5,
    forkCount: 1,
    pushedAt: "2026-09-01T00:00:00Z",
    createdAt: "2026-08-01T00:00:00Z",
    primaryLanguage: { name: "Rust" },
    licenseInfo: { spdxId: "MIT" },
    isArchived: false,
    openGraphImageUrl: "https://x/og.png",
    repositoryTopics: { nodes: [{ topic: { name: "jev" } }] },
    description: "d",
    homepageUrl: "",
  });
  assert.equal(m.language, "Rust");
  assert.equal(m.license, "MIT");
  assert.deepEqual(m.topics, ["jev"]);
  assert.equal(m.homepage, null);
});

test("maps a node with every optional field missing", () => {
  const m = toMeta({ stargazerCount: 0, forkCount: 0, pushedAt: null, createdAt: null, isArchived: true });
  assert.equal(m.language, null);
  assert.equal(m.license, null);
  assert.equal(m.ogImage, null);
  assert.deepEqual(m.topics, []);
  assert.equal(m.description, null);
  assert.equal(m.archived, true);
});

test("batches of 50", () => {
  assert.equal(batches(Array.from({ length: 120 }), 50).length, 3);
  assert.equal(batches([], 50).length, 0);
});
