/**
 * Trustfall API — combined Cloudflare Worker entry point
 *
 * Routes:
 *   /api/games*          → matchmaking relay (open game discovery)
 *   /api/ai/tutor        → Venice AI proxy (API key stays server-side)
 *   /api/health          → health check
 *
 * Deploy:
 *   npx wrangler deploy
 *
 * Secrets (set via `wrangler secret put`):
 *   VENICE_API_KEY     — Venice AI API key
 *   STELLAR_RPC_URL    — Soroban RPC endpoint
 *   CONTRACT_ID        — zk_dilemma contract ID
 */

export interface Env {
  VENICE_API_KEY: string;
  STELLAR_RPC_URL: string;
  CONTRACT_ID: string;
  GAME_CACHE: KVNamespace;
}

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
};

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);

    if (request.method === "OPTIONS") {
      return new Response(null, { headers: corsHeaders });
    }

    // Health check
    if (url.pathname === "/api/health") {
      return new Response(
        JSON.stringify({
          status: "ok",
          venice_configured: !!env.VENICE_API_KEY,
          stellar_configured: !!env.STELLAR_RPC_URL,
          contract_configured: !!env.CONTRACT_ID,
          timestamp: Date.now(),
        }),
        { headers: { "Content-Type": "application/json", ...corsHeaders } },
      );
    }

    // Matchmaking relay: /api/games*
    if (url.pathname.startsWith("/api/games")) {
      return handleGamesRoute(request, url, env);
    }

    // Venice AI proxy: /api/ai/tutor
    if (url.pathname === "/api/ai/tutor") {
      return handleAITutorRoute(request, env);
    }

    return new Response(
      JSON.stringify({ error: "Not found", path: url.pathname }),
      {
        status: 404,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      },
    );
  },
};

// ============================================================================
// Matchmaking Relay
// ============================================================================

const CACHE_TTL = 15;
const MAX_GAMES = 100;

interface GameListItem {
  id: number;
  player1: string;
  stake: string;
  status: string;
  created_at: number;
}

