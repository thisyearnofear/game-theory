/**
 * ElectricButton — button with animated lightning border scribbles on hover.
 *
 * Inspired by codrops Electric button. Uses SVG filters (feTurbulence +
 * feDisplacementMap) for the jagged lightning effect, and GSAP for the
 * stroke animation. Adapted to Trustfall's violet/cyan palette.
 *
 * The drawSVG plugin is premium, so we use strokeDasharray/strokeDashoffset
 * for the stroke drawing animation instead.
 */

import React, { useRef, useEffect } from "react";
import gsap from "gsap";
import { useMagnetic } from "../../hooks/useMagnetic";

interface ElectricButtonProps {
  children: React.ReactNode;
  onClick?: () => void;
  disabled?: boolean;
  /** Button color theme */
  color?: "violet" | "warm" | "cooperate" | "defect" | "cyan";
  size?: "sm" | "md" | "lg";
  className?: string;
  style?: React.CSSProperties;
}

const COLOR_MAP = {
  violet: { stroke: "#667eea", glow: "#8b9dfc", bg: "#0a0e1a" },
  warm: { stroke: "#f0a020", glow: "#ffc04a", bg: "#1a1208" },
  cooperate: { stroke: "#4ade80", glow: "#6ff89f", bg: "#0a1a10" },
  defect: { stroke: "#f87171", glow: "#fc9999", bg: "#1a0a0a" },
  cyan: { stroke: "#6ff5ff", glow: "#a0fdfe", bg: "#081649" },
};

const SIZE_MAP = {
  sm: { padding: "8px 20px", fontSize: "0.875rem", height: 36 },
  md: { padding: "12px 28px", fontSize: "1rem", height: 44 },
  lg: { padding: "16px 40px", fontSize: "1.25rem", height: 56 },
};

