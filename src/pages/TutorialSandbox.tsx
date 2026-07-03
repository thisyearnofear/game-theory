/**
 * TutorialSandbox — Interactive Prisoner's Dilemma vs AI strategies
 *
 * Extracted from the former GameSlide.tsx (1,381 lines) which embedded
 * three game modes as tabs. Now a standalone page at /learn/play focused
 * solely on the tutorial (vs AI) experience.
 *
 * Features: 9 stateful strategies, trust altitude, noise slider,
 * payoff matrix editor, strategy inspector, AI tutor feedback,
 * move history, session summary.
 */

import React, { useMemo, useRef, useState } from "react";
import { Character, CharacterEmotion } from "../components/Character";
import {
  VeniceAIService,
  type GameContext,
} from "../components/ai/VeniceAIService";
import { AI_PERSONAS } from "../components/ai/AIPersonas";
import AudioManager from "../components/AudioManager";
import { ShimmerButton } from "../components/ui/ShimmerButton";
import { StaggerButton } from "../components/ui/StaggerButton";
import { useFirstRun } from "../hooks/useFirstRun";
import { useMascot } from "../components/MascotContext";
import {
  createStrategy,
  getStrategyInfo,
  ALL_STRATEGY_IDS,
  type IteratedStrategy,
  type StrategyId,
  type GameMove,
  type PayoffMatrix,
  calculatePayoff,
  NC_DEFAULT,
} from "../util/strategies";
import { PayoffMatrixEditor } from "../components/slides/PayoffMatrixEditor";
import { StrategyInspector } from "../components/slides/StrategyInspector";

interface RoundRecord {
  round: number;
  playerMove: GameMove;
  aiMove: GameMove;
  playerPayout: number;
  aiPayout: number;
  outcome: "caught" | "betrayed" | "exploited" | "mutual-destruction";
}

interface AIPersona {
  name: string;
  emoji: string;
  color: string;
  personality: string;
}

