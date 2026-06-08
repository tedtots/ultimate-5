import {
  DraftedPlayer,
  Formation,
  MatchResult,
  PlayerTournamentStats,
  TeamStats,
  TournamentResult,
  TournamentStage,
} from "./types";

export function computeTeamStats(
  players: (DraftedPlayer | null)[]
): TeamStats {
  const filled = players.filter(Boolean) as DraftedPlayer[];

  const effectiveOverall = (p: DraftedPlayer) =>
    Math.round(p.player.overall * (1 - p.penaltyPercent / 100));

  const gk = filled.find((p) => p.player.position === "GK");
  const defs = filled.filter((p) => p.player.position === "DEF");
  const mids = filled.filter((p) => p.player.position === "MID");
  const fwds = filled.filter((p) => p.player.position === "FWD");

  const avg = (arr: DraftedPlayer[]) =>
    arr.length
      ? arr.reduce((s, p) => s + effectiveOverall(p), 0) / arr.length
      : 0;

  const gkRating = gk ? effectiveOverall(gk) : 0;
  const defRating = avg(defs) || 0;
  const midRating = avg(mids) || 0;
  const fwdRating = avg(fwds) || 0;

  return {
    attack: Math.round(fwdRating * 0.7 + midRating * 0.3),
    midfield: Math.round(midRating * 0.6 + defRating * 0.2 + fwdRating * 0.2),
    defence: Math.round(defRating * 0.6 + gkRating * 0.3 + midRating * 0.1),
    goalkeeping: gkRating,
  };
}

export function computeMatchRatings(
  stats: TeamStats,
  formation: Formation
): { attack: number; defence: number } {
  const attack =
    stats.attack * 0.6 +
    stats.midfield * 0.4 +
    formation.attackBonus;
  const defence =
    stats.defence * 0.6 +
    stats.goalkeeping * 0.3 +
    stats.midfield * 0.1 +
    formation.defenceBonus;
  return {
    attack: Math.round(attack),
    defence: Math.round(defence),
  };
}

/** Seeded random (simple LCG so tournament is reproducible per seed) */
class SeededRandom {
  private seed: number;
  constructor(seed: number) {
    this.seed = seed;
  }
  next(): number {
    this.seed = (this.seed * 1664525 + 1013904223) & 0xffffffff;
    return (this.seed >>> 0) / 0xffffffff;
  }
}

interface AITeam {
  name: string;
  flag: string;
  year: number;
  attack: number;
  defence: number;
  goalkeeping: number;
}

interface HistoricalTeam {
  name: string;
  flag: string;
  year: number;
  attack: number;
  defence: number;
  goalkeeping: number;
}

