import type { APIRoute } from "astro";
import { entries, byId, firstSeen, hostOf } from "../../lib/data";

export const getStaticPaths = () => entries.map((e) => ({ params: { id: e.id } }));

export const GET: APIRoute = ({ params, site }) => {
  const e = byId[params.id!];
  const g = e.github;
  const tags = e.jev
    ? `router ${e.jev.router}, gate ${e.jev.gate}, compaction ${e.jev.compaction}, judge ${e.jev.judge}, browser agent ${e.jev.browserAgent}`
    : null;
  const body = [
    `# ${e.name}`,
    "",
    e.description,
    "",
    `- URL: ${e.url}`,
    `- Section: ${e.section}${e.subsection ? ` / ${e.subsection}` : ""}`,
    hostOf(e) ? `- Host agent: ${hostOf(e)}` : null,
    `- Type: ${e.type}`,
    g ? `- Stars: ${g.stars}` : null,
    g ? `- Pushed: ${g.pushedAt}` : null,
    g?.language ? `- Language: ${g.language}` : null,
    g?.license ? `- License: ${g.license}` : null,
    g?.archived ? "- Archived: yes" : null,
    e.maintainer ? "- By this list's maintainer" : null,
    e.trustPhrase ? `- Claim in the entry: ${e.trustPhrase}` : null,
    firstSeen[e.id] ? `- First seen: ${firstSeen[e.id]}` : null,
    tags ? `- Jev tags: ${tags}` : null,
    "",
    `Page: ${site!.origin}/p/${e.id}/`,
    "",
  ]
    .filter((l) => l !== null)
    .join("\n");
  return new Response(body, { headers: { "content-type": "text/markdown; charset=utf-8" } });
};
