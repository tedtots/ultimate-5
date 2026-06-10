"use client";

import { useRef, useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  DraftedPlayer, Formation, MatchResult, Player,
  Position, SpecialMoments, TeamYearMeta, TournamentResult,
} from "@/lib/types";
import {
  computeTeamStats, detectSpecialMoments, runTournament,
  getGroupDraw, calculateWinOdds,
  type GroupDrawTeam, type WinOdds,
} from "@/lib/simulation";
import { getPositionPenalty } from "@/lib/formations";
import PitchView from "./PitchView";
import StatsBar from "./StatsBar";
import SpinSection from "./SpinSection";
import { ShareCard } from "./ShareCard";

interface EraFilter { minYear: number; maxYear: number }

interface Props {
  formation: Formation;
  teamName: string;
  eraFilter: EraFilter;
  streak: number;
  isDark: boolean;
  onToggleTheme: () => void;
  onNewGame: (champion: boolean) => void;
  onRestart: () => void;
}

type DraftPhase = "draft" | "complete" | "tournament" | "result";
interface OpenSlot { index: number; position: Position }

const STAGE_ORDER = ["group", "r32", "r16", "qf", "sf", "final"] as const;
const STAGE_LABELS: Record<string, string> = {
  group: "Group Stage", r32: "Round of 32", r16: "Round of 16",
  qf: "Quarter-Final", sf: "Semi-Final", final: "The Final",
};
const NEXT_STAGE_LABELS: Record<string, string> = {
  group: "Round of 32", r32: "Round of 16", r16: "Quarter-Final",
  qf: "Semi-Final", sf: "The Final",
};

// Position badge inline style using FIFA palette
function posBadgeStyle(pos: Position): React.CSSProperties {
  const key = pos.toLowerCase();
  return { backgroundColor: `var(--pos-${key})`, color: `var(--pos-${key}-fg)` };
}

// Slot circle style: filled = position colour, empty = dashed outline
function slotStyle(pos: Position, filled: boolean): React.CSSProperties {
  if (filled) {
    const key = pos.toLowerCase();
    return { backgroundColor: `var(--pos-${key})`, borderColor: `var(--pos-${key})`, color: `var(--pos-${key}-fg)` };
  }
  return { backgroundColor: "transparent", borderColor: "var(--border-mid)", color: "var(--text-dimmer)" };
}

// Win odds bar colours from FIFA palette
const ODDS_BARS = [
  { key: "pGroup" as const, label: "Progress from Groups", colorVar: "var(--pos-fwd)" },
  { key: "pQF"    as const, label: "Reach Quarter-Final",  colorVar: "var(--pos-mid)" },
  { key: "pSF"    as const, label: "Reach Semi-Final",     colorVar: "var(--pos-def)" },
  { key: "pWin"   as const, label: "Win The Cup",          colorVar: "var(--pos-gk)"  },
];

function survivedStage(result: TournamentResult, stage: string): boolean {
  if (result.champion) return true;
  return STAGE_ORDER.indexOf(result.stage as typeof STAGE_ORDER[number]) >
    STAGE_ORDER.indexOf(stage as typeof STAGE_ORDER[number]);
}

function opponentTier(attack: number): { label: string; style: React.CSSProperties } {
  if (attack >= 85) return {
    label: "POWERHOUSE",
    style: { backgroundColor: "rgba(234,179,8,0.2)", color: "#facc15", border: "1px solid rgba(234,179,8,0.3)" },
  };
  if (attack >= 74) return {
    label: "STRONG",
    style: { backgroundColor: "var(--accent-20)", color: "var(--accent)", border: "1px solid var(--accent-border)" },
  };
  return {
    label: "DARK HORSE",
    style: { backgroundColor: "rgba(168,85,247,0.2)", color: "#c084fc", border: "1px solid rgba(168,85,247,0.3)" },
  };
}

