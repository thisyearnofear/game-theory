import React, { useState } from "react";
import { Button, Text } from "@stellar/design-system";
import { useWallet } from "../../hooks/useWallet";
import { useZKDilemma, type GameMove } from "../../hooks/useZKDilemma";

interface GameResultProps {
  gameId: number;
  gameState: {
    player1: string;
    player2: string | null;
    move1: GameMove | null;
    move2: GameMove | null;
    stake: string;
    status: string;
    reveal_deadline: string;
  };
  onBack: () => void;
}

/** Card-like div with consistent styling */
const CardDiv: React.FC<{
  children: React.ReactNode;
  style?: React.CSSProperties;
}> = ({ children, style }) => (
  <div
    style={{
      background: "white",
      borderRadius: "12px",
      padding: "24px",
      boxShadow: "0 2px 8px rgba(0,0,0,0.1)",
      fontFamily: "FuturaHandwritten",
      ...style,
    }}
  >
    {children}
  </div>
);

export const GameResult: React.FC<GameResultProps> = ({
  gameId,
  gameState,
  onBack,
}) => {
  const { address } = useWallet();
  const { resolveGame, claimForfeit, isLoading, error } = useZKDilemma();
  const [result, setResult] = useState<{
    payout1: bigint;
    payout2: bigint;
  } | null>(null);
  const [txError, setTxError] = useState<string | null>(null);

  const isPlayer1 = address === gameState.player1;
  const isPlayer2 = address === gameState.player2;
  const isPlayer = isPlayer1 || isPlayer2;

  const bothRevealed =
    gameState.move1 !== null && gameState.move2 !== null;
  const isResolved = gameState.status === "Resolved";
  const isForfeited = gameState.status === "Forfeited";
  const isActive = gameState.status === "BothCommitted" || gameState.status === "AwaitingPlayer2";

  // Check reveal deadline for forfeit claim
  const deadline = Number(gameState.reveal_deadline);
  const now = Math.floor(Date.now() / 1000);
  const deadlinePassed = now > deadline && deadline > 0;

  // Check if the player has revealed and opponent hasn't
  const playerRevealed = isPlayer1
    ? gameState.move1 !== null
    : isPlayer2
      ? gameState.move2 !== null
      : false;
  const opponentRevealed = isPlayer1
    ? gameState.move2 !== null
    : isPlayer2
      ? gameState.move1 !== null
      : false;

  const canResolve = bothRevealed && !isResolved && !isForfeited;
  const canClaimForfeit =
    isActive &&
    isPlayer &&
    playerRevealed &&
    !opponentRevealed &&
    deadlinePassed;

  const handleResolve = async () => {
    setTxError(null);
    try {
      const payouts = await resolveGame(gameId);
      setResult(payouts);
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      setTxError(message);
    }
  };

  const handleClaimForfeit = async () => {
    setTxError(null);
    try {
      await claimForfeit(gameId);
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      setTxError(message);
    }
  };

  const formatXLM = (stroops: bigint | string): string => {
    const s = typeof stroops === "string" ? BigInt(stroops) : stroops;
    return `${(Number(s) / 10_000_000).toFixed(7)} XLM`;
  };

  const formatAddress = (addr: string): string =>
    `${addr.slice(0, 6)}...${addr.slice(-4)}`;

  const getMoveEmoji = (move: GameMove | null): string => {
    if (move === "C") return "🤝";
    if (move === "D") return "⚔️";
    return "❓";
  };

  const getMoveLabel = (move: GameMove | null): string => {
    if (move === "C") return "Cooperated";
    if (move === "D") return "Defected";
    return "Not revealed";
  };

  const getOutcomeEmoji = (
    playerMove: GameMove | null,
    opponentMove: GameMove | null,
  ): string => {
    if (!playerMove || !opponentMove) return "⏳";
    if (playerMove === "C" && opponentMove === "C") return "🌟";
    if (playerMove === "D" && opponentMove === "D") return "💥";
    if (playerMove === "D" && opponentMove === "C") return "🏆";
    return "😔";
  };

  return (
    <div style={{ maxWidth: "600px", margin: "0 auto" }}>
      <CardDiv>
        <Text
          as="h3"
          size="lg"
          style={{
            margin: "0 0 20px 0",
            color: "#333",
            textAlign: "center",
            fontFamily: "FuturaHandwritten",
          }}
        >
          🎯 Game #{gameId} —{" "}
          {isResolved ? "Resolved" : isForfeited ? "Forfeited" : "In Progress"}
        </Text>

        {/* Moves Display */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "1fr auto 1fr",
            gap: "16px",
            alignItems: "center",
            marginBottom: "24px",
          }}
        >
          {/* Player 1 */}
          <div style={{ textAlign: "center" }}>
            <div
              style={{
                width: "60px",
                height: "60px",
                borderRadius: "50%",
                background: isPlayer1
                  ? "rgba(76, 175, 80, 0.2)"
                  : "rgba(158, 158, 158, 0.2)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: "28px",
                margin: "0 auto 8px",
                border: isPlayer1 ? "2px solid #4CAF50" : "2px solid transparent",
              }}
            >
              {getMoveEmoji(gameState.move1)}
            </div>
            <Text
              as="p"
              size="sm"
              style={{
                margin: "0",
                fontWeight: "bold",
                color: "#333",
              }}
            >
              P1 {isPlayer1 && "(You)"}
            </Text>
            <Text
              as="p"
              size="xs"
              style={{ margin: "2px 0 0", color: "#666" }}
            >
              {formatAddress(gameState.player1)}
            </Text>
            <Text
              as="p"
              size="xs"
              style={{
                margin: "4px 0 0",
                color:
                  gameState.move1 === "C"
                    ? "#4CAF50"
                    : gameState.move1 === "D"
                      ? "#F44336"
                      : "#999",
              }}
            >
              {getMoveLabel(gameState.move1)}
            </Text>
          </div>

          {/* VS / Outcome */}
          <div style={{ textAlign: "center" }}>
            <Text
              as="p"
              size="md"
              style={{
                margin: "0 0 4px",
                fontWeight: "bold",
                color: "#666",
              }}
            >
              VS
            </Text>
            <div style={{ fontSize: "32px" }}>
              {getOutcomeEmoji(gameState.move1, gameState.move2)}
            </div>
          </div>

          {/* Player 2 */}
          <div style={{ textAlign: "center" }}>
            <div
              style={{
                width: "60px",
                height: "60px",
                borderRadius: "50%",
                background: isPlayer2
                  ? "rgba(244, 67, 54, 0.2)"
                  : "rgba(158, 158, 158, 0.2)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: "28px",
                margin: "0 auto 8px",
                border: isPlayer2 ? "2px solid #F44336" : "2px solid transparent",
              }}
            >
              {gameState.player2 ? getMoveEmoji(gameState.move2) : "👤"}
            </div>
            <Text
              as="p"
              size="sm"
              style={{
                margin: "0",
                fontWeight: "bold",
                color: "#333",
              }}
            >
              P2 {isPlayer2 && "(You)"}
            </Text>
            <Text
              as="p"
              size="xs"
              style={{ margin: "2px 0 0", color: "#666" }}
            >
              {gameState.player2
                ? formatAddress(gameState.player2)
                : "Waiting for player..."}
            </Text>
            <Text
              as="p"
              size="xs"
              style={{
                margin: "4px 0 0",
                color:
                  gameState.move2 === "C"
                    ? "#4CAF50"
                    : gameState.move2 === "D"
                      ? "#F44336"
                      : "#999",
              }}
            >
              {getMoveLabel(gameState.move2)}
            </Text>
          </div>
        </div>

        {/* Payouts (if resolved) */}
        {(isResolved || result) && (
          <CardDiv
            style={{
              background:
                "linear-gradient(135deg, rgba(102, 126, 234, 0.1), rgba(76, 175, 80, 0.1))",
              border: "1px solid rgba(102, 126, 234, 0.2)",
              marginBottom: "16px",
            }}
          >
            <Text
              as="h4"
              size="sm"
              style={{
                margin: "0 0 12px 0",
                color: "#333",
                textAlign: "center",
                fontFamily: "FuturaHandwritten",
              }}
            >
              💰 Payouts
            </Text>
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "1fr 1fr",
                gap: "12px",
                textAlign: "center",
              }}
            >
              <div>
                <Text
                  as="p"
                  size="xs"
                  style={{ margin: "0 0 4px", color: "#666" }}
                >
                  Player 1
                </Text>
                <Text
                  as="p"
                  size="md"
                  style={{
                    margin: 0,
                    color: "#4CAF50",
                    fontWeight: "bold",
                  }}
                >
                  +{result ? formatXLM(result.payout1) : "—"}
                </Text>
              </div>
              <div>
                <Text
                  as="p"
                  size="xs"
                  style={{ margin: "0 0 4px", color: "#666" }}
                >
                  Player 2
                </Text>
                <Text
                  as="p"
                  size="md"
                  style={{
                    margin: 0,
                    color: "#4CAF50",
                    fontWeight: "bold",
                  }}
                >
                  +{result ? formatXLM(result.payout2) : "—"}
                </Text>
              </div>
            </div>
            <Text
              as="p"
              size="xs"
              style={{
                margin: "8px 0 0",
                color: "#999",
                textAlign: "center",
              }}
            >
              Stake per player: {formatXLM(gameState.stake)}
            </Text>
          </CardDiv>
        )}

        {/* Forfeited info */}
        {isForfeited && (
          <CardDiv
            style={{
              marginBottom: "16px",
              textAlign: "center",
              background: "rgba(244, 67, 54, 0.05)",
              border: "1px solid rgba(244, 67, 54, 0.2)",
            }}
          >
            <Text
              as="p"
              size="sm"
              style={{ margin: 0, color: "#F44336", fontWeight: "bold" }}
            >
              🏴 Game forfeited — one player didn't reveal in time
            </Text>
          </CardDiv>
        )}

        {/* Error */}
        {txError && (
          <Text
            as="p"
            size="sm"
            style={{
              color: "#F44336",
              marginBottom: "12px",
              textAlign: "center",
            }}
          >
            ⚠️ {txError}
          </Text>
        )}

        {error && (
          <Text
            as="p"
            size="sm"
            style={{
              color: "#F44336",
              marginBottom: "12px",
              textAlign: "center",
            }}
          >
            ⚠️ {error}
          </Text>
        )}

        {/* Action Buttons */}
        <div
          style={{
            display: "flex",
            gap: "10px",
            justifyContent: "center",
          }}
        >
          {canResolve && (
            <Button
              variant="primary"
              size="md"
              onClick={() => void handleResolve()}
              disabled={isLoading}
              style={{ fontFamily: "FuturaHandwritten", flex: 1 }}
            >
              {isLoading ? "⏳ Resolving..." : "🪙 Resolve Game"}
            </Button>
          )}

          {canClaimForfeit && (
            <Button
              variant="secondary"
              size="md"
              onClick={() => void handleClaimForfeit()}
              disabled={isLoading}
              style={{
                fontFamily: "FuturaHandwritten",
                flex: 1,
                color: "#F44336",
              }}
            >
              {isLoading ? "⏳ Claiming..." : "🏴 Claim Forfeit"}
            </Button>
          )}

          <Button
            variant="tertiary"
            size="md"
            onClick={onBack}
            style={{ fontFamily: "FuturaHandwritten" }}
          >
            ← Back
          </Button>
        </div>
      </CardDiv>
    </div>
  );
};
