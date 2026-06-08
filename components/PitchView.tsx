"use client";

import { motion, AnimatePresence } from "framer-motion";
import { DraftedPlayer, Formation, Position } from "@/lib/types";
import { PITCH_POSITIONS } from "@/lib/pitchPositions";

interface Props {
  formation: Formation;
  players: (DraftedPlayer | null)[];
  highlightSlot?: number;
}

// FIFA WC26 colours via CSS variables — inline styles so they work in both themes
function posStyle(pos: Position): React.CSSProperties {
  const key = pos.toLowerCase();
  return { backgroundColor: `var(--pos-${key})`, color: `var(--pos-${key}-fg)` };
}

function posBorderStyle(pos: Position): React.CSSProperties {
  return { borderColor: `var(--pos-${pos.toLowerCase()})` };
}

function initials(name: string) {
  return name.split(" ").map((w) => w[0]).join("").slice(0, 2).toUpperCase();
}

export default function PitchView({ formation, players, highlightSlot }: Props) {
  const positions = PITCH_POSITIONS[formation.id];

  return (
    <div className="relative w-full rounded-2xl overflow-hidden" style={{ paddingBottom: "62%" }}>
      {/* Pitch background — always dark green regardless of theme */}
      <div className="absolute inset-0" style={{ backgroundColor: "#1a4731" }}>
        {/* Pitch stripes */}
        {[0, 1, 2, 3, 4].map((i) => (
          <div
            key={i}
            className="absolute inset-y-0"
            style={{
              left: `${i * 20}%`,
              width: "20%",
              backgroundColor: i % 2 === 0 ? "rgba(0,0,0,0.08)" : "transparent",
            }}
          />
        ))}

        {/* Centre circle */}
        <div
          className="absolute border border-white/10 rounded-full"
          style={{ width: "22%", paddingBottom: "22%", left: "39%", top: "50%", transform: "translate(0,-50%)" }}
        />
        {/* Centre line */}
        <div className="absolute inset-x-0 border-t border-white/10" style={{ top: "50%" }} />
        {/* Penalty areas */}
        <div className="absolute border border-white/10" style={{ top: 0, left: "30%", width: "40%", height: "18%" }} />
        <div className="absolute border border-white/10" style={{ bottom: 0, left: "30%", width: "40%", height: "18%" }} />
        {/* Goals */}
        <div className="absolute border border-white/20" style={{ top: 0, left: "40%", width: "20%", height: "5%" }} />
        <div className="absolute border border-white/20" style={{ bottom: 0, left: "40%", width: "20%", height: "5%" }} />

        {/* Player dots */}
        {positions.map((pos, slotIdx) => {
          const dp        = players[slotIdx];
          const slotPos   = formation.slots[slotIdx];
          const isHighlighted = highlightSlot === slotIdx;
          const isFilled  = !!dp;

          return (
            <div
              key={slotIdx}
              className="absolute"
              style={{ left: `${pos.x}%`, top: `${pos.y}%`, transform: "translate(-50%,-50%)" }}
            >
              <AnimatePresence mode="wait">
                {isFilled && dp ? (
                  <motion.div
                    key="filled"
                    initial={{ scale: 0, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    transition={{ type: "spring", stiffness: 400, damping: 20 }}
                    className="flex flex-col items-center gap-0.5"
                  >
                    <div
                      className="w-9 h-9 rounded-full flex items-center justify-center shadow-lg border-2 border-white/30"
                      style={posStyle(slotPos)}
                    >
                      <span className="font-black text-[10px] leading-none">
                        {initials(dp.player.name)}
                      </span>
                    </div>
                    <div className="bg-black/70 rounded px-1 max-w-[52px]">
                      <span className="text-white text-[9px] font-semibold leading-tight block text-center truncate">
                        {dp.player.name.split(" ").pop()}
                      </span>
                    </div>
                  </motion.div>
                ) : (
                  <motion.div
                    key="empty"
                    className="flex flex-col items-center gap-0.5"
                    animate={isHighlighted ? { scale: [1, 1.1, 1] } : {}}
                    transition={{ repeat: Infinity, duration: 1.4 }}
                  >
                    <div
                      className="w-9 h-9 rounded-full border-2 border-dashed flex items-center justify-center"
                      style={isHighlighted
                        ? { ...posBorderStyle(slotPos), backgroundColor: "rgba(255,255,255,0.10)" }
                        : { borderColor: "rgba(255,255,255,0.25)", backgroundColor: "rgba(255,255,255,0.05)" }
                      }
                    >
                      <span
                        className="text-[9px] font-bold"
                        style={{ color: isHighlighted ? "#fff" : "rgba(255,255,255,0.4)" }}
                      >
                        {pos.label}
                      </span>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          );
        })}
      </div>
    </div>
  );
}
