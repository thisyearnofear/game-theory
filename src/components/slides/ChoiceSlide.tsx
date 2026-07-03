/**
 * ChoiceSlide — Step 2: "The Choice"
 *
 * Introduces cooperate/defect with a single round against a simple AI.
 * Shows the payoff matrix. No strategy selection, no noise, no advanced features.
 * The user makes one choice and sees the outcome.
 *
 * The payoff matrix is proximity-aware and interactive:
 * - Cells glow brighter as the cursor approaches (requestAnimationFrame-driven).
 * - Hovering a cell shows a tooltip describing that outcome.
 * - Hovering the Cooperate/Defect buttons highlights the corresponding matrix row.
 * - Cells fade in with the existing [data-animate] stagger system.
 */

import React, { useState, useRef, useEffect, useCallback } from "react";
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
import { TrustFallCharacter } from "../TrustFallCharacter";

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

// --- Payoff matrix data -------------------------------------------------

interface MatrixCellData {
  id: string;
  row: "C" | "D";
  payoff: string;
  sub: string;
  color: string;
  description: string;
}

const MATRIX_CELLS: MatrixCellData[] = [
  {
    id: "cc",
    row: "C",
    payoff: "+2 / +2",
    sub: "mutual trust",
    color: "var(--accent-cooperate)",
    description: "🤝 You both fall and catch each other. +2 each.",
  },
  {
    id: "cd",
    row: "C",
    payoff: "-1 / +3",
    sub: "you fell, they stepped aside",
    color: "var(--accent-defect)",
    description: "💥 You fall, they step aside. You: 0, Them: +3",
  },
  {
    id: "dc",
    row: "D",
    payoff: "+3 / -1",
    sub: "they fell, you stepped aside",
    color: "var(--accent-warm)",
    description: "🏆 You step aside, they fall. You: +3, Them: 0",
  },
  {
    id: "dd",
    row: "D",
    payoff: "0 / 0",
    sub: "nobody caught anyone",
    color: "var(--accent-defect)",
    description: "💀 You both step aside. Nobody catches anyone. +1 each.",
  },
];

// Distance (in px) within which a cell starts glowing from cursor proximity.
const PROXIMITY_RADIUS = 150;

interface PayoffMatrixProps {
  hoveredChoice: "C" | "D" | null;
}

