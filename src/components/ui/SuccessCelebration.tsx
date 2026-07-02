import React, { useEffect, useRef } from "react";
import gsap from "gsap";

interface SuccessCelebrationProps {
  title: string;
  message?: string;
  icon?: string;
  onDismiss?: () => void;
}

const PARTICLE_COUNT = 14;
const PARTICLE_COLORS = [
  "var(--accent-violet)",
  "var(--accent-warm)",
  "var(--accent-cooperate)",
  "#ffffff",
];

export const SuccessCelebration: React.FC<SuccessCelebrationProps> = ({
  title,
  message,
  icon = "\u2728",
  onDismiss,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const particlesRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const ctx = gsap.context(() => {
      const tl = gsap.timeline();

      if (panelRef.current) {
        tl.fromTo(
          panelRef.current,
          { scale: 0.6, opacity: 0, y: 20 },
          {
            scale: 1,
            opacity: 1,
            y: 0,
            duration: 0.5,
            ease: "back.out(1.7)",
          },
        );
      }

      if (particlesRef.current) {
        const particles = particlesRef.current.children;
        Array.from(particles).forEach((p, i) => {
          const angle = (i / PARTICLE_COUNT) * Math.PI * 2;
          const distance = 80 + Math.random() * 60;
          const dx = Math.cos(angle) * distance;
          const dy = Math.sin(angle) * distance;
          tl.fromTo(
            p,
            { x: 0, y: 0, scale: 0, opacity: 1 },
            {
              x: dx,
              y: dy,
              scale: 1,
              opacity: 0,
              duration: 0.9,
              ease: "power2.out",
            },
            "-=0.2",
          );
        });
      }
    }, containerRef);

    const timer = window.setTimeout(() => {
      if (panelRef.current) {
        gsap.to(panelRef.current, {
          scale: 0.9,
          opacity: 0,
          duration: 0.3,
          ease: "power2.in",
          onComplete: () => {
            onDismiss?.();
          },
        });
      } else {
        onDismiss?.();
      }
    }, 3000);

    return () => {
      window.clearTimeout(timer);
      ctx.revert();
    };
  }, [onDismiss]);

  return (
    <div
      ref={containerRef}
      style={{
        position: "fixed",
        inset: 0,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 1000,
        pointerEvents: "none",
      }}
    >
      <div style={{ position: "relative" }}>
        <div
          ref={particlesRef}
          style={{
            position: "absolute",
            top: "50%",
            left: "50%",
            width: 0,
            height: 0,
            pointerEvents: "none",
          }}
          aria-hidden
        >
          {Array.from({ length: PARTICLE_COUNT }).map((_, i) => (
            <span
              key={i}
              style={{
                position: "absolute",
                width: "8px",
                height: "8px",
                borderRadius: "50%",
                background: PARTICLE_COLORS[i % PARTICLE_COLORS.length],
                transform: "translate(-50%, -50%)",
              }}
            />
          ))}
        </div>

        <div
          ref={panelRef}
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            textAlign: "center",
            gap: "12px",
            padding: "36px 44px",
            background: "var(--bg-glass)",
            border: "1px solid var(--border-glass)",
            borderRadius: "var(--radius-lg)",
            boxShadow: "var(--shadow-md)",
            backdropFilter: "blur(16px)",
            WebkitBackdropFilter: "blur(16px)",
            minWidth: "280px",
          }}
        >
          <div style={{ fontSize: "44px", lineHeight: 1 }} aria-hidden>
            {icon}
          </div>
          <h3
            style={{
              margin: 0,
              fontFamily: "var(--font-display)",
              fontSize: "26px",
              fontWeight: 400,
              color: "var(--text-primary)",
              letterSpacing: "0.01em",
            }}
          >
            {title}
          </h3>
          {message && (
            <p
              style={{
                margin: 0,
                maxWidth: "320px",
                fontFamily: "var(--font-body)",
                fontSize: "14px",
                lineHeight: 1.5,
                color: "var(--text-secondary)",
              }}
            >
              {message}
            </p>
          )}
        </div>
      </div>
    </div>
  );
};
