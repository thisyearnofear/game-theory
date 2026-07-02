import React, { useMemo, useRef, useState } from "react";
import { Button, Input, Text } from "@stellar/design-system";
import { Character, CharacterEmotion } from "../Character";
import { VeniceAIService } from "../ai/VeniceAIService";
import { AI_PERSONAS } from "../ai/AIPersonas";
import AudioManager from "../AudioManager";
import { SlideProps } from "../SlideSystem";
import {
  createStrategy,
  getStrategyInfo,
  ALL_STRATEGY_IDS,
  type IteratedStrategy,
  type StrategyId,
  type GameMove,
  calculatePayoff,
} from "../../util/strategies";
import { TournamentMode } from "./TournamentMode";

const GAME_MODES = {
  singlePlayer: {
    label: "🤖 Tutorial (vs AI)",
    description: "Learn the game — simulated, no wallet needed",
    selected: true,
  },
  tournament: {
    label: "🏆 Tournament",
    description: "Watch trust evolve — strategies compete & reproduce",
    selected: false,
  },
  multiplayer: {
    label: "👥 ZK Multiplayer",
    description: "Play against a human with ZK proofs on Stellar",
    selected: false,
  },
} as const;

// Round record for the move history table
interface RoundRecord {
  round: number;
  playerMove: GameMove;
  aiMove: GameMove;
  playerPayout: number;
  aiPayout: number;
  outcome: "caught" | "betrayed" | "exploited" | "mutual-destruction";
}

