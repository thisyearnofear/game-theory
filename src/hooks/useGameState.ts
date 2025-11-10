import { useState, useCallback } from "react";
import pdClient, { createPDClient } from "../contracts/prisoners_dilemma";
import { getStellarExpertLink } from "../util/transactions";

export type GameMove = "C" | "D";

export interface GameState {
  gameId: number | null;
  status:
    | "idle"
    | "creating"
    | "joining"
    | "resolving"
    | "resolved"
    | "error";
  playerMove: GameMove | null;
  aiMove: GameMove | null;
  playerPayout: number | null;
  aiPayout: number | null;
  stake: number | null;
  txHash: string | null;
  error: string | null;
}

export const useGameState = (address?: string, signTransaction?: (tx: string) => Promise<{ signedTxXdr: string }>) => {
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
    [address]
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
    [address]
  );

  const playGameOnChain = useCallback(
    async (
      playerAddress: string,
      playerMove: GameMove,
      aiStrategy: string,
      stakeStroops: number
    ) => {
      if (!address) throw new Error("Not connected");
      
      // Validate stake
      if (isNaN(stakeStroops) || !Number.isInteger(stakeStroops) || stakeStroops <= 0) {
        throw new Error(`Invalid stake: ${stakeStroops}. Must be a positive integer.`);
      }

      setGame((prev) => ({ ...prev, status: "creating", error: null }));

      try {
      console.log(`[useGameState] Creating game with stake=${stakeStroops} stroops`);
      
      // Create a client with the invoker's public key
      const client = createPDClient(playerAddress);
      
      // Create game on contract - this returns an AssembledTransaction that needs to be signed and sent
      const createGameTx = await client.create_game({
           player1: playerAddress,
           stake: BigInt(stakeStroops),
         });
        
        console.log(`[useGameState] Signing and sending create_game transaction...`);
        
        // Sign and send the transaction
        if (!signTransaction) throw new Error("signTransaction function is required");
        const wrappedSigner = async (tx: string) => {
        console.log(`[useGameState] Signer called with:`, typeof tx);
        try {
        const result = await signTransaction(tx);
        console.log(`[useGameState] Sign result:`, result);
        if (!result || !result.signedTxXdr) {
        throw new Error(`Invalid sign result: ${JSON.stringify(result)}`);
        }
        return result.signedTxXdr;
        } catch (err) {
        console.error(`[useGameState] Signer error:`, err);
        throw err;
        }
        };
        
        // First sign the transaction
        try {
          await createGameTx.sign({ signTransaction: wrappedSigner });
          console.log(`[useGameState] Transaction signed successfully`);
        } catch (signErr) {
          console.error(`[useGameState] Failed to sign transaction:`, signErr);
          throw signErr;
        }
        
        // Then submit it
        const createGameResponse = await createGameTx.send();
         
         console.log(`[useGameState] create_game response:`, createGameResponse);
         console.log(`[useGameState] create_game response type:`, typeof createGameResponse);
         console.log(`[useGameState] create_game response keys:`, Object.keys(createGameResponse || {}));
        
        // Extract gameId from the return value
        let gameId: number;
        if (createGameResponse.result && createGameResponse.result.retval) {
          gameId = Number(createGameResponse.result.retval);
        } else if (typeof createGameResponse === "object" && createGameResponse !== null && "retval" in createGameResponse) {
        gameId = Number((createGameResponse as Record<string, unknown>).retval);
        } else {
          throw new Error(`Unexpected create_game response format: ${JSON.stringify(createGameResponse)}`);
        }
        
        if (isNaN(gameId)) {
          throw new Error(`Invalid gameId received from create_game: ${JSON.stringify(createGameResponse)}`);
        }
        
        console.log(`[useGameState] Game created with ID=${gameId}`);

        // Set player's move
        console.log(`[useGameState] Signing and sending set_move transaction...`);
        const setMoveTx = await client.set_move({
        player: playerAddress,
        game_id: BigInt(gameId),
        move_: playerMove,
        });
        
        if (!signTransaction) throw new Error("signTransaction function is required");
        const wrappedSigner2 = async (tx: string) => {
        const result = await signTransaction(tx);
        return result.signedTxXdr;
        };
        await setMoveTx.sign({ signTransaction: wrappedSigner2 });
        await setMoveTx.send();
        console.log(`[useGameState] Player move set to ${playerMove}`);

        // Resolve the game with AI move
        const aiMove: GameMove = aiStrategy === "cooperator" ? "C" : 
                                  aiStrategy === "defector" ? "D" : 
                                  Math.random() > 0.5 ? "C" : "D";

        console.log(`[useGameState] Signing and sending resolve_game transaction with AI move=${aiMove}`);
        
        const resolveGameTx = await client.resolve_game({
        game_id: BigInt(gameId),
        });
        
        if (!signTransaction) throw new Error("signTransaction function is required");
        const wrappedSigner3 = async (tx: string) => {
        const result = await signTransaction(tx);
        return result.signedTxXdr;
        };
        await resolveGameTx.sign({ signTransaction: wrappedSigner3 });
        const resolveResponse = await resolveGameTx.send();
        
        console.log(`[useGameState] resolve_game response:`, resolveResponse);

        // Extract payouts from response
        let payouts: [bigint, bigint];
        if (resolveResponse.result && resolveResponse.result.retval) {
          // Parse the return value - it's a tuple of [u128, u128]
          payouts = resolveResponse.result.retval as [bigint, bigint];
        } else if (Array.isArray(resolveResponse)) {
          payouts = resolveResponse as [bigint, bigint];
        } else {
          throw new Error(`Unexpected resolve_game response format: ${JSON.stringify(resolveResponse)}`);
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
    [address]
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
