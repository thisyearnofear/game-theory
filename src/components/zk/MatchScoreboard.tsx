import React from "react";
import { useWallet } from "../../hooks/useWallet";
import type { MatchState } from "../../hooks/useZKDilemma";

interface MatchScoreboardProps {
  match: MatchState;
  /** Called when player 1 clicks "Start Next Round". */
  onStartNextRound?: () => void;
}

/**
 * MatchScoreboard — displays the current multi-round match state as a
 * scoreboard with a visual win tally, round number, status, and winner banner.
 *
 * Uses glassmorphic panel styling (`.glass-panel`) and design-system tokens.
 */
export const MatchScoreboard: React.FC<MatchScoreboardProps> = ({
  match,
  onStartNextRound,
}) => {
  const { address } = useWallet();

  const isPlayer1 = address === match.player1;
  const isPlayer2 = match.player2 != null && address === match.player2;

  const stakeXlm = (() => {
    try {
      return (Number(BigInt(match.stake)) / 10_000_000).toFixed(2);
    } catch {
      return "0.00";
    }
  })();

  // Build a visual win tally: ● for wins, ○ for remaining needed wins.
  const renderWinDots = (wins: number, target: number) => {
    const dots: React.ReactNode[] = [];
    for (let i = 0; i < target; i++) {
      const filled = i < wins;
      dots.push(
        <span
          key={i}
          style={{
            fontSize: "22px",
            lineHeight: 1,
            color: filled ? "var(--accent-violet)" : "var(--text-muted)",
            opacity: filled ? 1 : 0.4,
            transition:
              "color 0.3s var(--ease-out), opacity 0.3s var(--ease-out)",
          }}
        >
          {filled ? "●" : "○"}
        </span>,
      );
    }
    return <div style={{ display: "flex", gap: "6px" }}>{dots}</div>;
  };

  const statusConfig: Record<
    string,
    { label: string; color: string; bg: string; emoji: string }
  > = {
    AwaitingJoin: {
      label: "Awaiting Join",
      color: "#f59e0b",
      bg: "rgba(245, 158, 11, 0.12)",
      emoji: "⏳",
    },
    InProgress: {
      label: "In Progress",
      color: "#3b82f6",
      bg: "rgba(59, 130, 246, 0.12)",
      emoji: "🎮",
    },
    AwaitingNextRound: {
      label: "Awaiting Next Round",
      color: "#8b5cf6",
      bg: "rgba(139, 92, 246, 0.12)",
      emoji: "⏭️",
    },
    Completed: {
      label: "Completed",
      color: "#10b981",
      bg: "rgba(16, 185, 129, 0.12)",
      emoji: "🏆",
    },
    Cancelled: {
      label: "Cancelled",
      color: "#ef4444",
      bg: "rgba(239, 68, 68, 0.12)",
      emoji: "✖️",
    },
  };

  const sc = statusConfig[match.status] || {
    label: match.status,
    color: "var(--text-secondary)",
    bg: "transparent",
    emoji: "•",
  };

  // Winner determination
  const winner =
    match.status === "Completed"
      ? match.p1_wins >= match.target_wins
        ? "p1"
        : match.p2_wins >= match.target_wins
          ? "p2"
          : null
      : null;

  const youWon =
    winner === "p1" ? isPlayer1 : winner === "p2" ? isPlayer2 : false;

  return (
    <div
      className="glass-panel"
      style={{
        padding: "20px 24px",
        marginBottom: "20px",
        borderColor: "rgba(102,126,234,0.2)",
      }}
    >
      {/* Header: Best of X + round number */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: "16px",
        }}
      >
        <h3
          style={{
            margin: 0,
            fontFamily: "var(--font-display)",
            color: "var(--text-primary)",
            fontWeight: 600,
          }}
        >
          🏟️ Best of {match.best_of}
        </h3>
        <div
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: "6px",
            padding: "4px 12px",
            borderRadius: "99px",
            background: sc.bg,
            border: `1px solid ${sc.color}33`,
            fontFamily: "var(--font-body)",
            fontSize: "13px",
            fontWeight: 600,
            color: sc.color,
          }}
        >
          <span>{sc.emoji}</span>
          <span>{sc.label}</span>
        </div>
      </div>

      {/* Round number + stake */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: "18px",
          fontFamily: "var(--font-body)",
          fontSize: "13px",
          color: "var(--text-secondary)",
        }}
      >
        <span>
          Round{" "}
          <span
            style={{
              color: "var(--text-primary)",
              fontWeight: 600,
              fontSize: "15px",
            }}
          >
            {match.current_round}
          </span>{" "}
          / {match.best_of}
        </span>
        <span>
          Stake per round:{" "}
          <span style={{ color: "var(--accent-violet)", fontWeight: 600 }}>
            {stakeXlm} XLM
          </span>
        </span>
      </div>

      {/* Score grid: P1 wins | ties | P2 wins */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1fr auto 1fr",
          gap: "16px",
          alignItems: "center",
        }}
      >
        {/* Player 1 */}
        <div style={{ textAlign: "center" }}>
          <p
            style={{
              margin: "0 0 4px",
              color: isPlayer1 ? "#4CAF50" : "var(--text-secondary)",
              fontFamily: "var(--font-body)",
              fontWeight: isPlayer1 ? 700 : 400,
            }}
          >
            Player 1{isPlayer1 ? " (You)" : ""}
          </p>
          <div
            style={{
              fontSize: "28px",
              fontWeight: 700,
              fontFamily: "var(--font-display)",
              color: "var(--text-primary)",
              marginBottom: "6px",
            }}
          >
            {match.p1_wins}
          </div>
          {renderWinDots(match.p1_wins, match.target_wins)}
        </div>

        {/* Ties */}
        <div
          style={{
            textAlign: "center",
            padding: "0 12px",
            borderLeft: "1px solid var(--border-glass)",
            borderRight: "1px solid var(--border-glass)",
          }}
        >
          <p
            style={{
              margin: "0 0 4px",
              color: "var(--text-muted)",
              fontFamily: "var(--font-body)",
            }}
          >
            Ties
          </p>
          <div
            style={{
              fontSize: "22px",
              fontWeight: 600,
              fontFamily: "var(--font-display)",
              color: "var(--text-secondary)",
            }}
          >
            {match.ties}
          </div>
          <div
            style={{
              fontSize: "11px",
              color: "var(--text-muted)",
              fontFamily: "var(--font-body)",
              marginTop: "2px",
            }}
          >
            🤝
          </div>
        </div>

        {/* Player 2 */}
        <div style={{ textAlign: "center" }}>
          <p
            style={{
              margin: "0 0 4px",
              color: isPlayer2 ? "#F44336" : "var(--text-secondary)",
              fontFamily: "var(--font-body)",
              fontWeight: isPlayer2 ? 700 : 400,
            }}
          >
            {match.player2
              ? `Player 2${isPlayer2 ? " (You)" : ""}`
              : "Awaiting..."}
          </p>
          <div
            style={{
              fontSize: "28px",
              fontWeight: 700,
              fontFamily: "var(--font-display)",
              color: "var(--text-primary)",
              marginBottom: "6px",
            }}
          >
            {match.p2_wins}
          </div>
          {renderWinDots(match.p2_wins, match.target_wins)}
        </div>
      </div>

      {/* Winner banner (Completed) */}
      {match.status === "Completed" && winner && (
        <div
          className="tf-fade-in-up"
          style={{
            marginTop: "18px",
            textAlign: "center",
            padding: "14px",
            borderRadius: "var(--radius-md)",
            background: youWon
              ? "linear-gradient(135deg, rgba(16, 185, 129, 0.18), rgba(74, 222, 128, 0.08))"
              : "linear-gradient(135deg, rgba(239, 68, 68, 0.14), rgba(100, 116, 139, 0.08))",
            border: youWon
              ? "1px solid rgba(16, 185, 129, 0.35)"
              : "1px solid rgba(239, 68, 68, 0.25)",
            fontFamily: "var(--font-body)",
          }}
        >
          <div style={{ fontSize: "32px", marginBottom: "6px" }}>
            {youWon ? "🏆" : "😔"}
          </div>
          <p
            style={{
              margin: 0,
              color: youWon ? "#10b981" : "#f87171",
              fontWeight: 700,
              fontFamily: "var(--font-body)",
            }}
          >
            {youWon
              ? "You won the match!"
              : winner === "p1"
                ? `Player 1 won the match ${match.p1_wins}–${match.p2_wins}`
                : `Player 2 won the match ${match.p2_wins}–${match.p1_wins}`}
          </p>
        </div>
      )}

      {/* Cancelled banner */}
      {match.status === "Cancelled" && (
        <div
          style={{
            marginTop: "18px",
            textAlign: "center",
            padding: "12px",
            borderRadius: "var(--radius-md)",
            background: "rgba(239, 68, 68, 0.08)",
            border: "1px solid rgba(239, 68, 68, 0.2)",
            fontFamily: "var(--font-body)",
          }}
        >
          <p
            style={{
              margin: 0,
              color: "#ef4444",
              fontWeight: 600,
            }}
          >
            ✖️ This match was cancelled.
          </p>
        </div>
      )}

      {/* AwaitingNextRound prompt */}
      {match.status === "AwaitingNextRound" && (
        <div
          style={{
            marginTop: "18px",
            textAlign: "center",
            padding: "14px",
            borderRadius: "var(--radius-md)",
            background: "rgba(139, 92, 246, 0.08)",
            border: "1px solid rgba(139, 92, 246, 0.25)",
            fontFamily: "var(--font-body)",
          }}
        >
          {isPlayer1 ? (
            <>
              <p
                style={{
                  margin: "0 0 10px",
                  color: "var(--accent-violet)",
                  fontWeight: 600,
                }}
              >
                ⏭️ It's your move — start the next round.
              </p>
              {onStartNextRound && (
                <button
                  type="button"
                  onClick={onStartNextRound}
                  style={{
                    cursor: "pointer",
                    padding: "10px 24px",
                    borderRadius: "99px",
                    border: "1px solid var(--accent-violet)",
                    background: "var(--accent-violet)",
                    color: "#fff",
                    fontFamily: "var(--font-body)",
                    fontSize: "15px",
                    fontWeight: 600,
                    transition: "transform 0.2s var(--ease-out)",
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.transform = "translateY(-2px)";
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.transform = "";
                  }}
                >
                  ▶️ Start Next Round
                </button>
              )}
            </>
          ) : isPlayer2 ? (
            <p
              style={{
                margin: 0,
                color: "var(--text-secondary)",
                fontWeight: 500,
              }}
            >
              ⏳ Waiting for opponent to start the next round...
            </p>
          ) : (
            <p
              style={{
                margin: 0,
                color: "var(--text-muted)",
              }}
            >
              👀 Spectating — waiting for player 1 to start the next round.
            </p>
          )}
        </div>
      )}
    </div>
  );
};
