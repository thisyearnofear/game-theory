/**
 * ZKStepIndicator — a unified game header + step progress bar.
 *
 * Instead of a separate "Game #N" title and a disconnected step bar,
 * this component merges them into one cohesive header strip:
 *
 *   ← Lobby  |  Commit → Wait → Reveal → Resolve  |  Game #42
 *
 * The steps use stick-man iconography to visualize the trust fall:
 *   Commit:  🧍 standing at the edge
 *   Wait:    ⏳ waiting (falling animation)
 *   Reveal:  🤝 catching each other
 *   Resolve: 🏆 outcome
 *
 * The current step glows; completed steps show a green check.
 * An optional detail line sits below the bar.
 */
import React from "react";

export type ZKStep = "commit" | "waiting" | "reveal" | "resolve";

interface ZKStepIndicatorProps {
  step: ZKStep;
  /** Optional sub-label shown under the step name */
  detail?: string;
  /** Game ID to display on the right side (optional) */
  gameId?: number;
  /** Back button handler (optional — if provided, shows ← Lobby) */
  onBack?: () => void;
}

const STEPS: {
  key: ZKStep;
  label: string;
  icon: string;
  description: string;
}[] = [
  {
    key: "commit",
    label: "Commit",
    icon: "🧍",
    description: "Choose your move",
  },
  { key: "waiting", label: "Wait", icon: "⏳", description: "Opponent's turn" },
  { key: "reveal", label: "Reveal", icon: "🤝", description: "Show your move" },
  { key: "resolve", label: "Resolve", icon: "🏆", description: "Outcome" },
];

export const ZKStepIndicator: React.FC<ZKStepIndicatorProps> = ({
  step,
  detail,
  gameId,
  onBack,
}) => {
  const currentIndex = STEPS.findIndex((s) => s.key === step);

  return (
    <div
      style={{
        marginBottom: "24px",
        fontFamily: "var(--font-body)",
      }}
    >
      {/* Unified header bar */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: "16px",
          padding: "12px 20px",
          background: "rgba(10, 14, 26, 0.6)",
          border: "1px solid var(--border-glass)",
          borderRadius: "var(--radius-md)",
          backdropFilter: "blur(12px)",
          WebkitBackdropFilter: "blur(12px)",
        }}
      >
        {/* Back button */}
        {onBack && (
          <button
            type="button"
            onClick={onBack}
            style={{
              background: "none",
              border: "none",
              color: "var(--text-muted)",
              cursor: "pointer",
              fontFamily: "var(--font-body)",
              fontSize: "var(--text-sm)",
              padding: "4px 8px",
              borderRadius: "var(--radius-sm)",
              transition: "color 0.2s, background 0.2s",
              whiteSpace: "nowrap",
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.color = "var(--text-primary)";
              e.currentTarget.style.background = "rgba(255,255,255,0.06)";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.color = "var(--text-muted)";
              e.currentTarget.style.background = "none";
            }}
          >
            ← Lobby
          </button>
        )}

        {/* Divider */}
        {onBack && (
          <div
            style={{
              width: "1px",
              height: "24px",
              background: "var(--border-glass)",
              flexShrink: 0,
            }}
          />
        )}

        {/* Step flow — the main visual element */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "0",
            flex: 1,
            justifyContent: "center",
          }}
        >
          {STEPS.map((s, i) => {
            const isDone = i < currentIndex;
            const isActive = i === currentIndex;

            return (
              <React.Fragment key={s.key}>
                {/* Step node */}
                <div
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    gap: "4px",
                    minWidth: "56px",
                  }}
                >
                  <div
                    style={{
                      width: "32px",
                      height: "32px",
                      borderRadius: "50%",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      fontSize: "14px",
                      background: isDone
                        ? "rgba(74, 222, 128, 0.12)"
                        : isActive
                          ? "rgba(102, 126, 234, 0.15)"
                          : "transparent",
                      border: isActive
                        ? "2px solid var(--accent-violet)"
                        : isDone
                          ? "2px solid rgba(74, 222, 128, 0.3)"
                          : "1px solid var(--border-glass)",
                      boxShadow: isActive
                        ? "0 0 12px rgba(102, 126, 234, 0.3)"
                        : "none",
                      transition: "all 0.3s var(--ease-out)",
                    }}
                  >
                    {isDone ? (
                      <span
                        style={{
                          color: "rgba(74, 222, 128, 0.9)",
                          fontSize: "12px",
                        }}
                      >
                        ✓
                      </span>
                    ) : (
                      s.icon
                    )}
                  </div>
                  <span
                    style={{
                      fontSize: "var(--text-xs)",
                      fontWeight: isActive ? 600 : 400,
                      color: isActive
                        ? "var(--text-primary)"
                        : isDone
                          ? "rgba(74, 222, 128, 0.7)"
                          : "var(--text-muted)",
                      whiteSpace: "nowrap",
                    }}
                  >
                    {s.label}
                  </span>
                </div>

                {/* Connector */}
                {i < STEPS.length - 1 && (
                  <div
                    style={{
                      flex: "1",
                      height: "2px",
                      maxWidth: "48px",
                      margin: "0 4px",
                      marginBottom: "18px",
                      background:
                        i < currentIndex
                          ? "rgba(74, 222, 128, 0.3)"
                          : "var(--border-glass)",
                      borderRadius: "1px",
                      transition: "background 0.3s var(--ease-out)",
                    }}
                  />
                )}
              </React.Fragment>
            );
          })}
        </div>

        {/* Game ID on the right */}
        {gameId !== undefined && (
          <>
            <div
              style={{
                width: "1px",
                height: "24px",
                background: "var(--border-glass)",
                flexShrink: 0,
              }}
            />
            <span
              style={{
                fontFamily: "var(--font-mono)",
                fontSize: "var(--text-sm)",
                color: "var(--text-secondary)",
                whiteSpace: "nowrap",
                fontWeight: 600,
              }}
            >
              #{gameId}
            </span>
          </>
        )}
      </div>

      {/* Detail line below the bar */}
      {detail && (
        <div
          style={{
            marginTop: "10px",
            fontSize: "var(--text-xs)",
            color: "var(--text-muted)",
            textAlign: "center",
            fontStyle: "italic",
          }}
        >
          {detail}
        </div>
      )}
    </div>
  );
};

/**
 * Derive the current ZK step from game status.
 */
export const deriveZKStep = (
  status: string,
  isMyCommitDone: boolean,
  bothRevealed: boolean,
): ZKStep => {
  if (
    status === "Resolved" ||
    status === "Forfeited" ||
    status === "Cancelled"
  ) {
    return "resolve";
  }
  if (bothRevealed) return "resolve";
  if (status === "BothCommitted") return "reveal";
  if (status === "AwaitingPlayer2" && isMyCommitDone) return "waiting";
  return "commit";
};
