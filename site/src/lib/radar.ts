import { radarSvg, type RadarDot } from "../../../scripts/radar-svg.mjs";
import { projects, sections, firstSeen, slug } from "./data";
import { localePath } from "./i18n";

export { radarSvg };
export type { RadarDot };

const hosted = projects.filter((e) => e.owner);

/** Readme order, kept so a sector sits in the same wedge on every build. */
export const radarSectors = sections.map((s) => s.name).filter((n) => hosted.some((e) => e.section === n));

// The whole list shares one firstSeen date from the day it was first parsed, and painting
// 250 seed entries amber would say nothing. Only arrivals after that day count as new.
const seeded = Object.values(firstSeen).sort()[0] ?? "";
const weekAgo = new Date(Date.now() - 7 * 864e5).toISOString().slice(0, 10);
const isNew = (id: string) => {
  const d = firstSeen[id];
  return !!d && d > seeded && d >= weekAgo;
};

export function radarDots(lang: string): RadarDot[] {
  return hosted
    // Oldest first, so a fresh arrival draws on top of the crowd instead of under it.
    .slice()
    .sort((a, b) => (firstSeen[a.id] ?? "").localeCompare(firstSeen[b.id] ?? ""))
    .map((e) => ({
      id: e.id,
      name: e.name,
      sector: e.section,
      stars: e.github?.stars ?? 0,
      accent: e.github?.archived ? "muted" : e.maintainer || isNew(e.id) ? "amber" : undefined,
      href: localePath(lang, `/p/${e.id}/`),
    }));
}

export const sectorHref = (lang: string) => (name: string) => localePath(lang, `/c/${slug(name)}/`);
