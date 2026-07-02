/**
 * StatsDisplay — glassmorphic panel showing persistent Trustfall stats.
 *
 * Renders above the game list in the lobby. Shows total games, W/L/T record,
 * net XLM, and cooperation rate. Falls back to an encouraging empty state
 * when no games have been played yet.
 */

import React from "react";
import { Text } from "@stellar/design-system";
import { useGameStats, type GameStats } from "../../hooks/useGameStats";

interface StatsDisplayProps {
  /** Optional override (e.g. for testing). Defaults to live localStorage. */
  stats?: GameStats;
}

const formatXLM = (xlm: number): string => {
  const sign = xlm > 0 ? "+" : xlm < 0 ? "" : "";
  return `${sign}${xlm.toFixed(2)} XLM`;
};

const StatTile: React.FC<{
  label: string;
  value: string;
  accent?: string;
}> = ({ label, value, accent }) => (
  <div
    style={{
      textAlign: "center",
      padding: "12px 8px",
      borderRadius: "var(--radius-sm)",
      background: "rgba(255,255,255,0.04)",
      border: "1px solid rgba(255,255,255,0.06)",
    }}
  >
    <div
      style={{
        fontFamily: "var(--font-display)",
        fontSize: "var(--text-xl)",
        color: accent || "var(--text-primary)",
        lineHeight: 1.1,
      }}
    >
      {value}
    </div>
    <div
      style={{
        fontFamily: "var(--font-body)",
        fontSize: "var(--text-xs)",
        color: "var(--text-muted)",
        marginTop: "4px",
        textTransform: "uppercase",
        letterSpacing: "0.04em",
      }}
    >
      {label}
    </div>
  </div>
);

export const StatsDisplay: React.FC<StatsDisplayProps> = ({ stats }) => {
  const { getStats } = useGameStats();
  const live = getStats();
  const s = stats ?? live;

  if (s.totalGames === 0) {
    return (
      <div
        className="glass-panel"
        style={{
          padding: "28px 24px",
          marginBottom: "24px",
          textAlign: "center",
        }}
      >
        <div
          style={{
            fontSize: "40px",
            marginBottom: "10px",
            filter: "drop-shadow(0 0 16px rgba(102,126,234,0.25))",
          }}
        >
          🪂
        </div>
        <Text
          as="h3"
          size="md"
          style={{
            margin: "0 0 6px",
            color: "var(--text-primary)",
            fontFamily: "var(--font-display)",
          }}
        >
          Your stats will appear here
        </Text>
        <Text
          as="p"
          size="sm"
          style={{
            margin: 0,
            color: "var(--text-secondary)",
            fontFamily: "var(--font-body)",
          }}
        >
          Play your first Trustfall to start tracking your wins, losses, and
          cooperation rate.
        </Text>
      </div>
    );
  }

  const xlmAccent =
    s.totalXlmWon > 0
      ? "#4ade80"
      : s.totalXlmWon < 0
        ? "#f87171"
        : "var(--text-primary)";

  return (
    <div
      className="glass-panel"
      style={{
        padding: "20px 24px",
        marginBottom: "24px",
      }}
    >
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "baseline",
          marginBottom: "14px",
        }}
      >
        <Text
          as="h3"
          size="md"
          style={{
            margin: 0,
            color: "var(--text-primary)",
            fontFamily: "var(--font-display)",
          }}
        >
          📊 Your Record
        </Text>
        <Text
          as="p"
          size="xs"
          style={{
            margin: 0,
            color: "var(--text-muted)",
            fontFamily: "var(--font-body)",
          }}
        >
          {s.totalGames} game{s.totalGames === 1 ? "" : "s"} played
        </Text>
      </div>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(5, 1fr)",
          gap: "10px",
        }}
      >
        <StatTile label="Total" value={String(s.totalGames)} />
        <StatTile
          label="W / L / T"
          value={`${s.wins} / ${s.losses} / ${s.ties}`}
        />
        <StatTile
          label="Net XLM"
          value={formatXLM(s.totalXlmWon)}
          accent={xlmAccent}
        />
        <StatTile
          label="Coop Rate"
          value={`${s.cooperationRate}%`}
          accent="#4ade80"
        />
        <StatTile
          label="Win Rate"
          value={
            s.totalGames > 0
              ? `${Math.round((s.wins / s.totalGames) * 100)}%`
              : "—"
          }
          accent="#667eea"
        />
      </div>
    </div>
  );
};
