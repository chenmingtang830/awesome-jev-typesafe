import type { APIRoute } from "astro";
import { categories, bySection } from "../../lib/data";

export const getStaticPaths = () => categories.map((s) => ({ params: { slug: s.slug }, props: { name: s.name } }));

export const GET: APIRoute = ({ props, site }) => {
  const name = (props as { name: string }).name;
  const list = bySection(name);
  const out = [`# ${name}`, "", `${list.length} entries.`, ""];
  let sub: string | null = null;
  for (const e of list) {
    if (e.subsection !== sub) {
      sub = e.subsection;
      if (sub) out.push(`## ${sub}`, "");
    }
    out.push(`- [${e.name}](${e.url}) - ${e.description}`);
  }
  out.push("", `Page: ${site!.origin}/c/${list[0] ? list[0].slugSection : ""}/`, "");
  return new Response(out.join("\n"), { headers: { "content-type": "text/markdown; charset=utf-8" } });
};
