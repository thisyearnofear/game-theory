import React from "react";

interface LoadingSpinnerProps {
  label?: string;
  size?: "sm" | "md" | "lg";
}

const sizeMap: Record<NonNullable<LoadingSpinnerProps["size"]>, number> = {
  sm: 24,
  md: 40,
  lg: 64,
};

const labelSizeMap: Record<NonNullable<LoadingSpinnerProps["size"]>, string> = {
  sm: "12px",
  md: "14px",
  lg: "16px",
};

export const LoadingSpinner: React.FC<LoadingSpinnerProps> = ({
  label,
  size = "md",
}) => {
  const spinnerSize = sizeMap[size];

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        gap: size === "lg" ? "20px" : "14px",
        padding: size === "lg" ? "40px" : "28px",
        background: "var(--bg-glass)",
        border: "1px solid var(--border-glass)",
        borderRadius: "var(--radius-lg)",
        boxShadow: "var(--shadow-md)",
        backdropFilter: "blur(16px)",
        WebkitBackdropFilter: "blur(16px)",
      }}
    >
      <div
        style={{
          width: `${spinnerSize}px`,
          height: `${spinnerSize}px`,
          borderRadius: "50%",
          border: `${Math.max(2, spinnerSize / 16)}px solid var(--bg-glass-light)`,
          borderTopColor: "var(--accent-violet)",
          borderRightColor: "var(--accent-violet)",
          animation: "tf-spin 0.8s linear infinite",
        }}
      />
      {label && (
        <span
          style={{
            fontFamily: "var(--font-body)",
            fontSize: labelSizeMap[size],
            color: "var(--text-secondary)",
            letterSpacing: "0.02em",
          }}
        >
          {label}
        </span>
      )}
      <style>{`
        @keyframes tf-spin {
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
};
