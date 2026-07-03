/**
 * DemoRound — an animated auto-playing trust fall demo.
 *
 * Shows both stick figures going through a complete round:
 *   1. Both standing at the edge
 *   2. Both commit (lock in moves)
 *   3. Both fall
 *   4. Outcome: caught (cooperate) or impact (defect)
 *
 * Plays automatically on loop. Used in onboarding to show users
 * what the game looks like before they play.
 *
 * Sound cues play at each phase for immersion.
 */
import React, { useState, useEffect, useCallback, useRef } from "react";
import { TrustFallCharacter, type CharacterState } from "./TrustFallCharacter";
import AudioManager from "./AudioManager";

type DemoPhase = "intro" | "commit" | "falling" | "outcome" | "reset";

const PHASE_DURATION: Record<DemoPhase, number> = {
  intro: 2000,
  commit: 1500,
  falling: 2000,
  outcome: 3000,
  reset: 500,
};

// Cycle through different outcomes for variety
const OUTCOMES: ("caught" | "betrayed" | "exploited" | "mutual")[] = [
  "caught",
  "caught",
  "betrayed",
  "exploited",
  "mutual",
];

export const DemoRound: React.FC<{ size?: "sm" | "md" | "lg" }> = ({
  size = "lg",
}) => {
  const [phase, setPhase] = useState<DemoPhase>("intro");
  const [outcomeIndex, setOutcomeIndex] = useState(0);
  const [audioManager] = useState(() => AudioManager.getInstance());
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const outcome = OUTCOMES[outcomeIndex % OUTCOMES.length];

  const playSound = useCallback(
    (sound: string) => {
      try {
        audioManager.playSound(sound);
      } catch {
        // ignore
      }
    },
    [audioManager],
  );

  useEffect(() => {
    const duration = PHASE_DURATION[phase];

    // Play sounds at phase transitions
    if (phase === "commit") playSound("click");
    if (phase === "falling") playSound("cooperate");
    if (phase === "outcome") {
      if (outcome === "caught") playSound("coin");
      else if (outcome === "betrayed" || outcome === "mutual")
        playSound("lose");
      else playSound("win");
    }

    timeoutRef.current = setTimeout(() => {
      if (phase === "reset") {
        setOutcomeIndex((i) => i + 1);
        setPhase("intro");
      } else {
        setPhase((prev) => {
          const order: DemoPhase[] = [
            "intro",
            "commit",
            "falling",
            "outcome",
            "reset",
          ];
          const idx = order.indexOf(prev);
          return order[(idx + 1) % order.length];
        });
      }
    }, duration);

    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, [phase, outcome, playSound]);

  // Determine character states based on phase
  const getStates = (): { you: CharacterState; opponent: CharacterState } => {
    switch (phase) {
      case "intro":
        return { you: "standing", opponent: "standing" };
      case "commit":
        return { you: "thinking", opponent: "thinking" };
      case "falling":
        return { you: "falling", opponent: "falling" };
      case "outcome":
        return getOutcomeStates(outcome);
      case "reset":
        return getOutcomeStates(outcome);
      default:
        return { you: "standing", opponent: "standing" };
    }
  };

  const getOutcomeStates = (
    outcome: string,
  ): { you: CharacterState; opponent: CharacterState } => {
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
  };

  const { you, opponent } = getStates();

  const getSpeech = (): { you?: string; opponent?: string } => {
    switch (phase) {
      case "intro":
        return {};
      case "commit":
        return { you: "Committing...", opponent: "Committing..." };
      case "falling":
        return { you: "Ahhh!", opponent: "Ahhh!" };
      case "outcome":
        return getOutcomeSpeech(outcome);
      case "reset":
        return {};
      default:
        return {};
    }
  };

  const getOutcomeSpeech = (
    outcome: string,
  ): { you?: string; opponent?: string } => {
    switch (outcome) {
      case "caught":
        return { you: "Caught!", opponent: "Trust!" };
      case "betrayed":
        return { you: "Ouch!", opponent: "Gotcha" };
      case "exploited":
        return { you: "Stepped aside!", opponent: "Ouch!" };
      case "mutual":
        return { you: "💥", opponent: "💥" };
      default:
        return {};
    }
  };

  const speech = getSpeech();
  const fallHeight = 80;

  const getOutcomeLabel = (outcome: string): string => {
    switch (outcome) {
      case "caught":
        return "Both cooperated — caught each other! +2 / +2";
      case "betrayed":
        return "They defected — you hit the ground. 0 / +3";
      case "exploited":
        return "You defected — they fell. +3 / 0";
      case "mutual":
        return "Both defected — nobody caught anyone. 0 / 0";
      default:
        return "";
    }
  };

  // Phase label
  const phaseLabel = (() => {
    switch (phase) {
      case "intro":
        return "Both players stand at the edge";
      case "commit":
        return "Both commit their moves with ZK proofs";
      case "falling":
        return "The fall begins — no turning back";
      case "outcome": {
        const outcomeLabel = getOutcomeLabel(outcome);
        return outcomeLabel;
      }
      case "reset":
        return "";
      default:
        return "";
    }
  })();

  const isFalling = (state: CharacterState) => state === "falling";

  return (
    <div
      style={{
        padding: "24px",
        background: "rgba(10, 14, 26, 0.6)",
        border: "1px solid var(--border-glass)",
        borderRadius: "var(--radius-lg)",
        textAlign: "center",
      }}
    >
      {/* Scene */}
      <div
        style={{
          display: "flex",
          justifyContent: "center",
          alignItems: "flex-end",
          gap: "80px",
          height: `${fallHeight + 60}px`,
          position: "relative",
          marginBottom: "16px",
        }}
      >
        {/* Platform */}
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
        <div style={{ position: "relative", textAlign: "center" }}>
          <div
            style={{
              position: isFalling(you) ? "absolute" : "relative",
              bottom: isFalling(you) ? `${fallHeight}px` : "auto",
              left: "50%",
              transform: "translateX(-50%)",
              transition: "all 0.5s var(--ease-out)",
            }}
          >
            <TrustFallCharacter
              state={you}
              color="you"
              size={size}
              speech={speech.you}
              label="You"
            />
          </div>
        </div>

        {/* Opponent */}
        <div style={{ position: "relative", textAlign: "center" }}>
          <div
            style={{
              position: isFalling(opponent) ? "absolute" : "relative",
              bottom: isFalling(opponent) ? `${fallHeight}px` : "auto",
              left: "50%",
              transform: "translateX(-50%)",
              transition: "all 0.5s var(--ease-out)",
            }}
          >
            <TrustFallCharacter
              state={opponent}
              color="opponent"
              size={size}
              speech={speech.opponent}
              label="Opponent"
            />
          </div>
        </div>
      </div>

      {/* Phase label */}
      <div
        style={{
          minHeight: "24px",
          fontFamily: "var(--font-body)",
          fontSize: "var(--text-sm)",
          color: "var(--text-secondary)",
          transition: "opacity 0.3s",
        }}
      >
        {phaseLabel}
      </div>
    </div>
  );
};
