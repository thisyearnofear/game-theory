/**
 * ShimmerButton — glassmorphic button with a light sweep shimmer on hover.
 *
 * A more subtle effect for secondary actions. The shimmer is a diagonal
 * light gradient that sweeps across the button on hover. Also includes
 * a subtle magnetic attraction.
 */

import React from "react";
import { useMagnetic } from "../../hooks/useMagnetic";

interface ShimmerButtonProps {
  children: React.ReactNode;
  onClick?: () => void;
  disabled?: boolean;
  size?: "sm" | "md" | "lg";
  className?: string;
  style?: React.CSSProperties;
}

const SIZE_MAP = {
  sm: { padding: "8px 18px", fontSize: "0.875rem" },
  md: { padding: "10px 24px", fontSize: "1rem" },
  lg: { padding: "14px 36px", fontSize: "1.125rem" },
};

export const ShimmerButton: React.FC<ShimmerButtonProps> = ({
  children,
  onClick,
  disabled = false,
  size = "md",
  className,
  style,
}) => {
  const magneticRef = useMagnetic<HTMLDivElement>({
    strength: 0.15,
    radius: 80,
  });
  const sizes = SIZE_MAP[size];

  return (
    <div
      ref={magneticRef}
      style={{ display: "inline-block", position: "relative" }}
    >
      <button
        type="button"
        onClick={onClick}
        disabled={disabled}
        className={`shimmer-btn ${className || ""}`}
        style={{
          cursor: disabled ? "not-allowed" : "pointer",
          display: "inline-flex",
          alignItems: "center",
          justifyContent: "center",
          background: "var(--bg-glass-light)",
          backdropFilter: "blur(16px)",
          border: "1px solid var(--border-glass)",
          borderRadius: "99px",
          color: "var(--text-secondary)",
          fontFamily: "var(--font-body)",
          fontSize: sizes.fontSize,
          fontWeight: 500,
          padding: sizes.padding,
          opacity: disabled ? 0.5 : 1,
          transition:
            "border-color 0.4s var(--ease-out), color 0.4s var(--ease-out)",
          position: "relative",
          overflow: "hidden",
          ...style,
        }}
        onMouseEnter={(e) => {
          if (!disabled) {
            e.currentTarget.style.borderColor = "rgba(102,126,234,0.4)";
            e.currentTarget.style.color = "var(--text-primary)";
          }
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.borderColor = "var(--border-glass)";
          e.currentTarget.style.color = "var(--text-secondary)";
        }}
      >
        {/* Shimmer sweep */}
        <span
          className="shimmer-sweep"
          style={{
            position: "absolute",
            top: 0,
            left: "-100%",
            width: "60%",
            height: "100%",
            background:
              "linear-gradient(105deg, transparent 0%, rgba(255,255,255,0.08) 40%, rgba(255,255,255,0.15) 50%, rgba(255,255,255,0.08) 60%, transparent 100%)",
            pointerEvents: "none",
            transition: "left 0.6s var(--ease-out)",
          }}
        />
        <span style={{ position: "relative", zIndex: 1 }}>{children}</span>
      </button>
    </div>
  );
};
