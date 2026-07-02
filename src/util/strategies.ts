export type GameMove = "C" | "D";

// ============================================================================
// Legacy interface (kept for backward compatibility with ZK components)
// ============================================================================
export interface AIStrategy {
  name: string;
  description: string;
  getMove: (history?: GameMove[]) => GameMove;
  emoji: string;
}

/**
 * Calculate payoff for a single round
 */
export const calculatePayoff = (
  playerMove: GameMove,
  aiMove: GameMove,
  stake: number,
): { playerPayout: number; aiPayout: number } => {
  if (playerMove === "C" && aiMove === "C") {
    return { playerPayout: 2 * stake, aiPayout: 2 * stake };
  } else if (playerMove === "C" && aiMove === "D") {
    return { playerPayout: 0, aiPayout: 3 * stake };
  } else if (playerMove === "D" && aiMove === "C") {
    return { playerPayout: 3 * stake, aiPayout: 0 };
  } else {
    return { playerPayout: 0, aiPayout: 0 };
  }
};

/**
 * Get emoji representation of move
 */
export const getMoveEmoji = (move: GameMove): string => {
  return move === "C" ? "🤝" : "⚔️";
};

// ============================================================================
// Iterated Strategy Interface — stateful, matching Nicky Case's architecture
// Each strategy remembers the history of play and can make decisions based
// on the full interaction, not just the last move.
// ============================================================================

export interface IteratedStrategy {
  readonly id: string;
  readonly name: string;
  readonly description: string;
  readonly emoji: string;
  readonly color: string;
  /** Called each round to get this strategy's move */
  play: () => GameMove;
  /** Called after each round so the strategy can remember what happened */
  remember: (own: GameMove, opponent: GameMove) => void;
  /** Reset to initial state (for starting a new match) */
  reset: () => void;
}

// --- Strategy implementations ---

/** Always Cooperate: trusts unconditionally */
function createAlwaysCooperate(): IteratedStrategy {
  return {
    id: "all_c",
    name: "Always Cooperate",
    description: "Trusts you unconditionally. Always catches you.",
    emoji: "🤝",
    color: "#FF75FF",
    play: () => "C",
    remember: () => {},
    reset: () => {},
  };
}

/** Always Defect: never trusts */
function createAlwaysDefect(): IteratedStrategy {
  return {
    id: "all_d",
    name: "Always Defect",
    description: "Never trusts. Always steps aside.",
    emoji: "⚔️",
    color: "#52537F",
    play: () => "D",
    remember: () => {},
    reset: () => {},
  };
}

/** Random: 50/50 */
function createRandom(): IteratedStrategy {
  return {
    id: "random",
    name: "Random",
    description: "Flips a coin every round. Unpredictable.",
    emoji: "🎲",
    color: "#FF5E5E",
    play: () => (Math.random() > 0.5 ? "C" : "D"),
    remember: () => {},
    reset: () => {},
  };
}

/** Tit-for-Tat: copies opponent's last move, starts with cooperation */
function createTitForTat(): IteratedStrategy {
  let opponentLastMove: GameMove = "C";
  return {
    id: "tft",
    name: "Tit-for-Tat",
    description: "Starts kind. Then does whatever you did last round.",
    emoji: "🔄",
    color: "#4089DD",
    play: () => opponentLastMove,
    remember: (_own, opponent) => {
      opponentLastMove = opponent;
    },
    reset: () => {
      opponentLastMove = "C";
    },
  };
}

/** Tit-for-Two-Tat: only retaliates after TWO betrayals in a row */
function createTitForTwoTat(): IteratedStrategy {
  let consecutiveBetrayals = 0;
  return {
    id: "tf2t",
    name: "Tit-for-Two-Tat",
    description: "Forgives one betrayal. Retaliates after two in a row.",
    emoji: "🫶",
    color: "#88A8CE",
    play: () => (consecutiveBetrayals >= 2 ? "D" : "C"),
    remember: (_own, opponent) => {
      if (opponent === "D") {
        consecutiveBetrayals++;
      } else {
        consecutiveBetrayals = 0;
      }
    },
    reset: () => {
      consecutiveBetrayals = 0;
    },
  };
}