const PayoffMatrix: React.FC<PayoffMatrixProps> = ({ hoveredChoice }) => {
  const matrixRef = useRef<HTMLDivElement>(null);
  const cellRefs = useRef<(HTMLDivElement | null)[]>([]);
  const rafRef = useRef<number | null>(null);
  const mousePos = useRef<{ x: number; y: number } | null>(null);
  const [hoveredCell, setHoveredCell] = useState<string | null>(null);

  // Recompute each cell's proximity glow based on the latest cursor position.
  const updateGlows = useCallback(() => {
    rafRef.current = null;
    const mouse = mousePos.current;
    if (!mouse) return;

    cellRefs.current.forEach((cell) => {
      if (!cell) return;
      const rect = cell.getBoundingClientRect();
      const cx = rect.left + rect.width / 2;
      const cy = rect.top + rect.height / 2;
      const dist = Math.hypot(mouse.x - cx, mouse.y - cy);
      const intensity =
        dist < PROXIMITY_RADIUS ? 1 - dist / PROXIMITY_RADIUS : 0;
      // Smoothly scale blur radius and opacity with proximity.
      cell.style.boxShadow =
        intensity > 0
          ? `0 0 ${24 * intensity}px rgba(102, 126, 234, ${0.55 * intensity})`
          : "none";
    });
  }, []);

  const handleMouseMove = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      mousePos.current = { x: e.clientX, y: e.clientY };
      if (rafRef.current == null) {
        rafRef.current = requestAnimationFrame(updateGlows);
      }
    },
    [updateGlows],
  );

  const handleMouseLeave = useCallback(() => {
    mousePos.current = null;
    if (rafRef.current == null) {
      rafRef.current = requestAnimationFrame(() => {
        rafRef.current = null;
        cellRefs.current.forEach((cell) => {
          if (cell) cell.style.boxShadow = "none";
        });
      });
    }
  }, []);

  // Cancel any pending animation frame on unmount.
  useEffect(() => {
    return () => {
      if (rafRef.current != null) cancelAnimationFrame(rafRef.current);
    };
  }, []);

  const setCellRef = (idx: number) => (el: HTMLDivElement | null) => {
    cellRefs.current[idx] = el;
  };

  const rowHighlightColor =
    hoveredChoice === "C"
      ? "var(--accent-cooperate)"
      : hoveredChoice === "D"
        ? "var(--accent-defect)"
        : null;

  const hoveredDescription =
    MATRIX_CELLS.find((c) => c.id === hoveredCell)?.description ?? null;

  return (
    <div
      data-animate
      style={{
        padding: "24px",
        marginBottom: "32px",
        background: "rgba(10, 14, 26, 0.85)",
        border: "1px solid var(--border-glass)",
        borderRadius: "var(--radius-lg)",
      }}
    >
      <p
        style={{
          fontFamily: "var(--font-body)",
          fontSize: "var(--text-xs)",
          color: "var(--text-secondary)",
          marginBottom: "16px",
          textTransform: "uppercase",
          letterSpacing: "0.12em",
          fontWeight: 600,
        }}
      >
        Payoff Matrix
      </p>

      <div
        ref={matrixRef}
        onMouseMove={handleMouseMove}
        onMouseLeave={handleMouseLeave}
        style={{
          display: "grid",
          gridTemplateColumns: "auto 1fr 1fr",
          gap: "6px",
          maxWidth: "420px",
          margin: "0 auto",
        }}
      >
        {/* Header row */}
        <div />
        <div
          style={{
            color: "var(--accent-cooperate)",
            fontWeight: 700,
            fontSize: "var(--text-sm)",
            textAlign: "center",
            padding: "6px 4px",
          }}
        >
          They catch
        </div>
        <div
          style={{
            color: "var(--accent-defect)",
            fontWeight: 700,
            fontSize: "var(--text-sm)",
            textAlign: "center",
            padding: "6px 4px",
          }}
        >
          They step aside
        </div>

        {/* Row 1: You fall (Cooperate) */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "flex-end",
            paddingRight: "8px",
            gap: "6px",
            transition: "all 0.25s",
            opacity: hoveredChoice === "D" ? 0.4 : 1,
          }}
        >
          <span
            style={{
              color: "var(--accent-cooperate)",
              fontWeight: 700,
              fontSize: "var(--text-sm)",
              textShadow:
                hoveredChoice === "C"
                  ? "0 0 12px var(--accent-cooperate)"
                  : "none",
            }}
          >
            You fall
          </span>
          <TrustFallCharacter state="standing" color="cooperator" size="sm" />
        </div>
        {MATRIX_CELLS.slice(0, 2).map((cell, i) => (
          <div
            key={cell.id}
            ref={setCellRef(i)}
            data-animate
            onMouseEnter={() => setHoveredCell(cell.id)}
            onMouseLeave={() => setHoveredCell(null)}
            style={{
              padding: "14px 10px",
              borderRadius: "var(--radius-sm)",
              background:
                hoveredChoice === cell.row
                  ? hoveredChoice === "C"
                    ? "rgba(74,222,128,0.12)"
                    : "rgba(248,113,113,0.12)"
                  : "rgba(255,255,255,0.04)",
              border:
                rowHighlightColor && hoveredChoice === cell.row
                  ? `2px solid ${rowHighlightColor}`
                  : "1px solid rgba(255,255,255,0.08)",
              transition:
                "border-color 0.25s, background 0.25s, box-shadow 0.25s",
              textAlign: "center",
            }}
          >
            <div
              style={{
                fontSize: "var(--text-lg)",
                fontWeight: 700,
                color: cell.color,
                fontFamily: "var(--font-mono)",
              }}
            >
              {cell.payoff}
            </div>
            <div
              style={{
                fontSize: "var(--text-xs)",
                color: "var(--text-secondary)",
                marginTop: "4px",
                lineHeight: 1.3,
              }}
            >
              {cell.sub}
            </div>
          </div>
        ))}

        {/* Row 2: You step aside (Defect) */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "flex-end",
            paddingRight: "8px",
            gap: "6px",
            transition: "all 0.25s",
            opacity: hoveredChoice === "C" ? 0.4 : 1,
          }}
        >
          <span
            style={{
              color: "var(--accent-defect)",
              fontWeight: 700,
              fontSize: "var(--text-sm)",
              textShadow:
                hoveredChoice === "D"
                  ? "0 0 12px var(--accent-defect)"
                  : "none",
            }}
          >
            You step aside
          </span>
          <TrustFallCharacter state="standing" color="defector" size="sm" />
        </div>
        {MATRIX_CELLS.slice(2, 4).map((cell, i) => (
          <div
            key={cell.id}
            ref={setCellRef(i + 2)}
            data-animate
            onMouseEnter={() => setHoveredCell(cell.id)}
            onMouseLeave={() => setHoveredCell(null)}
            style={{
              padding: "14px 10px",
              borderRadius: "var(--radius-sm)",
              background:
                hoveredChoice === cell.row
                  ? hoveredChoice === "C"
                    ? "rgba(74,222,128,0.12)"
                    : "rgba(248,113,113,0.12)"
                  : "rgba(255,255,255,0.04)",
              border:
                rowHighlightColor && hoveredChoice === cell.row
                  ? `2px solid ${rowHighlightColor}`
                  : "1px solid rgba(255,255,255,0.08)",
              transition:
                "border-color 0.25s, background 0.25s, box-shadow 0.25s",
              textAlign: "center",
            }}
          >
            <div
              style={{
                fontSize: "var(--text-lg)",
                fontWeight: 700,
                color: cell.color,
                fontFamily: "var(--font-mono)",
              }}
            >
              {cell.payoff}
            </div>
            <div
              style={{
                fontSize: "var(--text-xs)",
                color: "var(--text-secondary)",
                marginTop: "4px",
                lineHeight: 1.3,
              }}
            >
              {cell.sub}
            </div>
          </div>
        ))}
      </div>

      {/* Hover tooltip / outcome description */}
      <div
        style={{
          minHeight: "24px",
          marginTop: "16px",
          fontFamily: "var(--font-body)",
          fontSize: "var(--text-sm)",
          color: "var(--text-secondary)",
          transition: "opacity 0.2s",
          opacity: hoveredDescription ? 1 : 0,
          textAlign: "center",
        }}
      >
        {hoveredDescription ?? "\u00A0"}
      </div>
    </div>
  );
};

