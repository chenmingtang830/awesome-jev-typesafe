import type { APIRoute } from "astro";
import { sections, bySection, prose } from "../lib/data";

export const GET: APIRoute = () => {
  const out: string[] = ["# Awesome Jev", ""];
  for (const s of sections) {
    if (prose.has(s.name) || s.count === 0) continue;
    out.push(`## ${s.name}`, "");
    let sub: string | null = null;
    for (const e of bySection(s.name)) {
      if (e.subsection !== sub) {
        sub = e.subsection;
        if (sub) out.push(`### ${sub}`, "");
      }
      out.push(`- [${e.name}](${e.url}) - ${e.description}`);
    }
    out.push("");
  }
  return new Response(out.join("\n"), { headers: { "content-type": "text/plain; charset=utf-8" } });
};