/** Grudge: cooperates until betrayed ONCE, then defects forever */
function createGrudge(): IteratedStrategy {
  let everBetrayed = false;
  return {
    id: "grudge",
    name: "Grudge",
    description: "Cooperates... until you betray once. Then never forgives.",
    emoji: "😤",
    color: "#efc701",
    play: () => (everBetrayed ? "D" : "C"),
    remember: (_own, opponent) => {
      if (opponent === "D") everBetrayed = true;
    },
    reset: () => {
      everBetrayed = false;
    },
  };
}

/** Pavlov: Win-Stay, Lose-Shift. Cooperate if last round went well. */
function createPavlov(): IteratedStrategy {
  let myLastMove: GameMove = "C";
  return {
    id: "pavlov",
    name: "Pavlov",
    description: "Repeats what worked. Switches when it doesn't.",
    emoji: "🔔",
    color: "#86C448",
    play: () => myLastMove,
    remember: (own, opponent) => {
      // Remember the actual move (including noise-flipped)
      myLastMove = own;
      // If opponent defected, switch
      if (opponent === "D") {
        myLastMove = myLastMove === "C" ? "D" : "C";
      }
    },
    reset: () => {
      myLastMove = "C";
    },
  };
}

/** Prober: tests with C-D-C-C, then plays TFT if you retaliated, else All-D */
function createProber(): IteratedStrategy {
  const testSequence: GameMove[] = ["C", "D", "C", "C"];
  let everRetaliated = false;
  let opponentLastMove: GameMove = "C";
  return {
    id: "prober",
    name: "Prober",
    description:
      "Tests you with C-D-C-C. If you don't retaliate, exploits you.",
    emoji: "🔍",
    color: "#f6b24c",
    play: () => {
      if (testSequence.length > 0) {
        return testSequence.shift()!;
      }
      if (everRetaliated) {
        return opponentLastMove; // TFT
      }
      return "D"; // Exploit
    },
    remember: (_own, opponent) => {
      if (testSequence.length > 0) {
        // Still in testing phase
        if (opponent === "D") everRetaliated = true;
      }
      opponentLastMove = opponent;
    },
    reset: () => {
      testSequence.length = 0;
      testSequence.push("C", "D", "C", "C");
      everRetaliated = false;
      opponentLastMove = "C";
    },
  };
}

/** Generous TFT: copies but forgives 10% of betrayals */
function createGenerousTitForTat(): IteratedStrategy {
  let opponentLastMove: GameMove = "C";
  return {
    id: "gtft",
    name: "Generous TFT",
    description: "Like TFT, but forgives 10% of your betrayals.",
    emoji: "🙏",
    color: "#66BB6A",
    play: () => {
      if (opponentLastMove === "D" && Math.random() < 0.1) {
        return "C"; // Forgive
      }
      return opponentLastMove;
    },
    remember: (_own, opponent) => {
      opponentLastMove = opponent;
    },
    reset: () => {
      opponentLastMove = "C";
    },
  };
}

// --- Factory + registry ---

export type StrategyId =
  | "all_c"
  | "all_d"
  | "random"
  | "tft"
  | "tf2t"
  | "grudge"
  | "pavlov"
  | "prober"
  | "gtft";

const STRATEGY_FACTORIES: Record<StrategyId, () => IteratedStrategy> = {
  all_c: createAlwaysCooperate,
  all_d: createAlwaysDefect,
  random: createRandom,
  tft: createTitForTat,
  tf2t: createTitForTwoTat,
  grudge: createGrudge,
  pavlov: createPavlov,
  prober: createProber,
  gtft: createGenerousTitForTat,
};

export const ALL_STRATEGY_IDS: StrategyId[] = [
  "tft",
  "all_c",
  "all_d",
  "tf2t",
  "grudge",
  "pavlov",
  "prober",
  "gtft",
  "random",
];

/** Create a fresh instance of a strategy (with reset state) */
export function createStrategy(id: StrategyId): IteratedStrategy {
  const factory = STRATEGY_FACTORIES[id] ?? createRandom;
  return factory();
}

/** Get strategy metadata without creating an instance */
export function getStrategyInfo(id: StrategyId): {
  name: string;
  description: string;
  emoji: string;
  color: string;
} {
  const s = createStrategy(id);
  return {
    name: s.name,
    description: s.description,
    emoji: s.emoji,
    color: s.color,
  };
}

