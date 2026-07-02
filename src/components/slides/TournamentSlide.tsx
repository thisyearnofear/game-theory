/**
 * TournamentSlide — Step 5: "The Tournament"
 *
 * Watch trust evolve. Strategies compete, reproduce, die.
 * Uses the existing tournament engine but wraps it in the new visual design
 * with the TournamentViz component for animated population bars.
 */

import React, { useState, useCallback } from "react";
import { SlideProps } from "../SlideSystem";
import TournamentViz from "../visual/TournamentViz";
import { ShareableResult } from "../ui/ShareableResult";
import { unlockAchievement } from "../ui/AchievementBadge";
import { ElectricButton } from "../ui/ElectricButton";
import { ShimmerButton } from "../ui/ShimmerButton";
import {
  getStrategyInfo,
  playRepeatedGame,
  createStrategy,
  NC_DEFAULT,
  type StrategyId,
} from "../../util/strategies";

interface PopEntry {
  strategyId: StrategyId;
  name: string;
  emoji: string;
  color: string;
  count: number;
}

const INITIAL_POP: StrategyId[] = [
  "tft",
  "tft",
  "all_c",
  "all_c",
  "all_d",
  "all_d",
  "tf2t",
  "grudge",
  "pavlov",
  "prober",
  "gtft",
  "random",
];

const ROUNDS_PER_MATCH = 10;

