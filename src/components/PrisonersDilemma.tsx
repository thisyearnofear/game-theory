import { useState } from "react";
import { Button, Input, Text } from "@stellar/design-system";
import { useWallet } from "../hooks/useWallet";
import { Howl } from "howler";
import pd from "../contracts/prisoners_dilemma";
import "../styles/slides.css";
import "../styles/balloon.css";

export const PrisonersDilemma = () => {
  const [gameId, setGameId] = useState<number>();
  const [move, setMove] = useState<string>("");
  const [stake, setStake] = useState<string>("1");
  const [status, setStatus] = useState<string>("");
  const [loading, setLoading] = useState<boolean>(false);
  const [gameMode, setGameMode] = useState<"single" | "multi">("single");
  const [aiStrategy, setAiStrategy] = useState<"random" | "cooperator" | "defector" | "tit-for-tat">("random");
  const { address } = useWallet();

  // Sound effects
  const coinSound = new Howl({ src: ["/assets/sounds/coin_insert.mp3"] });
  const clickSound = new Howl({ src: ["/assets/sounds/click_plink_pop_boop.mp3"] });

  if (!address) {
    return (
      <div style={{ textAlign: "center", padding: "20px" }}>
        <Text as="p" size="lg" style={{ 
          fontFamily: "FuturaHandwritten", 
          color: "#667eea",
          fontWeight: "bold"
        }}>
          Connect wallet to play Prisoner's Dilemma with real stakes!
        </Text>
      </div>
    );
  }

  const getAiMove = (strategy: string): "C" | "D" => {
    switch (strategy) {
      case "cooperator": return "C";
      case "defector": return "D";
      case "tit-for-tat": return Math.random() > 0.5 ? "C" : "D"; // Simplified for demo
      case "random":
      default: return Math.random() > 0.5 ? "C" : "D";
    }
  };

  const calculatePayoffs = (playerMove: "C" | "D", aiMove: "C" | "D", stakeAmount: number) => {
    if (playerMove === "C" && aiMove === "C") return [2 * stakeAmount, 2 * stakeAmount]; // Both cooperate
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
      
      const [playerPayout, aiPayout] = calculatePayoffs(playerMove, aiMove, stakeAmount);
      
      const aiMoveText = aiMove === "C" ? "Cooperated" : "Defected";
      const playerMoveText = playerMove === "C" ? "Cooperated" : "Defected";
      
      setStatus(`
        You: ${playerMoveText} | AI (${aiStrategy}): ${aiMoveText}
        Your payout: ${playerPayout} XLM | AI payout: ${aiPayout} XLM
        ${playerPayout > aiPayout ? "You won!" : playerPayout === aiPayout ? "It's a tie!" : "AI won!"}
      `);
    } catch (error) {
      setStatus(`Error: ${String(error)}`);
    } finally {
      setLoading(false);
    }
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
      
      setStatus("Joined game successfully! Moves submitted. Resolve to see results.");
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
      setStatus(`Game resolved! Payouts: Player 1: ${Number(payout1) / 10_000_000} XLM, Player 2: ${Number(payout2) / 10_000_000} XLM`);
    } catch (error) {
      setStatus(`Error: ${String(error)}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ textAlign: "center" }}>
      <Text as="h2" style={{ 
        fontFamily: "FuturaHandwritten", 
        marginBottom: "15px",
        color: "#333",
        fontSize: "1.8rem"
      }}>
        Prisoner's Dilemma with Skin in the Game
      </Text>
      
      <Text as="p" style={{ 
        fontFamily: "FuturaHandwritten", 
        marginBottom: "25px",
        color: "#667eea",
        fontWeight: "bold",
        fontSize: "1.1rem"
      }}>
        Stake XLM and choose to Cooperate or Defect. Outcomes affect your wallet!
      </Text>

      {/* Game Mode Selection */}
      <div style={{ marginBottom: "20px" }}>
        <Text as="label" style={{ 
          fontFamily: "FuturaHandwritten", 
          display: "block", 
          marginBottom: "8px",
          color: "#333",
          fontSize: "1.1rem"
        }}>
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

      {gameMode === "single" && (
        <div style={{ marginBottom: "20px" }}>
          <Text as="label" style={{ 
            fontFamily: "FuturaHandwritten", 
            display: "block", 
            marginBottom: "8px",
            color: "#333",
            fontSize: "1rem"
          }}>
            AI Strategy
          </Text>
          <select 
            value={aiStrategy} 
            onChange={(e) => setAiStrategy(e.target.value as "cooperator" | "defector" | "random" | "tit-for-tat")}
            style={{ 
              fontFamily: "FuturaHandwritten", 
              padding: "8px",
              borderRadius: "4px",
              border: "1px solid #ccc"
            }}
          >
            <option value="random">Random</option>
            <option value="cooperator">Always Cooperate</option>
            <option value="defector">Always Defect</option>
            <option value="tit-for-tat">Tit-for-Tat</option>
          </select>
        </div>
      )}

      {/* Payoff Matrix */}
      <Text as="h3" style={{ 
        fontFamily: "FuturaHandwritten", 
        marginBottom: "15px",
        color: "#333",
        fontSize: "1.4rem"
      }}>
        The Payoff Matrix (Stakes in XLM)
      </Text>
      
      <Text as="p" style={{ 
        fontFamily: "FuturaHandwritten", 
        marginBottom: "20px",
        color: "#666",
        fontSize: "1rem"
      }}>
        Your choices determine payouts:
      </Text>

      <div className="payoff-matrix" style={{ fontSize: "14px", margin: "20px auto" }}>
        <div className="payoff-cell payoff-header"></div>
        <div className="payoff-cell payoff-header">Opponent Cooperates</div>
        <div className="payoff-cell payoff-header">Opponent Defects</div>
        
        <div className="payoff-cell payoff-header">You Cooperate</div>
        <div className="payoff-cell payoff-cooperate">
          Both get 2 XLM<br/><small>(Reward)</small>
        </div>
        <div className="payoff-cell payoff-mixed">
          You: 0, Opponent: 3<br/><small>(Sucker/Temptation)</small>
        </div>
        
        <div className="payoff-cell payoff-header">You Defect</div>
        <div className="payoff-cell payoff-mixed">
          You: 3, Opponent: 0<br/><small>(Temptation/Sucker)</small>
        </div>
        <div className="payoff-cell payoff-defect">
          Both get 0 XLM<br/><small>(Punishment)</small>
        </div>
      </div>

      <Text as="p" style={{ 
        fontFamily: "FuturaHandwritten", 
        marginBottom: "30px",
        fontStyle: "italic",
        color: "#666",
        fontSize: "1rem"
      }}>
        Choose wisely! {gameMode === "single" ? "The AI is watching..." : "Your opponent is waiting..."}
      </Text>

      {/* Game Interface */}
      <div style={{ maxWidth: "400px", margin: "0 auto" }}>
        <div style={{ marginBottom: "20px" }}>
          <Text as="label" style={{ 
            fontFamily: "FuturaHandwritten", 
            display: "block", 
            marginBottom: "8px",
            color: "#333",
            fontSize: "1.1rem"
          }}>
            Stake (XLM)
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

        <div style={{ marginBottom: "20px" }}>
          <Text as="label" style={{ 
            fontFamily: "FuturaHandwritten", 
            display: "block", 
            marginBottom: "8px",
            color: "#333",
            fontSize: "1.1rem"
          }}>
            Your Move
          </Text>
          <div style={{ display: "flex", gap: "10px", justifyContent: "center" }}>
            <Button
              variant={move === "cooperate" ? "primary" : "secondary"}
              onClick={() => setMove("cooperate")}
              style={{ fontFamily: "FuturaHandwritten" }}
              disabled={loading}
            >
              Cooperate
            </Button>
            <Button
              variant={move === "defect" ? "primary" : "secondary"}
              onClick={() => setMove("defect")}
              style={{ fontFamily: "FuturaHandwritten" }}
              disabled={loading}
            >
              Defect
            </Button>
          </div>
        </div>

        {gameMode === "single" ? (
          <div style={{ display: "flex", justifyContent: "center", marginBottom: "20px" }}>
            <Button
              onClick={() => void playSinglePlayer()}
              disabled={!move || loading}
              style={{ 
                fontFamily: "FuturaHandwritten",
                width: "200px"
              }}
            >
              {loading ? "Playing..." : "Play vs AI"}
            </Button>
          </div>
        ) : (
          <>
            <div style={{ display: "flex", justifyContent: "center", marginBottom: "20px" }}>
              <Button
                onClick={() => void createGame()}
                disabled={!stake || loading}
                style={{ 
                  fontFamily: "FuturaHandwritten",
                  width: "200px"
                }}
              >
                {loading ? "Creating..." : "Create Game"}
              </Button>
            </div>

            {gameId && (
              <div style={{ marginBottom: "20px" }}>
                <Text as="p" style={{ 
                  fontFamily: "FuturaHandwritten", 
                  color: "#333",
                  fontSize: "1rem",
                  marginBottom: "10px"
                }}>
                  Game ID: {gameId}
                </Text>
              </div>
            )}

            <div style={{ display: "flex", gap: "10px", justifyContent: "center", marginBottom: "20px" }}>
              <Button
                onClick={() => void joinGame()}
                disabled={!gameId || !move || loading}
                style={{ fontFamily: "FuturaHandwritten" }}
              >
                {loading ? "Joining..." : "Join Game"}
              </Button>
              <Button
                onClick={() => void resolveGame()}
                disabled={!gameId || loading}
                style={{ fontFamily: "FuturaHandwritten" }}
              >
                {loading ? "Resolving..." : "Resolve Game"}
              </Button>
            </div>
          </>
        )}

        {status && (
          <Text as="p" style={{ 
            fontFamily: "FuturaHandwritten", 
            color: status.includes("Error") ? "#F44336" : "#667eea",
            fontSize: "1rem",
            fontWeight: "bold",
            whiteSpace: "pre-line"
          }}>
            {status}
          </Text>
        )}
      </div>
    </div>
  );
};
