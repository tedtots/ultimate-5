import { FormationId } from "./types";

export interface PitchSlot {
  x: number; // % from left (0–100)
  y: number; // % from top (0=attack end, 100=GK end)
  label: string; // displayed inside dot
}

/** Slot order matches Formation.slots: [GK, then outfield in order] */
export const PITCH_POSITIONS: Record<FormationId, PitchSlot[]> = {
  "1-2-1": [
    { x: 50, y: 84, label: "GK" },
    { x: 50, y: 60, label: "CB" },
    { x: 26, y: 34, label: "CM" },
    { x: 74, y: 34, label: "CM" },
    { x: 50, y: 10, label: "ST" },
  ],
  "2-2": [
    { x: 50, y: 84, label: "GK" },
    { x: 28, y: 60, label: "CB" },
    { x: 72, y: 60, label: "CB" },
    { x: 28, y: 18, label: "ST" },
    { x: 72, y: 18, label: "ST" },
  ],
  "2-1-1": [
    { x: 50, y: 84, label: "GK" },
    { x: 28, y: 62, label: "CB" },
    { x: 72, y: 62, label: "CB" },
    { x: 50, y: 38, label: "CM" },
    { x: 50, y: 10, label: "ST" },
  ],
  "1-1-2": [
    { x: 50, y: 84, label: "GK" },
    { x: 50, y: 60, label: "CB" },
    { x: 50, y: 36, label: "CM" },
    { x: 26, y: 10, label: "ST" },
    { x: 74, y: 10, label: "ST" },
  ],
  "3-1": [
    { x: 50, y: 84, label: "GK" },
    { x: 20, y: 60, label: "CB" },
    { x: 50, y: 60, label: "CB" },
    { x: 80, y: 60, label: "CB" },
    { x: 50, y: 10, label: "ST" },
  ],
  "1-3": [
    { x: 50, y: 84, label: "GK" },
    { x: 50, y: 60, label: "CB" },
    { x: 16, y: 10, label: "ST" },
    { x: 50, y: 10, label: "ST" },
    { x: 84, y: 10, label: "ST" },
  ],
};
