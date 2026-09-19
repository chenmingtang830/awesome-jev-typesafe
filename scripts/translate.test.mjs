import { test } from "node:test";
import assert from "node:assert/strict";
import { pending, hashOf, payloadFor, absorb, langFile, SCHEMA } from "./translate.mjs";

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
