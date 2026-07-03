import React, { useEffect, useCallback, useState } from "react";
import { useWallet } from "../../hooks/useWallet";
import { useZKDilemma, type GameListItem } from "../../hooks/useZKDilemma";
import { useGameStats, type GameRecord } from "../../hooks/useGameStats";
import { useFirstRun } from "../../hooks/useFirstRun";
import { StatsDisplay } from "./StatsDisplay";

type StakeFilter = "all" | "le1" | "1to5" | "gt5";

const STAKE_FILTERS: { key: StakeFilter; label: string }[] = [
  { key: "all", label: "All stakes" },
  { key: "le1", label: "≤1 XLM" },
  { key: "1to5", label: "1-5 XLM" },
  { key: "gt5", label: "5+ XLM" },
];

/** Returns the stake in XLM as a number from stroops string. */
const stakeToXlm = (stake: string): number => {
  try {
    return Number(BigInt(stake)) / 10_000_000;
  } catch {
    return 0;
  }
};

const matchesFilter = (stake: string, filter: StakeFilter): boolean => {
  if (filter === "all") return true;
  const xlm = stakeToXlm(stake);
  if (filter === "le1") return xlm <= 1;
  if (filter === "1to5") return xlm > 1 && xlm <= 5;
  if (filter === "gt5") return xlm > 5;
  return true;
};

interface GameLobbyProps {
  onSelectGame: (gameId: number) => void;
  onCreateGame: () => void;
  onCreateMatch?: () => void;
}

/** Card-like div with consistent styling */
const CardDiv: React.FC<{
  children: React.ReactNode;
  onClick?: () => void;
  onMouseEnter?: React.MouseEventHandler;
  onMouseLeave?: React.MouseEventHandler;
  style?: React.CSSProperties;
}> = ({ children, onClick, onMouseEnter, onMouseLeave, style }) => (
  <div
    className="glass-panel"
    onClick={onClick}
    onMouseEnter={onMouseEnter}
    onMouseLeave={onMouseLeave}
    style={{
      borderRadius: "12px",
      padding: "16px",
      ...style,
    }}
  >
    {children}
  </div>
);

