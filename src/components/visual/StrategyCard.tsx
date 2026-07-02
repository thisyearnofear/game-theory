/**
 * StrategyCard — A glass-panel card representing a strategy personality.
 *
 * Shows a large emoji, the strategy name in Instrument Serif, and a muted
 * description. A colored left border identifies the strategy. Hover lifts the
 * card; selection adds a glowing colored border. Exposes a `data-animate`
 * attribute for GSAP staggered reveals.
 */

import { CSSProperties, useCallback } from "react";
import { useTiltInteraction } from "../../hooks/useSlideAnimation";

interface StrategyCardProps {
  id: string;
  name: string;
  description: string;
  emoji: string;
  color: string;
  selected?: boolean;
  onClick?: () => void;
  compact?: boolean;
}

const StrategyCard: React.FC<StrategyCardProps> = ({
  id,
  name,
  description,
  emoji,
  color,
  selected = false,
  onClick,
  compact = false,
}) => {
  const isInteractive = typeof onClick === "function";

  const tiltRef = useTiltInteraction<HTMLDivElement>(8);

  const handleSpotlightMove = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      const el = e.currentTarget;
      const rect = el.getBoundingClientRect();
      const x = ((e.clientX - rect.left) / rect.width) * 100;
      const y = ((e.clientY - rect.top) / rect.height) * 100;
      el.style.setProperty("--mouse-x", `${x}%`);
      el.style.setProperty("--mouse-y", `${y}%`);
    },
    [],
  );

  const cardStyle: CSSProperties = {
    position: "relative",
    background: "var(--bg-glass)",
    border: `1px solid ${selected ? color : "var(--border-glass)"}`,
    borderLeft: `4px solid ${color}`,
    borderRadius: "16px",
    padding: compact ? "16px 18px" : "24px 26px",
    cursor: isInteractive ? "pointer" : "default",
    backdropFilter: "blur(12px)",
    WebkitBackdropFilter: "blur(12px)",
    transition:
      "transform 220ms ease, box-shadow 220ms ease, border-color 220ms ease",
    boxShadow: selected
      ? `0 0 0 1px ${color}, 0 0 32px ${color}55, var(--shadow-md)`
      : "var(--shadow-md)",
    overflow: "hidden",
  };

  const emojiStyle: CSSProperties = {
    fontSize: compact ? "2rem" : "2.75rem",
    lineHeight: 1,
    marginBottom: compact ? 8 : 12,
    display: "block",
  };

  const nameStyle: CSSProperties = {
    fontFamily: "var(--font-display)",
    fontSize: compact ? "1.25rem" : "1.5rem",
    color: "var(--text-primary)",
    margin: 0,
    marginBottom: 6,
    fontWeight: 400,
  };

  const descriptionStyle: CSSProperties = {
    fontFamily: "var(--font-body)",
    fontSize: compact ? "0.8rem" : "0.875rem",
    color: "var(--text-secondary)",
    margin: 0,
    lineHeight: 1.5,
  };

  const handleMouseEnter = (e: React.MouseEvent<HTMLDivElement>) => {
    if (isInteractive) {
      e.currentTarget.style.transform = "translateY(-4px)";
    }
  };

  const handleMouseLeave = (e: React.MouseEvent<HTMLDivElement>) => {
    e.currentTarget.style.transform = "translateY(0)";
  };

  const spotlightStyle: CSSProperties = {
    position: "absolute",
    inset: 0,
    pointerEvents: "none",
    background:
      "radial-gradient(circle at var(--mouse-x) var(--mouse-y), rgba(102,126,234,0.15), transparent 40%)",
    zIndex: 1,
  };

  return (
    <div style={{ perspective: "800px" }}>
      <div
        ref={tiltRef}
        className="strategy-card"
        data-animate="strategy-card"
        data-strategy-id={id}
        style={cardStyle}
        onClick={onClick}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
        onMouseMove={handleSpotlightMove}
        role={isInteractive ? "button" : undefined}
        tabIndex={isInteractive ? 0 : undefined}
        onKeyDown={(e) => {
          if (isInteractive && (e.key === "Enter" || e.key === " ")) {
            e.preventDefault();
            onClick?.();
          }
        }}
      >
        <span style={emojiStyle}>{emoji}</span>
        <h3 style={nameStyle}>{name}</h3>
        {!compact && <p style={descriptionStyle}>{description}</p>}
        <div style={spotlightStyle} aria-hidden="true" />
      </div>
    </div>
  );
};

export default StrategyCard;
