import {
  createStrategy,
  playRepeatedGame,
  type IteratedStrategy,
  type StrategyId,
  type PayoffMatrix,
  NC_DEFAULT,
} from "./strategies";

export interface PopulationEntry {
  strategyId: StrategyId;
  count: number;
}

export interface StrategyScore {
  strategyId: StrategyId;
  name: string;
  emoji: string;
  color: string;
  totalScore: number;
  avgScore: number;
  population: number;
}

export interface TournamentResult {
  scores: StrategyScore[];
  generation: number;
}

export interface EvolutionConfig {
  turnsPerMatch: number;
  noise: number; // 0-1
  selectionSize: number; // how many to eliminate + reproduce
  payoffs: PayoffMatrix;
}

/**
 * Run a full round-robin tournament between all strategies in the population.
 * Each pair plays `turns` rounds (with noise). Returns scores per strategy.
 */
export function runTournament(
  population: PopulationEntry[],
  config: EvolutionConfig,
): Map<StrategyId, { total: number; count: number }> {
  // Build agent list: each individual agent is a strategy instance
  const agents: { strategyId: StrategyId; strategy: IteratedStrategy }[] = [];
  for (const entry of population) {
    for (let i = 0; i < entry.count; i++) {
      agents.push({
        strategyId: entry.strategyId,
        strategy: createStrategy(entry.strategyId),
      });
    }
  }

  // Score tracking per strategy ID
  const scores = new Map<StrategyId, { total: number; count: number }>();
  for (const entry of population) {
    scores.set(entry.strategyId, { total: 0, count: 0 });
  }

  // Round-robin: every agent plays every other agent
  for (let i = 0; i < agents.length; i++) {
    for (let j = i + 1; j < agents.length; j++) {
      const result = playRepeatedGame(
        agents[i].strategy,
        agents[j].strategy,
        config.turnsPerMatch,
        config.noise,
        config.payoffs,
      );
      const sA = scores.get(agents[i].strategyId)!;
      const sB = scores.get(agents[j].strategyId)!;
      sA.total += result.totalA;
      sA.count++;
      sB.total += result.totalB;
      sB.count++;
    }
  }

  return scores;
}

/**
 * Evolve the population: eliminate the worst-performing strategies,
 * reproduce the best-performing ones.
 */
export function evolvePopulation(
  population: PopulationEntry[],
  scores: Map<StrategyId, { total: number; count: number }>,
  selectionSize: number,
): PopulationEntry[] {
  // Calculate average score per strategy
  const avgScores = population.map((entry) => {
    const s = scores.get(entry.strategyId);
    const avg = s && s.count > 0 ? s.total / s.count : 0;
    return { ...entry, avgScore: avg };
  });

  // Sort by average score (best first)
  avgScores.sort((a, b) => b.avgScore - a.avgScore);

  // Eliminate from the worst, reproduce to the best
  // We eliminate one individual from each of the bottom `selectionSize` strategies
  // and add one individual to each of the top `selectionSize` strategies
  const newPop = avgScores.map((e) => ({
    strategyId: e.strategyId,
    count: e.count,
  }));

  // Eliminate from worst (but don't go below 0)
  for (let i = 0; i < selectionSize; i++) {
    const idx = newPop.length - 1 - i;
    if (idx >= 0 && newPop[idx].count > 0) {
      newPop[idx].count--;
    }
  }

  // Reproduce to best
  for (let i = 0; i < selectionSize; i++) {
    if (i < newPop.length) {
      newPop[i].count++;
    }
  }

  // Remove extinct strategies
  return newPop.filter((e) => e.count > 0);
}

/**
 * Default starting population (matching Nicky Case's setup)
 */
export const DEFAULT_POPULATION: PopulationEntry[] = [
  { strategyId: "tft", count: 3 },
  { strategyId: "all_d", count: 3 },
  { strategyId: "all_c", count: 3 },
  { strategyId: "grudge", count: 3 },
  { strategyId: "prober", count: 3 },
  { strategyId: "tf2t", count: 3 },
  { strategyId: "pavlov", count: 3 },
  { strategyId: "gtft", count: 2 },
  { strategyId: "random", count: 2 },
];

export const DEFAULT_CONFIG: EvolutionConfig = {
  turnsPerMatch: 10,
  noise: 0,
  selectionSize: 5,
  payoffs: NC_DEFAULT,
};