export const GameLobby: React.FC<GameLobbyProps> = ({
  onSelectGame,
  onCreateGame,
  onCreateMatch,
}) => {
  const { address } = useWallet();
  const { games, isLoading, error, fetchGames, clearError } = useZKDilemma();
  const { getStats } = useGameStats();
  const { milestones } = useFirstRun();
  const [stakeFilter, setStakeFilter] = useState<StakeFilter>("all");

  // First-time users see a simplified lobby — no stats, no history, no filters
  // Once they've played their first ZK game, show the full lobby
  const isFirstTime = !milestones.first_zk_game;

  const refresh = useCallback(() => {
    clearError();
    void fetchGames();
  }, [fetchGames, clearError]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const openGames = games.filter(
    (g) =>
      g.status === "AwaitingPlayer2" && matchesFilter(g.stake, stakeFilter),
  );
  const myActiveGames = games.filter(
    (g) =>
      (g.player1 === address || g.status === "BothCommitted") &&
      g.status !== "Resolved" &&
      g.status !== "Forfeited",
  );

  const formatStake = (stake: string): string => {
    const stroops = BigInt(stake);
    const xlm = Number(stroops) / 10_000_000;
    return `${xlm.toFixed(2)} XLM`;
  };

  const formatDate = (timestamp: string): string => {
    const ts = Number(timestamp);
    if (ts === 0) return "N/A";
    return new Date(ts * 1000).toLocaleString();
  };

  const isMyGame = (game: GameListItem): boolean => game.player1 === address;

  return (
    <div style={{ maxWidth: "800px", margin: "0 auto" }}>
      {/* Header */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: "24px",
        }}
      >
        <div>
          <h2
            style={{
              fontFamily: "var(--font-body)",
              color: "rgba(255,255,255,0.95)",
              margin: 0,
            }}
          >
            🎮 ZK Multiplayer Lobby
          </h2>
          <p
            style={{
              fontFamily: "var(--font-body)",
              color: "var(--text-muted)",
              marginTop: "6px",
            }}
          >
            Zero-knowledge Prisoner's Dilemma — prove your move without
            revealing it
          </p>
        </div>

        <div style={{ display: "flex", gap: "10px" }}>
          <button
            type="button"
            onClick={refresh}
            disabled={isLoading}
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
            🔄 Refresh
          </button>
          {onCreateMatch && !isFirstTime && (
            <button
              type="button"
              onClick={onCreateMatch}
              disabled={!address}
              style={{
                background: "var(--bg-glass-light)",
                color: "var(--text-primary)",
                border: "1px solid var(--border-glass)",
                borderRadius: "var(--radius-sm)",
                padding: "8px 16px",
                fontFamily: "var(--font-body)",
                fontSize: "var(--text-sm)",
                cursor: "pointer",
              }}
            >
              🏟️ Create Match
            </button>
          )}
          <button
            type="button"
            onClick={onCreateGame}
            disabled={!address}
            style={{
              background: "var(--accent-violet)",
              color: "white",
              border: "none",
              borderRadius: "var(--radius-sm)",
              padding: "8px 16px",
              fontFamily: "var(--font-body)",
              fontSize: "var(--text-sm)",
              cursor: "pointer",
            }}
          >
            ➕ Start a Trustfall
          </button>
        </div>
      </div>

      {error && (
        <div
          style={{
            background: "var(--bg-glass-light)",
            borderRadius: "8px",
            padding: "12px 16px",
            marginBottom: "16px",
            color: "#f87171",
            fontFamily: "var(--font-body)",
            fontSize: "14px",
          }}
        >
          ⚠️ {error}
        </div>
      )}

      {/* Persistent stats panel — hidden for first-time users */}
      {!isFirstTime && <StatsDisplay stats={getStats()} />}

      {/* First-time welcome banner */}
      {isFirstTime && address && (
        <CardDiv
          style={{
            textAlign: "center",
            padding: "28px 24px",
            marginBottom: "24px",
            background: "rgba(102, 126, 234, 0.06)",
            border: "1px solid rgba(102, 126, 234, 0.2)",
          }}
        >
          <div style={{ fontSize: "40px", marginBottom: "12px" }}>🎮</div>
          <h3
            style={{
              fontFamily: "var(--font-display)",
              fontSize: "var(--text-xl)",
              color: "var(--text-primary)",
              margin: "0 0 8px",
            }}
          >
            Ready to Play!
          </h3>
          <p
            style={{
              fontFamily: "var(--font-body)",
              fontSize: "var(--text-sm)",
              color: "var(--text-secondary)",
              lineHeight: 1.5,
              margin: "0 0 16px",
            }}
          >
            Create a new game and invite a friend, or join an open game from the
            list below. Your move is proven with a zero-knowledge proof — your
            opponent can't see it until reveal time.
          </p>
        </CardDiv>
      )}

      {/* My Active Games */}
      {myActiveGames.length > 0 && (
        <div style={{ marginBottom: "32px" }}>
          <h3
            style={{
              fontFamily: "var(--font-body)",
              color: "var(--text-secondary)",
              marginBottom: "12px",
            }}
          >
            🔥 My Active Games
          </h3>
          <div
            style={{ display: "flex", flexDirection: "column", gap: "10px" }}
          >
            {myActiveGames.map((game) => (
              <CardDiv
                key={game.id}
                onClick={() => onSelectGame(game.id)}
                onMouseEnter={(e: React.MouseEvent) => {
                  (e.currentTarget as HTMLDivElement).style.transform =
                    "translateY(-2px)";
                  (e.currentTarget as HTMLDivElement).style.boxShadow =
                    "0 6px 20px rgba(0,0,0,0.3)";
                }}
                onMouseLeave={(e: React.MouseEvent) => {
                  (e.currentTarget as HTMLDivElement).style.transform = "";
                  (e.currentTarget as HTMLDivElement).style.boxShadow = "";
                }}
                style={{
                  cursor: "pointer",
                  transition: "transform 0.2s, box-shadow 0.2s",
                }}
              >
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    fontFamily: "var(--font-body)",
                  }}
                >
                  <div>
                    <p
                      style={{
                        fontWeight: "bold",
                        margin: 0,
                        color: "var(--text-primary)",
                        fontSize: "16px",
                      }}
                    >
                      Game #{game.id}
                    </p>
                    <p
                      style={{
                        margin: "4px 0 0 0",
                        color: "var(--text-secondary)",
                        fontSize: "14px",
                      }}
                    >
                      {isMyGame(game) ? "You" : game.player1.slice(0, 8)}... vs
                      ?
                    </p>
                  </div>
                  <div style={{ textAlign: "right" }}>
                    <p
                      style={{
                        margin: 0,
                        color: "#667eea",
                        fontWeight: "bold",
                        fontSize: "14px",
                        fontFamily: "var(--font-body)",
                      }}
                    >
                      {formatStake(game.stake)}
                    </p>
                    <StatusBadge status={game.status} />
                  </div>
                </div>
              </CardDiv>
            ))}
          </div>
        </div>
      )}

      {/* Open Games (available to join) */}
      <div style={{ marginBottom: "24px" }}>
        <h3
          style={{
            fontFamily: "var(--font-body)",
            color: "var(--text-secondary)",
            marginBottom: "12px",
          }}
        >
          🚪 Open Trustfalls to Join
        </h3>

        {/* Stake range filter pills — hidden for first-time users */}
        {!isFirstTime && (
          <div
            style={{
              display: "flex",
              gap: "8px",
              flexWrap: "wrap",
              marginBottom: "12px",
            }}
          >
            {STAKE_FILTERS.map((f) => {
              const active = stakeFilter === f.key;
              return (
                <button
                  key={f.key}
                  type="button"
                  onClick={() => setStakeFilter(f.key)}
                  style={{
                    padding: "6px 14px",
                    borderRadius: "99px",
                    border: "1px solid var(--border-glass)",
                    background: active
                      ? "var(--accent-violet)"
                      : "var(--bg-glass-light)",
                    color: active ? "#fff" : "var(--text-secondary)",
                    fontFamily: "var(--font-body)",
                    fontSize: "13px",
                    fontWeight: active ? 600 : 400,
                    cursor: "pointer",
                    transition:
                      "background 0.3s var(--ease-out), color 0.3s var(--ease-out), border-color 0.3s var(--ease-out)",
                    backdropFilter: "blur(12px)",
                  }}
                >
                  {f.label}
                </button>
              );
            })}
          </div>
        )}

        {isLoading ? (
          <div style={{ textAlign: "center", padding: "40px" }}>
            <p
              style={{
                fontFamily: "var(--font-body)",
                color: "var(--text-muted)",
              }}
            >
              Loading games...
            </p>
          </div>
        ) : openGames.length === 0 ? (
          <CardDiv
            style={{
              textAlign: "center",
              padding: "32px",
              color: "var(--text-secondary)",
            }}
          >
            <div style={{ fontSize: "48px", marginBottom: "12px" }}>🎲</div>
            <p
              style={{
                margin: 0,
                fontSize: "16px",
                fontFamily: "var(--font-body)",
              }}
            >
              {stakeFilter === "all"
                ? "No open games right now"
                : "No open games in this stake range"}
            </p>
            <p
              style={{
                marginTop: "8px",
                fontSize: "14px",
                color: "var(--text-muted)",
                fontFamily: "var(--font-body)",
              }}
            >
              {stakeFilter === "all"
                ? "Create a new game to challenge someone!"
                : "Try a different filter or create a new game."}
            </p>
          </CardDiv>
        ) : (
          <div
            style={{ display: "flex", flexDirection: "column", gap: "10px" }}
          >
            {openGames.map((game) => (
              <CardDiv
                key={game.id}
                onClick={() => onSelectGame(game.id)}
                onMouseEnter={(e: React.MouseEvent) => {
                  (e.currentTarget as HTMLDivElement).style.transform =
                    "translateY(-2px)";
                  (e.currentTarget as HTMLDivElement).style.boxShadow =
                    "0 6px 20px rgba(0,0,0,0.2)";
                }}
                onMouseLeave={(e: React.MouseEvent) => {
                  (e.currentTarget as HTMLDivElement).style.transform = "";
                  (e.currentTarget as HTMLDivElement).style.boxShadow = "";
                }}
                style={{
                  cursor: "pointer",
                  transition: "transform 0.2s, box-shadow 0.2s",
                  fontFamily: "var(--font-body)",
                }}
              >
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                  }}
                >
                  <div>
                    <p
                      style={{
                        fontWeight: "bold",
                        margin: 0,
                        color: "var(--text-primary)",
                        fontSize: "16px",
                      }}
                    >
                      Game #{game.id}
                    </p>
                    <p
                      style={{
                        margin: "4px 0 0 0",
                        color: "var(--text-secondary)",
                        fontSize: "14px",
                      }}
                    >
                      Host: {game.player1.slice(0, 8)}...
                      {game.player1.slice(-4)}
                    </p>
                    <p
                      style={{
                        margin: "2px 0 0 0",
                        color: "var(--text-muted)",
                        fontSize: "12px",
                      }}
                    >
                      Created: {formatDate(game.created_at)}
                    </p>
                  </div>
                  <div style={{ textAlign: "right" }}>
                    <p
                      style={{
                        margin: 0,
                        color: "#667eea",
                        fontWeight: "bold",
                        fontSize: "14px",
                      }}
                    >
                      {formatStake(game.stake)}
                    </p>
                    <button
                      type="button"
                      onClick={(e: React.MouseEvent) => {
                        e.stopPropagation();
                        onSelectGame(game.id);
                      }}
                      disabled={!address}
                      style={{
                        background: "var(--accent-violet)",
                        color: "white",
                        border: "none",
                        borderRadius: "var(--radius-sm)",
                        padding: "8px 16px",
                        fontFamily: "var(--font-body)",
                        fontSize: "var(--text-sm)",
                        cursor: "pointer",
                        marginTop: "6px",
                      }}
                    >
                      Join
                    </button>
                  </div>
                </div>
              </CardDiv>
            ))}
          </div>
        )}
      </div>

      {/* Recent game history — hidden for first-time users */}
      {!isFirstTime && <RecentHistory history={getStats().history} />}

      {/* How it works */}
      <CardDiv
        style={{
          fontFamily: "var(--font-body)",
          background: "rgba(255,255,255,0.08)",
          border: "1px solid rgba(255,255,255,0.15)",
        }}
      >
        <p
          style={{
            margin: 0,
            color: "var(--text-secondary)",
            lineHeight: "1.5",
            fontSize: "14px",
          }}
        >
          <strong>🔐 Zero-Knowledge Flow:</strong> Commit your move as a hash
          with a ZK proof → Wait for opponent → Reveal your move → Contract
          verifies it matches the commitment → Payouts settled automatically.
        </p>
      </CardDiv>
    </div>
  );
};

