/**
 * TrustFallCharacter — the unified SVG stick figure mascot.
 *
 * One consistent character across the entire app. Replaces all emoji-based
 * stick figures (🧍, 🏃, 🪂) and the old Character component.
 *
 * States:
 *   standing    — upright at the edge, gentle sway
 *   falling     — rotated 90°, moving downward
 *   caught      — arms outstretched, happy expression
 *   impact      — squashed at bottom, dazed expression
 *   thinking    — head tilted, thought bubble
 *   celebrating — arms raised, bouncing
 *   waiting     — standing with question mark
 *
 * Colors:
 *   "you"       — violet (var(--accent-violet))
 *   "opponent"  — warm amber (var(--accent-warm))
 *   "neutral"   — muted gray
 *   "cooperator"— green
 *   "defector"  — red
 *
 * The SVG is lightweight (~30 lines) and all animation is CSS-driven
 * via classes from index.css (tf-sway, tf-falling, tf-impact, tf-catch).
 */
import React from "react";

export type CharacterState =
  | "standing"
  | "falling"
  | "caught"
  | "impact"
  | "thinking"
  | "celebrating"
  | "waiting";

export type CharacterColor =
  | "you"
  | "opponent"
  | "neutral"
  | "cooperator"
  | "defector";

interface TrustFallCharacterProps {
  state?: CharacterState;
  color?: CharacterColor;
  size?: "sm" | "md" | "lg" | "xl";
  /** Show a speech bubble with text */
  speech?: string;
  /** Label under the character */
  label?: string;
  /** Additional className for custom animations */
  className?: string;
}

const COLOR_MAP: Record<CharacterColor, string> = {
  you: "#667eea",
  opponent: "#f0a020",
  neutral: "#9E9E9E",
  cooperator: "#4ade80",
  defector: "#f87171",
};

const SIZE_MAP: Record<string, number> = {
  sm: 32,
  md: 48,
  lg: 64,
  xl: 96,
};

const STATE_ANIMATION: Record<CharacterState, string> = {
  standing: "tf-sway",
  falling: "tf-falling",
  caught: "tf-catch",
  impact: "tf-impact",
  thinking: "tf-sway",
  celebrating: "tf-catch",
  waiting: "tf-sway",
};

