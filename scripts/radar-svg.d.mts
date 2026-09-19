export type RadarDot = {
  id: string;
  name: string;
  sector: string;
  stars: number;
  accent?: "amber" | "muted";
  /** Carried through for the href callback; radarSvg itself ignores extra keys. */
  href?: string | null;
};

export type RadarOptions = {
  dots: RadarDot[];
  sectors: string[];
  size?: number;
  sweep?: boolean;
  labels?: boolean;
  theme?: "dark" | "light";
  href?: (d: RadarDot) => string | null;
  labelHref?: (sector: string) => string | null;
};

export function radarSvg(options: RadarOptions): string;
