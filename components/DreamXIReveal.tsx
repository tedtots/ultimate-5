"use client";

import { motion } from "framer-motion";
import { DraftedPlayer, Formation, SpecialMoments, TeamStats } from "@/lib/types";

interface Props {
  formation: Formation;
  players: DraftedPlayer[];
  stats: TeamStats;
  moments: SpecialMoments;
  expertMode: boolean;
  onSimulate: () => void;
}

const STAT_COLORS = ["text-[#22c55e]", "text-purple-400", "text-blue-400", "text-yellow-400"];

export default function DreamXIReveal({
  formation,
  players,
  stats,
  moments,
  expertMode,
  onSimulate,
}: Props) {
  const sortedPlayers = [...players].sort((a, b) => a.slotIndex - b.slotIndex);

  const statBars = [
    { label: "Attack", value: stats.attack },
    { label: "Midfield", value: stats.midfield },
    { label: "Defence", value: stats.defence },
    { label: "Goalkeeping", value: stats.goalkeeping },
  ];

  return (
    <div className="flex flex-col min-h-dvh px-4 pb-8">
      <div className="pt-6 pb-4">
        <p className="text-[11px] text-[#888] uppercase tracking-widest mb-1">
          Your Dream Team
        </p>
        <h2 className="text-2xl font-black text-white">{formation.name}</h2>
      </div>

      {/* Special badges */}
      <div className="flex flex-wrap gap-2 mb-4">
        {moments.impossibleXI && (
          <motion.span
            className="text-xs font-bold px-3 py-1.5 rounded-full bg-gradient-to-r from-purple-500/20 to-[#22c55e]/20 text-white border border-purple-500/30"
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ type: "spring", bounce: 0.5, delay: 0.5 }}
          >
            🌍 Impossible XI
          </motion.span>
        )}
        {moments.giantKilling && (
          <span className="text-xs font-bold px-3 py-1.5 rounded-full bg-orange-500/20 text-orange-400 border border-orange-500/30">
            🐘 Giant-Killing Squad
          </span>
        )}
      </div>

      {/* Player cards */}
      <div className="flex flex-col gap-2 mb-5">
        {sortedPlayers.map((dp, i) => {
          const effectiveRating = Math.round(
            dp.player.overall * (1 - dp.penaltyPercent / 100)
          );
          const isDarkHorsePick = moments.darkHorsePicks.includes(i);
          return (
            <motion.div
              key={dp.player.id}
              className="flex items-center gap-3 rounded-2xl border border-[#2a2a2a] bg-[#1a1a1a] p-3"
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.08 }}
            >
              <span className="text-2xl">{dp.flag}</span>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5">
                  <p className="text-white font-bold text-sm truncate">
                    {dp.player.name}
                  </p>
                  {isDarkHorsePick && (
                    <span className="text-[10px] text-orange-400">🐴</span>
                  )}
                </div>
                <p className="text-[#888] text-[11px]">
                  {dp.team} · {dp.year}
                </p>
              </div>
              <div className="text-right flex-shrink-0">
                <span
                  className={`text-[10px] font-bold px-1.5 py-0.5 rounded mr-1 ${
                    dp.player.position === "GK"
                      ? "bg-yellow-500/20 text-yellow-400"
                      : dp.player.position === "DEF"
                      ? "bg-blue-500/20 text-blue-400"
                      : dp.player.position === "MID"
                      ? "bg-purple-500/20 text-purple-400"
                      : "bg-[#22c55e]/20 text-[#22c55e]"
                  }`}
                >
                  {dp.player.position}
                </span>
                {!expertMode && (
                  <span className="text-[#22c55e] font-black text-base">
                    {effectiveRating}
                  </span>
                )}
              </div>
            </motion.div>
          );
        })}
      </div>

      {/* Team stats */}
      <motion.div
        className="rounded-2xl border border-[#2a2a2a] bg-[#1a1a1a] p-4 mb-5"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.5 }}
      >
        <p className="text-[11px] text-[#888] uppercase tracking-widest mb-3">
          Team Stats
        </p>
        <div className="grid grid-cols-2 gap-3">
          {statBars.map(({ label, value }, i) => (
            <div key={label}>
              <div className="flex justify-between items-baseline mb-1">
                <span className="text-[11px] text-[#888]">{label}</span>
                <span className={`font-black text-base ${STAT_COLORS[i]}`}>
                  {expertMode ? "??" : value}
                </span>
              </div>
              {!expertMode && (
                <div className="h-1.5 rounded-full bg-[#2a2a2a]">
                  <motion.div
                    className={`h-full rounded-full ${
                      i === 0
                        ? "bg-[#22c55e]"
                        : i === 1
                        ? "bg-purple-400"
                        : i === 2
                        ? "bg-blue-400"
                        : "bg-yellow-400"
                    }`}
                    initial={{ width: 0 }}
                    animate={{ width: `${Math.round((value / 99) * 100)}%` }}
                    transition={{ delay: 0.6 + i * 0.1, duration: 0.5 }}
                  />
                </div>
              )}
            </div>
          ))}
        </div>
      </motion.div>

      {/* CTA */}
      <motion.button
        className="bg-[#22c55e] text-black font-black text-lg rounded-2xl py-4 w-full mt-auto"
        onClick={onSimulate}
        whileTap={{ scale: 0.97 }}
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.7 }}
      >
        Enter The Cup →
      </motion.button>
    </div>
  );
}
