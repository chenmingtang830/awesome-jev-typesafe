import { test } from "node:test";
import assert from "node:assert/strict";
import { buildIndex, applyFacets, expandQuery, matchIntent, sortDocs } from "./search-core.mjs";

const docs = [
  { id: "a", name: "fast-jev-compaction", description: "Replaces the compaction summary with Jev decisions.", section: "Coding agents", host: "Claude Code", language: "TypeScript", license: "MIT", stars: 50, starsBucket: "10-100", hasMedia: false, maintainer: false, intents: { "compact context": 0.9 } },
  { id: "b", name: "jev-router", description: "Routes each task to the cheapest model.", section: "Coding agents", host: "Claude Code", language: "Python", license: "MIT", stars: 5, starsBucket: "0-10", hasMedia: true, maintainer: true, intents: { "route between models": 0.95 } },
];

test("text search finds compaction first", () => {
  const idx = buildIndex(docs);
  assert.equal(idx.search("compaction")[0].id, "a");
});

test("facets AND together", () => {
  assert.deepEqual(applyFacets(docs, { language: ["Python"], maintainer: ["yes"] }).map((d) => d.id), ["b"]);
});

test("an empty facet list does not filter", () => {
  assert.equal(applyFacets(docs, { language: [] }).length, 2);
});

test("intent match ranks by precomputed probability", () => {
  const hit = matchIntent("how do I route between models", ["compact context", "route between models"]);
  assert.equal(hit, "route between models");
});

test("no intent matches an unrelated query", () => {
  assert.equal(matchIntent("robot arm simulator", ["compact context", "route between models"]), null);
});

test("sort by stars puts the bigger repo first", () => {
  assert.deepEqual(sortDocs(docs, "stars").map((d) => d.id), ["a", "b"]);
});

test("a synonym word expands to an OR subquery", () => {
  assert.deepEqual(expandQuery("router"), { queries: ["router", "routing", "route"], combineWith: "OR" });
});

test("two words AND together, synonyms expanded in place", () => {
  assert.deepEqual(expandQuery("stop hook"), {
    combineWith: "AND",
    queries: ["stop", { queries: ["hook", "hooks"], combineWith: "OR" }],
  });
});

test("a plain word stays a plain query", () => {
  assert.equal(expandQuery("drone"), "drone");
});

test("compaction also finds the repo that says pruning", () => {
  const idx = buildIndex([
    { id: "a", name: "fast-jev-compaction", description: "Rewrites the compaction summary.", section: "Coding agents" },
    { id: "b", name: "jev-prune", description: "Context pruning driven by Jev.", section: "Coding agents" },
  ]);
  assert.deepEqual(idx.search(expandQuery("compaction")).map((r) => r.id).sort(), ["a", "b"]);
});
