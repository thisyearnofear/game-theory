import React, { useEffect, useCallback } from "react";
import { Button, Text } from "@stellar/design-system";
import { useWallet } from "../../hooks/useWallet";
import { useZKDilemma, type GameListItem } from "../../hooks/useZKDilemma";

interface GameLobbyProps {
  onSelectGame: (gameId: number) => void;
  onCreateGame: () => void;
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
    onClick={onClick}
    onMouseEnter={onMouseEnter}
    onMouseLeave={onMouseLeave}
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

export const GameLobby: React.FC<GameLobbyProps> = ({
  onSelectGame,
  onCreateGame,
}) => {
  const { address } = useWallet();
  const { games, isLoading, error, fetchGames, clearError } = useZKDilemma();

  const refresh = useCallback(() => {
    clearError();
    void fetchGames();
  }, [fetchGames, clearError]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const openGames = games.filter((g) => g.status === "AwaitingPlayer2");
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
          <Text
            as="h2"
            size="lg"
            style={{
              fontFamily: "FuturaHandwritten",
              color: "rgba(255,255,255,0.95)",
              margin: 0,
            }}
          >
            🎮 ZK Multiplayer Lobby
          </Text>
          <Text
            as="p"
            size="sm"
            style={{
              fontFamily: "FuturaHandwritten",
              color: "rgba(255,255,255,0.7)",
              marginTop: "6px",
            }}
          >
            Zero-knowledge Prisoner's Dilemma — prove your move without
            revealing it
          </Text>
        </div>

        <div style={{ display: "flex", gap: "10px" }}>
          <Button
            variant="tertiary"
            size="md"
            onClick={refresh}
            disabled={isLoading}
            style={{ fontFamily: "FuturaHandwritten" }}
          >
            🔄 Refresh
          </Button>
          <Button
            variant="primary"
            size="md"
            onClick={onCreateGame}
            disabled={!address}
            style={{ fontFamily: "FuturaHandwritten" }}
          >
            ➕ Start a Trustfall
          </Button>
        </div>
      </div>

      {error && (
        <div
          style={{
            background: "#ffebee",
            borderRadius: "8px",
            padding: "12px 16px",
            marginBottom: "16px",
            color: "#c62828",
            fontFamily: "FuturaHandwritten",
            fontSize: "14px",
          }}
        >
          ⚠️ {error}
        </div>
      )}

      {/* My Active Games */}
      {myActiveGames.length > 0 && (
        <div style={{ marginBottom: "32px" }}>
          <Text
            as="h3"
            size="md"
            style={{
              fontFamily: "FuturaHandwritten",
              color: "rgba(255,255,255,0.9)",
              marginBottom: "12px",
            }}
          >
            🔥 My Active Games
          </Text>
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
                    fontFamily: "FuturaHandwritten",
                  }}
                >
                  <div>
                    <p
                      style={{
                        fontWeight: "bold",
                        margin: 0,
                        color: "#333",
                        fontSize: "16px",
                      }}
                    >
                      Game #{game.id}
                    </p>
                    <p
                      style={{
                        margin: "4px 0 0 0",
                        color: "#666",
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
                        fontFamily: "FuturaHandwritten",
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
        <Text
          as="h3"
          size="md"
          style={{
            fontFamily: "FuturaHandwritten",
            color: "rgba(255,255,255,0.9)",
            marginBottom: "12px",
          }}
        >
          🚪 Open Trustfalls to Join
        </Text>

        {isLoading ? (
          <div style={{ textAlign: "center", padding: "40px" }}>
            <Text
              as="p"
              size="md"
              style={{
                fontFamily: "FuturaHandwritten",
                color: "rgba(255,255,255,0.7)",
              }}
            >
              Loading games...
            </Text>
          </div>
        ) : openGames.length === 0 ? (
          <CardDiv
            style={{ textAlign: "center", padding: "32px", color: "#666" }}
          >
            <div style={{ fontSize: "48px", marginBottom: "12px" }}>🎲</div>
            <p
              style={{
                margin: 0,
                fontSize: "16px",
                fontFamily: "FuturaHandwritten",
              }}
            >
              No open games right now
            </p>
            <p
              style={{
                marginTop: "8px",
                fontSize: "14px",
                color: "#999",
                fontFamily: "FuturaHandwritten",
              }}
            >
              Create a new game to challenge someone!
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
                  fontFamily: "FuturaHandwritten",
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
                        color: "#333",
                        fontSize: "16px",
                      }}
                    >
                      Game #{game.id}
                    </p>
                    <p
                      style={{
                        margin: "4px 0 0 0",
                        color: "#666",
                        fontSize: "14px",
                      }}
                    >
                      Host: {game.player1.slice(0, 8)}...
                      {game.player1.slice(-4)}
                    </p>
                    <p
                      style={{
                        margin: "2px 0 0 0",
                        color: "#999",
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
                    <Button
                      variant="primary"
                      size="sm"
                      onClick={(e: React.MouseEvent) => {
                        e.stopPropagation();
                        onSelectGame(game.id);
                      }}
                      disabled={!address}
                      style={{
                        marginTop: "6px",
                        fontFamily: "FuturaHandwritten",
                      }}
                    >
                      Join
                    </Button>
                  </div>
                </div>
              </CardDiv>
            ))}
          </div>
        )}
      </div>

      {/* How it works */}
      <CardDiv
        style={{
          fontFamily: "FuturaHandwritten",
          background: "rgba(255,255,255,0.08)",
          border: "1px solid rgba(255,255,255,0.15)",
        }}
      >
        <p
          style={{
            margin: 0,
            color: "rgba(255,255,255,0.8)",
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
    color: "#666",
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
