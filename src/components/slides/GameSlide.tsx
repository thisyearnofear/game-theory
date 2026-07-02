import React, { useMemo, useState } from "react";
import { Button, Input, Text } from "@stellar/design-system";
import { Character, CharacterEmotion } from "../Character";
import { VeniceAIService } from "../ai/VeniceAIService";
import { AI_PERSONAS } from "../ai/AIPersonas";
import AudioManager from "../AudioManager";
import { SlideProps } from "../SlideSystem";
import {
  TitForTatStrategy,
  AlwaysCooperateStrategy,
  AlwaysDefectStrategy,
  RandomStrategy,
  type GameMove,
} from "../../util/strategies";

// Module-level strategy map (static, no component lifecycle dependency)
const STRATEGY_MAP: Record<string, typeof RandomStrategy> = {
  random: RandomStrategy,
  cooperator: AlwaysCooperateStrategy,
  defector: AlwaysDefectStrategy,
  "tit-for-tat": TitForTatStrategy,
};

const GAME_MODES = {
  singlePlayer: {
    label: "🤖 Tutorial (vs AI)",
    description: "Learn the game — simulated, no wallet needed",
    selected: true,
  },
  multiplayer: {
    label: "👥 ZK Multiplayer",
    description: "Play against a human with ZK proofs on Stellar",
    selected: false,
  },
} as const;

