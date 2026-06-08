import { Formation } from "./types";

export const FORMATIONS: Formation[] = [
  {
    id: "1-2-1",
    name: "1-2-1 Diamond",
    description: "Balanced — best of everything",
    slots: ["GK", "DEF", "MID", "MID", "FWD"],
    attackBonus: 3,
    defenceBonus: 3,
  },
  {
    id: "2-2",
    name: "2-2 Box",
    description: "Direct — two banks of two, no midfield",
    slots: ["GK", "DEF", "DEF", "FWD", "FWD"],
    attackBonus: 5,
    defenceBonus: 5,
  },
  {
    id: "2-1-1",
    name: "2-1-1 Counter",
    description: "Defensive — park the bus, hit on the break",
    slots: ["GK", "DEF", "DEF", "MID", "FWD"],
    attackBonus: 0,
    defenceBonus: 8,
  },
  {
    id: "1-1-2",
    name: "1-1-2 Press",
    description: "Attacking — high press, two up top",
    slots: ["GK", "DEF", "MID", "FWD", "FWD"],
    attackBonus: 8,
    defenceBonus: 0,
  },
  {
    id: "3-1",
    name: "3-1 Fortress",
    description: "Ultra-defensive — wall of three, one out ball",
    slots: ["GK", "DEF", "DEF", "DEF", "FWD"],
    attackBonus: -5,
    defenceBonus: 12,
  },
  {
    id: "1-3",
    name: "1-3 Spread",
    description: "All-out attack — one at the back, three up",
    slots: ["GK", "DEF", "FWD", "FWD", "FWD"],
    attackBonus: 12,
    defenceBonus: -5,
  },
];

export const POSITION_ORDER: Record<string, number> = {
  GK: 0,
  DEF: 1,
  MID: 2,
  FWD: 3,
};

/** Returns 0, 5, or 15 percent penalty.
 *  GK can ONLY play GK — any GK↔outfield cross is always 15 (ineligible).
 *  Adjacent outfield positions (DEF↔MID, MID↔FWD) are 5 (OOP).
 *  Non-adjacent outfield positions (DEF↔FWD) are 15 (ineligible).
 */
export function getPositionPenalty(
  playerPos: string,
  slotPos: string
): number {
  if (playerPos === slotPos) return 0;
  // GK is strictly isolated — never plays out of position
  if (playerPos === "GK" || slotPos === "GK") return 15;
  const diff = Math.abs(POSITION_ORDER[playerPos] - POSITION_ORDER[slotPos]);
  return diff === 1 ? 5 : 15;
}
