export type RadarDot = {
  id: string;
  name: string;
  sector: string;
  stars: number;
  /** Leave unset for an active repo, which paints cyan. */
  accent?: "rising" | "quiet" | "archived";
  /** Carried through for the href callback; radarSvg itself ignores extra keys. */
  href?: string | null;
};

export type RadarOptions = {
  dots: RadarDot[];
  sectors: string[];
  size?: number;
  sweep?: boolean;
  labels?: boolean;
  /** Star floor for naming a dot on the radar. 0 turns the names off. */
  dotLabels?: number;
  theme?: "dark" | "light";
  href?: (d: RadarDot) => string | null;
  labelHref?: (sector: string) => string | null;
};

export function radarSvg(options: RadarOptions): string;