export default function DraftPage({
  formation, teamName, eraFilter, streak,
  isDark, onToggleTheme,
  onNewGame, onRestart,
}: Props) {
  // ── Draft state ──────────────────────────────────────────────
  const [draftPhase, setDraftPhase]     = useState<DraftPhase>("draft");
  const [filledSlots, setFilledSlots]   = useState<(DraftedPlayer | null)[]>([null, null, null, null, null]);
  const [pickedByTurn, setPickedByTurn] = useState<Record<number, DraftedPlayer>>({});
  const [spinTurn, setSpinTurn]         = useState(0);
  const [wildcardUsed, setWildcardUsed] = useState(false);
  const [moments, setMoments]           = useState<SpecialMoments | null>(null);
  const [usedTeamKeys, setUsedTeamKeys] = useState<string[]>([]);

  // ── Complete state ───────────────────────────────────────────
  const [simulationSeed, setSimulationSeed] = useState(0);
  const [groupDraw, setGroupDraw]           = useState<GroupDrawTeam[] | null>(null);
  const [winOdds, setWinOdds]               = useState<WinOdds | null>(null);

  // ── Tournament state ─────────────────────────────────────────
  const [tournamentResult, setTournamentResult]     = useState<TournamentResult | null>(null);
  const [visibleMatches, setVisibleMatches]         = useState<MatchResult[]>([]);
  const [currentRevealStage, setCurrentRevealStage] = useState<string | null>(null);
  const [stageAnimating, setStageAnimating]         = useState(false);
  const [stagePaused, setStagePaused]               = useState(false);
  const [showChampionBanner, setShowChampionBanner] = useState(false);

  // ── Share state ──────────────────────────────────────────────
  const [showShare, setShowShare]     = useState(false);
  const [savingImage, setSavingImage] = useState(false);
  const [copied, setCopied]           = useState(false);
  const shareCardRef = useRef<HTMLDivElement>(null);

  const tournamentRef  = useRef<HTMLDivElement>(null);
  const resultRef      = useRef<HTMLDivElement>(null);
  const continueRef    = useRef<HTMLDivElement>(null);
  const matchTimersRef = useRef<ReturnType<typeof setTimeout>[]>([]);

  const openSlots: OpenSlot[] = filledSlots
    .map((s, i) => (s ? null : { index: i, position: formation.slots[i] }))
    .filter(Boolean) as OpenSlot[];
  const allFilled = filledSlots.filter(Boolean).length === 5;
  const teamStats = computeTeamStats(filledSlots);

  // ── Handlers ────────────────────────────────────────────────

  function handlePick(player: Player, meta: TeamYearMeta, slotIndex: number) {
    const penalty = getPositionPenalty(player.position, formation.slots[slotIndex]);
    const dp: DraftedPlayer = {
      player, team: meta.team, year: meta.year, flag: meta.flag,
      slotIndex, penaltyPercent: penalty,
    };
    const newSlots = [...filledSlots];
    newSlots[slotIndex] = dp;
    setFilledSlots(newSlots);
    setPickedByTurn((prev) => ({ ...prev, [spinTurn]: dp }));
    setSpinTurn((t) => t + 1);

    if (newSlots.filter(Boolean).length === 5) {
      const emptyResult: TournamentResult = {
        matches: [], eliminated: false, stage: "group", champion: false,
        topScorer: "", topScorerGoals: 0, tournamentTopScorer: "",
        tournamentTopScorerGoals: 0, goldenBoot: false, hatTrickHero: null,
        playerTournamentStats: {}, goldenBootPlayer: "", playerOfTournament: "",
      };
      setMoments(detectSpecialMoments(newSlots, emptyResult, 75));
      const seed = Date.now();
      setSimulationSeed(seed);
      setGroupDraw(getGroupDraw(seed));
      setWinOdds(calculateWinOdds(computeTeamStats(newSlots), formation));
      setDraftPhase("complete");
    }
  }

  function handleWildcard() { setWildcardUsed(true); }

  function revealStage(stage: string, result: TournamentResult) {
    setCurrentRevealStage(stage);
    setStageAnimating(true);
    setStagePaused(false);

    const matches = result.matches.filter((m) => m.stage === stage);
    let delay = 400;
    matchTimersRef.current.forEach(clearTimeout);
    matchTimersRef.current = [];

    matches.forEach((match, i) => {
      const t = setTimeout(() => {
        setVisibleMatches((prev) => [...prev, match]);
        if (i === matches.length - 1) {
          const t2 = setTimeout(() => {
            setStageAnimating(false);
            if (!survivedStage(result, stage)) {
              const t3 = setTimeout(() => {
                setDraftPhase("result");
                setTimeout(() => resultRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }), 150);
              }, 1200);
              matchTimersRef.current.push(t3);
            } else if (stage === "final") {
              setShowChampionBanner(true);
              if (typeof navigator !== "undefined" && "vibrate" in navigator)
                navigator.vibrate([100, 50, 200, 50, 300]);
              const t3 = setTimeout(() => {
                setDraftPhase("result");
                setTimeout(() => resultRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }), 150);
              }, 3500);
              matchTimersRef.current.push(t3);
            } else {
              setStagePaused(true);
              setTimeout(() => continueRef.current?.scrollIntoView({ behavior: "smooth", block: "nearest" }), 100);
            }
          }, 700);
          matchTimersRef.current.push(t2);
        }
      }, delay);
      matchTimersRef.current.push(t);
      delay += 900;
    });
  }

  function handleKickOff() {
    const stats  = computeTeamStats(filledSlots);
    const result = runTournament(stats, formation, filledSlots, simulationSeed, teamName);
    const special = detectSpecialMoments(filledSlots, result, 75);
    setMoments(special);
    setTournamentResult(result);
    setDraftPhase("tournament");
    setTimeout(() => tournamentRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }), 300);
    revealStage("group", result);
  }

  function handleContinue() {
    if (!tournamentResult || !currentRevealStage || stageAnimating) return;
    const nextIdx = STAGE_ORDER.indexOf(currentRevealStage as typeof STAGE_ORDER[number]) + 1;
    const next = STAGE_ORDER[nextIdx];
    if (next) revealStage(next, tournamentResult);
  }

  // ── Share handlers ───────────────────────────────────────────

  const buildShareText = useCallback(() => {
    if (!tournamentResult) return "";
    const pStats = tournamentResult.playerTournamentStats;
    const maxGoals = Math.max(0, ...filledSlots.filter(Boolean).map((p) => pStats[p!.player.id]?.goals ?? 0));
    const stageLabel = STAGE_LABELS[tournamentResult.stage] ?? "the tournament";
    const line1 = tournamentResult.champion
      ? `🏆 ${teamName} just WON The Cup!`
      : `⚽ ${teamName} reached the ${stageLabel} of The Cup!`;
    return [
      line1,
      `🥇 Golden Boot: ${tournamentResult.goldenBootPlayer} (${maxGoals} goals)`,
      `🏆 Team MVP: ${tournamentResult.playerOfTournament}`,
      `Can you build a better team?`,
    ].join("\n");
  }, [tournamentResult, filledSlots, teamName]);

  function handleShareWhatsApp() {
    window.open(`https://wa.me/?text=${encodeURIComponent(buildShareText())}`, "_blank");
  }
  function handleShareX() {
    window.open(`https://twitter.com/intent/tweet?text=${encodeURIComponent(buildShareText())}`, "_blank");
  }
  async function handleCopy() {
    await navigator.clipboard.writeText(buildShareText());
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }
  async function handleSaveImage() {
    if (!shareCardRef.current) return;
    setSavingImage(true);
    try {
      const { toPng } = await import("html-to-image");
      const dataUrl = await toPng(shareCardRef.current, { pixelRatio: 2, cacheBust: true });
      const link = document.createElement("a");
      link.download = `${teamName.replace(/\s+/g, "-")}-world-cup.png`;
      link.href = dataUrl;
      link.click();
    } catch (e) {
      console.error("Image save failed:", e);
    } finally {
      setSavingImage(false);
    }
  }

  // ── Render ───────────────────────────────────────────────────
  return (
    <div className="min-h-dvh pb-24">

      {/* Sticky header */}
      <div
        className="sticky top-0 z-20 backdrop-blur px-4 py-3"
        style={{ backgroundColor: "var(--bg-page)", borderBottom: "1px solid var(--border-subtle)" }}
      >
        <div className="flex items-center justify-between gap-3">
          <div className="min-w-0">
            <p className="text-[10px] uppercase tracking-widest leading-none" style={{ color: "var(--text-muted)" }}>{formation.name}</p>
            <p className="text-[11px] font-semibold truncate" style={{ color: "var(--text)" }}>{teamName}</p>
          </div>
          <div className="flex gap-1 shrink-0">
            {formation.slots.map((pos, i) => (
              <div
                key={i}
                className="w-7 h-7 rounded-full flex items-center justify-center text-[9px] font-black border transition-all"
                style={filledSlots[i]
                  ? slotStyle(pos, true)
                  : { ...slotStyle(pos, false), borderStyle: "dashed" }
                }
              >
                {pos}
              </div>
            ))}
          </div>
          {/* Theme toggle */}
          <button
            onClick={onToggleTheme}
            aria-label="Toggle theme"
            className="w-7 h-7 rounded-full flex items-center justify-center text-xs shrink-0"
            style={{ border: "1px solid var(--border)", backgroundColor: "var(--bg-card)" }}
          >
            {isDark ? "☀️" : "🌙"}
          </button>
        </div>
      </div>

      <div className="px-4">
        {/* Pitch */}
        <div className="mt-4 mb-3">
          <PitchView formation={formation} players={filledSlots} />
        </div>
        <div className="mb-5">
          <StatsBar stats={teamStats} overall={winOdds?.overallRating} />
        </div>

        {/* Special moments */}
        <AnimatePresence>
          {moments?.impossibleXI && (
            <motion.div key="imp" initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }}
              className="rounded-xl px-3 py-2 mb-3 text-center overflow-hidden"
              style={{ border: "1px solid rgba(234,179,8,0.3)", backgroundColor: "rgba(234,179,8,0.1)" }}>
              <p className="text-yellow-400 font-bold text-xs">✨ Impossible XI — 5 nations, 5 decades!</p>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Spin sections */}
        <div className="mb-4">
          {draftPhase === "draft" && (
            <p className="text-[10px] uppercase tracking-widest mb-3" style={{ color: "var(--text-muted)" }}>Build Your XI</p>
          )}
          {[0, 1, 2, 3, 4].map((turnIdx) => (
            <SpinSection
              key={turnIdx}
              turnNumber={turnIdx + 1}
              isActive={draftPhase === "draft" && !allFilled && spinTurn === turnIdx}
              isDone={turnIdx in pickedByTurn}
              draftedPlayer={pickedByTurn[turnIdx] ?? null}
              openSlots={openSlots}
              wildcardAvailable={!wildcardUsed && draftPhase === "draft" && spinTurn === turnIdx}
              eraFilter={eraFilter}
              usedTeamKeys={usedTeamKeys}
              onPick={handlePick}
              onWildcard={handleWildcard}
              onTeamSpun={(key) => setUsedTeamKeys((prev) => prev.includes(key) ? prev : [...prev, key])}
            />
          ))}
        </div>

        {/* ── COMPLETE: Win Odds + Group Draw + Kick Off ── */}
        {draftPhase === "complete" && winOdds && groupDraw && (
          <motion.div initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }} className="mb-6">

            {/* Win Odds */}
            <div
              className="rounded-2xl p-4 mb-4"
              style={{ border: "1px solid var(--border)", backgroundColor: "var(--bg-card)" }}
            >
              <div className="flex items-center justify-between mb-4">
                <p className="text-[10px] uppercase tracking-widest" style={{ color: "var(--text-muted)" }}>Cup Odds</p>
                <p className="text-[10px]" style={{ color: "var(--text-dim)" }}>Based on your 5</p>
              </div>

              <div className="flex items-start justify-between mb-5">
                <div>
                  <p className="text-[10px] uppercase tracking-widest mb-1" style={{ color: "var(--text-muted)" }}>Expected Stage</p>
                  <p className="font-black text-lg leading-tight" style={{ color: "var(--text)" }}>{winOdds.expectedStage}</p>
                </div>
                <div className="text-right">
                  <p className="text-[10px] uppercase tracking-widest mb-1" style={{ color: "var(--text-muted)" }}>Win Probability</p>
                  <p className="font-black text-3xl leading-none" style={{ color: "var(--accent)" }}>{winOdds.pWin}%</p>
                </div>
              </div>

              {ODDS_BARS.map(({ key, label, colorVar }, idx) => (
                <div key={key} className="mb-3">
                  <div className="flex justify-between items-center mb-1">
                    <span className="text-xs" style={{ color: "var(--text)" }}>{label}</span>
                    <span className="text-xs font-black" style={{ color: colorVar }}>{winOdds[key]}%</span>
                  </div>
                  <div className="h-1.5 rounded-full overflow-hidden" style={{ backgroundColor: "var(--border)" }}>
                    <motion.div
                      className="h-full rounded-full"
                      style={{ backgroundColor: colorVar }}
                      initial={{ width: 0 }}
                      animate={{ width: `${winOdds[key]}%` }}
                      transition={{ duration: 0.9, ease: "easeOut", delay: 0.2 + idx * 0.1 }}
                    />
                  </div>
                </div>
              ))}

              <p className="text-[10px] mt-3 italic" style={{ color: "var(--text-dim)" }}>
                What your overall rating of {winOdds.overallRating} suggests. Kick off to find out.
              </p>
            </div>

            {/* Group Draw */}
            <div
              className="rounded-2xl p-4 mb-4"
              style={{ border: "1px solid var(--border)", backgroundColor: "var(--bg-card)" }}
            >
              <div className="flex items-center justify-between mb-3">
                <p className="text-[10px] uppercase tracking-widest" style={{ color: "var(--text-muted)" }}>Group Stage Draw</p>
                <p className="text-[10px]" style={{ color: "var(--text-dim)" }}>Your opponents</p>
              </div>

              {groupDraw.map((opp) => {
                const tier = opponentTier(opp.attack);
                const str  = Math.round((opp.attack + opp.defence + opp.goalkeeping) / 3);
                return (
                  <div
                    key={`${opp.name}-${opp.year}`}
                    className="flex items-center gap-3 py-2.5 last:border-0"
                    style={{ borderBottom: "1px solid var(--border-subtle)" }}
                  >
                    <span className="text-2xl w-8 text-center">{opp.flag}</span>
                    <div className="flex-1 min-w-0">
                      <span className="text-sm font-bold" style={{ color: "var(--text)" }}>{opp.name} </span>
                      <span className="text-sm" style={{ color: "var(--text-muted)" }}>'{String(opp.year).slice(-2)}</span>
                    </div>
                    <span className="text-[9px] font-black px-2 py-0.5 rounded-full" style={tier.style}>{tier.label}</span>
                    <span className="text-xs font-bold w-7 text-right" style={{ color: "var(--text-muted)" }}>{str}</span>
                  </div>
                );
              })}

              {/* User's team row */}
              <div
                className="flex items-center gap-3 pt-3 mt-1"
                style={{ borderTop: "2px dashed var(--accent-border)" }}
              >
                <span className="text-2xl w-8 text-center">🏆</span>
                <div className="flex-1 min-w-0">
                  <span className="text-sm font-black" style={{ color: "var(--accent)" }}>{teamName}</span>
                </div>
                <span
                  className="text-[9px] font-black px-2 py-0.5 rounded-full"
                  style={{ backgroundColor: "var(--accent-20)", color: "var(--accent)", border: "1px solid var(--accent-border)" }}
                >
                  YOU
                </span>
                <span className="text-xs font-black w-7 text-right" style={{ color: "var(--accent)" }}>{winOdds.overallRating}</span>
              </div>
            </div>

            {/* Kick Off */}
            <motion.button
              onClick={handleKickOff}
              whileTap={{ scale: 0.97 }}
              className="w-full font-black text-xl rounded-2xl py-5 tracking-wide"
              style={{ backgroundColor: "#00C038", color: "#000" }}
            >
              Kick Off Group Stage 🏟️
            </motion.button>
          </motion.div>
        )}

        {/* ── TOURNAMENT ── */}
        {(draftPhase === "tournament" || draftPhase === "result") && tournamentResult && (
          <div ref={tournamentRef} className="scroll-mt-20 mb-6">
            <div className="h-px mb-5" style={{ backgroundColor: "var(--border)" }} />

            {stageAnimating && (
              <div className="flex items-center gap-2 mb-3 px-1">
                {[0, 1, 2].map((i) => (
                  <div
                    key={i}
                    className="w-1.5 h-1.5 rounded-full animate-bounce"
                    style={{ backgroundColor: "var(--accent)", animationDelay: `${i * 0.15}s` }}
                  />
                ))}
                <span className="text-xs ml-1" style={{ color: "var(--text-muted)" }}>
                  {currentRevealStage ? `Simulating ${STAGE_LABELS[currentRevealStage]}…` : "Simulating…"}
                </span>
              </div>
            )}

            {STAGE_ORDER.map((stage) => {
              const matches = visibleMatches.filter((m) => m.stage === stage);
              if (!matches.length) return null;
              const isCurrentStage = stage === currentRevealStage;
              const survived       = survivedStage(tournamentResult, stage);

              return (
                <div key={stage} className="mb-4">
                  <p className="text-[10px] uppercase tracking-widest px-1 mb-2" style={{ color: "var(--text-muted)" }}>
                    {STAGE_LABELS[stage]}
                  </p>

                  {matches.map((m, i) => {
                    const isWin  = m.outcome === "win"  || m.outcome === "pen_win";
                    const isLoss = m.outcome === "loss" || m.outcome === "pen_loss";
                    return (
                      <motion.div
                        key={i}
                        initial={{ opacity: 0, x: -16 }}
                        animate={{ opacity: 1, x: 0 }}
                        className="rounded-xl p-3 mb-2"
                        style={{ border: "1px solid var(--border)", backgroundColor: "var(--bg-card)" }}
                      >
                        <div className="flex items-center justify-between mb-1.5">
                          <div className="flex items-center gap-2">
                            <span
                              className="text-[10px] font-bold px-2 py-0.5 rounded-full"
                              style={isWin
                                ? { backgroundColor: "var(--accent-20)", color: "var(--accent)" }
                                : isLoss
                                ? { backgroundColor: "rgba(239,68,68,0.2)", color: "#f87171" }
                                : { backgroundColor: "var(--border)", color: "var(--text-muted)" }
                              }
                            >
                              {isWin ? "WIN" : isLoss ? "OUT" : "DRAW"}
                            </span>
                            <span className="font-bold text-sm" style={{ color: "var(--text)" }}>
                              vs {m.opponentFlag} {m.opponent}{m.opponentYear ? ` '${String(m.opponentYear).slice(-2)}` : ""}
                            </span>
                          </div>
                          <span
                            className="font-black text-sm"
                            style={{ color: isWin ? "var(--accent)" : isLoss ? "#f87171" : "var(--text-muted)" }}
                          >
                            {m.goalsFor}–{m.goalsAgainst}{m.penalties ? " (pen)" : ""}
                          </span>
                        </div>
                        <p className="text-xs leading-relaxed" style={{ color: "var(--text-muted)" }}>{m.headline}</p>
                      </motion.div>
                    );
                  })}

                  {/* Continue button */}
                  {isCurrentStage && stagePaused && survived && NEXT_STAGE_LABELS[stage] && (() => {
                    const nextStageKey = STAGE_ORDER[STAGE_ORDER.indexOf(stage as typeof STAGE_ORDER[number]) + 1];
                    const nextMatch = tournamentResult.matches.find((m) => m.stage === nextStageKey);
                    return (
                      <motion.div
                        ref={continueRef}
                        initial={{ opacity: 0, y: 12 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.15 }}
                        className="mt-3"
                      >
                        {/* Qualified banner */}
                        <div
                          className="rounded-xl p-3 mb-3 flex items-center gap-3"
                          style={{ border: "1px solid var(--accent-border)", backgroundColor: "var(--accent-5)" }}
                        >
                          <span className="text-xl">✅</span>
                          <div>
                            <p className="font-black text-sm" style={{ color: "var(--accent)" }}>{teamName} progress!</p>
                            <p className="text-xs" style={{ color: "var(--text-muted)" }}>Advancing to the {NEXT_STAGE_LABELS[stage]}</p>
                          </div>
                        </div>

                        {/* Next opponent */}
                        {nextMatch && (
                          <div
                            className="rounded-xl p-3 mb-3"
                            style={{ border: "1px solid var(--border)", backgroundColor: "var(--bg-card)" }}
                          >
                            <p className="text-[10px] uppercase tracking-widest mb-2" style={{ color: "var(--text-muted)" }}>
                              {NEXT_STAGE_LABELS[stage]} — Next Up
                            </p>
                            <div className="flex items-center gap-3">
                              <span className="text-3xl">{nextMatch.opponentFlag}</span>
                              <div className="flex-1">
                                <p className="font-black text-base leading-tight" style={{ color: "var(--text)" }}>
                                  {nextMatch.opponent}
                                  {nextMatch.opponentYear ? ` '${String(nextMatch.opponentYear).slice(-2)}` : ""}
                                </p>
                                {nextMatch.opponentOverall != null ? (
                                  <p className="text-xs mt-0.5" style={{ color: "var(--text-muted)" }}>
                                    OVR <span className="font-black" style={{ color: "var(--text)" }}>{nextMatch.opponentOverall}</span>
                                  </p>
                                ) : (
                                  <p className="text-xs mt-0.5" style={{ color: "var(--text-muted)" }}>{NEXT_STAGE_LABELS[stage]}</p>
                                )}
                              </div>
                              <span className="text-2xl">⚔️</span>
                            </div>
                          </div>
                        )}

                        <motion.button
                          onClick={handleContinue}
                          whileTap={{ scale: 0.97 }}
                          className="w-full font-black text-base rounded-2xl py-4 tracking-wide"
                          style={{ backgroundColor: "#00C038", color: "#000" }}
                        >
                          Kick Off {NEXT_STAGE_LABELS[stage]} →
                        </motion.button>
                      </motion.div>
                    );
                  })()}
                </div>
              );
            })}

            {/* Champion banner */}
            <AnimatePresence>
              {showChampionBanner && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0 }}
                  transition={{ type: "spring", bounce: 0.4 }}
                  className="text-center py-8 rounded-2xl mb-6"
                  style={{ border: "1px solid var(--accent-border)", backgroundColor: "var(--accent-5)" }}
                >
                  <div className="text-7xl mb-3">🏆</div>
                  <p className="font-black text-3xl" style={{ color: "var(--accent)" }}>CHAMPIONS!</p>
                  <p className="text-sm mt-2" style={{ color: "var(--text)" }}>{teamName} won The Cup!</p>
                  {streak > 0 && (
                    <p className="text-sm mt-1 font-bold" style={{ color: "var(--accent)" }}>🔥 {streak + 1}-win streak!</p>
                  )}
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        )}

        {/* ── RESULT ── */}
        {draftPhase === "result" && tournamentResult && (() => {
          const posOrder: Record<Position, number> = { FWD: 0, MID: 1, DEF: 2, GK: 3 };
          const sortedPlayers = [...filledSlots]
            .filter(Boolean)
            .sort((a, b) => posOrder[a!.player.position] - posOrder[b!.player.position]) as DraftedPlayer[];
          const pStats = tournamentResult.playerTournamentStats;

          return (
            <div ref={resultRef} className="scroll-mt-20 pb-8">
              <div className="h-px mb-5" style={{ backgroundColor: "var(--border)" }} />
              <p className="text-[10px] uppercase tracking-widest mb-4" style={{ color: "var(--text-muted)" }}>Tournament Awards</p>

              {!tournamentResult.champion && (
                <div className="rounded-2xl p-4 mb-4 text-center" style={{ border: "1px solid rgba(239,68,68,0.2)", backgroundColor: "rgba(239,68,68,0.05)" }}>
                  <p className="text-red-400 font-black text-lg">
                    Eliminated — {STAGE_LABELS[tournamentResult.stage] ?? tournamentResult.stage}
                  </p>
                </div>
              )}

              {/* Awards */}
              <div className="grid grid-cols-2 gap-3 mb-4">
                <div className="rounded-2xl p-3" style={{ backgroundColor: "var(--bg-card)", border: "1px solid var(--border)" }}>
                  <p className="text-[10px] uppercase tracking-widest mb-2" style={{ color: "var(--text-muted)" }}>🥇 Golden Boot</p>
                  <p className="font-black text-sm leading-tight truncate" style={{ color: "var(--text)" }}>{tournamentResult.goldenBootPlayer || "—"}</p>
                  <p className="text-xs mt-1 font-semibold" style={{ color: "var(--accent)" }}>
                    {Math.max(0, ...sortedPlayers.map((p) => pStats[p.player.id]?.goals ?? 0))} goals
                  </p>
                </div>
                <div className="rounded-2xl p-3" style={{ backgroundColor: "var(--bg-card)", border: "1px solid rgba(234,179,8,0.2)" }}>
                  <p className="text-[10px] uppercase tracking-widest mb-2" style={{ color: "var(--text-muted)" }}>🏆 Team MVP</p>
                  <p className="font-black text-sm leading-tight truncate text-yellow-400">{tournamentResult.playerOfTournament || "—"}</p>
                </div>
              </div>

              {/* Player stats table */}
              <p className="text-[10px] uppercase tracking-widest mb-2" style={{ color: "var(--text-muted)" }}>Player Stats</p>
              <div className="rounded-2xl overflow-hidden mb-5" style={{ backgroundColor: "var(--bg-card)", border: "1px solid var(--border)" }}>
                <div className="flex items-center px-4 py-2" style={{ borderBottom: "1px solid var(--border)" }}>
                  <span className="text-[10px] uppercase tracking-widest flex-1" style={{ color: "var(--text-dim)" }}>Player</span>
                  <span className="text-[10px] uppercase tracking-widest w-10 text-right" style={{ color: "var(--text-dim)" }}>G</span>
                  <span className="text-[10px] uppercase tracking-widest w-10 text-right" style={{ color: "var(--text-dim)" }}>A</span>
                  <span className="text-[10px] uppercase tracking-widest w-10 text-right" style={{ color: "var(--text-dim)" }}>CS</span>
                </div>

                {sortedPlayers.map((dp) => {
                  const s    = pStats[dp.player.id] ?? { goals: 0, assists: 0, cleanSheets: 0 };
                  const isPOT = dp.player.name === tournamentResult.playerOfTournament;
                  const showCS = dp.player.position === "GK" || dp.player.position === "DEF";
                  return (
                    <div
                      key={dp.player.id}
                      className="flex items-center px-4 py-3 last:border-0"
                      style={{
                        borderBottom: "1px solid var(--border-subtle)",
                        backgroundColor: isPOT ? "rgba(234,179,8,0.05)" : undefined,
                      }}
                    >
                      <div className="flex items-center gap-2.5 flex-1 min-w-0">
                        <span className="text-[9px] font-black px-2 py-1 rounded-md shrink-0" style={posBadgeStyle(dp.player.position)}>
                          {dp.player.position}
                        </span>
                        <span className={`text-sm font-bold truncate ${isPOT ? "text-yellow-400" : ""}`} style={isPOT ? {} : { color: "var(--text)" }}>
                          {dp.player.name}
                        </span>
                      </div>
                      <span className="w-10 text-right text-sm font-black tabular-nums" style={{ color: s.goals > 0 ? "var(--accent)" : "var(--text-dimmer)" }}>
                        {s.goals > 0 ? s.goals : "·"}
                      </span>
                      <span className="w-10 text-right text-sm font-black tabular-nums" style={{ color: s.assists > 0 ? "var(--accent)" : "var(--text-dimmer)" }}>
                        {s.assists > 0 ? s.assists : "·"}
                      </span>
                      <span className="w-10 text-right text-sm font-black tabular-nums" style={{ color: showCS && s.cleanSheets > 0 ? "var(--text)" : "var(--text-dimmer)" }}>
                        {showCS && s.cleanSheets > 0 ? s.cleanSheets : "·"}
                      </span>
                    </div>
                  );
                })}
              </div>

              {/* Share */}
              <motion.button
                onClick={() => setShowShare(true)}
                whileTap={{ scale: 0.97 }}
                className="w-full font-bold text-base rounded-2xl py-3.5 mb-3 flex items-center justify-center gap-2"
                style={{ border: "1px solid var(--border)", backgroundColor: "var(--bg-card)", color: "var(--text)" }}
              >
                <span>🔗</span> Share Results
              </motion.button>

              <motion.button onClick={() => onNewGame(tournamentResult.champion)} whileTap={{ scale: 0.97 }}
                className="w-full font-black text-lg rounded-2xl py-4 mb-3"
                style={{ backgroundColor: "#00C038", color: "#000" }}>
                {tournamentResult.champion ? "Keep Streak — New XI 🔥" : "Try Again"}
              </motion.button>

              <motion.button onClick={onRestart} whileTap={{ scale: 0.97 }}
                className="w-full font-semibold text-sm rounded-2xl py-3"
                style={{ border: "1px solid var(--border)", color: "var(--text-muted)" }}>
                Back to Start
              </motion.button>
            </div>
          );
        })()}
      </div>

      {/* ── Share modal ── */}
      <AnimatePresence>
        {showShare && tournamentResult && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/80 flex flex-col justify-end"
            onClick={() => setShowShare(false)}
          >
            <motion.div
              initial={{ y: "100%" }}
              animate={{ y: 0 }}
              exit={{ y: "100%" }}
              transition={{ type: "spring", stiffness: 300, damping: 30 }}
              onClick={(e) => e.stopPropagation()}
              className="rounded-t-3xl p-5 pb-8"
              style={{ backgroundColor: "var(--bg-surface)" }}
            >
              <div className="w-10 h-1 rounded-full mx-auto mb-5" style={{ backgroundColor: "var(--border)" }} />
              <p className="font-black text-lg mb-5 text-center" style={{ color: "var(--text)" }}>Share Your Result</p>

              <div className="flex justify-center mb-5">
                <ShareCard
                  ref={shareCardRef}
                  teamName={teamName}
                  formation={formation}
                  filledSlots={filledSlots}
                  tournamentResult={tournamentResult}
                />
              </div>

              <div className="grid grid-cols-3 gap-3 mb-3">
                {[
                  { label: "WhatsApp", icon: "💬", action: handleShareWhatsApp },
                  { label: "X / Twitter", icon: "𝕏", action: handleShareX },
                  { label: copied ? "Copied!" : "Copy", icon: copied ? "✅" : "🔗", action: handleCopy },
                ].map(({ label, icon, action }) => (
                  <button
                    key={label}
                    onClick={action}
                    className="flex flex-col items-center gap-2 rounded-2xl py-4 active:scale-95 transition-transform"
                    style={{ border: "1px solid var(--border)", backgroundColor: "var(--bg-card)" }}
                  >
                    <span className="text-2xl leading-none">{icon}</span>
                    <span className="text-xs font-bold" style={{ color: "var(--text)" }}>{label}</span>
                  </button>
                ))}
              </div>

              <button
                onClick={handleSaveImage}
                disabled={savingImage}
                className="w-full font-bold rounded-2xl py-3.5 mb-3 flex items-center justify-center gap-2 disabled:opacity-50"
                style={{ border: "1px solid var(--border)", backgroundColor: "var(--bg-card)", color: "var(--text)" }}
              >
                <span>{savingImage ? "⏳" : "⬇️"}</span>
                {savingImage ? "Saving…" : "Save Image"}
              </button>

              <button
                onClick={() => setShowShare(false)}
                className="w-full font-semibold py-3 text-sm"
                style={{ color: "var(--text-dim)" }}
              >
                Close
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
