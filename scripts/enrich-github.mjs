#!/usr/bin/env node
// Fetch repo metadata for every GitHub entry with GraphQL aliases, ~50 repos per query. Writes data/github.json.
import { readFileSync, writeFileSync, existsSync } from "node:fs";

export const batches = (arr, n) => Array.from({ length: Math.ceil(arr.length / n) }, (_, i) => arr.slice(i * n, i * n + n));
export const toMeta = (r) => ({
  stars: r.stargazerCount, forks: r.forkCount, pushedAt: r.pushedAt, createdAt: r.createdAt,
  language: r.primaryLanguage?.name ?? null, license: r.licenseInfo?.spdxId ?? null, archived: r.isArchived,
  ogImage: r.openGraphImageUrl ?? null, topics: (r.repositoryTopics?.nodes ?? []).map((n) => n.topic.name),
  description: r.description ?? null, homepage: r.homepageUrl || null,
});

const FIELDS = `nameWithOwner description homepageUrl isArchived pushedAt createdAt stargazerCount forkCount primaryLanguage{name} licenseInfo{spdxId} openGraphImageUrl repositoryTopics(first:10){nodes{topic{name}}}`;

async function gql(query, token) {
  const res = await fetch("https://api.github.com/graphql", { method: "POST", headers: { authorization: `bearer ${token}`, "content-type": "application/json" }, body: JSON.stringify({ query }) });
  if (!res.ok) throw new Error(`GraphQL ${res.status}: ${await res.text()}`);
  return res.json();
}

async function main() {
  const token = process.env.GITHUB_TOKEN;
  if (!token) throw new Error("GITHUB_TOKEN is required");
  const { entries } = JSON.parse(readFileSync("data/projects.json", "utf8"));
  const repos = [...new Set(entries.filter((e) => e.owner).map((e) => `${e.owner}/${e.repo}`))];
  const out = existsSync("data/github.json") ? JSON.parse(readFileSync("data/github.json", "utf8")).repos : {};
  const gone = [];
  for (const batch of batches(repos, 50)) {
    const q = `{ ${batch.map((full, i) => { const [o, n] = full.split("/"); return `r${i}: repository(owner:${JSON.stringify(o)}, name:${JSON.stringify(n)}) { ${FIELDS} }`; }).join("\n")} rateLimit { remaining cost } }`;
    const { data, errors } = await gql(q, token);
    const notFound = new Set((errors ?? []).filter((e) => e.type === "NOT_FOUND").map((e) => e.path?.[0]));
    batch.forEach((full, i) => {
      const node = data?.[`r${i}`];
      if (node) out[full] = toMeta(node);
      else if (notFound.has(`r${i}`)) { gone.push(full); out[full] = { ...(out[full] ?? {}), gone: true }; }
      // any other null (rate limit, server error) keeps yesterday's data
    });
    if (errors?.some((e) => e.type !== "NOT_FOUND")) console.error(JSON.stringify(errors.filter((e) => e.type !== "NOT_FOUND"), null, 1));
    console.log(`batch done, rate limit remaining ${data?.rateLimit?.remaining}`);
  }
  writeFileSync("data/github.json", JSON.stringify({ fetchedAt: new Date().toISOString().slice(0, 10), repos: out }, null, 1) + "\n");

  const stale = Object.entries(out).filter(([, m]) => m.pushedAt && Date.now() - Date.parse(m.pushedAt) > 90 * 864e5).map(([k]) => k);
  const archived = Object.entries(out).filter(([, m]) => m.archived).map(([k]) => k);
  const summary = `## GitHub enrichment\n\n${repos.length} repos. Gone: ${gone.length}. Archived: ${archived.length}. Stale over 90 days: ${stale.length}.\n\n${[["Gone", gone], ["Archived", archived], ["Stale", stale]].map(([t, l]) => `### ${t}\n\n${l.map((x) => `- ${x}`).join("\n") || "none"}`).join("\n\n")}\n`;
  if (process.env.GITHUB_STEP_SUMMARY) writeFileSync(process.env.GITHUB_STEP_SUMMARY, summary, { flag: "a" });
  else console.log(summary);
}

if (import.meta.url === `file://${process.argv[1]}`) main().catch((e) => { console.error(e); process.exit(1); });
