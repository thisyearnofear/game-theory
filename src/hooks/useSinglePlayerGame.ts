import { useState, useCallback } from "react";
import singlePlayerClient from "../contracts/single_player_dilemma";

export type GameMove = "C" | "D";

export interface SinglePlayerGameState {
  gameId: number | null;
  status: "idle" | "playing" | "resolved" | "error";
  playerMove: GameMove | null;
  aiMove: GameMove | null;
  playerPayout: number | null;
  aiPayout: number | null;
  stake: number | null;
  txHash: string | null;
  error: string | null;
}

export const useSinglePlayerGame = (
  address?: string,
  signTransaction?: (tx: string) => Promise<{ signedTxXdr: string }>,
) => {
  const [game, setGame] = useState<SinglePlayerGameState>({
    gameId: null,
    status: "idle",
    playerMove: null,
    aiMove: null,
    playerPayout: null,
    aiPayout: null,
    stake: null,
    txHash: null,
    error: null,
  });

  const resetGame = useCallback(() => {
    setGame({
      gameId: null,
      status: "idle",
      playerMove: null,
      aiMove: null,
      playerPayout: null,
      aiPayout: null,
      stake: null,
      txHash: null,
      error: null,
    });
  }, []);

  const playGame = useCallback(
    async (playerMove: GameMove, aiStrategy: string, stakeStroops: number) => {
      if (!address) throw new Error("Not connected");
      if (!signTransaction)
        throw new Error("signTransaction function is required");

      // Validate stake
      if (
        isNaN(stakeStroops) ||
        !Number.isInteger(stakeStroops) ||
        stakeStroops <= 0
      ) {
        throw new Error(
          `Invalid stake: ${stakeStroops}. Must be a positive integer.`,
        );
      }

      setGame((prev) => ({ ...prev, status: "playing", error: null }));

      try {
        console.log(
          `[useSinglePlayerGame] Playing game: move=${playerMove}, stake=${stakeStroops} stroops, strategy=${aiStrategy}`,
        );

        // Map UI strategy names to contract strategy codes
        const strategyMap: { [key: string]: string } = {
          random: "RND",
          cooperator: "COOP",
          defector: "DEF",
          "tit-for-tat": "TFT",
        };

        const contractStrategy = strategyMap[aiStrategy] || "RND";

        // Set up the client with the current player address for auth
        singlePlayerClient.options.publicKey = address;

        // Single contract call does everything: create, play, and resolve
        const gameResultTx = await singlePlayerClient.play_game({
          player: address,
          player_move: playerMove,
          ai_strategy: contractStrategy,
          stake: BigInt(stakeStroops),
        });

        console.log(
          `[useSinglePlayerGame] Signing and sending play_game transaction...`,
        );

        const response = await gameResultTx.signAndSend({ signTransaction });

        console.log(`[useSinglePlayerGame] play_game response:`, response);

        // Extract the game result
        // The SDK returns Result<GameResult> which is wrapped in Ok2 {value: GameResult}
        const rawResult = (response as Record<string, unknown>)
          .result as Record<string, unknown> | null;

        let gameResult: Record<string, unknown> | null = null;

        // Unwrap Result type (Ok/Err pattern)
        if (rawResult && rawResult.value) {
          gameResult = rawResult.value as Record<string, unknown>;
          console.log(`[useSinglePlayerGame] Unwrapped Ok result:`, gameResult);
        } else if (rawResult && rawResult.game_id) {
          // Already unwrapped
          gameResult = rawResult;
        } else {
          throw new Error(
            `Unexpected play_game response format: ${JSON.stringify(Object.keys(rawResult || {}))}`,
          );
        }

        if (!gameResult || !gameResult.game_id) {
          throw new Error(`Missing game_id in result`);
        }

        const gameId = Number(gameResult.game_id);
        const aiMove = gameResult.ai_move === "C" ? "C" : "D";
        const playerPayoutXLM = Number(gameResult.player_payout) / 10_000_000;
        const aiPayoutXLM = Number(gameResult.ai_payout) / 10_000_000;

        console.log(
          `[useSinglePlayerGame] Game resolved: gameId=${gameId}, payouts=[${playerPayoutXLM}, ${aiPayoutXLM}]`,
        );

        setGame((prev) => ({
          ...prev,
          status: "resolved",
          gameId,
          playerMove,
          aiMove,
          playerPayout: playerPayoutXLM,
          aiPayout: aiPayoutXLM,
          stake: stakeStroops / 10_000_000,
          txHash: `game-${gameId}`,
        }));

        return {
          gameId,
          playerMove,
          aiMove,
          playerPayout: playerPayoutXLM,
          aiPayout: aiPayoutXLM,
          txHash: `game-${gameId}`,
        };
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        console.error("[useSinglePlayerGame] Error:", message);
        setGame((prev) => ({
          ...prev,
          status: "error",
          error: message,
        }));
        throw error;
      }
    },
    [address, signTransaction],
  );

  return {
    game,
    playGame,
    resetGame,
  };
};
