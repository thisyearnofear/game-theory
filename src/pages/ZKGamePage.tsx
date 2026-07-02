import React, { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { Button, Text } from "@stellar/design-system";
import { useWallet } from "../hooks/useWallet";
import { useZKDilemma } from "../hooks/useZKDilemma";
import { GameLobby } from "../components/zk/GameLobby";
import { CommitMove } from "../components/zk/CommitMove";
import { RevealMove } from "../components/zk/RevealMove";
import { GameResult } from "../components/zk/GameResult";
import { OnboardingOverlay } from "../components/zk/OnboardingOverlay";
import ConnectAccount from "../components/ConnectAccount";

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
  const {
    fetchGame,
    currentGame,
    cancelGame,
    claimRefund,
    isLoading: txLoading,
  } = useZKDilemma();

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
    return () => clearInterval(poll);
  }, [view.type, view.gameId, fetchGame]);

  // Fetch game data when entering game view
  useEffect(() => {
    if (view.type === "game") {
      void fetchGame(view.gameId);
    }
  }, [view.type, (view as { gameId?: number }).gameId, fetchGame]);

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
      currentGame.status === "Resolved" ||
      currentGame.status === "Forfeited" ||
      currentGame.status === "Cancelled";

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
      <div
        className="zk-page-container"
        style={{ padding: "24px", maxWidth: "800px", margin: "0 auto" }}
      >
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
              color: "rgba(20, 26, 46, 0.35)",
              cursor: "pointer",
              fontFamily: "var(--font-body)",
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
              fontFamily: "var(--font-body)",
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
              color: "var(--text-primary)",
              textAlign: "center",
              fontFamily: "var(--font-body)",
            }}
          >
            {currentGame.status === "AwaitingPlayer2"
              ? "⏳ Waiting for opponent to join..."
              : currentGame.status === "BothCommitted"
                ? "🔐 Moves Committed — Reveal Now!"
                : `📊 Game ${currentGame.status}`}
          </Text>

          <div
            className="zk-game-grid"
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
                style={{ margin: "0 0 2px", color: "var(--text-secondary)" }}
              >
                Player 1
              </Text>
              <Text
                as="p"
                size="sm"
                style={{
                  margin: 0,
                  color: address === currentGame.player1 ? "#4CAF50" : "#333",
                  fontWeight:
                    address === currentGame.player1 ? "bold" : "normal",
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
                style={{ margin: "0 0 2px", color: "var(--text-secondary)" }}
              >
                Player 2
              </Text>
              <Text
                as="p"
                size="sm"
                style={{
                  margin: 0,
                  color: address === currentGame.player2 ? "#F44336" : "#333",
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
                style={{ margin: "0 0 2px", color: "var(--text-secondary)" }}
              >
                Stake
              </Text>
              <Text
                as="p"
                size="sm"
                style={{ margin: 0, fontWeight: "bold", color: "#667eea" }}
              >
                {(BigInt(currentGame.stake) / BigInt(10_000_000)).toString()}{" "}
                XLM
              </Text>
            </div>
            <div>
              <Text
                as="p"
                size="xs"
                style={{ margin: "0 0 2px", color: "var(--text-secondary)" }}
              >
                Moves
              </Text>
              <Text
                as="p"
                size="sm"
                style={{ margin: 0, color: "var(--text-primary)" }}
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

        {/* Refund option when both players timeout on reveal */}
        {currentGame.status === "BothCommitted" &&
          !bothRevealed &&
          (() => {
            const now = Math.floor(Date.now() / 1000);
            const deadline = Number(currentGame.reveal_deadline);
            const canRefund = now > deadline && deadline > 0;
            if (!canRefund) return null;
            return (
              <CardDiv
                style={{
                  textAlign: "center",
                  padding: "16px",
                  marginTop: "16px",
                  background: "rgba(100, 116, 139, 0.05)",
                  border: "1px solid rgba(100, 116, 139, 0.2)",
                }}
              >
                <Text
                  as="p"
                  size="sm"
                  style={{
                    color: "#64748b",
                    margin: "0 0 8px",
                    fontFamily: "var(--font-body)",
                  }}
                >
                  Reveal deadline passed and neither player revealed.
                </Text>
                <Button
                  variant="tertiary"
                  size="md"
                  onClick={() => {
                    void claimRefund(view.gameId).then(() => {
                      handleBackToLobby();
                    });
                  }}
                  disabled={txLoading}
                  style={{ fontFamily: "var(--font-body)" }}
                >
                  {txLoading
                    ? "⏳ Processing..."
                    : "↩️ Claim Refund (Split Escrow)"}
                </Button>
              </CardDiv>
            );
          })()}

        {/* If still awaiting player 2 and this is player 1 */}
        {currentGame.status === "AwaitingPlayer2" &&
          address === currentGame.player1 &&
          (() => {
            const now = Math.floor(Date.now() / 1000);
            const deadline = Number(currentGame.commit_deadline);
            const canCancel = now > deadline && deadline > 0;
            const timeLeft = deadline > 0 ? Math.max(0, deadline - now) : 0;
            return (
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
                  style={{
                    color: "#f59e0b",
                    margin: 0,
                    fontWeight: "bold",
                    fontFamily: "var(--font-body)",
                  }}
                >
                  ⏳ Waiting for an opponent to join your game
                </Text>
                <Text
                  as="p"
                  size="sm"
                  style={{
                    color: "var(--text-secondary)",
                    marginTop: "8px",
                    fontFamily: "var(--font-body)",
                  }}
                >
                  {canCancel
                    ? "Commit deadline passed. You can cancel to reclaim your stake."
                    : `Time remaining for opponent: ${Math.floor(timeLeft / 60)}m ${timeLeft % 60}s`}
                </Text>
                {canCancel && (
                  <Button
                    variant="tertiary"
                    size="md"
                    onClick={() => {
                      void cancelGame(view.gameId).then(() => {
                        handleBackToLobby();
                      });
                    }}
                    disabled={txLoading}
                    style={{
                      marginTop: "12px",
                      fontFamily: "var(--font-body)",
                    }}
                  >
                    {txLoading
                      ? "⏳ Cancelling..."
                      : "↩️ Cancel & Reclaim Stake"}
                  </Button>
                )}
              </CardDiv>
            );
          })()}

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
                  fontFamily: "var(--font-body)",
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
                style={{
                  color: "var(--text-secondary)",
                  margin: 0,
                  fontFamily: "var(--font-body)",
                }}
              >
                🔍 This game is waiting for a second player.
              </Text>{" "}
              <Button
                variant="primary"
                size="md"
                onClick={() =>
                  void handleJoinGame(
                    view.gameId,
                    currentGame.player1,
                    currentGame.stake,
                  )
                }
                disabled={!address}
                style={{
                  marginTop: "12px",
                  fontFamily: "var(--font-body)",
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
              style={{
                color: "#F44336",
                margin: 0,
                fontFamily: "var(--font-body)",
              }}
            >
              ⚠️ Game not found
            </Text>
            <Button
              variant="tertiary"
              size="md"
              onClick={handleBackToLobby}
              style={{ marginTop: "12px", fontFamily: "var(--font-body)" }}
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
          color: "rgba(20, 26, 46, 0.35)",
          fontFamily: "var(--font-body)",
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
      className="zk-page-container"
      style={{
        padding: "24px",
        minHeight: "calc(100vh - 80px)",
        background: !address
          ? "linear-gradient(135deg, #0a0e1a 0%, #141a2e 50%, #1a1f3a 100%)"
          : undefined,
      }}
    >
      <OnboardingOverlay />
      {/* Connect prompt */}
      {!address && (
        <div
          className="glass-panel"
          style={{
            textAlign: "center",
            padding: "48px 32px",
            marginBottom: "24px",
            maxWidth: "480px",
            margin: "0 auto 24px",
            borderColor: "rgba(102,126,234,0.2)",
          }}
        >
          <div
            style={{
              fontSize: "64px",
              marginBottom: "20px",
              filter: "drop-shadow(0 0 24px rgba(102,126,234,0.3))",
            }}
          >
            🔐
          </div>
          <h2
            style={{
              fontFamily: "var(--font-display)",
              fontSize: "var(--text-2xl)",
              color: "var(--text-primary)",
              margin: "0 0 12px",
            }}
          >
            Connect Your Wallet
          </h2>
          <p
            style={{
              fontFamily: "var(--font-body)",
              fontSize: "var(--text-sm)",
              color: "var(--text-secondary)",
              lineHeight: 1.6,
              margin: "0 0 8px",
            }}
          >
            You need a Stellar wallet to commit moves and stake XLM.
          </p>
          <p
            style={{
              fontFamily: "var(--font-body)",
              fontSize: "var(--text-xs)",
              color: "var(--text-muted)",
              margin: "0 0 24px",
            }}
          >
            Testnet only — no real money at risk. Get free testnet XLM from
            friendbot.
          </p>
          <ConnectAccount />
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
          onClick={() => void navigate("/")}
          style={{
            background: "var(--bg-glass-light)",
            border: "1px solid var(--border-glass)",
            color: "var(--text-secondary)",
            cursor: "pointer",
            fontFamily: "var(--font-body)",
            fontSize: "var(--text-sm)",
            padding: "8px 16px",
            borderRadius: "var(--radius-md)",
            transition: "all 0.3s var(--ease-out)",
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
