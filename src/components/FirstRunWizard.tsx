/**
 * FirstRunWizard — a welcoming, progressive onboarding overlay.
 *
 * Shows on first visit (when no milestones are unlocked). Presents a simple
 * 3-step path: Learn the basics → Try the tutorial → Play for real.
 *
 * Each step has a "Do it now" button that navigates the user to the right
 * route. The wizard dismisses automatically once the user starts an action
 * and can be re-opened from the landing page if needed.
 *
 * Also renders a compact "next step" hint bar on the landing page for
 * returning users who haven't completed all milestones.
 */
import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useFirstRun, type FirstRunStage } from "../hooks/useFirstRun";
import { TrustFallCharacter } from "./TrustFallCharacter";

const WIZARD_SEEN_KEY = "tf_wizard_seen";

interface WizardStep {
  icon: string;
  title: string;
  body: string;
  cta: string;
  route: string;
  milestone: "visited_learn" | "played_tutorial" | "connected_wallet";
  color: string;
}

const STEPS: WizardStep[] = [
  {
    icon: "📖",
    title: "Learn the Theory",
    body: "A 5-minute interactive story about why we trust — and why trust breaks down. Start here if you're new to game theory.",
    cta: "Start the story",
    route: "/learn",
    milestone: "visited_learn",
    color: "var(--accent-violet)",
  },
  {
    icon: "🤝",
    title: "Try the Tutorial",
    body: "Play against 9 AI strategies — no wallet needed. See how cooperation evolves (or collapses) over multiple rounds.",
    cta: "Play vs AI",
    route: "/learn/play",
    milestone: "played_tutorial",
    color: "var(--accent-warm)",
  },
  {
    icon: "🔒",
    title: "Play for Real",
    body: "Stake real testnet XLM. Commit moves with zero-knowledge proofs — your opponent can't see your move until reveal time.",
    cta: "Enter ZK lobby",
    route: "/play",
    milestone: "connected_wallet",
    color: "var(--accent-cooperate)",
  },
];

export const FirstRunWizard: React.FC = () => {
  const navigate = useNavigate();
  const { milestones, stage, unlock } = useFirstRun();
  const [visible, setVisible] = useState(() => {
    try {
      return localStorage.getItem(WIZARD_SEEN_KEY) !== "true";
    } catch {
      return true;
    }
  });

  const dismiss = () => {
    try {
      localStorage.setItem(WIZARD_SEEN_KEY, "true");
    } catch {
      // ignore
    }
    setVisible(false);
  };

  // Don't show if user has completed everything or already dismissed
  if (!visible || stage === "complete") return null;

  // Determine which step to highlight based on stage
  const activeStepIndex =
    stage === "new" ? 0 : stage === "learning" ? 1 : stage === "ready" ? 2 : 0;

  const handleStart = (step: WizardStep) => {
    unlock(step.milestone);
    dismiss();
    void navigate(step.route);
  };

  return (
    <div
      onClick={dismiss}
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        background: "rgba(0,0,0,0.75)",
        backdropFilter: "blur(10px)",
        WebkitBackdropFilter: "blur(10px)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 900,
        padding: "20px",
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          background: "var(--bg-glass)",
          backdropFilter: "blur(24px) saturate(180%)",
          WebkitBackdropFilter: "blur(24px) saturate(180%)",
          border: "1px solid var(--border-glass)",
          borderRadius: "var(--radius-xl)",
          padding: "40px",
          maxWidth: "560px",
          width: "100%",
          boxShadow: "var(--shadow-lg), var(--shadow-glow-violet)",
        }}
      >
        {/* Header */}
        <div style={{ textAlign: "center", marginBottom: "32px" }}>
          <div
            style={{
              marginBottom: "12px",
              display: "flex",
              justifyContent: "center",
            }}
          >
            <TrustFallCharacter
              state="celebrating"
              color="you"
              size="xl"
              speech="Welcome!"
            />
          </div>
          <h2
            style={{
              fontFamily: "var(--font-display)",
              fontSize: "var(--text-3xl)",
              margin: "0 0 8px",
              color: "var(--text-primary)",
            }}
          >
            Welcome to Trustfall
          </h2>
          <p
            style={{
              fontFamily: "var(--font-body)",
              fontSize: "var(--text-base)",
              color: "var(--text-secondary)",
              lineHeight: 1.5,
              margin: 0,
            }}
          >
            An interactive game about trust, betrayal, and zero-knowledge
            proofs. Here's how to get started:
          </p>
        </div>

        {/* Steps */}
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            gap: "12px",
            marginBottom: "28px",
          }}
        >
          {STEPS.map((step, i) => {
            const isDone = milestones[step.milestone];
            const isActive = i === activeStepIndex;
            return (
              <div
                key={step.title}
                style={{
                  display: "flex",
                  gap: "16px",
                  alignItems: "center",
                  padding: "16px",
                  borderRadius: "var(--radius-md)",
                  border: isActive
                    ? `1px solid ${step.color}`
                    : "1px solid var(--border-glass)",
                  background: isActive
                    ? "rgba(255,255,255,0.06)"
                    : "transparent",
                  transition: "all 0.3s var(--ease-out)",
                  opacity: isDone ? 0.5 : 1,
                }}
              >
                {/* Icon / checkmark */}
                <div
                  style={{
                    fontSize: "28px",
                    flexShrink: 0,
                    width: "48px",
                    height: "48px",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    borderRadius: "50%",
                    background: isDone
                      ? "rgba(74, 222, 128, 0.15)"
                      : "var(--bg-glass-light)",
                  }}
                >
                  {isDone ? "✅" : step.icon}
                </div>

                {/* Text */}
                <div style={{ flex: 1 }}>
                  <h4
                    style={{
                      fontFamily: "var(--font-display)",
                      fontSize: "var(--text-lg)",
                      margin: "0 0 4px",
                      color: isDone
                        ? "var(--text-muted)"
                        : "var(--text-primary)",
                    }}
                  >
                    {i + 1}. {step.title}
                  </h4>
                  <p
                    style={{
                      fontFamily: "var(--font-body)",
                      fontSize: "var(--text-sm)",
                      color: "var(--text-secondary)",
                      lineHeight: 1.4,
                      margin: 0,
                    }}
                  >
                    {step.body}
                  </p>
                </div>

                {/* CTA */}
                {!isDone && (
                  <button
                    type="button"
                    onClick={() => handleStart(step)}
                    style={{
                      flexShrink: 0,
                      background: isActive
                        ? step.color
                        : "var(--bg-glass-light)",
                      color: isActive ? "white" : "var(--text-primary)",
                      border: "1px solid var(--border-glass)",
                      borderRadius: "var(--radius-sm)",
                      padding: "8px 16px",
                      fontFamily: "var(--font-body)",
                      fontSize: "var(--text-sm)",
                      fontWeight: 600,
                      cursor: "pointer",
                      whiteSpace: "nowrap",
                    }}
                  >
                    {step.cta} →
                  </button>
                )}
              </div>
            );
          })}
        </div>

        {/* Footer */}
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
          }}
        >
          <p
            style={{
              fontFamily: "var(--font-body)",
              fontSize: "var(--text-xs)",
              color: "var(--text-muted)",
              margin: 0,
            }}
          >
            Takes ~5 minutes total • No real money at risk
          </p>
          <button
            type="button"
            onClick={dismiss}
            style={{
              background: "none",
              border: "none",
              color: "var(--text-muted)",
              cursor: "pointer",
              fontSize: "var(--text-sm)",
              fontFamily: "var(--font-body)",
            }}
          >
            Explore on my own →
          </button>
        </div>
      </div>
    </div>
  );
};

