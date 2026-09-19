#!/usr/bin/env node
// README.<lang>.md from data/projects.json plus data/i18n/<lang>.json. Section names come from site/src/i18n/sections.<lang>.json.
// Anything not yet translated falls back to English, so the three files always list every entry.
import { readFileSync, writeFileSync, existsSync } from "node:fs";

const optional = (path) => (existsSync(path) ? JSON.parse(readFileSync(path, "utf8")) : {});
const { sections, entries } = JSON.parse(readFileSync("data/projects.json", "utf8"));
const HEAD = { zh: ["简体中文", "此文件由英文列表自动生成，请勿直接编辑。贡献请修改 [readme.md](readme.md)。"], ja: ["日本語", "このファイルは英語のリストから自動生成されています。直接編集せず、[readme.md](readme.md) に貢献してください。"], ko: ["한국어", "이 파일은 영어 목록에서 자동 생성됩니다. 직접 수정하지 말고 [readme.md](readme.md)에 기여해 주세요."] };
const FILE = { zh: "README.zh-CN.md", ja: "README.ja.md", ko: "README.ko.md" };

for (const lang of Object.keys(HEAD)) {
  const tr = optional(`data/i18n/${lang}.json`);
  const names = optional(`site/src/i18n/sections.${lang}.json`);
  const out = [`# Awesome Jev (${HEAD[lang][0]})\n`, `> ${HEAD[lang][1]}\n`, `[English](readme.md) · [网站 / サイト / 사이트](https://awesome-jev.vercel.app/${lang}/)\n`];
  for (const s of sections) {
    const list = entries.filter((e) => e.section === s.name);
    if (!list.length) continue;
    out.push(`## ${names[s.name] ?? s.name}\n`);
    let sub = null;
    for (const e of list) {
      if (e.subsection !== sub) { sub = e.subsection; if (sub) out.push(`### ${names[sub] ?? sub}\n`); }
      out.push(`- [${e.name}](${e.url}) - ${tr[e.id] ?? e.description}`);
    }
    out.push("");
  }
  writeFileSync(FILE[lang], out.join("\n"));
  console.log(`${FILE[lang]}: ${entries.length} entries, ${Object.keys(tr).length} translated, ${Object.keys(names).length} section names`);
}
