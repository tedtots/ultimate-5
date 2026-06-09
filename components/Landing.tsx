"use client";

import Image from "next/image";
import { motion } from "framer-motion";

interface Props {
  expertMode: boolean;
  isDark: boolean;
  onToggleTheme: () => void;
  onToggleExpert: () => void;
  onStart: () => void;
}

const EXAMPLE_TEAM = [
  { flag: "🇮🇹", name: "Gianluigi Buffon", pos: "GK",  year: "2006", ovr: 93 },
  { flag: "🇩🇪", name: "Franz Beckenbauer", pos: "DEF", year: "1974", ovr: 97 },
  { flag: "🇦🇷", name: "Diego Maradona", pos: "MID", year: "1986", ovr: 99 },
  { flag: "🇫🇷", name: "Zinedine Zidane",pos: "MID", year: "1998", ovr: 96 },
  { flag: "🇧🇷", name: "Ronaldo",         pos: "FWD", year: "2002", ovr: 97 },
];

const HOW_TO_PLAY = [
  { step: "1", title: "Pick your formation", desc: "Choose your shape before you see a single player — Diamond, Box, Counter, Press, Fortress, or Spread." },
  { step: "2", title: "Spin for each position", desc: "Each spin lands on a real squad from a specific nation and year. Pick a player and lock them in." },
  { step: "3", title: "Build your Ultimate 5", desc: "Repeat until all five slots are filled — players spanning different countries and different decades." },
  { step: "4", title: "Simulate The Cup", desc: "Play out the full tournament — groups, knockouts, and the Final — in under 30 seconds." },
];

const CHALLENGES = [
  "Win The Cup with your very first Ultimate 5",
  "Build a 5 spanning five different decades — chase the \"Impossible 5\" badge",
  "Go on the longest unbeaten winning streak you can",
  "Build an all-underdog 5 and pull off a giant-killing run",
  "Pair legends who never played together — and make it work",
  "Win it on Expert Mode with overalls hidden",
];

const FAQS = [
  {
    q: "What is Ultimate 5?",
    a: "A free football draft game where you build a 5-a-side dream team using real players from across football history — with a twist: every position is filled from a different random nation and year, so your team is a fantasy mash-up that could never have existed.",
  },
  {
    q: "Why are my players from different nations and eras?",
    a: "That's the whole idea. Instead of picking from one squad, you draw a fresh nation and year for every position — so you might end up with a keeper from Germany 2014, a defender from Italy 1994, and a striker from Brazil 2002. Players who never shared a pitch, now playing for you.",
  },
  {
    q: "What's the Wildcard?",
    a: "You get one Wildcard per Ultimate 5 you build. If you don't like the nation/year your spin lands on, use it to re-spin that slot — once. Use it wisely.",
  },
  {
    q: "Is it free?",
    a: "Yes — completely free, no sign-up required, and it runs in any modern browser on mobile or desktop.",
  },
  {
    q: "What is Expert Mode?",
    a: "Overalls are hidden during the draft — you see only name, position, and age. Ratings are revealed only after your full 5 is built. For purists who want to pick on instinct alone.",
  },
];

