/**
 * ChoiceSlide — Step 2: "The Choice"
 *
 * Introduces cooperate/defect with a single round against a simple AI.
 * Shows the payoff matrix. No strategy selection, no noise, no advanced features.
 * The user makes one choice and sees the outcome.
 */

import React, { useState } from "react";
import { SlideProps } from "../SlideSystem";
import {
  calculatePayoff,
  NC_DEFAULT,
  type GameMove,
} from "../../util/strategies";
import { unlockAchievement } from "../ui/AchievementBadge";
import { StaggerButton } from "../ui/StaggerButton";
import { ElectricButton } from "../ui/ElectricButton";
import { ShimmerButton } from "../ui/ShimmerButton";

type Outcome = "caught" | "betrayed" | "exploited" | "mutual-destruction";

const OUTCOME_INFO: Record<
  Outcome,
  { label: string; color: string; emoji: string }
> = {
  caught: {
    label: "Caught — you both showed up",
    color: "var(--accent-cooperate)",
    emoji: "🤝",
  },
  betrayed: {
    label: "You hit the ground — they stepped aside",
    color: "var(--accent-defect)",
    emoji: "💥",
  },
  exploited: {
    label: "You stepped aside — they fell",
    color: "var(--accent-warm)",
    emoji: "🏆",
  },
  "mutual-destruction": {
    label: "Nobody caught anyone",
    color: "var(--accent-defect)",
    emoji: "💀",
  },
};