export const TournamentSlide: React.FC<SlideProps> = ({ onNext }) => {
  const [population, setPopulation] = useState<PopEntry[]>(
    INITIAL_POP.map((id) => {
      const info = getStrategyInfo(id);
      return {
        strategyId: id,
        name: info.name,
        emoji: info.emoji,
        color: info.color,
        count: 1,
      };
    }).reduce((acc, entry) => {
      const existing = acc.find((e) => e.strategyId === entry.strategyId);
      if (existing) existing.count++;
      else acc.push(entry);
      return acc;
    }, [] as PopEntry[]),
  );
  const [generation, setGeneration] = useState(0);
  const [stage, setStage] = useState<"rest" | "playing" | "evolving">("rest");

  const runGeneration = useCallback(() => {
    setStage("playing");

    setTimeout(() => {
      // Expand population to individual agents
      const agents: StrategyId[] = [];
      population.forEach((p) => {
        for (let i = 0; i < p.count; i++) agents.push(p.strategyId);
      });

      // Round-robin tournament
      const scores: Record<string, number> = {};
      agents.forEach((id) => (scores[id] = 0));

      for (let i = 0; i < agents.length; i++) {
        for (let j = i + 1; j < agents.length; j++) {
          const sA = createStrategy(agents[i]);
          const sB = createStrategy(agents[j]);
          const result = playRepeatedGame(
            sA,
            sB,
            ROUNDS_PER_MATCH,
            0,
            NC_DEFAULT,
          );
          scores[agents[i]] += result.totalA;
          scores[agents[j]] += result.totalB;
        }
      }

      // Average score per strategy
      const avgScores: Record<string, number> = {};
      population.forEach((p) => {
        const total = scores[p.strategyId] || 0;
        avgScores[p.strategyId] = p.count > 0 ? total / p.count : 0;
      });

      setStage("evolving");

      setTimeout(() => {
        // Evolution: eliminate bottom 20%, reproduce top 20%
        const sorted = [...population].sort(
          (a, b) =>
            (avgScores[b.strategyId] || 0) - (avgScores[a.strategyId] || 0),
        );
        const totalAgents = agents.length;
        const eliminateCount = Math.ceil(totalAgents * 0.2);

        // Count how many to eliminate from worst strategies
        const newPop = sorted.map((p) => ({ ...p }));
        let toEliminate = eliminateCount;
        for (let i = newPop.length - 1; i >= 0 && toEliminate > 0; i--) {
          const remove = Math.min(newPop[i].count, toEliminate);
          newPop[i].count -= remove;
          toEliminate -= remove;
        }

        // Reproduce top strategies
        let toReproduce = eliminateCount;
        for (let i = 0; i < newPop.length && toReproduce > 0; i++) {
          const add = Math.min(newPop[i].count, toReproduce);
          newPop[i].count += add;
          toReproduce -= add;
        }

        // Remove extinct strategies
        const filtered = newPop.filter((p) => p.count > 0);

        setPopulation(filtered);
        setGeneration((g) => g + 1);
        setStage("rest");
      }, 800);
    }, 600);
  }, [population]);

  const reset = () => {
    setGeneration(0);
    setStage("rest");
    setPopulation(
      INITIAL_POP.map((id) => {
        const info = getStrategyInfo(id);
        return {
          strategyId: id,
          name: info.name,
          emoji: info.emoji,
          color: info.color,
          count: 1,
        };
      }).reduce((acc, entry) => {
        const existing = acc.find((e) => e.strategyId === entry.strategyId);
        if (existing) existing.count++;
        else acc.push(entry);
        return acc;
      }, [] as PopEntry[]),
    );
  };

  const isComplete = generation >= 5;
  const dominantStrategy = [...population].sort((a, b) => b.count - a.count)[0];

  // Unlock tournament achievement when complete
  React.useEffect(() => {
    if (isComplete) unlockAchievement("tournament_winner");
  }, [isComplete]);

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
        The Tournament
      </h2>

      <p
        data-animate
        style={{
          fontFamily: "var(--font-body)",
          fontSize: "var(--text-base)",
          color: "var(--text-secondary)",
          marginBottom: "24px",
        }}
      >
        All nine strategies compete in a round-robin. After each generation, the
        worst performers die. The best reproduce. Watch what survives.
      </p>

      {/* Tournament visualization */}
      <div data-animate style={{ marginBottom: "24px" }}>
        <TournamentViz population={population} generation={generation} />
      </div>

      {/* Controls */}
      {!isComplete && (
        <div data-animate>
          {stage === "rest" && (
            <ElectricButton onClick={runGeneration} color="violet" size="md">
              {generation === 0
                ? "Start tournament →"
                : "Run next generation →"}
            </ElectricButton>
          )}
          {stage === "playing" && (
            <p
              style={{
                fontFamily: "var(--font-display)",
                fontSize: "var(--text-lg)",
                color: "var(--accent-violet)",
              }}
            >
              ⚔️ Competing...
            </p>
          )}
          {stage === "evolving" && (
            <p
              style={{
                fontFamily: "var(--font-display)",
                fontSize: "var(--text-lg)",
                color: "var(--accent-warm)",
              }}
            >
              🧬 Evolving...
            </p>
          )}
        </div>
      )}

      {/* Completion */}
      {isComplete && (
        <div data-animate>
          <div
            className="glass-panel"
            style={{
              padding: "24px",
              marginBottom: "24px",
              borderColor: "rgba(102,126,234,0.3)",
            }}
          >
            <p
              style={{
                fontFamily: "var(--font-display)",
                fontSize: "var(--text-xl)",
                color: "var(--text-primary)",
                marginBottom: "8px",
              }}
            >
              After {generation} generations:
            </p>
            <p
              style={{
                fontFamily: "var(--font-display)",
                fontSize: "var(--text-2xl)",
                color: dominantStrategy?.color || "var(--accent-violet)",
                marginBottom: "8px",
              }}
            >
              {dominantStrategy?.emoji} {dominantStrategy?.name} dominates
            </p>
            <p
              style={{
                fontFamily: "var(--font-display)",
                fontStyle: "italic",
                fontSize: "var(--text-base)",
                color: "var(--text-secondary)",
              }}
            >
              Trust evolves. Nice strategies that fight back — and forgive — win
              in the long run.
            </p>
          </div>
          <div style={{ marginBottom: "24px" }}>
            <ShareableResult
              title="Tournament Result"
              strategy={dominantStrategy?.name}
              rounds={generation}
            />
          </div>
          <div
            style={{ display: "flex", gap: "12px", justifyContent: "center" }}
          >
            <ShimmerButton onClick={reset} size="sm">
              ↺ Reset
            </ShimmerButton>
            <ElectricButton onClick={onNext} color="violet" size="sm">
              What about noise? →
            </ElectricButton>
          </div>
        </div>
      )}
    </div>
  );
};
