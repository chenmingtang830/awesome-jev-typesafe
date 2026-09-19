import projectsRaw from "../../../data/projects.json";
import historyRaw from "../../../data/history.json";
import { readFileSync, existsSync } from "node:fs";
import { fileURLToPath } from "node:url";

export type RawEntry = {
  id: string; name: string; url: string; owner: string | null; repo: string | null;
  description: string; section: string; subsection: string | null; order: number;
  type: "project" | "resource" | "list"; image: string | null; maintainer: boolean;
  languageHint: string | null; trustPhrase: string | null; line: number;
};
export type RawSection = { name: string; image: string | null; subs: string[] };
export type Gallery = { url: string; image: string };
type ProjectsFile = { sections: RawSection[]; gallery: Gallery[]; entries: RawEntry[] };

export type GithubMeta = {
  stars: number; forks: number; pushedAt: string; createdAt: string;
  language: string | null; license: string | null; archived: boolean;
  ogImage: string | null; topics: string[]; description: string | null;
  homepage: string | null; gone?: boolean;
};
export type JevTags = {
  section: string; sectionP: number; hostAgent: string; hostAgentP: number;
  maturity: number; hasNumbers: number; router: number; gate: number; compaction: number;
  judge: number; browserAgent: number; riskBulkScaffold: number; intents: Record<string, number>;
};
type JevFile = { intents?: string[]; entries?: Record<string, JevTags> };

// Track C writes these; the site has to build before they exist. cwd is site/ under
// astro, but node --test and the Vercel builder can start elsewhere, so try both roots.
const optional = (name: string): any => {
  for (const p of [`../data/${name}`, fileURLToPath(new URL(`../../../data/${name}`, import.meta.url))]) {
    if (existsSync(p)) return JSON.parse(readFileSync(p, "utf8"));
  }
  return {};
};

const raw = projectsRaw as unknown as ProjectsFile;
const history = historyRaw as unknown as { firstSeen: Record<string, string> };
const github: Record<string, GithubMeta> = optional("github.json").repos ?? {};
const jev: JevFile = optional("jev.json");
const i18nDesc: Record<string, Record<string, string>> = {
  zh: optional("i18n/zh.json"),
  ja: optional("i18n/ja.json"),
  ko: optional("i18n/ko.json"),
};

export type Entry = RawEntry & { github: GithubMeta | null; jev: JevTags | null; slugSection: string };

export const slug = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
export const gallery = raw.gallery;
export const intents = jev.intents ?? [];

export const entries: Entry[] = raw.entries.map((e) => ({
  ...e,
  github: e.owner ? github[`${e.owner}/${e.repo}`] ?? null : null,
  jev: jev.entries?.[e.id] ?? null,
  slugSection: slug(e.section),
}));

export const projects = entries.filter((e) => e.type === "project");
export const lists = entries.filter((e) => e.type === "list");
export const byId: Record<string, Entry> = Object.fromEntries(entries.map((e) => [e.id, e]));
export const bySection = (name: string) => entries.filter((e) => e.section === name);

export const sections = raw.sections.map((s) => ({
  ...s,
  slug: slug(s.name),
  count: raw.entries.filter((e) => e.section === s.name).length,
}));
export const prose = new Set(["Jev on one screen", "Know before you build"]);
export const categories = sections.filter((s) => s.count > 0 && s.name !== "Other lists");

export const firstSeen: Record<string, string> = history.firstSeen;
export const dataFetchedAt: string | null = optional("github.json").fetchedAt ?? null;

export const describe = (e: Entry, lang: string) =>
  lang === "en" ? e.description : i18nDesc[lang]?.[e.id] ?? e.description;

export const starsBucket = (n: number | undefined) =>
  n == null ? "unknown" : n < 10 ? "0-10" : n < 100 ? "10-100" : n < 1000 ? "100-1k" : "1k+";

export const hostOf = (e: Entry) =>
  e.section === "Coding agents" && e.subsection && e.subsection !== "Skills for writing Jev code"
    ? e.subsection
    : null;

export const image = (e: Entry) =>
  e.image ? `/media/${e.image.replace(/^media\//, "")}` : e.github?.ogImage ?? `/og/${e.id}.png`;

export const hasOwnImage = (e: Entry) => !!(e.image || e.github?.ogImage);

export const newSince = (days: number) => {
  const cut = new Date(Date.now() - days * 864e5).toISOString().slice(0, 10);
  return entries.filter((e) => (firstSeen[e.id] ?? "9999") >= cut);
};

export const topTag = (e: Entry): [string, number] | null => {
  if (!e.jev) return null;
  const pairs: [string, number][] = [
    ["router", e.jev.router], ["gate", e.jev.gate], ["compaction", e.jev.compaction],
    ["judge", e.jev.judge], ["browser agent", e.jev.browserAgent],
  ];
  return pairs.sort((a, b) => b[1] - a[1])[0];
};

export const readmePath = (e: Entry) =>
  `https://github.com/valentynkit/awesome-jev-typesafe/blob/main/readme.md?plain=1#L${e.line}`;

/** Repo file read at build (readme.md, media/sources.md). Empty string when missing. */
export const repoText = (name: string) => {
  for (const p of [`../${name}`, fileURLToPath(new URL(`../../../${name}`, import.meta.url))]) {
    if (existsSync(p)) return readFileSync(p, "utf8");
  }
  return "";
};

/** Bullets under an H2 in readme.md, markdown stripped to plain text. */
export const readmeBullets = (heading: string) => {
  const body = repoText("readme.md").split(`\n## ${heading}\n`)[1] ?? "";
  return body
    .split("\n## ")[0]
    .split("\n")
    .filter((l) => l.startsWith("- "))
    .map((l) => l.slice(2).replace(/`([^`]+)`/g, "$1").replace(/\[([^\]]+)\]\([^)]+\)/g, "$1"));
};
