import { buildIndex, applyFacets, expandQuery, matchIntent, sortDocs, type Doc } from "./search-core.mjs";

const FACET_KEYS = ["section", "host", "language", "license", "media", "stars", "maintainer"];

export async function mount(lang: string) {
  const box = document.querySelector<HTMLElement>(".searchbox");
  const results = document.getElementById("results");
  const input = document.getElementById("q") as HTMLInputElement | null;
  const sortSel = document.getElementById("sort") as HTMLSelectElement | null;
  const count = document.getElementById("count");
  const badge = document.getElementById("ranked-by-jev");
  const empty = document.querySelector<HTMLElement>(".no-results");
  if (!box || !results || !input || !sortSel) return;

  const cards = new Map<string, HTMLElement>();
  for (const el of results.querySelectorAll<HTMLElement>(".card")) cards.set(el.dataset.id!, el);

  const file = lang === "en" ? "/search-index.en.json" : `/search-index.${lang}.json`;
  const docs: Doc[] = await fetch(file).then((r) => r.json()).catch(() => []);
  if (!docs.length) return;
  const index = buildIndex(docs);
  const byId = new Map(docs.map((d) => [d.id, d]));
  const intentLabels = [...new Set(docs.flatMap((d) => Object.keys(d.intents ?? {})))];

  const params = new URLSearchParams(location.search);
  const facets: Record<string, string[]> = {};
  for (const k of FACET_KEYS) facets[k] = params.getAll(k);
  input.value = params.get("q") ?? "";
  sortSel.value = params.get("sort") ?? "relevance";

  const chips = [...document.querySelectorAll<HTMLButtonElement>(".chip")];
  const paintChips = () => {
    for (const c of chips) {
      const on = facets[c.dataset.facet!]?.includes(c.dataset.value!) ?? false;
      c.setAttribute("aria-pressed", String(on));
    }
  };

  const fmtResults = box.dataset.results ?? "{n} of {total}";
  const fmtEmpty = box.dataset.noResults ?? 'Nothing matches "{q}".';

  let reranked: string[] = [];
  let abort: AbortController | null = null;
  let rerankTimer = 0;

  function localRank(): Doc[] {
    const q = input!.value.trim();
    let pool = applyFacets(docs, facets);
    if (!q) return sortDocs(pool, sortSel!.value === "relevance" ? "stars" : sortSel!.value);
    const allowed = new Set(pool.map((d) => d.id));
    const intent = matchIntent(q, intentLabels);
    const scored = index
      .search(expandQuery(q))
      .filter((r) => allowed.has(r.id))
      .map((r) => {
        const doc = byId.get(r.id)!;
        const bonus = intent ? 2 * (doc.intents?.[intent] ?? 0) : 0;
        return { doc, score: r.score + bonus };
      })
      .sort((a, b) => b.score - a.score || (b.doc.stars ?? 0) - (a.doc.stars ?? 0))
      .map((r) => r.doc);
    return sortSel!.value === "relevance" ? scored : sortDocs(scored, sortSel!.value);
  }

  function render() {
    const ranked = localRank();
    let ids = ranked.map((d) => d.id);
    if (reranked.length) {
      const head = reranked.filter((id) => ids.includes(id));
      ids = [...head, ...ids.filter((id) => !head.includes(id))];
    }
    const shown = new Set(ids);
    for (const [id, el] of cards) el.hidden = !shown.has(id);
    const frag = document.createDocumentFragment();
    for (const id of ids) {
      const el = cards.get(id);
      if (el) frag.appendChild(el);
    }
    results!.appendChild(frag);
    if (count) count.textContent = fmtResults.replace("{n}", String(ids.length)).replace("{total}", String(docs.length));
    if (empty) {
      empty.hidden = ids.length > 0;
      empty.querySelector(".echo")!.textContent = fmtEmpty.replace("{q}", input!.value.trim());
    }
  }

  function syncUrl() {
    const p = new URLSearchParams();
    if (input!.value.trim()) p.set("q", input!.value.trim());
    if (sortSel!.value !== "relevance") p.set("sort", sortSel!.value);
    for (const k of FACET_KEYS) for (const v of facets[k]) p.append(k, v);
    history.replaceState(null, "", p.toString() ? `?${p}` : location.pathname);
  }

  // Jev reranks the local shortlist. Any failure keeps the local order and stays quiet.
  function rerank() {
    const q = input!.value.trim();
    clearTimeout(rerankTimer);
    abort?.abort();
    if (q.length < 3) {
      if (reranked.length) { reranked = []; render(); }
      badge?.setAttribute("hidden", "");
      return;
    }
    rerankTimer = window.setTimeout(() => {
      const ids = localRank().slice(0, 30).map((d) => d.id);
      if (!ids.length) return;
      abort = new AbortController();
      fetch("/api/rerank", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ query: q, ids }),
        signal: abort.signal,
      })
        .then((r) => (r.ok ? r.json() : Promise.reject(r.status)))
        .then((data: { ranked: { id: string; p: number }[] }) => {
          if (input!.value.trim() !== q || !Array.isArray(data?.ranked)) return;
          reranked = data.ranked.map((r) => r.id);
          for (const { id, p } of data.ranked) {
            const fill = cards.get(id)?.querySelector<HTMLElement>(".bar-fill");
            if (fill) fill.style.width = `${Math.round(p * 100)}%`;
          }
          badge?.removeAttribute("hidden");
          render();
        })
        .catch(() => {
          reranked = [];
          badge?.setAttribute("hidden", "");
        });
    }, 350);
  }

  let typing = 0;
  const update = () => { syncUrl(); render(); rerank(); };
  input.addEventListener("input", () => {
    clearTimeout(typing);
    typing = window.setTimeout(update, 120);
  });
  sortSel.addEventListener("change", update);
  for (const c of chips) {
    c.addEventListener("click", () => {
      const key = c.dataset.facet!, val = c.dataset.value!;
      const list = facets[key];
      const at = list.indexOf(val);
      at === -1 ? list.push(val) : list.splice(at, 1);
      paintChips();
      update();
    });
  }
  document.querySelector(".clear-filters")?.addEventListener("click", () => {
    for (const k of FACET_KEYS) facets[k] = [];
    input.value = "";
    paintChips();
    update();
  });

  addEventListener("keydown", (e) => {
    const target = e.target as HTMLElement | null;
    const typingHere = target && /^(INPUT|TEXTAREA|SELECT)$/.test(target.tagName);
    if ((e.key === "k" || e.key === "K") && (e.metaKey || e.ctrlKey)) { e.preventDefault(); input.focus(); input.select(); return; }
    if (e.key === "/" && !typingHere) { e.preventDefault(); input.focus(); return; }
    if (e.key === "Escape" && document.activeElement === input) {
      input.value = "";
      update();
    }
  });

  paintChips();
  render();
  rerank();
}
