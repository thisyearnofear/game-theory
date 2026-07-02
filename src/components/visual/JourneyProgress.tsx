/**
 * JourneyProgress — A visual progress path through the narrative.
 *
 * Renders a horizontal path of dots representing steps. Completed steps are
 * filled violet with a checkmark; the current step pulses with a warm glow;
 * future steps are muted. A connecting line links the dots. Labels sit below
 * each dot in Instrument Serif. Dots are clickable when `onStepClick` is given.
 */

import { CSSProperties } from "react";

interface JourneyStep {
  id: string;
  label: string;
  icon: string;
}

interface JourneyProgressProps {
  steps: JourneyStep[];
  currentStep: number;
  onStepClick?: (index: number) => void;
}

const JourneyProgress: React.FC<JourneyProgressProps> = ({
  steps,
  currentStep,
  onStepClick,
}) => {
  const clickable = typeof onStepClick === "function";

  const containerStyle: CSSProperties = {
    width: "100%",
    padding: "8px 0",
  };

  const pathStyle: CSSProperties = {
    position: "relative",
    display: "flex",
    justifyContent: "space-between",
    alignItems: "flex-start",
    padding: "0 20px",
  };

  const lineBase: CSSProperties = {
    position: "absolute",
    top: 18,
    left: 32,
    right: 32,
    height: 2,
    background: "var(--border-glass)",
    zIndex: 0,
  };

  // Progress fill for completed portion of the line.
  const progressPct =
    steps.length > 1
      ? (Math.min(currentStep, steps.length - 1) / (steps.length - 1)) * 100
      : 0;
  const lineFillStyle: CSSProperties = {
    position: "absolute",
    top: 18,
    left: 32,
    width: `calc((100% - 64px) * ${progressPct / 100})`,
    height: 2,
    background: "var(--accent-violet)",
    zIndex: 1,
    transition: "width 400ms ease",
  };

  const stepWrapperStyle: CSSProperties = {
    position: "relative",
    zIndex: 2,
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    flex: 1,
  };

  const dotBase: CSSProperties = {
    width: 36,
    height: 36,
    borderRadius: "50%",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontSize: "1rem",
    border: "2px solid var(--border-glass)",
    background: "var(--bg-glass)",
    transition: "all 220ms ease",
    marginBottom: 10,
  };

  const labelStyle: CSSProperties = {
    fontFamily: "var(--font-display)",
    fontSize: "0.85rem",
    color: "var(--text-secondary)",
    textAlign: "center",
    margin: 0,
    maxWidth: 90,
    lineHeight: 1.2,
  };

  const pulseKeyframes = `
    @keyframes journey-pulse {
      0%, 100% { box-shadow: 0 0 0 0 rgba(240, 160, 32, 0.5); }
      50% { box-shadow: 0 0 0 10px rgba(240, 160, 32, 0); }
    }
  `;

  return (
    <div style={containerStyle}>
      <style>{pulseKeyframes}</style>
      <div style={pathStyle}>
        <div style={lineBase} />
        <div style={lineFillStyle} />
        {steps.map((step, index) => {
          const isCompleted = index < currentStep;
          const isCurrent = index === currentStep;
          const isFuture = index > currentStep;

          let dotStyle: CSSProperties = { ...dotBase };
          if (isCompleted) {
            dotStyle = {
              ...dotStyle,
              background: "var(--accent-violet)",
              borderColor: "var(--accent-violet)",
              color: "#fff",
            };
          } else if (isCurrent) {
            dotStyle = {
              ...dotStyle,
              background: "var(--bg-glass)",
              borderColor: "var(--accent-warm)",
              color: "var(--accent-warm)",
              animation: "journey-pulse 2s ease-in-out infinite",
            };
          } else {
            dotStyle = {
              ...dotStyle,
              color: "var(--text-muted)",
            };
          }

          const stepLabelStyle: CSSProperties = {
            ...labelStyle,
            color: isFuture ? "var(--text-muted)" : "var(--text-secondary)",
          };

          const clickableHere = clickable && (isCompleted || isCurrent);

          return (
            <div
              key={step.id}
              style={{
                ...stepWrapperStyle,
                cursor: clickableHere ? "pointer" : "default",
              }}
              onClick={() => {
                if (clickableHere && onStepClick) onStepClick(index);
              }}
              role={clickableHere ? "button" : undefined}
              tabIndex={clickableHere ? 0 : undefined}
              onKeyDown={(e) => {
                if (clickableHere && (e.key === "Enter" || e.key === " ")) {
                  e.preventDefault();
                  onStepClick?.(index);
                }
              }}
            >
              <div style={dotStyle}>
                {isCompleted ? (
                  <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                    <path
                      d="M3 8.5 L6.5 12 L13 4.5"
                      stroke="#fff"
                      strokeWidth="2.2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                ) : (
                  <span>{step.icon}</span>
                )}
              </div>
              <p style={stepLabelStyle}>{step.label}</p>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default JourneyProgress;