export const GameSlide: React.FC<SlideProps> = () => {
  const [gameMode, setGameMode] =
    useState<keyof typeof GAME_MODES>("singlePlayer");
  const [move, setMove] = useState<string>("");
  const [stake, setStake] = useState<string>("1");
  const [aiStrategyId, setAiStrategyId] = useState<StrategyId>("tft");
  const [result, setResult] = useState<string>("");
  const [loading, setLoading] = useState(false);
  const [playerEmotion, setPlayerEmotion] =
    useState<CharacterEmotion>("neutral");
  const [aiEmotion, setAiEmotion] = useState<CharacterEmotion>("neutral");
  const [showCharacters, setShowCharacters] = useState(false);
  const [showTutor, setShowTutor] = useState(false);
  const [txError, setTxError] = useState<string>("");
  const [rounds, setRounds] = useState<RoundRecord[]>([]);
  const [showSummary, setShowSummary] = useState(false);

  // The strategy instance — kept in a ref so it maintains state across rounds
  const strategyRef = useRef<IteratedStrategy>(createStrategy("tft"));
  // Track if we need to reset the strategy (new opponent)
  const [currentStrategyId, setCurrentStrategyId] = useState<StrategyId>("tft");

  // AI persona setup
  interface AIPersona {
    name: string;
    emoji: string;
    color: string;
    personality: string;
  }
  const [aiPersona] = useState<AIPersona>(() => {
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
  const veniceService = VeniceAIService.getInstance();

  // Trust altitude: grows with consecutive mutual cooperation, resets on any defection
  const trustAltitude = useMemo(() => {
    let altitude = 0;
    for (const r of rounds) {
      if (r.playerMove === "C" && r.aiMove === "C") {
        altitude++;
      } else {
        altitude = 0;
      }
    }
    return altitude;
  }, [rounds]);

  // Cumulative scores
  const cumulativePlayer = useMemo(
    () => rounds.reduce((sum, r) => sum + r.playerPayout, 0),
    [rounds],
  );
  const cumulativeAI = useMemo(
    () => rounds.reduce((sum, r) => sum + r.aiPayout, 0),
    [rounds],
  );

  const audioManager = AudioManager.getInstance();

  // Session analysis for summary
  const sessionAnalysis = useMemo(() => {
    const wins = rounds.filter((r) => r.playerPayout > r.aiPayout).length;
    const losses = rounds.filter((r) => r.playerPayout < r.aiPayout).length;
    const ties = rounds.filter((r) => r.playerPayout === r.aiPayout).length;
    const cooperationRate =
      rounds.length > 0
        ? (rounds.filter((r) => r.playerMove === "C").length / rounds.length) *
          100
        : 0;
    const maxAltitude = rounds.reduce((max, _r, i) => {
      let alt = 0;
      for (let j = 0; j <= i; j++) {
        if (rounds[j].playerMove === "C" && rounds[j].aiMove === "C") alt++;
        else alt = 0;
      }
      return Math.max(max, alt);
    }, 0);
    return {
      wins,
      losses,
      ties,
      cooperationRate,
      maxAltitude,
      total: rounds.length,
    };
  }, [rounds]);

  const generateAIFeedback = async (roundData: RoundRecord) => {
    const context = {
      playerMove: roundData.playerMove,
      outcome:
        roundData.outcome === "exploited"
          ? "win"
          : roundData.outcome === "betrayed"
            ? "lose"
            : "tie",
      stake: parseFloat(stake) || 1,
      history: rounds.map((r) => ({
        move: r.playerMove === "C" ? "cooperate" : "defect",
        outcome:
          r.outcome === "exploited"
            ? "win"
            : r.outcome === "betrayed"
              ? "lose"
              : "tie",
        stake: parseFloat(stake) || 1,
        playerPayout: r.playerPayout,
        aiPayout: r.aiPayout,
        aiStrategy: strategyRef.current.name,
      })),
    };

    const requestType =
      roundData.outcome === "exploited" ? "encouragement" : "advice";

    try {
      const feedback = await veniceService.generateTutorAdvice(
        aiPersona.name,
        aiPersona.personality,
        context,
        requestType,
      );
      setAiMessage(feedback);
    } catch {
      const fallbackMessages: Record<string, string> = {
        win: "Great choice! You're learning the dynamics of cooperation.",
        lose: "Interesting outcome. Consider how trust affects your decisions.",
        advice:
          "Think about the long-term benefits of cooperation vs. short-term gains.",
        encouragement: "Nice play! Each round teaches you something new.",
      };
      setAiMessage(fallbackMessages[requestType] || fallbackMessages.advice);
    }
  };

  const handleStrategyChange = (id: StrategyId) => {
    setAiStrategyId(id);
    if (id !== currentStrategyId) {
      // New opponent — reset everything
      strategyRef.current = createStrategy(id);
      setCurrentStrategyId(id);
      setRounds([]);
      setResult("");
      setMove("");
      setPlayerEmotion("neutral");
      setAiEmotion("neutral");
      setShowCharacters(false);
      setAiMessage("");
      audioManager.playSound("click");
    }
  };

  const playRound = () => {
    if (!move) return;

    setLoading(true);
    setShowCharacters(true);
    setTxError("");

    try {
      const playerMove = move === "cooperate" ? "C" : "D";
      const stakeAmount = parseFloat(stake) || 1;

      // Get AI's move from the stateful strategy
      const aiMove = strategyRef.current.play();

      // Calculate payoffs
      const { playerPayout, aiPayout } = calculatePayoff(
        playerMove,
        aiMove,
        stakeAmount,
      );

      // Let the strategy remember what happened
      strategyRef.current.remember(aiMove, playerMove);

      // Determine outcome
      const outcome: RoundRecord["outcome"] =
        playerMove === "C" && aiMove === "C"
          ? "caught"
          : playerMove === "C" && aiMove === "D"
            ? "betrayed"
            : playerMove === "D" && aiMove === "C"
              ? "exploited"
              : "mutual-destruction";

      const roundNum = rounds.length + 1;
      const record: RoundRecord = {
        round: roundNum,
        playerMove,
        aiMove,
        playerPayout,
        aiPayout,
        outcome,
      };

      setRounds([...rounds, record]);

      // Character emotions
      if (outcome === "exploited") {
        setPlayerEmotion("happy");
        setAiEmotion("sad");
        audioManager.playSound("win");
      } else if (outcome === "betrayed") {
        setPlayerEmotion("sad");
        setAiEmotion("happy");
        audioManager.playSound("lose");
      } else if (outcome === "caught") {
        setPlayerEmotion("happy");
        setAiEmotion("happy");
        audioManager.playSound("coin");
      } else {
        setPlayerEmotion("neutral");
        setAiEmotion("neutral");
        audioManager.playSound("defect");
      }

      if (playerMove === "C") audioManager.playSound("cooperate");
      else audioManager.playSound("defect");

      // Build result text
      const playerMoveText = playerMove === "C" ? "Cooperated" : "Defected";
      const aiMoveText = aiMove === "C" ? "Cooperated" : "Defected";
      const newCumulativePlayer = cumulativePlayer + playerPayout;
      const newCumulativeAI = cumulativeAI + aiPayout;

      const outcomeLabel = {
        caught: "🤝 Caught — you both showed up!",
        betrayed: "💥 You hit the ground — they stepped aside",
        exploited: "🏆 You stepped aside — they fell",
        "mutual-destruction": "💥 Mutual destruction — nobody caught anyone",
      }[outcome];

      const newAltitude = outcome === "caught" ? trustAltitude + 1 : 0;

      setResult(
        `Round ${roundNum}: You ${playerMoveText} | ${strategyRef.current.name} ${aiMoveText}\n${outcomeLabel}\nThis round: You ${playerPayout} XLM | AI ${aiPayout} XLM\nTotal: You ${newCumulativePlayer} XLM | AI ${newCumulativeAI} XLM${newAltitude > 0 ? `\n🏔️ Trust altitude: ${newAltitude}` : ""}`,
      );

      // Generate AI feedback
      void generateAIFeedback(record);
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      setTxError(`Error: ${errorMessage}`);
      setPlayerEmotion("sad");
      setAiEmotion("neutral");
      audioManager.playSound("error");
    } finally {
      setLoading(false);
    }
  };

  const newOpponent = () => {
    strategyRef.current = createStrategy(aiStrategyId);
    setRounds([]);
    setResult("");
    setMove("");
    setPlayerEmotion("neutral");
    setAiEmotion("neutral");
    setShowCharacters(false);
    setAiMessage("");
    audioManager.playSound("click");
  };

  const strategyInfo = getStrategyInfo(aiStrategyId);

  // Trust altitude visual height (0-10 scale, capped at 10)
  const altitudeHeight = Math.min(trustAltitude, 10) * 10;

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
              disabled={loading || mode === "multiplayer"}
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
                  mode === "multiplayer" && gameMode !== mode
                    ? "rgba(255,255,255,0.5)"
                    : "rgba(255,255,255,0.9)",
                fontFamily: "FuturaHandwritten",
                fontSize: "14px",
                cursor: mode === "multiplayer" ? "not-allowed" : "pointer",
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

      {/* Tournament mode renders its own full UI */}
      {gameMode === "tournament" ? (
        <TournamentMode />
      ) : (
        <>
          {/* Tutor toggle */}
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

          {/* Trust Altitude Visual */}
          {rounds.length > 0 && (
            <div
              style={{
                marginBottom: "20px",
                background: "rgba(255,255,255,0.08)",
                borderRadius: "12px",
                padding: "16px",
                border: "1px solid rgba(255,255,255,0.1)",
              }}
            >
              <Text
                as="p"
                size="sm"
                style={{
                  fontFamily: "FuturaHandwritten",
                  color: "rgba(255,255,255,0.7)",
                  margin: "0 0 10px 0",
                  fontSize: "0.85rem",
                }}
              >
                🏔️ Trust Altitude
              </Text>
              <div
                style={{
                  display: "flex",
                  alignItems: "flex-end",
                  gap: "10px",
                  height: "50px",
                }}
              >
                <div
                  className="tf-height-track"
                  style={{
                    flex: 1,
                    height: "40px",
                    display: "flex",
                    alignItems: "flex-end",
                  }}
                >
                  <div
                    className="tf-height-bar"
                    style={{
                      width: "100%",
                      height: `${altitudeHeight}%`,
                      background:
                        trustAltitude > 0
                          ? "linear-gradient(180deg, #ffb050 0%, #ff8c3c 100%)"
                          : "linear-gradient(180deg, #667eea 0%, #764ba2 100%)",
                    }}
                  />
                </div>
                <div style={{ fontSize: "20px", lineHeight: "40px" }}>
                  {trustAltitude > 0 ? "🧍⬆️" : "🧍"}
                </div>
              </div>
              <Text
                as="p"
                size="xs"
                style={{
                  fontFamily: "FuturaHandwritten",
                  color: "rgba(255,255,255,0.6)",
                  margin: "6px 0 0 0",
                  fontSize: "0.75rem",
                }}
              >
                {trustAltitude === 0
                  ? rounds.length > 0 &&
                    rounds[rounds.length - 1].outcome === "caught"
                    ? "Ground level"
                    : "On the ground — someone stumbled"
                  : trustAltitude < 3
                    ? `Height ${trustAltitude} — getting somewhere`
                    : trustAltitude < 6
                      ? `Height ${trustAltitude} — the fall would hurt`
                      : trustAltitude < 10
                        ? `Height ${trustAltitude} — a long way down`
                        : `Height ${trustAltitude} — the abyss stares back`}
              </Text>
            </div>
          )}

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
                    color: strategyInfo.color,
                    fontSize: "0.9rem",
                    marginTop: "5px",
                  }}
                >
                  {strategyInfo.emoji} {strategyInfo.name}
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

          {/* Strategy selector — all 9 strategies */}
          <div style={{ marginBottom: "20px" }}>
            <Text
              as="p"
              size="sm"
              style={{
                fontFamily: "FuturaHandwritten",
                color: "rgba(255,255,255,0.7)",
                margin: "0 0 8px 0",
                fontSize: "0.85rem",
              }}
            >
              Choose your opponent:
            </Text>
            <select
              value={aiStrategyId}
              onChange={(e) =>
                handleStrategyChange(e.target.value as StrategyId)
              }
              disabled={loading}
              style={{
                fontFamily: "FuturaHandwritten",
                padding: "8px",
                marginBottom: "10px",
                width: "100%",
              }}
            >
              {ALL_STRATEGY_IDS.map((id) => {
                const info = getStrategyInfo(id);
                return (
                  <option key={id} value={id}>
                    {info.emoji} {info.name} — {info.description}
                  </option>
                );
              })}
            </select>
            <Text
              as="p"
              size="xs"
              style={{
                fontFamily: "FuturaHandwritten",
                color: "rgba(255,255,255,0.5)",
                margin: 0,
                fontSize: "0.75rem",
                fontStyle: "italic",
              }}
            >
              {strategyInfo.description}
            </Text>
          </div>

          {/* Stake input */}
          <div style={{ marginBottom: "20px" }}>
            <Input
              value={stake}
              onChange={(e) => setStake(e.target.value || "1")}
              id="stake-input"
              fieldSize="md"
              placeholder="Stake (XLM)"
              type="number"
              min="0.1"
              step="0.1"
              disabled={loading}
              style={{ marginBottom: "10px", textAlign: "center" }}
            />
          </div>

          {/* Move buttons */}
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

          {/* Action buttons */}
          <div
            style={{
              display: "flex",
              gap: "10px",
              justifyContent: "center",
              marginBottom: "20px",
              flexWrap: "wrap",
            }}
          >
            <Button
              onClick={() => void playRound()}
              disabled={!move || loading}
              style={{ width: "140px" }}
              size="md"
            >
              {loading
                ? "Playing..."
                : rounds.length === 0
                  ? "Play Round"
                  : "Play Next Round"}
            </Button>

            {rounds.length > 0 && (
              <>
                <Button
                  onClick={() => {
                    setMove("");
                    setResult("");
                    audioManager.playSound("click");
                  }}
                  variant="secondary"
                  style={{ width: "120px" }}
                  size="md"
                >
                  Clear Move
                </Button>

                <Button
                  onClick={newOpponent}
                  variant="secondary"
                  style={{ width: "140px" }}
                  size="md"
                >
                  🔄 New Opponent
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

          {/* Latest round result */}
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

          {/* Move History Table */}
          {rounds.length > 0 && (
            <div
              style={{
                marginTop: "20px",
                background: "rgba(255,255,255,0.95)",
                borderRadius: "12px",
                padding: "16px",
                maxHeight: "300px",
                overflowY: "auto",
              }}
            >
              <Text
                as="h4"
                size="sm"
                style={{
                  fontFamily: "FuturaHandwritten",
                  color: "#333",
                  margin: "0 0 12px 0",
                  textAlign: "center",
                }}
              >
                📜 Move History — {rounds.length} round
                {rounds.length > 1 ? "s" : ""}
              </Text>
              <table
                style={{
                  width: "100%",
                  borderCollapse: "collapse",
                  fontSize: "13px",
                  fontFamily: "FuturaHandwritten",
                }}
              >
                <thead>
                  <tr style={{ borderBottom: "2px solid #ddd" }}>
                    <th style={{ padding: "6px 4px", color: "#666" }}>#</th>
                    <th style={{ padding: "6px 4px", color: "#666" }}>You</th>
                    <th style={{ padding: "6px 4px", color: "#666" }}>AI</th>
                    <th style={{ padding: "6px 4px", color: "#666" }}>You</th>
                    <th style={{ padding: "6px 4px", color: "#666" }}>AI</th>
                    <th style={{ padding: "6px 4px", color: "#666" }}>
                      Outcome
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {rounds
                    .slice()
                    .reverse()
                    .map((r) => (
                      <tr
                        key={r.round}
                        style={{ borderBottom: "1px solid #eee" }}
                      >
                        <td style={{ padding: "6px 4px", color: "#999" }}>
                          {r.round}
                        </td>
                        <td style={{ padding: "6px 4px" }}>
                          {r.playerMove === "C" ? "🤝" : "⚔️"}
                        </td>
                        <td style={{ padding: "6px 4px" }}>
                          {r.aiMove === "C" ? "🤝" : "⚔️"}
                        </td>
                        <td
                          style={{
                            padding: "6px 4px",
                            color: r.playerPayout > 0 ? "#4CAF50" : "#999",
                            fontWeight: "bold",
                          }}
                        >
                          {r.playerPayout}
                        </td>
                        <td
                          style={{
                            padding: "6px 4px",
                            color: r.aiPayout > 0 ? "#4CAF50" : "#999",
                            fontWeight: "bold",
                          }}
                        >
                          {r.aiPayout}
                        </td>
                        <td style={{ padding: "6px 4px", fontSize: "11px" }}>
                          {r.outcome === "caught" && "🤝 Caught"}
                          {r.outcome === "betrayed" && "💥 Fell"}
                          {r.outcome === "exploited" && "🏆 Stepped aside"}
                          {r.outcome === "mutual-destruction" && "💥 Both fell"}
                        </td>
                      </tr>
                    ))}
                </tbody>
              </table>
              {/* Cumulative totals */}
              <div
                style={{
                  marginTop: "12px",
                  display: "flex",
                  justifyContent: "space-around",
                  borderTop: "2px solid #ddd",
                  paddingTop: "10px",
                }}
              >
                <div>
                  <Text
                    as="p"
                    size="xs"
                    style={{ margin: 0, color: "#666", fontSize: "0.75rem" }}
                  >
                    Your total
                  </Text>
                  <Text
                    as="p"
                    size="sm"
                    style={{
                      margin: 0,
                      fontWeight: "bold",
                      color:
                        cumulativePlayer > cumulativeAI ? "#4CAF50" : "#333",
                    }}
                  >
                    {cumulativePlayer} XLM
                  </Text>
                </div>
                <div>
                  <Text
                    as="p"
                    size="xs"
                    style={{ margin: 0, color: "#666", fontSize: "0.75rem" }}
                  >
                    AI total
                  </Text>
                  <Text
                    as="p"
                    size="sm"
                    style={{
                      margin: 0,
                      fontWeight: "bold",
                      color:
                        cumulativeAI > cumulativePlayer ? "#F44336" : "#333",
                    }}
                  >
                    {cumulativeAI} XLM
                  </Text>
                </div>
              </div>
            </div>
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
          {showSummary && rounds.length > 0 && (
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
                    Peak Trust Altitude
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
                    🏔️ {sessionAnalysis.maxAltitude}
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
                    Total XLM
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
                    {cumulativePlayer} XLM
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
                Each round builds or breaks trust. Try different opponents to
                see how strategies evolve over repeated play.
              </Text>
            </div>
          )}
        </>
      )}
    </div>
  );
};
