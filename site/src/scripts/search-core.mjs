import MiniSearch from "minisearch";

export function buildIndex(docs) {
  const ms = new MiniSearch({
    fields: ["name", "description", "section", "host", "owner", "topics"],
    storeFields: ["id"],
    searchOptions: { boost: { name: 3, description: 1.5 }, prefix: true, fuzzy: 0.2, combineWith: "AND" },
  });
  ms.addAll(docs);
  return ms;
}

export function applyFacets(docs, facets) {
  return docs.filter((d) =>
    Object.entries(facets).every(([k, vals]) => {
      if (!vals?.length) return true;
      const v =
        k === "media" ? (d.hasMedia ? "yes" : "no")
        : k === "maintainer" ? (d.maintainer ? "yes" : "no")
        : k === "stars" ? d.starsBucket
        : d[k];
      return vals.includes(v);
    }),
  );
}

const words = (s) => new Set(s.toLowerCase().split(/[^a-z0-9]+/).filter((w) => w.length > 2));

export function matchIntent(query, intents) {
  const q = words(query);
  let best = null, score = 0;
  for (const it of intents) {
    const w = words(it);
    if (!w.size) continue;
    const overlap = [...w].filter((x) => q.has(x)).length / w.size;
    if (overlap > score) { score = overlap; best = it; }
  }
  return score >= 0.5 ? best : null;
}

export function sortDocs(docs, sort) {
  const by = {
    stars: (a, b) => (b.stars ?? 0) - (a.stars ?? 0),
    newest: (a, b) => String(b.firstSeen).localeCompare(String(a.firstSeen)),
    recent: (a, b) => String(b.pushedAt).localeCompare(String(a.pushedAt)),
    az: (a, b) => a.name.localeCompare(b.name),
  };
  return by[sort] ? [...docs].sort(by[sort]) : docs;
}
