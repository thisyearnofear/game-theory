import React, { useState, useEffect } from "react";
import { useWallet } from "../../hooks/useWallet";
import { useZKDilemma, type GameMove } from "../../hooks/useZKDilemma";
import {
  computeCommitment,
  generateNonce,
  generateProof,
} from "../../services/noirProofService";

interface MatchCommitMoveProps {
  /** Which match phase we're committing for. */
  phase: "create" | "join" | "startNext" | "joinNext" | "rematch";
  /** Match id (0 for create/rematch-before-creation). */
  matchId: number;
  /** Known game id for join/joinNext phases; predicted for create/startNext. */
  gameId?: number;
  /** bestOf + stake, required for create/rematch phases. */
  bestOf?: number;
  stake?: string;
  /** Called with the new game id once the commit succeeds. */
  onComplete: (newGameId: number, newMatchId?: number) => void;
  onBack: () => void;
}

/**
 * MatchCommitMove — commit flow for match rounds.
 *
 * Handles the ZK proof generation + contract submission for the various
 * match phases (create, join, startNext, joinNext, rematch). Reuses the
 * same noir proof service as CommitMove but calls the match-specific
 * contract functions.
 */
export const MatchCommitMove: React.FC<MatchCommitMoveProps> = ({
  phase,
  matchId,
  gameId: knownGameId,
  bestOf,
  stake: stakeXlm,
  onComplete,
  onBack,
}) => {
  const { address } = useWallet();
  const {
    createMatch,
    joinMatch,
    startNextRound,
    joinNextRound,
    rematch,
    getGameCount,
    error,
  } = useZKDilemma();

  const [selectedMove, setSelectedMove] = useState<GameMove | null>(null);
  const [status, setStatus] = useState<"choose" | "generating" | "submitting">(
    "choose",
  );
  const [txError, setTxError] = useState<string | null>(null);
  const [debug, setDebug] = useState<string>("");
  const [savedNonce, setSavedNonce] = useState<bigint | null>(null);

  // Persist nonce + move for the reveal step (keyed by predicted/known game id)
  useEffect(() => {
    if (savedNonce && selectedMove && knownGameId) {
      const nonceKey = `zk_nonce_game_${knownGameId}`;
      const moveKey = `zk_move_game_${knownGameId}`;
      try {
        localStorage.setItem(nonceKey, savedNonce.toString());
        localStorage.setItem(moveKey, selectedMove);
      } catch {
        sessionStorage.setItem(nonceKey, savedNonce.toString());
        sessionStorage.setItem(moveKey, selectedMove);
      }
    }
  }, [savedNonce, selectedMove, knownGameId]);

  const isLoadingState = status === "generating" || status === "submitting";

  const phaseLabel: Record<MatchCommitMoveProps["phase"], string> = {
    create: "Create Match — Round 1",
    join: "Join Match — Round 1",
    startNext: "Start Next Round",
    joinNext: "Join Next Round",
    rematch: "Rematch — Round 1",
  };

  const handleCommit = async () => {
    if (!selectedMove || !address) return;
    setTxError(null);

    const moveNum: 0 | 1 = selectedMove === "C" ? 0 : 1;
    const nonce = generateNonce();
    setSavedNonce(nonce);

    // For phases where the game_id is known (join, joinNext), use it directly.
    // For create/startNext/rematch, predict via getGameCount()+1 with retries.
    const needsPrediction =
      phase === "create" || phase === "startNext" || phase === "rematch";

    const MAX_RETRIES = 2;

    for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
      try {
        setStatus("generating");

        let targetGameId: number;
        if (needsPrediction) {
          const count = await getGameCount();
          targetGameId = count + 1;
          setDebug(`Attempt ${attempt + 1}: targeting game_id=${targetGameId}`);
        } else {
          targetGameId = knownGameId ?? 0;
          setDebug(`Using known game_id=${targetGameId}`);
        }

        setDebug(`Computing commitment for ${selectedMove}...`);
        const commitmentBytes = computeCommitment({
          move: moveNum,
          nonce,
          gameId: targetGameId,
        });
        const commitmentHex = Array.from(commitmentBytes)
          .map((b) => b.toString(16).padStart(2, "0"))
          .join("");

        setDebug("Generating ZK proof...");
        const proofOutput = await generateProof({
          move: moveNum,
          nonce,
          gameId: targetGameId,
        });
        const proofHex = Array.from(proofOutput.proof)
          .map((b) => b.toString(16).padStart(2, "0"))
          .join("");

        // Convert to Buffers for the hook
        const { Buffer } = await import("buffer");
        const commitment = Buffer.from(commitmentHex, "hex");
        const proof = Buffer.from(proofHex, "hex");

        setStatus("submitting");

        if (phase === "create" || phase === "rematch") {
          if (!bestOf || !stakeXlm) throw new Error("Missing match params");
          const stakeStroops = BigInt(
            Math.floor(parseFloat(stakeXlm) * 10_000_000),
          ).toString();
          if (phase === "create") {
            const result = await createMatch(
              commitment,
              proof,
              stakeStroops,
              bestOf,
            );
            setDebug(
              `Match #${result.matchId} created, game #${result.gameId}!`,
            );
            // Persist nonce for the actual game id returned
            try {
              localStorage.setItem(
                `zk_nonce_game_${result.gameId}`,
                nonce.toString(),
              );
              localStorage.setItem(
                `zk_move_game_${result.gameId}`,
                selectedMove,
              );
            } catch {
              /* ignore */
            }
            onComplete(result.gameId, result.matchId);
          } else {
            // rematch
            const result = await rematch(matchId, commitment, proof);
            setDebug(`Rematch #${result.matchId}, game #${result.gameId}!`);
            try {
              localStorage.setItem(
                `zk_nonce_game_${result.gameId}`,
                nonce.toString(),
              );
              localStorage.setItem(
                `zk_move_game_${result.gameId}`,
                selectedMove,
              );
            } catch {
              /* ignore */
            }
            onComplete(result.gameId, result.matchId);
          }
        } else if (phase === "join") {
          await joinMatch(matchId, commitment, proof);
          setDebug(`Joined match #${matchId}!`);
          onComplete(knownGameId ?? 0);
        } else if (phase === "startNext") {
          const newGameId = await startNextRound(matchId, commitment, proof);
          setDebug(`Next round started, game #${newGameId}!`);
          try {
            localStorage.setItem(
              `zk_nonce_game_${newGameId}`,
              nonce.toString(),
            );
            localStorage.setItem(`zk_move_game_${newGameId}`, selectedMove);
          } catch {
            /* ignore */
          }
          onComplete(newGameId);
        } else if (phase === "joinNext") {
          await joinNextRound(matchId, commitment, proof);
          setDebug(`Joined next round of match #${matchId}!`);
          onComplete(knownGameId ?? 0);
        }
        return; // success
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        if (
          needsPrediction &&
          attempt < MAX_RETRIES &&
          /proof|commitment|verification|mismatch|hash/i.test(message)
        ) {
          setDebug(
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
            color: "rgba(20, 26, 46, 0.45)",
          }}
        >
          Connect your wallet to commit a move
        </p>
      </div>
    );
  }

  return (
    <div
      className="zk-card-container"
      style={{ maxWidth: "600px", margin: "0 auto" }}
    >
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
        ← Back
      </button>

      <div
        className="glass-panel"
        style={{
          padding: "24px",
          borderColor: "rgba(102,126,234,0.2)",
        }}
      >
        <h3
          style={{
            margin: "0 0 8px 0",
            color: "var(--text-primary)",
            textAlign: "center",
            fontFamily: "var(--font-body)",
          }}
        >
          🏟️ {phaseLabel[phase]}
        </h3>
        <p
          style={{
            margin: "0 0 24px 0",
            color: "var(--text-secondary)",
            textAlign: "center",
            fontFamily: "var(--font-body)",
          }}
        >
          Choose your move. A ZK proof binds you — no take-backs.
        </p>

        {/* Move selection */}
        <div style={{ marginBottom: "24px" }}>
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
            </button>
          </div>
        </div>

        {/* Status / debug */}
        {status !== "choose" && (
          <div
            style={{
              background: "rgba(102, 126, 234, 0.06)",
              borderRadius: "8px",
              padding: "16px",
              marginBottom: "16px",
              fontSize: "12px",
              color: "var(--text-secondary)",
              fontFamily: "monospace",
              textAlign: "center",
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
                  style={{ fontFamily: "var(--font-body)", fontSize: "14px" }}
                >
                  Generating ZK proof...
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
                  style={{ fontFamily: "var(--font-body)", fontSize: "14px" }}
                >
                  Submitting to the blockchain...
                </div>
              </div>
            )}
            {debug && <div style={{ marginTop: "4px" }}>{debug}</div>}
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

        <button
          type="button"
          onClick={() => void handleCommit()}
          disabled={!selectedMove || isLoadingState}
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
      </div>
    </div>
  );
};
