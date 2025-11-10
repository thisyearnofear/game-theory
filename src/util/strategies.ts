export type GameMove = "C" | "D";

export interface AIStrategy {
  name: string;
  description: string;
  getMove: (history?: GameMove[]) => GameMove;
  emoji: string;
}

/**
 * Random strategy: 50/50 chance of cooperate or defect
 */
export const RandomStrategy: AIStrategy = {
  name: "Random",
  description: "Makes random decisions",
  emoji: "🎲",
  getMove: () => (Math.random() > 0.5 ? "C" : "D"),
};

/**
 * Always cooperate: Never defects
 */
export const AlwaysCooperateStrategy: AIStrategy = {
  name: "Always Cooperate",
  description: "Always chooses to cooperate",
  emoji: "🤝",
  getMove: () => "C",
};

/**
 * Always defect: Never cooperates
 */
export const AlwaysDefectStrategy: AIStrategy = {
  name: "Always Defect",
  description: "Always chooses to defect",
  emoji: "⚔️",
  getMove: () => "D",
};

/**
 * Tit-for-Tat: Copies opponent's last move
 * First move is always cooperate
 */
export const TitForTatStrategy: AIStrategy = {
  name: "Tit-for-Tat",
  description: "Copies your last move. Starts with cooperation.",
  emoji: "🔄",
  getMove: (history: GameMove[] = []) => {
    if (history.length === 0) return "C";
    // Return opponent's last move (last element in history)
    return history[history.length - 1];
  },
};

/**
 * Generous Tit-for-Tat: Mostly copies but forgives 10% of the time
 */
export const GenerousTitForTatStrategy: AIStrategy = {
  name: "Generous Tit-for-Tat",
  description: "Mostly copies you, but forgives occasionally",
  emoji: "🙏",
  getMove: (history: GameMove[] = []) => {
    if (history.length === 0) return "C";
    const shouldForgive = Math.random() < 0.1;
    if (shouldForgive && history[history.length - 1] === "D") {
      return "C";
    }
    return history[history.length - 1];
  },
};

/**
 * Suspicious Tit-for-Tat: Defects on first move, then copies
 */
export const SuspiciousTitForTatStrategy: AIStrategy = {
  name: "Suspicious Tit-for-Tat",
  description: "Assumes worst, then copies your moves",
  emoji: "😒",
  getMove: (history: GameMove[] = []) => {
    if (history.length === 0) return "D";
    return history[history.length - 1];
  },
};

/**
 * Win-Stay, Lose-Shift: Keep doing what works, change if losing
 */
export const WinStayLoseShiftStrategy: AIStrategy = {
  name: "Win-Stay, Lose-Shift",
  description: "Repeats winning moves, switches after losses",
  emoji: "📈",
  getMove: (history: GameMove[] = []) => {
    if (history.length === 0) return "C";

    // Simplified: If last mutual cooperation, stay. Otherwise shift.
    // For single round, default to cooperate
    const lastOpponentMove = history[history.length - 1];
    if (lastOpponentMove === "C") return "C";
    return "D";
  },
};

/**
 * Pavlov: Cooperates if both cooperated or both defected last round
 */
export const PavlovStrategy: AIStrategy = {
  name: "Pavlov",
  description: "Cooperates if the outcome was mutual or both defected",
  emoji: "🔔",
  getMove: (history: GameMove[] = []) => {
    if (history.length === 0) return "C";
    // If opponent cooperated, cooperate back. If opponent defected, defect back.
    return history[history.length - 1];
  },
};

/**
 * Occasional Defector: Mostly cooperates but randomly defects
 */
export const OccasionalDefectorStrategy: AIStrategy = {
  name: "Occasional Defector",
  description: "Usually cooperates, but randomly betrays",
  emoji: "😈",
  getMove: (history: GameMove[] = []) => {
    const defectionRate = 0.15;
    return Math.random() < defectionRate ? "D" : "C";
  },
};

// Export all strategies
export const ALL_STRATEGIES: AIStrategy[] = [
  RandomStrategy,
  AlwaysCooperateStrategy,
  AlwaysDefectStrategy,
  TitForTatStrategy,
  GenerousTitForTatStrategy,
  SuspiciousTitForTatStrategy,
  WinStayLoseShiftStrategy,
  PavlovStrategy,
  OccasionalDefectorStrategy,
];

/**
 * Get strategy by name
 */
export const getStrategy = (name: string): AIStrategy => {
  const strategy = ALL_STRATEGIES.find(
    (s) => s.name.toLowerCase() === name.toLowerCase()
  );
  if (!strategy) {
    return RandomStrategy;
  }
  return strategy;
};

/**
 * Calculate payoff for a single round
 */
export const calculatePayoff = (
  playerMove: GameMove,
  aiMove: GameMove,
  stake: number
): { playerPayout: number; aiPayout: number } => {
  if (playerMove === "C" && aiMove === "C") {
    // Both cooperate: Reward
    return { playerPayout: 2 * stake, aiPayout: 2 * stake };
  } else if (playerMove === "C" && aiMove === "D") {
    // Player cooperates, AI defects: Sucker vs Temptation
    return { playerPayout: 0, aiPayout: 3 * stake };
  } else if (playerMove === "D" && aiMove === "C") {
    // Player defects, AI cooperates: Temptation vs Sucker
    return { playerPayout: 3 * stake, aiPayout: 0 };
  } else {
    // Both defect: Punishment
    return { playerPayout: 0, aiPayout: 0 };
  }
};

/**
 * Get emoji representation of move
 */
export const getMoveEmoji = (move: GameMove): string => {
  return move === "C" ? "🤝" : "⚔️";
};

/**
 * Get move explanation
 */
export const getMoveExplanation = (
  playerMove: GameMove,
  aiMove: GameMove,
  aiStrategy: AIStrategy
): string => {
  const playerAction = playerMove === "C" ? "cooperated" : "defected";
  const aiAction = aiMove === "C" ? "cooperated" : "defected";

  let outcome = "";
  if (playerMove === "C" && aiMove === "C") {
    outcome = "Both cooperated - mutual benefit!";
  } else if (playerMove === "C" && aiMove === "D") {
    outcome = "You cooperated but were betrayed";
  } else if (playerMove === "D" && aiMove === "C") {
    outcome = "You exploited their trust";
  } else {
    outcome = "Both defected - mutual loss";
  }

  return `You ${playerAction}, ${aiStrategy.name} ${aiAction}. ${outcome}`;
};
