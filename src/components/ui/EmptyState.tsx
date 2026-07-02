import React from "react";

interface EmptyStateProps {
  icon?: string;
  title: string;
  description?: string;
  action?: React.ReactNode;
}

export const EmptyState: React.FC<EmptyStateProps> = ({
  icon,
  title,
  description,
  action,
}) => {
  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        textAlign: "center",
        gap: "14px",
        padding: "48px 32px",
        background: "var(--bg-glass)",
        border: "1px solid var(--border-glass)",
        borderRadius: "var(--radius-lg)",
        boxShadow: "var(--shadow-md)",
        backdropFilter: "blur(16px)",
        WebkitBackdropFilter: "blur(16px)",
      }}
    >
      {icon && (
        <div
          style={{
            fontSize: "40px",
            lineHeight: 1,
            opacity: 0.7,
          }}
          aria-hidden
        >
          {icon}
        </div>
      )}
      <h3
        style={{
          margin: 0,
          fontFamily: "var(--font-display)",
          fontSize: "22px",
          fontWeight: 400,
          color: "var(--text-secondary)",
          letterSpacing: "0.01em",
        }}
      >
        {title}
      </h3>
      {description && (
        <p
          style={{
            margin: 0,
            maxWidth: "360px",
            fontFamily: "var(--font-body)",
            fontSize: "14px",
            lineHeight: 1.5,
            color: "var(--text-muted)",
          }}
        >
          {description}
        </p>
      )}
      {action && <div style={{ marginTop: "6px" }}>{action}</div>}
    </div>
  );
};
