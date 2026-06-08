"use client";

import { motion } from "framer-motion";
import { TeamStats } from "@/lib/types";

interface Props {
  stats: TeamStats;
  overall?: number;
  animate?: boolean;
}

// FIFA WC26 palette via CSS variables (mirrors position colours)
const BARS: { key: keyof TeamStats; label: string; colorVar: string }[] = [
  { key: "attack",      label: "ATT", colorVar: "var(--pos-fwd)" },
  { key: "midfield",    label: "MID", colorVar: "var(--pos-mid)" },
  { key: "defence",     label: "DEF", colorVar: "var(--pos-def)" },
  { key: "goalkeeping", label: "GK",  colorVar: "var(--pos-gk)"  },
];

export default function StatsBar({ stats, overall, animate = true }: Props) {
  return (
    <div className="rounded-2xl px-4 py-3" style={{ backgroundColor: "var(--bg-surface)" }}>
      {overall != null && (
        <div
          className="flex items-center justify-between mb-2.5 pb-2.5"
          style={{ borderBottom: "1px solid var(--border-subtle)" }}
        >
          <span className="text-[10px] font-bold uppercase tracking-widest" style={{ color: "var(--text-muted)" }}>
            Overall
          </span>
          <span className="font-black text-lg leading-none" style={{ color: "var(--text)" }}>{overall}</span>
        </div>
      )}
      <div className="grid grid-cols-4 gap-2">
        {BARS.map(({ key, label, colorVar }) => {
          const val = stats[key];
          const pct = Math.max(0, Math.min(100, val));
          return (
            <div key={key} className="flex flex-col gap-1">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold" style={{ color: colorVar }}>{label}</span>
                <span className="text-[10px] font-black" style={{ color: "var(--text)" }}>{val || "–"}</span>
              </div>
              <div className="h-1.5 rounded-full overflow-hidden" style={{ backgroundColor: "var(--border)" }}>
                <motion.div
                  className="h-full rounded-full"
                  style={{ backgroundColor: colorVar }}
                  initial={{ width: 0 }}
                  animate={{ width: animate ? `${pct}%` : `${pct}%` }}
                  transition={{ duration: 0.6, ease: "easeOut" }}
                />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
