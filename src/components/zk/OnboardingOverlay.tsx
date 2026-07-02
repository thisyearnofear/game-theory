import React, { useState } from "react";
import { Button } from "@stellar/design-system";

const STORAGE_KEY = "zk_onboarding_seen";

/**
 * 3-step onboarding overlay shown on first visit to /play.
 * Explains the ZK commit-reveal flow to new users.
 * Dismissed state persisted in localStorage.
 */
export const OnboardingOverlay: React.FC = () => {
  const [step, setStep] = useState(0);
  const [visible, setVisible] = useState(() => {
    try {
      return localStorage.getItem(STORAGE_KEY) !== "true";
    } catch {
      return true;
    }
  });

  if (!visible) return null;

  const dismiss = () => {
    try {
      localStorage.setItem(STORAGE_KEY, "true");
    } catch {
      // Ignore storage errors
    }
    setVisible(false);
  };

  const steps = [
    {
      icon: "🧍",
      title: "Stand at the Edge",
      body: "Pick Cooperate (catch them) or Defect (step aside). Your move is kept secret — they can't see it.",
    },
    {
      icon: "🔐",
      title: "Let Go — The Math Catches You",
      body: "Your browser generates a ZK proof that your move is valid, binding you to it. This takes a few seconds — that's the fall.",
    },
    {
      icon: "🤝",
      title: "The Catch or the Impact",
      body: "Both players reveal. If you both cooperated, you're caught — trust rewarded. If someone defected, someone hits the ground.",
    },
  ];

  const current = steps[step];
  const isLast = step === steps.length - 1;

  return (
    <div
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        background: "rgba(0,0,0,0.7)",
        backdropFilter: "blur(8px)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 1000,
        padding: "20px",
      }}
      onClick={dismiss}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          background: "var(--bg-glass)",
          backdropFilter: "blur(24px) saturate(180%)",
          border: "1px solid var(--border-glass)",
          borderRadius: "var(--radius-xl)",
          padding: "40px",
          maxWidth: "440px",
          width: "100%",
          textAlign: "center",
          boxShadow: "var(--shadow-lg), var(--shadow-glow-violet)",
        }}
      >
        <div
          style={{
            fontSize: "56px",
            marginBottom: "16px",
            filter: "drop-shadow(0 0 24px rgba(102,126,234,0.3))",
          }}
        >
          {current.icon}
        </div>

        <h3
          style={{
            fontFamily: "var(--font-display)",
            fontSize: "var(--text-2xl)",
            margin: "0 0 12px",
            color: "var(--text-primary)",
          }}
        >
          {current.title}
        </h3>

        <p
          style={{
            fontFamily: "var(--font-body)",
            fontSize: "var(--text-sm)",
            color: "var(--text-secondary)",
            lineHeight: 1.6,
            margin: "0 0 28px",
          }}
        >
          {current.body}
        </p>

        {/* Step indicator */}
        <div
          style={{
            display: "flex",
            justifyContent: "center",
            gap: "8px",
            marginBottom: "24px",
          }}
        >
          {steps.map((s, i) => (
            <div
              key={s.title}
              style={{
                width: i === step ? "28px" : "8px",
                height: "8px",
                borderRadius: "4px",
                background:
                  i === step
                    ? "var(--accent-violet)"
                    : i < step
                      ? "rgba(102,126,234,0.4)"
                      : "rgba(255,255,255,0.12)",
                transition: "all 0.3s var(--ease-out)",
              }}
            />
          ))}
        </div>

        <div style={{ display: "flex", gap: "12px", justifyContent: "center" }}>
          {step > 0 && (
            <Button
              variant="tertiary"
              size="md"
              onClick={() => setStep(step - 1)}
            >
              ← Back
            </Button>
          )}
          {isLast ? (
            <Button variant="primary" size="md" onClick={dismiss}>
              Let's Play →
            </Button>
          ) : (
            <Button
              variant="primary"
              size="md"
              onClick={() => setStep(step + 1)}
            >
              Next →
            </Button>
          )}
        </div>

        <button
          type="button"
          onClick={dismiss}
          style={{
            background: "none",
            border: "none",
            color: "var(--text-muted)",
            cursor: "pointer",
            fontSize: "var(--text-xs)",
            marginTop: "20px",
            fontFamily: "var(--font-body)",
          }}
        >
          Skip tutorial
        </button>
      </div>
    </div>
  );
};
