import React, { useState } from "react";
import { ShimmerButton } from "../ui/ShimmerButton";

interface MatchSetupProps {
  /** Called with (bestOf, stakeXlm) when the user starts the match. */
  onCreateMatch: (bestOf: number, stake: string) => void;
  /** Return to the lobby. */
  onBack: () => void;
}

/** Stake preset options — same as CommitMove. */
const STAKE_PRESETS = ["1", "5", "10"] as const;
const RECOMMENDED_STAKE = "5";

/**
 * MatchSetup — shown in the lobby when the user clicks "Create Match".
 *
 * Lets the user choose a Best-of-3 or Best-of-5 format and a stake preset,
 * then calls `onCreateMatch(bestOf, stake)`. Uses glassmorphic styling.
 */
export const MatchSetup: React.FC<MatchSetupProps> = ({
  onCreateMatch,
  onBack,
}) => {
  const [bestOf, setBestOf] = useState<3 | 5>(3);
  const [stake, setStake] = useState<string>(RECOMMENDED_STAKE);

  const canSubmit = bestOf === 3 || bestOf === 5;

  return (
    <div
      className="zk-card-container"
      style={{ maxWidth: "600px", margin: "0 auto" }}
    >
      {/* Back button */}
      <button
        type="button"
        onClick={onBack}
        style={{
          background: "none",
          border: "none",
          color: "rgba(20, 26, 46, 0.35)",
          cursor: "pointer",
          fontFamily: "var(--font-body)",
          fontSize: "16px",
          padding: "8px 0",
          marginBottom: "16px",
        }}
      >
        ← Back to Lobby
      </button>

      <div
        className="glass-panel"
        style={{
          padding: "28px 24px",
          borderColor: "rgba(102,126,234,0.2)",
        }}
      >
        <h3
          style={{
            margin: "0 0 8px 0",
            color: "var(--text-primary)",
            textAlign: "center",
            fontFamily: "var(--font-display)",
            fontWeight: 600,
          }}
        >
          🏟️ Create a Match
        </h3>
        <p
          style={{
            margin: "0 0 24px 0",
            color: "var(--text-secondary)",
            textAlign: "center",
            fontFamily: "var(--font-body)",
          }}
        >
          A multi-round Trustfall. First to win the majority of rounds takes the
          match.
        </p>

        {/* Best-of selection */}
        <div style={{ marginBottom: "24px" }}>
          <p
            style={{
              margin: "0 0 12px 0",
              color: "var(--text-primary)",
              fontWeight: "bold",
              fontFamily: "var(--font-body)",
            }}
          >
            Match Format
          </p>
          <div
            style={{
              display: "flex",
              gap: "12px",
              justifyContent: "center",
            }}
          >
            <button
              type="button"
              onClick={() => setBestOf(3)}
              style={{
                flex: 1,
                padding: "24px 16px",
                borderRadius: "var(--radius-md)",
                border:
                  bestOf === 3
                    ? "2px solid var(--accent-violet)"
                    : "1px solid var(--border-glass)",
                background:
                  bestOf === 3
                    ? "rgba(102, 126, 234, 0.12)"
                    : "var(--bg-glass-light)",
                cursor: "pointer",
                transition:
                  "transform 0.2s var(--ease-out), border-color 0.3s var(--ease-out), background 0.3s var(--ease-out)",
                fontFamily: "var(--font-body)",
                backdropFilter: "blur(12px)",
              }}
              onMouseEnter={(e) => {
                if (bestOf !== 3)
                  e.currentTarget.style.transform = "translateY(-3px)";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = "";
              }}
            >
              <div style={{ fontSize: "32px", marginBottom: "6px" }}>🎯</div>
              <div
                style={{
                  fontWeight: 700,
                  fontSize: "18px",
                  color:
                    bestOf === 3
                      ? "var(--accent-violet)"
                      : "var(--text-primary)",
                  fontFamily: "var(--font-display)",
                }}
              >
                Best of 3
              </div>
              <div
                style={{
                  fontSize: "12px",
                  color: "var(--text-secondary)",
                  marginTop: "4px",
                }}
              >
                First to 2 wins
              </div>
            </button>

            <button
              type="button"
              onClick={() => setBestOf(5)}
              style={{
                flex: 1,
                padding: "24px 16px",
                borderRadius: "var(--radius-md)",
                border:
                  bestOf === 5
                    ? "2px solid var(--accent-violet)"
                    : "1px solid var(--border-glass)",
                background:
                  bestOf === 5
                    ? "rgba(102, 126, 234, 0.12)"
                    : "var(--bg-glass-light)",
                cursor: "pointer",
                transition:
                  "transform 0.2s var(--ease-out), border-color 0.3s var(--ease-out), background 0.3s var(--ease-out)",
                fontFamily: "var(--font-body)",
                backdropFilter: "blur(12px)",
              }}
              onMouseEnter={(e) => {
                if (bestOf !== 5)
                  e.currentTarget.style.transform = "translateY(-3px)";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = "";
              }}
            >
              <div style={{ fontSize: "32px", marginBottom: "6px" }}>🔥</div>
              <div
                style={{
                  fontWeight: 700,
                  fontSize: "18px",
                  color:
                    bestOf === 5
                      ? "var(--accent-violet)"
                      : "var(--text-primary)",
                  fontFamily: "var(--font-display)",
                }}
              >
                Best of 5
              </div>
              <div
                style={{
                  fontSize: "12px",
                  color: "var(--text-secondary)",
                  marginTop: "4px",
                }}
              >
                First to 3 wins
              </div>
            </button>
          </div>
        </div>

        {/* Stake presets */}
        <div style={{ marginBottom: "24px" }}>
          <p
            style={{
              margin: "0 0 8px 0",
              color: "var(--text-primary)",
              fontWeight: "bold",
              fontFamily: "var(--font-body)",
            }}
          >
            Stake per Round (XLM)
          </p>
          <div
            style={{
              display: "flex",
              gap: "8px",
              flexWrap: "wrap",
              alignItems: "center",
            }}
          >
            {STAKE_PRESETS.map((preset) => {
              const isSelected = stake === preset;
              const isRecommended = preset === RECOMMENDED_STAKE;
              return (
                <ShimmerButton
                  key={preset}
                  size="sm"
                  onClick={() => setStake(preset)}
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
          </div>
          <p
            style={{
              margin: "8px 0 0",
              color: "var(--text-muted)",
              fontFamily: "var(--font-body)",
            }}
          >
            Stake is deposited per round. Up to {bestOf} rounds × {stake} XLM.
          </p>
        </div>

        {/* Start match button */}
        <button
          type="button"
          onClick={() => onCreateMatch(bestOf, stake)}
          disabled={!canSubmit}
          style={{
            width: "100%",
            padding: "14px",
            borderRadius: "var(--radius-md)",
            border: "1px solid var(--accent-violet)",
            background: canSubmit
              ? "linear-gradient(135deg, var(--accent-violet), #8b5cf6)"
              : "var(--bg-glass-light)",
            color: "#fff",
            fontFamily: "var(--font-body)",
            fontSize: "18px",
            fontWeight: 600,
            cursor: canSubmit ? "pointer" : "not-allowed",
            opacity: canSubmit ? 1 : 0.6,
            transition: "transform 0.2s var(--ease-out)",
          }}
          onMouseEnter={(e) => {
            if (canSubmit) e.currentTarget.style.transform = "translateY(-2px)";
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.transform = "";
          }}
        >
          🏟️ Start Match
        </button>
      </div>

      {/* Info card */}
      <div
        className="glass-panel"
        style={{
          marginTop: "16px",
          padding: "16px",
          borderColor: "rgba(255,255,255,0.1)",
        }}
      >
        <p
          style={{
            margin: 0,
            color: "var(--text-secondary)",
            lineHeight: 1.6,
            fontFamily: "var(--font-body)",
          }}
        >
          <strong>🔒 How matches work:</strong> You commit your first move with
          a ZK proof. After each round resolves, player 1 starts the next round
          and player 2 joins it. First to reach the target wins takes the match.
        </p>
      </div>
    </div>
  );
};
