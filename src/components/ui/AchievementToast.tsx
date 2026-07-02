/**
 * AchievementToast — shows a brief toast notification when an achievement unlocks.
 *
 * Slides in from the bottom-right, auto-dismisses after 4 seconds.
 * Uses the existing AchievementBadge styling.
 */

import React, { useEffect, useState, useCallback } from "react";
import { type Achievement } from "./AchievementBadge";

interface AchievementToastProps {
  achievement: Achievement | null;
  onDismiss: () => void;
}

export const AchievementToast: React.FC<AchievementToastProps> = ({
  achievement,
  onDismiss,
}) => {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (achievement) {
      setVisible(true);
      const timer = setTimeout(() => {
        setVisible(false);
        setTimeout(onDismiss, 300);
      }, 4000);
      return () => clearTimeout(timer);
    }
  }, [achievement, onDismiss]);

  const handleClick = useCallback(() => {
    setVisible(false);
    setTimeout(onDismiss, 300);
  }, [onDismiss]);

  if (!achievement) return null;

  return (
    <div
      onClick={handleClick}
      style={{
        position: "fixed",
        bottom: "80px",
        right: "24px",
        zIndex: 10000,
        transform: visible ? "translateX(0)" : "translateX(120%)",
        opacity: visible ? 1 : 0,
        transition:
          "transform 0.4s cubic-bezier(0.16, 1, 0.3, 1), opacity 0.3s ease",
        cursor: "pointer",
      }}
    >
      <div
        className="glass-panel"
        style={{
          padding: "16px 20px",
          display: "flex",
          alignItems: "center",
          gap: "12px",
          borderColor: achievement.color,
          boxShadow: `0 0 30px ${achievement.color.replace("var(--", "rgba(").replace(")", ", 0.2)")}`,
          minWidth: "280px",
        }}
      >
        <div style={{ fontSize: "32px", flexShrink: 0 }}>
          {achievement.icon}
        </div>
        <div>
          <p
            style={{
              fontFamily: "var(--font-body)",
              fontSize: "var(--text-xs)",
              color: "var(--text-muted)",
              margin: "0 0 2px",
              textTransform: "uppercase",
              letterSpacing: "0.1em",
            }}
          >
            Achievement Unlocked
          </p>
          <p
            style={{
              fontFamily: "var(--font-display)",
              fontSize: "var(--text-base)",
              color: achievement.color,
              margin: "0 0 2px",
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
      </div>
    </div>
  );
};

/**
 * useAchievementToast — hook that watches for newly unlocked achievements
 * and shows them as toasts.
 */
export function useAchievementToast() {
  const [currentToast, setCurrentToast] = useState<Achievement | null>(null);
  const [queue, setQueue] = useState<Achievement[]>([]);

  const showAchievement = useCallback((achievement: Achievement) => {
    setQueue((q) => [...q, achievement]);
  }, []);

  useEffect(() => {
    if (!currentToast && queue.length > 0) {
      setCurrentToast(queue[0]);
      setQueue((q) => q.slice(1));
    }
  }, [currentToast, queue]);

  const dismissToast = useCallback(() => {
    setCurrentToast(null);
  }, []);

  return {
    toastElement: (
      <AchievementToast achievement={currentToast} onDismiss={dismissToast} />
    ),
    showAchievement,
  };
}