export const GameSlide: React.FC<SlideProps> = () => {
  const [gameMode, setGameMode] =
    useState<keyof typeof GAME_MODES>("singlePlayer");
  const [move, setMove] = useState<string>("");
  const [stake, setStake] = useState<string>("1");
  const [aiStrategy, setAiStrategy] = useState<string>("random");
  const [result, setResult] = useState<string>("");
  const [loading, setLoading] = useState(false);
  const [playerEmotion, setPlayerEmotion] =
    useState<CharacterEmotion>("neutral");
  const [aiEmotion, setAiEmotion] = useState<CharacterEmotion>("neutral");
  const [showCharacters, setShowCharacters] = useState(false);
  const [showTutor, setShowTutor] = useState(false);
  const [txError, setTxError] = useState<string>("");

  // CORE: AI Integration
  interface AIPersona {
    name: string;
    emoji: string;
    color: string;
    personality: string;
  }
  const [aiPersona] = useState<AIPersona>(() => {
    // Fallback persona if import fails
    const fallbackPersona: AIPersona = {
      name: "The Tutor",
      emoji: "🎓",
      color: "#667eea",
      personality: "Educational and supportive guide",
    };

    try {
      const personas = Object.values(AI_PERSONAS);
      const selectedPersona =
        personas[Math.floor(Math.random() * personas.length)];
      if (selectedPersona && "name" in selectedPersona) {
        // Map imported persona to our interface
        const personaColors: Record<string, string> = {
          nash: "#6366f1",
          rousseau: "#8b5cf6",
          darwin: "#ec4899",
          pareto: "#f59e0b",
          cournot: "#3b82f6",
          rapoport: "#10b981",
        };
        return {
          name: selectedPersona.name,
          emoji: selectedPersona.avatar,
          color: personaColors[selectedPersona.id] || "#667eea",
          personality: selectedPersona.personality,
        };
      }
      return fallbackPersona;
    } catch {
      return fallbackPersona;
    }
  });
  const [aiMessage, setAiMessage] = useState<string>("");
  const [roundNumber, setRoundNumber] = useState(0);
  const [showSummary, setShowSummary] = useState(false);
  const [gameHistory, setGameHistory] = useState<
    Array<{
      move: string;
      outcome: string;
      stake: number;
      playerPayout: number;
      aiPayout: number;
      aiStrategy: string;
    }>
  >([]);
  const veniceService = VeniceAIService.getInstance();

  // ANALYSIS: Session learning metrics
  const sessionAnalysis = {
    wins: gameHistory.filter((g) => g.outcome === "win").length,
    losses: gameHistory.filter((g) => g.outcome === "lose").length,
    ties: gameHistory.filter((g) => g.outcome === "tie").length,
    cooperationRate:
      gameHistory.length > 0
        ? (gameHistory.filter((g) => g.move === "cooperate").length /
            gameHistory.length) *
          100
        : 0,
    bestStrategy: (() => {
      const strategyStats = gameHistory.reduce(
        (acc, game) => {
          const key = game.aiStrategy;
          if (!acc[key]) {
            acc[key] = { wins: 0, total: 0, totalPayout: 0 };
          }
          acc[key].total += 1;
          acc[key].totalPayout += game.playerPayout;
          if (game.outcome === "win") acc[key].wins += 1;
          return acc;
        },
        {} as Record<
          string,
          { wins: number; total: number; totalPayout: number }
        >,
      );

      let best = { strategy: "", winRate: 0, avgPayout: 0 };
      Object.entries(strategyStats).forEach(([strategy, stats]) => {
        const winRate = (stats.wins / stats.total) * 100;
        const avgPayout = stats.totalPayout / stats.total;
        if (winRate > best.winRate || avgPayout > best.avgPayout) {
          best = { strategy, winRate, avgPayout };
        }
      });
      return best.strategy || "N/A";
    })(),
    trend: (() => {
      if (gameHistory.length < 2) return "N/A";
      const recent = gameHistory.slice(-3);
      const recentWins = recent.filter((g) => g.outcome === "win").length;
      const older = gameHistory.slice(0, -3);
      const olderWins = older.filter((g) => g.outcome === "win").length;
      if (olderWins === 0) return recentWins > 0 ? "📈 Improving" : "Stable";
      const improvement = recentWins - (olderWins / older.length) * 3;
      if (improvement > 0.5) return "📈 Improving";
      if (improvement < -0.5) return "📉 Declining";
      return "➡️ Stable";
    })(),
  };

  // Map strategy names to proper implementations from strategies.ts
  // TFT now uses history tracking for correct behavior

  // Extract player move history from game history for TFT strategy
  const playerMoveHistory = useMemo<GameMove[]>(
    () =>
      gameHistory.map((g) => {
        if (g.move === "cooperate") return "C" as GameMove;
        return "D" as GameMove;
      }),
    [gameHistory],
  );

  const audioManager = AudioManager.getInstance();

  const generateAIFeedback = async (gameData: {
    move: string;
    outcome: string;
    stake: number;
    playerPayout: number;
    aiPayout: number;
    aiStrategy: string;
  }) => {
    const context = {
      playerMove: gameData.move as "C" | "D",
      outcome: gameData.outcome as "win" | "lose" | "tie",
      stake: gameData.stake,
      history: gameHistory,
    };

    const requestType =
      gameData.outcome === "welcome"
        ? "welcome"
        : gameData.outcome === "win"
          ? "encouragement"
          : "advice";

    try {
      const feedback = await veniceService.generateTutorAdvice(
        aiPersona.name,
        aiPersona.personality,
        context,
        requestType,
      );
      setAiMessage(feedback);
    } catch {
      // Fallback message if AI fails
      const fallbackMessages = {
        welcome:
          "Welcome to the Prisoner's Dilemma! Let's explore trust and cooperation.",
        win: "Great choice! You're learning the dynamics of cooperation.",
        lose: "Interesting outcome. Consider how trust affects your decisions.",
        advice:
          "Think about the long-term benefits of cooperation vs. short-term gains.",
      };
      setAiMessage(
        fallbackMessages[requestType as keyof typeof fallbackMessages] ||
          fallbackMessages.advice,
      );
    }
  };

  const playGame = () => {
    // eslint-disable-next-line @typescript-eslint/no-floating-promises
    playGameInternal();
  };

  const playGameInternal = async () => {
    if (!move) return;

    setLoading(true);
    setShowCharacters(true);
    setTxError("");

    try {
      const playerMove = move === "cooperate" ? "C" : "D";
      // Use proper strategy from strategies.ts with history support
      const selectedStrategy = STRATEGY_MAP[aiStrategy] ?? RandomStrategy;
      const aiMove = selectedStrategy.getMove(playerMoveHistory);

      // Get stake with fallback
      const stakeStr = stake || "1";
      const stakeAmount = parseFloat(stakeStr);

      // Validate stake amount
      if (!stakeStr || isNaN(stakeAmount) || stakeAmount <= 0) {
        throw new Error(
          "Invalid stake amount. Please enter a number greater than 0.",
        );
      }

      // Convert XLM to stroops (1 XLM = 10,000,000 stroops)
      const stakeInStroops = Math.floor(stakeAmount * 10_000_000);

      if (!Number.isInteger(stakeInStroops) || stakeInStroops <= 0) {
        throw new Error(
          "Stake amount too small. Please enter at least 0.00000001 XLM.",
        );
      }

      console.log(
        `Playing game: move=${playerMove}, stake=${stakeAmount} XLM (${stakeInStroops} stroops), strategy=${aiStrategy}`,
      );

      // Local simulation — calculate payouts using standard PD matrix
      const stake = stakeAmount;
      let playerPayout: number;
      let aiPayout: number;
      if (playerMove === "C" && aiMove === "C") {
        playerPayout = stake * 2;
        aiPayout = stake * 2;
      } else if (playerMove === "C" && aiMove === "D") {
        playerPayout = 0;
        aiPayout = stake * 3;
      } else if (playerMove === "D" && aiMove === "C") {
        playerPayout = stake * 3;
        aiPayout = 0;
      } else {
        playerPayout = 0;
        aiPayout = 0;
      }

      const result = {
        gameId: Date.now(),
        playerMove,
        aiMove,
        playerPayout,
        aiPayout,
        txHash: `sim-${Date.now()}`,
      };

      // ENHANCEMENT: Update game state for AI tutor
      const outcome =
        playerPayout > aiPayout
          ? "win"
          : playerPayout < aiPayout
            ? "lose"
            : "tie";
      const newGameHistoryItem = {
        move: move as "cooperate" | "defect",
        outcome,
        stake: stakeAmount,
        playerPayout,
        aiPayout,
        aiStrategy,
      };
      setGameHistory([...gameHistory, newGameHistoryItem]);

      // Activate tutor feedback
      await generateAIFeedback(newGameHistoryItem);

      // Character emotions based on outcome
      if (playerPayout > aiPayout) {
        setPlayerEmotion("happy");
        setAiEmotion("sad");
        audioManager.playSound("win");
      } else if (playerPayout < aiPayout) {
        setPlayerEmotion("sad");
        setAiEmotion("happy");
        audioManager.playSound("lose");
      } else {
        setPlayerEmotion("neutral");
        setAiEmotion("neutral");
        audioManager.playSound("coin");
      }

      // Play move-specific sounds
      if (playerMove === "C") audioManager.playSound("cooperate");
      else audioManager.playSound("defect");

      const aiMoveText = aiMove === "C" ? "Cooperated" : "Defected";
      const playerMoveText = playerMove === "C" ? "Cooperated" : "Defected";

      // Calculate cumulative payoffs
      const newRound = roundNumber + 1;
      const cumulativePlayerPayoff = gameHistory.reduce(
        (sum, game) => sum + game.playerPayout,
        playerPayout,
      );
      const cumulativeAIPayoff = gameHistory.reduce(
        (sum, game) => sum + game.aiPayout,
        aiPayout,
      );

      setRoundNumber(newRound);
      setResult(`
Round ${newRound}
You: ${playerMoveText} | AI (${aiStrategy}): ${aiMoveText}
This round: You ${playerPayout} XLM | AI ${aiPayout} XLM
${playerPayout > aiPayout ? "✅ You won this round!" : playerPayout === aiPayout ? "🤝 Tie!" : "❌ AI won this round!"}

Total after ${newRound} round${newRound > 1 ? "s" : ""}: You ${cumulativePlayerPayoff.toFixed(7)} XLM | AI ${cumulativeAIPayoff.toFixed(7)} XLM
${cumulativePlayerPayoff > cumulativeAIPayoff ? "🏆 You're ahead!" : cumulativePlayerPayoff < cumulativeAIPayoff ? "📉 AI is ahead" : "⚖️ Tied!"}
Transaction: ${result?.txHash ? "✅ Confirmed" : "⏳ Pending"}
      `);
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      setTxError(`Transaction failed: ${errorMessage}`);
      if (error instanceof Error) {
        console.error("Game transaction error:", error);
      } else {
        console.error("Game transaction error:", new Error(String(error)));
      }
      setPlayerEmotion("sad");
      setAiEmotion("neutral");
      audioManager.playSound("error");
      setResult("Transaction failed. Check console for details.");
    } finally {
      setLoading(false);
    }
  };

  const resetGame = () => {
    setResult("");
    setMove("");
    setPlayerEmotion("neutral");
    setAiEmotion("neutral");
    setShowCharacters(false);
    audioManager.playSound("click");
  };

  return (
    <div style={{ maxWidth: "600px", margin: "0 auto", textAlign: "center" }}>
      {/* Game Mode Selector */}
      <div
        style={{
          marginBottom: "30px",
          background: "rgba(255,255,255,0.05)",
          borderRadius: "15px",
          padding: "20px",
          border: "2px solid rgba(255,255,255,0.1)",
        }}
      >
        <Text
          as="h3"
          size="md"
          style={{
            fontFamily: "FuturaHandwritten",
            color: "rgba(255,255,255,0.9)",
            marginBottom: "15px",
          }}
        >
          Choose Game Mode
        </Text>

        <div
          style={{
            display: "flex",
            gap: "10px",
            justifyContent: "center",
            flexWrap: "wrap",
          }}
        >
          {Object.entries(GAME_MODES).map(([mode, config]) => (
            <button
              key={mode}
              type="button"
              onClick={() => setGameMode(mode as keyof typeof GAME_MODES)}
              disabled={loading || mode !== "singlePlayer"}
              style={{
                padding: "12px 16px",
                borderRadius: "10px",
                border:
                  gameMode === mode
                    ? "2px solid #667eea"
                    : "2px solid rgba(255,255,255,0.2)",
                background:
                  gameMode === mode
                    ? "rgba(102, 126, 234, 0.2)"
                    : "transparent",
                color:
                  mode !== "singlePlayer" && gameMode !== mode
                    ? "rgba(255,255,255,0.5)"
                    : "rgba(255,255,255,0.9)",
                fontFamily: "FuturaHandwritten",
                fontSize: "14px",
                cursor: mode === "singlePlayer" ? "pointer" : "not-allowed",
                transition: "all 0.2s",
              }}
            >
              <div style={{ fontWeight: "bold" }}>{config.label}</div>
              <div style={{ fontSize: "12px", marginTop: "4px" }}>
                {config.description}
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* ENHANCEMENT: Tutor toggle */}
      <div
        style={{
          position: "absolute",
          top: "100px",
          right: "20px",
          zIndex: 40,
        }}
      >
        <Button
          onClick={() => setShowTutor(!showTutor)}
          size="md"
          style={{
            width: "40px",
            height: "40px",
            borderRadius: "50%",
            fontSize: "16px",
            background: showTutor ? "#667eea" : "rgba(255,255,255,0.7)",
          }}
        >
          🧙‍♂️
        </Button>
      </div>

      {/* Character display */}
      {showCharacters && (
        <div
          style={{
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
            gap: "40px",
            marginBottom: "20px",
          }}
        >
          <div style={{ textAlign: "center" }}>
            <Character
              type="cooperator"
              emotion={playerEmotion}
              size="large"
              animate={result !== ""}
            />
            <Text
              as="p"
              size="md"
              style={{
                fontFamily: "FuturaHandwritten",
                color: "rgba(255,255,255,0.9)",
                fontSize: "0.9rem",
                marginTop: "5px",
              }}
            >
              You
            </Text>
          </div>

          <Text
            as="span"
            size="md"
            style={{
              fontFamily: "FuturaHandwritten",
              color: "rgba(255,255,255,0.9)",
              fontSize: "1.5rem",
            }}
          >
            VS
          </Text>

          <div style={{ textAlign: "center" }}>
            <Character
              type="defector"
              emotion={aiEmotion}
              size="large"
              animate={result !== ""}
            />
            <Text
              as="p"
              size="md"
              style={{
                fontFamily: "FuturaHandwritten",
                color: "rgba(255,255,255,0.9)",
                fontSize: "0.9rem",
                marginTop: "5px",
              }}
            >
              AI ({aiStrategy})
            </Text>
          </div>
        </div>
      )}

      {/* Payoff Matrix */}
      <div
        className="payoff-matrix"
        style={{ fontSize: "12px", margin: "20px auto" }}
      >
        <div className="payoff-cell payoff-header"></div>
        <div className="payoff-cell payoff-header">AI Cooperates</div>
        <div className="payoff-cell payoff-header">AI Defects</div>

        <div className="payoff-cell payoff-header">You Cooperate</div>
        <div className="payoff-cell payoff-cooperate">Both get 2×</div>
        <div className="payoff-cell payoff-mixed">You: 0, AI: 3×</div>

        <div className="payoff-cell payoff-header">You Defect</div>
        <div className="payoff-cell payoff-mixed">You: 3×, AI: 0</div>
        <div className="payoff-cell payoff-defect">Both get 0</div>
      </div>

      {/* Game controls */}
      <div style={{ marginBottom: "20px" }}>
        <Input
          value={stake || "1"}
          onChange={(e) => setStake(e.target.value || "1")}
          id="input"
          fieldSize="md"
          placeholder="Stake (XLM)"
          type="number"
          min="0.1"
          step="0.1"
          disabled={loading}
          style={{ marginBottom: "10px", textAlign: "center" }}
        />

        <select
          value={aiStrategy}
          onChange={(e) => setAiStrategy(e.target.value)}
          disabled={loading}
          style={{
            fontFamily: "FuturaHandwritten",
            padding: "8px",
            marginBottom: "10px",
            width: "100%",
          }}
        >
          <option value="random">Random AI</option>
          <option value="cooperator">Always Cooperate</option>
          <option value="defector">Always Defect</option>
          <option value="tit-for-tat">Tit-for-Tat</option>
        </select>
      </div>

      <div
        style={{
          display: "flex",
          gap: "10px",
          justifyContent: "center",
          marginBottom: "20px",
        }}
      >
        <Button
          variant={move === "cooperate" ? "primary" : "secondary"}
          onClick={() => {
            setMove("cooperate");
            audioManager.playSound("click");
          }}
          size="md"
          disabled={loading}
        >
          🤝 Cooperate
        </Button>
        <Button
          variant={move === "defect" ? "primary" : "secondary"}
          onClick={() => {
            setMove("defect");
            audioManager.playSound("click");
          }}
          size="md"
          disabled={loading}
        >
          💀 Defect
        </Button>
      </div>

      <div
        style={{
          display: "flex",
          gap: "10px",
          justifyContent: "center",
          marginBottom: "20px",
        }}
      >
        <Button
          onClick={() => void playGame()}
          disabled={!move || loading}
          style={{ width: "120px" }}
          size="md"
        >
          {loading ? "Playing..." : "Play Round"}
        </Button>

        {result && (
          <Button
            onClick={resetGame}
            variant="secondary"
            style={{ width: "120px" }}
            size="md"
          >
            Play Again
          </Button>
        )}

        {gameHistory.length > 0 && (
          <>
            <Button
              onClick={() => {
                setGameHistory([]);
                setRoundNumber(0);
                resetGame();
                audioManager.playSound("click");
              }}
              variant="secondary"
              style={{ width: "140px" }}
              size="md"
            >
              Reset Series
            </Button>

            <Button
              onClick={() => setShowSummary(!showSummary)}
              variant="secondary"
              style={{
                width: "120px",
                background: showSummary
                  ? "rgba(102, 126, 234, 0.2)"
                  : "transparent",
              }}
              size="md"
            >
              📊 Summary
            </Button>
          </>
        )}
      </div>

      {txError && (
        <Text
          as="p"
          size="md"
          style={{
            fontFamily: "FuturaHandwritten",
            background: "rgba(244, 67, 54, 0.1)",
            color: "#F44336",
            padding: "12px",
            borderRadius: "8px",
            marginBottom: "10px",
            fontSize: "0.85rem",
            border: "1px solid #F44336",
          }}
        >
          ⚠️ {txError}
        </Text>
      )}

      {result && (
        <Text
          as="p"
          size="md"
          style={{
            fontFamily: "FuturaHandwritten",
            whiteSpace: "pre-line",
            background: "rgba(255,255,255,0.9)",
            padding: "15px",
            borderRadius: "10px",
            fontSize: "0.9rem",
            color: "#333",
          }}
        >
          {result}
        </Text>
      )}

      {/* AI Tutor Feedback */}
      {result && aiMessage && (
        <div
          style={{
            background: "rgba(255,255,255,0.95)",
            borderRadius: "15px",
            padding: "20px",
            marginTop: "20px",
            boxShadow: "0 4px 15px rgba(0,0,0,0.1)",
            border: `2px solid ${aiPersona.color}`,
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "10px",
              marginBottom: "10px",
            }}
          >
            <span style={{ fontSize: "24px" }}>{aiPersona.emoji}</span>
            <Text
              as="h4"
              size="md"
              style={{
                fontFamily: "FuturaHandwritten",
                color: aiPersona.color,
                margin: 0,
              }}
            >
              {aiPersona.name}
            </Text>
          </div>
          <Text
            as="p"
            size="md"
            style={{
              fontFamily: "FuturaHandwritten",
              color: "#333",
              lineHeight: "1.4",
              margin: 0,
            }}
          >
            {aiMessage}
          </Text>
        </div>
      )}

      {/* Session Summary */}
      {showSummary && gameHistory.length > 0 && (
        <div
          style={{
            background:
              "linear-gradient(135deg, rgba(102, 126, 234, 0.1), rgba(200, 150, 255, 0.1))",
            borderRadius: "15px",
            padding: "20px",
            marginTop: "20px",
            boxShadow: "0 4px 15px rgba(0,0,0,0.1)",
            border: "2px solid rgba(102, 126, 234, 0.3)",
          }}
        >
          <Text
            as="h3"
            size="md"
            style={{
              fontFamily: "FuturaHandwritten",
              color: "#667eea",
              margin: "0 0 15px 0",
            }}
          >
            📊 Session Summary
          </Text>

          <div
            style={{
              display: "grid",
              gridTemplateColumns: "1fr 1fr",
              gap: "15px",
              marginBottom: "15px",
            }}
          >
            <div style={{ textAlign: "center" }}>
              <Text
                as="p"
                size="sm"
                style={{
                  fontFamily: "FuturaHandwritten",
                  color: "#666",
                  margin: "0 0 5px 0",
                  fontSize: "0.85rem",
                }}
              >
                Record
              </Text>
              <Text
                as="p"
                size="md"
                style={{
                  fontFamily: "FuturaHandwritten",
                  color: "#333",
                  margin: 0,
                  fontSize: "1.1rem",
                  fontWeight: "bold",
                }}
              >
                {sessionAnalysis.wins}W {sessionAnalysis.losses}L{" "}
                {sessionAnalysis.ties}T
              </Text>
            </div>

            <div style={{ textAlign: "center" }}>
              <Text
                as="p"
                size="sm"
                style={{
                  fontFamily: "FuturaHandwritten",
                  color: "#666",
                  margin: "0 0 5px 0",
                  fontSize: "0.85rem",
                }}
              >
                Cooperation Rate
              </Text>
              <Text
                as="p"
                size="md"
                style={{
                  fontFamily: "FuturaHandwritten",
                  color: "#333",
                  margin: 0,
                  fontSize: "1.1rem",
                  fontWeight: "bold",
                }}
              >
                {sessionAnalysis.cooperationRate.toFixed(0)}%
              </Text>
            </div>

            <div style={{ textAlign: "center" }}>
              <Text
                as="p"
                size="sm"
                style={{
                  fontFamily: "FuturaHandwritten",
                  color: "#666",
                  margin: "0 0 5px 0",
                  fontSize: "0.85rem",
                }}
              >
                Best Strategy
              </Text>
              <Text
                as="p"
                size="md"
                style={{
                  fontFamily: "FuturaHandwritten",
                  color: "#333",
                  margin: 0,
                  fontSize: "1rem",
                  fontWeight: "bold",
                }}
              >
                {sessionAnalysis.bestStrategy}
              </Text>
            </div>

            <div style={{ textAlign: "center" }}>
              <Text
                as="p"
                size="sm"
                style={{
                  fontFamily: "FuturaHandwritten",
                  color: "#666",
                  margin: "0 0 5px 0",
                  fontSize: "0.85rem",
                }}
              >
                Trend
              </Text>
              <Text
                as="p"
                size="md"
                style={{
                  fontFamily: "FuturaHandwritten",
                  color: "#333",
                  margin: 0,
                  fontSize: "1rem",
                  fontWeight: "bold",
                }}
              >
                {sessionAnalysis.trend}
              </Text>
            </div>
          </div>

          <Text
            as="p"
            size="sm"
            style={{
              fontFamily: "FuturaHandwritten",
              color: "#666",
              fontSize: "0.85rem",
              margin: 0,
              fontStyle: "italic",
              textAlign: "center",
            }}
          >
            Playing more rounds helps you discover what works best against
            different strategies.
          </Text>
        </div>
      )}
    </div>
  );
};
