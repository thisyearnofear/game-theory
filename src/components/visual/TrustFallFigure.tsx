/**
 * TrustFallFigure — Animated SVG scene depicting the trust fall metaphor.
 *
 * The CENTRAL visual element of the Trustfall project. A stick figure stands
 * on a cliff edge while a second figure waits below to catch. State transitions
 * are driven by GSAP; the "standing" sway is a CSS keyframe animation.
 *
 * States:
 *   standing  — figure sways gently on the cliff edge
 *   falling   — figure tilts and falls toward the catcher
 *   caught    — figure lands safely, both figures glow green
 *   betrayed  — catcher steps aside, figure falls past and hits the ground
 */

import { useEffect, useRef } from "react";
import gsap from "gsap";

export type TrustFallState = "standing" | "falling" | "caught" | "betrayed";

interface TrustFallFigureProps {
  state: TrustFallState;
  size?: number;
}

const TrustFallFigure: React.FC<TrustFallFigureProps> = ({
  state,
  size = 200,
}) => {
  const svgRef = useRef<SVGSVGElement | null>(null);
  const fallerRef = useRef<SVGGElement | null>(null);
  const catcherRef = useRef<SVGGElement | null>(null);
  const glowRef = useRef<SVGCircleElement | null>(null);
  const impactRef = useRef<SVGGElement | null>(null);

  // Reset to a neutral standing pose before applying any state transition.
  const resetPose = () => {
    gsap.set(fallerRef.current, {
      x: 0,
      y: 0,
      rotation: 0,
      transformOrigin: "60px 150px",
      opacity: 1,
    });
    gsap.set(catcherRef.current, {
      x: 0,
      y: 0,
      opacity: 1,
      filter: "none",
    });
    gsap.set(glowRef.current, { opacity: 0 });
    gsap.set(impactRef.current, {
      opacity: 0,
      scale: 0.4,
      transformOrigin: "100px 270px",
    });
  };

  useEffect(() => {
    if (!svgRef.current) return;
    const tl = gsap.timeline();
    resetPose();

    if (state === "standing") {
      // Sway is handled by CSS animation on the group; just ensure neutral pose.
      return;
    }

    if (state === "falling") {
      tl.to(fallerRef.current, {
        rotation: -25,
        duration: 0.3,
        ease: "power2.in",
        transformOrigin: "60px 150px",
      }).to(
        fallerRef.current,
        {
          y: 90,
          rotation: -55,
          duration: 0.7,
          ease: "power2.in",
          transformOrigin: "60px 150px",
        },
        0.3,
      );
    }

    if (state === "caught") {
      tl.to(fallerRef.current, {
        y: 80,
        rotation: -45,
        duration: 0.6,
        ease: "power2.in",
        transformOrigin: "60px 150px",
      })
        .to(
          [fallerRef.current, catcherRef.current],
          {
            scale: 1.08,
            duration: 0.25,
            ease: "back.out(3)",
            transformOrigin: "60px 200px",
          },
          0.6,
        )
        .to(
          [fallerRef.current, catcherRef.current],
          { scale: 1, duration: 0.3, ease: "power2.out" },
          0.85,
        )
        .to(
          glowRef.current,
          { opacity: 0.6, duration: 0.4, ease: "power2.out" },
          0.6,
        );
    }

    if (state === "betrayed") {
      tl.to(catcherRef.current, {
        x: 35,
        duration: 0.4,
        ease: "power2.inOut",
      })
        .to(
          fallerRef.current,
          {
            y: 120,
            rotation: -70,
            duration: 0.8,
            ease: "power2.in",
            transformOrigin: "60px 150px",
          },
          0,
        )
        .to(
          impactRef.current,
          { opacity: 1, scale: 1, duration: 0.3, ease: "power2.out" },
          0.8,
        )
        .to(
          impactRef.current,
          { opacity: 0, duration: 0.5, ease: "power2.out" },
          1.1,
        );
    }

    return () => {
      tl.kill();
    };
  }, [state]);

  return (
    <svg
      ref={svgRef}
      width={size}
      height={size * 1.5}
      viewBox="0 0 200 300"
      style={{ display: "block", overflow: "visible" }}
    >
      <defs>
        <radialGradient id="trustfall-caught-glow" cx="50%" cy="50%" r="50%">
          <stop
            offset="0%"
            stopColor="var(--accent-cooperate)"
            stopOpacity="0.55"
          />
          <stop
            offset="100%"
            stopColor="var(--accent-cooperate)"
            stopOpacity="0"
          />
        </radialGradient>
        <radialGradient id="trustfall-impact-glow" cx="50%" cy="50%" r="50%">
          <stop
            offset="0%"
            stopColor="var(--accent-defect)"
            stopOpacity="0.7"
          />
          <stop
            offset="100%"
            stopColor="var(--accent-defect)"
            stopOpacity="0"
          />
        </radialGradient>
        <style>{`
          @keyframes trustfall-sway {
            0%, 100% { transform: rotate(0deg); }
            50% { transform: rotate(2.5deg); }
          }
          .trustfall-sway {
            animation: trustfall-sway 3s ease-in-out infinite;
            transform-origin: 60px 150px;
          }
        `}</style>
      </defs>

      {/* Cliff edge — left side, simple geometric shape */}
      <path
        d="M 0 150 L 80 150 L 80 300 L 0 300 Z"
        fill="var(--bg-glass-light)"
        stroke="var(--border-glass)"
        strokeWidth="1.5"
      />
      <line
        x1="0"
        y1="150"
        x2="80"
        y2="150"
        stroke="var(--border-glass)"
        strokeWidth="2"
      />

      {/* Ground line */}
      <line
        x1="0"
        y1="275"
        x2="200"
        y2="275"
        stroke="var(--border-glass)"
        strokeWidth="1"
        strokeDasharray="4 4"
        opacity="0.5"
      />

      {/* Caught glow */}
      <circle
        ref={glowRef}
        cx="100"
        cy="235"
        r="55"
        fill="url(#trustfall-caught-glow)"
        opacity="0"
      />

      {/* Impact burst (betrayed) */}
      <g ref={impactRef} opacity="0">
        <circle cx="100" cy="270" r="30" fill="url(#trustfall-impact-glow)" />
        <line
          x1="100"
          y1="270"
          x2="100"
          y2="250"
          stroke="var(--accent-defect)"
          strokeWidth="2"
        />
        <line
          x1="100"
          y1="270"
          x2="120"
          y2="270"
          stroke="var(--accent-defect)"
          strokeWidth="2"
        />
        <line
          x1="100"
          y1="270"
          x2="80"
          y2="270"
          stroke="var(--accent-defect)"
          strokeWidth="2"
        />
        <line
          x1="100"
          y1="270"
          x2="115"
          y2="255"
          stroke="var(--accent-defect)"
          strokeWidth="2"
        />
        <line
          x1="100"
          y1="270"
          x2="85"
          y2="255"
          stroke="var(--accent-defect)"
          strokeWidth="2"
        />
      </g>

      {/* Faller — stick figure standing on cliff */}
      <g
        ref={fallerRef}
        className={state === "standing" ? "trustfall-sway" : undefined}
      >
        {/* head */}
        <circle
          cx="60"
          cy="120"
          r="9"
          fill="none"
          stroke="var(--text-primary)"
          strokeWidth="2.5"
        />
        {/* body */}
        <line
          x1="60"
          y1="129"
          x2="60"
          y2="150"
          stroke="var(--text-primary)"
          strokeWidth="2.5"
        />
        {/* arms — crossed for trust fall pose */}
        <line
          x1="60"
          y1="135"
          x2="50"
          y2="142"
          stroke="var(--text-primary)"
          strokeWidth="2.5"
        />
        <line
          x1="60"
          y1="135"
          x2="70"
          y2="142"
          stroke="var(--text-primary)"
          strokeWidth="2.5"
        />
        {/* legs */}
        <line
          x1="60"
          y1="150"
          x2="54"
          y2="160"
          stroke="var(--text-primary)"
          strokeWidth="2.5"
        />
        <line
          x1="60"
          y1="150"
          x2="66"
          y2="160"
          stroke="var(--text-primary)"
          strokeWidth="2.5"
        />
      </g>

      {/* Catcher — stick figure below, arms raised */}
      <g ref={catcherRef}>
        {/* head */}
        <circle
          cx="100"
          cy="225"
          r="9"
          fill="none"
          stroke="var(--text-primary)"
          strokeWidth="2.5"
        />
        {/* body */}
        <line
          x1="100"
          y1="234"
          x2="100"
          y2="255"
          stroke="var(--text-primary)"
          strokeWidth="2.5"
        />
        {/* arms — raised to catch */}
        <line
          x1="100"
          y1="240"
          x2="85"
          y2="220"
          stroke="var(--text-primary)"
          strokeWidth="2.5"
        />
        <line
          x1="100"
          y1="240"
          x2="115"
          y2="220"
          stroke="var(--text-primary)"
          strokeWidth="2.5"
        />
        {/* legs */}
        <line
          x1="100"
          y1="255"
          x2="93"
          y2="270"
          stroke="var(--text-primary)"
          strokeWidth="2.5"
        />
        <line
          x1="100"
          y1="255"
          x2="107"
          y2="270"
          stroke="var(--text-primary)"
          strokeWidth="2.5"
        />
      </g>
    </svg>
  );
};

export default TrustFallFigure;