export const TrustFallCharacter: React.FC<TrustFallCharacterProps> = ({
  state = "standing",
  color = "you",
  size = "md",
  speech,
  label,
  className = "",
}) => {
  const dim = SIZE_MAP[size];
  const stroke = color === "neutral" ? 2.5 : 3;
  const c = COLOR_MAP[color];
  const animClass = STATE_ANIMATION[state];

  // Expression based on state
  const expression = (() => {
    switch (state) {
      case "caught":
      case "celebrating":
        return { eyes: "happy", mouth: "smile" };
      case "impact":
        return { eyes: "dazed", mouth: "o" };
      case "thinking":
        return { eyes: "thinking", mouth: "flat" };
      case "waiting":
        return { eyes: "neutral", mouth: "flat" };
      default:
        return { eyes: "neutral", mouth: "neutral" };
    }
  })();

  // Arm positions based on state
  const arms = (() => {
    switch (state) {
      case "caught":
      case "celebrating":
        // Arms up/outstretched
        return { leftX: 8, leftY: 18, rightX: 32, rightY: 18 };
      case "impact":
        // Arms splayed
        return { leftX: 6, leftY: 28, rightX: 34, rightY: 28 };
      case "thinking":
        // One hand to chin
        return { leftX: 12, leftY: 25, rightX: 22, rightY: 14 };
      default:
        // Arms at sides
        return { leftX: 10, leftY: 26, rightX: 30, rightY: 26 };
    }
  })();

  // Body rotation for falling state
  const bodyTransform = state === "falling" ? "rotate(90 20 28)" : "";

  return (
    <div
      style={{
        display: "inline-flex",
        flexDirection: "column",
        alignItems: "center",
        gap: "4px",
      }}
    >
      <div style={{ position: "relative", display: "inline-block" }}>
        {/* Speech bubble */}
        {speech && (
          <div
            style={{
              position: "absolute",
              bottom: "100%",
              left: "50%",
              transform: "translateX(-50%)",
              background: "rgba(20, 26, 46, 0.95)",
              border: `1px solid ${c}40`,
              padding: "6px 12px",
              borderRadius: "12px",
              fontSize: "12px",
              fontFamily: "var(--font-body)",
              color: "var(--text-primary)",
              maxWidth: "180px",
              textAlign: "center",
              marginBottom: "6px",
              whiteSpace: "nowrap",
              boxShadow: `0 4px 16px ${c}30`,
              animation: "fadeIn 0.3s ease-out",
              zIndex: 10,
            }}
          >
            {speech}
            <div
              style={{
                position: "absolute",
                top: "100%",
                left: "50%",
                transform: "translateX(-50%)",
                width: 0,
                height: 0,
                borderLeft: "5px solid transparent",
                borderRight: "5px solid transparent",
                borderTop: `5px solid rgba(20, 26, 46, 0.95)`,
              }}
            />
          </div>
        )}

        {/* Thinking bubble */}
        {state === "thinking" && !speech && (
          <div
            style={{
              position: "absolute",
              top: "-8px",
              right: "-12px",
              fontSize: "16px",
              animation: "tf-sway 2s ease-in-out infinite",
            }}
          >
            💭
          </div>
        )}

        {/* Waiting indicator */}
        {state === "waiting" && (
          <div
            style={{
              position: "absolute",
              top: "-10px",
              right: "-8px",
              fontSize: "14px",
              animation: "tf-waiting-pulse 1.5s ease-in-out infinite",
            }}
          >
            ❓
          </div>
        )}

        {/* SVG stick figure */}
        <svg
          width={dim}
          height={dim}
          viewBox="0 0 40 48"
          className={`${animClass} ${className}`}
          style={{
            filter: `drop-shadow(0 0 8px ${c}40)`,
            transformOrigin: state === "falling" ? "20px 40px" : "center",
          }}
        >
          {/* Head */}
          <circle
            cx="20"
            cy="10"
            r="6"
            fill="none"
            stroke={c}
            strokeWidth={stroke}
            strokeLinecap="round"
          />

          {/* Eyes */}
          {expression.eyes === "happy" && (
            <>
              <path
                d="M 17 9 Q 18 7 19 9"
                fill="none"
                stroke={c}
                strokeWidth="1.5"
                strokeLinecap="round"
              />
              <path
                d="M 21 9 Q 22 7 23 9"
                fill="none"
                stroke={c}
                strokeWidth="1.5"
                strokeLinecap="round"
              />
            </>
          )}
          {expression.eyes === "dazed" && (
            <>
              <line
                x1="16"
                y1="9"
                x2="18"
                y2="11"
                stroke={c}
                strokeWidth="1.5"
                strokeLinecap="round"
              />
              <line
                x1="18"
                y1="9"
                x2="16"
                y2="11"
                stroke={c}
                strokeWidth="1.5"
                strokeLinecap="round"
              />
              <line
                x1="22"
                y1="9"
                x2="24"
                y2="11"
                stroke={c}
                strokeWidth="1.5"
                strokeLinecap="round"
              />
              <line
                x1="24"
                y1="9"
                x2="22"
                y2="11"
                stroke={c}
                strokeWidth="1.5"
                strokeLinecap="round"
              />
            </>
          )}
          {expression.eyes === "thinking" && (
            <>
              <line
                x1="17"
                y1="9"
                x2="18"
                y2="9"
                stroke={c}
                strokeWidth="2"
                strokeLinecap="round"
              />
              <line
                x1="22"
                y1="9"
                x2="23"
                y2="9"
                stroke={c}
                strokeWidth="2"
                strokeLinecap="round"
              />
            </>
          )}
          {expression.eyes === "neutral" && (
            <>
              <circle cx="17.5" cy="9" r="1" fill={c} />
              <circle cx="22.5" cy="9" r="1" fill={c} />
            </>
          )}

          {/* Mouth */}
          {expression.mouth === "smile" && (
            <path
              d="M 17 12 Q 20 14 23 12"
              fill="none"
              stroke={c}
              strokeWidth="1.5"
              strokeLinecap="round"
            />
          )}
          {expression.mouth === "o" && (
            <circle
              cx="20"
              cy="12.5"
              r="1.5"
              fill="none"
              stroke={c}
              strokeWidth="1.2"
            />
          )}
          {expression.mouth === "flat" && (
            <line
              x1="18"
              y1="12.5"
              x2="22"
              y2="12.5"
              stroke={c}
              strokeWidth="1.5"
              strokeLinecap="round"
            />
          )}
          {expression.mouth === "neutral" && (
            <path
              d="M 18 12 Q 20 12.5 22 12"
              fill="none"
              stroke={c}
              strokeWidth="1.2"
              strokeLinecap="round"
            />
          )}

          {/* Body */}
          <g transform={bodyTransform}>
            <line
              x1="20"
              y1="16"
              x2="20"
              y2="32"
              stroke={c}
              strokeWidth={stroke}
              strokeLinecap="round"
            />

            {/* Arms */}
            <line
              x1="20"
              y1="22"
              x2={arms.leftX}
              y2={arms.leftY}
              stroke={c}
              strokeWidth={stroke}
              strokeLinecap="round"
            />
            <line
              x1="20"
              y1="22"
              x2={arms.rightX}
              y2={arms.rightY}
              stroke={c}
              strokeWidth={stroke}
              strokeLinecap="round"
            />

            {/* Legs */}
            {state === "impact" ? (
              // Squashed legs
              <>
                <line
                  x1="20"
                  y1="32"
                  x2="14"
                  y2="36"
                  stroke={c}
                  strokeWidth={stroke}
                  strokeLinecap="round"
                />
                <line
                  x1="20"
                  y1="32"
                  x2="26"
                  y2="36"
                  stroke={c}
                  strokeWidth={stroke}
                  strokeLinecap="round"
                />
              </>
            ) : state === "celebrating" ? (
              // Jumping pose
              <>
                <line
                  x1="20"
                  y1="32"
                  x2="14"
                  y2="44"
                  stroke={c}
                  strokeWidth={stroke}
                  strokeLinecap="round"
                />
                <line
                  x1="20"
                  y1="32"
                  x2="26"
                  y2="44"
                  stroke={c}
                  strokeWidth={stroke}
                  strokeLinecap="round"
                />
              </>
            ) : (
              // Normal standing
              <>
                <line
                  x1="20"
                  y1="32"
                  x2="14"
                  y2="44"
                  stroke={c}
                  strokeWidth={stroke}
                  strokeLinecap="round"
                />
                <line
                  x1="20"
                  y1="32"
                  x2="26"
                  y2="44"
                  stroke={c}
                  strokeWidth={stroke}
                  strokeLinecap="round"
                />
              </>
            )}
          </g>
        </svg>
      </div>

      {/* Label */}
      {label && (
        <span
          style={{
            fontSize: "var(--text-xs)",
            color: c,
            fontWeight: 600,
            fontFamily: "var(--font-body)",
          }}
        >
          {label}
        </span>
      )}
    </div>
  );
};
