"use client";

import { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Player, Position, TeamYearMeta } from "@/lib/types";
import { getPositionPenalty } from "@/lib/formations";

interface Props {
  slotIndex: number;
  slotPosition: Position;
  slotLabel: string;
  wildcardAvailable: boolean;
  expertMode: boolean;
  onPick: (player: Player, meta: TeamYearMeta) => void;
  onWildcard: () => void;
}

type Phase = "spinning" | "players";

const POS_COLORS: Record<Position, string> = {
  GK: "text-yellow-400",
  DEF: "text-blue-400",
  MID: "text-purple-400",
  FWD: "text-[#22c55e]",
};

export default function SpinReveal({
  slotIndex,
  slotPosition,
  slotLabel,
  wildcardAvailable,
  expertMode,
  onPick,
  onWildcard,
}: Props) {
  const [phase, setPhase] = useState<Phase>("spinning");
  const [meta, setMeta] = useState<TeamYearMeta | null>(null);
  const [players, setPlayers] = useState<Player[]>([]);
  const [isDark, setIsDark] = useState(false);
  const [reelItems, setReelItems] = useState<string[]>([]);
  const triggered = useRef(false);

  useEffect(() => {
    if (triggered.current) return;
    triggered.current = true;
    runSpin();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function runSpin() {
    // Build reel of random nation names for visual
    const { loadSpinPool, weightedSpin, loadSquad, isDarkHorse } = await import("@/lib/spinPool");
    const pool = await loadSpinPool();

    // 8 decoy items + the real pick at the end
    const reel = Array.from({ length: 8 }, () => {
      const t = pool[Math.floor(Math.random() * pool.length)];
      return `${t.flag} ${t.team} ${t.year}`;
    });

    const picked = weightedSpin(pool);
    reel.push(`${picked.flag} ${picked.team} ${picked.year}`);
    setReelItems(reel);

    // After animation (1.5s) load players
    setTimeout(async () => {
      const squad = await loadSquad(picked.key);
      if (!squad) return;

      const eligible = (squad.players as Player[])
        .filter((p) => {
          const penalty = getPositionPenalty(p.position, slotPosition);
          return penalty < 15 || slotPosition === "FWD"; // allow 1-step OOP
        })
        .map((p) => ({
          ...p,
          _penalty: getPositionPenalty(p.position, slotPosition),
        }))
        .sort((a: Player & { _penalty: number }, b: Player & { _penalty: number }) => {
          if (a._penalty !== b._penalty) return a._penalty - b._penalty;
          return b.overall - a.overall;
        })
        .slice(0, 6);

      setMeta(picked);
      setPlayers(eligible);
      setIsDark(isDarkHorse(picked));
      if (typeof navigator !== "undefined" && "vibrate" in navigator) {
        navigator.vibrate(40);
      }
      setPhase("players");
    }, 1600);
  }

  return (
    <div className="flex flex-col min-h-dvh px-4 pb-8">
      {/* Slot indicator */}
      <div className="pt-6 pb-4">
        <div className="flex items-center gap-2">
          <span
            className={`text-xs font-bold uppercase tracking-widest ${POS_COLORS[slotPosition]}`}
          >
            {slotPosition}
          </span>
          <span className="text-[#888] text-xs">·</span>
          <span className="text-[#888] text-xs">Slot {slotIndex + 1} of 5</span>
        </div>
        <h2 className="text-2xl font-black text-white mt-1">
          Pick Your {slotLabel}
        </h2>
      </div>

      {phase === "spinning" && (
        <div className="flex-1 flex flex-col items-center justify-center gap-6">
          {/* Slot reel */}
          <div className="w-full max-w-[320px] h-[72px] rounded-2xl border border-[#2a2a2a] bg-[#1a1a1a] overflow-hidden relative">
            <div className="absolute inset-0 flex items-center justify-center">
              <motion.div
                className="flex flex-col items-center"
                animate={
                  reelItems.length
                    ? { y: [0, -(reelItems.length - 1) * 72] }
                    : {}
                }
                transition={{
                  duration: 1.5,
                  ease: [0.16, 1, 0.3, 1],
                }}
              >
                {reelItems.map((item, i) => (
                  <div
                    key={i}
                    className="h-[72px] flex items-center justify-center text-xl font-bold text-white whitespace-nowrap px-4"
                  >
                    {item}
                  </div>
                ))}
              </motion.div>
            </div>
            {/* Fade edges */}
            <div className="absolute inset-x-0 top-0 h-6 bg-gradient-to-b from-[#1a1a1a] to-transparent pointer-events-none" />
            <div className="absolute inset-x-0 bottom-0 h-6 bg-gradient-to-t from-[#1a1a1a] to-transparent pointer-events-none" />
          </div>

          <p className="text-[#888] text-sm animate-pulse">
            Spinning the draw...
          </p>
        </div>
      )}

      {phase === "players" && meta && (
        <AnimatePresence>
          <div className="flex-1 flex flex-col gap-3">
            {/* Nation reveal */}
            <motion.div
              className="flex items-center gap-3 rounded-2xl border border-[#2a2a2a] bg-[#1a1a1a] p-4"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
            >
              <span className="text-4xl">{meta.flag}</span>
              <div>
                <div className="flex items-center gap-2">
                  <p className="text-white font-black text-xl">
                    {meta.team} {meta.year}
                  </p>
                  {isDark && (
                    <span className="text-xs bg-orange-500/20 text-orange-400 px-2 py-0.5 rounded-full font-semibold">
                      🐴 Dark Horse
                    </span>
                  )}
                </div>
                <p className="text-[#888] text-xs capitalize">{meta.tier.replace("_", " ")}</p>
              </div>
            </motion.div>

            {/* Player list */}
            <p className="text-[11px] text-[#888] uppercase tracking-widest px-1">
              Eligible players
            </p>

            {players.map((player, i) => {
              const penalty = getPositionPenalty(player.position, slotPosition);
              const effectiveRating = Math.round(
                player.overall * (1 - penalty / 100)
              );
              return (
                <motion.button
                  key={player.id}
                  className="w-full text-left rounded-2xl border border-[#2a2a2a] bg-[#1a1a1a] p-4 flex items-center gap-3"
                  initial={{ opacity: 0, x: -16 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.07 }}
                  whileTap={{ scale: 0.97 }}
                  onClick={() => onPick(player, meta)}
                >
                  <div
                    className={`w-10 h-10 rounded-xl flex items-center justify-center font-black text-sm flex-shrink-0 ${
                      player.position === "GK"
                        ? "bg-yellow-500/20 text-yellow-400"
                        : player.position === "DEF"
                        ? "bg-blue-500/20 text-blue-400"
                        : player.position === "MID"
                        ? "bg-purple-500/20 text-purple-400"
                        : "bg-[#22c55e]/20 text-[#22c55e]"
                    }`}
                  >
                    {player.position}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-white font-bold text-sm truncate">
                      {player.name}
                    </p>
                    <p className="text-[#888] text-xs">
                      Age {player.age_at_tournament}
                      {penalty > 0 && (
                        <span className="text-orange-400 ml-1">
                          · -{penalty}% OOP
                        </span>
                      )}
                    </p>
                  </div>
                  {!expertMode && (
                    <div className="text-right flex-shrink-0">
                      <p className="text-[#22c55e] font-black text-lg">
                        {effectiveRating}
                      </p>
                      {penalty > 0 && (
                        <p className="text-[#888] text-[10px] line-through">
                          {player.overall}
                        </p>
                      )}
                    </div>
                  )}
                </motion.button>
              );
            })}

            {/* Wildcard */}
            {wildcardAvailable && (
              <motion.button
                className="w-full rounded-2xl border border-dashed border-[#888]/40 p-3 flex items-center justify-center gap-2 text-[#888] text-sm"
                onClick={onWildcard}
                whileTap={{ scale: 0.97 }}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.5 }}
              >
                <span>🃏</span>
                <span>Use Wildcard — re-spin this slot</span>
              </motion.button>
            )}
          </div>
        </AnimatePresence>
      )}
    </div>
  );
}
