/**
 * Matchmaking Relay — Cloudflare Worker
 *
 * Caches open games from the Soroban contract so players can find
 * opponents without each client polling the contract individually.
 *
 * Endpoints:
 *   GET  /api/games          — list open games (cached, refreshed every 15s)
 *   GET  /api/games/:id      — get a single game's status
 *   POST /api/games/refresh  — force a refresh of the game cache
 *
 * The worker polls the contract's get_game_count + get_game functions
 * via the Stellar RPC endpoint and caches results in KV.
 *
 * Deploy:
 *   npx wrangler deploy api/matchmaking-worker.ts
 *
 * Environment variables (set via wrangler secret):
 *   STELLAR_RPC_URL     — Soroban RPC endpoint (e.g. https://soroban-testnet.stellar.org)
 *   CONTRACT_ID         — zk_dilemma contract ID
 */

export interface Env {
  STELLAR_RPC_URL: string;
  CONTRACT_ID: string;
  GAME_CACHE: KVNamespace;
}

export interface GameListItem {
  id: number;
  player1: string;
  stake: string;
  status: string;
  created_at: number;
}

const CACHE_TTL = 15; // seconds
const MAX_GAMES = 100; // don't scan more than this

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);
    const corsHeaders = {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type",
    };

    if (request.method === "OPTIONS") {
      return new Response(null, { headers: corsHeaders });
    }

    // GET /api/games — list open games from cache
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

      // Cache miss — fetch from contract
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

    // GET /api/games/:id — get a single game
    const gameMatch = url.pathname.match(/^\/api\/games\/(\d+)$/);
    if (gameMatch && request.method === "GET") {
      const gameId = parseInt(gameMatch[1]);
      const game = await fetchSingleGame(env, gameId);
      if (!game) {
        return new Response(JSON.stringify({ error: "Game not found" }), {
          status: 404,
          headers: { "Content-Type": "application/json", ...corsHeaders },
        });
      }
      return new Response(JSON.stringify(game), {
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

    return new Response(
      JSON.stringify({ error: "Not found", path: url.pathname }),
      {
        status: 404,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      },
    );
  },
};

/**
 * Fetch all open games (status = AwaitingPlayer2) from the contract.
 */
async function fetchOpenGames(env: Env): Promise<{ games: GameListItem[] }> {
  try {
    const count = await getGameCount(env);
    if (count === 0) return { games: [] };

    const games: GameListItem[] = [];
    const limit = Math.min(count, MAX_GAMES);

    // Fetch games in parallel (batches of 10)
    for (let i = 0; i < limit; i += 10) {
      const batch = await Promise.all(
        Array.from({ length: Math.min(10, limit - i) }, (_, j) =>
          fetchSingleGame(env, i + j + 1),
        ),
      );
      for (const game of batch) {
        if (game && game.status === "AwaitingPlayer2") {
          games.push(game);
        }
      }
    }

    // Sort by newest first
    games.sort((a, b) => b.created_at - a.created_at);
    return { games };
  } catch (err) {
    console.error("fetchOpenGames error:", err);
    return { games: [] };
  }
}

/**
 * Get the total game count from the contract.
 */
async function getGameCount(env: Env): Promise<number> {
  const result = await sorobanCall(env, "get_game_count", []);
  return Number(result ?? 0);
}

/**
 * Fetch a single game by ID from the contract.
 */
async function fetchSingleGame(
  env: Env,
  gameId: number,
): Promise<GameListItem | null> {
  try {
    const result = await sorobanCall(env, "get_game", [{ u32: gameId }]);
    if (!result) return null;

    // Parse the contract response — Soroban returns nested objects
    const game = parseGameResponse(result, gameId);
    return game;
  } catch {
    return null;
  }
}

/**
 * Parse a Soroban get_game response into a GameListItem.
 * The response format depends on the contract's return type.
 */
function parseGameResponse(raw: unknown, id: number): GameListItem | null {
  if (!raw || typeof raw !== "object") return null;

  // Soroban returns games as maps/objects with string keys
  const obj = raw as Record<string, unknown>;
  const status = String(obj.status ?? "");
  const player1 = String(obj.player1 ?? "");
  const stake = String(obj.stake ?? "0");
  const created_at = Number(obj.created_at ?? 0);

  return { id, player1, stake, status, created_at };
}

/**
 * Make a simulateTransaction call to the Soroban RPC endpoint.
 * This is read-only (no signing needed) — just simulates the contract call.
 */
async function sorobanCall(
  env: Env,
  functionName: string,
  args: unknown[],
): Promise<unknown> {
  // Build the contract call as a simulateTransaction request
  // The Soroban RPC expects a JSON-RPC payload
  const body = {
    jsonrpc: "2.0",
    id: 1,
    method: "simulateTransaction",
    params: {
      transaction: buildSimulateTx(env.CONTRACT_ID, functionName, args),
    },
  };

  const response = await fetch(env.STELLAR_RPC_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    throw new Error(`Soroban RPC error: ${response.status}`);
  }

  const data = await response.json();
  // The result contains the return value in results[0].xdr
  if (data.error) {
    throw new Error(`Soroban error: ${JSON.stringify(data.error)}`);
  }

  // For simplicity, return the raw result — the caller parses it
  // In production you'd decode the XDR here
  return data.result?.results?.[0]?.xdr ?? null;
}

/**
 * Build a minimal simulateTransaction XDR payload.
 * In production, use @stellar/stellar-sdk to build this properly.
 * For now, we return a placeholder — the actual implementation would
 * use the stellar-sdk to construct the transaction.
 */
function buildSimulateTx(
  _contractId: string,
  _functionName: string,
  _args: unknown[],
): string {
  // This is a placeholder — in production, use stellar-sdk to build
  // the InvokeContractArgs XDR. The worker would import @stellar/stellar-sdk
  // and construct the transaction properly.
  //
  // For the hackathon, the frontend can continue to poll directly.
  // This relay is ready to deploy once the XDR building is implemented.
  throw new Error("XDR building not yet implemented — use direct polling");
}