export const ElectricButton: React.FC<ElectricButtonProps> = ({
  children,
  onClick,
  disabled = false,
  color = "violet",
  size = "md",
  className,
  style,
}) => {
  const buttonRef = useRef<HTMLButtonElement>(null);
  const svgRef = useRef<SVGSVGElement>(null);
  const lightningRef = useRef<SVGGElement>(null);
  const magneticRef = useMagnetic<HTMLDivElement>({
    strength: 0.25,
    radius: 100,
  });
  const timelineRef = useRef<gsap.core.Timeline | null>(null);
  const idRef = useRef(`eb-${Math.random().toString(36).slice(2, 9)}`);

  const colors = COLOR_MAP[color];
  const sizes = SIZE_MAP[size];
  const uniqueId = idRef.current;

  useEffect(() => {
    const button = buttonRef.current;
    const svg = svgRef.current;
    const lightning = lightningRef.current;
    if (!button || !svg || !lightning) return;

    const strikes = lightning.querySelectorAll<SVGRectElement>(".strike");
    const filters = svg.querySelectorAll("feDisplacementMap");

    // Set up stroke dash for draw-on animation
    strikes.forEach((s) => {
      const len = 300; // approximate perimeter
      s.style.strokeDasharray = `${len}`;
      s.style.strokeDashoffset = `${len}`;
    });

    const tl = gsap.timeline({
      defaults: { duration: 1.5, ease: "sine.out" },
      paused: true,
    });

    tl.to(lightning, { opacity: 1, duration: 0.1 })
      .to(filters[0], { attr: { scale: "10" }, duration: 1.5 }, 0)
      .to(filters[1], { attr: { scale: "25" }, duration: 1.5 }, 0)
      .to(filters[2], { attr: { scale: "15" }, duration: 1.5 }, 0)
      .to(filters[3], { attr: { scale: "20" }, duration: 1.5 }, 0)
      .to(filters[4], { attr: { scale: "30" }, duration: 1.5 }, 0);

    // Stroke draw-on animations
    strikes.forEach((s, i) => {
      const len = 300;
      tl.fromTo(
        s,
        { strokeDashoffset: len },
        { strokeDashoffset: 0, duration: 1.2, ease: "power2.out" },
        0.1 * i,
      );
    });

    tl.to(lightning, { opacity: 0, duration: 0.4 }, "-=0.5");

    timelineRef.current = tl;

    const onEnter = () => {
      void gsap.to(svg, { opacity: 1, duration: 0.2 });
      void tl.play(0);
    };

    const onLeave = () => {
      void gsap.to(svg, { opacity: 0, duration: 0.5 });
      void tl.reverse();
    };

    button.addEventListener("mouseenter", onEnter);
    button.addEventListener("mouseleave", onLeave);

    return () => {
      button.removeEventListener("mouseenter", onEnter);
      button.removeEventListener("mouseleave", onLeave);
      tl.kill();
    };
  }, []);

  return (
    <div
      ref={magneticRef}
      style={{ display: "inline-block", position: "relative" }}
    >
      <button
        ref={buttonRef}
        type="button"
        onClick={onClick}
        disabled={disabled}
        className={className}
        style={{
          cursor: disabled ? "not-allowed" : "pointer",
          width: "100%",
          height: sizes.height,
          display: "inline-flex",
          alignItems: "center",
          justifyContent: "center",
          background: colors.bg,
          border: `1px solid ${colors.stroke}40`,
          borderRadius: "99px",
          color: "white",
          fontFamily: "var(--font-display)",
          fontSize: sizes.fontSize,
          padding: sizes.padding,
          opacity: disabled ? 0.5 : 1,
          transition:
            "background-color 0.4s ease-out, border-color 0.4s ease-out",
          position: "relative",
          zIndex: 1,
          ...style,
        }}
        onMouseEnter={(e) => {
          if (!disabled) {
            e.currentTarget.style.backgroundColor = colors.bg;
            e.currentTarget.style.borderColor = colors.stroke;
          }
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.borderColor = `${colors.stroke}40`;
        }}
      >
        <span style={{ position: "relative", zIndex: 2 }}>{children}</span>
      </button>

      {/* Lightning SVG overlay */}
      <svg
        ref={svgRef}
        aria-hidden="true"
        preserveAspectRatio="none"
        viewBox="0 0 100 50"
        style={{
          pointerEvents: "none",
          opacity: 0,
          position: "absolute",
          height: "100%",
          width: "100%",
          left: 0,
          top: 0,
          overflow: "visible",
          zIndex: 3,
        }}
      >
        <defs>
          <filter
            id={`glow-${uniqueId}`}
            x="-50"
            y="-50"
            width="200"
            height="200"
            filterUnits="userSpaceOnUse"
            colorInterpolationFilters="sRGB"
          >
            <feGaussianBlur stdDeviation="2" />
            <feComponentTransfer>
              <feFuncA type="linear" slope="2" />
            </feComponentTransfer>
            <feBlend in2="SourceGraphic" />
          </filter>
          <filter
            id={`filter-${uniqueId}`}
            x="-50"
            y="-50"
            width="200"
            height="200"
            filterUnits="userSpaceOnUse"
            colorInterpolationFilters="sRGB"
          >
            <feTurbulence
              type="fractalNoise"
              baseFrequency="0.15 0"
              numOctaves={1}
              result="warp"
            />
            <feDisplacementMap
              xChannelSelector="R"
              yChannelSelector="G"
              scale="5"
              in="SourceGraphic"
              in2="warp"
            />
          </filter>
          <filter
            id={`filter2-${uniqueId}`}
            x="-50"
            y="-50"
            width="200"
            height="200"
            filterUnits="userSpaceOnUse"
            colorInterpolationFilters="sRGB"
          >
            <feTurbulence
              type="fractalNoise"
              baseFrequency="0.2 0"
              numOctaves={1}
              result="warp"
            />
            <feDisplacementMap
              xChannelSelector="R"
              yChannelSelector="G"
              scale="10"
              in="SourceGraphic"
              in2="warp"
            />
          </filter>
          <filter
            id={`filter3-${uniqueId}`}
            x="-50"
            y="-50"
            width="200"
            height="200"
            filterUnits="userSpaceOnUse"
            colorInterpolationFilters="sRGB"
          >
            <feTurbulence
              type="fractalNoise"
              baseFrequency="0.2 0.2"
              numOctaves={1}
              result="warp"
            />
            <feDisplacementMap
              xChannelSelector="R"
              yChannelSelector="G"
              scale="5"
              in="SourceGraphic"
              in2="warp"
            />
          </filter>
          <filter
            id={`filter4-${uniqueId}`}
            x="-50"
            y="-50"
            width="200"
            height="200"
            filterUnits="userSpaceOnUse"
            colorInterpolationFilters="sRGB"
          >
            <feTurbulence
              type="fractalNoise"
              baseFrequency="0.2 0.2"
              numOctaves={1}
              result="warp"
            />
            <feDisplacementMap
              xChannelSelector="R"
              yChannelSelector="G"
              scale="5"
              in="SourceGraphic"
              in2="warp"
            />
          </filter>

          <linearGradient
            id={`grad-${uniqueId}`}
            gradientUnits="userSpaceOnUse"
          >
            <stop offset="0%" stopColor={colors.glow} />
            <stop offset="50%" stopColor="#ffffff" />
            <stop offset="100%" stopColor={colors.stroke} />
          </linearGradient>

          <linearGradient
            id={`grad2-${uniqueId}`}
            gradientUnits="userSpaceOnUse"
            gradientTransform="rotate(65)"
          >
            <stop offset="0%" stopColor={colors.glow} />
            <stop offset="50%" stopColor="#ffffff" />
            <stop offset="100%" stopColor={colors.stroke} />
          </linearGradient>
        </defs>

        <g
          ref={lightningRef}
          id={`lightning-${uniqueId}`}
          strokeWidth={1}
          filter={`url(#glow-${uniqueId})`}
          stroke={`url(#grad-${uniqueId})`}
          style={{ opacity: 0 }}
        >
          <rect
            className="strike"
            filter={`url(#filter-${uniqueId})`}
            stroke={`url(#grad-${uniqueId})`}
            x="0"
            y="0"
            width="100"
            height="50"
            rx="25"
            fill="none"
            strokeMiterlimit="10"
            strokeWidth={1.5}
          />
          <rect
            className="strike"
            filter={`url(#filter2-${uniqueId})`}
            stroke={`url(#grad2-${uniqueId})`}
            x="0"
            y="0"
            width="100"
            height="50"
            rx="25"
            fill="none"
            strokeMiterlimit="10"
            strokeWidth={2}
          />
          <rect
            className="strike"
            filter={`url(#filter3-${uniqueId})`}
            stroke={`url(#grad-${uniqueId})`}
            x="0"
            y="0"
            width="100"
            height="50"
            rx="25"
            fill="none"
            strokeMiterlimit="10"
            strokeWidth={1.5}
          />
          <rect
            className="strike"
            filter={`url(#filter2-${uniqueId})`}
            stroke={`url(#grad-${uniqueId})`}
            x="0"
            y="0"
            width="100"
            height="50"
            rx="25"
            fill="none"
            strokeMiterlimit="10"
            strokeWidth={1}
          />
          <rect
            className="strike"
            filter={`url(#filter4-${uniqueId})`}
            stroke={`url(#grad-${uniqueId})`}
            x="0"
            y="0"
            width="100"
            height="50"
            rx="25"
            fill="none"
            strokeMiterlimit="10"
            strokeWidth={1.5}
          />
        </g>
      </svg>
    </div>
  );
};
