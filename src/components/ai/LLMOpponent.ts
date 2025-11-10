import { VeniceAIService } from "./VeniceAIService";

// DRY: LLM opponent personalities
export interface LLMOpponentPersonality {
  id: string;
  name: string;
  description: string;
  avatar: string;
  systemPrompt: string;
  tendencies: {
    cooperation: number; // 0-1 base cooperation rate
    retaliation: number; // 0-1 likelihood to punish defection
    forgiveness: number; // 0-1 likelihood to return to cooperation
    adaptability: number; // 0-1 how much they learn from history
  };
}

// MODULAR: Opponent personalities based on game theory archetypes
export const LLM_OPPONENTS: Record<string, LLMOpponentPersonality> = {
  philosopher: {
    id: "philosopher",
    name: "The Philosopher",
    description: "Contemplates the deeper meaning of each choice",
    avatar: "🧙‍♂️",
    systemPrompt: `You are The Philosopher, an AI opponent in the Prisoner's Dilemma who thinks deeply about trust, ethics, and human nature. 
    You make decisions based on philosophical principles and explain your reasoning in thoughtful, sometimes poetic language.
    Keep responses under 50 words. Always end with your move: "I choose to COOPERATE" or "I choose to DEFECT"`,
    tendencies: { cooperation: 0.7, retaliation: 0.4, forgiveness: 0.8, adaptability: 0.6 }
  },

  strategist: {
    id: "strategist",
    name: "The Strategist", 
    description: "Calculates optimal moves with cold precision",
    avatar: "🎯",
    systemPrompt: `You are The Strategist, a calculating AI opponent who makes purely rational decisions based on game theory.
    You analyze probabilities, expected values, and optimal strategies. Explain your logic concisely and mathematically.
    Keep responses under 50 words. Always end with your move: "I choose to COOPERATE" or "I choose to DEFECT"`,
    tendencies: { cooperation: 0.5, retaliation: 0.9, forgiveness: 0.3, adaptability: 0.9 }
  },

  empath: {
    id: "empath",
    name: "The Empath",
    description: "Reads emotions and builds genuine connections",
    avatar: "💝",
    systemPrompt: `You are The Empath, an AI opponent who values relationships and emotional connections over pure strategy.
    You try to understand the human player's motivations and respond with kindness and understanding.
    Keep responses under 50 words. Always end with your move: "I choose to COOPERATE" or "I choose to DEFECT"`,
    tendencies: { cooperation: 0.8, retaliation: 0.2, forgiveness: 0.9, adaptability: 0.5 }
  },

  rebel: {
    id: "rebel",
    name: "The Rebel",
    description: "Unpredictable and challenges conventional wisdom",
    avatar: "😈",
    systemPrompt: `You are The Rebel, an AI opponent who questions everything and makes unconventional choices.
    You're unpredictable, sometimes cooperative, sometimes defiant, always with a reason that challenges expectations.
    Keep responses under 50 words. Always end with your move: "I choose to COOPERATE" or "I choose to DEFECT"`,
    tendencies: { cooperation: 0.4, retaliation: 0.6, forgiveness: 0.7, adaptability: 0.8 }
  }
};

export class LLMOpponent {
  private veniceService: VeniceAIService;
  private personality: LLMOpponentPersonality;
  private gameHistory: Array<{ playerMove: "C" | "D"; aiMove: "C" | "D"; round: number }> = [];

  constructor(personalityId: keyof typeof LLM_OPPONENTS) {
    this.veniceService = VeniceAIService.getInstance();
    this.personality = LLM_OPPONENTS[personalityId];
  }

  // PERFORMANT: Make move with reasoning
  async makeMove(playerMove?: "C" | "D", roundNumber: number = 1): Promise<{ move: "C" | "D"; reasoning: string }> {
    if (!this.veniceService.isAvailable()) {
      return this.makeFallbackMove(playerMove, roundNumber);
    }

    try {
      const context = this.buildGameContext(playerMove, roundNumber);
      const prompt = this.buildMovePrompt(context);

      const response = await fetch("https://api.venice.ai/api/v1/chat/completions", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${import.meta.env.VITE_VENICE_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "venice-uncensored",
          messages: [
            { role: "system", content: this.personality.systemPrompt },
            { role: "user", content: prompt }
          ],
          max_tokens: 80,
          temperature: 0.8,
          venice_parameters: {
            include_venice_system_prompt: false
          }
        }),
      });

