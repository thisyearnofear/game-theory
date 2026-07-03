import { Buffer } from "buffer";
import { useCallback, useState } from "react";
import { useWallet } from "./useWallet";
import {
  Client as ZkDilemmaClient,
  type GameStatus,
  type MatchStatus as SdkMatchStatus,
  type Game,
  type Match,
} from "../contracts/zk_dilemma/src/index";
import { rpcUrl, networkPassphrase } from "../contracts/util";

// ============================================================================
// Types
// ============================================================================

export type GameMove = "C" | "D";

/** Normalized game state for UI consumption */
export interface GameState {
  player1: string;
  player2: string | null;
  commitment1: string;
  commitment2: string | null;
  move1: GameMove | null;
  move2: GameMove | null;
  nonce1: string | null;
  nonce2: string | null;
  stake: string;
  status: string;
  created_at: string;
  commit_deadline: string;
  reveal_deadline: string;
}

export interface GameListItem {
  id: number;
  player1: string;
  stake: string;
  status: string;
  created_at: string;
}

export type MatchStatus =
  | "AwaitingJoin"
  | "InProgress"
  | "AwaitingNextRound"
  | "Completed"
  | "Cancelled";

/** Normalized match state for UI consumption */
export interface MatchState {
  player1: string;
  player2: string | null;
  target_wins: number;
  p1_wins: number;
  p2_wins: number;
  ties: number;
  best_of: number;
  stake: string;
  current_round: number;
  current_game_id: number;
  status: MatchStatus;
  created_at: string;
  next_round_deadline: string;
}

export interface MatchListItem {
  id: number;
  player1: string;
  player2: string | null;
  best_of: number;
  stake: string;
  status: MatchStatus;
  created_at: string;
}

// ============================================================================
// Helpers
// ============================================================================

const CONTRACT_ID = import.meta.env.VITE_ZK_DILEMMA_CONTRACT_ID || "";

/** Parse a `Game` from the SDK's tagged-union format into a flat UI object */
function parseGame(
  raw: Game | Record<string, unknown> | null,
): GameState | null {
  if (!raw) return null;
  const r = raw as Record<
    string,
    string | bigint | number | Buffer | null | undefined
  >;
  return {
    player1: String(r.player1 ?? ""),
    player2: r.player2 != null ? String(r.player2) : null,
    commitment1: String(r.commitment1 ?? ""),
    commitment2: r.commitment2 != null ? String(r.commitment2) : null,
    move1: r.move1 ? (String(r.move1) as GameMove) : null,
    move2: r.move2 ? (String(r.move2) as GameMove) : null,
    nonce1: r.nonce1 != null ? String(r.nonce1) : null,
    nonce2: r.nonce2 != null ? String(r.nonce2) : null,
    stake: String(r.stake ?? "0"),
    status: gameStatusToString(r.status as GameStatus | undefined),
    created_at: String(r.created_at ?? "0"),
    commit_deadline: String(r.commit_deadline ?? "0"),
    reveal_deadline: String(r.reveal_deadline ?? "0"),
  };
}

/** Convert SDK tagged-union GameStatus to a simple string */
function gameStatusToString(status: GameStatus | undefined): string {
  if (!status) return "AwaitingPlayer2";
  if (typeof status === "object" && "tag" in status) {
    return status.tag;
  }
  return String(status);
}

/** Convert SDK tagged-union MatchStatus to a simple union string */
function matchStatusToString(status: SdkMatchStatus | undefined): MatchStatus {
  if (!status) return "AwaitingJoin";
  if (typeof status === "object" && "tag" in status) {
    return status.tag as MatchStatus;
  }
  return String(status) as MatchStatus;
}

