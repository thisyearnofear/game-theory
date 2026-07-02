import React, { useState } from "react";
import { Button, Text } from "@stellar/design-system";

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
        background: "rgba(0,0,0,0.6)",
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
          background: "white",
          borderRadius: "16px",
          padding: "32px",
          maxWidth: "440px",
          width: "100%",
          textAlign: "center",
          boxShadow: "0 8px 32px rgba(0,0,0,0.2)",
        }}
      >
        <div style={{ fontSize: "48px", marginBottom: "12px" }}>
          {current.icon}
        </div>
        <Text
          as="h3"
          size="lg"
          style={{
            margin: "0 0 12px",
            fontFamily: "FuturaHandwritten",
            color: "#333",
          }}
        >
          {current.title}
        </Text>
        <Text
          as="p"
          size="sm"
          style={{
            color: "#666",
            lineHeight: 1.5,
            margin: "0 0 24px",
            fontFamily: "FuturaHandwritten",
          }}
        >
          {current.body}
        </Text>

        {/* Step indicator */}
        <div
          style={{
            display: "flex",
            justifyContent: "center",
            gap: "8px",
            marginBottom: "20px",
          }}
        >
          {steps.map((s, i) => (
            <div
              key={s.title}
              style={{
                width: i === step ? "24px" : "8px",
                height: "8px",
                borderRadius: "4px",
                background: i === step ? "#667eea" : "#ddd",
                transition: "all 0.2s",
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
            <Button
              variant="primary"
              size="md"
              onClick={dismiss}
              style={{ fontFamily: "FuturaHandwritten" }}
            >
              Let's Play →
            </Button>
          ) : (
            <Button
              variant="primary"
              size="md"
              onClick={() => setStep(step + 1)}
              style={{ fontFamily: "FuturaHandwritten" }}
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
            color: "#999",
            cursor: "pointer",
            fontSize: "13px",
            marginTop: "16px",
            fontFamily: "FuturaHandwritten",
          }}
        >
          Skip tutorial
        </button>
      </div>
    </div>
  );
};
