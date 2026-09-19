export type Doc = {
  id: string; name: string; description: string; section: string; host: string | null;
  owner: string | null; topics: string; language: string; license: string; stars: number;
  starsBucket: string; hasMedia: boolean; maintainer: boolean; intents: Record<string, number>;
  firstSeen: string; pushedAt: string;
};
export function buildIndex(docs: Doc[]): {
  search(q: string): { id: string; score: number }[];
};
export function applyFacets(docs: Doc[], facets: Record<string, string[]>): Doc[];
export function matchIntent(query: string, intents: string[]): string | null;
export function sortDocs(docs: Doc[], sort: string): Doc[];
