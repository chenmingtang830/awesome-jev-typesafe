#!/usr/bin/env node
// Translate new or changed descriptions into zh, ja, ko with Claude. Cached by description hash in data/i18n/cache.json.
import { readFileSync, writeFileSync, mkdirSync, existsSync } from "node:fs";
import { createHash } from "node:crypto";
import Anthropic from "@anthropic-ai/sdk";

export const hashOf = (s) => createHash("sha1").update(s).digest("hex").slice(0, 10);
export const pending = (entries, cache) => entries.filter((e) => cache[e.id]?.hash !== hashOf(e.description));
export const LANGS = { zh: "Simplified Chinese", ja: "Japanese", ko: "Korean" };
export const BATCH = 25;

export const SCHEMA = { type: "object", additionalProperties: false, required: ["items"], properties: { items: { type: "array", items: { type: "object", additionalProperties: false, required: ["id", "zh", "ja", "ko"], properties: { id: { type: "string" }, zh: { type: "string" }, ja: { type: "string" }, ko: { type: "string" } } } } } };

export const SYSTEM = `You translate one-sentence descriptions of open-source software projects that use Jev, TypeSafe's typed-decision model, for a directory. Keep product names, code identifiers, model names, numbers, and units unchanged. Keep each translation one sentence, plain, and as terse as the source. Targets: ${Object.values(LANGS).join(", ")}.`;

export const payloadFor = (batch) => ({
  model: "claude-opus-5",
  max_tokens: 16000,
  system: SYSTEM,
  messages: [{ role: "user", content: JSON.stringify(batch.map((e) => ({ id: e.id, section: e.section, en: e.description }))) }],
  output_config: { format: { type: "json_schema", schema: SCHEMA } },
});

// Fills cache in place from one model response; returns how many ids it matched.
export function absorb(batch, text, cache) {
  let n = 0;
  for (const item of JSON.parse(text).items ?? []) {
    const src = batch.find((e) => e.id === item.id);
    if (!src) continue;
    cache[item.id] = { hash: hashOf(src.description), zh: item.zh, ja: item.ja, ko: item.ko };
    n++;
  }
  return n;
}

export const langFile = (entries, cache, lang) => Object.fromEntries(entries.filter((e) => cache[e.id]).map((e) => [e.id, cache[e.id][lang]]));

async function main() {
  const dryRun = process.argv.includes("--dry-run");
  const { entries } = JSON.parse(readFileSync("data/projects.json", "utf8"));
  const cachePath = "data/i18n/cache.json";
  const cache = existsSync(cachePath) ? JSON.parse(readFileSync(cachePath, "utf8")) : {};
  const todo = pending(entries, cache);

  if (dryRun) {
    console.log(`dry run: ${todo.length} of ${entries.length} descriptions need translating, ${Math.ceil(todo.length / BATCH)} batches of ${BATCH}\n`);
    console.log(JSON.stringify(payloadFor(todo.slice(0, BATCH)), null, 1));
    return;
  }
  if (!process.env.ANTHROPIC_API_KEY) {
    console.log("ANTHROPIC_API_KEY is not set, skipping translation. data/i18n is left as it is.");
    return;
  }

  mkdirSync("data/i18n", { recursive: true });
  console.log(`${todo.length} descriptions to translate`);
  const client = new Anthropic();
  for (let i = 0; i < todo.length; i += BATCH) {
    const batch = todo.slice(i, i + BATCH);
    const res = await client.messages.create(payloadFor(batch));
    if (res.stop_reason === "refusal") throw new Error(`Claude refused batch at ${i}: ${res.stop_details?.explanation ?? ""}`);
    const text = res.content.find((b) => b.type === "text")?.text ?? "{}";
    absorb(batch, text, cache);
    writeFileSync(cachePath, JSON.stringify(cache, null, 1) + "\n");
    console.log(`${Math.min(i + BATCH, todo.length)}/${todo.length}`);
  }
  for (const lang of Object.keys(LANGS)) {
    writeFileSync(`data/i18n/${lang}.json`, JSON.stringify(langFile(entries, cache, lang), null, 1) + "\n");
  }
}
if (import.meta.url === `file://${process.argv[1]}`) main().catch((e) => { console.error(e); process.exit(1); });