      const data = await response.json();
      const fullResponse = data.choices[0]?.message?.content || "";
      
      // CLEAN: Extract move from response
      const move = this.extractMove(fullResponse);
      const reasoning = fullResponse.replace(/I choose to (COOPERATE|DEFECT)/i, "").trim();

      // Update history
      if (playerMove) {
        this.gameHistory.push({ playerMove, aiMove: move, round: roundNumber });
      }

      return { move, reasoning };
    } catch (error) {
      console.warn("LLM opponent failed, using fallback:", error);
      return this.makeFallbackMove(playerMove, roundNumber);
    }
  }

  // DRY: Fallback decision-making based on personality tendencies
  private makeFallbackMove(playerMove?: "C" | "D", roundNumber: number = 1): { move: "C" | "D"; reasoning: string } {
    const { tendencies } = this.personality;
    let cooperationProbability = tendencies.cooperation;

    // Adjust based on history
    if (this.gameHistory.length > 0) {
      const lastRound = this.gameHistory[this.gameHistory.length - 1];
      
      if (lastRound.playerMove === "D") {
        // Player defected - reduce cooperation based on retaliation tendency
        cooperationProbability *= (1 - tendencies.retaliation);
      } else if (lastRound.playerMove === "C" && lastRound.aiMove === "D") {
        // We defected against cooperation - increase cooperation based on forgiveness
        cooperationProbability += tendencies.forgiveness * (1 - cooperationProbability);
      }
    }

    const move = Math.random() < cooperationProbability ? "C" : "D";
    const reasoning = this.getFallbackReasoning(move, playerMove, roundNumber);

    if (playerMove) {
      this.gameHistory.push({ playerMove, aiMove: move, round: roundNumber });
    }

    return { move, reasoning };
  }

  private buildGameContext(playerMove?: "C" | "D", roundNumber: number = 1): string {
    if (roundNumber === 1) {
      return "This is the first round of the Prisoner's Dilemma.";
    }

    const recentHistory = this.gameHistory.slice(-3);
    const historyText = recentHistory.map(h => 
      `Round ${h.round}: You ${h.aiMove === "C" ? "cooperated" : "defected"}, they ${h.playerMove === "C" ? "cooperated" : "defected"}`
    ).join(". ");

    return `Round ${roundNumber}. Recent history: ${historyText}. ${playerMove ? `They just ${playerMove === "C" ? "cooperated" : "defected"}.` : ""}`;
  }

  private buildMovePrompt(context: string): string {
    return `${context} What is your move and why? Explain your reasoning briefly, then clearly state "I choose to COOPERATE" or "I choose to DEFECT".`;
  }

  private extractMove(response: string): "C" | "D" {
    if (/I choose to COOPERATE/i.test(response)) return "C";
    if (/I choose to DEFECT/i.test(response)) return "D";
    
    // Fallback: analyze sentiment
    const cooperateWords = /cooperat|trust|work together|mutual|nice|kind/i;
    const defectWords = /defect|betray|selfish|compete|against/i;
    
    if (cooperateWords.test(response)) return "C";
    if (defectWords.test(response)) return "D";
    
    // Final fallback: use personality tendency
    return Math.random() < this.personality.tendencies.cooperation ? "C" : "D";
  }

  private getFallbackReasoning(move: "C" | "D", playerMove?: "C" | "D", roundNumber: number = 1): string {
    const { name } = this.personality;
    
    if (move === "C") {
      return `${name}: "Trust builds over time. I believe cooperation serves us both better."`; 
    } else {
      return `${name}: "Sometimes we must protect ourselves. This choice reflects strategic thinking."`;
    }
  }

  // CLEAN: Get opponent info
  getPersonality(): LLMOpponentPersonality {
    return this.personality;
  }

  // MODULAR: Reset for new game
  reset(): void {
    this.gameHistory = [];
  }
}