export const ChoiceSlide: React.FC<SlideProps> = ({ onNext }) => {
  const [playerMove, setPlayerMove] = useState<GameMove | null>(null);
  const [aiMove] = useState<GameMove>("C"); // Always cooperates first round
  const [outcome, setOutcome] = useState<Outcome | null>(null);
  const [payout, setPayout] = useState<{ player: number; ai: number } | null>(
    null,
  );

  const makeChoice = (move: GameMove) => {
    if (playerMove) return; // Already played
    const result = calculatePayoff(move, aiMove, 1, NC_DEFAULT);
    setPlayerMove(move);
    setPayout(result);

    let o: Outcome;
    if (move === "C" && aiMove === "C") o = "caught";
    else if (move === "C" && aiMove === "D") o = "betrayed";
    else if (move === "D" && aiMove === "C") o = "exploited";
    else o = "mutual-destruction";
    setOutcome(o);

    // Unlock achievements
    if (o === "caught") unlockAchievement("first_catch");
    else if (o === "betrayed") unlockAchievement("first_betrayal");
    else if (o === "exploited") unlockAchievement("first_exploit");
  };

  const reset = () => {
    setPlayerMove(null);
    setOutcome(null);
    setPayout(null);
  };

  return (
    <div style={{ maxWidth: "640px", margin: "0 auto", textAlign: "center" }}>
      <h2
        data-animate
        style={{
          fontFamily: "var(--font-display)",
          fontSize: "var(--text-3xl)",
          marginBottom: "12px",
        }}
      >
        The Choice
      </h2>

      <p
        data-animate
        style={{
          fontFamily: "var(--font-body)",
          fontSize: "var(--text-base)",
          color: "var(--text-secondary)",
          marginBottom: "32px",
        }}
      >
        Your opponent is waiting below. You have two options.
      </p>

      {/* Payoff matrix */}
      <div
        data-animate
        className="glass-panel"
        style={{ padding: "24px", marginBottom: "32px" }}
      >
        <p
          style={{
            fontFamily: "var(--font-body)",
            fontSize: "var(--text-sm)",
            color: "var(--text-muted)",
            marginBottom: "16px",
            textTransform: "uppercase",
            letterSpacing: "0.1em",
          }}
        >
          Payoff Matrix
        </p>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "1fr 1fr 1fr",
            gap: "8px",
            maxWidth: "360px",
            margin: "0 auto",
            fontSize: "var(--text-sm)",
          }}
        >
          <div />
          <div style={{ color: "var(--accent-cooperate)", fontWeight: 600 }}>
            They catch
          </div>
          <div style={{ color: "var(--accent-defect)", fontWeight: 600 }}>
            They step aside
          </div>

          <div style={{ color: "var(--accent-cooperate)", fontWeight: 600 }}>
            You fall
          </div>
          <div
            className="glass-panel"
            style={{ padding: "12px", color: "var(--accent-cooperate)" }}
          >
            +2 / +2
            <br />
            <span
              style={{ fontSize: "var(--text-xs)", color: "var(--text-muted)" }}
            >
              mutual trust
            </span>
          </div>
          <div
            className="glass-panel"
            style={{ padding: "12px", color: "var(--accent-defect)" }}
          >
            -1 / +3
            <br />
            <span
              style={{ fontSize: "var(--text-xs)", color: "var(--text-muted)" }}
            >
              you fell, they stepped aside
            </span>
          </div>

          <div style={{ color: "var(--accent-defect)", fontWeight: 600 }}>
            You step aside
          </div>
          <div
            className="glass-panel"
            style={{ padding: "12px", color: "var(--accent-warm)" }}
          >
            +3 / -1
            <br />
            <span
              style={{ fontSize: "var(--text-xs)", color: "var(--text-muted)" }}
            >
              they fell, you stepped aside
            </span>
          </div>
          <div
            className="glass-panel"
            style={{ padding: "12px", color: "var(--accent-defect)" }}
          >
            0 / 0<br />
            <span
              style={{ fontSize: "var(--text-xs)", color: "var(--text-muted)" }}
            >
              nobody caught anyone
            </span>
          </div>
        </div>
      </div>

      {/* Choice buttons or result */}
      {!playerMove ? (
        <div data-animate>
          <div
            style={{ display: "flex", gap: "16px", justifyContent: "center" }}
          >
            <StaggerButton
              onClick={() => makeChoice("C")}
              color="cooperate"
              size="lg"
              triggerOn="active"
            >
              🤝 Fall (Cooperate)
            </StaggerButton>
            <StaggerButton
              onClick={() => makeChoice("D")}
              color="defect"
              size="lg"
              triggerOn="active"
            >
              ⚔️ Step aside (Defect)
            </StaggerButton>
          </div>
        </div>
      ) : (
        <div data-animate>
          <div
            className="glass-panel"
            style={{
              padding: "32px",
              marginBottom: "24px",
              borderColor: outcome ? OUTCOME_INFO[outcome].color : undefined,
            }}
          >
            <div style={{ fontSize: "48px", marginBottom: "12px" }}>
              {OUTCOME_INFO[outcome!].emoji}
            </div>
            <p
              style={{
                fontFamily: "var(--font-display)",
                fontSize: "var(--text-xl)",
                color: OUTCOME_INFO[outcome!].color,
                marginBottom: "8px",
              }}
            >
              {OUTCOME_INFO[outcome!].label}
            </p>
            {payout && (
              <p
                style={{
                  fontFamily: "var(--font-mono)",
                  fontSize: "var(--text-sm)",
                  color: "var(--text-secondary)",
                }}
              >
                You: {payout.player > 0 ? "+" : ""}
                {payout.player} · Them: {payout.ai > 0 ? "+" : ""}
                {payout.ai}
              </p>
            )}
          </div>

          {outcome === "caught" && (
            <p
              data-animate
              style={{
                fontFamily: "var(--font-display)",
                fontStyle: "italic",
                fontSize: "var(--text-lg)",
                color: "var(--text-secondary)",
                marginBottom: "24px",
              }}
            >
              You both gained +2. Trust paid off — this time.
            </p>
          )}
          {outcome === "exploited" && (
            <p
              data-animate
              style={{
                fontFamily: "var(--font-display)",
                fontStyle: "italic",
                fontSize: "var(--text-lg)",
                color: "var(--text-secondary)",
                marginBottom: "24px",
              }}
            >
              You gained +3 by stepping aside. But would you play the same way
              if you had to see them again?
            </p>
          )}

          <div
            style={{ display: "flex", gap: "12px", justifyContent: "center" }}
          >
            <ShimmerButton onClick={reset} size="sm">
              ↺ Try again
            </ShimmerButton>
            <ElectricButton onClick={onNext} color="violet" size="sm">
              What if you played again? →
            </ElectricButton>
          </div>
        </div>
      )}
    </div>
  );
};
