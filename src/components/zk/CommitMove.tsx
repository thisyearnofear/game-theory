import React, { useState, useEffect } from "react";
import { Button, Text, Input } from "@stellar/design-system";
import { useWallet } from "../../hooks/useWallet";
import { useZKDilemma, type GameMove } from "../../hooks/useZKDilemma";
import {
  computeCommitment,
  generateNonce,
  generateProof,
} from "../../services/noirProofService";

interface CommitMoveProps {
  mode: "create" | "join";
  gameId?: number;
  hostAddress?: string;
  stake?: string;
  onComplete: (gameId: number) => void;
  onBack: () => void;
}

/** Card-like div */
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
      ...style,
    }}
  >
    {children}
  </div>
);

export const CommitMove: React.FC<CommitMoveProps> = ({
  mode,
  gameId,
  hostAddress,
  stake: initialStake,
  onComplete,
  onBack,
}) => {
  const { address } = useWallet();
  const { createGame, joinGame, getGameCount, isLoading, error } =
    useZKDilemma();

  const [selectedMove, setSelectedMove] = useState<GameMove | null>(null);
  const [stake, setStake] = useState(initialStake || "1");
  const [status, setStatus] = useState<"choose" | "generating" | "submitting">(
    "choose",
  );
  const [txError, setTxError] = useState<string | null>(null);
  const [commitDebug, setCommitDebug] = useState<string>("");
  const [savedNonce, setSavedNonce] = useState<bigint | null>(null);

  // Persist nonce and move for the reveal step
  // Use localStorage (survives browser close) with sessionStorage as fallback
  useEffect(() => {
    if (savedNonce && selectedMove) {
      const storageKey = `zk_nonce_${mode === "create" ? "new" : `game_${gameId}`}`;
      const moveKey = `zk_move_${mode === "create" ? "new" : `game_${gameId}`}`;
      const nonceStr = savedNonce.toString();
      const moveStr = selectedMove;
      try {
        localStorage.setItem(storageKey, nonceStr);
        localStorage.setItem(moveKey, moveStr);
      } catch {
        sessionStorage.setItem(storageKey, nonceStr);
        sessionStorage.setItem(moveKey, moveStr);
      }
    }
  }, [savedNonce, selectedMove, mode, gameId]);

  const canSubmit = selectedMove !== null && !isLoading;

  const handleCommit = async () => {
    if (!selectedMove || !address) return;

    setTxError(null);

    const moveNum: 0 | 1 = selectedMove === "C" ? 0 : 1;
    const nonce = generateNonce();
    setSavedNonce(nonce);

    // For create mode: retry up to 2 times if game_id prediction fails
    // (race condition: another game created between count check and tx)
    const MAX_RETRIES = 2;

    for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
      try {
        setStatus("generating");

        let targetGameId: number;
        if (mode === "create") {
          const count = await getGameCount();
          targetGameId = count + 1;
          setCommitDebug(
            `Attempt ${attempt + 1}: targeting game_id=${targetGameId}`,
          );
        } else {
          targetGameId = gameId ?? 0;
        }

        // Compute commitment hash (keccak256 of move + nonce + game_id)
        setCommitDebug(`Computing commitment for ${selectedMove}...`);
        const commitmentBytes = computeCommitment({
          move: moveNum,
          nonce,
          gameId: targetGameId,
        });

        const commitmentHex = Array.from(commitmentBytes)
          .map((b) => b.toString(16).padStart(2, "0"))
          .join("");

        setCommitDebug(`Commitment: ${commitmentHex.slice(0, 16)}...`);

        // Generate ZK proof
        setCommitDebug("Generating ZK proof...");
        const proofOutput = await generateProof({
          move: moveNum,
          nonce,
          gameId: targetGameId,
        });

        const proofHex = Array.from(proofOutput.proof)
          .map((b) => b.toString(16).padStart(2, "0"))
          .join("");

        setCommitDebug(`Proof: ${proofHex.slice(0, 16)}...`);

        // Submit to contract
        setStatus("submitting");

        if (mode === "create") {
          const stakeStroops = BigInt(
            Math.floor(parseFloat(stake) * 10_000_000),
          ).toString();
          const newGameId = await createGame(
            commitmentHex,
            proofHex,
            stakeStroops,
          );
          setCommitDebug(`Game #${newGameId} created!`);
          onComplete(newGameId);
        } else if (mode === "join" && gameId) {
          await joinGame(gameId, commitmentHex, proofHex);
          setCommitDebug(`Joined game #${gameId}!`);
          onComplete(gameId);
        }
        return; // Success — exit retry loop
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);

        // If create mode and this looks like a proof/commitment mismatch
        // (game_id race condition), retry with fresh count
        if (
          mode === "create" &&
          attempt < MAX_RETRIES &&
          /proof|commitment|verification|mismatch|hash/i.test(message)
        ) {
          setCommitDebug(
            `Game ID mismatch (race condition), retrying... (${attempt + 1}/${MAX_RETRIES})`,
          );
          continue;
        }

        setTxError(message);
        setStatus("choose");
        return;
      }
    }
  };

  if (!address) {
    return (
      <div style={{ textAlign: "center", padding: "40px" }}>
        <Text
          as="p"
          size="md"
          style={{
            fontFamily: "var(--font-body)",
            color: "rgba(20, 26, 46, 0.45)",
          }}
        >
          Connect your wallet to commit a move
        </Text>
      </div>
    );
  }

  const isLoadingState = status === "generating" || status === "submitting";

  return (
    <div
      className="zk-card-container"
      style={{ maxWidth: "600px", margin: "0 auto" }}
    >
      {/* Back button */}
      <button
        type="button"
        onClick={onBack}
        disabled={isLoadingState}
        style={{
          background: "none",
          border: "none",
          color: "rgba(20, 26, 46, 0.35)",
          cursor: isLoadingState ? "not-allowed" : "pointer",
          fontFamily: "var(--font-body)",
          fontSize: "16px",
          padding: "8px 0",
          marginBottom: "16px",
          opacity: isLoadingState ? 0.5 : 1,
        }}
      >
        ← Back to Lobby
      </button>

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
          {mode === "create" ? "🧍 Stand at the Edge" : "🧍 Step to the Edge"}
        </Text>

        <Text
          as="p"
          size="sm"
          style={{
            margin: "0 0 24px 0",
            color: "var(--text-secondary)",
            textAlign: "center",
            fontFamily: "var(--font-body)",
          }}
        >
          {mode === "create"
            ? "Choose your move. When you let go, a ZK proof binds you — no take-backs."
            : `Game #${gameId} — ${hostAddress?.slice(0, 8)}... is waiting. Will you catch them?`}
        </Text>

        {/* Move Selection */}
        <div style={{ marginBottom: "24px" }}>
          <Text
            as="p"
            size="sm"
            style={{
              margin: "0 0 12px 0",
              color: "var(--text-primary)",
              fontWeight: "bold",
              fontFamily: "var(--font-body)",
            }}
          >
            Choose Your Move
          </Text>
          <div
            className="zk-move-buttons"
            style={{
              display: "flex",
              gap: "12px",
              justifyContent: "center",
            }}
          >
            <button
              type="button"
              onClick={() => setSelectedMove("C")}
              disabled={isLoadingState}
              style={{
                flex: 1,
                padding: "20px",
                borderRadius: "12px",
                border:
                  selectedMove === "C" ? "3px solid #4CAF50" : "2px solid #ddd",
                background:
                  selectedMove === "C" ? "rgba(76, 175, 80, 0.1)" : "white",
                cursor: isLoadingState ? "not-allowed" : "pointer",
                transition: "transform 0.2s ease, all 0.2s",
                fontFamily: "var(--font-body)",
                opacity: isLoadingState ? 0.6 : 1,
              }}
              onMouseEnter={(e) => {
                if (!isLoadingState)
                  e.currentTarget.style.transform =
                    "translateY(-4px) rotate(-3deg)";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = "";
              }}
            >
              <div style={{ fontSize: "32px", marginBottom: "8px" }}>🤝</div>
              <div
                style={{
                  fontWeight: "bold",
                  color: selectedMove === "C" ? "#4CAF50" : "#333",
                }}
              >
                Cooperate
              </div>
              <div
                style={{
                  fontSize: "12px",
                  color: "var(--text-secondary)",
                  marginTop: "4px",
                }}
              >
                You'll catch them
              </div>
            </button>

            <button
              type="button"
              onClick={() => setSelectedMove("D")}
              disabled={isLoadingState}
              style={{
                flex: 1,
                padding: "20px",
                borderRadius: "12px",
                border:
                  selectedMove === "D" ? "3px solid #F44336" : "2px solid #ddd",
                background:
                  selectedMove === "D" ? "rgba(244, 67, 54, 0.1)" : "white",
                cursor: isLoadingState ? "not-allowed" : "pointer",
                transition: "transform 0.2s ease, all 0.2s",
                fontFamily: "var(--font-body)",
                opacity: isLoadingState ? 0.6 : 1,
              }}
              onMouseEnter={(e) => {
                if (!isLoadingState)
                  e.currentTarget.style.transform =
                    "translateY(4px) rotate(3deg)";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = "";
              }}
            >
              <div style={{ fontSize: "32px", marginBottom: "8px" }}>⚔️</div>
              <div
                style={{
                  fontWeight: "bold",
                  color: selectedMove === "D" ? "#F44336" : "#333",
                }}
              >
                Defect
              </div>
              <div
                style={{
                  fontSize: "12px",
                  color: "var(--text-secondary)",
                  marginTop: "4px",
                }}
              >
                You'll step aside
              </div>
            </button>
          </div>
        </div>

        {/* Stake Input (only for create mode) */}
        {mode === "create" && (
          <div style={{ marginBottom: "24px" }}>
            <Text
              as="p"
              size="sm"
              style={{
                margin: "0 0 8px 0",
                color: "var(--text-primary)",
                fontWeight: "bold",
                fontFamily: "var(--font-body)",
              }}
            >
              Stake (XLM) — the height of your fall
            </Text>
            <Input
              id="stake-input"
              fieldSize="md"
              value={stake}
              onChange={(e) => setStake(e.target.value)}
              type="number"
              min="0.1"
              step="0.1"
              disabled={isLoadingState}
              style={{ textAlign: "center", fontFamily: "var(--font-body)" }}
            />
            {/* Height visual — stake as fall height */}
            <div
              style={{
                display: "flex",
                alignItems: "flex-end",
                gap: "8px",
                marginTop: "12px",
                height: "60px",
              }}
            >
              <div
                className="tf-height-track"
                style={{
                  flex: 1,
                  height: "50px",
                  display: "flex",
                  alignItems: "flex-end",
                }}
              >
                <div
                  className="tf-height-bar"
                  style={{
                    width: "100%",
                    height: `${Math.min(100, Math.max(8, (parseFloat(stake) || 0) * 5))}%`,
                  }}
                />
              </div>
              <div style={{ fontSize: "24px", lineHeight: "50px" }}>🧍</div>
            </div>
            <Text
              as="p"
              size="xs"
              style={{
                margin: "4px 0 0",
                color: "var(--text-muted)",
                textAlign: "center",
                fontFamily: "var(--font-body)",
              }}
            >
              {(() => {
                const s = parseFloat(stake) || 0;
                if (s <= 0) return "Enter a stake to see the height";
                if (s < 1) return "A small step";
                if (s < 5) return "A real fall";
                if (s < 20) return "A long way down";
                if (s < 100) return "A cliff edge";
                return "The abyss";
              })()}
            </Text>
          </div>
        )}

        {/* Payoff reminder */}
        <CardDiv
          style={{
            marginBottom: "24px",
            background: "#f8f9fa",
            padding: "12px",
            fontSize: "13px",
          }}
        >
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "1fr 1fr 1fr",
              gap: "8px",
              textAlign: "center",
            }}
          >
            <div />
            <div style={{ fontWeight: "bold", color: "var(--text-secondary)" }}>
              They C
            </div>
            <div style={{ fontWeight: "bold", color: "var(--text-secondary)" }}>
              They D
            </div>
            <div style={{ fontWeight: "bold", color: "var(--text-primary)" }}>
              You C
            </div>
            <div style={{ color: "#4CAF50" }}>Both: 2×</div>
            <div style={{ color: "#ef6c00" }}>You: 0, Them: 3×</div>
            <div style={{ fontWeight: "bold", color: "var(--text-primary)" }}>
              You D
            </div>
            <div style={{ color: "#ef6c00" }}>You: 3×, Them: 0</div>
            <div style={{ color: "#c62828" }}>Both: 0</div>
          </div>
        </CardDiv>

        {/* Nonce display */}
        {savedNonce && (
          <div
            style={{
              background: "#fff8e1",
              borderRadius: "8px",
              padding: "12px",
              marginBottom: "16px",
              border: "1px solid #ffe082",
              fontFamily: "var(--font-body)",
            }}
          >
            <p
              style={{
                margin: "0 0 4px",
                fontWeight: "bold",
                fontSize: "13px",
              }}
            >
              🔑 Save Your Nonce!
            </p>
            <p
              style={{
                margin: "0 0 4px",
                fontSize: "12px",
                color: "var(--text-secondary)",
              }}
            >
              You'll need this to reveal your move:
            </p>
            <p
              style={{
                margin: 0,
                fontFamily: "monospace",
                fontSize: "14px",
                color: "#f57f17",
                fontWeight: "bold",
                wordBreak: "break-all",
              }}
            >
              {savedNonce.toString()}
            </p>
            <p
              style={{
                margin: "4px 0 0",
                fontSize: "11px",
                color: "var(--text-muted)",
              }}
            >
              (Saved in your browser session)
            </p>
          </div>
        )}

        {/* Status / Debug info */}
        {status !== "choose" && (
          <div
            style={{
              background: "#f0f4ff",
              borderRadius: "8px",
              padding: "16px",
              marginBottom: "16px",
              fontSize: "12px",
              color: "var(--text-primary)",
              fontFamily: "monospace",
              textAlign: "center",
              overflow: "hidden",
            }}
          >
            {status === "generating" && (
              <div>
                <div
                  className="tf-falling"
                  style={{
                    fontSize: "36px",
                    marginBottom: "8px",
                    display: "inline-block",
                  }}
                >
                  🧍
                </div>
                <div
                  style={{
                    fontFamily: "var(--font-body)",
                    fontSize: "14px",
                    color: "var(--text-secondary)",
                  }}
                >
                  You're falling... your ZK proof is binding your move.
                </div>
              </div>
            )}
            {status === "submitting" && (
              <div>
                <div
                  className="tf-suspended"
                  style={{
                    fontSize: "36px",
                    marginBottom: "8px",
                    display: "inline-block",
                  }}
                >
                  🕳️
                </div>
                <div
                  style={{
                    fontFamily: "var(--font-body)",
                    fontSize: "14px",
                    color: "var(--text-secondary)",
                  }}
                >
                  Suspended in the air — committing to the blockchain...
                </div>
              </div>
            )}
            {commitDebug && (
              <div style={{ marginTop: "4px", color: "var(--text-secondary)" }}>
                {commitDebug}
              </div>
            )}
          </div>
        )}

        {txError && (
          <Text
            as="p"
            size="sm"
            style={{
              color: "#F44336",
              marginBottom: "16px",
              textAlign: "center",
              fontFamily: "var(--font-body)",
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
              marginBottom: "16px",
              textAlign: "center",
              fontFamily: "var(--font-body)",
            }}
          >
            ⚠️ {error}
          </Text>
        )}

        {/* Submit */}
        <Button
          variant="primary"
          size="md"
          onClick={() => void handleCommit()}
          disabled={!canSubmit || isLoadingState}
          style={{
            width: "100%",
            fontFamily: "var(--font-body)",
            fontSize: "18px",
            padding: "14px",
          }}
        >
          {isLoadingState
            ? status === "generating"
              ? " Falling..."
              : " Committing..."
            : "✋ Let go"}
        </Button>
      </CardDiv>

      {/* ZK Info */}
      <CardDiv
        style={{
          marginTop: "16px",
          fontFamily: "var(--font-body)",
          background: "rgba(255,255,255,0.08)",
          border: "1px solid rgba(255,255,255,0.15)",
        }}
      >
        <Text
          as="p"
          size="xs"
          style={{
            margin: 0,
            color: "rgba(20, 26, 46, 0.45)",
            lineHeight: "1.5",
          }}
        >
          <strong>🔒 The math catches you:</strong> Your move is zero-knowledge
          proven before you let go — the contract knows your commitment is real,
          but can't see your move until you reveal it.
        </Text>
      </CardDiv>
    </div>
  );
};