/** Parse a `Match` from the SDK's tagged-union format into a flat UI object */
function parseMatch(
  raw: Match | Record<string, unknown> | null,
): MatchState | null {
  if (!raw) return null;
  const r = raw as Record<
    string,
    string | bigint | number | Buffer | null | undefined
  >;
  return {
    player1: String(r.player1 ?? ""),
    player2: r.player2 != null ? String(r.player2) : null,
    target_wins: Number(r.target_wins ?? 0),
    p1_wins: Number(r.p1_wins ?? 0),
    p2_wins: Number(r.p2_wins ?? 0),
    ties: Number(r.ties ?? 0),
    best_of: Number(r.best_of ?? 0),
    stake: String(r.stake ?? "0"),
    current_round: Number(r.current_round ?? 0),
    current_game_id: Number(r.current_game_id ?? 0),
    status: matchStatusToString(r.status as SdkMatchStatus | undefined),
    created_at: String(r.created_at ?? "0"),
    next_round_deadline: String(r.next_round_deadline ?? "0"),
  };
}

/** Create a contract client instance */
function createClient(): ZkDilemmaClient {
  if (!CONTRACT_ID) {
    throw new Error(
      "ZK Dilemma contract ID not configured. Set VITE_ZK_DILEMMA_CONTRACT_ID in .env",
    );
  }
  return new ZkDilemmaClient({
    contractId: CONTRACT_ID,
    networkPassphrase,
    rpcUrl,
    allowHttp: true,
  });
}

interface Signable {
  signAndSend: (opts: {
    signTransaction: NonNullable<
      ReturnType<typeof import("./useWallet").useWallet>["signTransaction"]
    >;
  }) => Promise<unknown>;
}

// ============================================================================
// Hook
// ============================================================================

