import React, { useState } from "react";
import { type PayoffMatrix, PAYOFF_PRESETS } from "../../util/strategies";

interface PayoffMatrixEditorProps {
  payoffs: PayoffMatrix;
  onChange: (payoffs: PayoffMatrix) => void;
  compact?: boolean;
}

/**
 * Interactive payoff matrix editor with preset scenarios.
 * Lets users tweak P/S/R/T values and see how it changes the game.
 */
export const PayoffMatrixEditor: React.FC<PayoffMatrixEditorProps> = ({
  payoffs,
  onChange,
  compact = false,
}) => {
  const [selectedPreset, setSelectedPreset] = useState<string>("classic");

  const applyPreset = (presetId: string) => {
    const preset = PAYOFF_PRESETS.find((p) => p.id === presetId);
    if (preset) {
      onChange({ ...preset.matrix });
      setSelectedPreset(presetId);
    }
  };

  const updateValue = (key: keyof PayoffMatrix, value: number) => {
    onChange({ ...payoffs, [key]: value });
    setSelectedPreset("custom");
  };

  // Check if current payoffs match a known dilemma type
  const dilemmaType = (() => {
    const { T, R, P, S } = payoffs;
    if (T > R && R > P && P > S && 2 * R > T + S)
      return { name: "Prisoner's Dilemma", color: "#667eea" };
    if (R > T && R > S && R > P)
      return { name: "Harmony Game", color: "#4CAF50" };
    if (R > T && T > P && P > S) return { name: "Stag Hunt", color: "#FF9800" };
    if (T > R && R > S && S > P)
      return { name: "Snowdrift / Chicken", color: "#F44336" };
    return { name: "Custom", color: "var(--text-muted)" };
  })();

  const cellStyle: React.CSSProperties = {
    padding: compact ? "6px" : "10px",
    borderRadius: "6px",
    textAlign: "center",
    fontFamily: "var(--font-body)",
    fontSize: compact ? "0.75rem" : "0.85rem",
  };

  const inputStyle: React.CSSProperties = {
    width: "40px",
    padding: "2px 4px",
    textAlign: "center",
    border: "1px solid rgba(255,255,255,0.2)",
    borderRadius: "4px",
    background: "rgba(255,255,255,0.05)",
    color: "rgba(20, 26, 46, 0.55)",
    fontFamily: "var(--font-body)",
    fontSize: "0.85rem",
  };

  return (
    <div
      style={{
        background: "rgba(255,255,255,0.05)",
        borderRadius: "12px",
        padding: compact ? "12px" : "16px",
        border: "1px solid rgba(255,255,255,0.08)",
      }}
    >
      <p
        style={{
          fontFamily: "var(--font-body)",
          color: "rgba(20, 26, 46, 0.35)",
          margin: "0 0 10px 0",
          fontSize: "0.85rem",
          textAlign: "left",
        }}
      >
        🎛️ Payoff Matrix
      </p>

      {/* Preset selector */}
      <div
        style={{
          display: "flex",
          gap: "6px",
          flexWrap: "wrap",
          marginBottom: "12px",
        }}
      >
        {PAYOFF_PRESETS.map((preset) => (
          <button
            key={preset.id}
            type="button"
            onClick={() => applyPreset(preset.id)}
            style={{
              padding: "4px 10px",
              borderRadius: "6px",
              border:
                selectedPreset === preset.id
                  ? "1px solid #667eea"
                  : "1px solid rgba(255,255,255,0.15)",
              background:
                selectedPreset === preset.id
                  ? "rgba(102, 126, 234, 0.2)"
                  : "transparent",
              color: "rgba(20, 26, 46, 0.35)",
              fontFamily: "var(--font-body)",
              fontSize: "0.75rem",
              cursor: "pointer",
              transition: "all 0.2s",
            }}
            title={preset.description}
          >
            {preset.name}
          </button>
        ))}
      </div>

      {/* Matrix grid */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "auto 1fr 1fr",
          gap: "4px",
          marginBottom: "10px",
          maxWidth: "280px",
          margin: "0 auto 10px",
        }}
      >
        {/* Empty corner */}
        <div style={cellStyle} />
        {/* Column headers */}
        <div
          style={{
            ...cellStyle,
            color: "rgba(255,255,255,0.5)",
            fontSize: "0.75rem",
          }}
        >
          🤝 Cooperate
        </div>
        <div
          style={{
            ...cellStyle,
            color: "rgba(255,255,255,0.5)",
            fontSize: "0.75rem",
          }}
        >
          ⚔️ Defect
        </div>

        {/* Row: You Cooperate */}
        <div
          style={{
            ...cellStyle,
            color: "rgba(255,255,255,0.5)",
            fontSize: "0.75rem",
            textAlign: "right",
          }}
        >
          🤝
        </div>
        {/* R,R cell */}
        <div
          style={{
            ...cellStyle,
            background: "rgba(76, 175, 80, 0.1)",
            border: "1px solid rgba(76, 175, 80, 0.2)",
          }}
        >
          <input
            type="number"
            value={payoffs.R}
            onChange={(e) => updateValue("R", parseFloat(e.target.value) || 0)}
            style={inputStyle}
          />
          <div
            style={{ color: "#4CAF50", fontSize: "0.7rem", marginTop: "2px" }}
          >
            Reward
          </div>
        </div>
        {/* S,T cell */}
        <div
          style={{
            ...cellStyle,
            background: "rgba(244, 67, 54, 0.08)",
            border: "1px solid rgba(244, 67, 54, 0.15)",
          }}
        >
          <div
            style={{ display: "flex", gap: "4px", justifyContent: "center" }}
          >
            <input
              type="number"
              value={payoffs.S}
              onChange={(e) =>
                updateValue("S", parseFloat(e.target.value) || 0)
              }
              style={inputStyle}
            />
            <input
              type="number"
              value={payoffs.T}
              onChange={(e) =>
                updateValue("T", parseFloat(e.target.value) || 0)
              }
              style={inputStyle}
            />
          </div>
          <div
            style={{ color: "#F44336", fontSize: "0.7rem", marginTop: "2px" }}
          >
            Sucker / Tempt
          </div>
        </div>

        {/* Row: You Defect */}
        <div
          style={{
            ...cellStyle,
            color: "rgba(255,255,255,0.5)",
            fontSize: "0.75rem",
            textAlign: "right",
          }}
        >
          ⚔️
        </div>
        {/* T,S cell */}
        <div
          style={{
            ...cellStyle,
            background: "rgba(244, 67, 54, 0.08)",
            border: "1px solid rgba(244, 67, 54, 0.15)",
          }}
        >
          <div
            style={{ display: "flex", gap: "4px", justifyContent: "center" }}
          >
            <input
              type="number"
              value={payoffs.T}
              onChange={(e) =>
                updateValue("T", parseFloat(e.target.value) || 0)
              }
              style={inputStyle}
            />
            <input
              type="number"
              value={payoffs.S}
              onChange={(e) =>
                updateValue("S", parseFloat(e.target.value) || 0)
              }
              style={inputStyle}
            />
          </div>
          <div
            style={{ color: "#F44336", fontSize: "0.7rem", marginTop: "2px" }}
          >
            Tempt / Sucker
          </div>
        </div>
        {/* P,P cell */}
        <div
          style={{
            ...cellStyle,
            background: "rgba(100, 100, 100, 0.1)",
            border: "1px solid rgba(100, 100, 100, 0.2)",
          }}
        >
          <input
            type="number"
            value={payoffs.P}
            onChange={(e) => updateValue("P", parseFloat(e.target.value) || 0)}
            style={inputStyle}
          />
          <div
            style={{
              color: "var(--text-muted)",
              fontSize: "0.7rem",
              marginTop: "2px",
            }}
          >
            Punishment
          </div>
        </div>
      </div>

      {/* Dilemma type indicator */}
      <div style={{ textAlign: "center" }}>
        <p
          style={{
            fontFamily: "var(--font-body)",
            color: dilemmaType.color,
            margin: 0,
            fontSize: "0.8rem",
            fontWeight: "bold",
          }}
        >
          {dilemmaType.name}
        </p>
        {!compact && (
          <p
            style={{
              fontFamily: "var(--font-body)",
              color: "rgba(255,255,255,0.4)",
              margin: "4px 0 0 0",
              fontSize: "0.72rem",
              fontStyle: "italic",
            }}
          >
            T={payoffs.T} R={payoffs.R} P={payoffs.P} S={payoffs.S}
            {2 * payoffs.R > payoffs.T + payoffs.S
              ? " · 2R > T+S ✓"
              : " · 2R ≤ T+S ⚠️"}
          </p>
        )}
      </div>
    </div>
  );
};
