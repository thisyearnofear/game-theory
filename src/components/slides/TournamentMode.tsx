import React, { useState, useCallback, useMemo } from "react";
import { Button, Text } from "@stellar/design-system";
import AudioManager from "../AudioManager";
import {
  type PopulationEntry,
  type EvolutionConfig,
  type StrategyScore,
  runTournament,
  evolvePopulation,
  DEFAULT_POPULATION,
  DEFAULT_CONFIG,
} from "../../util/tournament";
import { getStrategyInfo, type StrategyId } from "../../util/strategies";

type Stage = "rest" | "playing" | "eliminating" | "reproducing";

export const TournamentMode: React.FC = () => {
  const [population, setPopulation] = useState<PopulationEntry[]>(() =>
    DEFAULT_POPULATION.map((e) => ({ ...e })),
  );
  const [config, setConfig] = useState<EvolutionConfig>(DEFAULT_CONFIG);
  const [generation, setGeneration] = useState(0);
  const [stage, setStage] = useState<Stage>("rest");
  const [scores, setScores] = useState<StrategyScore[]>([]);
  const [autoPlay, setAutoPlay] = useState(false);
  const [history, setHistory] = useState<
    Array<{ gen: number; pop: Record<string, number> }>
  >([]);
  const [winner, setWinner] = useState<string | null>(null);

  const audioManager = AudioManager.getInstance();

  const totalPopulation = useMemo(
    () => population.reduce((sum, e) => sum + e.count, 0),
    [population],
  );

  const buildScores = useCallback(
    (
      pop: PopulationEntry[],
      rawScores: Map<StrategyId, { total: number; count: number }>,
    ): StrategyScore[] => {
      return pop
        .map((entry) => {
          const s = rawScores.get(entry.strategyId);
          const info = getStrategyInfo(entry.strategyId);
          const total = s?.total ?? 0;
          const count = s?.count ?? 0;
          return {
            strategyId: entry.strategyId,
            name: info.name,
            emoji: info.emoji,
            color: info.color,
            totalScore: total,
            avgScore: count > 0 ? total / count : 0,
            population: entry.count,
          };
        })
        .sort((a, b) => b.avgScore - a.avgScore);
    },
    [],
  );

  const playTournament = useCallback(() => {
    if (stage !== "rest") return;
    setStage("playing");
    audioManager.playSound("click");

    // Run the tournament (synchronous, but we set stage for visual feedback)
    setTimeout(() => {
      const rawScores = runTournament(population, config);
      const scored = buildScores(population, rawScores);
      setScores(scored);
      setStage("rest");
      audioManager.playSound("coin");
    }, 600);
  }, [stage, population, config, buildScores, audioManager]);

  const evolve = useCallback(() => {
    if (stage !== "rest" || scores.length === 0) return;
    setStage("eliminating");
    audioManager.playSound("defect");

    setTimeout(() => {
      const rawScores = new Map<StrategyId, { total: number; count: number }>();
      scores.forEach((s) => {
        rawScores.set(s.strategyId, {
          total: s.totalScore,
          count: s.population,
        });
      });
      const newPop = evolvePopulation(
        population,
        rawScores,
        config.selectionSize,
      );

      // Record history
      const popRecord: Record<string, number> = {};
      newPop.forEach((e) => {
        popRecord[e.strategyId] = e.count;
      });
      setHistory([...history, { gen: generation + 1, pop: popRecord }]);

      setPopulation(newPop);
      setGeneration(generation + 1);
      setStage("reproducing");
      audioManager.playSound("cooperate");

      setTimeout(() => {
        setStage("rest");

        // Check for winner (one strategy has >= 80% of population)
        const total = newPop.reduce((sum, e) => sum + e.count, 0);
        const dominant = newPop.find((e) => e.count / total >= 0.8);
        if (dominant) {
          const info = getStrategyInfo(dominant.strategyId);
          setWinner(info.name);
          setAutoPlay(false);
          audioManager.playSound("win");
        }
      }, 500);
    }, 600);
  }, [stage, scores, population, config, generation, history, audioManager]);

  // Auto-play loop
  React.useEffect(() => {
    if (!autoPlay || stage !== "rest") return;
    if (winner) {
      setAutoPlay(false);
      return;
    }

    const timer = setTimeout(() => {
      if (scores.length === 0) {
        playTournament();
      } else {
        evolve();
      }
    }, 800);

    return () => clearTimeout(timer);
  }, [autoPlay, stage, scores, winner, playTournament, evolve]);

  const reset = useCallback(() => {
    setPopulation(DEFAULT_POPULATION.map((e) => ({ ...e })));
    setGeneration(0);
    setStage("rest");
    setScores([]);
    setHistory([]);
    setWinner(null);
    setAutoPlay(false);
    audioManager.playSound("click");
  }, [audioManager]);

  const maxPop = useMemo(
    () => Math.max(...population.map((e) => e.count), 1),
    [population],
  );

  const maxAvgScore = useMemo(
    () => Math.max(...scores.map((s) => s.avgScore), 1),
    [scores],
  );

  return (
    <div style={{ maxWidth: "600px", margin: "0 auto", textAlign: "center" }}>
      {/* Header */}
      <Text
        as="h3"
        size="lg"
        style={{
          fontFamily: "FuturaHandwritten",
          color: "rgba(255,255,255,0.95)",
          margin: "0 0 8px 0",
        }}
      >
        🏆 Tournament of Trust
      </Text>
      <Text
        as="p"
        size="sm"
        style={{
          fontFamily: "FuturaHandwritten",
          color: "rgba(255,255,255,0.6)",
          margin: "0 0 20px 0",
          fontSize: "0.85rem",
          lineHeight: 1.4,
        }}
      >
        All strategies play each other. The weak die. The strong reproduce.
        Watch trust evolve over generations.
      </Text>

      {/* Winner banner */}
      {winner && (
        <div
          className="tf-fade-in-up"
          style={{
            background:
              "linear-gradient(135deg, rgba(255, 180, 80, 0.2), rgba(255, 140, 60, 0.1))",
            borderRadius: "12px",
            padding: "16px",
            marginBottom: "20px",
            border: "2px solid rgba(255, 180, 80, 0.4)",
          }}
        >
          <Text
            as="p"
            size="md"
            style={{
              fontFamily: "FuturaHandwritten",
              color: "#ffb050",
              margin: 0,
              fontSize: "1.1rem",
              fontWeight: "bold",
            }}
          >
            🏆 {winner} dominates after {generation} generations!
          </Text>
          <Button
            onClick={reset}
            variant="secondary"
            size="sm"
            style={{ marginTop: "10px", fontFamily: "FuturaHandwritten" }}
          >
            🔄 Start New Tournament
          </Button>
        </div>
      )}

      {/* Generation + stage indicator */}
      <div
        style={{
          display: "flex",
          justifyContent: "center",
          gap: "20px",
          marginBottom: "16px",
        }}
      >
        <div>
          <Text
            as="p"
            size="xs"
            style={{
              fontFamily: "FuturaHandwritten",
              color: "rgba(255,255,255,0.5)",
              margin: 0,
            }}
          >
            Generation
          </Text>
          <Text
            as="p"
            size="md"
            style={{
              fontFamily: "FuturaHandwritten",
              color: "rgba(255,255,255,0.95)",
              margin: 0,
              fontWeight: "bold",
              fontSize: "1.3rem",
            }}
          >
            {generation}
          </Text>
        </div>
        <div>
          <Text
            as="p"
            size="xs"
            style={{
              fontFamily: "FuturaHandwritten",
              color: "rgba(255,255,255,0.5)",
              margin: 0,
            }}
          >
            Population
          </Text>
          <Text
            as="p"
            size="md"
            style={{
              fontFamily: "FuturaHandwritten",
              color: "rgba(255,255,255,0.95)",
              margin: 0,
              fontWeight: "bold",
              fontSize: "1.3rem",
            }}
          >
            {totalPopulation}
          </Text>
        </div>
        <div>
          <Text
            as="p"
            size="xs"
            style={{
              fontFamily: "FuturaHandwritten",
              color: "rgba(255,255,255,0.5)",
              margin: 0,
            }}
          >
            Stage
          </Text>
          <Text
            as="p"
            size="md"
            style={{
              fontFamily: "FuturaHandwritten",
              color:
                stage === "playing"
                  ? "#667eea"
                  : stage === "eliminating"
                    ? "#F44336"
                    : stage === "reproducing"
                      ? "#4CAF50"
                      : "rgba(255,255,255,0.7)",
              margin: 0,
              fontWeight: "bold",
              fontSize: "1rem",
            }}
          >
            {stage === "playing"
              ? "⚔️ Playing..."
              : stage === "eliminating"
                ? "💀 Eliminating..."
                : stage === "reproducing"
                  ? "🌱 Reproducing..."
                  : "✋ Ready"}
          </Text>
        </div>
      </div>

      {/* Population visualization — bar chart */}
      <div
        style={{
          background: "rgba(255,255,255,0.08)",
          borderRadius: "12px",
          padding: "20px",
          marginBottom: "20px",
          border: "1px solid rgba(255,255,255,0.1)",
        }}
      >
        {population.map((entry) => {
          const info = getStrategyInfo(entry.strategyId);
          const barWidth = (entry.count / maxPop) * 100;
          const isEliminated = entry.count === 0;
          const score = scores.find((s) => s.strategyId === entry.strategyId);
          const scoreBarWidth = score
            ? (score.avgScore / maxAvgScore) * 100
            : 0;

          return (
            <div
              key={entry.strategyId}
              style={{
                marginBottom: "10px",
                opacity: isEliminated ? 0.3 : 1,
                transition: "opacity 0.5s",
              }}
            >
              {/* Strategy label + count */}
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  marginBottom: "4px",
                }}
              >
                <Text
                  as="span"
                  size="xs"
                  style={{
                    fontFamily: "FuturaHandwritten",
                    color: isEliminated ? "rgba(255,255,255,0.3)" : info.color,
                    fontSize: "0.8rem",
                  }}
                >
                  {info.emoji} {info.name}
                  {isEliminated && " (extinct)"}
                </Text>
                <Text
                  as="span"
                  size="xs"
                  style={{
                    fontFamily: "FuturaHandwritten",
                    color: "rgba(255,255,255,0.6)",
                    fontSize: "0.75rem",
                  }}
                >
                  {entry.count} {score && `· avg ${score.avgScore.toFixed(1)}`}
                </Text>
              </div>
              {/* Population bar */}
              <div
                style={{
                  height: "16px",
                  background: "rgba(255,255,255,0.05)",
                  borderRadius: "8px",
                  overflow: "hidden",
                  marginBottom: "3px",
                }}
              >
                <div
                  style={{
                    height: "100%",
                    width: `${barWidth}%`,
                    background: info.color,
                    borderRadius: "8px",
                    transition: "width 0.6s ease",
                    opacity: 0.85,
                  }}
                />
              </div>
              {/* Score bar (only after tournament played) */}
              {score && (
                <div
                  style={{
                    height: "4px",
                    background: "rgba(255,255,255,0.05)",
                    borderRadius: "2px",
                    overflow: "hidden",
                  }}
                >
                  <div
                    style={{
                      height: "100%",
                      width: `${scoreBarWidth}%`,
                      background: "rgba(255,255,255,0.3)",
                      borderRadius: "2px",
                      transition: "width 0.6s ease",
                    }}
                  />
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Controls */}
      <div
        style={{
          display: "flex",
          gap: "10px",
          justifyContent: "center",
          marginBottom: "20px",
          flexWrap: "wrap",
        }}
      >
        <Button
          onClick={playTournament}
          disabled={stage !== "rest" || !!winner}
          size="md"
          style={{ fontFamily: "FuturaHandwritten", width: "130px" }}
        >
          {stage === "playing" ? "⚔️ Playing..." : "⚔️ Play Tournament"}
        </Button>
        <Button
          onClick={evolve}
          disabled={stage !== "rest" || scores.length === 0 || !!winner}
          variant="secondary"
          size="md"
          style={{ fontFamily: "FuturaHandwritten", width: "130px" }}
        >
          {stage === "eliminating"
            ? "💀..."
            : stage === "reproducing"
              ? "🌱..."
              : "🧬 Evolve"}
        </Button>
        <Button
          onClick={() => {
            if (autoPlay) {
              setAutoPlay(false);
            } else {
              setAutoPlay(true);
              // If no scores yet, start by playing
              if (scores.length === 0 && stage === "rest") {
                playTournament();
              }
            }
          }}
          disabled={!!winner}
          variant="secondary"
          size="md"
          style={{
            fontFamily: "FuturaHandwritten",
            width: "120px",
            background: autoPlay ? "rgba(102, 126, 234, 0.3)" : "transparent",
          }}
        >
          {autoPlay ? "⏸ Stop" : "▶ Auto-play"}
        </Button>
        <Button
          onClick={reset}
          variant="secondary"
          size="md"
          style={{ fontFamily: "FuturaHandwritten", width: "100px" }}
        >
          🔄 Reset
        </Button>
      </div>

      {/* Settings: noise + turns sliders */}
      <div
        style={{
          background: "rgba(255,255,255,0.05)",
          borderRadius: "12px",
          padding: "16px",
          marginBottom: "20px",
          border: "1px solid rgba(255,255,255,0.08)",
        }}
      >
        <Text
          as="p"
          size="sm"
          style={{
            fontFamily: "FuturaHandwritten",
            color: "rgba(255,255,255,0.7)",
            margin: "0 0 12px 0",
            fontSize: "0.85rem",
            textAlign: "left",
          }}
        >
          🎛️ Tournament Settings
        </Text>

        {/* Noise slider */}
        <div style={{ marginBottom: "14px" }}>
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              marginBottom: "4px",
            }}
          >
            <Text
              as="span"
              size="xs"
              style={{
                fontFamily: "FuturaHandwritten",
                color: "rgba(255,255,255,0.6)",
                fontSize: "0.8rem",
              }}
            >
              💨 Noise (mistake probability)
            </Text>
            <Text
              as="span"
              size="xs"
              style={{
                fontFamily: "FuturaHandwritten",
                color: config.noise > 0.1 ? "#ffb050" : "rgba(255,255,255,0.6)",
                fontSize: "0.8rem",
                fontWeight: "bold",
              }}
            >
              {(config.noise * 100).toFixed(0)}%
            </Text>
          </div>
          <input
            type="range"
            min="0"
            max="0.5"
            step="0.01"
            value={config.noise}
            onChange={(e) => {
              setConfig({ ...config, noise: parseFloat(e.target.value) });
              setScores([]); // Clear stale scores
            }}
            disabled={stage !== "rest"}
            style={{ width: "100%", accentColor: "#667eea" }}
          />
          <Text
            as="p"
            size="xs"
            style={{
              fontFamily: "FuturaHandwritten",
              color: "rgba(255,255,255,0.4)",
              margin: "4px 0 0 0",
              fontSize: "0.72rem",
              textAlign: "left",
            }}
          >
            {config.noise === 0
              ? "Perfect communication — no mistakes"
              : config.noise < 0.05
                ? "Rare slips — forgiving strategies still thrive"
                : config.noise < 0.15
                  ? "Frequent mistakes — TFT struggles, TF2T and Generous TFT take over"
                  : "Chaos — noise drowns out strategy. Nobody dominates."}
          </Text>
        </div>

        {/* Turns per match slider */}
        <div style={{ marginBottom: "14px" }}>
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              marginBottom: "4px",
            }}
          >
            <Text
              as="span"
              size="xs"
              style={{
                fontFamily: "FuturaHandwritten",
                color: "rgba(255,255,255,0.6)",
                fontSize: "0.8rem",
              }}
            >
              🔁 Rounds per match
            </Text>
            <Text
              as="span"
              size="xs"
              style={{
                fontFamily: "FuturaHandwritten",
                color: "rgba(255,255,255,0.6)",
                fontSize: "0.8rem",
                fontWeight: "bold",
              }}
            >
              {config.turnsPerMatch}
            </Text>
          </div>
          <input
            type="range"
            min="3"
            max="30"
            step="1"
            value={config.turnsPerMatch}
            onChange={(e) => {
              setConfig({ ...config, turnsPerMatch: parseInt(e.target.value) });
              setScores([]);
            }}
            disabled={stage !== "rest"}
            style={{ width: "100%", accentColor: "#667eea" }}
          />
        </div>

        {/* Selection size */}
        <div>
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              marginBottom: "4px",
            }}
          >
            <Text
              as="span"
              size="xs"
              style={{
                fontFamily: "FuturaHandwritten",
                color: "rgba(255,255,255,0.6)",
                fontSize: "0.8rem",
              }}
            >
              ⚖️ Selection pressure (eliminate/reproduce)
            </Text>
            <Text
              as="span"
              size="xs"
              style={{
                fontFamily: "FuturaHandwritten",
                color: "rgba(255,255,255,0.6)",
                fontSize: "0.8rem",
                fontWeight: "bold",
              }}
            >
              {config.selectionSize}
            </Text>
          </div>
          <input
            type="range"
            min="1"
            max="8"
            step="1"
            value={config.selectionSize}
            onChange={(e) => {
              setConfig({ ...config, selectionSize: parseInt(e.target.value) });
              setScores([]);
            }}
            disabled={stage !== "rest"}
            style={{ width: "100%", accentColor: "#667eea" }}
          />
        </div>
      </div>

      {/* Score table (after tournament played) */}
      {scores.length > 0 && (
        <div
          className="tf-fade-in-up"
          style={{
            background: "rgba(255,255,255,0.95)",
            borderRadius: "12px",
            padding: "16px",
            marginBottom: "20px",
          }}
        >
          <Text
            as="h4"
            size="sm"
            style={{
              fontFamily: "FuturaHandwritten",
              color: "#333",
              margin: "0 0 12px 0",
              textAlign: "center",
            }}
          >
            📊 Generation {generation} — Tournament Results
          </Text>
          <table
            style={{
              width: "100%",
              borderCollapse: "collapse",
              fontSize: "13px",
              fontFamily: "FuturaHandwritten",
            }}
          >
            <thead>
              <tr style={{ borderBottom: "2px solid #ddd" }}>
                <th
                  style={{
                    padding: "6px 4px",
                    color: "#666",
                    textAlign: "left",
                  }}
                >
                  Strategy
                </th>
                <th style={{ padding: "6px 4px", color: "#666" }}>Pop</th>
                <th style={{ padding: "6px 4px", color: "#666" }}>Avg Score</th>
                <th style={{ padding: "6px 4px", color: "#666" }}>Total</th>
              </tr>
            </thead>
            <tbody>
              {scores.map((s, i) => (
                <tr
                  key={s.strategyId}
                  style={{
                    borderBottom: "1px solid #eee",
                    background:
                      i === 0 ? "rgba(76, 175, 80, 0.05)" : "transparent",
                  }}
                >
                  <td
                    style={{
                      padding: "6px 4px",
                      color: s.color,
                      fontWeight: i === 0 ? "bold" : "normal",
                      textAlign: "left",
                    }}
                  >
                    {i === 0 && "👑 "}
                    {s.emoji} {s.name}
                  </td>
                  <td style={{ padding: "6px 4px", color: "#333" }}>
                    {s.population}
                  </td>
                  <td
                    style={{
                      padding: "6px 4px",
                      color: i === 0 ? "#4CAF50" : "#333",
                      fontWeight: i === 0 ? "bold" : "normal",
                    }}
                  >
                    {s.avgScore.toFixed(1)}
                  </td>
                  <td style={{ padding: "6px 4px", color: "#999" }}>
                    {s.totalScore}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Evolution history mini-chart */}
      {history.length > 0 && (
        <div
          style={{
            background: "rgba(255,255,255,0.08)",
            borderRadius: "12px",
            padding: "16px",
            marginBottom: "20px",
            border: "1px solid rgba(255,255,255,0.1)",
          }}
        >
          <Text
            as="h4"
            size="sm"
            style={{
              fontFamily: "FuturaHandwritten",
              color: "rgba(255,255,255,0.7)",
              margin: "0 0 12px 0",
              textAlign: "center",
            }}
          >
            📈 Population Over Generations
          </Text>
          <div
            style={{
              display: "flex",
              gap: "4px",
              alignItems: "flex-end",
              height: "60px",
              overflowX: "auto",
              paddingBottom: "4px",
            }}
          >
            {/* Generation 0 (initial) */}
            <div
              style={{
                minWidth: "30px",
                display: "flex",
                flexDirection: "column",
                justifyContent: "flex-end",
                height: "100%",
              }}
            >
              {DEFAULT_POPULATION.map((e) => {
                const info = getStrategyInfo(e.strategyId);
                return (
                  <div
                    key={e.strategyId}
                    style={{
                      height: `${(e.count / 25) * 100}%`,
                      background: info.color,
                      opacity: 0.7,
                      minHeight: "2px",
                    }}
                    title={`${info.name}: ${e.count}`}
                  />
                );
              })}
            </div>
            {history.map((h) => {
              const total =
                Object.values(h.pop).reduce((a, b) => a + b, 0) || 1;
              return (
                <div
                  key={h.gen}
                  style={{
                    minWidth: "30px",
                    display: "flex",
                    flexDirection: "column",
                    justifyContent: "flex-end",
                    height: "100%",
                  }}
                  title={`Gen ${h.gen}`}
                >
                  {Object.entries(h.pop).map(([id, count]) => {
                    const info = getStrategyInfo(id as StrategyId);
                    return (
                      <div
                        key={id}
                        style={{
                          height: `${(count / total) * 100}%`,
                          background: info.color,
                          opacity: 0.7,
                          minHeight: count > 0 ? "2px" : "0",
                        }}
                        title={`${info.name}: ${count}`}
                      />
                    );
                  })}
                </div>
              );
            })}
          </div>
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              marginTop: "4px",
            }}
          >
            <Text
              as="span"
              size="xs"
              style={{ color: "rgba(255,255,255,0.4)", fontSize: "0.7rem" }}
            >
              Gen 0
            </Text>
            <Text
              as="span"
              size="xs"
              style={{ color: "rgba(255,255,255,0.4)", fontSize: "0.7rem" }}
            >
              Gen {generation}
            </Text>
          </div>
        </div>
      )}

      {/* Legend */}
      <div
        style={{
          display: "flex",
          flexWrap: "wrap",
          gap: "8px",
          justifyContent: "center",
        }}
      >
        {DEFAULT_POPULATION.map((e) => {
          const info = getStrategyInfo(e.strategyId);
          const extinct = !population.find(
            (p) => p.strategyId === e.strategyId,
          );
          return (
            <div
              key={e.strategyId}
              style={{
                display: "flex",
                alignItems: "center",
                gap: "4px",
                opacity: extinct ? 0.3 : 1,
              }}
            >
              <div
                style={{
                  width: "10px",
                  height: "10px",
                  borderRadius: "50%",
                  background: info.color,
                }}
              />
              <Text
                as="span"
                size="xs"
                style={{
                  fontFamily: "FuturaHandwritten",
                  color: "rgba(255,255,255,0.5)",
                  fontSize: "0.72rem",
                }}
              >
                {info.name}
              </Text>
            </div>
          );
        })}
      </div>
    </div>
  );
};
