"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { FORMATIONS } from "@/lib/formations";
import { Formation } from "@/lib/types";

export interface EraFilter { minYear: number; maxYear: number }

interface Props {
  onSelect: (f: Formation, teamName: string, era: EraFilter) => void;
}

const FORMATION_ICONS: Record<string, string> = {
  "1-2-1": "💎",
  "2-2":   "📦",
  "2-1-1": "🛡️",
  "1-1-2": "⚡",
  "3-1":   "🏰",
  "1-3":   "🌊",
};

// Every World Cup year (for slider snapping)
const WC_YEARS = [
  1930, 1934, 1938, 1950, 1954, 1958, 1962, 1966,
  1970, 1974, 1978, 1982, 1986, 1990, 1994, 1998,
  2002, 2006, 2010, 2014, 2018, 2022,
];

const ERA_PRESETS = [
  { label: "All-time",  minYear: 1930, maxYear: 2022 },
  { label: "'60s-'70s", minYear: 1962, maxYear: 1979 },
  { label: "'80s-'90s", minYear: 1982, maxYear: 1999 },
  { label: "'00s+",     minYear: 2002, maxYear: 2022 },
  { label: "Modern",   minYear: 2014, maxYear: 2022 },
];

function posBadgeStyle(pos: string): React.CSSProperties {
  const key = pos.toLowerCase();
  return { backgroundColor: `var(--pos-${key})`, color: `var(--pos-${key}-fg)` };
}

export default function FormationSelect({ onSelect }: Props) {
  const [teamName, setTeamName]     = useState("");
  const [minYearIdx, setMinYearIdx] = useState(0);
  const [maxYear, setMaxYear]       = useState(2022);
  const minYear = WC_YEARS[minYearIdx];

  return (
    <div className="flex flex-col min-h-dvh px-4 pb-8">
      <div className="pt-6 pb-4">
        <p className="text-[11px] uppercase tracking-widest mb-1" style={{ color: "var(--text-muted)" }}>
          Step 1 of 2
        </p>
        <h2 className="text-2xl font-black" style={{ color: "var(--text)" }}>Build Your Team</h2>
        <p className="text-sm mt-1" style={{ color: "var(--text-muted)" }}>
          Name your squad, then pick a formation.
        </p>
      </div>

      {/* Team Name Input */}
      <div className="mb-5">
        <label className="block text-[10px] uppercase tracking-widest mb-2" style={{ color: "var(--text-muted)" }}>
          Team Name <span className="normal-case" style={{ color: "var(--text-dim)" }}>(optional)</span>
        </label>
        <input
          type="text"
          value={teamName}
          onChange={(e) => setTeamName(e.target.value)}
          placeholder="e.g. Galaxy XI, The Underdogs…"
          maxLength={30}
          className="w-full rounded-2xl px-4 py-3 text-sm font-semibold focus:outline-none transition-colors"
          style={{
            backgroundColor: "var(--bg-card)",
            border: "1px solid var(--border)",
            color: "var(--text)",
          }}
          onFocus={(e) => (e.currentTarget.style.borderColor = "var(--accent)")}
          onBlur={(e)  => (e.currentTarget.style.borderColor = "var(--border)")}
        />
      </div>

      {/* Era Filter */}
      <div className="mb-6">
        <p className="text-[10px] uppercase tracking-widest mb-3" style={{ color: "var(--text-muted)" }}>Era</p>

        {/* Preset buttons */}
        <div className="flex gap-2 mb-4">
          {ERA_PRESETS.map((preset) => {
            const active = minYear === preset.minYear && maxYear === preset.maxYear;
            return (
              <button
                key={preset.label}
                onClick={() => {
                  setMinYearIdx(WC_YEARS.indexOf(preset.minYear));
                  setMaxYear(preset.maxYear);
                }}
                className="flex-1 py-1.5 rounded-xl text-xs font-bold border transition-all"
                style={active ? {
                  backgroundColor: "var(--accent-15)",
                  borderColor: "var(--accent-border)",
                  color: "var(--accent)",
                } : {
                  backgroundColor: "var(--bg-card)",
                  borderColor: "var(--border)",
                  color: "var(--text-dim)",
                }}
              >
                {preset.label}
              </button>
            );
          })}
        </div>

        {/* Year range slider */}
        <div className="relative px-1">
          <input
            type="range"
            min={0}
            max={WC_YEARS.length - 1}
            step={1}
            value={minYearIdx}
            onChange={(e) => {
              setMinYearIdx(Number(e.target.value));
              setMaxYear(2022);
            }}
            className="w-full h-1.5 rounded-full appearance-none cursor-pointer"
            style={{
              background: `linear-gradient(to right, var(--accent) ${(minYearIdx / (WC_YEARS.length - 1)) * 100}%, var(--border) ${(minYearIdx / (WC_YEARS.length - 1)) * 100}%)`,
            }}
          />
          <div className="flex justify-between mt-2 text-[10px] font-bold">
            <span style={{ color: "var(--accent)" }}>{minYear}</span>
            <span style={{ color: "var(--text-dim)" }}>
              {WC_YEARS.filter((y) => y >= minYear && y <= maxYear).length} tournaments
            </span>
            <span style={{ color: "var(--accent)" }}>{maxYear}</span>
          </div>
        </div>
        <p className="text-[10px] mt-2" style={{ color: "var(--text-dim)" }}>
          Only teams from {minYear}–{maxYear} will appear when you spin.
        </p>
      </div>

      <div>
        <p className="text-[10px] uppercase tracking-widest mb-3" style={{ color: "var(--text-muted)" }}>
          Pick Your Formation
        </p>
        <div className="flex flex-col gap-3">
          {FORMATIONS.map((f, i) => (
            <motion.button
              key={f.id}
              className="w-full text-left rounded-2xl p-4 flex items-center gap-4"
              style={{ border: "1px solid var(--border)", backgroundColor: "var(--bg-card)" }}
              onClick={() => onSelect(f, teamName.trim(), { minYear, maxYear })}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: i * 0.06 }}
              whileTap={{ scale: 0.98 }}
            >
              <div
                className="w-12 h-12 rounded-xl flex items-center justify-center text-2xl flex-shrink-0"
                style={{ backgroundColor: "var(--bg-surface)" }}
              >
                {FORMATION_ICONS[f.id]}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="font-bold text-base" style={{ color: "var(--text)" }}>{f.name}</span>
                  {f.attackBonus > 0 && (
                    <span
                      className="text-[10px] px-1.5 py-0.5 rounded-full font-semibold"
                      style={{ color: "var(--accent)", backgroundColor: "var(--accent-10)" }}
                    >
                      +ATK
                    </span>
                  )}
                  {f.defenceBonus > f.attackBonus && (
                    <span className="text-[10px] text-blue-400 bg-blue-400/10 px-1.5 py-0.5 rounded-full font-semibold">
                      +DEF
                    </span>
                  )}
                </div>
                <p className="text-xs mt-0.5" style={{ color: "var(--text-muted)" }}>{f.description}</p>
                <div className="flex gap-1 mt-2 flex-wrap">
                  {f.slots.map((slot, si) => (
                    <span
                      key={si}
                      className="text-[10px] font-bold px-2 py-0.5 rounded-full"
                      style={posBadgeStyle(slot)}
                    >
                      {slot}
                    </span>
                  ))}
                </div>
              </div>
              <span className="text-lg" style={{ color: "var(--text-muted)" }}>›</span>
            </motion.button>
          ))}
        </div>
      </div>
    </div>
  );
}
