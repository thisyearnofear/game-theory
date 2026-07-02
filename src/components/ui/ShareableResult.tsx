/**
 * ShareableResult — generates a shareable text/image result for social media.
 *
 * After completing a tournament or ZK game, users can share their result.
 * Generates a compact text summary and provides copy/share buttons.
 */

import React, { useState } from "react";

interface ShareableResultProps {
  title: string;
  score?: number;
  opponentScore?: number;
  outcome?: "win" | "lose" | "tie";
  strategy?: string;
  rounds?: number;
  cooperationRate?: number;
}

export const ShareableResult: React.FC<ShareableResultProps> = ({
  title,
  score,
  opponentScore,
  outcome,
  strategy,
  rounds,
  cooperationRate,
}) => {
  const [copied, setCopied] = useState(false);

  const buildShareText = () => {
    let text = `🪂 Trustfall — ${title}\n`;
    if (score !== undefined && opponentScore !== undefined) {
      text += `Score: ${score > 0 ? "+" : ""}${score} vs ${opponentScore > 0 ? "+" : ""}${opponentScore}`;
      if (outcome === "win") text += " — Won!";
      else if (outcome === "tie") text += " — Tie.";
      else if (outcome === "lose") text += " — Lost.";
      text += "\n";
    }
    if (strategy) text += `Strategy: ${strategy}\n`;
    if (rounds) text += `Rounds: ${rounds}\n`;
    if (cooperationRate !== undefined)
      text += `Cooperation: ${cooperationRate}%\n`;
    text += "Play: https://trustfall.xyz";
    return text;
  };

  const shareText = buildShareText();

  const copyToClipboard = () => {
    void navigator.clipboard.writeText(shareText).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  const shareNative = () => {
    if (navigator.share) {
      navigator
        .share({ text: shareText, url: "https://trustfall.xyz" })
        .catch(() => {});
    } else {
      copyToClipboard();
    }
  };

  return (
    <div
      className="glass-panel"
      style={{
        padding: "20px",
        textAlign: "center",
      }}
    >
      <p
        style={{
          fontFamily: "var(--font-body)",
          fontSize: "var(--text-xs)",
          color: "var(--text-muted)",
          margin: "0 0 12px",
          textTransform: "uppercase",
          letterSpacing: "0.1em",
        }}
      >
        Share your result
      </p>

      <pre
        style={{
          fontFamily: "var(--font-mono)",
          fontSize: "var(--text-xs)",
          color: "var(--text-secondary)",
          background: "var(--bg-glass-light)",
          borderRadius: "var(--radius-sm)",
          padding: "12px",
          margin: "0 0 16px",
          textAlign: "left",
          whiteSpace: "pre-wrap",
          lineHeight: 1.5,
        }}
      >
        {shareText}
      </pre>

      <div style={{ display: "flex", gap: "8px", justifyContent: "center" }}>
        <button
          onClick={copyToClipboard}
          className="press-feedback"
          style={{
            background: "var(--bg-glass-light)",
            border: "1px solid var(--border-glass)",
            borderRadius: "var(--radius-md)",
            color: copied ? "var(--accent-cooperate)" : "var(--text-secondary)",
            fontFamily: "var(--font-body)",
            fontSize: "var(--text-sm)",
            padding: "8px 16px",
            cursor: "pointer",
            transition: "all 0.3s var(--ease-out)",
          }}
        >
          {copied ? "✓ Copied!" : "📋 Copy"}
        </button>
        <button
          onClick={shareNative}
          className="press-feedback"
          style={{
            background: "var(--accent-violet)",
            border: "none",
            borderRadius: "var(--radius-md)",
            color: "white",
            fontFamily: "var(--font-body)",
            fontSize: "var(--text-sm)",
            fontWeight: 600,
            padding: "8px 16px",
            cursor: "pointer",
          }}
        >
          📤 Share
        </button>
      </div>
    </div>
  );
};
