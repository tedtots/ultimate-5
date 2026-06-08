export type Position = "GK" | "DEF" | "MID" | "FWD";

export interface Player {
  id: string;
  name: string;
  position: Position;
  age_at_tournament: number;
  overall: number;
}

export interface Squad {
  team: string;
  year: number;
  nation_code: string; // ISO 3166-1 alpha-2 for flag emoji
  flag: string; // emoji flag
  players: Player[];
}

export interface TeamYearMeta {
  key: string; // e.g. "brazil_2002"
  team: string;
  year: number;
  nation_code: string;
  flag: string;
  weight: number; // spin pool weight
  tier: "powerhouse" | "strong" | "dark_horse";
}

export type FormationId =
  | "1-2-1"
  | "2-2"
  | "2-1-1"
  | "1-1-2"
  | "3-1"
  | "1-3";

export interface Formation {
  id: FormationId;
  name: string;
  description: string;
  slots: Position[]; // GK first, then 4 outfield
  attackBonus: number;
  defenceBonus: number;
}

export interface DraftedPlayer {
  player: Player;
  team: string;
  year: number;
  flag: string;
  slotIndex: number;
  penaltyPercent: number; // 0, 5, or 15
}

export interface TeamStats {
  attack: number;
  midfield: number;
  defence: number;
  goalkeeping: number;
}

export interface MatchResult {
  opponent: string;
  opponentFlag: string;
  opponentYear?: number;
  opponentOverall?: number;
  goalsFor: number;
  goalsAgainst: number;
  outcome: "win" | "draw" | "loss" | "pen_win" | "pen_loss";
  stage: TournamentStage;
  headline: string;
  penalties?: boolean;
}

export type TournamentStage =
  | "group"
  | "r32"
  | "r16"
  | "qf"
  | "sf"
  | "third"
  | "final";

export interface PlayerTournamentStats {
  goals: number;
  assists: number;
  cleanSheets: number;
}

export interface TournamentResult {
  eliminated: boolean;
  stage: TournamentStage;
  champion: boolean;
  matches: MatchResult[];
  topScorer: string;
  topScorerGoals: number;
  tournamentTopScorer: string;
  tournamentTopScorerGoals: number;
  goldenBoot: boolean;
  hatTrickHero?: string | null;
  playerTournamentStats: Record<string, PlayerTournamentStats>;
  goldenBootPlayer: string;
  playerOfTournament: string;
}

export interface GameState {
  phase:
    | "landing"
    | "formation"
    | "draft"
    | "reveal"
    | "simulation"
    | "result"
    | "leaderboard";
  formation: Formation | null;
  draftedPlayers: (DraftedPlayer | null)[];
  currentSlot: number;
  wildcardUsed: boolean;
  teamStats: TeamStats | null;
  tournamentResult: TournamentResult | null;
  streak: number;
  expertMode: boolean;
}

export interface LeaderboardEntry {
  id: string;
  nickname: string;
  streak: number;
  formation: string;
  dream_xi_summary: string;
  created_at: string;
}

export interface SpecialMoments {
  impossibleXI: boolean;
  darkHorsePicks: number[];
  giantKilling: boolean;
  goldenBoot: boolean;
  hatTrickHero: string | null;
}
