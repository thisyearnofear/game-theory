/**
 * useGameStats — persistent game stats + history backed by localStorage.
 *
 * Tracks aggregate Trustfall stats (wins/losses/ties, XLM net, cooperation
 * rate) and a rolling history of the last 50 games. All localStorage access
 * is wrapped in try/catch so a corrupted/unavailable store never crashes the
 * UI.
 */

import { useCallback } from "react";

// ============================================================================
// Types
// ============================================================================

export type GameOutcome = "win" | "lose" | "tie";
export type GameChoice = "C" | "D";

export interface GameRecord {
  gameId: string;
  opponent: string;
  yourMove: GameChoice;
  opponentMove: GameChoice;
  outcome: GameOutcome;
  stake: number;
  payout: number;
  timestamp: number;
}

export interface GameStats {
  totalGames: number;
  wins: number;
  losses: number;
  ties: number;
  totalXlmWon: number;
  cooperationRate: number;
  history: GameRecord[];
}

// ============================================================================
// Constants
// ============================================================================

const STORAGE_KEY = "trustfall:game-stats";
const MAX_HISTORY = 50;

const EMPTY_STATS: GameStats = {
  totalGames: 0,
  wins: 0,
  losses: 0,
  ties: 0,
  totalXlmWon: 0,
  cooperationRate: 0,
  history: [],
};

// ============================================================================
// Storage helpers (all wrapped in try/catch)
// ============================================================================

function loadStats(): GameStats {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return { ...EMPTY_STATS };
    const parsed = JSON.parse(raw) as Partial<GameStats>;
    return {
      totalGames: typeof parsed.totalGames === "number" ? parsed.totalGames : 0,
      wins: typeof parsed.wins === "number" ? parsed.wins : 0,
      losses: typeof parsed.losses === "number" ? parsed.losses : 0,
      ties: typeof parsed.ties === "number" ? parsed.ties : 0,
      totalXlmWon:
        typeof parsed.totalXlmWon === "number" ? parsed.totalXlmWon : 0,
      cooperationRate:
        typeof parsed.cooperationRate === "number" ? parsed.cooperationRate : 0,
      history: Array.isArray(parsed.history) ? parsed.history : [],
    };
  } catch {
    return { ...EMPTY_STATS };
  }
}

function saveStats(stats: GameStats): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(stats));
  } catch {
    /* ignore quota / serialization errors */
  }
}

function clearStats(): void {
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch {
    /* ignore */
  }
}

// ============================================================================
// Hook
// ============================================================================

/**
 * Persistent game stats. Reads are fresh on every call (localStorage is
 * synchronous) so callers always see consistent data after `recordGame`.
 */
export function useGameStats(): {
  recordGame: (record: GameRecord) => void;
  getStats: () => GameStats;
  resetStats: () => void;
} {
  const getStats = useCallback((): GameStats => loadStats(), []);

  const recordGame = useCallback((record: GameRecord): void => {
    try {
      const current = loadStats();

      // Avoid double-recording the same game id.
      const alreadyRecorded = current.history.some(
        (h) => h.gameId === record.gameId,
      );
      if (alreadyRecorded) return;

      const history = [record, ...current.history].slice(0, MAX_HISTORY);

      const wins = current.wins + (record.outcome === "win" ? 1 : 0);
      const losses = current.losses + (record.outcome === "lose" ? 1 : 0);
      const ties = current.ties + (record.outcome === "tie" ? 1 : 0);
      const totalGames = wins + losses + ties;

      const totalXlmWon = current.totalXlmWon + record.payout;

      const cooperativeGames =
        current.history.filter((h) => h.yourMove === "C").length +
        (record.yourMove === "C" ? 1 : 0);
      const cooperationRate =
        totalGames > 0 ? Math.round((cooperativeGames / totalGames) * 100) : 0;

      const next: GameStats = {
        totalGames,
        wins,
        losses,
        ties,
        totalXlmWon,
        cooperationRate,
        history,
      };

      saveStats(next);
    } catch {
      /* never let stats crash the game flow */
    }
  }, []);

  const resetStats = useCallback((): void => {
    clearStats();
  }, []);

  return { recordGame, getStats, resetStats };
}
