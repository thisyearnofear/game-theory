/**
 * EdgeSlide — Step 1: "The Edge"
 *
 * Introduces the trust fall metaphor. No game mechanics yet.
 * The user sees a figure standing at the edge of a cliff.
 * The question: do you fall?
 */

import React, { useState } from "react";
import { SlideProps } from "../SlideSystem";

export const EdgeSlide: React.FC<SlideProps> = ({ onNext }) => {
  const [hovered, setHovered] = useState(false);

  return (
    <div
      style={{
        maxWidth: "640px",
        margin: "0 auto",
        textAlign: "center",
        padding: "20px",
      }}
    >
      {/* The scene */}
      <div
        data-animate
        style={{
          position: "relative",
          height: "280px",
          marginBottom: "32px",
          display: "flex",
          alignItems: "flex-end",
          justifyContent: "center",
        }}
      >
        {/* Cliff */}
        <svg
          width="280"
          height="280"
          viewBox="0 0 280 280"
          style={{ position: "absolute", bottom: 0 }}
        >
          {/* Ground/cliff shape */}
          <path
            d="M 0 200 L 120 200 L 120 280 L 0 280 Z"
            fill="rgba(255,255,255,0.06)"
            stroke="rgba(255,255,255,0.12)"
            strokeWidth="1"
          />
          {/* Edge line */}
          <line
            x1="120"
            y1="200"
            x2="280"
            y2="200"
            stroke="rgba(255,255,255,0.08)"
            strokeWidth="1"
            strokeDasharray="4 4"
          />
          {/* Figure standing on edge */}
          <g
            style={{
              transformOrigin: "100px 200px",
              animation: "tf-sway 3s ease-in-out infinite",
            }}
          >
            {/* Head */}
            <circle cx="100" cy="160" r="8" fill="rgba(255,255,255,0.9)" />
            {/* Body */}
            <line
              x1="100"
              y1="168"
              x2="100"
              y2="190"
              stroke="rgba(255,255,255,0.9)"
              strokeWidth="2"
              strokeLinecap="round"
            />
            {/* Arms — crossed (hesitant) */}
            <line
              x1="100"
              y1="175"
              x2="92"
              y2="182"
              stroke="rgba(255,255,255,0.9)"
              strokeWidth="2"
              strokeLinecap="round"
            />
            <line
              x1="100"
              y1="175"
              x2="108"
              y2="182"
              stroke="rgba(255,255,255,0.9)"
              strokeWidth="2"
              strokeLinecap="round"
            />
            {/* Legs */}
            <line
              x1="100"
              y1="190"
              x2="94"
              y2="200"
              stroke="rgba(255,255,255,0.9)"
              strokeWidth="2"
              strokeLinecap="round"
            />
            <line
              x1="100"
              y1="190"
              x2="106"
              y2="200"
              stroke="rgba(255,255,255,0.9)"
              strokeWidth="2"
              strokeLinecap="round"
            />
          </g>
          {/* Glow at edge */}
          <circle cx="120" cy="200" r="20" fill="rgba(240,160,32,0.08)" />
        </svg>
      </div>

      <h2
        data-animate
        style={{
          fontFamily: "var(--font-display)",
          fontSize: "var(--text-3xl)",
          marginBottom: "16px",
          lineHeight: 1.1,
        }}
      >
        You're standing at the edge.
      </h2>

      <p
        data-animate
        style={{
          fontFamily: "var(--font-body)",
          fontSize: "var(--text-lg)",
          color: "var(--text-secondary)",
          maxWidth: "480px",
          margin: "0 auto 24px",
          lineHeight: 1.6,
        }}
      >
        Someone is standing below, arms ready. If you fall and they catch you,
        you both win. If they step aside at the last second — you hit the
        ground.
      </p>

      <p
        data-animate
        style={{
          fontFamily: "var(--font-display)",
          fontStyle: "italic",
          fontSize: "var(--text-xl)",
          color: "var(--accent-warm)",
          marginBottom: "40px",
        }}
      >
        Do you fall?
      </p>

      <div data-animate>
        <button
          onClick={onNext}
          onMouseEnter={() => setHovered(true)}
          onMouseLeave={() => setHovered(false)}
          style={{
            background: hovered
              ? "var(--accent-violet)"
              : "var(--bg-glass-light)",
            border: "1px solid var(--border-glass)",
            borderRadius: "var(--radius-md)",
            color: "var(--text-primary)",
            fontFamily: "var(--font-display)",
            fontSize: "var(--text-xl)",
            padding: "14px 40px",
            cursor: "pointer",
            transition: "all 0.4s cubic-bezier(0.16, 1, 0.3, 1)",
            backdropFilter: "blur(16px)",
            boxShadow: hovered ? "0 0 40px rgba(102,126,234,0.3)" : "none",
          }}
        >
          Take the fall →
        </button>
      </div>

      <p
        data-animate
        style={{
          fontFamily: "var(--font-body)",
          fontSize: "var(--text-sm)",
          color: "var(--text-muted)",
          marginTop: "32px",
        }}
      >
        This is the Prisoner's Dilemma. You'll play it with trust, strategy, and
        real stakes.
      </p>
    </div>
  );
};