// Historical World Cup squads with ratings based on real-world performance
const HISTORICAL_WC_TEAMS: HistoricalTeam[] = [
  // ── ELITE ────────────────────────────────────────────────────────────────
  { name: "Brazil",           flag: "🇧🇷", year: 1970, attack: 93, defence: 88, goalkeeping: 87 },
  { name: "Brazil",           flag: "🇧🇷", year: 2002, attack: 91, defence: 85, goalkeeping: 86 },
  { name: "Argentina",        flag: "🇦🇷", year: 1986, attack: 92, defence: 83, goalkeeping: 82 },
  { name: "France",           flag: "🇫🇷", year: 1998, attack: 88, defence: 88, goalkeeping: 86 },
  { name: "Germany",          flag: "🇩🇪", year: 1974, attack: 87, defence: 89, goalkeeping: 85 },
  { name: "Hungary",          flag: "🇭🇺", year: 1954, attack: 91, defence: 79, goalkeeping: 77 },
  { name: "Netherlands",      flag: "🇳🇱", year: 1974, attack: 90, defence: 85, goalkeeping: 82 },
  { name: "Italy",            flag: "🇮🇹", year: 1982, attack: 82, defence: 91, goalkeeping: 88 },
  { name: "Germany",          flag: "🇩🇪", year: 2014, attack: 88, defence: 86, goalkeeping: 85 },
  { name: "Spain",            flag: "🇪🇸", year: 2010, attack: 87, defence: 88, goalkeeping: 84 },
  { name: "Argentina",        flag: "🇦🇷", year: 2022, attack: 87, defence: 84, goalkeeping: 88 },
  { name: "France",           flag: "🇫🇷", year: 2018, attack: 85, defence: 84, goalkeeping: 82 },
  { name: "Germany",          flag: "🇩🇪", year: 1990, attack: 83, defence: 87, goalkeeping: 84 },
  { name: "Italy",            flag: "🇮🇹", year: 2006, attack: 81, defence: 88, goalkeeping: 86 },
  { name: "Brazil",           flag: "🇧🇷", year: 1994, attack: 86, defence: 84, goalkeeping: 85 },
  { name: "Brazil",           flag: "🇧🇷", year: 1982, attack: 89, defence: 78, goalkeeping: 77 },
  { name: "Netherlands",      flag: "🇳🇱", year: 2010, attack: 82, defence: 83, goalkeeping: 80 },
  { name: "England",          flag: "🏴󠁧󠁢󠁥󠁮󠁧󠁿", year: 1966, attack: 82, defence: 85, goalkeeping: 83 },
  { name: "Argentina",        flag: "🇦🇷", year: 2014, attack: 84, defence: 80, goalkeeping: 81 },
  // ── STRONG ───────────────────────────────────────────────────────────────
  { name: "Portugal",         flag: "🇵🇹", year: 2006, attack: 80, defence: 78, goalkeeping: 76 },
  { name: "Croatia",          flag: "🇭🇷", year: 2018, attack: 79, defence: 77, goalkeeping: 75 },
  { name: "Belgium",          flag: "🇧🇪", year: 2018, attack: 82, defence: 78, goalkeeping: 76 },
  { name: "Uruguay",          flag: "🇺🇾", year: 1970, attack: 78, defence: 80, goalkeeping: 77 },
  { name: "Uruguay",          flag: "🇺🇾", year: 2010, attack: 77, defence: 78, goalkeeping: 75 },
  { name: "Poland",           flag: "🇵🇱", year: 1982, attack: 78, defence: 75, goalkeeping: 74 },
  { name: "England",          flag: "🏴󠁧󠁢󠁥󠁮󠁧󠁿", year: 1990, attack: 74, defence: 77, goalkeeping: 75 },
  { name: "England",          flag: "🏴󠁧󠁢󠁥󠁮󠁧󠁿", year: 2018, attack: 75, defence: 73, goalkeeping: 72 },
  { name: "Portugal",         flag: "🇵🇹", year: 2022, attack: 79, defence: 76, goalkeeping: 74 },
  { name: "Spain",            flag: "🇪🇸", year: 2022, attack: 78, defence: 77, goalkeeping: 75 },
  { name: "Croatia",          flag: "🇭🇷", year: 2022, attack: 75, defence: 76, goalkeeping: 74 },
  { name: "Brazil",           flag: "🇧🇷", year: 2014, attack: 76, defence: 75, goalkeeping: 77 },
  { name: "Turkey",           flag: "🇹🇷", year: 2002, attack: 76, defence: 74, goalkeeping: 72 },
  { name: "Austria",          flag: "🇦🇹", year: 1954, attack: 78, defence: 72, goalkeeping: 71 },
  { name: "Romania",          flag: "🇷🇴", year: 1994, attack: 75, defence: 71, goalkeeping: 70 },
  { name: "Czechoslovakia",   flag: "🇨🇿", year: 1962, attack: 76, defence: 73, goalkeeping: 72 },
  { name: "Italy",            flag: "🇮🇹", year: 1994, attack: 73, defence: 78, goalkeeping: 76 },
  { name: "Germany",          flag: "🇩🇪", year: 2006, attack: 78, defence: 77, goalkeeping: 75 },
  { name: "Argentina",        flag: "🇦🇷", year: 2006, attack: 77, defence: 74, goalkeeping: 72 },
  // ── DARK HORSES ──────────────────────────────────────────────────────────
  { name: "Morocco",          flag: "🇲🇦", year: 2022, attack: 72, defence: 75, goalkeeping: 74 },
  { name: "South Korea",      flag: "🇰🇷", year: 2002, attack: 70, defence: 71, goalkeeping: 69 },
  { name: "Cameroon",         flag: "🇨🇲", year: 1990, attack: 71, defence: 68, goalkeeping: 67 },
  { name: "Senegal",          flag: "🇸🇳", year: 2002, attack: 69, defence: 67, goalkeeping: 66 },
  { name: "Colombia",         flag: "🇨🇴", year: 2014, attack: 73, defence: 68, goalkeeping: 67 },
  { name: "Mexico",           flag: "🇲🇽", year: 2006, attack: 68, defence: 66, goalkeeping: 65 },
  { name: "Sweden",           flag: "🇸🇪", year: 1994, attack: 70, defence: 68, goalkeeping: 67 },
  { name: "Poland",           flag: "🇵🇱", year: 1974, attack: 72, defence: 69, goalkeeping: 68 },
  { name: "USA",              flag: "🇺🇸", year: 2002, attack: 65, defence: 67, goalkeeping: 64 },
  { name: "Denmark",          flag: "🇩🇰", year: 2002, attack: 67, defence: 66, goalkeeping: 65 },
  { name: "Bulgaria",         flag: "🇧🇬", year: 1994, attack: 73, defence: 65, goalkeeping: 64 },
  { name: "Nigeria",          flag: "🇳🇬", year: 1994, attack: 71, defence: 64, goalkeeping: 63 },
  { name: "Republic of Ireland", flag: "🇮🇪", year: 1990, attack: 62, defence: 69, goalkeeping: 68 },
  { name: "Ghana",            flag: "🇬🇭", year: 2010, attack: 68, defence: 65, goalkeeping: 63 },
  { name: "North Korea",      flag: "🇰🇵", year: 1966, attack: 67, defence: 63, goalkeeping: 62 },
  { name: "Mexico",           flag: "🇲🇽", year: 1970, attack: 64, defence: 62, goalkeeping: 61 },
  { name: "Algeria",          flag: "🇩🇿", year: 1982, attack: 64, defence: 60, goalkeeping: 59 },
  { name: "Iran",             flag: "🇮🇷", year: 1978, attack: 60, defence: 60, goalkeeping: 58 },
  { name: "Costa Rica",       flag: "🇨🇷", year: 2014, attack: 65, defence: 70, goalkeeping: 71 },
  { name: "Greece",           flag: "🇬🇷", year: 2010, attack: 62, defence: 68, goalkeeping: 67 },
  { name: "New Zealand",      flag: "🇳🇿", year: 1982, attack: 55, defence: 57, goalkeeping: 55 },
  { name: "Zaire",            flag: "🇨🇩", year: 1974, attack: 52, defence: 50, goalkeeping: 50 },
];