async function handleGamesRoute(
  request: Request,
  url: URL,
  env: Env,
): Promise<Response> {
  // GET /api/games — list open games (cached)
  if (url.pathname === "/api/games" && request.method === "GET") {
    const cached = await env.GAME_CACHE.get("open_games");
    if (cached) {
      return new Response(cached, {
        headers: {
          "Content-Type": "application/json",
          "Cache-Control": `public, max-age=${CACHE_TTL}`,
          ...corsHeaders,
        },
      });
    }

    const games = await fetchOpenGames(env);
    const json = JSON.stringify({ games, fetched_at: Date.now() });
    await env.GAME_CACHE.put("open_games", json, {
      expirationTtl: CACHE_TTL,
    });
    return new Response(json, {
      headers: {
        "Content-Type": "application/json",
        "Cache-Control": `public, max-age=${CACHE_TTL}`,
        ...corsHeaders,
      },
    });
  }

  // GET /api/games/:id — single game
  const gameMatch = url.pathname.match(/^\/api\/games\/(\d+)$/);
  if (gameMatch && request.method === "GET") {
    const gameId = parseInt(gameMatch[1]);
    const cached = await env.GAME_CACHE.get(`game_${gameId}`);
    if (cached) {
      return new Response(cached, {
        headers: {
          "Content-Type": "application/json",
          "Cache-Control": `public, max-age=${CACHE_TTL}`,
          ...corsHeaders,
        },
      });
    }
    return new Response(JSON.stringify({ error: "Game not found" }), {
      status: 404,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  }

  // POST /api/games/refresh — force refresh
  if (url.pathname === "/api/games/refresh" && request.method === "POST") {
    const games = await fetchOpenGames(env);
    const json = JSON.stringify({ games, fetched_at: Date.now() });
    await env.GAME_CACHE.put("open_games", json, {
      expirationTtl: CACHE_TTL,
    });
    return new Response(json, {
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  }

  return new Response(JSON.stringify({ error: "Not found" }), {
    status: 404,
    headers: { "Content-Type": "application/json", ...corsHeaders },
  });
}

/**
 * Fetch open games from the contract via Stellar RPC.
 *
 * NOTE: This requires building XDR for simulateTransaction.
 * For the hackathon, the frontend polls the contract directly.
 * This relay is ready to deploy once XDR building is wired up
 * with @stellar/stellar-sdk (which can be added as a dependency
 * to the worker bundle).
 *
 * For now, returns an empty list — the frontend falls back to
 * direct contract polling when the relay returns no games.
 */
async function fetchOpenGames(env: Env): Promise<{ games: GameListItem[] }> {
  if (!env.STELLAR_RPC_URL || !env.CONTRACT_ID) {
    return { games: [] };
  }

  try {
    // TODO: Implement XDR building with @stellar/stellar-sdk
    // For now, return empty — frontend falls back to direct polling
    return { games: [] };
  } catch (err) {
    console.error("fetchOpenGames error:", err);
    return { games: [] };
  }
}

// ============================================================================
// Venice AI Proxy
// ============================================================================

interface TutorRequest {
  personaName: string;
  personaStyle: string;
  context: {
    playerMove?: "C" | "D";
    aiMove?: "C" | "D";
    outcome?: "win" | "lose" | "tie";
    stake?: number;
    aiStrategy?: string;
    roundNumber?: number;
    history?: Array<Record<string, unknown>>;
  };
  requestType: "welcome" | "advice" | "explanation" | "encouragement";
}

const VENICE_BASE_URL = "https://api.venice.ai/api/v1";
const VENICE_MODEL = "venice-uncensored";

const FALLBACK_RESPONSES: Record<string, Record<string, string>> = {
  "Dr. Nash": {
    welcome:
      "I'm Dr. Nash, your equilibrium expert. Every game has a mathematical balance point - let's find yours!",
    advice:
      "Consider the Nash equilibrium - what's your best response given their likely strategy?",
    explanation:
      "This outcome demonstrates strategic interdependence - your payoff depends on both players' choices.",
    encouragement:
      "You're learning the mathematics of cooperation! Each game teaches us about strategic balance.",
  },
  "The Warden": {
    welcome:
      "I'm The Warden, master of dilemmas. Trust is earned through repeated choices - let's explore how.",
    advice:
      "In the real world, reputation matters. How does this choice affect future interactions?",
    explanation:
      "This reveals the tension between individual gain and mutual benefit - the heart of the dilemma.",
    encouragement:
      "Every choice reveals character. You're learning the psychology of trust and cooperation.",
  },
  "Professor Evolution": {
    welcome:
      "I'm Professor Evolution! Strategies that survive are strategies that thrive. Let's see what adapts.",
    advice:
      "Think like evolution - which strategies would survive in a population of players?",
    explanation:
      "Natural selection favors strategies that work well against the population they face.",
    encouragement:
      "You're discovering how cooperation evolves! Each game is a step in the evolutionary process.",
  },
};

async function handleAITutorRoute(
  request: Request,
  env: Env,
): Promise<Response> {
  let body: TutorRequest;
  try {
    body = (await request.json()) as TutorRequest;
  } catch {
    return new Response(JSON.stringify({ error: "Invalid JSON body" }), {
      status: 400,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  }

  // If no API key, return fallback immediately
  if (!env.VENICE_API_KEY) {
    const fallback = getFallback(body.personaName, body.requestType);
    return new Response(
      JSON.stringify({ text: fallback, source: "fallback" }),
      { headers: { "Content-Type": "application/json", ...corsHeaders } },
    );
  }

  try {
    const systemPrompt = buildSystemPrompt(
      body.personaName,
      body.personaStyle,
      body.requestType,
    );
    const userPrompt = buildUserPrompt(body.context, body.requestType);

    const veniceResponse = await fetch(`${VENICE_BASE_URL}/chat/completions`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${env.VENICE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: VENICE_MODEL,
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
        max_tokens: 150,
        temperature: 0.7,
        venice_parameters: {
          include_venice_system_prompt: false,
        },
      }),
    });

    if (!veniceResponse.ok) {
      throw new Error(`Venice API error: ${veniceResponse.status}`);
    }

    const data = (await veniceResponse.json()) as {
      choices: Array<{ message: { content: string } }>;
    };
    const text =
      data.choices[0]?.message?.content ||
      getFallback(body.personaName, body.requestType);

    return new Response(JSON.stringify({ text, source: "venice" }), {
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  } catch (err) {
    console.error("Venice proxy error:", err);
    const fallback = getFallback(body.personaName, body.requestType);
    return new Response(
      JSON.stringify({ text: fallback, source: "fallback" }),
      { headers: { "Content-Type": "application/json", ...corsHeaders } },
    );
  }
}

function getFallback(personaName: string, requestType: string): string {
  const persona = FALLBACK_RESPONSES[personaName];
  return (
    persona?.[requestType] ||
    "Let's explore the fascinating world of game theory together!"
  );
}

function buildSystemPrompt(
  personaName: string,
  personaStyle: string,
  requestType: string,
): string {
  const basePrompt = `You are ${personaName}, an AI tutor teaching game theory through the Prisoner's Dilemma.
Your personality: ${personaStyle}
CRITICAL: Keep responses under 50 words. Be concise, direct, and impactful.`;

  const typePrompts = {
    welcome: "Give a brief, friendly introduction (max 2 sentences).",
    advice:
      "Provide strategic advice in 1-2 sentences. Focus on key game theory concepts.",
    explanation:
      "Explain what happened in 1-2 sentences. Be insightful but brief.",
    encouragement:
      "Encourage the player in 1-2 sentences. Be supportive and motivating.",
  };

  return `${basePrompt}\n\n${typePrompts[requestType as keyof typeof typePrompts]}`;
}

function buildUserPrompt(
  context: TutorRequest["context"],
  requestType: string,
): string {
  if (requestType === "welcome") {
    return "Introduce yourself and explain what we'll learn about trust and cooperation.";
  }

  if (!context.playerMove) {
    return "The player is about to make their first move in the Prisoner's Dilemma. Give them strategic guidance.";
  }

  const moveText = context.playerMove === "C" ? "cooperated" : "defected";
  const aiMoveText = context.aiMove === "C" ? "cooperated" : "defected";
  const outcomeText =
    context.outcome === "win"
      ? "won"
      : context.outcome === "lose"
        ? "lost"
        : "tied";

  const historyContext = buildHistoryContext(context);
  const payoffInfo = getPayoffInfo(context);

  switch (requestType) {
    case "advice":
      return `GAME STATE:
Strategy: ${context.aiStrategy}
Round: ${context.roundNumber}
${historyContext}

LAST ROUND: Player ${moveText}, AI ${aiMoveText}, player ${outcomeText}
${payoffInfo}

Given this specific pattern against ${context.aiStrategy} AI, what's the best strategic move for the next round?`;

    case "explanation":
      return `GAME STATE:
Strategy: ${context.aiStrategy}
Round: ${context.roundNumber}
${historyContext}

LAST ROUND: Player ${moveText}, AI ${aiMoveText}, player ${outcomeText}
${payoffInfo}

Explain this exact outcome and what it reveals about the ${context.aiStrategy} strategy.`;

    case "encouragement":
      return `GAME STATE:
Strategy: ${context.aiStrategy}
Round: ${context.roundNumber}
${historyContext}

LAST ROUND: Player ${moveText}, player ${outcomeText}
${payoffInfo}

Encourage the player based on their actual performance and learning pattern in this series.`;

    default:
      return "Provide helpful game theory guidance.";
  }
}

function buildHistoryContext(context: TutorRequest["context"]): string {
  if (!context.history || context.history.length === 0) {
    return "This is the first round.";
  }

  const history = context.history as Array<{
    playerMove?: string;
    aiMove?: string;
  }>;
  const playerMoves = history.map((h) => h.playerMove?.[0] || "?").join("");
  const aiMoves = history.map((h) => h.aiMove?.[0] || "?").join("");

  let pattern = "";
  if (playerMoves === playerMoves[0]?.repeat(playerMoves.length)) {
    pattern =
      playerMoves[0] === "C"
        ? "consistent cooperation"
        : "consistent defection";
  } else if (playerMoves.endsWith(aiMoves)) {
    pattern = "mirroring the AI's moves";
  }

  return `History: Player [${playerMoves}] vs AI [${aiMoves}]
Total rounds completed: ${history.length}
Pattern: ${pattern || "mixed strategy"}`;
}

function getPayoffInfo(context: TutorRequest["context"]): string {
  const payoffs = {
    C_C: "Both: 2 XLM",
    C_D: "Player: 0, AI: 3 XLM",
    D_C: "Player: 3 XLM, AI: 0",
    D_D: "Both: 0 XLM",
  };

  const key = `${context.playerMove}_${context.aiMove}` as keyof typeof payoffs;
  const thisRound = payoffs[key] || "Unknown outcome";

  if (context.history && context.history.length > 0) {
    const history = context.history as Array<{
      playerMove?: string;
      aiMove?: string;
    }>;
    let totalPlayer = 0,
      totalAI = 0;

    history.forEach((round) => {
      const pMove = round.playerMove?.[0];
      const aMove = round.aiMove?.[0];
      const roundKey = `${pMove}_${aMove}` as keyof typeof payoffs;
      if (roundKey === "C_C") {
        totalPlayer += 2;
        totalAI += 2;
      } else if (roundKey === "C_D") {
        totalPlayer += 0;
        totalAI += 3;
      } else if (roundKey === "D_C") {
        totalPlayer += 3;
        totalAI += 0;
      } else if (roundKey === "D_D") {
        totalPlayer += 0;
        totalAI += 0;
      }
    });

    return `This round: ${thisRound}
Cumulative: Player ${totalPlayer} XLM vs AI ${totalAI} XLM`;
  }

  return `This round: ${thisRound}`;
}