export function useZKDilemma() {
  const { address, signTransaction } = useWallet();
  const [games, setGames] = useState<GameListItem[]>([]);
  const [currentGame, setCurrentGame] = useState<GameState | null>(null);
  const [matches, setMatches] = useState<MatchListItem[]>([]);
  const [currentMatch, setCurrentMatch] = useState<MatchState | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  /** Sign & send wrapper */
  const sas = useCallback(
    async (tx: Signable): Promise<unknown> => {
      if (!signTransaction) throw new Error("Wallet not connected");
      return await tx.signAndSend({ signTransaction });
    },
    [signTransaction],
  );

  /**
   * Fetch game details from the contract.
   */
  const fetchGame = useCallback(
    async (gameId: number): Promise<GameState | null> => {
      try {
        const client = createClient();
        const tx = await client.get_game({ game_id: BigInt(gameId) });
        const raw: Record<string, unknown> | null = (await sas(tx)) as Record<
          string,
          unknown
        > | null;
        return parseGame(raw);
      } catch (err) {
        console.error(`[useZKDilemma] fetchGame(${gameId}) failed:`, err);
        return null;
      }
    },
    [sas],
  );

  /**
   * Fetch all available games by checking game count and iterating.
   */
  const fetchGames = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const client = createClient();
      const countTx = await client.get_game_count();
      const count = Number(((await sas(countTx)) as number) ?? 0);

      const gameList: GameListItem[] = [];
      for (let i = 1; i <= count; i++) {
        try {
          const tx = await client.get_game({ game_id: BigInt(i) });
          const raw: unknown = await sas(tx);
          const parsed = parseGame(raw as Record<string, unknown> | null);
          if (parsed) {
            gameList.push({
              id: i,
              player1: parsed.player1,
              stake: parsed.stake,
              status: parsed.status,
              created_at: parsed.created_at,
            });
          }
        } catch {
          // Skip games that fail to load
        }
      }
      setGames(gameList);
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      setError(`Failed to fetch games: ${message}`);
      console.error("[useZKDilemma] fetchGames error:", err);
    } finally {
      setIsLoading(false);
    }
  }, [sas]);

  /**
   * Get current game count from the contract.
   */
  const getGameCount = useCallback(async (): Promise<number> => {
    const client = createClient();
    const tx = await client.get_game_count();
    return Number(((await sas(tx)) as number) ?? 0);
  }, [sas]);

  /**
   * Create a new game.
   */
  const createGame = useCallback(
    async (
      commitmentHex: string,
      proofHex: string,
      stakeStroops: string,
    ): Promise<number> => {
      if (!address) throw new Error("Wallet not connected");
      setIsLoading(true);
      setError(null);

      try {
        const client = createClient();
        const commitment = Buffer.from(commitmentHex, "hex");
        const proof = Buffer.from(proofHex, "hex");
        const tx = await client.create_game({
          player1: address,
          commitment,
          proof,
          stake: BigInt(stakeStroops),
        });
        const result = await sas(tx);
        const gameId = Number(result ?? 0);
        await fetchGames();
        return gameId;
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        setError(`Failed to create game: ${message}`);
        throw err;
      } finally {
        setIsLoading(false);
      }
    },
    [address, sas, fetchGames],
  );

  /**
   * Join an existing game.
   */
  const joinGame = useCallback(
    async (
      gameId: number,
      commitmentHex: string,
      proofHex: string,
    ): Promise<void> => {
      if (!address) throw new Error("Wallet not connected");
      setIsLoading(true);
      setError(null);

      try {
        const client = createClient();
        const commitment = Buffer.from(commitmentHex, "hex");
        const proof = Buffer.from(proofHex, "hex");
        const tx = await client.join_game({
          player2: address,
          game_id: BigInt(gameId),
          commitment,
          proof,
        });
        await sas(tx);
        await fetchGame(gameId).then(setCurrentGame);
        await fetchGames();
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        setError(`Failed to join game: ${message}`);
        throw err;
      } finally {
        setIsLoading(false);
      }
    },
    [address, sas, fetchGames, fetchGame],
  );

  /**
   * Reveal move for a committed game.
   */
  const revealMove = useCallback(
    async (gameId: number, move: GameMove, nonce: bigint): Promise<void> => {
      if (!address) throw new Error("Wallet not connected");
      setIsLoading(true);
      setError(null);

      try {
        const client = createClient();
        const tx = await client.reveal_move({
          player: address,
          game_id: BigInt(gameId),
          move_: move,
          nonce,
        });
        await sas(tx);
        await fetchGame(gameId).then(setCurrentGame);
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        setError(`Failed to reveal move: ${message}`);
        throw err;
      } finally {
        setIsLoading(false);
      }
    },
    [address, sas, fetchGame],
  );

  /**
   * Resolve a game (both moves revealed).
   */
  const resolveGame = useCallback(
    async (gameId: number): Promise<{ payout1: bigint; payout2: bigint }> => {
      setIsLoading(true);
      setError(null);

      try {
        const client = createClient();
        const tx = await client.resolve_game({ game_id: BigInt(gameId) });
        const result = (await sas(tx)) as readonly [bigint, bigint] | null;
        const [payout1, payout2] = result ?? [BigInt(0), BigInt(0)];
        await fetchGame(gameId).then(setCurrentGame);
        return { payout1, payout2 };
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        setError(`Failed to resolve game: ${message}`);
        throw err;
      } finally {
        setIsLoading(false);
      }
    },
    [sas, fetchGame],
  );

  /**
   * Claim forfeit (opponent didn't reveal in time).
   */
  const claimForfeit = useCallback(
    async (gameId: number): Promise<void> => {
      if (!address) throw new Error("Wallet not connected");
      setIsLoading(true);
      setError(null);

      try {
        const client = createClient();
        const tx = await client.claim_forfeit({
          claimant: address,
          game_id: BigInt(gameId),
        });
        await sas(tx);
        await fetchGame(gameId).then(setCurrentGame);
        await fetchGames();
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        setError(`Failed to claim forfeit: ${message}`);
        throw err;
      } finally {
        setIsLoading(false);
      }
    },
    [address, sas, fetchGame, fetchGames],
  );

  /**
   * Cancel a game that no one joined (reclaim stake after commit deadline).
   */
  const cancelGame = useCallback(
    async (gameId: number): Promise<void> => {
      if (!address) throw new Error("Wallet not connected");
      setIsLoading(true);
      setError(null);

      try {
        const client = createClient();
        const tx = await client.cancel_game({
          player1: address,
          game_id: BigInt(gameId),
        });
        await sas(tx);
        await fetchGame(gameId).then(setCurrentGame);
        await fetchGames();
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        setError(`Failed to cancel game: ${message}`);
        throw err;
      } finally {
        setIsLoading(false);
      }
    },
    [address, sas, fetchGame, fetchGames],
  );

  /**
   * Claim refund when both players failed to reveal (split escrow).
   */
  const claimRefund = useCallback(
    async (gameId: number): Promise<void> => {
      setIsLoading(true);
      setError(null);

      try {
        const client = createClient();
        const tx = await client.claim_refund({ game_id: BigInt(gameId) });
        await sas(tx);
        await fetchGame(gameId).then(setCurrentGame);
        await fetchGames();
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        setError(`Failed to claim refund: ${message}`);
        throw err;
      } finally {
        setIsLoading(false);
      }
    },
    [sas, fetchGame, fetchGames],
  );

  const clearError = useCallback(() => setError(null), []);

  // ==========================================================================
  // Match functions
  // ==========================================================================

  /**
   * Fetch match details from the contract.
   */
  const fetchMatch = useCallback(
    async (matchId: number): Promise<MatchState | null> => {
      try {
        const client = createClient();
        const tx = await client.get_match({ match_id: BigInt(matchId) });
        const raw: Record<string, unknown> | null = (await sas(tx)) as Record<
          string,
          unknown
        > | null;
        const parsed = parseMatch(raw as Match | null);
        setCurrentMatch(parsed);
        return parsed;
      } catch (err) {
        console.error(`[useZKDilemma] fetchMatch(${matchId}) failed:`, err);
        return null;
      }
    },
    [sas],
  );

  /**
   * Fetch all matches by checking match count and iterating.
   */
  const fetchMatches = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const client = createClient();
      const countTx = await client.get_match_count();
      const count = Number(((await sas(countTx)) as number) ?? 0);

      const matchList: MatchListItem[] = [];
      for (let i = 1; i <= count; i++) {
        try {
          const tx = await client.get_match({ match_id: BigInt(i) });
          const raw: unknown = await sas(tx);
          const parsed = parseMatch(raw as Match | null);
          if (parsed) {
            matchList.push({
              id: i,
              player1: parsed.player1,
              player2: parsed.player2,
              best_of: parsed.best_of,
              stake: parsed.stake,
              status: parsed.status,
              created_at: parsed.created_at,
            });
          }
        } catch {
          // Skip matches that fail to load
        }
      }
      setMatches(matchList);
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      setError(`Failed to fetch matches: ${message}`);
      console.error("[useZKDilemma] fetchMatches error:", err);
    } finally {
      setIsLoading(false);
    }
  }, [sas]);

  /**
   * Get current match count from the contract.
   */
  const getMatchCount = useCallback(async (): Promise<number> => {
    const client = createClient();
    const tx = await client.get_match_count();
    return Number(((await sas(tx)) as number) ?? 0);
  }, [sas]);

  /**
   * Create a new multi-round match.
   */
  const createMatch = useCallback(
    async (
      commitment: Buffer,
      proof: Buffer,
      stake: string,
      bestOf: number,
    ): Promise<{ matchId: number; gameId: number }> => {
      if (!address) throw new Error("Wallet not connected");
      setIsLoading(true);
      setError(null);

      try {
        const client = createClient();
        const tx = await client.create_match({
          player1: address,
          commitment,
          proof,
          stake: BigInt(stake),
          best_of: bestOf,
        });
        const result = (await sas(tx)) as readonly [bigint, bigint] | null;
        const [matchId, gameId] = result ?? [BigInt(0), BigInt(0)];
        await fetchMatches();
        return {
          matchId: Number(matchId),
          gameId: Number(gameId),
        };
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        setError(`Failed to create match: ${message}`);
        throw err;
      } finally {
        setIsLoading(false);
      }
    },
    [address, sas, fetchMatches],
  );

  /**
   * Join an existing match (joins its first round).
   */
  const joinMatch = useCallback(
    async (
      matchId: number,
      commitment: Buffer,
      proof: Buffer,
    ): Promise<void> => {
      if (!address) throw new Error("Wallet not connected");
      setIsLoading(true);
      setError(null);

      try {
        const client = createClient();
        const tx = await client.join_match({
          player2: address,
          match_id: BigInt(matchId),
          commitment,
          proof,
        });
        await sas(tx);
        await fetchMatch(matchId);
        await fetchMatches();
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        setError(`Failed to join match: ${message}`);
        throw err;
      } finally {
        setIsLoading(false);
      }
    },
    [address, sas, fetchMatch, fetchMatches],
  );

  /**
   * Start the next round of a match (called by player 1).
   * Returns the new game_id.
   */
  const startNextRound = useCallback(
    async (
      matchId: number,
      commitment: Buffer,
      proof: Buffer,
    ): Promise<number> => {
      if (!address) throw new Error("Wallet not connected");
      setIsLoading(true);
      setError(null);

      try {
        const client = createClient();
        const tx = await client.start_next_round({
          player1: address,
          match_id: BigInt(matchId),
          commitment,
          proof,
        });
        const result = (await sas(tx)) as bigint | null;
        const newGameId = Number(result ?? 0);
        await fetchMatch(matchId);
        return newGameId;
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        setError(`Failed to start next round: ${message}`);
        throw err;
      } finally {
        setIsLoading(false);
      }
    },
    [address, sas, fetchMatch],
  );

  /**
   * Join the next round of a match (called by player 2).
   */
  const joinNextRound = useCallback(
    async (
      matchId: number,
      commitment: Buffer,
      proof: Buffer,
    ): Promise<void> => {
      if (!address) throw new Error("Wallet not connected");
      setIsLoading(true);
      setError(null);

      try {
        const client = createClient();
        const tx = await client.join_next_round({
          player2: address,
          match_id: BigInt(matchId),
          commitment,
          proof,
        });
        await sas(tx);
        await fetchMatch(matchId);
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        setError(`Failed to join next round: ${message}`);
        throw err;
      } finally {
        setIsLoading(false);
      }
    },
    [address, sas, fetchMatch],
  );

  /**
   * Rematch: create a new match with the same opponent and settings.
   */
  const rematch = useCallback(
    async (
      oldMatchId: number,
      commitment: Buffer,
      proof: Buffer,
    ): Promise<{ matchId: number; gameId: number }> => {
      if (!address) throw new Error("Wallet not connected");
      setIsLoading(true);
      setError(null);

      try {
        const client = createClient();
        const tx = await client.rematch({
          player: address,
          old_match_id: BigInt(oldMatchId),
          commitment,
          proof,
        });
        const result = (await sas(tx)) as readonly [bigint, bigint] | null;
        const [matchId, gameId] = result ?? [BigInt(0), BigInt(0)];
        await fetchMatches();
        return {
          matchId: Number(matchId),
          gameId: Number(gameId),
        };
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        setError(`Failed to rematch: ${message}`);
        throw err;
      } finally {
        setIsLoading(false);
      }
    },
    [address, sas, fetchMatches],
  );

  /**
   * Cancel a match that is awaiting a join (player 1 only, after timeout).
   */
  const cancelMatch = useCallback(
    async (matchId: number): Promise<void> => {
      if (!address) throw new Error("Wallet not connected");
      setIsLoading(true);
      setError(null);

      try {
        const client = createClient();
        const tx = await client.cancel_match({
          player1: address,
          match_id: BigInt(matchId),
        });
        await sas(tx);
        await fetchMatch(matchId);
        await fetchMatches();
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        setError(`Failed to cancel match: ${message}`);
        throw err;
      } finally {
        setIsLoading(false);
      }
    },
    [address, sas, fetchMatch, fetchMatches],
  );

  /**
   * Cancel a match when the next round hasn't started in time.
   * Either player can call after the next_round_deadline passes.
   */
  const cancelMatchTimeout = useCallback(
    async (matchId: number): Promise<void> => {
      if (!address) throw new Error("Wallet not connected");
      setIsLoading(true);
      setError(null);

      try {
        const client = createClient();
        const tx = await client.cancel_match_timeout({
          player: address,
          match_id: BigInt(matchId),
        });
        await sas(tx);
        await fetchMatch(matchId);
        await fetchMatches();
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        setError(`Failed to cancel match (timeout): ${message}`);
        throw err;
      } finally {
        setIsLoading(false);
      }
    },
    [address, sas, fetchMatch, fetchMatches],
  );

  // ==========================================================================
  // Accreditation (Private Allowlist Membership)
  // ==========================================================================

  /**
   * Check whether accreditation has been initialized on the contract.
   */
  const checkAccreditationInitialized =
    useCallback(async (): Promise<boolean> => {
      try {
        const client = createClient();
        const tx = await client.is_accreditation_initialized();
        const result = await tx.simulate();
        return result.result as boolean;
      } catch {
        return false;
      }
    }, []);

  /**
   * Get the current accredited Merkle root from the contract.
   */
  const getAccreditedRoot = useCallback(async (): Promise<string | null> => {
    try {
      const client = createClient();
      const tx = await client.get_accredited_root();
      const result = await tx.simulate();
      const root = result.result;
      if (!root) return null;
      // root is Option<Buffer> -- convert to hex string
      const buf = root as Buffer;
      return Array.from(buf)
        .map((b) => b.toString(16).padStart(2, "0"))
        .join("");
    } catch {
      return null;
    }
  }, []);

  /**
   * Initialize accreditation (admin only).
   * Sets the accreditation VK, Merkle root, and admin address.
   */
  const initializeAccreditation = useCallback(
    async (
      adminAddress: string,
      vkBytes: Uint8Array,
      merkleRoot: Uint8Array,
    ): Promise<void> => {
      if (!address) throw new Error("Wallet not connected");
      setIsLoading(true);
      setError(null);

      try {
        const client = createClient();
        const tx = await client.initialize_accreditation({
          admin: adminAddress,
          vk_bytes: Buffer.from(vkBytes),
          merkle_root: Buffer.from(merkleRoot),
        });
        await sas(tx);
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        setError(`Failed to initialize accreditation: ${message}`);
        throw err;
      } finally {
        setIsLoading(false);
      }
    },
    [address, sas],
  );

  /**
   * Verify accreditation on-chain with a ZK proof.
   * The player proves they hold a credential in the allowlist without
   * revealing which one. The nullifier prevents replay.
   */
  const verifyAccreditation = useCallback(
    async (
      proof: Uint8Array,
      merkleRoot: Uint8Array,
      nullifier: Uint8Array,
      gameId: number,
    ): Promise<void> => {
      if (!address) throw new Error("Wallet not connected");
      setIsLoading(true);
      setError(null);

      try {
        const client = createClient();
        const tx = await client.verify_accreditation({
          player: address,
          proof: Buffer.from(proof),
          merkle_root: Buffer.from(merkleRoot),
          nullifier: Buffer.from(nullifier),
          game_id: BigInt(gameId),
        });
        await sas(tx);
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        setError(`Failed to verify accreditation: ${message}`);
        throw err;
      } finally {
        setIsLoading(false);
      }
    },
    [address, sas],
  );

  return {
    // State
    games,
    currentGame,
    matches,
    currentMatch,
    isLoading,
    error,

    // Game actions
    fetchGames,
    fetchGame,
    getGameCount,
    createGame,
    joinGame,
    revealMove,
    resolveGame,
    claimForfeit,
    cancelGame,
    claimRefund,
    setCurrentGame,
    clearError,

    // Match actions
    fetchMatches,
    fetchMatch,
    getMatchCount,
    createMatch,
    joinMatch,
    startNextRound,
    joinNextRound,
    rematch,
    cancelMatch,
    cancelMatchTimeout,
    setCurrentMatch,

    // Accreditation actions
    checkAccreditationInitialized,
    getAccreditedRoot,
    initializeAccreditation,
    verifyAccreditation,
  };
}
