import { test } from "node:test";
import assert from "node:assert/strict";
import { pending, hashOf, payloadFor, absorb, langFile, SCHEMA, SYSTEM, LANGS } from "./translate.mjs";

test("pending skips entries whose hash matches", () => {
  const entries = [{ id: "a", description: "One." }, { id: "b", description: "Two." }];
  const cache = { a: { hash: hashOf("One."), zh: "一", ja: "一", ko: "일" } };
  assert.deepEqual(pending(entries, cache).map((e) => e.id), ["b"]);
});

test("pending returns an entry again once its description changes", () => {
  const cache = { a: { hash: hashOf("One.") } };
  assert.deepEqual(pending([{ id: "a", description: "One, revised." }], cache).map((e) => e.id), ["a"]);
});

test("payload asks opus 5 for the json schema and sends id, section, and english", () => {
  const p = payloadFor([{ id: "a", description: "One.", section: "S", url: "https://x" }]);
  assert.equal(p.model, "claude-opus-5");
  assert.deepEqual(p.output_config.format, { type: "json_schema", schema: SCHEMA });
  assert.deepEqual(JSON.parse(p.messages[0].content), [{ id: "a", section: "S", en: "One." }]);
});

test("absorb writes one cache row per matched id and ignores unknown ids", () => {
  const batch = [{ id: "a", description: "One." }];
  const cache = {};
  const n = absorb(batch, JSON.stringify({ items: [{ id: "a", zh: "一", ja: "いち", ko: "하나" }, { id: "ghost", zh: "x", ja: "x", ko: "x" }] }), cache);
  assert.equal(n, 1);
  assert.deepEqual(cache, { a: { hash: hashOf("One."), zh: "一", ja: "いち", ko: "하나" } });
});

test("langFile keeps only entries the cache covers", () => {
  const entries = [{ id: "a", description: "One." }, { id: "b", description: "Two." }];
  const cache = { a: { hash: hashOf("One."), zh: "一", ja: "いち", ko: "하나" } };
  assert.deepEqual(langFile(entries, cache, "ja"), { a: "いち" });
});

test("system prompt names every target language and pins the glossary", () => {
  for (const name of Object.values(LANGS)) assert.ok(SYSTEM.includes(name), name);
  for (const term of ["概率/確率/확률", "校准/較正/보정", "宿主智能体", "维护者/メンテナ/관리자"])
    assert.ok(SYSTEM.includes(term), term);
});

test("system prompt fixes the japanese and korean register", () => {
  assert.match(SYSTEM, /です\/ます register, never だ\/である/);
  assert.match(SYSTEM, /격식체 \(-습니다\/-입니다\)/);
});
