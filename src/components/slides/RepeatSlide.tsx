/**
 * RepeatSlide — Step 3: "The Repeat"
 *
 * Now the user plays 5 rounds against Tit-for-Tat.
 * The key insight: when you'll see each other again, behavior changes.
 * Shows running score and a simple round history.
 */

import React, { useState, useRef } from "react";
import { SlideProps } from "../SlideSystem";
import { unlockAchievement } from "../ui/AchievementBadge";
import {
  createStrategy,
  calculatePayoff,
  NC_DEFAULT,
  type GameMove,
  type IteratedStrategy,
} from "../../util/strategies";

interface Round {
  num: number;
  player: GameMove;
  ai: GameMove;
  playerPayout: number;
  aiPayout: number;
}

const MAX_ROUNDS = 5;

export const RepeatSlide: React.FC<SlideProps> = ({ onNext }) => {
  const [rounds, setRounds] = useState<Round[]>([]);
  const [playerMove, setPlayerMove] = useState<GameMove | null>(null);
  const [lastOutcome, setLastOutcome] = useState<string>("");
  const strategyRef = useRef<IteratedStrategy>(createStrategy("tft"));

  const playerTotal = rounds.reduce((sum, r) => sum + r.playerPayout, 0);
  const aiTotal = rounds.reduce((sum, r) => sum + r.aiPayout, 0);
  const roundNum = rounds.length + 1;
  const isComplete = rounds.length >= MAX_ROUNDS;

  const playRound = (move: GameMove) => {
    if (isComplete || playerMove) return;
    const aiMove = strategyRef.current.play();
    const result = calculatePayoff(move, aiMove, 1, NC_DEFAULT);
    strategyRef.current.remember(move, aiMove);

    const round: Round = {
      num: roundNum,
      player: move,
      ai: aiMove,
      playerPayout: result.playerPayout,
      aiPayout: result.aiPayout,
    };

    setRounds([...rounds, round]);
    setPlayerMove(move);

    // Check for trust streak achievement
    const allCoop = [...rounds, round].every(
      (r) => r.player === "C" && r.ai === "C",
    );
    if (allCoop && [...rounds, round].length >= 5) {
      unlockAchievement("trust_streak_5");
    }

    let label: string;
    if (move === "C" && aiMove === "C")
      label = "🤝 Mutual trust — you both caught each other";
    else if (move === "C" && aiMove === "D")
      label = "💥 They stepped aside — you fell";
    else if (move === "D" && aiMove === "C")
      label = "🏆 You stepped aside — they fell";
    else label = "💀 Nobody caught anyone";
    setLastOutcome(label);
  };

  const nextRound = () => {
    setPlayerMove(null);
    setLastOutcome("");
  };

  const reset = () => {
    strategyRef.current = createStrategy("tft");
    setRounds([]);
    setPlayerMove(null);
    setLastOutcome("");
  };

  return (
    <div style={{ maxWidth: "640px", margin: "0 auto", textAlign: "center" }}>
      <h2
        data-animate
        style={{
          fontFamily: "var(--font-display)",
          fontSize: "var(--text-3xl)",
          marginBottom: "12px",
        }}
      >
        The Repeat
      </h2>

      <p
        data-animate
        style={{
          fontFamily: "var(--font-body)",
          fontSize: "var(--text-base)",
          color: "var(--text-secondary)",
          marginBottom: "8px",
        }}
      >
        You're playing 5 rounds against{" "}
        <strong style={{ color: "var(--accent-violet)" }}>Tit-for-Tat</strong> —
        a strategy that starts kind, then copies whatever you did last.
      </p>

      <p
        data-animate
        style={{
          fontFamily: "var(--font-display)",
          fontStyle: "italic",
          fontSize: "var(--text-lg)",
          color: "var(--text-muted)",
          marginBottom: "32px",
        }}
      >
        Does knowing you'll meet again change anything?
      </p>

      {/* Score */}
      <div
        data-animate
        style={{
          display: "flex",
          justifyContent: "center",
          gap: "32px",
          marginBottom: "24px",
        }}
      >
        <div>
          <p
            style={{
              fontFamily: "var(--font-body)",
              fontSize: "var(--text-xs)",
              color: "var(--text-muted)",
              margin: 0,
              textTransform: "uppercase",
              letterSpacing: "0.1em",
            }}
          >
            You
          </p>
          <p
            style={{
              fontFamily: "var(--font-display)",
              fontSize: "var(--text-2xl)",
              color: "var(--accent-violet)",
              margin: 0,
            }}
          >
            {playerTotal > 0 ? "+" : ""}
            {playerTotal}
          </p>
        </div>
        <div>
          <p
            style={{
              fontFamily: "var(--font-body)",
              fontSize: "var(--text-xs)",
              color: "var(--text-muted)",
              margin: 0,
              textTransform: "uppercase",
              letterSpacing: "0.1em",
            }}
          >
            Round
          </p>
          <p
            style={{
              fontFamily: "var(--font-display)",
              fontSize: "var(--text-2xl)",
              color: "var(--text-primary)",
              margin: 0,
            }}
          >
            {Math.min(rounds.length + (isComplete ? 0 : 1), MAX_ROUNDS)}/
            {MAX_ROUNDS}
          </p>
        </div>
        <div>
          <p
            style={{
              fontFamily: "var(--font-body)",
              fontSize: "var(--text-xs)",
              color: "var(--text-muted)",
              margin: 0,
              textTransform: "uppercase",
              letterSpacing: "0.1em",
            }}
          >
            TFT
          </p>
          <p
            style={{
              fontFamily: "var(--font-display)",
              fontSize: "var(--text-2xl)",
              color: "var(--accent-warm)",
              margin: 0,
            }}
          >
            {aiTotal > 0 ? "+" : ""}
            {aiTotal}
          </p>
        </div>
      </div>

      {/* Round history */}
      {rounds.length > 0 && (
        <div
          data-animate
          className="glass-panel"
          style={{
            padding: "16px",
            marginBottom: "24px",
            maxWidth: "400px",
            margin: "0 auto 24px",
          }}
        >
          {rounds.map((r) => (
            <div
              key={r.num}
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                padding: "6px 0",
                borderBottom:
                  r.num < rounds.length
                    ? "1px solid var(--border-glass)"
                    : "none",
                fontSize: "var(--text-sm)",
              }}
            >
              <span style={{ color: "var(--text-muted)" }}>R{r.num}</span>
              <span style={{ color: "var(--text-primary)" }}>
                {r.player === "C" ? "🤝" : "⚔️"} vs {r.ai === "C" ? "🤝" : "⚔️"}
              </span>
              <span
                style={{
                  fontFamily: "var(--font-mono)",
                  color: "var(--text-secondary)",
                }}
              >
                {r.playerPayout > 0 ? "+" : ""}
                {r.playerPayout} / {r.aiPayout > 0 ? "+" : ""}
                {r.aiPayout}
              </span>
            </div>
          ))}
        </div>
      )}

      {/* Choice or outcome */}
      {!isComplete && !playerMove && (
        <div data-animate>
          <div
            style={{ display: "flex", gap: "16px", justifyContent: "center" }}
          >
            <button
              onClick={() => playRound("C")}
              className="press-feedback"
              style={{
                background: "rgba(74,222,128,0.1)",
                border: "1px solid rgba(74,222,128,0.3)",
                borderRadius: "var(--radius-md)",
                color: "var(--accent-cooperate)",
                fontFamily: "var(--font-display)",
                fontSize: "var(--text-lg)",
                padding: "12px 28px",
                cursor: "pointer",
              }}
            >
              🤝 Cooperate
            </button>
            <button
              onClick={() => playRound("D")}
              className="press-feedback"
              style={{
                background: "rgba(248,113,113,0.1)",
                border: "1px solid rgba(248,113,113,0.3)",
                borderRadius: "var(--radius-md)",
                color: "var(--accent-defect)",
                fontFamily: "var(--font-display)",
                fontSize: "var(--text-lg)",
                padding: "12px 28px",
                cursor: "pointer",
              }}
            >
              ⚔️ Defect
            </button>
          </div>
        </div>
      )}

      {playerMove && !isComplete && (
        <div data-animate>
          <p
            style={{
              fontFamily: "var(--font-display)",
              fontSize: "var(--text-lg)",
              color: "var(--text-secondary)",
              marginBottom: "20px",
            }}
          >
            {lastOutcome}
          </p>
          <button
            onClick={nextRound}
            className="press-feedback"
            style={{
              background: "var(--accent-violet)",
              border: "none",
              borderRadius: "var(--radius-md)",
              color: "white",
              fontFamily: "var(--font-body)",
              fontSize: "var(--text-sm)",
              fontWeight: 600,
              padding: "10px 24px",
              cursor: "pointer",
            }}
          >
            Next round →
          </button>
        </div>
      )}

      {isComplete && (
        <div data-animate>
          <div
            className="glass-panel"
            style={{ padding: "24px", marginBottom: "24px" }}
          >
            <p
              style={{
                fontFamily: "var(--font-display)",
                fontSize: "var(--text-xl)",
                color: "var(--text-primary)",
                marginBottom: "8px",
              }}
            >
              {playerTotal > aiTotal
                ? "You outscored Tit-for-Tat!"
                : playerTotal === aiTotal
                  ? "A perfect tie."
                  : "Tit-for-Tat outscored you."}
            </p>
            <p
              style={{
                fontFamily: "var(--font-display)",
                fontStyle: "italic",
                fontSize: "var(--text-base)",
                color: "var(--text-secondary)",
              }}
            >
              {playerTotal === aiTotal && rounds.every((r) => r.player === "C")
                ? "Five rounds of mutual trust. That's the best outcome for everyone."
                : "When you'll meet again, betrayal has consequences. Tit-for-Tat punishes defection — and rewards cooperation."}
            </p>
          </div>
          <div
            style={{ display: "flex", gap: "12px", justifyContent: "center" }}
          >
            <button
              onClick={reset}
              className="press-feedback"
              style={{
                background: "var(--bg-glass-light)",
                border: "1px solid var(--border-glass)",
                borderRadius: "var(--radius-md)",
                color: "var(--text-secondary)",
                fontFamily: "var(--font-body)",
                fontSize: "var(--text-sm)",
                padding: "10px 20px",
                cursor: "pointer",
              }}
            >
              ↺ Play again
            </button>
            <button
              onClick={onNext}
              className="press-feedback"
              style={{
                background: "var(--accent-violet)",
                border: "none",
                borderRadius: "var(--radius-md)",
                color: "white",
                fontFamily: "var(--font-body)",
                fontSize: "var(--text-sm)",
                fontWeight: 600,
                padding: "10px 24px",
                cursor: "pointer",
              }}
            >
              Meet the strategies →
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
