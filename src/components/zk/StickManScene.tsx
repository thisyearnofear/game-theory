/**
 * StickManScene — a visual representation of the trust fall at each
 * stage of the ZK game flow, using the unified TrustFallCharacter.
 *
 * The scene shows two stick figures (you + opponent) on a platform.
 * The visual changes based on the current ZK step:
 *
 *   commit:   Both standing at the edge, facing each other
 *   waiting:  You've committed — you're falling, opponent still standing
 *   reveal:   Both falling — the moment of truth
 *   resolve:  Outcome — caught (both happy), or someone hit the ground
 *
 * The stick figures are consistent across ALL stages — same SVG character,
 * different states. This is the key visual identity of the app.
 */
import React from "react";
import { TrustFallCharacter, type CharacterState } from "../TrustFallCharacter";
import type { ZKStep } from "./ZKStepIndicator";

interface StickManSceneProps {
  step: ZKStep;
  /** Game outcome for resolve step */
  outcome?: "caught" | "betrayed" | "exploited" | "mutual";
  /** Stake in XLM — controls the "height" of the fall */
  stake?: number;
}

export const StickManScene: React.FC<StickManSceneProps> = ({
  step,
  outcome,
  stake = 5,
}) => {
  const fallHeight = Math.min(120, Math.max(60, stake * 8));

  // Determine character states for each step
  const getStates = (): { you: CharacterState; opponent: CharacterState } => {
    switch (step) {
      case "commit":
        return { you: "standing", opponent: "standing" };
      case "waiting":
        return { you: "falling", opponent: "waiting" };
      case "reveal":
        return { you: "falling", opponent: "falling" };
      case "resolve":
        switch (outcome) {
          case "caught":
            return { you: "caught", opponent: "caught" };
          case "betrayed":
            return { you: "impact", opponent: "celebrating" };
          case "exploited":
            return { you: "celebrating", opponent: "impact" };
          case "mutual":
            return { you: "impact", opponent: "impact" };
          default:
            return { you: "standing", opponent: "standing" };
        }
    }
  };

  const { you, opponent } = getStates();

  const getSpeech = (): { you?: string; opponent?: string } => {
    switch (step) {
      case "commit":
        return {};
      case "waiting":
        return { you: "I'm falling!", opponent: undefined };
      case "reveal":
        return {};
      case "resolve":
        switch (outcome) {
          case "caught":
            return { you: "We caught each other!", opponent: "Trust!" };
          case "betrayed":
            return { you: "Ouch...", opponent: "I stepped aside" };
          case "exploited":
            return { you: "I stepped aside!", opponent: "Ouch..." };
          case "mutual":
            return { you: "Nobody caught anyone", opponent: "💥" };
          default:
            return {};
        }
    }
  };

  const speech = getSpeech();

  // For falling states, position the character at the top of the fall area
  const isFalling = (state: CharacterState) => state === "falling";

  return (
    <div
      style={{
        display: "flex",
        justifyContent: "center",
        alignItems: "flex-end",
        gap: "80px",
        height: `${fallHeight + 50}px`,
        marginBottom: "20px",
        position: "relative",
      }}
    >
      {/* Platform / ground line */}
      <div
        style={{
          position: "absolute",
          bottom: "8px",
          left: "15%",
          right: "15%",
          height: "2px",
          background:
            "linear-gradient(90deg, transparent, var(--border-glass-hover) 20%, var(--border-glass-hover) 80%, transparent)",
        }}
      />

      {/* You */}
      <div
        style={{
          textAlign: "center",
          position: "relative",
          transition: "all 0.5s var(--ease-out)",
        }}
      >
        <div
          style={{
            position: isFalling(you) ? "absolute" : "relative",
            bottom: isFalling(you) ? `${fallHeight}px` : "auto",
            left: "50%",
            transform: "translateX(-50%)",
          }}
        >
          <TrustFallCharacter
            state={you}
            color="you"
            size="lg"
            speech={speech.you}
            label="You"
          />
        </div>
      </div>

      {/* Opponent */}
      <div
        style={{
          textAlign: "center",
          position: "relative",
          transition: "all 0.5s var(--ease-out)",
        }}
      >
        <div
          style={{
            position: isFalling(opponent) ? "absolute" : "relative",
            bottom: isFalling(opponent) ? `${fallHeight}px` : "auto",
            left: "50%",
            transform: "translateX(-50%)",
          }}
        >
          <TrustFallCharacter
            state={opponent}
            color="opponent"
            size="lg"
            speech={speech.opponent}
            label="Opponent"
          />
        </div>
      </div>
    </div>
  );
};
