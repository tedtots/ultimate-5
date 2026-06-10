import { TeamYearMeta } from "./types";

let cachedIndex: TeamYearMeta[] | null = null;

export async function loadSpinPool(): Promise<TeamYearMeta[]> {
  if (cachedIndex) return cachedIndex;
  const res = await fetch("/data/index.json");
  cachedIndex = await res.json();
  return cachedIndex!;
}

export function weightedSpin(pool: TeamYearMeta[]): TeamYearMeta {
  // Inverse-frequency weighting: nations with fewer squads in the pool get
  // proportionally higher probability, surfacing obscure teams more often.
  const nationCounts = new Map<string, number>();
  for (const t of pool) nationCounts.set(t.team, (nationCounts.get(t.team) ?? 0) + 1);

  const nations = [...nationCounts.keys()];
  const weights = nations.map((n) => 1 / nationCounts.get(n)!);
  const total   = weights.reduce((s, w) => s + w, 0);

  let r = Math.random() * total;
  let nation = nations[0];
  for (let i = 0; i < nations.length; i++) {
    r -= weights[i];
    if (r <= 0) { nation = nations[i]; break; }
  }

  const entries = pool.filter((t) => t.team === nation);
  return entries[Math.floor(Math.random() * entries.length)];
}

export async function loadSquad(key: string) {
  const res = await fetch(`/data/squads/${key}.json`);
  if (!res.ok) return null;
  return res.json();
}

export function isDarkHorse(meta: TeamYearMeta): boolean {
  return meta.tier === "dark_horse";
}
