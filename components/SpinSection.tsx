"use client";

import { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { DraftedPlayer, Player, Position, Squad, TeamYearMeta } from "@/lib/types";
import { getPositionPenalty } from "@/lib/formations";
import { loadSpinPool, weightedSpin, loadSquad } from "@/lib/spinPool";

interface OpenSlot { index: number; position: Position }
interface EraFilter { minYear: number; maxYear: number }

interface Props {
  turnNumber: number;
  isActive: boolean;
  isDone: boolean;
  draftedPlayer: DraftedPlayer | null;
  openSlots: OpenSlot[];
  wildcardAvailable: boolean;
  eraFilter: EraFilter;
  usedTeamKeys: string[];
  onPick: (player: Player, meta: TeamYearMeta, slotIndex: number) => void;
  onWildcard: () => void;
  onTeamSpun: (key: string) => void;
}

type SpinPhase = "idle" | "spinning" | "landed" | "revealed" | "done";

// Fallback decoys used only before the pool is cached (very first spin)
const FALLBACK_DECOYS = [
  "🇧🇷 Brazil '02", "🇩🇪 Germany '14", "🇪🇸 Spain '10", "🇫🇷 France '98", "🇦🇷 Argentina '86",
  "🇮🇹 Italy '06", "🇳🇱 Netherlands '74", "🏴󠁧󠁢󠁥󠁮󠁧󠁿 England '66", "🇵🇹 Portugal '06", "🇧🇪 Belgium '18",
  "🇭🇷 Croatia '18", "🇺🇾 Uruguay '70", "🇲🇦 Morocco '22", "🇸🇳 Senegal '02", "🇨🇲 Cameroon '90",
  "🇰🇷 South Korea '02", "🇺🇸 USA '02", "🇲🇽 Mexico '06", "🇨🇴 Colombia '14", "🇸🇪 Sweden '94",
  "🇩🇰 Denmark '02", "🇵🇱 Poland '74",
];

// Returns inline style for a position badge (FIFA palette)
function posBadgeStyle(pos: Position): React.CSSProperties {
  const key = pos.toLowerCase();
  return { backgroundColor: `var(--pos-${key})`, color: `var(--pos-${key}-fg)` };
}

function getBestSlot(player: Player, openSlots: OpenSlot[]): { slot: OpenSlot; penalty: number } | null {
  const candidates = openSlots
    .map((s) => ({ slot: s, penalty: getPositionPenalty(player.position, s.position) }))
    .filter((c) => c.penalty < 15)
    .sort((a, b) => a.penalty - b.penalty);
  return candidates[0] ?? null;
}

export default function SpinSection({
  turnNumber, isActive, isDone, draftedPlayer, openSlots,
  wildcardAvailable, eraFilter, usedTeamKeys, onPick, onWildcard, onTeamSpun,
}: Props) {
  const [spinPhase, setSpinPhase] = useState<SpinPhase>("idle");
  const [decoyLabel, setDecoyLabel] = useState(FALLBACK_DECOYS[0]);
  const [meta, setMeta]   = useState<TeamYearMeta | null>(null);
  const [squad, setSquad] = useState<Squad | null>(null);
  const [loadError, setLoadError] = useState(false);
  const sectionRef  = useRef<HTMLDivElement>(null);
  const timersRef   = useRef<ReturnType<typeof setTimeout>[]>([]);

  useEffect(() => {
    if (isActive && spinPhase === "idle" && sectionRef.current) {
      setTimeout(() => sectionRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }), 200);
    }
  }, [isActive, spinPhase]);

  useEffect(() => () => { timersRef.current.forEach(clearTimeout); }, []);

  async function handleSpin() {
    if (!isActive || spinPhase !== "idle") return;
    setSpinPhase("spinning");
    setLoadError(false);

    let pickedMeta: TeamYearMeta | null = null;
    let loadedSquad: Squad | null = null;
    let loadDone = false;
    // Will be replaced with era-filtered labels as soon as the pool loads (usually instant after first spin)
    let decoyLabels: string[] = FALLBACK_DECOYS;

    const doLoad = async () => {
      try {
        const fullPool = await loadSpinPool();
        // Filter by era, then exclude already-spun teams
        const eraPool = fullPool.filter((t) => t.year >= eraFilter.minYear && t.year <= eraFilter.maxYear);
        const basePool = eraPool.length ? eraPool : fullPool;
        // Build era-appropriate decoy labels so the animation only shows in-era teams
        decoyLabels = basePool.map((t) => `${t.flag} ${t.team} '${String(t.year).slice(2)}`);
        const freshPool = basePool.filter((t) => !usedTeamKeys.includes(t.key));
        pickedMeta  = weightedSpin(freshPool.length ? freshPool : basePool);
        loadedSquad = await loadSquad(pickedMeta.key);
        loadDone = true;
      } catch {
        loadDone = true;
        setLoadError(true);
      }
    };
    doLoad();

    const delays = [0, 55, 70, 80, 90, 100, 115, 140, 175, 220];
    let cumulative = 0;
    timersRef.current.forEach(clearTimeout);
    timersRef.current = [];

    delays.forEach((d, i) => {
      cumulative += d;
      const t = setTimeout(() => {
        if (i < delays.length - 1) {
          // decoyLabels is era-filtered as soon as doLoad resolves (almost always before first timer fires)
          setDecoyLabel(decoyLabels[Math.floor(Math.random() * decoyLabels.length)]);
        } else {
          const land = () => {
            if (loadDone && pickedMeta && loadedSquad) {
              setMeta(pickedMeta);
              setSquad(loadedSquad);
              setSpinPhase("landed");
              onTeamSpun(pickedMeta.key); // mark this team as used
              timersRef.current.push(setTimeout(() => setSpinPhase("revealed"), 650));
            } else if (loadDone) {
              setSpinPhase("idle");
              setLoadError(true);
            } else {
              timersRef.current.push(setTimeout(land, 100));
            }
          };
          land();
        }
      }, cumulative);
      timersRef.current.push(t);
    });
  }

  function handlePlayerPick(player: Player) {
    if (!meta) return;
    const best = getBestSlot(player, openSlots);
    if (!best) return;
    onPick(player, meta, best.slot.index);
  }

  function handleWildcard() {
    timersRef.current.forEach(clearTimeout);
    timersRef.current = [];
    setSpinPhase("idle");
    setMeta(null);
    setSquad(null);
    onWildcard();
  }

  const tierBadge =
    meta?.tier === "dark_horse"
      ? { text: "DARK HORSE", style: { backgroundColor: "rgba(168,85,247,0.2)", color: "#c084fc", border: "1px solid rgba(168,85,247,0.3)" } }
      : meta?.tier === "powerhouse"
      ? { text: "POWERHOUSE", style: { backgroundColor: "rgba(234,179,8,0.2)", color: "#facc15", border: "1px solid rgba(234,179,8,0.3)" } }
      : { text: "STRONG", style: { backgroundColor: "var(--accent-20)", color: "var(--accent)", border: "1px solid var(--accent-border)" } };

  function tierStyleForMeta(tier?: string) {
    if (tier === "dark_horse") return { backgroundColor: "rgba(168,85,247,0.2)", color: "#c084fc", border: "1px solid rgba(168,85,247,0.3)" };
    if (tier === "powerhouse") return { backgroundColor: "rgba(234,179,8,0.2)", color: "#facc15", border: "1px solid rgba(234,179,8,0.3)" };
    return { backgroundColor: "var(--accent-20)", color: "var(--accent)", border: "1px solid var(--accent-border)" };
  }

  return (
    <div ref={sectionRef} className="scroll-mt-16">
      <AnimatePresence mode="wait">
        {/* DONE */}
        {isDone && draftedPlayer && (
          <motion.div
            key="done"
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            className="rounded-2xl p-3 mb-3 overflow-hidden"
            style={{ border: "1px solid var(--border)", backgroundColor: "var(--bg-card)" }}
          >
            <div className="flex items-center gap-3">
              <div className="text-2xl">{draftedPlayer.flag}</div>
              <div className="flex-1 min-w-0">
                <p className="font-bold text-sm truncate" style={{ color: "var(--text)" }}>{draftedPlayer.player.name}</p>
                <p className="text-xs" style={{ color: "var(--text-muted)" }}>
                  {draftedPlayer.team} {draftedPlayer.year}
                </p>
              </div>
              <span
                className="text-[10px] font-black px-2 py-0.5 rounded-full"
                style={posBadgeStyle(draftedPlayer.player.position)}
              >
                {draftedPlayer.player.position}
              </span>
              <span className="font-black text-sm ml-1" style={{ color: "var(--text)" }}>{draftedPlayer.player.overall}</span>
            </div>
            {draftedPlayer.penaltyPercent > 0 && (
              <p className="text-amber-400 text-[10px] mt-1.5 font-medium">
                ⚠ OOP -{draftedPlayer.penaltyPercent}% ({draftedPlayer.player.position} in {draftedPlayer.player.position} role)
              </p>
            )}
          </motion.div>
        )}

        {/* ACTIVE */}
        {!isDone && isActive && (
          <motion.div
            key="active"
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            className="rounded-2xl mb-3 overflow-hidden"
            style={{ border: "1px solid var(--border)", backgroundColor: "var(--bg-card)" }}
          >
            {/* Header */}
            <div className="flex items-center justify-between px-4 pt-4 pb-2">
              <div>
                <p className="text-[10px] uppercase tracking-widest" style={{ color: "var(--text-muted)" }}>
                  Pick {turnNumber} of 5
                </p>
                <p className="font-black text-base" style={{ color: "var(--text)" }}>
                  Open:{" "}
                  {openSlots.map((s) => (
                    <span
                      key={s.index}
                      className="inline-block text-[10px] font-black px-1.5 py-0.5 rounded mr-1"
                      style={posBadgeStyle(s.position)}
                    >
                      {s.position}
                    </span>
                  ))}
                </p>
              </div>
            </div>

            {/* IDLE */}
            {spinPhase === "idle" && (
              <div className="px-4 pb-4">
                {loadError && <p className="text-red-400 text-xs mb-2">Failed to load team. Try again.</p>}
                <motion.button
                  onClick={handleSpin}
                  whileTap={{ scale: 0.96 }}
                  className="w-full font-black text-base rounded-2xl py-3 tracking-widest"
                  style={{ backgroundColor: "#00C038", color: "#000" }}
                >
                  SPIN
                </motion.button>
              </div>
            )}

            {/* SPINNING */}
            {spinPhase === "spinning" && (
              <div className="px-4 pb-6 flex flex-col items-center gap-3">
                <motion.div
                  key={decoyLabel}
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.07 }}
                  className="text-center"
                >
                  <p className="text-xl font-black tracking-tight leading-none" style={{ color: "var(--text)" }}>
                    {decoyLabel}
                  </p>
                </motion.div>
                <div className="flex gap-1">
                  {[0, 1, 2].map((i) => (
                    <div
                      key={i}
                      className="w-1.5 h-1.5 rounded-full animate-bounce"
                      style={{ backgroundColor: "var(--accent)", animationDelay: `${i * 0.15}s` }}
                    />
                  ))}
                </div>
              </div>
            )}

            {/* LANDED */}
            {spinPhase === "landed" && meta && (
              <motion.div
                initial={{ opacity: 0, scale: 0.85 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ type: "spring", stiffness: 300, damping: 22 }}
                className="px-4 pb-6 flex flex-col items-center gap-2 text-center"
              >
                <span className="text-6xl">{meta.flag}</span>
                <p className="font-black text-3xl leading-tight" style={{ color: "var(--text)" }}>{meta.team}</p>
                <p className="font-black text-2xl" style={{ color: "var(--accent)" }}>{meta.year}</p>
                <span
                  className="text-[10px] font-black px-2 py-0.5 rounded-full mt-1"
                  style={tierStyleForMeta(meta.tier)}
                >
                  {meta.tier === "dark_horse" ? "DARK HORSE" : meta.tier === "powerhouse" ? "POWERHOUSE" : "STRONG"}
                </span>
              </motion.div>
            )}

            {/* REVEALED */}
            {spinPhase === "revealed" && meta && squad && (
              <div className="pb-4">
                {/* Team banner */}
                <div className="flex items-center gap-3 px-4 pb-3" style={{ borderBottom: "1px solid var(--border)" }}>
                  <span className="text-4xl">{meta.flag}</span>
                  <div>
                    <p className="font-black text-lg leading-tight" style={{ color: "var(--text)" }}>{meta.team}</p>
                    <p className="text-xs" style={{ color: "var(--text-muted)" }}>{meta.year} · The Cup</p>
                  </div>
                  <span
                    className="ml-auto text-[9px] font-black px-2 py-0.5 rounded-full"
                    style={tierBadge.style}
                  >
                    {tierBadge.text}
                  </span>
                </div>

                {/* Wildcard — above the player grid so it's always visible */}
                {wildcardAvailable && (
                  <div className="px-4 pt-3">
                    <button
                      onClick={handleWildcard}
                      className="w-full border-dashed font-bold rounded-xl py-2.5 text-xs transition-colors"
                      style={{ border: "1px dashed var(--border-mid)", color: "var(--text-muted)" }}
                      onMouseOver={(e) => {
                        e.currentTarget.style.borderColor = "var(--accent)";
                        e.currentTarget.style.color = "var(--accent)";
                      }}
                      onMouseOut={(e) => {
                        e.currentTarget.style.borderColor = "var(--border-mid)";
                        e.currentTarget.style.color = "var(--text-muted)";
                      }}
                    >
                      🃏 Use Wildcard — Re-spin this pick
                    </button>
                  </div>
                )}

                {/* Player grid — sorted by overall, ineligible greyed out */}
                <div className="px-4 pt-3 grid grid-cols-2 gap-2">
                  {squad.players
                    .map((player) => ({ player, best: getBestSlot(player, openSlots) }))
                    .sort((a, b) => b.player.overall - a.player.overall)
                    .map(({ player, best }) => {
                      const eligible = !!best;
                      return eligible ? (
                        <motion.button
                          key={player.id}
                          onClick={() => handlePlayerPick(player)}
                          whileTap={{ scale: 0.96 }}
                          className="text-left p-2.5 rounded-xl transition-all"
                          style={{ border: "1px solid var(--border)", backgroundColor: "var(--bg-hover)" }}
                        >
                          <div className="flex items-start justify-between gap-1 mb-1">
                            <span
                              className="text-[9px] font-black px-1.5 py-0.5 rounded"
                              style={posBadgeStyle(player.position)}
                            >
                              {player.position}
                            </span>
                            <span className="font-black text-sm" style={{ color: "var(--text)" }}>{player.overall}</span>
                          </div>
                          <p className="text-xs font-semibold leading-tight" style={{ color: "var(--text)" }}>{player.name}</p>
                          {best.penalty > 0 ? (
                            <p className="text-amber-400 text-[9px] mt-0.5 font-medium">OOP -{best.penalty}%</p>
                          ) : (
                            <p className="text-[9px] mt-0.5 font-medium" style={{ color: "var(--accent)" }}>
                              Fits {best.slot.position} ✓
                            </p>
                          )}
                        </motion.button>
                      ) : (
                        <div
                          key={player.id}
                          className="text-left p-2.5 rounded-xl opacity-35 cursor-not-allowed"
                          style={{ border: "1px solid var(--border-subtle)", backgroundColor: "var(--bg-surface)" }}
                        >
                          <div className="flex items-start justify-between gap-1 mb-1">
                            <span
                              className="text-[9px] font-black px-1.5 py-0.5 rounded"
                              style={{ backgroundColor: "var(--border)", color: "var(--text-dim)" }}
                            >
                              {player.position}
                            </span>
                            <span className="font-black text-sm" style={{ color: "var(--text-dim)" }}>{player.overall}</span>
                          </div>
                          <p className="text-xs font-semibold leading-tight" style={{ color: "var(--text-dim)" }}>{player.name}</p>
                          <p className="text-[9px] mt-0.5 font-medium" style={{ color: "var(--text-dimmer)" }}>Not needed</p>
                        </div>
                      );
                    })}
                </div>

              </div>
            )}
          </motion.div>
        )}

        {/* LOCKED */}
        {!isDone && !isActive && (
          <motion.div
            key="locked"
            className="rounded-2xl p-4 mb-3 flex items-center gap-3"
            style={{ border: "1px solid var(--border-subtle)", backgroundColor: "var(--bg-surface)" }}
          >
            <div
              className="w-8 h-8 rounded-full border-2 border-dashed flex items-center justify-center"
              style={{ borderColor: "var(--border)" }}
            >
              <span className="text-xs font-black" style={{ color: "var(--text-dimmer)" }}>{turnNumber}</span>
            </div>
            <p className="text-sm font-semibold" style={{ color: "var(--text-dimmer)" }}>Pick {turnNumber} — locked</p>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
