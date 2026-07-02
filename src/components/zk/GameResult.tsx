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
  className?: string;
}> = ({ children, style, className }) => (
  <div
    className={className}
    style={{
      background: "var(--bg-glass)",
      backdropFilter: "blur(16px) saturate(160%)",
      border: "1px solid var(--border-glass)",
      borderRadius: "var(--radius-md)",
      padding: "24px",
      boxShadow: "var(--shadow-md)",
      fontFamily: "var(--font-body)",
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

  const bothRevealed = gameState.move1 !== null && gameState.move2 !== null;
  const isResolved = gameState.status === "Resolved";
  const isForfeited = gameState.status === "Forfeited";
  const isActive =
    gameState.status === "BothCommitted" ||
    gameState.status === "AwaitingPlayer2";

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

  // Trustfall outcome classification
  const bothCooperated = gameState.move1 === "C" && gameState.move2 === "C";
  const bothDefected = gameState.move1 === "D" && gameState.move2 === "D";
  const youWereBetrayed =
    isPlayer &&
    ((isPlayer1 && gameState.move1 === "C" && gameState.move2 === "D") ||
      (isPlayer2 && gameState.move2 === "C" && gameState.move1 === "D"));
  const youBetrayed =
    isPlayer &&
    ((isPlayer1 && gameState.move1 === "D" && gameState.move2 === "C") ||
      (isPlayer2 && gameState.move2 === "D" && gameState.move1 === "C"));

  const outcomeClass = bothCooperated
    ? "tf-catch"
    : bothDefected
      ? "tf-impact"
      : youWereBetrayed
        ? "tf-shake"
        : youBetrayed
          ? "tf-fade-in-up"
          : "";

  const outcomeBg = bothCooperated
    ? "linear-gradient(135deg, rgba(255, 180, 80, 0.12), rgba(255, 140, 60, 0.08))"
    : bothDefected || youWereBetrayed
      ? "linear-gradient(135deg, rgba(100, 120, 160, 0.12), rgba(60, 80, 120, 0.08))"
      : "linear-gradient(135deg, rgba(102, 126, 234, 0.1), rgba(76, 175, 80, 0.08))";

  const outcomeGlow = bothCooperated ? "tf-glow-warm" : "";

  const getOutcomeHeadline = (): { title: string; subtitle: string } => {
    if (!bothRevealed && !isResolved && !isForfeited)
      return {
        title: "Suspended in the air...",
        subtitle: "Waiting for the reveal",
      };
    if (isForfeited)
      return {
        title: "No one caught anyone",
        subtitle: "Someone didn't show up for the reveal",
      };
    if (bothCooperated)
      return {
        title: "Caught",
        subtitle: "You both showed up. Trust rewarded.",
      };
    if (bothDefected)
      return {
        title: "Mutual Destruction",
        subtitle: "You both stepped aside. Nobody caught anyone.",
      };
    if (youWereBetrayed)
      return {
        title: "You Hit the Ground",
        subtitle: "You reached out. They stepped aside.",
      };
    if (youBetrayed)
      return {
        title: "You Stepped Aside",
        subtitle: "They reached out. You let them fall.",
      };
    return { title: "The Moment of Truth", subtitle: "" };
  };

  const headline = getOutcomeHeadline();

  return (
    <div style={{ maxWidth: "600px", margin: "0 auto" }}>
      <CardDiv>
        <Text
          as="h3"
          size="lg"
          style={{
            margin: "0 0 8px 0",
            color: "var(--text-primary)",
            textAlign: "center",
            fontFamily: "var(--font-body)",
          }}
        >
          {isResolved || isForfeited ? headline.title : "The Moment of Truth"}
        </Text>
        <Text
          as="p"
          size="sm"
          style={{
            margin: "0 0 20px 0",
            color: "var(--text-secondary)",
            textAlign: "center",
            fontFamily: "var(--font-body)",
          }}
        >
          Game #{gameId} —{" "}
          {headline.subtitle ||
            (isResolved
              ? "Resolved"
              : isForfeited
                ? "Forfeited"
                : "In Progress")}
        </Text>

        {/* The Moment of Truth — catch/impact visual */}
        <div
          className={outcomeClass}
          style={{
            background: outcomeBg,
            borderRadius: "16px",
            padding: "32px 20px",
            marginBottom: "24px",
            textAlign: "center",
            position: "relative",
            overflow: "hidden",
          }}
        >
          {/* Two figures facing each other */}
          <div
            style={{
              display: "flex",
              justifyContent: "center",
              alignItems: "center",
              gap: "40px",
              marginBottom: "16px",
            }}
          >
            {/* Player 1 figure */}
            <div style={{ textAlign: "center" }}>
              <div
                style={{
                  fontSize: "48px",
                  marginBottom: "4px",
                  display: "inline-block",
                }}
                className={
                  isResolved && gameState.move1 === "C" ? "tf-catch" : ""
                }
              >
                {gameState.move1 === "C"
                  ? "🤝"
                  : gameState.move1 === "D"
                    ? "⚔️"
                    : "🧍"}
              </div>
              <div
                style={{
                  fontSize: "11px",
                  color: isPlayer1 ? "#4CAF50" : "#999",
                  fontWeight: "bold",
                }}
              >
                P1{isPlayer1 ? " (You)" : ""}
              </div>
              <div style={{ fontSize: "10px", color: "var(--text-muted)" }}>
                {formatAddress(gameState.player1)}
              </div>
            </div>

            {/* Center outcome */}
            <div
              className={outcomeGlow}
              style={{
                fontSize: "56px",
                borderRadius: "50%",
                padding: "8px",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                minWidth: "80px",
                minHeight: "80px",
              }}
            >
              {getOutcomeEmoji(gameState.move1, gameState.move2)}
            </div>

            {/* Player 2 figure */}
            <div style={{ textAlign: "center" }}>
              <div
                style={{
                  fontSize: "48px",
                  marginBottom: "4px",
                  display: "inline-block",
                }}
                className={
                  isResolved && gameState.move2 === "C" ? "tf-catch" : ""
                }
              >
                {gameState.player2
                  ? gameState.move2 === "C"
                    ? "🤝"
                    : gameState.move2 === "D"
                      ? "⚔️"
                      : "🧍"
                  : "👤"}
              </div>
              <div
                style={{
                  fontSize: "11px",
                  color: isPlayer2 ? "#F44336" : "#999",
                  fontWeight: "bold",
                }}
              >
                P2{isPlayer2 ? " (You)" : ""}
              </div>
              <div style={{ fontSize: "10px", color: "var(--text-muted)" }}>
                {gameState.player2
                  ? formatAddress(gameState.player2)
                  : "Waiting..."}
              </div>
            </div>
          </div>

          {/* Move labels */}
          <div
            style={{
              display: "flex",
              justifyContent: "center",
              gap: "40px",
              fontSize: "13px",
              fontFamily: "var(--font-body)",
            }}
          >
            <span
              style={{
                color:
                  gameState.move1 === "C"
                    ? "#4CAF50"
                    : gameState.move1 === "D"
                      ? "#F44336"
                      : "#999",
              }}
            >
              {getMoveLabel(gameState.move1)}
            </span>
            <span
              style={{
                color:
                  gameState.move2 === "C"
                    ? "#4CAF50"
                    : gameState.move2 === "D"
                      ? "#F44336"
                      : "#999",
              }}
            >
              {gameState.player2 ? getMoveLabel(gameState.move2) : "—"}
            </span>
          </div>
        </div>

        {/* Payouts (if resolved) — the landing */}
        {(isResolved || result) && (
          <CardDiv
            className="tf-fade-in-up"
            style={{
              background: bothCooperated
                ? "linear-gradient(135deg, rgba(255, 180, 80, 0.12), rgba(255, 140, 60, 0.06))"
                : "linear-gradient(135deg, rgba(102, 126, 234, 0.08), rgba(76, 175, 80, 0.06))",
              border: bothCooperated
                ? "1px solid rgba(255, 180, 80, 0.3)"
                : "1px solid rgba(102, 126, 234, 0.15)",
              marginBottom: "16px",
            }}
          >
            <Text
              as="h4"
              size="sm"
              style={{
                margin: "0 0 12px 0",
                color: "var(--text-primary)",
                textAlign: "center",
                fontFamily: "var(--font-body)",
              }}
            >
              {bothCooperated ? "💰 You both landed soft" : "💰 The landing"}
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
                  style={{ margin: "0 0 4px", color: "var(--text-secondary)" }}
                >
                  Player 1{isPlayer1 ? " (You)" : ""}
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
                  style={{ margin: "0 0 4px", color: "var(--text-secondary)" }}
                >
                  Player 2{isPlayer2 ? " (You)" : ""}
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
                color: "var(--text-muted)",
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
              background: "rgba(100, 120, 160, 0.06)",
              border: "1px solid rgba(100, 120, 160, 0.2)",
            }}
          >
            <Text
              as="p"
              size="sm"
              style={{ margin: 0, color: "#667eea", fontWeight: "bold" }}
            >
              🏴 Nobody caught anyone — one player didn't show up for the reveal
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
              style={{ fontFamily: "var(--font-body)", flex: 1 }}
            >
              {isLoading ? "⏳ Landing..." : "🪙 Resolve the Landing"}
            </Button>
          )}

          {canClaimForfeit && (
            <Button
              variant="secondary"
              size="md"
              onClick={() => void handleClaimForfeit()}
              disabled={isLoading}
              style={{
                fontFamily: "var(--font-body)",
                flex: 1,
                color: "#F44336",
              }}
            >
              {isLoading ? "⏳ Claiming..." : "🏴 Claim the Fall"}
            </Button>
          )}

          <Button
            variant="tertiary"
            size="md"
            onClick={onBack}
            style={{ fontFamily: "var(--font-body)" }}
          >
            ← Back
          </Button>
        </div>
      </CardDiv>
    </div>
  );
};
