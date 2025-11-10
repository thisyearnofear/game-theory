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

// DRY: Game theory personas inspired by public domain concepts
export const AI_PERSONAS: Record<string, AIPersona> = {
  // Based on Nash (public figure, mathematical concepts)
  equilibrium: {
    id: "equilibrium",
    name: "Dr. Nash",
    description: "The Equilibrium Expert - Finds balance in chaos",
    personality: "Analytical mathematician who sees patterns everywhere",
    avatar: "🧮",
    voiceStyle: "formal",
    specialties: ["Nash Equilibrium", "Strategic Balance", "Mathematical Analysis"],
    catchphrases: [
      "Every game has an equilibrium point...",
      "Let's find the mathematical beauty in this decision",
      "The optimal strategy emerges from careful analysis"
    ]
  },

  // Based on Prisoner's Dilemma folklore
  prisoner: {
    id: "prisoner",
    name: "The Warden",
    description: "The Dilemma Master - Understands the psychology of choice",
    personality: "Wise observer of human nature and difficult decisions",
    avatar: "⚖️",
    voiceStyle: "wise",
    specialties: ["Prisoner's Dilemma", "Trust Building", "Cooperation"],
    catchphrases: [
      "Every choice reveals character...",
      "Trust is earned through repeated interactions",
      "The real prison is our own assumptions"
    ]
  },

  // Based on evolutionary game theory
  darwin: {
    id: "darwin",
    name: "Professor Evolution",
    description: "The Adaptation Specialist - Sees how strategies evolve",
    personality: "Curious naturalist fascinated by behavioral adaptation",
    avatar: "🧬",
    voiceStyle: "casual",
    specialties: ["Evolutionary Strategies", "Population Dynamics", "Adaptation"],
    catchphrases: [
      "Strategies that survive are strategies that thrive...",
      "Nature teaches us about cooperation",
      "The fittest strategy isn't always the strongest"
    ]
  },

  // Based on behavioral economics
  behavioral: {
    id: "behavioral",
    name: "Dr. Nudge",
    description: "The Behavior Detective - Reveals hidden biases",
    personality: "Playful psychologist who loves uncovering mental shortcuts",
    avatar: "🧠",
    voiceStyle: "playful",
    specialties: ["Cognitive Biases", "Behavioral Economics", "Decision Psychology"],
    catchphrases: [
      "Your brain is playing tricks on you...",
      "Humans aren't perfectly rational, and that's beautiful!",
      "Let's peek behind the curtain of decision-making"
    ]
  },

  // Based on auction theory and mechanism design
  auctioneer: {
    id: "auctioneer",
    name: "The Mechanism Designer",
    description: "The Incentive Architect - Designs systems that work",
    personality: "Strategic designer who creates fair systems",
    avatar: "🏛️",
    voiceStyle: "formal",
    specialties: ["Mechanism Design", "Incentive Alignment", "Market Design"],
    catchphrases: [
      "Good systems align individual and collective interests...",
      "The right incentives make cooperation inevitable",
      "Design the game, and the outcomes follow"
    ]
  },

  // Based on network theory and social dynamics
  network: {
    id: "network",
    name: "The Connector",
    description: "The Network Navigator - Maps relationships and influence",
    personality: "Social scientist fascinated by connections and communities",
    avatar: "🕸️",
    voiceStyle: "casual",
    specialties: ["Network Effects", "Social Dynamics", "Reputation Systems"],
    catchphrases: [
      "We're all connected in the web of trust...",
      "Your reputation travels faster than you do",
      "Strong networks amplify cooperation"
    ]
  }
};

// PERFORMANT: Context-aware persona selection
export function selectPersonaForContext(context: string): AIPersona {
  const contextMap: Record<string, string> = {
    "oneoff": "prisoner",
    "iterated": "darwin", 
    "tournament": "equilibrium",
    "behavioral": "behavioral",
    "network": "network",
    "mechanism": "auctioneer"
  };
  
  const personaId = contextMap[context] || "prisoner";
  return AI_PERSONAS[personaId];
}

// MODULAR: Generate contextual advice based on persona
export function generatePersonaResponse(
  persona: AIPersona, 
  responseType: "advice" | "explanation" | "encouragement"
): string {
  const { catchphrases, specialties } = persona;
  const randomPhrase = catchphrases[Math.floor(Math.random() * catchphrases.length)];
  
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