export const TutorialSandbox: React.FC = () => {
  const { unlock, milestones } = useFirstRun();
  const { react: mascotReact } = useMascot();
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
  const [payoffMatrix, setPayoffMatrix] = useState<PayoffMatrix>(NC_DEFAULT);
  const [noise, setNoise] = useState(0);
  const [showPayoffEditor, setShowPayoffEditor] = useState(false);
  const [inspectedStrategy, setInspectedStrategy] = useState<StrategyId | null>(
    null,
  );

  const strategyRef = useRef<IteratedStrategy>(createStrategy("tft"));
  const [currentStrategyId, setCurrentStrategyId] = useState<StrategyId>("tft");

  const [aiPersona] = useState<AIPersona>(() => {
    const fallback: AIPersona = {
      name: "The Tutor",
      emoji: "🎓",
      color: "#667eea",
      personality: "Educational and supportive guide",
    };
    try {
      const personas = Object.values(AI_PERSONAS);
      const selected = personas[Math.floor(Math.random() * personas.length)];
      if (selected && "name" in selected) {
        const colors: Record<string, string> = {
          nash: "#6366f1",
          rousseau: "#8b5cf6",
          darwin: "#ec4899",
          pareto: "#f59e0b",
          cournot: "#3b82f6",
          rapoport: "#10b981",
        };
        return {
          name: selected.name,
          emoji: selected.avatar,
          color: colors[selected.id] || "#667eea",
          personality: selected.personality,
        };
      }
      return fallback;
    } catch {
      return fallback;
    }
  });
  const [aiMessage, setAiMessage] = useState<string>("");
  const veniceService = VeniceAIService.getInstance();

  const trustAltitude = useMemo(() => {
    let altitude = 0;
    for (const r of rounds) {
      if (r.playerMove === "C" && r.aiMove === "C") altitude++;
      else altitude = 0;
    }
    return altitude;
  }, [rounds]);

  const cumulativePlayer = useMemo(
    () => rounds.reduce((sum, r) => sum + r.playerPayout, 0),
    [rounds],
  );
  const cumulativeAI = useMemo(
    () => rounds.reduce((sum, r) => sum + r.aiPayout, 0),
    [rounds],
  );

  const audioManager = AudioManager.getInstance();

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
    const context: GameContext = {
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
      const fallbacks: Record<string, string> = {
        win: "Great choice! You're learning the dynamics of cooperation.",
        lose: "Interesting outcome. Consider how trust affects your decisions.",
        advice:
          "Think about the long-term benefits of cooperation vs. short-term gains.",
        encouragement: "Nice play! Each round teaches you something new.",
      };
      setAiMessage(fallbacks[requestType] || fallbacks.advice);
    }
  };

  const handleStrategyChange = (id: StrategyId) => {
    setAiStrategyId(id);
    if (id !== currentStrategyId) {
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
      let playerMove: GameMove = move === "cooperate" ? "C" : "D";
      const stakeAmount = parseFloat(stake) || 1;
      let aiMove = strategyRef.current.play();
      let noiseFlipped = false;
      if (Math.random() < noise) {
        playerMove = playerMove === "C" ? "D" : "C";
        noiseFlipped = true;
      }
      if (Math.random() < noise) {
        aiMove = aiMove === "C" ? "D" : "C";
        noiseFlipped = true;
      }
      const { playerPayout, aiPayout } = calculatePayoff(
        playerMove,
        aiMove,
        stakeAmount,
        payoffMatrix,
      );
      strategyRef.current.remember(aiMove, playerMove);
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
      if (outcome === "exploited") {
        setPlayerEmotion("happy");
        setAiEmotion("sad");
        audioManager.playSound("win");
        mascotReact("betrayed_opponent");
      } else if (outcome === "betrayed") {
        setPlayerEmotion("sad");
        setAiEmotion("happy");
        audioManager.playSound("lose");
        mascotReact("betrayed_by_opponent");
      } else if (outcome === "caught") {
        setPlayerEmotion("happy");
        setAiEmotion("happy");
        audioManager.playSound("coin");
        mascotReact("mutual_cooperation");
      } else {
        setPlayerEmotion("neutral");
        setAiEmotion("neutral");
        audioManager.playSound("defect");
        mascotReact("mutual_defection");
      }
      if (playerMove === "C") audioManager.playSound("cooperate");
      else audioManager.playSound("defect");
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
        `Round ${roundNum}: You ${playerMoveText} | ${strategyRef.current.name} ${aiMoveText}${noiseFlipped ? "\n💨 The wind caught someone — a move was flipped by noise!" : ""}\n${outcomeLabel}\nThis round: You ${playerPayout} XLM | AI ${aiPayout} XLM\nTotal: You ${newCumulativePlayer} XLM | AI ${newCumulativeAI} XLM${newAltitude > 0 ? `\n🏔️ Trust altitude: ${newAltitude}` : ""}`,
      );
      void generateAIFeedback(record);
      const wasFirstTutorial = !milestones.played_tutorial;
      unlock("played_tutorial");
      if (wasFirstTutorial) {
        mascotReact("tutorial_complete");
      }
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
  const altitudeHeight = Math.min(trustAltitude, 10) * 10;

  return (
    <div
      style={{
        maxWidth: "640px",
        margin: "0 auto",
        padding: "40px 20px 80px",
      }}
    >
      {/* Header */}
      <div style={{ marginBottom: "32px", textAlign: "center" }}>
        <h2
          style={{
            fontFamily: "var(--font-display)",
            fontSize: "var(--text-3xl)",
            marginBottom: "8px",
          }}
        >
          🤝 Tutorial — vs AI
        </h2>
        <p
          style={{
            fontFamily: "var(--font-body)",
            fontSize: "var(--text-base)",
            color: "var(--text-secondary)",
            maxWidth: "480px",
            margin: "0 auto",
          }}
        >
          Play the iterated Prisoner's Dilemma against 9 stateful strategies. No
          wallet needed — pure learning.
        </p>
      </div>

      {/* Tutor toggle */}
      <div
        style={{
          position: "fixed",
          top: "80px",
          right: "24px",
          zIndex: 40,
        }}
      >
        <button
          type="button"
          onClick={() => setShowTutor(!showTutor)}
          style={{
            width: "40px",
            height: "40px",
            borderRadius: "50%",
            border: "1px solid var(--border-glass)",
            fontSize: "16px",
            background: showTutor
              ? "rgba(102, 126, 234, 0.2)"
              : "var(--bg-glass-light)",
            cursor: "pointer",
            backdropFilter: "blur(12px)",
          }}
        >
          🧙‍♂️
        </button>
      </div>

      {/* Trust Altitude Visual */}
      {rounds.length > 0 && (
        <div
          className="glass-panel"
          style={{ padding: "16px", marginBottom: "20px" }}
        >
          <p
            style={{
              fontFamily: "var(--font-body)",
              color: "var(--text-muted)",
              margin: "0 0 10px 0",
              fontSize: "var(--text-sm)",
            }}
          >
            🏔️ Trust Altitude
          </p>
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
          <p
            style={{
              fontFamily: "var(--font-body)",
              color: "var(--text-muted)",
              margin: "6px 0 0 0",
              fontSize: "var(--text-xs)",
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
          </p>
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
            <p
              style={{
                fontFamily: "var(--font-body)",
                color: "var(--text-secondary)",
                fontSize: "var(--text-sm)",
                marginTop: "5px",
              }}
            >
              You
            </p>
          </div>
          <span
            style={{
              fontFamily: "var(--font-body)",
              color: "var(--text-muted)",
              fontSize: "var(--text-xl)",
            }}
          >
            VS
          </span>
          <div style={{ textAlign: "center" }}>
            <Character
              type="defector"
              emotion={aiEmotion}
              size="large"
              animate={result !== ""}
            />
            <p
              style={{
                fontFamily: "var(--font-body)",
                color: strategyInfo.color,
                fontSize: "var(--text-sm)",
                marginTop: "5px",
              }}
            >
              {strategyInfo.emoji} {strategyInfo.name}
            </p>
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
        <div className="payoff-cell payoff-cooperate">
          Both get {payoffMatrix.R}×
        </div>
        <div className="payoff-cell payoff-mixed">
          You: {payoffMatrix.S}×, AI: {payoffMatrix.T}×
        </div>
        <div className="payoff-cell payoff-header">You Defect</div>
        <div className="payoff-cell payoff-mixed">
          You: {payoffMatrix.T}×, AI: {payoffMatrix.S}×
        </div>
        <div className="payoff-cell payoff-defect">
          Both get {payoffMatrix.P}×
        </div>
      </div>

      {/* Strategy selector */}
      <div style={{ marginBottom: "20px" }}>
        <p
          style={{
            fontFamily: "var(--font-body)",
            color: "var(--text-muted)",
            margin: "0 0 8px 0",
            fontSize: "var(--text-sm)",
          }}
        >
          Choose your opponent:
        </p>
        <select
          value={aiStrategyId}
          onChange={(e) => handleStrategyChange(e.target.value as StrategyId)}
          disabled={loading}
          style={{
            fontFamily: "var(--font-body)",
            padding: "8px",
            marginBottom: "10px",
            width: "100%",
            background: "var(--bg-glass-light)",
            color: "var(--text-primary)",
            border: "1px solid var(--border-glass)",
            borderRadius: "var(--radius-sm)",
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
        <p
          style={{
            fontFamily: "var(--font-body)",
            color: "var(--text-muted)",
            margin: 0,
            fontSize: "var(--text-xs)",
            fontStyle: "italic",
          }}
        >
          {strategyInfo.description}
        </p>
      </div>

      {/* Stake input */}
      <div style={{ marginBottom: "20px" }}>
        <input
          value={stake}
          onChange={(e) => setStake(e.target.value || "1")}
          placeholder="Stake (XLM)"
          type="number"
          min="0.1"
          step="0.1"
          disabled={loading}
          style={{
            fontFamily: "var(--font-body)",
            padding: "10px",
            width: "100%",
            textAlign: "center",
            background: "var(--bg-glass-light)",
            color: "var(--text-primary)",
            border: "1px solid var(--border-glass)",
            borderRadius: "var(--radius-sm)",
          }}
        />
      </div>

      {/* Noise slider */}
      <div
        className="glass-panel"
        style={{ padding: "12px", marginBottom: "20px" }}
      >
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            marginBottom: "4px",
          }}
        >
          <span
            style={{
              fontFamily: "var(--font-body)",
              color: "var(--text-secondary)",
              fontSize: "var(--text-sm)",
            }}
          >
            💨 Noise — "the wind caught you"
          </span>
          <span
            style={{
              fontFamily: "var(--font-body)",
              color:
                noise > 0.1 ? "var(--accent-warm)" : "var(--text-secondary)",
              fontSize: "var(--text-sm)",
              fontWeight: "bold",
            }}
          >
            {(noise * 100).toFixed(0)}%
          </span>
        </div>
        <input
          type="range"
          min="0"
          max="0.5"
          step="0.01"
          value={noise}
          onChange={(e) => setNoise(parseFloat(e.target.value))}
          disabled={loading}
          style={{ width: "100%", accentColor: "var(--accent-violet)" }}
        />
        <p
          style={{
            fontFamily: "var(--font-body)",
            color: "var(--text-muted)",
            margin: "4px 0 0 0",
            fontSize: "var(--text-xs)",
            textAlign: "left",
          }}
        >
          {noise === 0
            ? "No mistakes — your move is your move"
            : noise < 0.05
              ? "Rare slips — sometimes your hand slips"
              : noise < 0.15
                ? "Frequent mistakes — trust is harder to build"
                : "Chaos — noise drowns out intention"}
        </p>
      </div>

      {/* Payoff matrix editor toggle */}
      <div style={{ marginBottom: "20px" }}>
        <button
          type="button"
          onClick={() => setShowPayoffEditor(!showPayoffEditor)}
          style={{
            fontFamily: "var(--font-body)",
            width: "100%",
            padding: "10px",
            borderRadius: "var(--radius-sm)",
            border: "1px solid var(--border-glass)",
            background: showPayoffEditor
              ? "rgba(102, 126, 234, 0.15)"
              : "var(--bg-glass-light)",
            color: "var(--text-secondary)",
            cursor: "pointer",
          }}
        >
          🎛️ {showPayoffEditor ? "Hide" : "Edit"} Payoff Matrix
        </button>
        {showPayoffEditor && (
          <div style={{ marginTop: "10px" }}>
            <PayoffMatrixEditor
              payoffs={payoffMatrix}
              onChange={setPayoffMatrix}
              compact
            />
          </div>
        )}
      </div>

      {/* Strategy inspector toggle */}
      <div style={{ marginBottom: "20px" }}>
        <button
          type="button"
          onClick={() =>
            setInspectedStrategy(inspectedStrategy ? null : aiStrategyId)
          }
          style={{
            fontFamily: "var(--font-body)",
            width: "100%",
            padding: "10px",
            borderRadius: "var(--radius-sm)",
            border: "1px solid var(--border-glass)",
            background: inspectedStrategy
              ? "rgba(102, 126, 234, 0.15)"
              : "var(--bg-glass-light)",
            color: "var(--text-secondary)",
            cursor: "pointer",
          }}
        >
          🔍 {inspectedStrategy ? "Hide" : "Inspect"} {strategyInfo.name}
        </button>
        {inspectedStrategy && (
          <StrategyInspector strategyId={inspectedStrategy} />
        )}
      </div>

      {/* Move buttons */}
      <div
        style={{
          display: "flex",
          gap: "12px",
          justifyContent: "center",
          marginBottom: "20px",
        }}
      >
        <StaggerButton
          onClick={() => {
            setMove("cooperate");
            audioManager.playSound("click");
          }}
          color="cooperate"
          size="md"
          disabled={loading}
        >
          🤝 Cooperate
        </StaggerButton>
        <StaggerButton
          onClick={() => {
            setMove("defect");
            audioManager.playSound("click");
          }}
          color="defect"
          size="md"
          disabled={loading}
        >
          💀 Defect
        </StaggerButton>
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
        <ShimmerButton
          onClick={() => void playRound()}
          disabled={!move || loading}
          size="md"
        >
          {loading
            ? "Playing..."
            : rounds.length === 0
              ? "Play Round"
              : "Play Next Round"}
        </ShimmerButton>
        {rounds.length > 0 && (
          <>
            <ShimmerButton
              onClick={() => {
                setMove("");
                setResult("");
                audioManager.playSound("click");
              }}
              size="md"
            >
              Clear Move
            </ShimmerButton>
            <ShimmerButton onClick={newOpponent} size="md">
              🔄 New Opponent
            </ShimmerButton>
            <ShimmerButton
              onClick={() => setShowSummary(!showSummary)}
              size="md"
            >
              📊 Summary
            </ShimmerButton>
          </>
        )}
      </div>

      {txError && (
        <div
          className="glass-panel"
          style={{
            padding: "12px",
            marginBottom: "10px",
            borderColor: "var(--accent-defect)",
            color: "var(--accent-defect)",
            fontSize: "var(--text-sm)",
          }}
        >
          ⚠️ {txError}
        </div>
      )}

      {/* Latest round result */}
      {result && (
        <div
          className="glass-panel"
          style={{
            padding: "15px",
            whiteSpace: "pre-line",
            fontSize: "var(--text-sm)",
            color: "var(--text-primary)",
          }}
        >
          {result}
        </div>
      )}

      {/* Move History Table */}
      {rounds.length > 0 && (
        <div
          className="glass-panel"
          style={{
            padding: "16px",
            marginTop: "20px",
            maxHeight: "300px",
            overflowY: "auto",
          }}
        >
          <h4
            style={{
              fontFamily: "var(--font-body)",
              color: "var(--text-primary)",
              margin: "0 0 12px 0",
              textAlign: "center",
              fontSize: "var(--text-sm)",
            }}
          >
            📜 Move History — {rounds.length} round
            {rounds.length > 1 ? "s" : ""}
          </h4>
          <table
            style={{
              width: "100%",
              borderCollapse: "collapse",
              fontSize: "13px",
              fontFamily: "var(--font-body)",
            }}
          >
            <thead>
              <tr style={{ borderBottom: "1px solid var(--border-glass)" }}>
                {["#", "You", "AI", "You", "AI", "Outcome"].map((h) => (
                  <th
                    key={h}
                    style={{
                      padding: "6px 4px",
                      color: "var(--text-secondary)",
                    }}
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rounds
                .slice()
                .reverse()
                .map((r) => (
                  <tr
                    key={r.round}
                    style={{ borderBottom: "1px solid var(--border-glass)" }}
                  >
                    <td
                      style={{ padding: "6px 4px", color: "var(--text-muted)" }}
                    >
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
                        color:
                          r.playerPayout > 0
                            ? "var(--accent-cooperate)"
                            : "var(--text-muted)",
                        fontWeight: "bold",
                      }}
                    >
                      {r.playerPayout}
                    </td>
                    <td
                      style={{
                        padding: "6px 4px",
                        color:
                          r.aiPayout > 0
                            ? "var(--accent-cooperate)"
                            : "var(--text-muted)",
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
              borderTop: "1px solid var(--border-glass)",
              paddingTop: "10px",
            }}
          >
            <div>
              <p
                style={{
                  margin: 0,
                  color: "var(--text-secondary)",
                  fontSize: "var(--text-xs)",
                }}
              >
                Your total
              </p>
              <p
                style={{
                  margin: 0,
                  fontWeight: "bold",
                  color:
                    cumulativePlayer > cumulativeAI
                      ? "var(--accent-cooperate)"
                      : "var(--text-primary)",
                }}
              >
                {cumulativePlayer} XLM
              </p>
            </div>
            <div>
              <p
                style={{
                  margin: 0,
                  color: "var(--text-secondary)",
                  fontSize: "var(--text-xs)",
                }}
              >
                AI total
              </p>
              <p
                style={{
                  margin: 0,
                  fontWeight: "bold",
                  color:
                    cumulativeAI > cumulativePlayer
                      ? "var(--accent-defect)"
                      : "var(--text-primary)",
                }}
              >
                {cumulativeAI} XLM
              </p>
            </div>
          </div>
        </div>
      )}

      {/* AI Tutor Feedback */}
      {result && aiMessage && showTutor && (
        <div
          className="glass-panel"
          style={{
            padding: "20px",
            marginTop: "20px",
            borderColor: aiPersona.color,
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
            <h4
              style={{
                fontFamily: "var(--font-body)",
                color: aiPersona.color,
                margin: 0,
              }}
            >
              {aiPersona.name}
            </h4>
          </div>
          <p
            style={{
              fontFamily: "var(--font-body)",
              color: "var(--text-primary)",
              lineHeight: "1.4",
              margin: 0,
            }}
          >
            {aiMessage}
          </p>
        </div>
      )}

      {/* Session Summary */}
      {showSummary && rounds.length > 0 && (
        <div
          className="glass-panel"
          style={{
            padding: "20px",
            marginTop: "20px",
            borderColor: "rgba(102, 126, 234, 0.3)",
          }}
        >
          <h4
            style={{
              fontFamily: "var(--font-body)",
              color: "var(--accent-violet)",
              margin: "0 0 15px 0",
            }}
          >
            📊 Session Summary
          </h4>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "1fr 1fr",
              gap: "15px",
              marginBottom: "15px",
            }}
          >
            <div style={{ textAlign: "center" }}>
              <p
                style={{
                  color: "var(--text-secondary)",
                  margin: "0 0 5px 0",
                  fontSize: "var(--text-sm)",
                }}
              >
                Record
              </p>
              <p
                style={{
                  color: "var(--text-primary)",
                  margin: 0,
                  fontWeight: "bold",
                }}
              >
                {sessionAnalysis.wins}W {sessionAnalysis.losses}L{" "}
                {sessionAnalysis.ties}T
              </p>
            </div>
            <div style={{ textAlign: "center" }}>
              <p
                style={{
                  color: "var(--text-secondary)",
                  margin: "0 0 5px 0",
                  fontSize: "var(--text-sm)",
                }}
              >
                Cooperation Rate
              </p>
              <p
                style={{
                  color: "var(--text-primary)",
                  margin: 0,
                  fontWeight: "bold",
                }}
              >
                {sessionAnalysis.cooperationRate.toFixed(0)}%
              </p>
            </div>
            <div style={{ textAlign: "center" }}>
              <p
                style={{
                  color: "var(--text-secondary)",
                  margin: "0 0 5px 0",
                  fontSize: "var(--text-sm)",
                }}
              >
                Peak Trust Altitude
              </p>
              <p
                style={{
                  color: "var(--text-primary)",
                  margin: 0,
                  fontWeight: "bold",
                }}
              >
                🏔️ {sessionAnalysis.maxAltitude}
              </p>
            </div>
            <div style={{ textAlign: "center" }}>
              <p
                style={{
                  color: "var(--text-secondary)",
                  margin: "0 0 5px 0",
                  fontSize: "var(--text-sm)",
                }}
              >
                Total XLM
              </p>
              <p
                style={{
                  color: "var(--text-primary)",
                  margin: 0,
                  fontWeight: "bold",
                }}
              >
                {cumulativePlayer} XLM
              </p>
            </div>
          </div>
          <p
            style={{
              color: "var(--text-secondary)",
              fontSize: "var(--text-sm)",
              margin: 0,
              fontStyle: "italic",
              textAlign: "center",
            }}
          >
            Each round builds or breaks trust. Try different opponents to see
            how strategies evolve over repeated play.
          </p>
        </div>
      )}
    </div>
  );
};