/** Fisher-Yates shuffle a copy of the historical pool using seeded RNG, return count unique teams */
function pickHistoricalOpponents(rng: SeededRandom, count: number): AITeam[] {
  const shuffled = [...HISTORICAL_WC_TEAMS];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(rng.next() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled.slice(0, Math.min(count, shuffled.length));
}

function simulateMatch(
  attackA: number,
  defenceA: number,
  gkA: number,
  attackB: number,
  defenceB: number,
  gkB: number,
  rng: SeededRandom
): { goalsA: number; goalsB: number } {
  const effectiveDefB = defenceB * 0.7 + gkB * 0.3;
  const effectiveDefA = defenceA * 0.7 + gkA * 0.3;

  // Each side's raw probability from their attack vs the opponent's defence
  const rawA = attackA / (attackA + effectiveDefB);
  const rawB = attackB / (attackB + effectiveDefA);

  // Stretch differences away from 0.5 so skill gaps matter,
  // but clamp to [0.1, 0.9] to keep upsets possible
  const amplify = (p: number) =>
    Math.max(0.1, Math.min(0.9, 0.5 + (p - 0.5) * 2.0));

  const expectedGoalsA = amplify(rawA) * 3.0;
  const expectedGoalsB = amplify(rawB) * 3.0;

  return {
    goalsA: samplePoisson(expectedGoalsA, rng),
    goalsB: samplePoisson(expectedGoalsB, rng),
  };
}

function samplePoisson(lambda: number, rng: SeededRandom): number {
  const L = Math.exp(-lambda);
  let k = 0;
  let p = 1;
  do {
    k++;
    p *= rng.next();
  } while (p > L);
  return Math.max(0, k - 1);
}

const STAGE_LABELS: Record<TournamentStage, string> = {
  group: "Group Stage",
  r32: "Round of 32",
  r16: "Round of 16",
  qf: "Quarter-Final",
  sf: "Semi-Final",
  third: "Third-Place Play-off",
  final: "Final",
};

function headline(
  stage: TournamentStage,
  goalsFor: number,
  goalsAgainst: number,
  topPlayer: string,
  opponentName: string,
  outcome: MatchResult["outcome"],
  rng: SeededRandom,
  teamName: string
): string {
  const stageName = STAGE_LABELS[stage];

  if (outcome === "pen_win") {
    return `🥅 ${topPlayer} steps up — penalty saved! ${teamName} advance on penalties in the ${stageName}!`;
  }
  if (outcome === "pen_loss") {
    return `💔 ${teamName} crash out on penalties in the ${stageName} against ${opponentName}.`;
  }
  if (outcome === "win") {
    if (goalsFor >= 3) {
      const verbs = ["runs riot", "tears apart", "dismantles"];
      return `⚽ ${topPlayer} ${verbs[Math.floor(rng.next() * verbs.length)]} ${opponentName} — ${goalsFor}-${goalsAgainst} in the ${stageName}!`;
    }
    if (goalsFor - goalsAgainst === 1) {
      const moments = ["a late winner", "an injury-time strike", "a moment of magic"];
      return `⚽ ${topPlayer} with ${moments[Math.floor(rng.next() * moments.length)]} — ${teamName} edge past ${opponentName} ${goalsFor}-${goalsAgainst}!`;
    }
    return `⚽ ${teamName} defeat ${opponentName} ${goalsFor}-${goalsAgainst} in the ${stageName}.`;
  }
  if (outcome === "loss") {
    return `💔 ${teamName} fall ${goalsFor}-${goalsAgainst} to ${opponentName} in the ${stageName}.`;
  }
  return `⚖️ ${teamName} draw ${goalsFor}-${goalsAgainst} with ${opponentName} in the Group Stage.`;
}

function pickTopScorer(players: (DraftedPlayer | null)[]): string {
  const attackers = players.filter((p) => p && p.player.position !== "GK") as DraftedPlayer[];
  if (!attackers.length) return "The striker";
  const sorted = [...attackers].sort((a, b) => b.player.overall - a.player.overall);
  return sorted[0].player.name;
}

export function runTournament(
  playerStats: TeamStats,
  formation: Formation,
  draftedPlayers: (DraftedPlayer | null)[],
  seed: number = Date.now(),
  teamName: string = "Dream Team"
): TournamentResult {
  const rng = new SeededRandom(seed);
  const { attack: boostedAttack, defence: boostedDefence } = computeMatchRatings(playerStats, formation);
  const playerGk = playerStats.goalkeeping;

  const aiTeams = pickHistoricalOpponents(rng, 48);
  let playerTournamentGoals = 0;
  let hatTrickHero: string | null = null;

  const allMatches: MatchResult[] = [];
  let survived = true;
  let finalStage: TournamentStage = "group";
  let champion = false;

  // ── Player stat setup (statsRng is separate so match outcomes are unaffected) ──
  const statsRng = new SeededRandom(seed + 42);
  const filledPlayers = draftedPlayers.filter(Boolean) as DraftedPlayer[];
  const pStats: Record<string, PlayerTournamentStats> = {};
  for (const p of filledPlayers) pStats[p.player.id] = { goals: 0, assists: 0, cleanSheets: 0 };

  const fwdPool = filledPlayers.filter((p) => p.player.position === "FWD");
  const midPool = filledPlayers.filter((p) => p.player.position === "MID");
  const defPool = filledPlayers.filter((p) => p.player.position === "DEF");
  const gkPool  = filledPlayers.filter((p) => p.player.position === "GK");
  const outfield = filledPlayers.filter((p) => p.player.position !== "GK");

  function pickFrom(pool: DraftedPlayer[], fallback: DraftedPlayer[]): DraftedPlayer {
    const arr = pool.length ? pool : fallback;
    return arr[Math.floor(statsRng.next() * arr.length)];
  }

  // Assign goals for a match and return the name of the player who scored most
  function assignGoals(goalsCount: number): string {
    const matchTally: Record<string, number> = {};
    for (let i = 0; i < goalsCount; i++) {
      const roll = statsRng.next();
      const scorer = roll < 0.6
        ? pickFrom(fwdPool, outfield)
        : roll < 0.9
        ? pickFrom(midPool, outfield)
        : pickFrom(defPool, outfield);
      pStats[scorer.player.id].goals++;
      matchTally[scorer.player.id] = (matchTally[scorer.player.id] ?? 0) + 1;
    }
    // Return the player with the most goals in this match (for headline)
    const topId = Object.entries(matchTally).sort(([, a], [, b]) => b - a)[0]?.[0];
    return filledPlayers.find((p) => p.player.id === topId)?.player.name ?? pickTopScorer(draftedPlayers);
  }

  // Assign assists for a match
  function assignAssists(goalsCount: number) {
    const assists = Math.round(goalsCount * 0.7);
    for (let i = 0; i < assists; i++) {
      const roll = statsRng.next();
      const assister = roll < 0.5
        ? pickFrom(midPool, outfield)
        : roll < 0.75
        ? pickFrom(fwdPool, outfield)
        : pickFrom(defPool, outfield);
      pStats[assister.player.id].assists++;
    }
  }

  function oppOverall(o: AITeam) {
    return Math.round(o.attack * 0.35 + o.defence * 0.4 + o.goalkeeping * 0.25);
  }

  // ── GROUP STAGE (3 group matches) ─────────────────────────────────────────
  const groupOpponents = aiTeams.slice(0, 3);
  let groupPoints = 0;
  let groupGF = 0;
  let groupGA = 0;

  for (const opp of groupOpponents) {
    const { goalsA, goalsB } = simulateMatch(
      boostedAttack,
      boostedDefence,
      playerGk,
      opp.attack,
      opp.defence,
      opp.goalkeeping,
      rng
    );
    groupGF += goalsA;
    groupGA += goalsB;
    playerTournamentGoals += goalsA;

    const matchScorer = assignGoals(goalsA);
    assignAssists(goalsA);
    if (goalsA >= 3 && !hatTrickHero) hatTrickHero = matchScorer;

    let outcome: MatchResult["outcome"];
    if (goalsA > goalsB) { outcome = "win"; groupPoints += 3; }
    else if (goalsA === goalsB) { outcome = "draw"; groupPoints += 1; }
    else { outcome = "loss"; }

    if (goalsB === 0) {
      for (const p of [...defPool, ...gkPool]) pStats[p.player.id].cleanSheets++;
    }

    allMatches.push({
      opponent: opp.name,
      opponentFlag: opp.flag,
      opponentYear: opp.year,
      opponentOverall: oppOverall(opp),
      goalsFor: goalsA,
      goalsAgainst: goalsB,
      outcome,
      stage: "group",
      headline: headline("group", goalsA, goalsB, matchScorer, opp.name, outcome, rng, teamName),
    });
  }

  // Qualify if 4+ points (generously) OR decent goal difference
  const qualified = groupPoints >= 4 || (groupPoints >= 3 && groupGF - groupGA >= 0);
  if (!qualified) {
    survived = false;
    finalStage = "group";
  }

  // ── KNOCKOUT ROUNDS ───────────────────────────────────────────────────────
  const knockoutStages: TournamentStage[] = ["r32", "r16", "qf", "sf", "final"];
  let aiIdx = 3;

  if (survived) {
    for (const stage of knockoutStages) {
      const opp = aiTeams[aiIdx++] || aiTeams[0];
      const { goalsA, goalsB } = simulateMatch(
        boostedAttack,
        boostedDefence,
        playerGk,
        opp.attack,
        opp.defence,
        opp.goalkeeping,
        rng
      );

      const matchScorer = assignGoals(goalsA);
      assignAssists(goalsA);
      if (goalsB === 0) {
        for (const p of [...defPool, ...gkPool]) pStats[p.player.id].cleanSheets++;
      }

      let outcome: MatchResult["outcome"];

      if (goalsA > goalsB) {
        outcome = "win";
      } else if (goalsA < goalsB) {
        outcome = "loss";
        survived = false;
        finalStage = stage;
        allMatches.push({
          opponent: opp.name,
          opponentFlag: opp.flag,
          opponentYear: opp.year,
          opponentOverall: oppOverall(opp),
          goalsFor: goalsA,
          goalsAgainst: goalsB,
          outcome,
          stage,
          headline: headline(stage, goalsA, goalsB, matchScorer, opp.name, "loss", rng, teamName),
        });
        break;
      } else {
        // Draw → penalties
        const pWin = playerGk / (playerGk + opp.goalkeeping);
        if (rng.next() < pWin) {
          outcome = "pen_win";
        } else {
          outcome = "pen_loss";
          survived = false;
          finalStage = stage;
          allMatches.push({
            opponent: opp.name,
            opponentFlag: opp.flag,
            opponentYear: opp.year,
            opponentOverall: oppOverall(opp),
            goalsFor: goalsA,
            goalsAgainst: goalsB,
            outcome,
            stage,
            penalties: true,
            headline: headline(stage, goalsA, goalsB, matchScorer, opp.name, "pen_loss", rng, teamName),
          });
          break;
        }
      }

      if (goalsA >= 3 && !hatTrickHero) hatTrickHero = matchScorer;
      playerTournamentGoals += goalsA;

      allMatches.push({
        opponent: opp.name,
        opponentFlag: opp.flag,
        opponentYear: opp.year,
        opponentOverall: oppOverall(opp),
        goalsFor: goalsA,
        goalsAgainst: goalsB,
        outcome,
        stage,
        penalties: outcome === "pen_win",
        headline: headline(stage, goalsA, goalsB, matchScorer, opp.name, outcome, rng, teamName),
      });

      if (stage === "final" && survived) {
        champion = true;
        finalStage = "final";
      } else if (survived) {
        finalStage = stage;
      }
    }
  }

  // Golden Boot — player with most goals
  let goldenBootPlayer = filledPlayers[0]?.player.name ?? "—";
  let maxGoals = -1;
  for (const p of filledPlayers) {
    if (pStats[p.player.id].goals > maxGoals) {
      maxGoals = pStats[p.player.id].goals;
      goldenBootPlayer = p.player.name;
    }
  }

  // Player of Tournament — highest G + A×0.6
  let playerOfTournament = filledPlayers[0]?.player.name ?? "—";
  let potScore = -1;
  for (const p of filledPlayers) {
    const s = pStats[p.player.id];
    const score = s.goals + s.assists * 0.6;
    if (score > potScore) { potScore = score; playerOfTournament = p.player.name; }
  }

  // Tournament top scorer (AI generated)
  const tournamentTopGoals = playerTournamentGoals + Math.round(rng.next() * 4 + 1);
  const goldenBoot = playerTournamentGoals >= tournamentTopGoals;
  const tournamentTopScorerName = goldenBoot
    ? goldenBootPlayer
    : ["Ronaldo", "Messi", "Müller", "Klinsmann", "Drogba"][
        Math.floor(rng.next() * 5)
      ];

  return {
    eliminated: !survived || !champion,
    stage: finalStage,
    champion,
    matches: allMatches,
    topScorer: goldenBootPlayer,
    topScorerGoals: playerTournamentGoals,
    tournamentTopScorer: tournamentTopScorerName,
    tournamentTopScorerGoals: tournamentTopGoals,
    goldenBoot,
    hatTrickHero,
    playerTournamentStats: pStats,
    goldenBootPlayer,
    playerOfTournament,
  };
}

// ── PUBLIC HELPERS ────────────────────────────────────────────────────────────

export interface GroupDrawTeam {
  name: string;
  flag: string;
  year: number;
  attack: number;
  defence: number;
  goalkeeping: number;
}

export interface WinOdds {
  pGroup: number;
  pQF: number;
  pSF: number;
  pWin: number;
  expectedStage: string;
  overallRating: number;
}

/** Returns the 3 historical opponents the player will face in the group stage.
 *  Uses the same seed as runTournament so the draw is consistent. */
export function getGroupDraw(seed: number): GroupDrawTeam[] {
  const rng = new SeededRandom(seed);
  return pickHistoricalOpponents(rng, 3).map((t) => ({
    name: t.name,
    flag: t.flag,
    year: t.year,
    attack: t.attack,
    defence: t.defence,
    goalkeeping: t.goalkeeping,
  }));
}

/** Estimates win probability and expected tournament stage from team stats. */
export function calculateWinOdds(stats: TeamStats, formation: Formation): WinOdds {
  const { attack, defence } = computeMatchRatings(stats, formation);
  const r = (attack + defence) / 2;
  const clamp = (v: number, lo: number, hi: number) =>
    Math.min(hi, Math.max(lo, Math.round(v)));

  const pGroup = clamp(40 + (r - 65) * 1.8, 15, 92);
  const pQF    = clamp(20 + (r - 70) * 1.4,  2, 72);
  const pSF    = clamp( 8 + (r - 76) * 1.0,  1, 52);
  const base   = Math.max(0, (r - 55) / 45);
  const pWin   = clamp(Math.pow(base, 2) * 40, 1, 38);

  let expectedStage: string;
  if (r < 62)      expectedStage = "Group Stage";
  else if (r < 70) expectedStage = "Round of 16";
  else if (r < 77) expectedStage = "Quarter-Final";
  else if (r < 83) expectedStage = "Semi-Final";
  else if (r < 89) expectedStage = "The Final";
  else             expectedStage = "Champions 🏆";

  return { pGroup, pQF, pSF, pWin, expectedStage, overallRating: Math.round(r) };
}

export function detectSpecialMoments(
  players: (DraftedPlayer | null)[],
  result: TournamentResult & { hatTrickHero?: string | null },
  aiAttack: number
) {
  const filled = players.filter(Boolean) as DraftedPlayer[];

  const nations = new Set(filled.map((p) => p.team));
  const decades = new Set(filled.map((p) => Math.floor(p.year / 10) * 10));
  const impossibleXI = nations.size >= 5 && decades.size >= 5;

  const darkHorsePicks = filled
    .map((p, i) => ({ p, i }))
    .filter(({ p }) => {
      const powerhouses = ["Brazil", "Germany", "Italy", "France", "Spain", "Argentina", "Netherlands", "England"];
      return !powerhouses.includes(p.team);
    })
    .map(({ i }) => i);

  const playerOveralls = filled.map((p) =>
    Math.round(p.player.overall * (1 - p.penaltyPercent / 100))
  );
  const avgOverall = playerOveralls.reduce((a, b) => a + b, 0) / playerOveralls.length;
  const giantKilling = avgOverall < 78 && result.champion;

  return {
    impossibleXI,
    darkHorsePicks,
    giantKilling,
    goldenBoot: result.goldenBoot,
    hatTrickHero: result.hatTrickHero ?? null,
  };
}
