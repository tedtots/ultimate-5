"use client";

import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";

import Landing from "./Landing";
import FormationSelect from "./FormationSelect";
import DraftPage from "./DraftPage";

import { FORMATIONS } from "@/lib/formations";
import { Formation } from "@/lib/types";
import { EraFilter } from "./FormationSelect";

type Phase = "landing" | "formation" | "draft";

const pageVariants = {
  initial: { opacity: 0, x: 32 },
  animate: { opacity: 1, x: 0 },
  exit:    { opacity: 0, x: -32 },
};

export default function Game() {
  const [phase, setPhase]         = useState<Phase>("landing");
  const [formation, setFormation] = useState<Formation>(FORMATIONS[0]);
  const [teamName, setTeamName]   = useState("Ultimate 5");
  const [eraFilter, setEraFilter] = useState<EraFilter>({ minYear: 1930, maxYear: 2022 });
  const [streak, setStreak]       = useState(0);
  const [expertMode, setExpertMode] = useState(false);
  const [isDark, setIsDark]       = useState(true);

  useEffect(() => {
    const saved = typeof localStorage !== "undefined" && localStorage.getItem("theme");
    if (saved === "light") setIsDark(false);
  }, []);

  useEffect(() => {
    if (isDark) {
      document.documentElement.classList.remove("light");
      localStorage.setItem("theme", "dark");
    } else {
      document.documentElement.classList.add("light");
      localStorage.setItem("theme", "light");
    }
  }, [isDark]);

  function toggleTheme() { setIsDark((d) => !d); }

  function handleFormationSelect(f: Formation, name: string, era: EraFilter) {
    setFormation(f);
    setTeamName(name || "Ultimate 5");
    setEraFilter(era);
    setPhase("draft");
  }

  function handleNewGame(champion: boolean) {
    if (champion) setStreak((s) => s + 1);
    else setStreak(0);
    setPhase("formation");
  }

  function handleRestart() {
    setStreak(0);
    setPhase("landing");
  }

  return (
    <AnimatePresence mode="wait">
      {phase === "landing" && (
        <motion.div key="landing" {...pageVariants} transition={{ duration: 0.22 }}>
          <Landing
            expertMode={expertMode}
            isDark={isDark}
            onToggleTheme={toggleTheme}
            onToggleExpert={() => setExpertMode((e) => !e)}
            onStart={() => setPhase("formation")}
          />
        </motion.div>
      )}

      {phase === "formation" && (
        <motion.div key="formation" {...pageVariants} transition={{ duration: 0.22 }}>
          <FormationSelect onSelect={handleFormationSelect} />
        </motion.div>
      )}

      {phase === "draft" && (
        <motion.div key="draft" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.2 }}>
          <DraftPage
            formation={formation}
            teamName={teamName}
            eraFilter={eraFilter}
            streak={streak}
            isDark={isDark}
            onToggleTheme={toggleTheme}
            onNewGame={handleNewGame}
            onRestart={handleRestart}
          />
        </motion.div>
      )}
    </AnimatePresence>
  );
}
