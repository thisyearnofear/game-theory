/**
 * AchievementBadge — displays an unlocked achievement.
 *
 * Achievements are earned for milestones throughout the Trustfall experience:
 * - First cooperation
 * - First betrayal
 * - 5-round streak of mutual cooperation
 * - Tournament winner
 * - First ZK game played
 * - etc.
 */

import React from "react";

export interface Achievement {
  id: string;
  icon: string;
  title: string;
  description: string;
  color: string;
}

export const ACHIEVEMENTS: Record<string, Achievement> = {
  first_catch: {
    id: "first_catch",
    icon: "🤝",
    title: "First Catch",
    description: "You cooperated and they caught you. Trust begins.",
    color: "var(--accent-cooperate)",
  },
  first_betrayal: {
    id: "first_betrayal",
    icon: "💥",
    title: "The Fall",
    description: "You fell and they stepped aside. Now you know.",
    color: "var(--accent-defect)",
  },
  first_exploit: {
    id: "first_exploit",
    icon: "🏆",
    title: "The Exploit",
    description: "You stepped aside while they fell. Was it worth it?",
    color: "var(--accent-warm)",
  },
  trust_streak_5: {
    id: "trust_streak_5",
    icon: "🔥",
    title: "Trust Streak",
    description: "5 rounds of mutual cooperation in a row.",
    color: "var(--accent-violet)",
  },
  tournament_winner: {
    id: "tournament_winner",
    icon: "👑",
    title: "Tournament Champion",
    description: "Your strategy dominated the evolutionary tournament.",
    color: "var(--accent-warm)",
  },
  noise_master: {
    id: "noise_master",
    icon: "💨",
    title: "Noise Master",
    description: "You explored how noise destroys trust.",
    color: "var(--accent-violet)",
  },
  zk_player: {
    id: "zk_player",
    icon: "🔒",
    title: "ZK Player",
    description: "You played your first game with real stakes.",
    color: "var(--accent-violet)",
  },
  zk_winner: {
    id: "zk_winner",
    icon: "💎",
    title: "ZK Winner",
    description: "You won a game with real XLM at stake.",
    color: "var(--accent-cooperate)",
  },
};

interface AchievementBadgeProps {
  achievement: Achievement;
  compact?: boolean;
}

export const AchievementBadge: React.FC<AchievementBadgeProps> = ({
  achievement,
  compact,
}) => {
  if (compact) {
    return (
      <div
        style={{
          display: "inline-flex",
          alignItems: "center",
          gap: "6px",
          padding: "4px 10px",
          background: "var(--bg-glass-light)",
          border: `1px solid ${achievement.color}`,
          borderRadius: "100px",
          fontSize: "var(--text-xs)",
          fontFamily: "var(--font-body)",
          color: achievement.color,
        }}
      >
        <span>{achievement.icon}</span>
        <span>{achievement.title}</span>
      </div>
    );
  }

  return (
    <div
      className="glass-panel"
      style={{
        padding: "20px",
        textAlign: "center",
        borderColor: achievement.color,
        boxShadow: `0 0 24px ${achievement.color.replace("var(--", "rgba(").replace(")", ", 0.15)")}`,
      }}
    >
      <div style={{ fontSize: "40px", marginBottom: "8px" }}>
        {achievement.icon}
      </div>
      <p
        style={{
          fontFamily: "var(--font-display)",
          fontSize: "var(--text-lg)",
          color: achievement.color,
          margin: "0 0 4px",
        }}
      >
        {achievement.title}
      </p>
      <p
        style={{
          fontFamily: "var(--font-body)",
          fontSize: "var(--text-xs)",
          color: "var(--text-secondary)",
          margin: 0,
        }}
      >
        {achievement.description}
      </p>
    </div>
  );
};

/** Track unlocked achievements in localStorage */
export function unlockAchievement(id: string): boolean {
  try {
    const key = "trustfall_achievements";
    const raw = localStorage.getItem(key);
    const existing: string[] = raw ? (JSON.parse(raw) as string[]) : [];
    if (existing.includes(id)) return false; // Already unlocked
    existing.push(id);
    localStorage.setItem(key, JSON.stringify(existing));
    return true; // Newly unlocked
  } catch {
    return false;
  }
}

export function getUnlockedAchievements(): string[] {
  try {
    const raw = localStorage.getItem("trustfall_achievements");
    if (!raw) return [];
    const data = JSON.parse(raw) as string[];
    return Array.isArray(data) ? data : [];
  } catch {
    return [];
  }
}
