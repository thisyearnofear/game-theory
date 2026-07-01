import { Buffer } from "buffer";
import { useCallback, useState } from "react";
import { useWallet } from "./useWallet";
import {
  Client as ZkDilemmaClient,
  type GameStatus,
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

// ============================================================================
// Helpers
// ============================================================================

const CONTRACT_ID = import.meta.env.VITE_ZK_DILEMMA_CONTRACT_ID || "";

/** Parse a `Game` from the SDK's tagged-union format into a flat UI object */
function parseGame(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  raw: any,
): GameState | null {
  if (!raw) return null;
  return {
    player1: String(raw.player1 ?? ""),
    player2: raw.player2 != null ? String(raw.player2) : null,
    commitment1: String(raw.commitment1 ?? ""),
    commitment2: raw.commitment2 != null ? String(raw.commitment2) : null,
    move1: raw.move1 ? (String(raw.move1) as GameMove) : null,
    move2: raw.move2 ? (String(raw.move2) as GameMove) : null,
    nonce1: raw.nonce1 != null ? String(raw.nonce1) : null,
    nonce2: raw.nonce2 != null ? String(raw.nonce2) : null,
    stake: String(raw.stake ?? "0"),
    status: gameStatusToString(raw.status),
    created_at: String(raw.created_at ?? "0"),
    commit_deadline: String(raw.commit_deadline ?? "0"),
    reveal_deadline: String(raw.reveal_deadline ?? "0"),
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

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type SignAndSendFn = (tx: any) => Promise<any>;

// ============================================================================
// Hook
// ============================================================================

export function useZKDilemma() {
  const { address, signTransaction } = useWallet();
  const [games, setGames] = useState<GameListItem[]>([]);
  const [currentGame, setCurrentGame] = useState<GameState | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  /** Sign & send wrapper */
  const sas = useCallback<SignAndSendFn>(
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    async (tx: any) => {
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
        const raw = await sas(tx);
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
      const count = Number(await sas(countTx) ?? 0);

      const gameList: GameListItem[] = [];
      for (let i = 1; i <= count; i++) {
        try {
          const tx = await client.get_game({ game_id: BigInt(i) });
          const raw = await sas(tx);
          const parsed = parseGame(raw);
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
    return Number(await sas(tx) ?? 0);
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
        const result = await sas(tx);
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

  const clearError = useCallback(() => setError(null), []);

  return {
    // State
    games,
    currentGame,
    isLoading,
    error,

    // Actions
    fetchGames,
    fetchGame,
    getGameCount,
    createGame,
    joinGame,
    revealMove,
    resolveGame,
    claimForfeit,
    setCurrentGame,
    clearError,
  };
}
