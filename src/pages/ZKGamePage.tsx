import React, { useState, useEffect, useCallback, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { useWallet } from "../hooks/useWallet";
import { useZKDilemma } from "../hooks/useZKDilemma";
import { useFirstRun } from "../hooks/useFirstRun";
import { GameLobby } from "../components/zk/GameLobby";
import { CommitMove } from "../components/zk/CommitMove";
import { RevealMove } from "../components/zk/RevealMove";
import { GameResult } from "../components/zk/GameResult";
import { MatchScoreboard } from "../components/zk/MatchScoreboard";
import { MatchSetup } from "../components/zk/MatchSetup";
import { MatchCommitMove } from "../components/zk/MatchCommitMove";
import { OnboardingOverlay } from "../components/zk/OnboardingOverlay";
import { AccreditationPanel } from "../components/zk/AccreditationPanel";
import {
  ZKStepIndicator,
  deriveZKStep,
} from "../components/zk/ZKStepIndicator";
import { StickManScene } from "../components/zk/StickManScene";
import { WalletSetupHelper } from "../components/WalletSetupHelper";
import ConnectAccount from "../components/ConnectAccount";
import { ShimmerButton } from "../components/ui/ShimmerButton";
import { ElectricButton } from "../components/ui/ElectricButton";
import { useAchievementToast } from "../components/ui/AchievementToast";
import { useMascot } from "../components/MascotContext";
import { getUnlockedAchievements } from "../components/ui/AchievementBadge";
import AudioManager from "../components/AudioManager";

type ViewState =
  | { type: "lobby" }
  | { type: "create" }
  | { type: "matchSetup" }
  | { type: "join"; gameId: number; hostAddress: string; stake: string }
  | { type: "game"; gameId: number }
  | { type: "match"; matchId: number; gameId: number; role: "p1" | "p2" }
  | {
      type: "matchCommit";
      matchId: number;
      gameId: number;
      role: "p1" | "p2";
      phase: "startNext" | "joinNext" | "rematch";
    };

/** Card-like div with consistent styling */
const CardDiv: React.FC<{
  children: React.ReactNode;
  style?: React.CSSProperties;
  className?: string;
}> = ({ children, style, className }) => (
  <div
    className={className ? `glass-panel ${className}` : "glass-panel"}
    style={{
      borderRadius: "12px",
      padding: "16px",
      ...style,
    }}
  >
    {children}
  </div>
);

export const ZKGamePage: React.FC = () => {
  const navigate = useNavigate();
  const { address } = useWallet();
  const { unlock, milestones } = useFirstRun();
  const { react: mascotReact } = useMascot();
  const {
    fetchGame,
    currentGame,
    cancelGame,
    claimRefund,
    fetchMatch,
    currentMatch,
    isLoading: txLoading,
  } = useZKDilemma();

  const [view, setView] = useState<ViewState>({ type: "lobby" });
  const [opponentJoined, setOpponentJoined] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);
  const prevStatusRef = useRef<string | undefined>(undefined);
  const prevAchievementsRef = useRef<string[]>(getUnlockedAchievements());
  const { toastElement, showAchievement } = useAchievementToast();

  // Pending match setup params (bestOf, stake) captured from MatchSetup,
  // passed through to the CommitMove flow which submits the first round.
  const [pendingMatchSetup, setPendingMatchSetup] = useState<{
    bestOf: number;
    stake: string;
  } | null>(null);

  // Unlock wallet milestone when address appears + mascot reaction
  useEffect(() => {
    if (address) {
      unlock("connected_wallet");
      mascotReact("wallet_connected");
    }
  }, [address, unlock, mascotReact]);

  // Mascot reacts to game resolution
  const prevResolvedRef = useRef(false);
  useEffect(() => {
    if (!currentGame) return;
    const isResolved = currentGame.status === "Resolved";
    if (isResolved && !prevResolvedRef.current) {
      prevResolvedRef.current = true;
      // Determine outcome from moves
      const myMove =
        address === currentGame.player1 ? currentGame.move1 : currentGame.move2;
      const theirMove =
        address === currentGame.player1 ? currentGame.move2 : currentGame.move1;
      if (myMove === "C" && theirMove === "C") {
        mascotReact("mutual_cooperation");
      } else if (myMove === "D" && theirMove === "D") {
        mascotReact("mutual_defection");
      } else if (myMove === "D" && theirMove === "C") {
        mascotReact("betrayed_opponent");
      } else if (myMove === "C" && theirMove === "D") {
        mascotReact("betrayed_by_opponent");
      }
    } else if (!isResolved) {
      prevResolvedRef.current = false;
    }
  }, [currentGame, address, mascotReact]);

  // Watch for newly unlocked achievements and show toast
  useEffect(() => {
    const checkInterval = setInterval(() => {
      const current = getUnlockedAchievements();
      const newOnes = current.filter(
        (id) => !prevAchievementsRef.current.includes(id),
      );
      if (newOnes.length > 0) {
        prevAchievementsRef.current = current;
        // Import ACHIEVEMENTS dynamically to show toast
        void import("../components/ui/AchievementBadge").then(
          ({ ACHIEVEMENTS }) => {
            for (const id of newOnes) {
              const ach = ACHIEVEMENTS[id];
              if (ach) showAchievement(ach);
            }
          },
        );
      }
    }, 1000);
    return () => clearInterval(checkInterval);
  }, [showAchievement]);

  // Detect opponent joining: status transitions from AwaitingPlayer2 -> BothCommitted
  useEffect(() => {
    if (!currentGame) return;
    const prev = prevStatusRef.current;
    const curr = currentGame.status;
    prevStatusRef.current = curr;
    if (prev === "AwaitingPlayer2" && curr === "BothCommitted") {
      setOpponentJoined(true);
      try {
        AudioManager.getInstance().playSound("click");
      } catch {
        /* audio not available */
      }
      const timer = setTimeout(() => setOpponentJoined(false), 3000);
      return () => clearTimeout(timer);
    }
  }, [currentGame]);

  const handleCopyGameLink = useCallback((gameId: number) => {
    const link = `https://trustfall.xyz/play/${gameId}`;
    try {
      void navigator.clipboard.writeText(link).then(() => {
        setCopiedLink(true);
        setTimeout(() => setCopiedLink(false), 2000);
      });
    } catch {
      /* clipboard not available */
    }
  }, []);

  // Poll game state when viewing a game or match
  useEffect(() => {
    if (view.type !== "game" && view.type !== "join" && view.type !== "match") {
      return;
    }
    const id = view.gameId;
    const poll = setInterval(() => {
      void fetchGame(id);
      if (view.type === "match") {
        void fetchMatch(view.matchId);
      }
    }, 5000);
    return () => clearInterval(poll);
  }, [view, fetchGame, fetchMatch]);

  // Fetch game/match data when entering game or match view
  useEffect(() => {
    if (view.type === "game") {
      void fetchGame(view.gameId);
    } else if (view.type === "match") {
      void fetchGame(view.gameId);
      void fetchMatch(view.matchId);
    }
  }, [view, fetchGame, fetchMatch]);

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

  const handleCommitComplete = useCallback(
    (gameId: number) => {
      const wasFirstGame = !milestones.first_zk_game;
      unlock("first_zk_game");
      if (wasFirstGame) {
        mascotReact("first_game");
      }
      setView({ type: "game", gameId });
    },
    [unlock, mascotReact, milestones.first_zk_game],
  );

  const handleBackToLobby = useCallback(() => {
    setView({ type: "lobby" });
  }, []);

  const handlePlayAgain = useCallback(() => {
    setView({ type: "create" });
  }, []);

  // --- Match handlers ---

  const handleCreateMatch = useCallback(() => {
    setView({ type: "matchSetup" });
  }, []);

  const handleMatchSetupConfirm = useCallback(
    (bestOf: number, stake: string) => {
      setPendingMatchSetup({ bestOf, stake });
      // Go to the create-game commit flow; the first round is created as
      // part of create_match. We intercept completion to call createMatch.
      setView({ type: "create" });
    },
    [],
  );

  const handleMatchSetupBack = useCallback(() => {
    setView({ type: "lobby" });
  }, []);

  const handleStartNextRound = useCallback(
    (matchId: number) => {
      if (!currentMatch) return;
      setView({
        type: "matchCommit",
        matchId,
        gameId: currentMatch.current_game_id,
        role: "p1",
        phase: "startNext",
      });
    },
    [currentMatch],
  );

  const handleRematch = useCallback(() => {
    if (!currentMatch) return;
    if (view.type !== "match") return;
    // Pass the old match id; MatchCommitMove uses it for the rematch contract
    // call. handleMatchCommitDone uses the new id from onComplete to transition.
    setView({
      type: "matchCommit",
      matchId: view.matchId,
      gameId: 0,
      role: currentMatch.player1 === address ? "p1" : "p2",
      phase: "rematch",
    });
  }, [currentMatch, address, view]);

  const handleMatchCommitDone = useCallback(
    async (newGameId: number, newMatchId?: number) => {
      if (view.type !== "matchCommit") return;
      const { role } = view;
      // For rematch, a new match is created with a new id.
      const targetMatchId = newMatchId ?? view.matchId;
      await fetchMatch(targetMatchId);
      setView({
        type: "match",
        matchId: targetMatchId,
        gameId: newGameId,
        role,
      });
    },
    [view, fetchMatch],
  );

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
            onPlayAgain={handlePlayAgain}
          />
          {toastElement}
        </div>
      );
    }

    return (
      <div
        className="zk-page-container"
        style={{ padding: "24px", maxWidth: "800px", margin: "0 auto" }}
      >
        {/* Unified header + step indicator */}
        <ZKStepIndicator
          step={deriveZKStep(
            currentGame.status,
            address === currentGame.player1
              ? currentGame.move1 !== null ||
                  currentGame.status === "BothCommitted"
              : currentGame.move2 !== null ||
                  currentGame.status === "BothCommitted",
            bothRevealed,
          )}
          gameId={view.gameId}
          onBack={handleBackToLobby}
          detail={
            currentGame.status === "AwaitingPlayer2"
              ? "Waiting for opponent to join and commit"
              : currentGame.status === "BothCommitted"
                ? "Both moves locked in — reveal now!"
                : undefined
          }
        />

        {/* Stick-man visualization */}
        <StickManScene
          step={deriveZKStep(
            currentGame.status,
            address === currentGame.player1
              ? currentGame.move1 !== null ||
                  currentGame.status === "BothCommitted"
              : currentGame.move2 !== null ||
                  currentGame.status === "BothCommitted",
            bothRevealed,
          )}
          stake={Number(currentGame.stake) / 10_000_000}
        />

        {/* Game status card */}
        <CardDiv
          style={{ padding: "24px", marginBottom: "20px" }}
          className={opponentJoined ? "tf-joined-glow" : undefined}
        >
          <h4
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
          </h4>

          {/* Opponent joined celebratory banner */}
          {opponentJoined && (
            <div
              className="tf-joined-text"
              style={{
                textAlign: "center",
                marginBottom: "16px",
                padding: "10px",
                borderRadius: "var(--radius-md)",
                background: "rgba(74, 222, 128, 0.12)",
                border: "1px solid rgba(74, 222, 128, 0.3)",
                fontFamily: "var(--font-body)",
                fontSize: "16px",
                fontWeight: 600,
                color: "var(--accent-cooperate)",
              }}
            >
              🎉 Opponent joined!
            </div>
          )}

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
              <p style={{ margin: "0 0 2px", color: "var(--text-secondary)" }}>
                Player 1
              </p>
              <p
                style={{
                  margin: 0,
                  color: address === currentGame.player1 ? "#4CAF50" : "#333",
                  fontWeight:
                    address === currentGame.player1 ? "bold" : "normal",
                }}
              >
                {currentGame.player1.slice(0, 8)}...
                {address === currentGame.player1 && " (You)"}
              </p>
            </div>
            <div>
              <p style={{ margin: "0 0 2px", color: "var(--text-secondary)" }}>
                Player 2
              </p>
              <p
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
              </p>
            </div>
            <div>
              <p style={{ margin: "0 0 2px", color: "var(--text-secondary)" }}>
                Stake
              </p>
              <p style={{ margin: 0, fontWeight: "bold", color: "#667eea" }}>
                {(BigInt(currentGame.stake) / BigInt(10_000_000)).toString()}{" "}
                XLM
              </p>
            </div>
            <div>
              <p style={{ margin: "0 0 2px", color: "var(--text-secondary)" }}>
                Moves
              </p>
              <p style={{ margin: 0, color: "var(--text-primary)" }}>
                {currentGame.move1 ? "✅" : "⏳"} P1{" "}
                {currentGame.move2 ? "✅" : "⏳"} P2
              </p>
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
                <p
                  style={{
                    color: "#64748b",
                    margin: "0 0 8px",
                    fontFamily: "var(--font-body)",
                  }}
                >
                  Reveal deadline passed and neither player revealed.
                </p>
                <button
                  type="button"
                  onClick={() => {
                    void claimRefund(view.gameId).then(() => {
                      handleBackToLobby();
                    });
                  }}
                  disabled={txLoading}
                  style={{
                    background: "transparent",
                    color: "var(--text-secondary)",
                    border: "1px solid var(--border-glass)",
                    borderRadius: "var(--radius-sm)",
                    padding: "8px 16px",
                    fontFamily: "var(--font-body)",
                    fontSize: "var(--text-sm)",
                    cursor: "pointer",
                  }}
                >
                  {txLoading
                    ? "⏳ Processing..."
                    : "↩️ Claim Refund (Split Escrow)"}
                </button>
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
                {/* Pulsing waiting indicator */}
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: "10px",
                    marginBottom: "14px",
                  }}
                >
                  <span
                    className="tf-waiting-dot"
                    style={{
                      display: "inline-block",
                      width: "10px",
                      height: "10px",
                      borderRadius: "50%",
                      background: "#f59e0b",
                      boxShadow: "0 0 12px rgba(245, 158, 11, 0.6)",
                    }}
                  />
                  <p
                    className="tf-waiting-pulse"
                    style={{
                      color: "#f59e0b",
                      margin: 0,
                      fontWeight: "bold",
                      fontFamily: "var(--font-body)",
                    }}
                  >
                    Waiting for opponent...
                  </p>
                </div>

                {/* Prominent game ID for sharing */}
                <div
                  style={{
                    margin: "0 0 16px",
                    padding: "12px",
                    borderRadius: "var(--radius-md)",
                    background: "var(--bg-glass-light)",
                    border: "1px solid var(--border-glass)",
                  }}
                >
                  <p
                    style={{
                      margin: "0 0 4px",
                      color: "var(--text-secondary)",
                      fontFamily: "var(--font-body)",
                    }}
                  >
                    Share your Game ID
                  </p>
                  <div
                    style={{
                      fontFamily: "var(--font-display)",
                      fontSize: "28px",
                      fontWeight: 600,
                      color: "var(--accent-violet)",
                      letterSpacing: "0.02em",
                    }}
                  >
                    #{view.gameId}
                  </div>
                </div>

                {/* Copy game link button */}
                <div
                  style={{
                    display: "flex",
                    justifyContent: "center",
                    marginBottom: "16px",
                  }}
                >
                  <ShimmerButton
                    size="sm"
                    onClick={() => handleCopyGameLink(view.gameId)}
                  >
                    {copiedLink ? "✅ Copied!" : "🔗 Copy Game Link"}
                  </ShimmerButton>
                </div>

                <p
                  style={{
                    color: "var(--text-secondary)",
                    marginTop: "8px",
                    fontFamily: "var(--font-body)",
                  }}
                >
                  {canCancel
                    ? "Commit deadline passed. You can cancel to reclaim your stake."
                    : `Time remaining for opponent: ${Math.floor(timeLeft / 60)}m ${timeLeft % 60}s`}
                </p>
                {canCancel && (
                  <button
                    type="button"
                    onClick={() => {
                      void cancelGame(view.gameId).then(() => {
                        handleBackToLobby();
                      });
                    }}
                    disabled={txLoading}
                    style={{
                      marginTop: "12px",
                      fontFamily: "var(--font-body)",
                      background: "transparent",
                      color: "var(--text-secondary)",
                      border: "1px solid var(--border-glass)",
                      borderRadius: "var(--radius-sm)",
                      padding: "8px 16px",
                      fontSize: "var(--text-sm)",
                      cursor: "pointer",
                    }}
                  >
                    {txLoading
                      ? "⏳ Cancelling..."
                      : "↩️ Cancel & Reclaim Stake"}
                  </button>
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
              <p
                style={{
                  color: "#10b981",
                  margin: "0 0 12px",
                  fontWeight: "bold",
                  fontFamily: "var(--font-body)",
                }}
              >
                ✅ Both players revealed! Resolve to distribute payouts.
              </p>
              <GameResult
                gameId={view.gameId}
                gameState={currentGame}
                onBack={handleBackToLobby}
                onPlayAgain={handlePlayAgain}
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
              <p
                style={{
                  color: "var(--text-secondary)",
                  margin: 0,
                  fontFamily: "var(--font-body)",
                }}
              >
                🔍 This game is waiting for a second player.
              </p>{" "}
              <button
                type="button"
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
                  background: "var(--accent-violet)",
                  color: "white",
                  border: "none",
                  borderRadius: "var(--radius-sm)",
                  padding: "8px 16px",
                  fontSize: "var(--text-sm)",
                  cursor: "pointer",
                }}
              >
                🎮 Join This Game
              </button>
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
            <p
              style={{
                color: "#F44336",
                margin: 0,
                fontFamily: "var(--font-body)",
              }}
            >
              ⚠️ Game not found
            </p>
            <button
              type="button"
              onClick={handleBackToLobby}
              style={{
                marginTop: "12px",
                fontFamily: "var(--font-body)",
                background: "transparent",
                color: "var(--text-secondary)",
                border: "1px solid var(--border-glass)",
                borderRadius: "var(--radius-sm)",
                padding: "8px 16px",
                fontSize: "var(--text-sm)",
                cursor: "pointer",
              }}
            >
              ← Back to Lobby
            </button>
          </CardDiv>
        )}
        {toastElement}
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
          color: "var(--text-muted)",
          fontFamily: "var(--font-body)",
        }}
      >
        <div style={{ fontSize: "40px", marginBottom: "16px" }}>⏳</div>
        <p style={{ margin: 0 }}>Loading game...</p>
      </div>
    );
  }

  // Match setup flow
  if (view.type === "matchSetup") {
    return (
      <div style={{ padding: "24px" }}>
        <MatchSetup
          onCreateMatch={handleMatchSetupConfirm}
          onBack={handleMatchSetupBack}
        />
        {toastElement}
      </div>
    );
  }

  // Match commit flow (create/join/startNext/joinNext/rematch)
  if (view.type === "matchCommit") {
    const phase =
      view.phase === "rematch"
        ? "rematch"
        : view.phase === "startNext"
          ? "startNext"
          : view.phase === "joinNext"
            ? "joinNext"
            : view.role === "p1"
              ? "create"
              : "join";
    return (
      <div style={{ padding: "24px" }}>
        <MatchCommitMove
          phase={phase}
          matchId={view.matchId}
          gameId={view.gameId || undefined}
          bestOf={pendingMatchSetup?.bestOf}
          stake={pendingMatchSetup?.stake}
          onComplete={(newGameId, newMatchId) => {
            void handleMatchCommitDone(newGameId, newMatchId);
          }}
          onBack={handleBackToLobby}
        />
        {toastElement}
      </div>
    );
  }

  // Match view — scoreboard above the current round's game view
  if (view.type === "match" && currentMatch) {
    const bothRevealed =
      currentGame?.move1 !== null && currentGame?.move2 !== null;
    const isRoundResolved =
      currentGame?.status === "Resolved" ||
      currentGame?.status === "Forfeited" ||
      currentGame?.status === "Cancelled";

    const matchCompleted = currentMatch.status === "Completed";
    const matchCancelled = currentMatch.status === "Cancelled";
    const awaitingNextRound =
      currentMatch.status === "AwaitingNextRound" && isRoundResolved;

    return (
      <div
        className="zk-page-container"
        style={{ padding: "24px", maxWidth: "800px", margin: "0 auto" }}
      >
        {/* Unified header + step indicator for current round */}
        {currentGame && !matchCompleted && !matchCancelled ? (
          <ZKStepIndicator
            step={deriveZKStep(
              currentGame.status,
              address === currentGame.player1
                ? currentGame.move1 !== null ||
                    currentGame.status === "BothCommitted"
                : currentGame.move2 !== null ||
                    currentGame.status === "BothCommitted",
              bothRevealed,
            )}
            gameId={view.matchId}
            onBack={handleBackToLobby}
            detail={
              currentGame.status === "AwaitingPlayer2"
                ? "Waiting for opponent to join and commit"
                : currentGame.status === "BothCommitted"
                  ? "Both moves locked in — reveal now!"
                  : undefined
            }
          />
        ) : (
          <ZKStepIndicator
            step="resolve"
            gameId={view.matchId}
            onBack={handleBackToLobby}
            detail={matchCompleted ? "Match complete" : undefined}
          />
        )}

        {/* Scoreboard */}
        <MatchScoreboard
          match={currentMatch}
          onStartNextRound={() => handleStartNextRound(view.matchId)}
        />

        {/* Completed match: winner + rematch */}
        {matchCompleted && (
          <CardDiv
            style={{
              textAlign: "center",
              padding: "24px",
              background: "rgba(16, 185, 129, 0.05)",
              border: "1px solid rgba(16, 185, 129, 0.2)",
            }}
          >
            <p
              style={{
                color: "#10b981",
                margin: "0 0 16px",
                fontWeight: "bold",
                fontFamily: "var(--font-body)",
              }}
            >
              🏆 Match complete! Start a new match with the same opponent.
            </p>
            <div
              style={{
                display: "flex",
                gap: "12px",
                justifyContent: "center",
                flexWrap: "wrap",
              }}
            >
              <ElectricButton color="violet" size="md" onClick={handleRematch}>
                🔄 Rematch
              </ElectricButton>
              <ShimmerButton size="md" onClick={handleBackToLobby}>
                ← Back to Lobby
              </ShimmerButton>
            </div>
          </CardDiv>
        )}

        {/* Cancelled match */}
        {matchCancelled && (
          <CardDiv
            style={{
              textAlign: "center",
              padding: "24px",
              background: "rgba(239, 68, 68, 0.05)",
              border: "1px solid rgba(239, 68, 68, 0.2)",
            }}
          >
            <p
              style={{
                color: "#ef4444",
                margin: "0 0 16px",
                fontWeight: "bold",
                fontFamily: "var(--font-body)",
              }}
            >
              ✖️ This match was cancelled.
            </p>
            <ShimmerButton size="md" onClick={handleBackToLobby}>
              ← Back to Lobby
            </ShimmerButton>
          </CardDiv>
        )}

        {/* Awaiting next round: commit next round prompt */}
        {awaitingNextRound && !matchCompleted && (
          <CardDiv
            style={{
              textAlign: "center",
              padding: "24px",
              background: "rgba(139, 92, 246, 0.05)",
              border: "1px solid rgba(139, 92, 246, 0.2)",
            }}
          >
            {view.role === "p1" ? (
              <>
                <p
                  style={{
                    color: "var(--accent-violet)",
                    margin: "0 0 16px",
                    fontWeight: "bold",
                    fontFamily: "var(--font-body)",
                  }}
                >
                  ⏭️ Round resolved. Commit your next move to start round{" "}
                  {currentMatch.current_round + 1}.
                </p>
                <ElectricButton
                  color="violet"
                  size="md"
                  onClick={() => handleStartNextRound(view.matchId)}
                >
                  ▶️ Commit Next Round
                </ElectricButton>
              </>
            ) : (
              <p
                style={{
                  color: "var(--text-secondary)",
                  margin: 0,
                  fontFamily: "var(--font-body)",
                }}
              >
                ⏳ Waiting for opponent to start the next round...
              </p>
            )}
          </CardDiv>
        )}

        {/* Active round: show the game view inline */}
        {!isRoundResolved &&
          !matchCompleted &&
          !matchCancelled &&
          currentGame && (
            <>
              <CardDiv
                style={{ padding: "24px", marginBottom: "20px" }}
                className={opponentJoined ? "tf-joined-glow" : undefined}
              >
                <h4
                  style={{
                    margin: "0 0 16px 0",
                    color: "var(--text-primary)",
                    textAlign: "center",
                    fontFamily: "var(--font-body)",
                  }}
                >
                  🎮 Round {currentMatch.current_round} — Game #
                  {currentMatch.current_game_id}
                </h4>
                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "1fr 1fr",
                    gap: "12px",
                    fontSize: "14px",
                  }}
                >
                  <div>
                    <p
                      style={{
                        margin: "0 0 2px",
                        color: "var(--text-secondary)",
                      }}
                    >
                      Player 1
                    </p>
                    <p
                      style={{
                        margin: 0,
                        color:
                          address === currentGame.player1 ? "#4CAF50" : "#333",
                        fontWeight:
                          address === currentGame.player1 ? "bold" : "normal",
                      }}
                    >
                      {currentGame.player1.slice(0, 8)}...
                      {address === currentGame.player1 && " (You)"}
                    </p>
                  </div>
                  <div>
                    <p
                      style={{
                        margin: "0 0 2px",
                        color: "var(--text-secondary)",
                      }}
                    >
                      Player 2
                    </p>
                    <p
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
                    </p>
                  </div>
                </div>
              </CardDiv>

              {/* Reveal move section */}
              {currentGame.status === "BothCommitted" && (
                <RevealMove
                  gameId={view.gameId}
                  gameState={currentGame}
                  onRevealed={() => {
                    void fetchGame(view.gameId);
                  }}
                />
              )}

              {/* Resolve / result when both revealed */}
              {currentGame.status === "BothCommitted" && bothRevealed && (
                <div style={{ marginTop: "16px" }}>
                  <GameResult
                    gameId={view.gameId}
                    gameState={currentGame}
                    onBack={handleBackToLobby}
                    onPlayAgain={() => {
                      void fetchMatch(view.matchId);
                      void fetchGame(view.gameId);
                    }}
                  />
                </div>
              )}
            </>
          )}
        {toastElement}
      </div>
    );
  }

  // Match view loading state
  if (view.type === "match" && !currentMatch) {
    return (
      <div
        style={{
          textAlign: "center",
          padding: "60px",
          color: "var(--text-muted)",
          fontFamily: "var(--font-body)",
        }}
      >
        <div style={{ fontSize: "40px", marginBottom: "16px" }}>⏳</div>
        <p style={{ margin: 0 }}>Loading match...</p>
      </div>
    );
  }

  // Create game flow
  if (view.type === "create") {
    // If we came from MatchSetup, use the match commit flow instead.
    if (pendingMatchSetup) {
      return (
        <div style={{ padding: "24px" }}>
          <MatchCommitMove
            phase="create"
            matchId={0}
            bestOf={pendingMatchSetup.bestOf}
            stake={pendingMatchSetup.stake}
            onComplete={(newGameId, newMatchId) => {
              setPendingMatchSetup(null);
              if (newMatchId) {
                setView({
                  type: "match",
                  matchId: newMatchId,
                  gameId: newGameId,
                  role: "p1",
                });
              } else {
                setView({ type: "game", gameId: newGameId });
              }
            }}
            onBack={() => {
              setPendingMatchSetup(null);
              handleBackToLobby();
            }}
          />
          {toastElement}
        </div>
      );
    }
    return (
      <div style={{ padding: "24px" }}>
        <ZKStepIndicator
          step="commit"
          onBack={handleBackToLobby}
          detail="Choose your move and generate a ZK proof"
        />
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
        <ZKStepIndicator
          step="commit"
          gameId={view.gameId}
          onBack={handleBackToLobby}
          detail="Choose your move and generate a ZK proof"
        />
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

      {/* Wallet setup helper — shows when wallet not connected or not funded */}
      <WalletSetupHelper />

      {/* Connect prompt (only if wallet helper didn't cover it) */}
      {!address && (
        <div
          className="glass-panel"
          style={{
            textAlign: "center",
            padding: "32px 24px",
            marginBottom: "24px",
            maxWidth: "480px",
            margin: "0 auto 24px",
            borderColor: "rgba(102,126,234,0.2)",
          }}
        >
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
        onCreateMatch={handleCreateMatch}
      />

      <AccreditationPanel />

      {toastElement}
    </div>
  );
};
