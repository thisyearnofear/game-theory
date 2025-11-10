import { useState, useCallback } from "react";
import pdClient, { createPDClient } from "../contracts/prisoners_dilemma";
import { getStellarExpertLink } from "../util/transactions";

export type GameMove = "C" | "D";

export interface GameState {
  gameId: number | null;
  status: "idle" | "creating" | "joining" | "resolving" | "resolved" | "error";
  playerMove: GameMove | null;
  aiMove: GameMove | null;
  playerPayout: number | null;
  aiPayout: number | null;
  stake: number | null;
  txHash: string | null;
  error: string | null;
}

export const useGameState = (
  address?: string,
  signTransaction?: (tx: string) => Promise<{ signedTxXdr: string }>,
) => {
  const [game, setGame] = useState<GameState>({
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

  const createGame = useCallback(
    async (stakeXLM: number, playerMove: GameMove) => {
      if (!address) throw new Error("Not connected");

      setGame((prev) => ({ ...prev, status: "creating", error: null }));

      try {
        // Convert XLM to stroops (1 XLM = 10_000_000 stroops)
        const stakeStroops = BigInt(stakeXLM * 10_000_000);

        // Create game on contract
        const result = await pdClient.create_game({
          player1: address,
          stake: stakeStroops,
        });

        const gameId = Number(result);

        // Set player's move
        await pdClient.set_move({
          player: address,
          game_id: BigInt(gameId),
          move_: playerMove,
        });

        setGame((prev) => ({
          ...prev,
          status: "idle",
          gameId,
          playerMove,
          stake: stakeXLM,
        }));

        return gameId;
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        setGame((prev) => ({
          ...prev,
          status: "error",
          error: message,
        }));
        throw error;
      }
    },
    [address],
  );

  const resolveGame = useCallback(
    async (gameId: number, aiMove: GameMove, stake: number) => {
      if (!address) throw new Error("Not connected");

      setGame((prev) => ({ ...prev, status: "resolving", error: null }));

      try {
        // Resolve the game on-chain
        const result = await pdClient.resolve_game({
          game_id: BigInt(gameId),
        });

        const [payout1, payout2] = result;
        const playerPayoutXLM = Number(payout1) / 10_000_000;
        const aiPayoutXLM = Number(payout2) / 10_000_000;

        // Get player's move from game state (would need to fetch from contract)
        const gameData = await pdClient.get_game({
          game_id: BigInt(gameId),
        });

        const playerMove = gameData.move1 === "C" ? "C" : "D";

        setGame((prev) => ({
          ...prev,
          status: "resolved",
          gameId,
          playerMove,
          aiMove,
          playerPayout: playerPayoutXLM,
          aiPayout: aiPayoutXLM,
          stake,
        }));
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        setGame((prev) => ({
          ...prev,
          status: "error",
          error: message,
        }));
        throw error;
      }
    },
    [address],
  );

  const playGameOnChain = useCallback(
    async (
      playerAddress: string,
      playerMove: GameMove,
      aiStrategy: string,
      stakeStroops: number,
    ) => {
      if (!address) throw new Error("Not connected");

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

      setGame((prev) => ({ ...prev, status: "creating", error: null }));

      try {
        console.log(
          `[useGameState] Creating game with stake=${stakeStroops} stroops`,
        );

        if (!signTransaction)
          throw new Error("signTransaction function is required");

        // Create a client with the invoker's public key
        const client = createPDClient(playerAddress);

        // Create game on contract - this returns an AssembledTransaction that needs to be signed and sent
        const createGameTx = await client.create_game({
          player1: playerAddress,
          stake: BigInt(stakeStroops),
        });

        console.log(
          `[useGameState] Signing and sending create_game transaction...`,
        );

        // Sign and send the transaction with the wallet's signer
        const createGameResponse = await createGameTx.signAndSend({
          signTransaction,
        });

        console.log(`[useGameState] create_game response:`, createGameResponse);

        // Extract gameId from the response
        let gameId: number;
        // AssembledTransaction.signAndSend() returns a SentTransaction with result property
        const result = (createGameResponse as Record<string, unknown>).result;
        if (result !== undefined && result !== null) {
          // The SDK handles XDR decoding automatically, result is already decoded
          gameId = Number(result);
          if (isNaN(gameId)) {
            let resultString: string;
            if (typeof result === "object" && result !== null) {
              resultString = JSON.stringify(result);
            } else if (typeof result === "string") {
              resultString = result;
            } else if (typeof result === "number") {
              resultString = String(result);
            } else {
              resultString = typeof result;
            }
            throw new Error(
              `Could not parse gameId from result: ${resultString}`,
            );
          }
        } else {
          throw new Error(
            `Unexpected create_game response format: missing result. Response: ${JSON.stringify(createGameResponse, null, 2)}`,
          );
        }

        if (isNaN(gameId)) {
          throw new Error(
            `Invalid gameId received from create_game: ${JSON.stringify(createGameResponse)}`,
          );
        }

        console.log(`[useGameState] Game created with ID=${gameId}`);

        // Set player's move
        console.log(
          `[useGameState] Signing and sending set_move transaction...`,
        );
        const setMoveTx = await client.set_move({
          player: playerAddress,
          game_id: BigInt(gameId),
          move_: playerMove,
        });

        await setMoveTx.signAndSend({ signTransaction });
        console.log(`[useGameState] Player move set to ${playerMove}`);

        // Determine AI move
        const aiMove: GameMove =
          aiStrategy === "cooperator"
            ? "C"
            : aiStrategy === "defector"
              ? "D"
              : Math.random() > 0.5
                ? "C"
                : "D";

        // AI player joins the game with their move
        // Use a hardcoded AI address for consistency
        const aiAddress =
          "GDZST3XVCDTUJ76ZAV2HA72KYXM4Y5LHKQNJM6GVLZS5DBFNFGH2HEU3";

        console.log(
          `[useGameState] Signing and sending join_game transaction with AI move=${aiMove}`,
        );

        const joinGameTx = await client.join_game({
          player2: aiAddress,
          game_id: BigInt(gameId),
          move_: aiMove,
        });

        await joinGameTx.signAndSend({ signTransaction });
        console.log(`[useGameState] AI player joined game with move ${aiMove}`);

        console.log(
          `[useGameState] Signing and sending resolve_game transaction`,
        );

        const resolveGameTx = await client.resolve_game({
          game_id: BigInt(gameId),
        });

        const resolveResponse = (await resolveGameTx.signAndSend({
          signTransaction,
        })) as Record<string, unknown>;

        console.log(`[useGameState] resolve_game response:`, resolveResponse);

        // Extract payouts from the response
        let payouts: [bigint, bigint];
        const payoutResult = resolveResponse.result;
        if (
          payoutResult &&
          Array.isArray(payoutResult) &&
          payoutResult.length === 2
        ) {
          // Result should be a Result<[i128, i128]> which is either Ok([payout1, payout2]) or Err
          // If successful, result is the tuple [payout1, payout2]
          const payout0 = String(payoutResult[0]);
          const payout1 = String(payoutResult[1]);
          payouts = [BigInt(payout0), BigInt(payout1)];
        } else {
          throw new Error(
            `Unexpected resolve_game response format: ${JSON.stringify(payoutResult)}`,
          );
        }

        const [payout1, payout2] = payouts;
        const playerPayoutXLM = Number(payout1) / 10_000_000;
        const aiPayoutXLM = Number(payout2) / 10_000_000;

        setGame((prev) => ({
          ...prev,
          status: "resolved",
          gameId: Number(gameId),
          playerMove,
          aiMove,
          playerPayout: playerPayoutXLM,
          aiPayout: aiPayoutXLM,
          stake: stakeStroops / 10_000_000,
          txHash: `game-${gameId}`, // Placeholder tx hash
        }));

        return {
          gameId: Number(gameId),
          playerMove,
          aiMove,
          playerPayout: playerPayoutXLM,
          aiPayout: aiPayoutXLM,
          txHash: `game-${gameId}`,
        };
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
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

  const getExplorerLink = useCallback(() => {
    if (!game.txHash) return null;
    return getStellarExpertLink(game.txHash, "testnet");
  }, [game.txHash]);

  return {
    game,
    createGame,
    resolveGame,
    playGameOnChain,
    resetGame,
    getExplorerLink,
  };
};
