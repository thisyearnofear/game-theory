import React, { useState, useEffect } from "react";
import { Button, Text } from "@stellar/design-system";
import { useWallet } from "../../hooks/useWallet";
import { Howl } from "howler";
import { SlideProps } from "../SlideSystem";

// DRY: Shared AI strategies with memory
interface GameHistory {
  round: number;
  playerMove: "C" | "D";
  aiMove: "C" | "D";
  playerScore: number;
  aiScore: number;
}

const AI_STRATEGIES = {
  "always-cooperate": () => "C",
  "always-defect": () => "D",
  "tit-for-tat": (history: GameHistory[]) => {
    if (history.length === 0) return "C"; // Start nice
    return history[history.length - 1].playerMove; // Copy last player move
  },
  "grudger": (history: GameHistory[]) => {
    // Cooperate until betrayed, then always defect
    return history.some(h => h.playerMove === "D") ? "D" : "C";
  },
  "random": () => Math.random() > 0.5 ? "C" : "D"
} as const;

const calculateRoundPayoffs = (playerMove: "C" | "D", aiMove: "C" | "D") => {
  if (playerMove === "C" && aiMove === "C") return [3, 3]; // Reward
  if (playerMove === "C" && aiMove === "D") return [0, 5]; // Sucker/Temptation
  if (playerMove === "D" && aiMove === "C") return [5, 0]; // Temptation/Sucker
  return [1, 1]; // Punishment
};

