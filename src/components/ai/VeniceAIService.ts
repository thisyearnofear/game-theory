// SINGLE SOURCE OF TRUTH: Venice AI integration
interface VeniceResponse {
  choices: Array<{
    message: {
      content: string;
    };
  }>;
}

interface GameContext {
  playerMove?: "C" | "D";
  aiMove?: "C" | "D";
  outcome?: "win" | "lose" | "tie";
  stake?: number;
  aiStrategy?: string;
  roundNumber?: number;
  history?: Array<Record<string, unknown>>;
}

export class VeniceAIService {
  private static instance: VeniceAIService;
  private apiKey: string;
  private baseURL = "https://api.venice.ai/api/v1";
  private model = "venice-uncensored"; // Fast, uncensored model for tutoring

  constructor() {
    // ENHANCEMENT: Get API key from environment or user input
    this.apiKey = String(import.meta.env.VITE_VENICE_API_KEY || "");
  }

  static getInstance(): VeniceAIService {
    if (!VeniceAIService.instance) {
      VeniceAIService.instance = new VeniceAIService();
    }
    return VeniceAIService.instance;
  }

  // PERFORMANT: Check if service is available
  isAvailable(): boolean {
    return !!this.apiKey;
  }

  // MODULAR: Generate persona-specific tutoring advice
  async generateTutorAdvice(
    personaName: string,
    personaStyle: string,
    context: GameContext,
    requestType: "welcome" | "advice" | "explanation" | "encouragement" = "advice"
  ): Promise<string> {
    if (!this.isAvailable()) {
      return this.getFallbackResponse(personaName, requestType);
    }

    try {
      const systemPrompt = this.buildSystemPrompt(personaName, personaStyle, requestType);
      const userPrompt = this.buildUserPrompt(context, requestType);

      const response = await fetch(`${this.baseURL}/chat/completions`, {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${this.apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: this.model,
          messages: [
            { role: "system", content: systemPrompt },
            { role: "user", content: userPrompt }
          ],
          max_tokens: 150, // PERFORMANT: Keep responses concise
          temperature: 0.7,
          venice_parameters: {
            include_venice_system_prompt: false // Use our custom prompts
          }
        }),
      });

      if (!response.ok) {
        throw new Error(`Venice API error: ${response.status}`);
      }

      const data: VeniceResponse = await response.json() as VeniceResponse;
      return data.choices[0]?.message?.content || this.getFallbackResponse(personaName, requestType);
    } catch (error) {
      console.warn("Venice AI request failed, using fallback:", error);
      return this.getFallbackResponse(personaName, requestType);
    }
  }

  // DRY: Build system prompts for different personas
  private buildSystemPrompt(personaName: string, personaStyle: string, requestType: string): string {
    const basePrompt = `You are ${personaName}, an AI tutor teaching game theory through the Prisoner's Dilemma. 
Your personality: ${personaStyle}
CRITICAL: Keep responses under 50 words. Be concise, direct, and impactful.`;

    const typePrompts = {
      welcome: "Give a brief, friendly introduction (max 2 sentences).",
      advice: "Provide strategic advice in 1-2 sentences. Focus on key game theory concepts.",
      explanation: "Explain what happened in 1-2 sentences. Be insightful but brief.",
      encouragement: "Encourage the player in 1-2 sentences. Be supportive and motivating."
    };

    return `${basePrompt}\n\n${typePrompts[requestType as keyof typeof typePrompts]}`;
  }

  // CLEAN: Build context-aware user prompts
  private buildUserPrompt(context: GameContext, requestType: string): string {
    if (requestType === "welcome") {
      return "Introduce yourself and explain what we'll learn about trust and cooperation.";
    }

    if (!context.playerMove) {
      return "The player is about to make their first move in the Prisoner's Dilemma. Give them strategic guidance.";
    }

    const moveText = context.playerMove === "C" ? "cooperated" : "defected";
    const aiMoveText = context.aiMove === "C" ? "cooperated" : "defected";
    const outcomeText = context.outcome === "win" ? "won" : context.outcome === "lose" ? "lost" : "tied";

    switch (requestType) {
      case "advice":
        return `The player just ${moveText} against ${context.aiStrategy} AI and ${outcomeText}. What strategic advice would you give for future rounds?`;
      
      case "explanation":
        return `Player ${moveText}, AI ${aiMoveText}, player ${outcomeText}. Explain this outcome using game theory concepts.`;
      
      case "encouragement":
        return `The player ${moveText} and ${outcomeText}. Encourage their learning about cooperation and trust.`;
      
      default:
        return "Provide helpful game theory guidance.";
    }
  }

  // ENHANCEMENT: Fallback responses when Venice is unavailable
  private getFallbackResponse(personaName: string, requestType: string): string {
    const fallbacks = {
      "Dr. Nash": {
        welcome: "I'm Dr. Nash, your equilibrium expert. Every game has a mathematical balance point - let's find yours!",
        advice: "Consider the Nash equilibrium - what's your best response given their likely strategy?",
        explanation: "This outcome demonstrates strategic interdependence - your payoff depends on both players' choices.",
        encouragement: "You're learning the mathematics of cooperation! Each game teaches us about strategic balance."
      },
      "The Warden": {
        welcome: "I'm The Warden, master of dilemmas. Trust is earned through repeated choices - let's explore how.",
        advice: "In the real world, reputation matters. How does this choice affect future interactions?",
        explanation: "This reveals the tension between individual gain and mutual benefit - the heart of the dilemma.",
        encouragement: "Every choice reveals character. You're learning the psychology of trust and cooperation."
      },
      "Professor Evolution": {
        welcome: "I'm Professor Evolution! Strategies that survive are strategies that thrive. Let's see what adapts.",
        advice: "Think like evolution - which strategies would survive in a population of players?",
        explanation: "Natural selection favors strategies that work well against the population they face.",
        encouragement: "You're discovering how cooperation evolves! Each game is a step in the evolutionary process."
      }
    };

    const persona = fallbacks[personaName as keyof typeof fallbacks];
    return persona?.[requestType as keyof typeof persona] || "Let's explore the fascinating world of game theory together!";
  }

  // MODULAR: Generate LLM opponent moves (future enhancement)
  generateOpponentMove(): { move: "C" | "D"; reasoning: string } {
    // This would be implemented for LLM opponents
    // For now, return algorithmic behavior
    return {
      move: Math.random() > 0.5 ? "C" : "D",
      reasoning: "I'm still learning to be a better opponent!"
    };
  }
}
