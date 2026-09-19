import { test } from "node:test";
import assert from "node:assert/strict";
import { questionsFor, stateFor, INTENTS, hashOf } from "./tag-jev.mjs";

test("questions cover tags and intents", () => {
  const q = questionsFor(["Coding agents", "Routing and gateways"]);
  assert.equal(q.section.type, "choice");
  assert.ok(q.section.criteria["coding_agents"]);
  assert.equal(q.router.type, "noul");
  assert.equal(q.maturity.type, "score");
  assert.equal(q.maturity.criteria.length, 5);
  for (const it of INTENTS) assert.equal(q[`intent_${hashOf(it)}`].type, "noul");
  assert.equal(Object.keys(q).length, 10 + INTENTS.length);
});

test("intent hashes do not collide", () => {
  assert.equal(new Set(INTENTS.map(hashOf)).size, INTENTS.length);
});

test("state includes description and stars", () => {
  assert.match(stateFor({ name: "x", description: "Does y.", section: "S", subsection: null }, { stars: 12, pushedAt: "2026-09-01", language: "Go" }), /12 stars/);
});

test("state drops the github lines when the entry is not on github", () => {
  const s = stateFor({ name: "x", description: "Does y.", section: "S", subsection: "Sub" }, null);
  assert.equal(s, "Project: x\nListed under: S / Sub\nDescription: Does y.");
});

test("cache key changes when the state changes and not otherwise", () => {
  const q = Object.keys(questionsFor(["S"]));
  const cacheKey = (state) => hashOf(state + JSON.stringify(q));
  const a = stateFor({ name: "x", description: "Does y.", section: "S", subsection: null }, { stars: 12, pushedAt: "2026-09-01", language: "Go" });
  const b = stateFor({ name: "x", description: "Does y.", section: "S", subsection: null }, { stars: 13, pushedAt: "2026-09-01", language: "Go" });
  assert.equal(cacheKey(a), cacheKey(a));
  assert.notEqual(cacheKey(a), cacheKey(b));
});
