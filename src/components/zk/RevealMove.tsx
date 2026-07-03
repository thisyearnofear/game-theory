import React, { useState, useEffect } from "react";
import { useWallet } from "../../hooks/useWallet";
import { useZKDilemma, type GameMove } from "../../hooks/useZKDilemma";

interface RevealMoveProps {
  gameId: number;
  gameState: {
    player1: string;
    player2: string | null;
    move1: GameMove | null;
    move2: GameMove | null;
    nonce1: string | null;
    nonce2: string | null;
    reveal_deadline: string;
    status: string;
  };
  onRevealed: () => void;
}

export const RevealMove: React.FC<RevealMoveProps> = ({
  gameId,
  gameState,
  onRevealed,
}) => {
  const { address } = useWallet();
  const { revealMove, isLoading, error } = useZKDilemma();
  const [revealNonce, setRevealNonce] = useState<string>("");
  const [selectedMove, setSelectedMove] = useState<GameMove | null>(null);
  const [txError, setTxError] = useState<string | null>(null);

  // Auto-fill nonce and move from storage (set during commit step)
  // Check localStorage first (survives browser close), then sessionStorage
  useEffect(() => {
    const nonceKey = `zk_nonce_game_${gameId}`;
    const moveKey = `zk_move_game_${gameId}`;
    const storedNonce =
      localStorage.getItem(nonceKey) || sessionStorage.getItem(nonceKey);
    const storedMove =
      localStorage.getItem(moveKey) || sessionStorage.getItem(moveKey);
    if (storedNonce && !revealNonce) {
      setRevealNonce(storedNonce);
    }
    if (storedMove && !selectedMove) {
      setSelectedMove(storedMove as GameMove);
    }
  }, [gameId, revealNonce, selectedMove]);

  // Determine the player's role
  const isPlayer1 = address === gameState.player1;
  const isPlayer2 = address === gameState.player2;
  const isPlayer = isPlayer1 || isPlayer2;

  // Check if the player has already revealed
  const hasRevealed = isPlayer1
    ? gameState.move1 !== null
    : isPlayer2
      ? gameState.move2 !== null
      : false;

  // Check reveal deadline
  const deadline = Number(gameState.reveal_deadline);
  const now = Math.floor(Date.now() / 1000);
  const isExpired = now > deadline && deadline > 0;
  const timeRemaining = deadline > 0 ? Math.max(0, deadline - now) : 0;

  // Check if opponent has revealed
  const opponentRevealed = isPlayer1
    ? gameState.move2 !== null
    : isPlayer2
      ? gameState.move1 !== null
      : false;

  // Both revealed?
  const bothRevealed = gameState.move1 !== null && gameState.move2 !== null;

  const handleReveal = async () => {
    if (!selectedMove || !address) return;

    setTxError(null);

    try {
      // The nonce should be passed as a bigint to the contract
      // The user enters it as a decimal string
      const nonceBigInt = BigInt(revealNonce || "0");
      if (nonceBigInt <= BigInt(0)) {
        setTxError("Please enter the nonce you used when committing");
        return;
      }

      await revealMove(gameId, selectedMove, nonceBigInt);
      onRevealed();
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      setTxError(message);
    }
  };

  if (!isPlayer) {
    return (
      <div
        className="glass-panel"
        style={{
          borderRadius: "12px",
          padding: "24px",
          fontFamily: "var(--font-body)",
          textAlign: "center",
        }}
      >
        <p style={{ color: "var(--text-secondary)", margin: 0 }}>
          👀 Spectating — wait for players to reveal their moves
        </p>
      </div>
    );
  }

  if (bothRevealed) {
    return (
      <div
        style={{
          background: "rgba(16, 185, 129, 0.05)",
          borderRadius: "12px",
          padding: "24px",
          border: "1px solid rgba(16, 185, 129, 0.2)",
          fontFamily: "var(--font-body)",
          textAlign: "center",
        }}
      >
        <p style={{ color: "#10b981", margin: 0, fontWeight: "bold" }}>
          ✅ Both players have revealed! The game is ready to resolve.
        </p>
      </div>
    );
  }

  if (hasRevealed) {
    return (
      <div
        style={{
          background: "rgba(59, 130, 246, 0.05)",
          borderRadius: "12px",
          padding: "24px",
          border: "1px solid rgba(59, 130, 246, 0.2)",
          fontFamily: "var(--font-body)",
          textAlign: "center",
        }}
      >
        <p style={{ color: "#3b82f6", margin: 0, fontWeight: "bold" }}>
          ✅ You've revealed your move. Waiting for{" "}
          {opponentRevealed ? "resolution..." : "your opponent to reveal..."}
        </p>
        {!opponentRevealed && timeRemaining > 0 && (
          <p style={{ color: "var(--text-secondary)", marginTop: "8px" }}>
            ⏱️ You can claim forfeit after the deadline (
            {Math.floor(timeRemaining / 60)}m {timeRemaining % 60}s remaining)
          </p>
        )}
      </div>
    );
  }

  if (isExpired) {
    return (
      <div
        style={{
          background: "rgba(244, 67, 54, 0.05)",
          borderRadius: "12px",
          padding: "24px",
          border: "1px solid rgba(244, 67, 54, 0.2)",
          fontFamily: "var(--font-body)",
          textAlign: "center",
        }}
      >
        <p
          style={{
            color: "#F44336",
            margin: 0,
            fontWeight: "bold",
          }}
        >
          ⏰ Reveal deadline has passed!{" "}
          {opponentRevealed
            ? "Your opponent can claim forfeit."
            : "You can no longer reveal and forfeit your stake."}
        </p>
      </div>
    );
  }

  return (
    <div
      className="glass-panel"
      style={{
        borderRadius: "12px",
        padding: "24px",
        fontFamily: "var(--font-body)",
      }}
    >
      <h4
        style={{
          margin: "0 0 16px 0",
          color: "var(--text-primary)",
          textAlign: "center",
        }}
      >
        🙋 Show Your Hand
      </h4>

      {/* Timer */}
      {timeRemaining > 0 && (
        <div
          style={{
            textAlign: "center",
            marginBottom: "16px",
            color: timeRemaining < 60 ? "#F44336" : "var(--text-secondary)",
            fontSize: "14px",
          }}
        >
          ⏱️ Time to reveal: {Math.floor(timeRemaining / 60)}m{" "}
          {timeRemaining % 60}s before you forfeit
        </div>
      )}

      {/* Move selection — confirm the move you committed earlier */}
      <p
        style={{
          margin: "0 0 8px 0",
          color: "var(--text-secondary)",
          textAlign: "center",
          fontFamily: "var(--font-body)",
        }}
      >
        {selectedMove
          ? "Confirm the move you committed — your nonce proves it matches"
          : "Select the move you committed earlier"}
      </p>
      <div
        style={{
          display: "flex",
          gap: "12px",
          marginBottom: "16px",
          justifyContent: "center",
        }}
      >
        <button
          type="button"
          onClick={() => setSelectedMove("C")}
          disabled={isLoading}
          style={{
            flex: 1,
            padding: "16px",
            borderRadius: "10px",
            border:
              selectedMove === "C"
                ? "3px solid #4CAF50"
                : "2px solid var(--border-glass)",
            background:
              selectedMove === "C"
                ? "rgba(76, 175, 80, 0.1)"
                : "var(--bg-glass-light)",
            cursor: isLoading ? "not-allowed" : "pointer",
            transition: "all 0.2s",
            fontFamily: "var(--font-body)",
            opacity: isLoading ? 0.6 : 1,
          }}
        >
          <div style={{ fontSize: "28px", marginBottom: "4px" }}>🤝</div>
          <div
            style={{
              fontWeight: "bold",
              color: selectedMove === "C" ? "#4CAF50" : "var(--text-primary)",
              fontSize: "14px",
            }}
          >
            Cooperate
          </div>
        </button>
        <button
          type="button"
          onClick={() => setSelectedMove("D")}
          disabled={isLoading}
          style={{
            flex: 1,
            padding: "16px",
            borderRadius: "10px",
            border:
              selectedMove === "D"
                ? "3px solid #F44336"
                : "2px solid var(--border-glass)",
            background:
              selectedMove === "D"
                ? "rgba(244, 67, 54, 0.1)"
                : "var(--bg-glass-light)",
            cursor: isLoading ? "not-allowed" : "pointer",
            transition: "all 0.2s",
            fontFamily: "var(--font-body)",
            opacity: isLoading ? 0.6 : 1,
          }}
        >
          <div style={{ fontSize: "28px", marginBottom: "4px" }}>⚔️</div>
          <div
            style={{
              fontWeight: "bold",
              color: selectedMove === "D" ? "#F44336" : "var(--text-primary)",
              fontSize: "14px",
            }}
          >
            Defect
          </div>
        </button>
      </div>

      {/* Nonce input */}
      <div style={{ marginBottom: "16px" }}>
        <p
          style={{
            margin: "0 0 6px 0",
            color: "var(--text-primary)",
            fontWeight: "bold",
          }}
        >
          Your Commitment Nonce
        </p>
        <p
          style={{
            margin: "0 0 8px 0",
            color: "var(--text-muted)",
          }}
        >
          Enter the nonce you used when committing (you saved it locally)
        </p>
        <input
          type="text"
          value={revealNonce}
          onChange={(e) => setRevealNonce(e.target.value)}
          placeholder="Enter your nonce..."
          disabled={isLoading}
          style={{
            width: "100%",
            padding: "10px 12px",
            borderRadius: "8px",
            border: "1px solid var(--border-glass)",
            fontFamily: "monospace",
            fontSize: "14px",
            boxSizing: "border-box",
          }}
        />
      </div>

      {txError && (
        <p
          style={{
            color: "#F44336",
            marginBottom: "12px",
            textAlign: "center",
          }}
        >
          ⚠️ {txError}
        </p>
      )}

      {error && (
        <p
          style={{
            color: "#F44336",
            marginBottom: "12px",
            textAlign: "center",
          }}
        >
          ⚠️ {error}
        </p>
      )}

      <button
        type="button"
        onClick={() => void handleReveal()}
        disabled={!selectedMove || !revealNonce || isLoading}
        style={{
          background: "var(--accent-violet)",
          color: "white",
          border: "none",
          borderRadius: "var(--radius-sm)",
          padding: "8px 16px",
          fontFamily: "var(--font-body)",
          fontSize: "var(--text-sm)",
          cursor: "pointer",
          width: "100%",
        }}
      >
        {isLoading ? "📡 Revealing..." : "🔓 Show My Hand"}
      </button>
    </div>
  );
};
