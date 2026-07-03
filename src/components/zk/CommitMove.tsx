import React, { useState, useEffect } from "react";
import { Input } from "@stellar/design-system";
import { useWallet } from "../../hooks/useWallet";
import { useZKDilemma, type GameMove } from "../../hooks/useZKDilemma";
import {
  computeCommitment,
  generateNonce,
  generateProof,
} from "../../services/noirProofService";
import { ShimmerButton } from "../ui/ShimmerButton";
import { TrustFallCharacter } from "../TrustFallCharacter";

/** Stake preset options for quick selection */
const STAKE_PRESETS = ["1", "5", "10"] as const;
const RECOMMENDED_STAKE = "5";

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
    className="glass-panel"
    style={{
      borderRadius: "12px",
      padding: "24px",
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
  const [stake, setStake] = useState(initialStake || RECOMMENDED_STAKE);
  const [showCustomStake, setShowCustomStake] = useState(false);
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
        <p
          style={{
            fontFamily: "var(--font-body)",
            color: "var(--text-secondary)",
          }}
        >
          Connect your wallet to commit a move
        </p>
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
          color: "var(--text-muted)",
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
        <h3
          style={{
            margin: "0 0 8px 0",
            color: "var(--text-primary)",
            textAlign: "center",
            fontFamily: "var(--font-body)",
          }}
        >
          {mode === "create" ? "🧍 Stand at the Edge" : "🧍 Step to the Edge"}
        </h3>

        <p
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
        </p>

        {/* Move Selection */}
        <div style={{ marginBottom: "24px" }}>
          <p
            style={{
              margin: "0 0 12px 0",
              color: "var(--text-primary)",
              fontWeight: "bold",
              fontFamily: "var(--font-body)",
            }}
          >
            Choose Your Move
          </p>
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
                  selectedMove === "C"
                    ? "3px solid #4CAF50"
                    : "2px solid var(--border-glass)",
                background:
                  selectedMove === "C"
                    ? "rgba(76, 175, 80, 0.1)"
                    : "var(--bg-glass-light)",
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
                  color:
                    selectedMove === "C" ? "#4CAF50" : "var(--text-primary)",
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
                  selectedMove === "D"
                    ? "3px solid #F44336"
                    : "2px solid var(--border-glass)",
                background:
                  selectedMove === "D"
                    ? "rgba(244, 67, 54, 0.1)"
                    : "var(--bg-glass-light)",
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
                  color:
                    selectedMove === "D" ? "#F44336" : "var(--text-primary)",
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
            <p
              style={{
                margin: "0 0 8px 0",
                color: "var(--text-primary)",
                fontWeight: "bold",
                fontFamily: "var(--font-body)",
              }}
            >
              Stake (XLM) — the height of your fall
            </p>

            {/* Stake presets */}
            <div
              style={{
                display: "flex",
                gap: "8px",
                flexWrap: "wrap",
                alignItems: "center",
                marginBottom: "10px",
              }}
            >
              {STAKE_PRESETS.map((preset) => {
                const isSelected = !showCustomStake && stake === preset;
                const isRecommended = preset === RECOMMENDED_STAKE;
                return (
                  <ShimmerButton
                    key={preset}
                    size="sm"
                    onClick={() => {
                      setShowCustomStake(false);
                      setStake(preset);
                    }}
                    style={
                      isSelected
                        ? {
                            background: "var(--accent-violet)",
                            color: "#fff",
                            borderColor: "var(--accent-violet)",
                            fontWeight: 600,
                          }
                        : undefined
                    }
                  >
                    {preset} XLM{isRecommended ? " 💡" : ""}
                  </ShimmerButton>
                );
              })}
              <ShimmerButton
                size="sm"
                onClick={() => setShowCustomStake(true)}
                style={
                  showCustomStake
                    ? {
                        background: "var(--accent-violet)",
                        color: "#fff",
                        borderColor: "var(--accent-violet)",
                        fontWeight: 600,
                      }
                    : undefined
                }
              >
                Custom
              </ShimmerButton>
            </div>

            {/* Recommended indicator + tooltip */}
            {!showCustomStake && stake === RECOMMENDED_STAKE && (
              <div
                title="Low enough for casual play, high enough to matter"
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "6px",
                  marginBottom: "10px",
                  padding: "4px 10px",
                  borderRadius: "99px",
                  background: "var(--bg-glass-light)",
                  border: "1px solid var(--border-glass)",
                  fontFamily: "var(--font-body)",
                  fontSize: "12px",
                  color: "var(--text-secondary)",
                  cursor: "help",
                }}
              >
                <span>💡</span>
                <span>Recommended: {RECOMMENDED_STAKE} XLM</span>
              </div>
            )}

            {/* Manual stake input — shown when Custom is selected */}
            {showCustomStake && (
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
            )}
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
            <p
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
            </p>
          </div>
        )}

        {/* Payoff reminder — high contrast, no glass-on-glass */}
        <div
          style={{
            marginBottom: "24px",
            background: "rgba(10, 14, 26, 0.85)",
            border: "1px solid var(--border-glass)",
            borderRadius: "var(--radius-md)",
            padding: "16px",
          }}
        >
          <p
            style={{
              margin: "0 0 12px",
              fontSize: "var(--text-xs)",
              color: "var(--text-secondary)",
              textTransform: "uppercase",
              letterSpacing: "0.1em",
              fontWeight: 600,
              textAlign: "center",
            }}
          >
            Payoff Matrix
          </p>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "auto 1fr 1fr",
              gap: "6px",
              textAlign: "center",
              fontFamily: "var(--font-mono)",
            }}
          >
            <div />
            <div
              style={{
                fontWeight: 700,
                color: "var(--accent-cooperate)",
                fontSize: "var(--text-sm)",
              }}
            >
              🤝 They C
            </div>
            <div
              style={{
                fontWeight: 700,
                color: "var(--accent-defect)",
                fontSize: "var(--text-sm)",
              }}
            >
              ⚔️ They D
            </div>
            <div
              style={{
                fontWeight: 700,
                color: "var(--accent-cooperate)",
                fontSize: "var(--text-sm)",
                display: "flex",
                alignItems: "center",
                justifyContent: "flex-end",
                paddingRight: "6px",
                gap: "4px",
              }}
            >
              You C
              <TrustFallCharacter
                state="standing"
                color="cooperator"
                size="sm"
              />
            </div>
            <div
              style={{
                color: "#4ade80",
                fontWeight: 700,
                fontSize: "var(--text-base)",
              }}
            >
              +2 / +2
            </div>
            <div
              style={{
                color: "#f87171",
                fontWeight: 700,
                fontSize: "var(--text-base)",
              }}
            >
              0 / +3
            </div>
            <div
              style={{
                fontWeight: 700,
                color: "var(--accent-defect)",
                fontSize: "var(--text-sm)",
                display: "flex",
                alignItems: "center",
                justifyContent: "flex-end",
                paddingRight: "6px",
                gap: "4px",
              }}
            >
              You D
              <TrustFallCharacter state="standing" color="defector" size="sm" />
            </div>
            <div
              style={{
                color: "#fbbf24",
                fontWeight: 700,
                fontSize: "var(--text-base)",
              }}
            >
              +3 / 0
            </div>
            <div
              style={{
                color: "#ef4444",
                fontWeight: 700,
                fontSize: "var(--text-base)",
              }}
            >
              0 / 0
            </div>
          </div>
        </div>

        {/* Nonce display */}
        {savedNonce && (
          <div
            style={{
              background: "var(--bg-glass-light)",
              borderRadius: "8px",
              padding: "12px",
              marginBottom: "16px",
              border: "1px solid var(--border-glass)",
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
              background: "var(--bg-glass-light)",
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
          <p
            style={{
              color: "#F44336",
              marginBottom: "16px",
              textAlign: "center",
              fontFamily: "var(--font-body)",
            }}
          >
            ⚠️ {txError}
          </p>
        )}

        {error && (
          <p
            style={{
              color: "#F44336",
              marginBottom: "16px",
              textAlign: "center",
              fontFamily: "var(--font-body)",
            }}
          >
            ⚠️ {error}
          </p>
        )}

        {/* Submit */}
        <button
          type="button"
          onClick={() => void handleCommit()}
          disabled={!canSubmit || isLoadingState}
          style={{
            background: "var(--accent-violet)",
            color: "white",
            border: "none",
            borderRadius: "var(--radius-sm)",
            padding: "14px",
            fontFamily: "var(--font-body)",
            fontSize: "18px",
            cursor: "pointer",
            width: "100%",
          }}
        >
          {isLoadingState
            ? status === "generating"
              ? " Falling..."
              : " Committing..."
            : "✋ Let go"}
        </button>
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
        <p
          style={{
            margin: 0,
            color: "var(--text-secondary)",
            lineHeight: "1.5",
          }}
        >
          <strong>🔒 The math catches you:</strong> Your move is zero-knowledge
          proven before you let go — the contract knows your commitment is real,
          but can't see your move until you reveal it.
        </p>
      </CardDiv>
    </div>
  );
};
