import { useState } from "react";
import { Button, Input, Text } from "@stellar/design-system";
import { useWallet } from "../hooks/useWallet";
import { Howl } from "howler";
import pd from "../contracts/prisoners_dilemma";
import "../styles/slides.css";
import "../styles/balloon.css";

interface SeriesRound {
  playerMove: "C" | "D";
  aiMove: "C" | "D";
  playerPayout: number;
  aiPayout: number;
  outcome: "win" | "lose" | "tie";
}

export const PrisonersDilemma = () => {
  const [gameId, setGameId] = useState<number>();
  const [move, setMove] = useState<string>("");
  const [stake, setStake] = useState<string>("1");
  const [status, setStatus] = useState<string>("");
  const [loading, setLoading] = useState<boolean>(false);
  const [gameMode, setGameMode] = useState<"single" | "multi">("single");
  const [aiStrategy, setAiStrategy] = useState<
    "random" | "cooperator" | "defector" | "tit-for-tat"
  >("random");
  const [seriesLength, setSeriesLength] = useState<number | "unlimited">(5);
  const [currentRound, setCurrentRound] = useState<number>(1);
  const [seriesHistory, setSeriesHistory] = useState<SeriesRound[]>([]);
  const [seriesStarted, setSeriesStarted] = useState<boolean>(false);
  const [seriesComplete, setSeriesComplete] = useState<boolean>(false);
  const { address } = useWallet();

  // Sound effects
  const coinSound = new Howl({ src: ["/assets/sounds/coin_insert.mp3"] });
  const clickSound = new Howl({
    src: ["/assets/sounds/click_plink_pop_boop.mp3"],
  });

  if (!address) {
    return (
      <div style={{ textAlign: "center", padding: "20px" }}>
        <Text
          as="p"
          size="lg"
          style={{
            fontFamily: "FuturaHandwritten",
            color: "#667eea",
            fontWeight: "bold",
          }}
        >
          Connect wallet to play Prisoner's Dilemma with real stakes!
        </Text>
      </div>
    );
  }

  const getAiMove = (strategy: string): "C" | "D" => {
    switch (strategy) {
      case "cooperator":
        return "C";
      case "defector":
        return "D";
      case "tit-for-tat":
        return Math.random() > 0.5 ? "C" : "D"; // Simplified for demo
      case "random":
      default:
        return Math.random() > 0.5 ? "C" : "D";
    }
  };

  const calculatePayoffs = (
    playerMove: "C" | "D",
    aiMove: "C" | "D",
    stakeAmount: number,
  ) => {
    if (playerMove === "C" && aiMove === "C")
      return [2 * stakeAmount, 2 * stakeAmount]; // Both cooperate
    if (playerMove === "C" && aiMove === "D") return [0, 3 * stakeAmount]; // Player cooperates, AI defects
    if (playerMove === "D" && aiMove === "C") return [3 * stakeAmount, 0]; // Player defects, AI cooperates
    return [0, 0]; // Both defect
  };

  const playSinglePlayer = () => {
    if (!move || !address) return;

    setLoading(true);
    clickSound.play();

    try {
      const stakeAmount = parseFloat(stake);
      const playerMove = move === "cooperate" ? "C" : "D";
      const aiMove = getAiMove(aiStrategy);

      const [playerPayout, aiPayout] = calculatePayoffs(
        playerMove,
        aiMove,
        stakeAmount,
      );
      const outcome =
        playerPayout > aiPayout
          ? "win"
          : playerPayout === aiPayout
            ? "tie"
            : "lose";

      const aiMoveText = aiMove === "C" ? "Cooperated" : "Defected";
      const playerMoveText = playerMove === "C" ? "Cooperated" : "Defected";

      // Record this round in history
      const newRound: SeriesRound = {
        playerMove,
        aiMove,
        playerPayout,
        aiPayout,
        outcome,
      };

      const updatedHistory = [...seriesHistory, newRound];
      setSeriesHistory(updatedHistory);

      // Check if series is complete
      const isComplete =
        seriesLength !== "unlimited" && currentRound >= seriesLength;

      setStatus(`
        Round ${currentRound}
        You: ${playerMoveText} | AI (${aiStrategy}): ${aiMoveText}
        This round: You ${playerPayout} XLM | AI ${aiPayout} XLM
        
        Total: You ${updatedHistory.reduce((sum, r) => sum + r.playerPayout, 0)} XLM | AI ${updatedHistory.reduce((sum, r) => sum + r.aiPayout, 0)} XLM
      `);

      if (isComplete) {
        setSeriesComplete(true);
      } else {
        setCurrentRound(currentRound + 1);
      }

      setMove(""); // Reset move for next round
    } catch (error) {
      setStatus(`Error: ${String(error)}`);
    } finally {
      setLoading(false);
    }
  };

  const startSeries = () => {
    if (!gameMode || !stake) return;
    setSeriesStarted(true);
    setCurrentRound(1);
    setSeriesHistory([]);
    setSeriesComplete(false);
    setStatus(
      `Series starting with ${seriesLength === "unlimited" ? "unlimited" : seriesLength} round${seriesLength === 1 ? "" : "s"}`,
    );
  };

  const resetSeries = () => {
    setSeriesStarted(false);
    setSeriesComplete(false);
    setCurrentRound(1);
    setSeriesHistory([]);
    setMove("");
    setStatus("");
  };

  const createGame = async () => {
    if (!stake || !address) return;

    setLoading(true);
    coinSound.play();

    try {
      const stakeAmount = BigInt(parseFloat(stake) * 10_000_000);
      const result = await pd.create_game({
        player1: address,
        stake: stakeAmount,
      });

      const newGameId = Number(result);
      setGameId(newGameId);
      setStatus(`Game created! Game ID: ${newGameId}. Waiting for player 2.`);
    } catch (error) {
      setStatus(`Error: ${String(error)}`);
    } finally {
      setLoading(false);
    }
  };

  const joinGame = async () => {
    if (!gameId || !move || !address) return;

    setLoading(true);
    clickSound.play();

    try {
      await pd.join_game({
        player2: address,
        game_id: BigInt(gameId),
        move_: move === "cooperate" ? "C" : "D",
      });

      setStatus(
        "Joined game successfully! Moves submitted. Resolve to see results.",
      );
    } catch (error) {
      setStatus(`Error: ${String(error)}`);
    } finally {
      setLoading(false);
    }
  };

  const resolveGame = async () => {
    if (!gameId) return;

    setLoading(true);
    clickSound.play();

    try {
      const result = await pd.resolve_game({
        game_id: BigInt(gameId),
      });

      const [payout1, payout2] = result;
      setStatus(
        `Game resolved! Payouts: Player 1: ${Number(payout1) / 10_000_000} XLM, Player 2: ${Number(payout2) / 10_000_000} XLM`,
      );
    } catch (error) {
      setStatus(`Error: ${String(error)}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ textAlign: "center" }}>
      <Text
        as="h2"
        style={{
          fontFamily: "FuturaHandwritten",
          marginBottom: "15px",
          color: "#333",
          fontSize: "1.8rem",
        }}
      >
        Prisoner's Dilemma with Skin in the Game
      </Text>

      <Text
        as="p"
        style={{
          fontFamily: "FuturaHandwritten",
          marginBottom: "25px",
          color: "#667eea",
          fontWeight: "bold",
          fontSize: "1.1rem",
        }}
      >
        Stake XLM and choose to Cooperate or Defect. Outcomes affect your
        wallet!
      </Text>

      {/* Game Mode Selection */}
      <div style={{ marginBottom: "20px" }}>
        <Text
          as="label"
          style={{
            fontFamily: "FuturaHandwritten",
            display: "block",
            marginBottom: "8px",
            color: "#333",
            fontSize: "1.1rem",
          }}
        >
          Game Mode
        </Text>
        <div style={{ display: "flex", gap: "10px", justifyContent: "center" }}>
          <Button
            variant={gameMode === "single" ? "primary" : "secondary"}
            onClick={() => setGameMode("single")}
            style={{ fontFamily: "FuturaHandwritten" }}
          >
            vs AI
          </Button>
          <Button
            variant={gameMode === "multi" ? "primary" : "secondary"}
            onClick={() => setGameMode("multi")}
            style={{ fontFamily: "FuturaHandwritten" }}
          >
            vs Player
          </Button>
        </div>
      </div>

      {!seriesStarted && (
        <>
          {gameMode === "single" && (
            <div style={{ marginBottom: "20px" }}>
              <Text
                as="label"
                style={{
                  fontFamily: "FuturaHandwritten",
                  display: "block",
                  marginBottom: "8px",
                  color: "#333",
                  fontSize: "1rem",
                }}
              >
                AI Strategy
              </Text>
              <select
                value={aiStrategy}
                onChange={(e) =>
                  setAiStrategy(
                    e.target.value as
                      | "cooperator"
                      | "defector"
                      | "random"
                      | "tit-for-tat",
                  )
                }
                style={{
                  fontFamily: "FuturaHandwritten",
                  padding: "8px",
                  borderRadius: "4px",
                  border: "1px solid #ccc",
                }}
              >
                <option value="random">Random</option>
                <option value="cooperator">Always Cooperate</option>
                <option value="defector">Always Defect</option>
                <option value="tit-for-tat">Tit-for-Tat</option>
              </select>
            </div>
          )}

          <div style={{ marginBottom: "20px" }}>
            <Text
              as="label"
              style={{
                fontFamily: "FuturaHandwritten",
                display: "block",
                marginBottom: "8px",
                color: "#333",
                fontSize: "1rem",
              }}
            >
              Series Length
            </Text>
            <div
              style={{
                display: "flex",
                gap: "10px",
                justifyContent: "center",
                flexWrap: "wrap",
              }}
            >
              {[5, 10, 20].map((len) => (
                <Button
                  key={len}
                  variant={seriesLength === len ? "primary" : "secondary"}
                  onClick={() => setSeriesLength(len)}
                  style={{ fontFamily: "FuturaHandwritten" }}
                >
                  {len} rounds
                </Button>
              ))}
              <Button
                variant={seriesLength === "unlimited" ? "primary" : "secondary"}
                onClick={() => setSeriesLength("unlimited")}
                style={{ fontFamily: "FuturaHandwritten" }}
              >
                Unlimited
              </Button>
            </div>
          </div>
        </>
      )}

      {/* Payoff Matrix */}
      <Text
        as="h3"
        style={{
          fontFamily: "FuturaHandwritten",
          marginBottom: "15px",
          color: "#333",
          fontSize: "1.4rem",
        }}
      >
        The Payoff Matrix (Stakes in XLM)
      </Text>

      <Text
        as="p"
        style={{
          fontFamily: "FuturaHandwritten",
          marginBottom: "20px",
          color: "#666",
          fontSize: "1rem",
        }}
      >
        Your choices determine payouts:
      </Text>

      <div
        className="payoff-matrix"
        style={{ fontSize: "14px", margin: "20px auto" }}
      >
        <div className="payoff-cell payoff-header"></div>
        <div className="payoff-cell payoff-header">Opponent Cooperates</div>
        <div className="payoff-cell payoff-header">Opponent Defects</div>

        <div className="payoff-cell payoff-header">You Cooperate</div>
        <div className="payoff-cell payoff-cooperate">
          Both get 2 XLM
          <br />
          <small>(Reward)</small>
        </div>
        <div className="payoff-cell payoff-mixed">
          You: 0, Opponent: 3<br />
          <small>(Sucker/Temptation)</small>
        </div>

        <div className="payoff-cell payoff-header">You Defect</div>
        <div className="payoff-cell payoff-mixed">
          You: 3, Opponent: 0<br />
          <small>(Temptation/Sucker)</small>
        </div>
        <div className="payoff-cell payoff-defect">
          Both get 0 XLM
          <br />
          <small>(Punishment)</small>
        </div>
      </div>

      <Text
        as="p"
        style={{
          fontFamily: "FuturaHandwritten",
          marginBottom: "30px",
          fontStyle: "italic",
          color: "#666",
          fontSize: "1rem",
        }}
      >
        Choose wisely!{" "}
        {gameMode === "single"
          ? "The AI is watching..."
          : "Your opponent is waiting..."}
      </Text>

      {/* Game Interface */}
      <div style={{ maxWidth: "500px", margin: "0 auto" }}>
        {!seriesStarted ? (
          <div style={{ marginBottom: "20px" }}>
            <Text
              as="label"
              style={{
                fontFamily: "FuturaHandwritten",
                display: "block",
                marginBottom: "8px",
                color: "#333",
                fontSize: "1.1rem",
              }}
            >
              Stake per Round (XLM)
            </Text>
            <Input
              value={stake}
              onChange={(e) => setStake(e.target.value)}
              placeholder="Enter stake amount"
              type="number"
              min="0.1"
              step="0.1"
              style={{ textAlign: "center", fontFamily: "FuturaHandwritten" }}
            />
          </div>
        ) : null}

        {seriesStarted && !seriesComplete && (
          <div
            style={{
              backgroundColor: "#f5f5f5",
              padding: "15px",
              borderRadius: "8px",
              marginBottom: "20px",
              textAlign: "left",
            }}
          >
            <Text
              as="p"
              style={{
                fontFamily: "FuturaHandwritten",
                margin: "0 0 10px 0",
                color: "#333",
                fontSize: "1.2rem",
                fontWeight: "bold",
              }}
            >
              Round {currentRound} of{" "}
              {seriesLength === "unlimited" ? "∞" : seriesLength}
            </Text>
            <div
              style={{
                width: "100%",
                height: "8px",
                backgroundColor: "#ddd",
                borderRadius: "4px",
                overflow: "hidden",
              }}
            >
              {seriesLength !== "unlimited" && (
                <div
                  style={{
                    width: `${(currentRound / seriesLength) * 100}%`,
                    height: "100%",
                    backgroundColor: "#667eea",
                    transition: "width 0.3s",
                  }}
                />
              )}
            </div>
            {seriesHistory.length > 0 && (
              <Text
                as="p"
                style={{
                  fontFamily: "FuturaHandwritten",
                  margin: "10px 0 0 0",
                  color: "#666",
                  fontSize: "0.9rem",
                }}
              >
                You: {seriesHistory.reduce((sum, r) => sum + r.playerPayout, 0)}{" "}
                XLM | AI:{" "}
                {seriesHistory.reduce((sum, r) => sum + r.aiPayout, 0)} XLM
              </Text>
            )}
          </div>
        )}

        {seriesComplete && (
          <div
            style={{
              backgroundColor: "#e8f5e9",
              padding: "20px",
              borderRadius: "8px",
              marginBottom: "20px",
              textAlign: "center",
            }}
          >
            <Text
              as="h3"
              style={{
                fontFamily: "FuturaHandwritten",
                margin: "0 0 10px 0",
                color: "#2e7d32",
                fontSize: "1.4rem",
              }}
            >
              Series Complete!
            </Text>
            <Text
              as="p"
              style={{
                fontFamily: "FuturaHandwritten",
                margin: "10px 0",
                color: "#333",
                fontSize: "1.1rem",
              }}
            >
              You earned{" "}
              {seriesHistory.reduce((sum, r) => sum + r.playerPayout, 0)} XLM
            </Text>
            <Text
              as="p"
              style={{
                fontFamily: "FuturaHandwritten",
                margin: "10px 0",
                color: "#333",
                fontSize: "1.1rem",
              }}
            >
              AI earned {seriesHistory.reduce((sum, r) => sum + r.aiPayout, 0)}{" "}
              XLM
            </Text>
          </div>
        )}

        {seriesStarted && !seriesComplete && (
          <div style={{ marginBottom: "20px" }}>
            <Text
              as="label"
              style={{
                fontFamily: "FuturaHandwritten",
                display: "block",
                marginBottom: "8px",
                color: "#333",
                fontSize: "1.1rem",
              }}
            >
              Your Move
            </Text>
            <div
              style={{ display: "flex", gap: "10px", justifyContent: "center" }}
            >
              <Button
                variant={move === "cooperate" ? "primary" : "secondary"}
                onClick={() => setMove("cooperate")}
                style={{ fontFamily: "FuturaHandwritten" }}
                disabled={loading}
              >
                🤝 Cooperate
              </Button>
              <Button
                variant={move === "defect" ? "primary" : "secondary"}
                onClick={() => setMove("defect")}
                style={{ fontFamily: "FuturaHandwritten" }}
                disabled={loading}
              >
                💀 Defect
              </Button>
            </div>
          </div>
        )}

        {gameMode === "single" && seriesStarted && !seriesComplete ? (
          <div
            style={{
              display: "flex",
              justifyContent: "center",
              marginBottom: "20px",
            }}
          >
            <Button
              onClick={() => void playSinglePlayer()}
              disabled={!move || loading}
              style={{
                fontFamily: "FuturaHandwritten",
                width: "100%",
              }}
            >
              {loading ? "Playing..." : "Play This Round"}
            </Button>
          </div>
        ) : gameMode === "single" && !seriesStarted ? (
          <div
            style={{
              display: "flex",
              justifyContent: "center",
              marginBottom: "20px",
            }}
          >
            <Button
              onClick={() => startSeries()}
              disabled={!stake || loading}
              style={{
                fontFamily: "FuturaHandwritten",
                width: "100%",
              }}
            >
              {loading ? "Starting..." : "Start Series"}
            </Button>
          </div>
        ) : gameMode === "single" && seriesComplete ? (
          <div
            style={{
              display: "flex",
              gap: "10px",
              justifyContent: "center",
              marginBottom: "20px",
            }}
          >
            <Button
              onClick={() => resetSeries()}
              style={{
                fontFamily: "FuturaHandwritten",
                flex: 1,
              }}
            >
              Play Another Series
            </Button>
            <Button
              onClick={() => resetSeries()}
              variant="secondary"
              style={{
                fontFamily: "FuturaHandwritten",
                flex: 1,
              }}
            >
              Change Settings
            </Button>
          </div>
        ) : gameMode === "multi" ? (
          <>
            {!seriesStarted ? (
              <div
                style={{
                  display: "flex",
                  justifyContent: "center",
                  marginBottom: "20px",
                }}
              >
                <Button
                  onClick={() => void createGame()}
                  disabled={!stake || loading}
                  style={{
                    fontFamily: "FuturaHandwritten",
                    width: "100%",
                  }}
                >
                  {loading ? "Creating..." : "Create Game"}
                </Button>
              </div>
            ) : null}

            {gameId && (
              <div style={{ marginBottom: "20px" }}>
                <Text
                  as="p"
                  style={{
                    fontFamily: "FuturaHandwritten",
                    color: "#333",
                    fontSize: "1rem",
                    marginBottom: "10px",
                  }}
                >
                  Game ID: {gameId}
                </Text>
              </div>
            )}

            <div
              style={{
                display: "flex",
                gap: "10px",
                justifyContent: "center",
                marginBottom: "20px",
              }}
            >
              <Button
                onClick={() => void joinGame()}
                disabled={!gameId || !move || loading}
                style={{ fontFamily: "FuturaHandwritten", flex: 1 }}
              >
                {loading ? "Joining..." : "Join Game"}
              </Button>
              <Button
                onClick={() => void resolveGame()}
                disabled={!gameId || loading}
                style={{ fontFamily: "FuturaHandwritten", flex: 1 }}
              >
                {loading ? "Resolving..." : "Resolve Game"}
              </Button>
            </div>
          </>
        ) : null}

        {status && (
          <Text
            as="p"
            style={{
              fontFamily: "FuturaHandwritten",
              color: status.includes("Error") ? "#F44336" : "#667eea",
              fontSize: "1rem",
              fontWeight: "bold",
              whiteSpace: "pre-line",
            }}
          >
            {status}
          </Text>
        )}
      </div>
    </div>
  );
};