/** Status badge for game state */
const StatusBadge: React.FC<{ status: string }> = ({ status }) => {
  const config: Record<string, { label: string; color: string; bg: string }> = {
    AwaitingPlayer2: {
      label: "Waiting for player 2",
      color: "#f59e0b",
      bg: "rgba(245, 158, 11, 0.1)",
    },
    BothCommitted: {
      label: "Both committed — reveal now!",
      color: "#3b82f6",
      bg: "rgba(59, 130, 246, 0.1)",
    },
    Resolved: {
      label: "Resolved",
      color: "#10b981",
      bg: "rgba(16, 185, 129, 0.1)",
    },
    Forfeited: {
      label: "Forfeited",
      color: "#ef4444",
      bg: "rgba(239, 68, 68, 0.1)",
    },
  };

  const c = config[status] || {
    label: status,
    color: "var(--text-secondary)",
    bg: "transparent",
  };

  return (
    <span
      style={{
        display: "inline-block",
        padding: "2px 8px",
        borderRadius: "12px",
        fontSize: "11px",
        fontWeight: "bold",
        color: c.color,
        background: c.bg,
        marginTop: "4px",
      }}
    >
      {c.label}
    </span>
  );
};

/** Recent game history panel (last few resolved games). */
const RecentHistory: React.FC<{ history: GameRecord[] }> = ({ history }) => {
  if (history.length === 0) return null;

  const recent = history.slice(0, 8);

  const formatOpponent = (addr: string): string => {
    if (!addr) return "—";
    return `${addr.slice(0, 6)}...${addr.slice(-4)}`;
  };

  const formatTime = (ts: number): string => {
    const diff = Date.now() - ts;
    const mins = Math.floor(diff / 60_000);
    if (mins < 1) return "just now";
    if (mins < 60) return `${mins}m ago`;
    const hours = Math.floor(mins / 60);
    if (hours < 24) return `${hours}h ago`;
    const days = Math.floor(hours / 24);
    return `${days}d ago`;
  };

  const outcomeConfig: Record<
    GameRecord["outcome"],
    { label: string; color: string; emoji: string }
  > = {
    win: { label: "Win", color: "#4ade80", emoji: "🏆" },
    lose: { label: "Loss", color: "#f87171", emoji: "😔" },
    tie: { label: "Tie", color: "var(--text-secondary)", emoji: "🤝" },
  };

  return (
    <div style={{ marginBottom: "24px" }}>
      <h3
        style={{
          fontFamily: "var(--font-body)",
          color: "var(--text-secondary)",
          marginBottom: "12px",
        }}
      >
        📜 Recent Games
      </h3>
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          gap: "8px",
        }}
      >
        {recent.map((rec) => {
          const oc = outcomeConfig[rec.outcome];
          const payoutSign = rec.payout > 0 ? "+" : "";
          return (
            <div
              key={`${rec.gameId}-${rec.timestamp}`}
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                padding: "12px 16px",
                borderRadius: "var(--radius-sm)",
                background: "var(--bg-glass-light)",
                border: "1px solid var(--border-glass)",
                fontFamily: "var(--font-body)",
                backdropFilter: "blur(12px)",
              }}
            >
              <div
                style={{ display: "flex", alignItems: "center", gap: "10px" }}
              >
                <span style={{ fontSize: "18px" }}>{oc.emoji}</span>
                <div>
                  <p
                    style={{
                      margin: 0,
                      color: "var(--text-primary)",
                      fontSize: "14px",
                      fontWeight: 600,
                    }}
                  >
                    vs {formatOpponent(rec.opponent)}
                  </p>
                  <p
                    style={{
                      margin: "2px 0 0",
                      color: "var(--text-muted)",
                      fontSize: "12px",
                    }}
                  >
                    {rec.yourMove === "C" ? "Cooperated" : "Defected"} ·{" "}
                    {formatTime(rec.timestamp)}
                  </p>
                </div>
              </div>
              <div style={{ textAlign: "right" }}>
                <p
                  style={{
                    margin: 0,
                    color: oc.color,
                    fontSize: "13px",
                    fontWeight: "bold",
                  }}
                >
                  {oc.label}
                </p>
                <p
                  style={{
                    margin: "2px 0 0",
                    color:
                      rec.payout > 0
                        ? "#4ade80"
                        : rec.payout < 0
                          ? "#f87171"
                          : "var(--text-muted)",
                    fontSize: "12px",
                  }}
                >
                  {payoutSign}
                  {rec.payout.toFixed(2)} XLM
                </p>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
