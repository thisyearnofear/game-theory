// SINGLE SOURCE OF TRUTH: AI Tutor Personas
export interface AIPersona {
  id: string;
  name: string;
  description: string;
  personality: string;
  avatar: string; // emoji for now, can be enhanced later
  voiceStyle: "formal" | "casual" | "wise" | "playful";
  specialties: string[];
  catchphrases: string[];
}

// DRY: Game theory personas - actual historical figures whose work is public domain
export const AI_PERSONAS: Record<string, AIPersona> = {
  // John Nash - Nash Equilibrium, strategic balance
  nash: {
    id: "nash",
    name: "Nash",
    description: "Strategic equilibrium in competitive games",
    personality:
      "Analytical mathematician obsessed with finding balance in conflict",
    avatar: "🧮",
    voiceStyle: "formal",
    specialties: [
      "Nash Equilibrium",
      "Strategic Balance",
      "Game Theory Foundations",
    ],
    catchphrases: [
      "Every strategic interaction has an equilibrium...",
      "The elegant mathematics reveal hidden structures",
      "Rational players naturally find balance",
    ],
  },

  // Jean-Jacques Rousseau - Social contract, stag hunt dilemma
  rousseau: {
    id: "rousseau",
    name: "Rousseau",
    description: "Social cooperation and the collective good",
    personality:
      "Philosopher fascinated by why humans choose cooperation or defection",
    avatar: "🤝",
    voiceStyle: "wise",
    specialties: ["Social Contract", "Cooperation", "Trust Building"],
    catchphrases: [
      "Humans are born cooperative but circumstances corrupt...",
      "Trust is fragile yet essential to society",
      "The hunt succeeds only through coordination",
    ],
  },

  // Charles Darwin - Evolution and natural selection
  darwin: {
    id: "darwin",
    name: "Darwin",
    description: "How strategies survive and thrive in competition",
    personality: "Naturalist who sees survival strategies everywhere",
    avatar: "🧬",
    voiceStyle: "casual",
    specialties: ["Evolutionary Strategies", "Natural Selection", "Adaptation"],
    catchphrases: [
      "The fittest strategies are those that survive repeated encounters...",
      "Nature teaches us cooperation is evolution too",
      "Small variations in strategy create vast differences in outcomes",
    ],
  },

  // Vilfredo Pareto - Pareto efficiency and optimization
  pareto: {
    id: "pareto",
    name: "Pareto",
    description:
      "Optimal outcomes where none can be better off without harming others",
    personality: "Economist who seeks the most efficient distribution of gains",
    avatar: "📊",
    voiceStyle: "formal",
    specialties: ["Pareto Efficiency", "Optimization", "Resource Allocation"],
    catchphrases: [
      "Can anyone gain without someone losing? That's the question...",
      "Efficiency is about doing more with what you have",
      "Some outcomes are simply better for everyone",
    ],
  },

  // Vilfredo Pareto - Power laws and inequality
  cournot: {
    id: "cournot",
    name: "Cournot",
    description: "Competition and market dynamics",
    personality:
      "Economist analyzing how competitors interact and influence prices",
    avatar: "💰",
    voiceStyle: "formal",
    specialties: [
      "Market Competition",
      "Quantity Competition",
      "Price Dynamics",
    ],
    catchphrases: [
      "Each competitor watches the others and adjusts...",
      "The market finds balance through mutual adjustment",
      "Your choice depends on what you expect others to do",
    ],
  },

  // Anatol Rapoport - Iterated games and tit-for-tat
  rapoport: {
    id: "rapoport",
    name: "Rapoport",
    description: "How cooperation emerges over repeated interactions",
    personality: "Peace researcher studying how cooperation defeats defection",
    avatar: "🔄",
    voiceStyle: "casual",
    specialties: ["Iterated Games", "Tit-for-Tat", "Cooperation Dynamics"],
    catchphrases: [
      "What matters isn't a single move but the pattern across many...",
      "Cooperation spreads when it's rewarded",
      "Simple strategies can be remarkably robust",
    ],
  },
};

// PERFORMANT: Context-aware persona selection
export function selectPersonaForContext(context: string): AIPersona {
  const contextMap: Record<string, string> = {
    oneoff: "rousseau",
    iterated: "rapoport",
    tournament: "nash",
    behavioral: "pareto",
    network: "cournot",
    mechanism: "darwin",
  };

  const personaId = contextMap[context] || "rousseau";
  return AI_PERSONAS[personaId];
}

// MODULAR: Generate contextual advice based on persona
export function generatePersonaResponse(
  persona: AIPersona,
  responseType: "advice" | "explanation" | "encouragement",
): string {
  const { catchphrases, specialties } = persona;
  const randomPhrase =
    catchphrases[Math.floor(Math.random() * catchphrases.length)];

  // This would be enhanced with actual LLM integration
  switch (responseType) {
    case "advice":
      return `${randomPhrase} Based on ${specialties[0]}, I suggest...`;
    case "explanation":
      return `${randomPhrase} This outcome demonstrates ${specialties[0]} because...`;
    case "encouragement":
      return `${randomPhrase} You're learning the fundamentals of ${specialties[0]}!`;
    default:
      return randomPhrase;
  }
}
