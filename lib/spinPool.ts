import { TeamYearMeta } from "./types";

let cachedIndex: TeamYearMeta[] | null = null;

export async function loadSpinPool(): Promise<TeamYearMeta[]> {
  if (cachedIndex) return cachedIndex;
  const res = await fetch("/data/index.json");
  cachedIndex = await res.json();
  return cachedIndex!;
}

export function weightedSpin(pool: TeamYearMeta[]): TeamYearMeta {
  // Pick a random nation first (so England's 9 entries don't outweigh Morocco's 1),
  // then pick a random year from that nation — true variance across the whole pool.
  const nations = [...new Set(pool.map((t) => t.team))];
  const nation = nations[Math.floor(Math.random() * nations.length)];
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