/**
 * NextStepHint — a compact banner shown on the landing page for returning
 * users who haven't completed all milestones. Shows the next recommended
 * action without blocking the page.
 */
export const NextStepHint: React.FC = () => {
  const navigate = useNavigate();
  const { stage } = useFirstRun();

  if (stage === "complete" || stage === "new") return null;

  const hints: Record<
    FirstRunStage,
    { icon: string; text: string; cta: string; route: string } | null
  > = {
    new: null,
    learning: {
      icon: "🤝",
      text: "You've started learning — now try playing against the AI strategies.",
      cta: "Play tutorial",
      route: "/learn/play",
    },
    ready: {
      icon: "🔒",
      text: "Nice work! Ready to stake real testnet XLM with zero-knowledge proofs?",
      cta: "Set up wallet",
      route: "/play",
    },
    wallet: {
      icon: "🎮",
      text: "Wallet connected! Create your first ZK game to play for real.",
      cta: "Play ZK",
      route: "/play",
    },
    complete: null,
  };

  const hint = hints[stage];
  if (!hint) return null;

  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: "12px",
        padding: "14px 20px",
        borderRadius: "var(--radius-md)",
        background: "rgba(102, 126, 234, 0.08)",
        border: "1px solid rgba(102, 126, 234, 0.25)",
        maxWidth: "640px",
        margin: "0 auto 24px",
        fontFamily: "var(--font-body)",
      }}
    >
      <span style={{ fontSize: "20px", flexShrink: 0 }}>{hint.icon}</span>
      <span
        style={{
          flex: 1,
          fontSize: "var(--text-sm)",
          color: "var(--text-secondary)",
        }}
      >
        {hint.text}
      </span>
      <button
        type="button"
        onClick={() => void navigate(hint.route)}
        style={{
          flexShrink: 0,
          background: "var(--accent-violet)",
          color: "white",
          border: "none",
          borderRadius: "var(--radius-sm)",
          padding: "6px 14px",
          fontFamily: "var(--font-body)",
          fontSize: "var(--text-sm)",
          fontWeight: 600,
          cursor: "pointer",
          whiteSpace: "nowrap",
        }}
      >
        {hint.cta} →
      </button>
    </div>
  );
};
