#!/usr/bin/env node
// Ask Jev ten tag questions plus one Noul per canonical intent for every project entry. Cached by state hash in data/jev.json.
import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { createHash } from "node:crypto";
import { ask } from "./jev-client.mjs";

export const INTENTS = [
  "route between models by task difficulty", "gate or approve tool calls before they run", "compact or prune agent context",
  "judge or verify an agent's output", "stop an agent from finishing early", "pick which skill or prompt to load",
  "drive a browser or GUI with an agent", "control a phone or mobile app", "review code or pull requests",
  "moderate content or detect abuse", "rerank search results", "classify support tickets or messages",
  "extract structured fields from text", "run Jev on open models without the vendor", "benchmark or calibrate Jev",
  "build a game or simulation on Jev", "trade or score financial signals", "call Jev from the command line",
  "call Jev from a language SDK", "serve Jev over MCP to any agent", "learn how Jev works", "compare Jev with an LLM",
  "route requests through a gateway or proxy", "detect prompt injection or risky commands", "score or rank candidates in a pipeline",
  "label data or build a dataset", "run Jev inside a database or SQL", "add Jev to a chat bot or Discord", "voice or realtime decisions", "monitor or observe Jev usage and cost",
];
export const hashOf = (s) => createHash("sha1").update(s).digest("hex").slice(0, 8);
const key = (s) => s.toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_|_$/g, "");
const NOUL = (instructions) => ({ type: "noul", instructions });

export function questionsFor(sectionNames) {
  const q = {
    section: { type: "choice", instructions: "Which section of a directory of Jev projects fits this project best?", criteria: Object.fromEntries(sectionNames.map((s) => [key(s), s])) },
    host_agent: { type: "choice", instructions: "Which coding agent does this project plug into?", criteria: { claude_code: "Claude Code hooks, plugins, or config", codex: "OpenAI Codex CLI", pi: "Pi coding agent", hermes: "Hermes agent", agent_zero: "Agent Zero", any: "Any agent via MCP, ACP, or a generic adapter", none: "Not a coding-agent integration" } },
    maturity: { type: "score", instructions: "How mature does this project look from its description, stars, and activity?", criteria: ["toy or demo", "early", "usable", "solid", "battle-tested"] },
    has_numbers: NOUL("Does the description report a measured number such as accuracy, latency, cost, or recall?"),
    router: NOUL("Does this project route requests between models, tools, or paths based on a judgment?"),
    gate: NOUL("Does this project gate, approve, block, or steer actions before they run?"),
    compaction: NOUL("Does this project prune, compact, or filter agent context or tool output?"),
    judge: NOUL("Does this project verify, review, or judge outputs after they are produced?"),
    browser_agent: NOUL("Does this project drive a browser, desktop, or mobile UI?"),
    risk_bulk_scaffold: NOUL("Does this look like one of many templated repos published in a batch with little original work?"),
  };
  for (const it of INTENTS) q[`intent_${hashOf(it)}`] = NOUL(`Would a developer who wants to ${it} find this project useful?`);
  return q;
}

export const stateFor = (e, gh) => [
  `Project: ${e.name}`, `Listed under: ${e.section}${e.subsection ? " / " + e.subsection : ""}`, `Description: ${e.description}`,
  gh?.description ? `Repo description: ${gh.description}` : null,
  gh?.stars != null ? `${gh.stars} stars, last push ${gh.pushedAt?.slice(0, 10)}, language ${gh.language ?? "unknown"}` : null,
].filter(Boolean).join("\n");

// Sections that hold resources or other lists are never a tagging target.
const NOT_A_SECTION = ["Jev on one screen", "Know before you build", "Start here", "Articles and talks", "Other lists"];

export function load() {
  const { entries, sections } = JSON.parse(readFileSync("data/projects.json", "utf8"));
  const gh = existsSync("data/github.json") ? JSON.parse(readFileSync("data/github.json", "utf8")).repos : {};
  const sectionNames = sections.map((s) => s.name).filter((n) => !NOT_A_SECTION.includes(n));
  return { entries, gh, sectionNames, projects: entries.filter((e) => e.type === "project") };
}

async function main() {
  const dryRun = process.argv.includes("--dry-run");
  const { gh, sectionNames, projects } = load();
  const questions = questionsFor(sectionNames);

  if (dryRun) {
    const e = projects[0];
    const state = stateFor(e, e.owner ? gh[`${e.owner}/${e.repo}`] : null);
    console.log(`dry run: ${projects.length} project entries, ${Object.keys(questions).length} questions per call\n`);
    console.log(`--- state for ${e.id} ---\n${state}\n`);
    console.log(`--- questions for ${e.id} ---\n${JSON.stringify(questions, null, 1)}`);
    return;
  }
  if (!process.env.TYPESAFE_API_KEY) {
    console.log("TYPESAFE_API_KEY is not set, skipping Jev tagging. data/jev.json is left as it is.");
    return;
  }

  const file = existsSync("data/jev.json") ? JSON.parse(readFileSync("data/jev.json", "utf8")) : { intents: INTENTS, entries: {} };
  file.intents = INTENTS;
  let calls = 0, tokens = 0;
  for (const e of projects) {
    const state = stateFor(e, e.owner ? gh[`${e.owner}/${e.repo}`] : null);
    const h = hashOf(state + JSON.stringify(Object.keys(questions)));
    if (file.entries[e.id]?.hash === h) continue;
    const { answers, usage } = await ask(state, questions);
    calls++; tokens += usage?.input_tokens ?? 0;
    const sectionKey = answers.section.choice;
    file.entries[e.id] = {
      hash: h,
      section: sectionNames.find((s) => key(s) === sectionKey) ?? sectionKey, sectionP: answers.section.probabilities[sectionKey],
      hostAgent: answers.host_agent.choice, hostAgentP: answers.host_agent.probabilities[answers.host_agent.choice],
      maturity: answers.maturity.score, hasNumbers: answers.has_numbers.noul,
      router: answers.router.noul, gate: answers.gate.noul, compaction: answers.compaction.noul, judge: answers.judge.noul,
      browserAgent: answers.browser_agent.noul, riskBulkScaffold: answers.risk_bulk_scaffold.noul,
      intents: Object.fromEntries(INTENTS.map((it) => [it, answers[`intent_${hashOf(it)}`].noul])),
    };
    if (calls % 25 === 0) { writeFileSync("data/jev.json", JSON.stringify(file, null, 1) + "\n"); console.log(`${calls} calls, ${tokens} tokens`); }
  }
  writeFileSync("data/jev.json", JSON.stringify(file, null, 1) + "\n");
  console.log(`done: ${calls} calls, ${tokens} input tokens, about $${((tokens / 1e6) * 0.042).toFixed(4)}`);
}
if (import.meta.url === `file://${process.argv[1]}`) main().catch((e) => { console.error(e); process.exit(1); });
