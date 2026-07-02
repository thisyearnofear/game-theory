/**
 * OpponentsSlide — Step 4: "The Opponents"
 *
 * Meet all 9 strategies with personality cards.
 * User can select one and play a quick 3-round match.
 * The key reveal: Tit-for-Tat is the best — simple, nice, provocable, forgiving, clear.
 */

import React, { useState, useRef } from "react";
import { SlideProps } from "../SlideSystem";
import StrategyCard from "../visual/StrategyCard";
import { ElectricButton } from "../ui/ElectricButton";
import { StaggerButton } from "../ui/StaggerButton";
import { ShimmerButton } from "../ui/ShimmerButton";
import {
  createStrategy,
  calculatePayoff,
  getStrategyInfo,
  ALL_STRATEGY_IDS,
  NC_DEFAULT,
  type GameMove,
  type StrategyId,
  type IteratedStrategy,
} from "../../util/strategies";

export const OpponentsSlide: React.FC<SlideProps> = ({ onNext }) => {
  const [selected, setSelected] = useState<StrategyId | null>(null);
  const [matchRound, setMatchRound] = useState(0);
  const [playerScore, setPlayerScore] = useState(0);
  const [aiScore, setAiScore] = useState(0);
  const [lastResult, setLastResult] = useState<string>("");
  const strategyRef = useRef<IteratedStrategy | null>(null);

  const startMatch = (id: StrategyId) => {
    setSelected(id);
    strategyRef.current = createStrategy(id);
    setMatchRound(0);
    setPlayerScore(0);
    setAiScore(0);
    setLastResult("");
  };

  const playMove = (move: GameMove) => {
    if (!strategyRef.current || matchRound >= 3) return;
    const aiMove = strategyRef.current.play();
    const result = calculatePayoff(move, aiMove, 1, NC_DEFAULT);
    strategyRef.current.remember(move, aiMove);

    const newPlayer = playerScore + result.playerPayout;
    const newAi = aiScore + result.aiPayout;
    setPlayerScore(newPlayer);
    setAiScore(newAi);
    setMatchRound(matchRound + 1);

    if (move === "C" && aiMove === "C") setLastResult("🤝 Mutual trust");
    else if (move === "C" && aiMove === "D")
      setLastResult("💥 They stepped aside");
    else if (move === "D" && aiMove === "C")
      setLastResult("🏆 You exploited them");
    else setLastResult("💀 Mutual destruction");
  };

  const matchComplete = matchRound >= 3;

  return (
    <div style={{ maxWidth: "720px", margin: "0 auto", textAlign: "center" }}>
      <h2
        data-animate
        style={{
          fontFamily: "var(--font-display)",
          fontSize: "var(--text-3xl)",
          marginBottom: "12px",
        }}
      >
        Meet the Opponents
      </h2>

      <p
        data-animate
        style={{
          fontFamily: "var(--font-body)",
          fontSize: "var(--text-base)",
          color: "var(--text-secondary)",
          marginBottom: "32px",
        }}
      >
        Nine strategies, nine personalities. Click one to play a quick 3-round
        match.
      </p>

      {/* Strategy grid */}
      {!selected && (
        <div
          data-animate
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(3, 1fr)",
            gap: "12px",
            marginBottom: "32px",
          }}
        >
          {ALL_STRATEGY_IDS.map((id) => {
            const info = getStrategyInfo(id);
            return (
              <StrategyCard
                key={id}
                id={id}
                name={info.name}
                description={info.description}
                emoji={info.emoji}
                color={info.color}
                compact
                onClick={() => startMatch(id)}
              />
            );
          })}
        </div>
      )}

      {/* Match view */}
      {selected && (
        <div data-animate>
          <div
            className="glass-panel"
            style={{ padding: "24px", marginBottom: "24px" }}
          >
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                marginBottom: "16px",
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
                  {playerScore > 0 ? "+" : ""}
                  {playerScore}
                </p>
              </div>
              <div>
                <p
                  style={{
                    fontFamily: "var(--font-body)",
                    fontSize: "var(--text-sm)",
                    color: "var(--text-muted)",
                    margin: 0,
                  }}
                >
                  Round {Math.min(matchRound + (matchComplete ? 0 : 1), 3)}/3
                </p>
                <p
                  style={{
                    fontFamily: "var(--font-display)",
                    fontSize: "var(--text-lg)",
                    color: "var(--text-primary)",
                    margin: 0,
                  }}
                >
                  {getStrategyInfo(selected).emoji}{" "}
                  {getStrategyInfo(selected).name}
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
                  Them
                </p>
                <p
                  style={{
                    fontFamily: "var(--font-display)",
                    fontSize: "var(--text-2xl)",
                    color: "var(--accent-warm)",
                    margin: 0,
                  }}
                >
                  {aiScore > 0 ? "+" : ""}
                  {aiScore}
                </p>
              </div>
            </div>

            {lastResult && !matchComplete && (
              <p
                style={{
                  fontFamily: "var(--font-display)",
                  fontSize: "var(--text-lg)",
                  color: "var(--text-secondary)",
                  marginBottom: "16px",
                }}
              >
                {lastResult}
              </p>
            )}

            {!matchComplete ? (
              <div
                style={{
                  display: "flex",
                  gap: "12px",
                  justifyContent: "center",
                }}
              >
                <StaggerButton
                  onClick={() => playMove("C")}
                  color="cooperate"
                  size="sm"
                  triggerOn="active"
                >
                  🤝 Cooperate
                </StaggerButton>
                <StaggerButton
                  onClick={() => playMove("D")}
                  color="defect"
                  size="sm"
                  triggerOn="active"
                >
                  ⚔️ Defect
                </StaggerButton>
              </div>
            ) : (
              <div>
                <p
                  style={{
                    fontFamily: "var(--font-display)",
                    fontSize: "var(--text-lg)",
                    color:
                      playerScore > aiScore
                        ? "var(--accent-cooperate)"
                        : playerScore === aiScore
                          ? "var(--text-primary)"
                          : "var(--accent-defect)",
                    marginBottom: "16px",
                  }}
                >
                  {playerScore > aiScore
                    ? "You won this match."
                    : playerScore === aiScore
                      ? "A tie."
                      : `${getStrategyInfo(selected).name} won this match.`}
                </p>
                <div
                  style={{
                    display: "flex",
                    gap: "12px",
                    justifyContent: "center",
                  }}
                >
                  <ShimmerButton onClick={() => setSelected(null)} size="sm">
                    ← Try another
                  </ShimmerButton>
                  <ElectricButton onClick={onNext} color="violet" size="sm">
                    Watch them compete →
                  </ElectricButton>
                </div>
              </div>
            )}
          </div>

          {/* Strategy description */}
          <div
            className="glass-panel"
            style={{ padding: "16px", textAlign: "left" }}
          >
            <p
              style={{
                fontFamily: "var(--font-body)",
                fontSize: "var(--text-sm)",
                color: "var(--text-secondary)",
                margin: 0,
              }}
            >
              <strong style={{ color: "var(--text-primary)" }}>
                {getStrategyInfo(selected).name}:
              </strong>{" "}
              {getStrategyInfo(selected).description}
            </p>
          </div>
        </div>
      )}

      {/* The reveal — shown when browsing strategies */}
      {!selected && (
        <div
          data-animate
          className="glass-panel"
          style={{
            padding: "24px",
            borderColor: "rgba(102,126,234,0.3)",
          }}
        >
          <p
            style={{
              fontFamily: "var(--font-display)",
              fontSize: "var(--text-lg)",
              color: "var(--accent-violet)",
              marginBottom: "8px",
            }}
          >
            🏆 The champion: Tit-for-Tat
          </p>
          <p
            style={{
              fontFamily: "var(--font-body)",
              fontSize: "var(--text-sm)",
              color: "var(--text-secondary)",
            }}
          >
            Simple, nice, provocable, forgiving, and clear. It won Robert
            Axelrod's famous 1980 tournament — and it still wins today.
          </p>
        </div>
      )}
    </div>
  );
};
