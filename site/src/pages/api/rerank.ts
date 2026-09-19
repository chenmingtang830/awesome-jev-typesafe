import type { APIRoute } from "astro";
import { byId } from "../../lib/data";
import { validate, questionsFor, order, Limiter } from "../../lib/rerank-core.mjs";

export const prerender = false;

const limiter = new Limiter({ perDay: Number(process.env.JEV_DAILY_CAP ?? 5000) });

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json", "cache-control": "no-store" },
  });

// Some browsers omit Origin on a same-origin POST, so Sec-Fetch-Site carries the proof instead.
const fromBrowser = (request: Request, siteOrigin: string | undefined) => {
  const origin = request.headers.get("origin");
  if (origin) return Boolean(siteOrigin) && origin === siteOrigin;
  return request.headers.get("sec-fetch-site") === "same-origin";
};

export const POST: APIRoute = async ({ request, site }) => {
  if (!fromBrowser(request, site?.origin ?? process.env.SITE_ORIGIN)) return json({ error: "browser only" }, 403);

  const key = process.env.TYPESAFE_API_KEY;
  if (!key) return json({ error: "no key" }, 503);

  const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";
  if (!limiter.take(ip)) return json({ error: "rate limited" }, 429);

  const body = await request.json().catch(() => null);
  const bad = validate(body);
  if (bad) return json({ error: bad }, 400);

  // Text comes from our own copy of the data, never the client, and stays short enough that 30 candidates fit one request.
  const cands: { id: string; text: string }[] = [];
  for (const id of body.ids) {
    const e = byId[id];
    if (e) cands.push({ id: e.id, text: `${e.name}: ${e.description}`.slice(0, 160) });
  }
  if (!cands.length) return json({ ranked: [] });

  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), 3000);
  try {
    const res = await fetch("https://api.typesafe.ai/v1/systemone", {
      method: "POST",
      signal: ctrl.signal,
      headers: { authorization: `Bearer ${key}`, "content-type": "application/json" },
      body: JSON.stringify({ model: "jev-latest", state: `User query: ${body.query}`, questions: questionsFor(cands) }),
    });
    if (!res.ok) return json({ error: "upstream" }, 502);
    const { answers } = await res.json();
    return json({ ranked: order(cands.map((c) => c.id), answers) });
  } catch {
    if (ctrl.signal.aborted) return json({ error: "timeout" }, 504);
    return json({ error: "upstream" }, 502);
  } finally {
    clearTimeout(timer);
  }
};
