/**
 * StaggerButton — button with staggered striped fill animation.
 *
 * Inspired by codrops BalloonButton. Uses SVG rects that slide in
 * from the left with a GSAP stagger when activated/hovered.
 * Adapted to Trustfall's aesthetic with skewed stripes.
 *
 * Perfect for the Cooperate/Defect choice buttons — the fill animation
 * makes choosing feel impactful.
 */

import React, { useRef, useEffect } from "react";
import gsap from "gsap";
import { useMagnetic } from "../../hooks/useMagnetic";

interface StaggerButtonProps {
  children: React.ReactNode;
  onClick?: () => void;
  disabled?: boolean;
  /** Color of the fill stripes */
  color?: "cooperate" | "defect" | "violet" | "warm";
  size?: "sm" | "md" | "lg";
  /** Whether to trigger fill on hover or on click/active state */
  triggerOn?: "hover" | "active" | "always";
  /** If true, stripes are permanently filled (selected state) */
  filled?: boolean;
  className?: string;
  style?: React.CSSProperties;
}

const COLOR_MAP = {
  cooperate: {
    stripe: "#4ade80",
    glow: "rgba(74,222,128,0.4)",
    text: "#4ade80",
    bg: "#0a1a10",
  },
  defect: {
    stripe: "#f87171",
    glow: "rgba(248,113,113,0.4)",
    text: "#f87171",
    bg: "#1a0a0a",
  },
  violet: {
    stripe: "#667eea",
    glow: "rgba(102,126,234,0.4)",
    text: "#a0b4ff",
    bg: "#0a0e1a",
  },
  warm: {
    stripe: "#f0a020",
    glow: "rgba(240,160,32,0.4)",
    text: "#ffc04a",
    bg: "#1a1208",
  },
};

const SIZE_MAP = {
  sm: {
    padding: "8px 20px",
    fontSize: "0.875rem",
    height: 36,
    stripeHeight: 1.5,
  },
  md: {
    padding: "12px 28px",
    fontSize: "1.125rem",
    height: 48,
    stripeHeight: 2,
  },
  lg: {
    padding: "16px 40px",
    fontSize: "1.5rem",
    height: 60,
    stripeHeight: 2.5,
  },
};

export const StaggerButton: React.FC<StaggerButtonProps> = ({
  children,
  onClick,
  disabled = false,
  color = "violet",
  size = "md",
  triggerOn = "hover",
  filled = false,
  className,
  style,
}) => {
  const buttonRef = useRef<HTMLButtonElement>(null);
  const svgRef = useRef<SVGSVGElement>(null);
  const magneticRef = useMagnetic<HTMLDivElement>({
    strength: 0.2,
    radius: 90,
  });
  const timelineRef = useRef<gsap.core.Timeline | null>(null);
  const idRef = useRef(`sb-${Math.random().toString(36).slice(2, 9)}`);

  const colors = COLOR_MAP[color];
  const sizes = SIZE_MAP[size];
  const uniqueId = idRef.current;

  // Number of stripes based on button height
  const stripeCount = Math.ceil(sizes.height / (sizes.stripeHeight * 2));
  const stripes = Array.from({ length: stripeCount }, (_, i) => i);

  useEffect(() => {
    const button = buttonRef.current;
    const svg = svgRef.current;
    if (!button || !svg) return;

    const rects = svg.querySelectorAll<SVGRectElement>(".stripe-rect");
    if (rects.length === 0) return;

    if (filled) {
      // Permanently filled
      gsap.to(rects, {
        xPercent: "100",
        duration: 0,
      });
      return;
    }

    const tl = gsap.timeline({ paused: true });

    tl.to(rects, {
      duration: 0.6,
      ease: "elastic.out(1, 0.4)",
      xPercent: "100",
      stagger: 0.015,
      overwrite: true,
    });

    timelineRef.current = tl;

    if (triggerOn === "always") {
      void tl.play(0);
      return;
    }

    if (triggerOn === "hover") {
      const onEnter = () => {
        void tl.play();
      };
      const onLeave = () => {
        void tl.reverse();
      };
      button.addEventListener("mouseenter", onEnter);
      button.addEventListener("mouseleave", onLeave);
      return () => {
        button.removeEventListener("mouseenter", onEnter);
        button.removeEventListener("mouseleave", onLeave);
        tl.kill();
      };
    }

    // triggerOn === "active" — handled by onClick
  }, [filled, triggerOn]);

  const handleClick = () => {
    if (disabled) return;
    if (triggerOn === "active" && timelineRef.current) {
      void timelineRef.current.play(0);
    }
    onClick?.();
  };

  return (
    <div
      ref={magneticRef}
      style={{ display: "inline-block", position: "relative" }}
    >
      <button
        ref={buttonRef}
        type="button"
        onClick={handleClick}
        disabled={disabled}
        className={className}
        style={{
          cursor: disabled ? "not-allowed" : "pointer",
          height: sizes.height,
          display: "inline-flex",
          alignItems: "center",
          justifyContent: "center",
          background: colors.bg,
          border: `1px solid ${colors.stripe}30`,
          borderRadius: "10px",
          color: filled ? "#fff" : colors.text,
          fontFamily: "var(--font-display)",
          fontSize: sizes.fontSize,
          padding: sizes.padding,
          opacity: disabled ? 0.5 : 1,
          transition: "border-color 0.3s, box-shadow 0.3s",
          position: "relative",
          zIndex: 1,
          overflow: "hidden",
          ...style,
        }}
        onMouseEnter={(e) => {
          if (!disabled) {
            e.currentTarget.style.borderColor = `${colors.stripe}80`;
            e.currentTarget.style.boxShadow = `0 0 20px ${colors.glow}`;
          }
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.borderColor = `${colors.stripe}30`;
          e.currentTarget.style.boxShadow = "none";
        }}
      >
        <span style={{ position: "relative", zIndex: 2, fontStyle: "italic" }}>
          {children}
        </span>
      </button>

      {/* Striped fill SVG */}
      <svg
        ref={svgRef}
        aria-hidden="true"
        height="100%"
        width="100%"
        xmlns="http://www.w3.org/2000/svg"
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          pointerEvents: "none",
          overflow: "hidden",
          borderRadius: "10px",
          transform: "skew(-12deg)",
          zIndex: 0,
        }}
      >
        <g className={`stripes-${uniqueId}`}>
          {stripes.map((i) => (
            <rect
              key={i}
              className="stripe-rect"
              x="-100%"
              y={i * sizes.stripeHeight * 2}
              width="100%"
              height={sizes.stripeHeight}
              fill={colors.stripe}
              shapeRendering="crispEdges"
              opacity={0.85}
            />
          ))}
        </g>
      </svg>
    </div>
  );
};
