import React, { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { Button, Text } from "@stellar/design-system";
import { useWallet } from "../hooks/useWallet";
import { useZKDilemma, type GameMove } from "../hooks/useZKDilemma";
import { GameLobby } from "../components/zk/GameLobby";
import { CommitMove } from "../components/zk/CommitMove";
import { RevealMove } from "../components/zk/RevealMove";
import { GameResult } from "../components/zk/GameResult";

type ViewState =
  | { type: "lobby" }
  | { type: "create" }
  | { type: "join"; gameId: number; hostAddress: string; stake: string }
  | { type: "game"; gameId: number };

/** Card-like div with consistent styling */
const CardDiv: React.FC<{
  children: React.ReactNode;
  style?: React.CSSProperties;
}> = ({ children, style }) => (
  <div
    style={{
      background: "white",
      borderRadius: "12px",
      padding: "16px",
      boxShadow: "0 2px 8px rgba(0,0,0,0.1)",
      ...style,
    }}
  >
    {children}
  </div>
);

export const ZKGamePage: React.FC = () => {
  const navigate = useNavigate();
  const { address } = useWallet();
  const { fetchGame, currentGame } = useZKDilemma();

  const [view, setView] = useState<ViewState>({ type: "lobby" });

  // Poll game state when viewing a game
  useEffect(() => {
    if (view.type !== "game" && view.type !== "join") {
      return;
    }
    const id = view.gameId;
    const poll = setInterval(() => {
      void fetchGame(id);
    }, 5000);
    return () => clearInterval(poll);    }, [view.type, view.gameId, fetchGame]);

  // Fetch game data when entering game view
  useEffect(() => {
    if (view.type === "game") {
      void fetchGame(view.gameId);
    }
  }, [view.type, (view as {gameId?: number}).gameId, fetchGame]);

  const handleSelectGame = useCallback((gameId: number) => {
    setView({ type: "game", gameId });
  }, []);

  const handleCreateGame = useCallback(() => {
    setView({ type: "create" });
  }, []);

  const handleJoinGame = useCallback(
    (gameId: number, hostAddress: string, stake: string) => {
      setView({ type: "join", gameId, hostAddress, stake });
    },
    [],
  );

  const handleCommitComplete = useCallback((gameId: number) => {
    setView({ type: "game", gameId });
  }, []);

  const handleBackToLobby = useCallback(() => {
    setView({ type: "lobby" });
  }, []);

  // If viewing a specific game
  if (view.type === "game" && currentGame) {
    const bothRevealed =
      currentGame.move1 !== null && currentGame.move2 !== null;
    const isResolved =
      currentGame.status === "Resolved" || currentGame.status === "Forfeited";

    // Show game result view if resolved or both revealed
    if (isResolved) {
      return (
        <div style={{ padding: "24px" }}>
          <GameResult
            gameId={view.gameId}
            gameState={currentGame}
            onBack={handleBackToLobby}
          />
        </div>
      );
    }

    return (
      <div style={{ padding: "24px", maxWidth: "800px", margin: "0 auto" }}>
        {/* Game header */}
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            marginBottom: "20px",
          }}
        >
          <button
            type="button"
            onClick={handleBackToLobby}
            style={{
              background: "none",
              border: "none",
              color: "rgba(255,255,255,0.7)",
              cursor: "pointer",
              fontFamily: "FuturaHandwritten",
              fontSize: "16px",
              padding: "8px 0",
            }}
          >
            ← Lobby
          </button>
          <Text
            as="h2"
            size="lg"
            style={{
              fontFamily: "FuturaHandwritten",
              color: "rgba(255,255,255,0.95)",
              margin: 0,
            }}
          >
            🎮 Game #{view.gameId}
          </Text>
          <div />
        </div>

        {/* Game status card */}
        <CardDiv style={{ padding: "24px", marginBottom: "20px" }}>
          <Text
            as="h4"
            size="md"
            style={{
              margin: "0 0 16px 0",
              color: "#333",
              textAlign: "center",
              fontFamily: "FuturaHandwritten",
            }}
          >
            {currentGame.status === "AwaitingPlayer2"
              ? "⏳ Waiting for opponent to join..."
              : currentGame.status === "BothCommitted"
                ? "🔐 Moves Committed — Reveal Now!"
                : `📊 Game ${currentGame.status}`}
          </Text>

          <div
            style={{
              display: "grid",
              gridTemplateColumns: "1fr 1fr",
              gap: "12px",
              fontSize: "14px",
            }}
          >
            <div>
              <Text
                as="p"
                size="xs"
                style={{ margin: "0 0 2px", color: "#666" }}
              >
                Player 1
              </Text>
              <Text
                as="p"
                size="sm"
                style={{
                  margin: 0,
                  color: address === currentGame.player1 ? "#4CAF50" : "#333",
                  fontWeight: address === currentGame.player1 ? "bold" : "normal",
                }}
              >
                {currentGame.player1.slice(0, 8)}...
                {address === currentGame.player1 && " (You)"}
              </Text>
            </div>
            <div>
              <Text
                as="p"
                size="xs"
                style={{ margin: "0 0 2px", color: "#666" }}
              >
                Player 2
              </Text>
              <Text
                as="p"
                size="sm"
                style={{
                  margin: 0,
                  color:
                    address === currentGame.player2 ? "#F44336" : "#333",
                  fontWeight:
                    address === currentGame.player2 ? "bold" : "normal",
                }}
              >
                {currentGame.player2
                  ? `${currentGame.player2.slice(0, 8)}...${address === currentGame.player2 ? " (You)" : ""}`
                  : "—"}
              </Text>
            </div>
            <div>
              <Text
                as="p"
                size="xs"
                style={{ margin: "0 0 2px", color: "#666" }}
              >
                Stake
              </Text>
              <Text
                as="p"
                size="sm"
                style={{ margin: 0, fontWeight: "bold", color: "#667eea" }}
              >
                {(BigInt(currentGame.stake) / BigInt(10_000_000)).toString()} XLM
              </Text>
            </div>
            <div>
              <Text
                as="p"
                size="xs"
                style={{ margin: "0 0 2px", color: "#666" }}
              >
                Moves
              </Text>
              <Text
                as="p"
                size="sm"
                style={{ margin: 0, color: "#333" }}
              >
                {currentGame.move1 ? "✅" : "⏳"} P1{" "}
                {currentGame.move2 ? "✅" : "⏳"} P2
              </Text>
            </div>
          </div>
        </CardDiv>

        {/* Reveal move section (when BothCommitted) */}
        {currentGame.status === "BothCommitted" && (
          <RevealMove
            gameId={view.gameId}
            gameState={currentGame}
            onRevealed={() => {
              void fetchGame(view.gameId);
            }}
          />
        )}

        {/* If still awaiting player 2 and this is player 1 */}
        {currentGame.status === "AwaitingPlayer2" &&
          address === currentGame.player1 && (
            <CardDiv
              style={{
                textAlign: "center",
                padding: "24px",
                background: "rgba(245, 158, 11, 0.05)",
                border: "1px solid rgba(245, 158, 11, 0.2)",
              }}
            >
              <Text
                as="p"
                size="md"
                style={{ color: "#f59e0b", margin: 0, fontWeight: "bold", fontFamily: "FuturaHandwritten" }}
              >
                ⏳ Waiting for an opponent to join your game
              </Text>
              <Text
                as="p"
                size="sm"
                style={{ color: "#666", marginTop: "8px", fontFamily: "FuturaHandwritten" }}
              >
                Share the game link or ask someone to find it in the lobby!
              </Text>
            </CardDiv>
          )}

        {/* Resolve button if both revealed */}
        {currentGame.status === "BothCommitted" && bothRevealed && (
          <div style={{ marginTop: "16px" }}>
            <CardDiv
              style={{
                textAlign: "center",
                padding: "16px",
                background: "rgba(16, 185, 129, 0.05)",
                border: "1px solid rgba(16, 185, 129, 0.2)",
              }}
            >
              <Text
                as="p"
                size="md"
                style={{
                  color: "#10b981",
                  margin: "0 0 12px",
                  fontWeight: "bold",
                  fontFamily: "FuturaHandwritten",
                }}
              >
                ✅ Both players revealed! Resolve to distribute payouts.
              </Text>
              <GameResult
                gameId={view.gameId}
                gameState={currentGame}
                onBack={handleBackToLobby}
              />
            </CardDiv>
          </div>
        )}

        {/* If awaiting player 2 and spectator */}
        {currentGame.status === "AwaitingPlayer2" &&
          address !== currentGame.player1 && (
            <CardDiv
              style={{
                textAlign: "center",
                padding: "24px",
              }}
            >
              <Text
                as="p"
                size="md"
                style={{ color: "#666", margin: 0, fontFamily: "FuturaHandwritten" }}
              >
                🔍 This game is waiting for a second player.
              </Text>
              <Button
                variant="primary"
                size="md"
                onClick={() =>
                  handleJoinGame(
                    view.gameId,
                    currentGame.player1,
                    currentGame.stake,
                  )
                }
                disabled={!address}
                style={{
                  marginTop: "12px",
                  fontFamily: "FuturaHandwritten",
                }}
              >
                🎮 Join This Game
              </Button>
            </CardDiv>
          )}

        {/* Error state if game not found */}
        {!currentGame && (
          <CardDiv
            style={{
              textAlign: "center",
              padding: "24px",
              background: "rgba(244, 67, 54, 0.05)",
              border: "1px solid rgba(244, 67, 54, 0.2)",
            }}
          >
            <Text
              as="p"
              size="md"
              style={{ color: "#F44336", margin: 0, fontFamily: "FuturaHandwritten" }}
            >
              ⚠️ Game not found
            </Text>
            <Button
              variant="tertiary"
              size="md"
              onClick={handleBackToLobby}
              style={{ marginTop: "12px", fontFamily: "FuturaHandwritten" }}
            >
              ← Back to Lobby
            </Button>
          </CardDiv>
        )}
      </div>
    );
  }

  // If viewing a specific game but no data loaded yet
  if (view.type === "game" && !currentGame) {
    return (
      <div
        style={{
          textAlign: "center",
          padding: "60px",
          color: "rgba(255,255,255,0.7)",
          fontFamily: "FuturaHandwritten",
        }}
      >
        <div style={{ fontSize: "40px", marginBottom: "16px" }}>⏳</div>
        <Text as="p" size="md" style={{ margin: 0 }}>
          Loading game...
        </Text>
      </div>
    );
  }

  // Create game flow
  if (view.type === "create") {
    return (
      <div style={{ padding: "24px" }}>
        <CommitMove
          mode="create"
          onComplete={handleCommitComplete}
          onBack={handleBackToLobby}
        />
      </div>
    );
  }

  // Join game flow
  if (view.type === "join") {
    return (
      <div style={{ padding: "24px" }}>
        <CommitMove
          mode="join"
          gameId={view.gameId}
          hostAddress={view.hostAddress}
          stake={view.stake}
          onComplete={handleCommitComplete}
          onBack={handleBackToLobby}
        />
      </div>
    );
  }

  // Lobby
  return (
    <div
      style={{
        padding: "24px",
        minHeight: "calc(100vh - 80px)",
        background:
          !address
            ? "linear-gradient(135deg, #667eea 0%, #764ba2 100%)"
            : undefined,
      }}
    >
      {/* Connect prompt */}
      {!address && (
        <div
          style={{
            textAlign: "center",
            padding: "40px",
            marginBottom: "24px",
          }}
        >
          <div style={{ fontSize: "60px", marginBottom: "16px" }}>🔐</div>
          <Text
            as="p"
            size="lg"
            style={{
              fontFamily: "FuturaHandwritten",
              color: "rgba(255,255,255,0.9)",
              marginBottom: "8px",
            }}
          >
            Connect Your Wallet
          </Text>
          <Text
            as="p"
            size="md"
            style={{
              fontFamily: "FuturaHandwritten",
              color: "rgba(255,255,255,0.7)",
            }}
          >
            Connect a Stellar wallet to play ZK Prisoner's Dilemma with real
            stakes
          </Text>
        </div>
      )}

      {/* Nav to main game */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: "24px",
        }}
      >
        <div />
        <button
          type="button"
          onClick={() => navigate("/")}
          style={{
            background: "rgba(255,255,255,0.1)",
            border: "1px solid rgba(255,255,255,0.2)",
            color: "rgba(255,255,255,0.7)",
            cursor: "pointer",
            fontFamily: "FuturaHandwritten",
            fontSize: "14px",
            padding: "8px 16px",
            borderRadius: "8px",
          }}
        >
          ← Back to Tutorial
        </button>
      </div>

      <GameLobby
        onSelectGame={handleSelectGame}
        onCreateGame={handleCreateGame}
      />
    </div>
  );
};
