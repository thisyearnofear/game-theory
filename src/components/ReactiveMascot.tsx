/**
 * ReactiveMascot — a floating stick figure that lives in the corner of the
 * screen and reacts to game events with personality.
 *
 * It's always present but unobtrusive — small in the corner, idle by default.
 * When something happens (game won, wallet connected, etc.), it springs to
 * life with a speech bubble and animated state.
 *
 * The mascot's personality is shaped by the user's trust profile.
 *
 * Clicking the mascot dismisses the current speech bubble.
 */
import React, { useState } from "react";
import { TrustFallCharacter } from "./TrustFallCharacter";
import { useMascot } from "./MascotContext";

export const ReactiveMascot: React.FC = () => {
  const { state, speech, color, isReacting, clear } = useMascot();
  const [dismissed, setDismissed] = useState(false);

  // Don't render if there's no speech and not reacting (idle mascot is hidden)
  if (!isReacting && !speech) return null;

  // If user dismissed the current reaction, hide until next event
  if (dismissed && speech) {
    // New speech appeared — reset dismissed
    setDismissed(false);
  }

  const handleClick = () => {
    setDismissed(true);
    clear();
  };

  if (dismissed) return null;

  return (
    <div
      onClick={handleClick}
      style={{
        position: "fixed",
        bottom: "24px",
        right: "24px",
        zIndex: 90,
        cursor: "pointer",
        display: "flex",
        alignItems: "flex-end",
        gap: "0",
        animation: "fadeIn 0.3s ease-out",
      }}
      title="Click to dismiss"
    >
      {/* Speech bubble (positioned to the left of the mascot) */}
      {speech && (
        <div
          style={{
            background: "rgba(20, 26, 46, 0.95)",
            backdropFilter: "blur(16px)",
            WebkitBackdropFilter: "blur(16px)",
            border: `1px solid ${color === "you" ? "rgba(102, 126, 234, 0.3)" : "rgba(240, 160, 32, 0.3)"}`,
            borderRadius: "var(--radius-md)",
            padding: "12px 16px",
            maxWidth: "280px",
            marginRight: "12px",
            marginBottom: "20px",
            fontFamily: "var(--font-body)",
            fontSize: "var(--text-sm)",
            color: "var(--text-primary)",
            lineHeight: 1.4,
            boxShadow: "0 8px 24px rgba(0,0,0,0.3)",
            position: "relative",
            animation: "fadeIn 0.3s ease-out",
          }}
        >
          {speech}
          {/* Tail pointing right to the mascot */}
          <div
            style={{
              position: "absolute",
              right: "-6px",
              bottom: "16px",
              width: 0,
              height: 0,
              borderTop: "6px solid transparent",
              borderBottom: "6px solid transparent",
              borderLeft: `6px solid rgba(20, 26, 46, 0.95)`,
            }}
          />
        </div>
      )}

      {/* The mascot */}
      <div
        style={{
          transition: "transform 0.3s var(--ease-out)",
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.transform = "scale(1.1)";
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.transform = "scale(1)";
        }}
      >
        <TrustFallCharacter state={state} color={color} size="md" />
      </div>
    </div>
  );
};
