"use client";

import { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { MatchResult, TournamentResult } from "@/lib/types";

interface Props {
  result: TournamentResult;
  onComplete: () => void;
}

const STAGE_ORDER = ["group", "r32", "r16", "qf", "sf", "final"];
const STAGE_LABELS: Record<string, string> = {
  group: "Group Stage",
  r32: "Round of 32",
  r16: "Round of 16",
  qf: "Quarter-Final",
  sf: "Semi-Final",
  final: "The Final",
};

export default function TournamentSim({ result, onComplete }: Props) {
  const [visibleMatches, setVisibleMatches] = useState<MatchResult[]>([]);
  const [done, setDone] = useState(false);
  const [showChampion, setShowChampion] = useState(false);
  const timersRef = useRef<ReturnType<typeof setTimeout>[]>([]);

  useEffect(() => {
    // Reset on each effect run (handles StrictMode double-invoke correctly)
    setVisibleMatches([]);
    setDone(false);
    setShowChampion(false);
    timersRef.current.forEach(clearTimeout);
    timersRef.current = [];

    let delay = 0;
    const sorted = [...result.matches].sort(
      (a, b) => STAGE_ORDER.indexOf(a.stage) - STAGE_ORDER.indexOf(b.stage)
    );

    sorted.forEach((match, i) => {
      const t = setTimeout(() => {
        setVisibleMatches((prev) => [...prev, match]);
        if (i === sorted.length - 1) {
          const t2 = setTimeout(() => {
            setDone(true);
            if (result.champion) {
              setShowChampion(true);
              if (typeof navigator !== "undefined" && "vibrate" in navigator) {
                navigator.vibrate([100, 50, 200, 50, 300]);
              }
              const t3 = setTimeout(onComplete, 4000);
              timersRef.current.push(t3);
            } else {
              if (typeof navigator !== "undefined" && "vibrate" in navigator) {
                navigator.vibrate([200, 100, 200]);
              }
            }
          }, 600);
          timersRef.current.push(t2);
        }
      }, delay);
      timersRef.current.push(t);
      delay += i < 3 ? 800 : 1000;
    });

    return () => {
      timersRef.current.forEach(clearTimeout);
      timersRef.current = [];
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="flex flex-col min-h-dvh px-4 pb-8">
      <div className="pt-6 pb-4">
        <p className="text-[11px] text-[#888] uppercase tracking-widest mb-1">
          Ultimate 5
        </p>
        <h2 className="text-2xl font-black text-white">The Tournament</h2>
      </div>

      {/* Group stage summary */}
      <AnimatePresence>
        {visibleMatches.length > 0 && (
          <motion.div
            className="mb-3"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
          >
            <p className="text-[11px] text-[#888] uppercase tracking-widest px-1 mb-2">
              {STAGE_LABELS["group"]}
            </p>
            {visibleMatches
              .filter((m) => m.stage === "group")
              .map((m, i) => (
                <MatchCard key={i} match={m} />
              ))}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Knockout rounds */}
      {STAGE_ORDER.slice(1).map((stage) => {
        const matches = visibleMatches.filter((m) => m.stage === stage);
        if (!matches.length) return null;
        return (
          <motion.div key={stage} className="mb-3" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
            <p className="text-[11px] text-[#888] uppercase tracking-widest px-1 mb-2">
              {STAGE_LABELS[stage]}
            </p>
            {matches.map((m, i) => (
              <MatchCard key={i} match={m} />
            ))}
          </motion.div>
        );
      })}

      {/* Special moments */}
      {done && result.hatTrickHero && (
        <motion.div
          className="rounded-2xl border border-yellow-500/30 bg-yellow-500/10 p-3 mb-3 text-center"
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ type: "spring", bounce: 0.5 }}
        >
          <p className="text-yellow-400 font-bold text-sm">
            🎩 Hat-trick Hero!
          </p>
          <p className="text-[#888] text-xs mt-0.5">
            {result.hatTrickHero} scored a hat-trick in a single match
          </p>
        </motion.div>
      )}

      {done && result.goldenBoot && (
        <motion.div
          className="rounded-2xl border border-[#22c55e]/30 bg-[#22c55e]/10 p-3 mb-3 text-center"
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ type: "spring", bounce: 0.5, delay: 0.2 }}
        >
          <p className="text-[#22c55e] font-bold text-sm">
            🥾 Golden Boot!
          </p>
          <p className="text-[#888] text-xs mt-0.5">
            {result.topScorer} top-scored with {result.topScorerGoals} goals
          </p>
        </motion.div>
      )}

      {/* Champion overlay */}
      {showChampion && (
        <motion.div
          className="fixed inset-0 bg-[#0f0f0f]/80 flex items-center justify-center z-50"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
        >
          <motion.div
            className="text-center p-8"
            initial={{ scale: 0.5, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ type: "spring", bounce: 0.4, delay: 0.1 }}
          >
            <div className="text-8xl mb-4">🏆</div>
            <p className="text-[#22c55e] font-black text-3xl">CHAMPIONS!</p>
            <p className="text-white text-lg mt-2">Your Dream Team won The Cup!</p>
          </motion.div>
        </motion.div>
      )}

      {/* Loading indicator while still running */}
      {!done && (
        <div className="flex items-center gap-2 mt-4 px-1">
          <div className="w-2 h-2 rounded-full bg-[#22c55e] animate-bounce" />
          <div className="w-2 h-2 rounded-full bg-[#22c55e] animate-bounce [animation-delay:0.15s]" />
          <div className="w-2 h-2 rounded-full bg-[#22c55e] animate-bounce [animation-delay:0.3s]" />
          <span className="text-[#888] text-xs ml-1">Simulating...</span>
        </div>
      )}

      {/* See results CTA — shown when eliminated and done */}
      {done && !result.champion && (
        <motion.button
          className="bg-[#22c55e] text-black font-black text-lg rounded-2xl py-4 w-full mt-4"
          onClick={onComplete}
          whileTap={{ scale: 0.97 }}
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
        >
          See Your Results →
        </motion.button>
      )}
    </div>
  );
}

function MatchCard({ match }: { match: MatchResult }) {
  const isWin = match.outcome === "win" || match.outcome === "pen_win";
  const isLoss = match.outcome === "loss" || match.outcome === "pen_loss";

  return (
    <motion.div
      className="rounded-xl border border-[#2a2a2a] bg-[#1a1a1a] p-3 mb-2"
      initial={{ opacity: 0, x: -16 }}
      animate={{ opacity: 1, x: 0 }}
    >
      <div className="flex items-center justify-between mb-1.5">
        <div className="flex items-center gap-2">
          <span
            className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
              isWin
                ? "bg-[#22c55e]/20 text-[#22c55e]"
                : isLoss
                ? "bg-red-500/20 text-red-400"
                : "bg-[#888]/20 text-[#888]"
            }`}
          >
            {isWin ? "WIN" : isLoss ? "OUT" : "DRAW"}
          </span>
          <span className="text-white font-bold text-sm">
            vs {match.opponentFlag} {match.opponent}
          </span>
        </div>
        <span
          className={`font-black text-sm ${
            isWin ? "text-[#22c55e]" : isLoss ? "text-red-400" : "text-[#888]"
          }`}
        >
          {match.goalsFor}–{match.goalsAgainst}
          {match.penalties && " (pen)"}
        </span>
      </div>
      <p className="text-[#888] text-xs leading-relaxed">{match.headline}</p>
    </motion.div>
  );
}
