import React, { useState } from "react";
import { Button, Input, Text } from "@stellar/design-system";
import { useWallet } from "../../hooks/useWallet";
import { Character, CharacterEmotion } from "../Character";
import { VeniceAIService } from "../ai/VeniceAIService";
import { AI_PERSONAS } from "../ai/AIPersonas";
import AudioManager from "../AudioManager";
import { SlideProps } from "../SlideSystem";
import { useSinglePlayerGame } from "../../hooks/useSinglePlayerGame";

// DRY: Shared game logic
const AI_STRATEGIES = {
  random: () => (Math.random() > 0.5 ? "C" : "D"),
  cooperator: () => "C",
  defector: () => "D",
  "tit-for-tat": () => (Math.random() > 0.5 ? "C" : "D"), // Simplified
} as const;

// Note: Payoff calculation is now handled on-chain in the contract
// This function kept for reference/future use
// eslint-disable-next-line @typescript-eslint/no-unused-vars
const calculatePayoffs = (
  playerMove: "C" | "D",
  aiMove: "C" | "D",
  stake: number,
) => {
  if (playerMove === "C" && aiMove === "C") return [2 * stake, 2 * stake];
  if (playerMove === "C" && aiMove === "D") return [0, 3 * stake];
  if (playerMove === "D" && aiMove === "C") return [3 * stake, 0];
  return [0, 0];
};

const GAME_MODES = {
  singlePlayer: {
    label: "🤖 Single Player",
    description: "Play against AI in one instant transaction",
    selected: true,
  },
  multiplayer: {
    label: "👥 Multiplayer",
    description: "Play against another human (coming soon)",
    selected: false,
  },
} as const;

export const GameSlide: React.FC<SlideProps> = () => {
  const [gameMode, setGameMode] =
    useState<keyof typeof GAME_MODES>("singlePlayer");
  const [move, setMove] = useState<string>("");
  const [stake, setStake] = useState<string>("1");
  const [aiStrategy, setAiStrategy] =
    useState<keyof typeof AI_STRATEGIES>("random");
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
      const persona =
        AI_PERSONAS?.[Math.floor(Math.random() * AI_PERSONAS.length)];
      return persona &&
        typeof persona === "object" &&
        "name" in persona &&
        "color" in persona
        ? (persona as AIPersona)
        : fallbackPersona;
    } catch {
      return fallbackPersona;
    }
  });
  const [aiMessage, setAiMessage] = useState<string>("");
  const [gameHistory, setGameHistory] = useState<
    Array<{ move: string; outcome: string; stake: number }>
  >([]);
  const veniceService = VeniceAIService.getInstance();

  const { address, signTransaction } = useWallet();
  const { playGame: playSinglePlayerGame } = useSinglePlayerGame(
    address,
    signTransaction,
  );
  const audioManager = AudioManager.getInstance();

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const generateAIFeedback = async (gameData: {
    move: string;
    outcome: string;
    stake: number;
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
    if (!move || !address || !signTransaction) return;

    setLoading(true);
    setShowCharacters(true);
    setTxError("");

    try {
      const playerMove = move === "cooperate" ? "C" : "D";
      const aiMove = AI_STRATEGIES[aiStrategy]();

      // Get stake with fallback
      const stakeStr = stake && stake.trim() ? stake : "1";
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

      // Call the single-player contract
      const result = await playSinglePlayerGame(
        playerMove,
        aiStrategy,
        stakeInStroops,
      );

      // Payouts come from the contract result
      const playerPayout = result.playerPayout;
      const aiPayout = result.aiPayout;

      // ENHANCEMENT: Update game state for AI tutor
      const newGameHistoryItem = {
        move: move as "cooperate" | "defect",
        outcome:
          playerPayout > aiPayout
            ? "win"
            : playerPayout < aiPayout
              ? "lose"
              : "tie",
        stake: stakeAmount,
        playerPayout,
        aiPayout,
        aiStrategy,
      };
      setGameHistory([...gameHistory, newGameHistoryItem]);

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

      setResult(`
You: ${playerMoveText} | AI (${aiStrategy}): ${aiMoveText}
Your payout: ${playerPayout} XLM | AI payout: ${aiPayout} XLM
${playerPayout > aiPayout ? "You won!" : playerPayout === aiPayout ? "Tie!" : "AI won!"}
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

  if (!address) {
    return (
      <div style={{ textAlign: "center", padding: "40px" }}>
        <Character type="neutral" emotion="thinking" size="large" />
        <Text
          as="p"
          size="md"
          style={{
            fontFamily: "FuturaHandwritten",
            color: "rgba(255,255,255,0.9)",
            fontSize: "1.2rem",
            marginTop: "20px",
          }}
        >
          Connect your wallet to experience trust with real stakes
        </Text>

        {/* CORE: Integrated AI Feedback */}
        {aiMessage && (
          <div
            style={{
              background: "rgba(255,255,255,0.95)",
              borderRadius: "15px",
              padding: "20px",
              margin: "20px 0",
              boxShadow: "0 4px 15px rgba(0,0,0,0.1)",
              border: `2px solid ${aiPersona.color}`,
              position: "relative",
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
      </div>
    );
  }

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
          onChange={(e) =>
            setAiStrategy(e.target.value as keyof typeof AI_STRATEGIES)
          }
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
    </div>
  );
};
