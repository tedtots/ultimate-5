"use client";

import { forwardRef } from "react";
import { DraftedPlayer, Formation, TournamentResult } from "@/lib/types";

interface Props {
  teamName: string;
  formation: Formation;
  filledSlots: (DraftedPlayer | null)[];
  tournamentResult: TournamentResult;
}

// FIFA WC26 palette — always rendered dark (share card is a static image)
const POS_COLORS: Record<string, { bg: string; text: string }> = {
  GK:  { bg: "#F0D800", text: "#000" },
  DEF: { bg: "#2850C0", text: "#fff" },
  MID: { bg: "#00B0C0", text: "#000" },
  FWD: { bg: "#E0121A", text: "#fff" },
};

const STAGE_LABELS: Record<string, string> = {
  group: "Group Stage", r32: "Round of 32", r16: "Round of 16",
  qf: "Quarter-Final", sf: "Semi-Final", final: "The Final",
};

export const ShareCard = forwardRef<HTMLDivElement, Props>(
  ({ teamName, formation, filledSlots, tournamentResult }, ref) => {
    const posOrder: Record<string, number> = { FWD: 0, MID: 1, DEF: 2, GK: 3 };
    const sorted = [...filledSlots]
      .filter(Boolean)
      .sort((a, b) => posOrder[a!.player.position] - posOrder[b!.player.position]) as DraftedPlayer[];

    const pStats = tournamentResult.playerTournamentStats;
    const maxGoals = Math.max(0, ...sorted.map((p) => pStats[p.player.id]?.goals ?? 0));

    const champion = tournamentResult.champion;
    const accentColor = champion ? "#00C038" : "#ef4444";

    return (
      <div
        ref={ref}
        style={{
          width: 320,
          background: "#0f0f0f",
          fontFamily: "'Inter', system-ui, -apple-system, sans-serif",
          borderRadius: 20,
          overflow: "hidden",
          boxSizing: "border-box",
        }}
      >
        {/* Header bar */}
        <div style={{ background: accentColor, padding: "4px 0", textAlign: "center" }}>
          <span style={{ fontSize: 10, fontWeight: 900, color: champion ? "#000" : "#fff", letterSpacing: "0.15em", textTransform: "uppercase" }}>
            Ultimate 5
          </span>
        </div>

        <div style={{ padding: "20px 20px 0" }}>
          {/* Result */}
          <div style={{ textAlign: "center", marginBottom: 18 }}>
            <div style={{ fontSize: 40, lineHeight: 1, marginBottom: 8 }}>
              {champion ? "🏆" : "⚽"}
            </div>
            <div style={{ fontSize: 15, fontWeight: 900, color: accentColor, letterSpacing: "0.06em", textTransform: "uppercase", marginBottom: 4 }}>
              {champion ? "Cup Champions!" : `Eliminated — ${STAGE_LABELS[tournamentResult.stage] ?? tournamentResult.stage}`}
            </div>
            <div style={{ fontSize: 22, fontWeight: 900, color: "#ffffff", marginBottom: 2 }}>
              {teamName}
            </div>
            <div style={{ fontSize: 11, color: "#666", textTransform: "uppercase", letterSpacing: "0.1em" }}>
              {formation.name}
            </div>
          </div>

          {/* Divider */}
          <div style={{ height: 1, background: "#222", marginBottom: 14 }} />

          {/* Players */}
          <div style={{ marginBottom: 14 }}>
            {sorted.map((dp) => {
              const s = pStats[dp.player.id] ?? { goals: 0, assists: 0, cleanSheets: 0 };
              const posColor = POS_COLORS[dp.player.position];
              const isPOT = dp.player.name === tournamentResult.playerOfTournament;
              return (
                <div
                  key={dp.player.id}
                  style={{
                    display: "flex", alignItems: "center", marginBottom: 8,
                    background: isPOT ? "rgba(234,179,8,0.06)" : "transparent",
                    borderRadius: 8, padding: isPOT ? "3px 6px 3px 0" : 0,
                  }}
                >
                  <span style={{
                    background: posColor.bg, color: posColor.text,
                    fontSize: 8, fontWeight: 900, padding: "3px 6px", borderRadius: 4,
                    marginRight: 8, flexShrink: 0, letterSpacing: "0.05em",
                  }}>
                    {dp.player.position}
                  </span>
                  <span style={{ color: isPOT ? "#facc15" : "#fff", fontSize: 13, fontWeight: 700, flex: 1 }}>
                    {dp.player.name}
                  </span>
                  <span style={{ color: "#555", fontSize: 10, marginRight: 10 }}>
                    '{String(dp.year).slice(-2)}
                  </span>
                  <span style={{ color: "#00C038", fontSize: 13, fontWeight: 900, minWidth: 22, textAlign: "right" }}>
                    {dp.player.overall}
                  </span>
                  {s.goals > 0 && (
                    <span style={{ color: "#00C038", fontSize: 10, fontWeight: 900, marginLeft: 6 }}>
                      ⚽{s.goals}
                    </span>
                  )}
                </div>
              );
            })}
          </div>

          {/* Divider */}
          <div style={{ height: 1, background: "#222", marginBottom: 14 }} />

          {/* Awards */}
          <div style={{ display: "flex", gap: 8, marginBottom: 18 }}>
            <div style={{ flex: 1, background: "#1a1a1a", borderRadius: 10, padding: "10px 12px" }}>
              <div style={{ fontSize: 9, color: "#666", textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 4 }}>
                🥇 Golden Boot
              </div>
              <div style={{ color: "#fff", fontWeight: 900, fontSize: 12, marginBottom: 2 }}>
                {tournamentResult.goldenBootPlayer || "—"}
              </div>
              <div style={{ color: "#00C038", fontSize: 10, fontWeight: 700 }}>{maxGoals} goals</div>
            </div>
            <div style={{
              flex: 1, background: "#1a1a1a", borderRadius: 10, padding: "10px 12px",
              border: "1px solid rgba(234,179,8,0.2)",
            }}>
              <div style={{ fontSize: 9, color: "#666", textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 4 }}>
                🏆 Team MVP
              </div>
              <div style={{ color: "#facc15", fontWeight: 900, fontSize: 12 }}>
                {tournamentResult.playerOfTournament || "—"}
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div style={{ background: "#0a0a0a", padding: "10px 20px", textAlign: "center" }}>
          <div style={{ color: "#00C038", fontSize: 11, fontWeight: 900, letterSpacing: "0.05em" }}>
            Can you build a better team?
          </div>
          <div style={{ color: "#444", fontSize: 9, marginTop: 2, letterSpacing: "0.05em" }}>
            Ultimate 5
          </div>
        </div>
      </div>
    );
  }
);

ShareCard.displayName = "ShareCard";