export default function Landing({ expertMode, isDark, onToggleTheme, onToggleExpert, onStart }: Props) {
  return (
    <div className="flex flex-col min-h-dvh px-4 pb-12" style={{ backgroundColor: "var(--bg-page)" }}>

      {/* ── Header bar ── */}
      <div className="flex justify-between items-center pt-6 pb-2">
        <span className="text-xs font-medium tracking-widest uppercase" style={{ color: "var(--text-muted)" }}>
          The Beautiful Game
        </span>
        <div className="flex items-center gap-3">
          <button
            onClick={onToggleTheme}
            aria-label="Toggle theme"
            className="w-8 h-8 rounded-full flex items-center justify-center text-sm border transition-colors"
            style={{ borderColor: "var(--border)", backgroundColor: "var(--bg-card)" }}
          >
            {isDark ? "☀️" : "🌙"}
          </button>
        </div>
      </div>

      {/* ── Hero ── */}
      <motion.div
        className="flex flex-col items-center text-center pt-8 pb-6"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        {/* Logo */}
        <div className="mb-5">
          <Image src="/logo.png" alt="Ultimate 5" width={260} height={260} priority />
        </div>

        <h1 className="text-4xl font-black tracking-tight leading-none mb-3" style={{ color: "var(--text)" }}>
          Build a dream team<br />
          <span style={{ color: "#00C038" }}>that never existed.</span>
        </h1>
      </motion.div>

      {/* ── Stats strip ── */}
      <motion.div
        className="grid grid-cols-3 gap-2 mb-6"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.2 }}
      >
        {[
          { value: "110+", label: "Squads" },
          { value: "1,200+", label: "Legends" },
          { value: "1954–Now", label: "Eras covered" },
        ].map((s) => (
          <div key={s.label} className="rounded-2xl p-3 text-center" style={{ backgroundColor: "var(--bg-card)", border: "1px solid var(--border)" }}>
            <p className="text-base font-black" style={{ color: "#00C038" }}>{s.value}</p>
            <p className="text-[10px] mt-0.5" style={{ color: "var(--text-muted)" }}>{s.label}</p>
          </div>
        ))}
      </motion.div>

      {/* ── Example Dream Team ── */}
      <motion.div
        className="rounded-2xl p-4 mb-6"
        style={{ border: "1px solid var(--border)", backgroundColor: "var(--bg-card)" }}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.3 }}
      >
        <p className="text-[11px] uppercase tracking-widest mb-3" style={{ color: "var(--text-muted)" }}>
          Example Dream Team
        </p>
        {EXAMPLE_TEAM.map((p) => (
          <div key={p.name} className="flex items-center gap-3 py-1.5">
            <span className="text-xl">{p.flag}</span>
            <div className="flex-1 min-w-0">
              <span className="text-sm font-semibold" style={{ color: "var(--text)" }}>{p.name}</span>
            </div>
            <span
              className="text-[10px] font-black px-1.5 py-0.5 rounded"
              style={{ backgroundColor: `var(--pos-${p.pos.toLowerCase()})`, color: `var(--pos-${p.pos.toLowerCase()}-fg)` }}
            >
              {p.pos}
            </span>
            <span className="text-[10px] font-bold w-6 text-right" style={{ color: "#00C038" }}>{p.ovr}</span>
            <span className="text-[10px] w-6 text-right" style={{ color: "var(--text-muted)" }}>'{p.year.slice(2)}</span>
          </div>
        ))}
      </motion.div>

      {/* ── Primary CTA ── */}
      <div className="flex flex-col gap-3 mb-10">
        {/* Expert mode toggle */}
        <div className="flex items-center justify-between px-1 mb-1">
          <div>
            <p className="text-sm font-semibold" style={{ color: "var(--text)" }}>Expert Mode</p>
            <p className="text-[11px]" style={{ color: "var(--text-muted)" }}>Pick without seeing overalls</p>
          </div>
          <button
            onClick={onToggleExpert}
            className="w-12 h-6 rounded-full transition-colors relative flex-shrink-0"
            style={{ backgroundColor: expertMode ? "#00C038" : "var(--border)" }}
          >
            <span
              className={`absolute top-0.5 w-5 h-5 rounded-full bg-white shadow transition-all duration-200 ${
                expertMode ? "right-0.5" : "left-0.5"
              }`}
            />
          </button>
        </div>

        <motion.button
          className="font-black text-lg rounded-2xl py-4 w-full"
          style={{ backgroundColor: "#00C038", color: "#000" }}
          onClick={onStart}
          whileTap={{ scale: 0.97 }}
        >
          Build Your Ultimate 5 →
        </motion.button>

        <p className="text-center text-[11px]" style={{ color: "var(--text-muted)" }}>
          No sign-up required · Free to play
        </p>
      </div>

      {/* ── What is Ultimate 5? ── */}
      <motion.section
        className="mb-8"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.4 }}
      >
        <h2 className="text-xl font-black mb-3" style={{ color: "var(--text)" }}>What is Ultimate 5?</h2>
        <p className="text-sm leading-relaxed mb-3" style={{ color: "var(--text-muted)" }}>
          Ultimate 5 is a free football draft game where you build an impossible dream team — five players drawn from different nations and different eras — and take them through a full tournament.
        </p>
        <p className="text-sm leading-relaxed" style={{ color: "var(--text-muted)" }}>
          Pick your formation, then spin for each position. Every spin lands on a real squad from a specific nation and year. Choose a player, lock them in, and spin again. By the time your 5 is complete, you'll have built something that could never have existed on a real pitch: a back line spanning two decades, a midfield pairing legends who never met, a striker and a keeper from different generations entirely.
        </p>
      </motion.section>

      {/* ── How to Play ── */}
      <section className="mb-8">
        <h2 className="text-xl font-black mb-4" style={{ color: "var(--text)" }}>How to play</h2>
        <div className="flex flex-col gap-3">
          {HOW_TO_PLAY.map((item) => (
            <div key={item.step} className="flex gap-3 items-start rounded-2xl p-3" style={{ backgroundColor: "var(--bg-card)", border: "1px solid var(--border)" }}>
              <div
                className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-black flex-shrink-0"
                style={{ backgroundColor: "#00C038", color: "#000" }}
              >
                {item.step}
              </div>
              <div>
                <p className="text-sm font-bold mb-0.5" style={{ color: "var(--text)" }}>{item.title}</p>
                <p className="text-xs leading-relaxed" style={{ color: "var(--text-muted)" }}>{item.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ── Popular Challenges ── */}
      <section className="mb-8">
        <h2 className="text-xl font-black mb-4" style={{ color: "var(--text)" }}>Popular challenges</h2>
        <div className="flex flex-col gap-2">
          {CHALLENGES.map((c) => (
            <div key={c} className="flex items-start gap-2 text-sm" style={{ color: "var(--text-muted)" }}>
              <span style={{ color: "#00C038" }} className="mt-0.5 flex-shrink-0">▸</span>
              <span>{c}</span>
            </div>
          ))}
        </div>
      </section>

      {/* ── FAQ ── */}
      <section className="mb-10">
        <h2 className="text-xl font-black mb-4" style={{ color: "var(--text)" }}>Frequently asked questions</h2>
        <div className="flex flex-col gap-4">
          {FAQS.map((faq) => (
            <div key={faq.q} className="rounded-2xl p-4" style={{ backgroundColor: "var(--bg-card)", border: "1px solid var(--border)" }}>
              <p className="text-sm font-bold mb-1" style={{ color: "var(--text)" }}>{faq.q}</p>
              <p className="text-xs leading-relaxed" style={{ color: "var(--text-muted)" }}>{faq.a}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── Closing CTA ── */}
      <div className="mb-10 text-center">
        <p className="text-base font-black mb-1" style={{ color: "var(--text)" }}>Can your impossible 5 win The Cup?</p>
        <p className="text-xs mb-4" style={{ color: "var(--text-muted)" }}>Pick your shape, spin for your five, and find out.</p>
        <motion.button
          className="font-black text-lg rounded-2xl py-4 w-full"
          style={{ backgroundColor: "#00C038", color: "#000" }}
          onClick={onStart}
          whileTap={{ scale: 0.97 }}
        >
          Build Your Ultimate 5 →
        </motion.button>
      </div>

    </div>
  );
}