export const IteratedSlide: React.FC<SlideProps> = () => {
  const [aiStrategy, setAiStrategy] = useState<keyof typeof AI_STRATEGIES>("tit-for-tat");
  const [history, setHistory] = useState<GameHistory[]>([]);
  const [currentRound, setCurrentRound] = useState(1);
  const [playerMove, setPlayerMove] = useState<"C" | "D" | null>(null);
  const [gameActive, setGameActive] = useState(false);
  const [totalRounds] = useState(10);
  const { address } = useWallet();

  // PERFORMANT: Sound effects
  const clickSound = new Howl({ src: ["/assets/sounds/click_plink_pop_boop.mp3"] });
  const winSound = new Howl({ src: ["/assets/sounds/coin_insert.mp3"] });

  const playRound = (move: "C" | "D") => {
    if (!gameActive) return;
    
    clickSound.play();
    setPlayerMove(move);
    
    // AI makes decision based on strategy and history
    const aiMove = AI_STRATEGIES[aiStrategy](history);
    const [playerPoints, aiPoints] = calculateRoundPayoffs(move, aiMove);
    
    const newRound: GameHistory = {
      round: currentRound,
      playerMove: move,
      aiMove,
      playerScore: playerPoints,
      aiScore: aiPoints
    };
    
    setHistory(prev => [...prev, newRound]);
    
    if (currentRound >= totalRounds) {
      setGameActive(false);
      winSound.play();
    } else {
      setCurrentRound(prev => prev + 1);
    }
    
    setPlayerMove(null);
  };

  const startGame = () => {
    setHistory([]);
    setCurrentRound(1);
    setGameActive(true);
    setPlayerMove(null);
  };

  const totalPlayerScore = history.reduce((sum, h) => sum + h.playerScore, 0);
  const totalAiScore = history.reduce((sum, h) => sum + h.aiScore, 0);

  if (!address) {
    return (
      <div style={{ textAlign: "center", padding: "40px" }}>
        <Text as="p" size="md" style={{ 
          fontFamily: "FuturaHandwritten", 
          color: "rgba(255,255,255,0.9)",
          fontSize: "1.2rem"
        }}>
          Connect your wallet to play repeated games
        </Text>
      </div>
    );
  }

  return (
    <div style={{ maxWidth: "600px", margin: "0 auto", textAlign: "center" }}>
      <Text as="p" size="md" style={{ 
        fontFamily: "FuturaHandwritten", 
        color: "rgba(255,255,255,0.9)",
        fontSize: "1.1rem",
        marginBottom: "30px",
        lineHeight: "1.5"
      }}>
        In the real world, you meet the same people again and again. 
        Reputation matters. How does this change the game?
      </Text>

      {/* CLEAN: Strategy selection */}
      <div style={{ marginBottom: "20px" }}>
        <Text as="label" size="md" style={{ 
          fontFamily: "FuturaHandwritten", 
          color: "rgba(255,255,255,0.9)",
          display: "block",
          marginBottom: "8px"
        }}>
          AI Strategy: {aiStrategy.replace("-", " ").toUpperCase()}
        </Text>
        <select 
          value={aiStrategy} 
          onChange={(e) => setAiStrategy(e.target.value as keyof typeof AI_STRATEGIES)}
          disabled={gameActive}
          style={{ 
            fontFamily: "FuturaHandwritten", 
            padding: "8px 16px",
            borderRadius: "8px",
            border: "none",
            background: "rgba(255,255,255,0.9)"
          }}
        >
          <option value="tit-for-tat">Tit-for-Tat (Nice but firm)</option>
          <option value="always-cooperate">Always Cooperate (Naive)</option>
          <option value="always-defect">Always Defect (Mean)</option>
          <option value="grudger">Grudger (Unforgiving)</option>
          <option value="random">Random (Unpredictable)</option>
        </select>
      </div>

      {/* MODULAR: Game status */}
      <div style={{ 
        background: "rgba(255,255,255,0.9)", 
        padding: "20px", 
        borderRadius: "15px",
        marginBottom: "20px"
      }}>
        <Text as="h3" size="md" style={{ 
          fontFamily: "FuturaHandwritten",
          margin: "0 0 15px 0",
          color: "#333"
        }}>
          Round {currentRound} of {totalRounds}
        </Text>
        
        <div style={{ display: "flex", justifyContent: "space-around", marginBottom: "15px" }}>
          <div>
            <Text as="p" size="md" style={{ fontFamily: "FuturaHandwritten", margin: 0, color: "#4CAF50" }}>
              You: {totalPlayerScore}
            </Text>
          </div>
          <div>
            <Text as="p" size="md" style={{ fontFamily: "FuturaHandwritten", margin: 0, color: "#F44336" }}>
              AI: {totalAiScore}
            </Text>
          </div>
        </div>

        {!gameActive && history.length === 0 && (
          <Button onClick={startGame} style={{ fontFamily: "FuturaHandwritten" }} size="md">
            Start {totalRounds}-Round Game
          </Button>
        )}

        {gameActive && (
          <div style={{ display: "flex", gap: "15px", justifyContent: "center" }}>
            <Button onClick={() = size="md"> playRound("C")}
              style={{ 
                fontFamily: "FuturaHandwritten",
                background: "#4CAF50",
                color: "white",
                border: "none"
              }}
            >
              🤝 Cooperate
            </Button>
            <Button onClick={() = size="md"> playRound("D")}
              style={{ 
                fontFamily: "FuturaHandwritten",
                background: "#F44336", 
                color: "white",
                border: "none"
              }}
            >
              💀 Defect
            </Button>
          </div>
        )}

        {!gameActive && history.length > 0 && (
          <div>
            <Text as="p" size="md" style={{ 
              fontFamily: "FuturaHandwritten", 
              color: totalPlayerScore > totalAiScore ? "#4CAF50" : totalPlayerScore < totalAiScore ? "#F44336" : "#666",
              fontWeight: "bold",
              fontSize: "1.1rem"
            }}>
              {totalPlayerScore > totalAiScore ? "You Won!" : 
               totalPlayerScore < totalAiScore ? "AI Won!" : "It's a Tie!"}
            </Text>
            <Button onClick={startGame} 
              style={{ fontFamily: "FuturaHandwritten", marginTop: "10px" }} size="md">
              Play Again
            </Button>
          </div>
        )}
      </div>

      {/* PERFORMANT: Recent history (last 5 rounds) */}
      {history.length > 0 && (
        <div style={{ 
          background: "rgba(255,255,255,0.8)", 
          padding: "15px", 
          borderRadius: "10px",
          fontSize: "0.9rem"
        }}>
          <Text as="h4" size="md" style={{ 
            fontFamily: "FuturaHandwritten", 
            margin: "0 0 10px 0",
            color: "#333"
          }}>
            Recent Rounds
          </Text>
          {history.slice(-5).map((round) => (
            <div key={round.round} style={{ 
              display: "flex", 
              justifyContent: "space-between", 
              padding: "5px 0",
              borderBottom: "1px solid #eee"
            }}>
              <span style={{ fontFamily: "FuturaHandwritten" }}>R{round.round}</span>
              <span>
                You: {round.playerMove === "C" ? "🤝" : "💀"} ({round.playerScore})
              </span>
              <span>
                AI: {round.aiMove === "C" ? "🤝" : "💀"} ({round.aiScore})
              </span>
            </div>
          ))}
        </div>
      )}

      {/* Educational insight */}
      {!gameActive && history.length > 0 && (
        <Text as="p" size="md" style={{ 
          fontFamily: "FuturaHandwritten",
          color: "rgba(255,255,255,0.8)",
          fontSize: "0.9rem",
          fontStyle: "italic",
          marginTop: "20px",
          lineHeight: "1.4"
        }}>
          Notice how {aiStrategy === "tit-for-tat" ? "Tit-for-Tat starts nice but punishes betrayal" :
                     aiStrategy === "grudger" ? "Grudger never forgives a single betrayal" :
                     aiStrategy === "always-cooperate" ? "Always Cooperate gets exploited" :
                     aiStrategy === "always-defect" ? "Always Defect creates mutual destruction" :
                     "Random strategy is unpredictable"}. 
          Reputation changes everything!
        </Text>
      )}
    </div>
  );
};
