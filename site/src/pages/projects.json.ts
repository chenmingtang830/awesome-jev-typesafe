import type { APIRoute } from "astro";
import { entries, sections, intents, firstSeen } from "../lib/data";

export const GET: APIRoute = ({ site }) =>
  new Response(
    JSON.stringify(
      {
        meta: {
          source: "https://github.com/valentynkit/awesome-jev-typesafe/blob/main/readme.md",
          site: site!.origin,
          license: "CC0-1.0",
          intents,
          sections: sections.map((s) => s.name),
        },
        entries: entries.map(({ line, ...e }) => ({ ...e, firstSeen: firstSeen[e.id] ?? null })),
      },
      null,
      1,
    ),
    { headers: { "content-type": "application/json; charset=utf-8" } },
  );