/** Play a full repeated game between two strategies (for tournament mode) */
export function playRepeatedGame(
  strategyA: IteratedStrategy,
  strategyB: IteratedStrategy,
  rounds: number,
  noise = 0,
): {
  totalA: number;
  totalB: number;
  payoffs: Array<[number, number]>;
  moves: Array<{ a: GameMove; b: GameMove }>;
} {
  strategyA.reset();
  strategyB.reset();

  let totalA = 0;
  let totalB = 0;
  const payoffs: Array<[number, number]> = [];
  const moves: Array<{ a: GameMove; b: GameMove }> = [];

  for (let i = 0; i < rounds; i++) {
    let a = strategyA.play();
    let b = strategyB.play();

    // Apply noise (random mistakes)
    if (Math.random() < noise) a = a === "C" ? "D" : "C";
    if (Math.random() < noise) b = b === "C" ? "D" : "C";

    const result = calculatePayoff(a, b, 1);
    totalA += result.playerPayout;
    totalB += result.aiPayout;
    payoffs.push([result.playerPayout, result.aiPayout]);
    moves.push({ a, b });

    strategyA.remember(a, b);
    strategyB.remember(b, a);
  }

  return { totalA, totalB, payoffs, moves };
}

// ============================================================================
// Legacy strategy objects (backward compat for any code using AIStrategy)
// ============================================================================

export const RandomStrategy: AIStrategy = {
  name: "Random",
  description: "Makes random decisions",
  emoji: "🎲",
  getMove: () => (Math.random() > 0.5 ? "C" : "D"),
};

export const AlwaysCooperateStrategy: AIStrategy = {
  name: "Always Cooperate",
  description: "Always chooses to cooperate",
  emoji: "🤝",
  getMove: () => "C",
};

export const AlwaysDefectStrategy: AIStrategy = {
  name: "Always Defect",
  description: "Always chooses to defect",
  emoji: "⚔️",
  getMove: () => "D",
};

export const TitForTatStrategy: AIStrategy = {
  name: "Tit-for-Tat",
  description: "Copies your last move. Starts with cooperation.",
  emoji: "🔄",
  getMove: (history: GameMove[] = []) => {
    if (history.length === 0) return "C";
    return history[history.length - 1];
  },
};

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

export const SuspiciousTitForTatStrategy: AIStrategy = {
  name: "Suspicious Tit-for-Tat",
  description: "Assumes worst, then copies your moves",
  emoji: "😒",
  getMove: (_history: GameMove[] = []) => {
    if (_history.length === 0) return "D";
    return _history[_history.length - 1];
  },
};

export const WinStayLoseShiftStrategy: AIStrategy = {
  name: "Win-Stay, Lose-Shift",
  description: "Repeats winning moves, switches after losses",
  emoji: "📈",
  getMove: (history: GameMove[] = []) => {
    if (history.length === 0) return "C";
    const lastOpponentMove = history[history.length - 1];
    if (lastOpponentMove === "C") return "C";
    return "D";
  },
};

export const PavlovStrategy: AIStrategy = {
  name: "Pavlov",
  description: "Cooperates if the outcome was mutual or both defected",
  emoji: "🔔",
  getMove: (history: GameMove[] = []) => {
    if (history.length === 0) return "C";
    return history[history.length - 1];
  },
};

export const OccasionalDefectorStrategy: AIStrategy = {
  name: "Occasional Defector",
  description: "Usually cooperates, but randomly betrays",
  emoji: "😈",
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  getMove: (_history: GameMove[] = []) => {
    const defectionRate = 0.15;
    return Math.random() < defectionRate ? "D" : "C";
  },
};

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

export const getStrategy = (name: string): AIStrategy => {
  const strategy = ALL_STRATEGIES.find(
    (s) => s.name.toLowerCase() === name.toLowerCase(),
  );
  if (!strategy) {
    return RandomStrategy;
  }
  return strategy;
};

/**
 * Get move explanation
 */
export const getMoveExplanation = (
  playerMove: GameMove,
  aiMove: GameMove,
  aiStrategy: AIStrategy,
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