// --- Main slide ---------------------------------------------------------

export const ChoiceSlide: React.FC<SlideProps> = ({ onNext }) => {
  const [playerMove, setPlayerMove] = useState<GameMove | null>(null);
  const [aiMove] = useState<GameMove>("C"); // Always cooperates first round
  const [outcome, setOutcome] = useState<Outcome | null>(null);
  const [payout, setPayout] = useState<{ player: number; ai: number } | null>(
    null,
  );
  const [hoveredChoice, setHoveredChoice] = useState<"C" | "D" | null>(null);

  const makeChoice = (move: GameMove) => {
    if (playerMove) return; // Already played
    const result = calculatePayoff(move, aiMove, 1, NC_DEFAULT);
    setPlayerMove(move);
    setPayout({ player: result.playerPayout, ai: result.aiPayout });

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

      {/* Payoff matrix (proximity-aware & interactive) */}
      <PayoffMatrix hoveredChoice={hoveredChoice} />

      {/* Choice buttons or result */}
      {!playerMove ? (
        <div data-animate>
          <div
            style={{ display: "flex", gap: "16px", justifyContent: "center" }}
          >
            <div
              onMouseEnter={() => setHoveredChoice("C")}
              onMouseLeave={() => setHoveredChoice(null)}
            >
              <StaggerButton
                onClick={() => makeChoice("C")}
                color="cooperate"
                size="lg"
                triggerOn="active"
              >
                🤝 Fall (Cooperate)
              </StaggerButton>
            </div>
            <div
              onMouseEnter={() => setHoveredChoice("D")}
              onMouseLeave={() => setHoveredChoice(null)}
            >
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
            <div
              style={{
                marginBottom: "12px",
                display: "flex",
                justifyContent: "center",
                gap: "40px",
              }}
            >
              <TrustFallCharacter
                state={
                  outcome === "caught"
                    ? "caught"
                    : outcome === "betrayed"
                      ? "impact"
                      : outcome === "exploited"
                        ? "celebrating"
                        : "impact"
                }
                color={
                  outcome === "caught"
                    ? "cooperator"
                    : outcome === "betrayed"
                      ? "you"
                      : outcome === "exploited"
                        ? "defector"
                        : "defector"
                }
                size="xl"
                label="You"
              />
              <TrustFallCharacter
                state={
                  outcome === "caught"
                    ? "caught"
                    : outcome === "betrayed"
                      ? "celebrating"
                      : outcome === "exploited"
                        ? "impact"
                        : "impact"
                }
                color={
                  outcome === "caught"
                    ? "cooperator"
                    : outcome === "betrayed"
                      ? "defector"
                      : outcome === "exploited"
                        ? "opponent"
                        : "defector"
                }
                size="xl"
                label="Them"
              />
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
