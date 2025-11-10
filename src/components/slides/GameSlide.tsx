import React, { useState } from "react";
import { Button, Input, Text } from "@stellar/design-system";
import { useWallet } from "../../hooks/useWallet";
import { Character, CharacterType, CharacterEmotion } from "../Character";
import { AITutorPanel } from "../ai/AITutorPanel";
import AudioManager from "../AudioManager";
import { SlideProps } from "../SlideSystem";

// DRY: Shared game logic
const AI_STRATEGIES = {
  random: () => Math.random() > 0.5 ? "C" : "D",
  cooperator: () => "C",
  defector: () => "D",
  "tit-for-tat": () => Math.random() > 0.5 ? "C" : "D", // Simplified
} as const;

const calculatePayoffs = (playerMove: "C" | "D", aiMove: "C" | "D", stake: number) => {
  if (playerMove === "C" && aiMove === "C") return [2 * stake, 2 * stake];
  if (playerMove === "C" && aiMove === "D") return [0, 3 * stake];
  if (playerMove === "D" && aiMove === "C") return [3 * stake, 0];
  return [0, 0];
};

export const GameSlide: React.FC<SlideProps> = () => {
  const [move, setMove] = useState<string>("");
  const [stake, setStake] = useState<string>("1");
  const [aiStrategy, setAiStrategy] = useState<keyof typeof AI_STRATEGIES>("random");
  const [result, setResult] = useState<string>("");
  const [loading, setLoading] = useState(false);
  const [playerEmotion, setPlayerEmotion] = useState<CharacterEmotion>("neutral");
  const [aiEmotion, setAiEmotion] = useState<CharacterEmotion>("neutral");
  const [showCharacters, setShowCharacters] = useState(false);
  
  // ENHANCEMENT: AI Tutor state
  const [gameState, setGameState] = useState<any>({});
  const [lastPlayerAction, setLastPlayerAction] = useState<string>("");
  const [showTutor, setShowTutor] = useState(true);
  
  const { address } = useWallet();
  const audioManager = AudioManager.getInstance();

  const playGame = async () => {
    if (!move || !address) return;
    
    setLoading(true);
    setShowCharacters(true);
    
    const playerMove = move === "cooperate" ? "C" : "D";
    const aiMove = AI_STRATEGIES[aiStrategy]();
    const [playerPayout, aiPayout] = calculatePayoffs(playerMove, aiMove, parseFloat(stake));
    
    // ENHANCEMENT: Update game state for AI tutor
    const newGameState = {
      playerMove,
      aiMove,
      playerPayout,
      aiPayout,
      stake: parseFloat(stake),
      aiStrategy,
      outcome: playerPayout > aiPayout ? "win" : playerPayout < aiPayout ? "lose" : "tie"
    };
    setGameState(newGameState);
    setLastPlayerAction(move);
    
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
    `);
    
    setLoading(false);
  };

  const resetGame = () => {
    setResult("");
    setMove("");
    setPlayerEmotion("neutral");
    setAiEmotion("neutral");
    setShowCharacters(false);
    setLastPlayerAction("");
    audioManager.playSound("click");
  };

  if (!address) {
    return (
      <div style={{ textAlign: "center", padding: "40px" }}>
        <Character type="neutral" emotion="thinking" size="large" />
        <Text as="p" size="md" style={{ 
          fontFamily: "FuturaHandwritten", 
          color: "rgba(255,255,255,0.9)",
          fontSize: "1.2rem",
          marginTop: "20px"
        }}>
          Connect your wallet to experience trust with real stakes
        </Text>
        
        {/* ENHANCEMENT: Show AI tutor even without wallet */}
        <AITutorPanel
          context="oneoff"
          visible={showTutor}
          onAdviceRequest={() => console.log("Advice requested")}
        />
      </div>
    );
  }

  return (
    <div style={{ maxWidth: "500px", margin: "0 auto", textAlign: "center" }}>
      {/* ENHANCEMENT: Tutor toggle */}
      <div style={{ 
        position: "absolute", 
        top: "100px", 
        right: "20px",
        zIndex: 40
      }}>
        <Button onClick={() = size="md"> setShowTutor(!showTutor)}
          style={{
            width: "40px",
            height: "40px",
            borderRadius: "50%",
            fontSize: "16px",
            background: showTutor ? "#667eea" : "rgba(255,255,255,0.7)"
          }}
        >
          🧙‍♂️
        </Button>
      </div>

      {/* Character display */}
      {showCharacters && (
        <div style={{ 
          display: "flex", 
          justifyContent: "center", 
          alignItems: "center", 
          gap: "40px",
          marginBottom: "20px"
        }}>
          <div style={{ textAlign: "center" }}>
            <Character 
              type="cooperator" 
              emotion={playerEmotion} 
              size="large" 
              animate={result !== ""}
            />
            <Text as="p" size="md" style={{ 
              fontFamily: "FuturaHandwritten", 
              color: "rgba(255,255,255,0.9)",
              fontSize: "0.9rem",
              marginTop: "5px"
            }}>
              You
            </Text>
          </div>
          
          <Text as="span" size="md" style={{ 
            fontFamily: "FuturaHandwritten", 
            color: "rgba(255,255,255,0.9)",
            fontSize: "1.5rem"
          }}>
            VS
          </Text>
          
          <div style={{ textAlign: "center" }}>
            <Character 
              type="defector" 
              emotion={aiEmotion} 
              size="large" 
              animate={result !== ""}
            />
            <Text as="p" size="md" style={{ 
              fontFamily: "FuturaHandwritten", 
              color: "rgba(255,255,255,0.9)",
              fontSize: "0.9rem",
              marginTop: "5px"
            }}>
              AI ({aiStrategy})
            </Text>
          </div>
        </div>
      )}

      {/* Payoff Matrix */}
      <div className="payoff-matrix" style={{ fontSize: "12px", margin: "20px auto" }}>
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
        <Input value={stake}
          onChange={(e) = id="input" fieldSize="md"> setStake(e.target.value)}
          placeholder="Stake (XLM)"
          type="number"
          min="0.1"
          step="0.1"
          disabled={loading}
          style={{ marginBottom: "10px", textAlign: "center" }}
        />
        
        <select 
          value={aiStrategy} 
          onChange={(e) => setAiStrategy(e.target.value as keyof typeof AI_STRATEGIES)}
          disabled={loading}
          style={{ 
            fontFamily: "FuturaHandwritten", 
            padding: "8px",
            marginBottom: "10px",
            width: "100%"
          }}
        >
          <option value="random">Random AI</option>
          <option value="cooperator">Always Cooperate</option>
          <option value="defector">Always Defect</option>
          <option value="tit-for-tat">Tit-for-Tat</option>
        </select>
      </div>

      <div style={{ display: "flex", gap: "10px", justifyContent: "center", marginBottom: "20px" }}>
        <Button variant={move === "cooperate" ? "primary" : "secondary"}
          onClick={() = size="md"> {
            setMove("cooperate");
            audioManager.playSound("click");
          }}
          disabled={loading}
        >
          🤝 Cooperate
        </Button>
        <Button variant={move === "defect" ? "primary" : "secondary"}
          onClick={() = size="md"> {
            setMove("defect");
            audioManager.playSound("click");
          }}
          disabled={loading}
        >
          💀 Defect
        </Button>
      </div>

      <div style={{ display: "flex", gap: "10px", justifyContent: "center", marginBottom: "20px" }}>
        <Button onClick={playGame}
          disabled={!move || loading}
          style={{ width: "120px" }} size="md">
          {loading ? "Playing..." : "Play Round"}
        </Button>
        
        {result && (
          <Button onClick={resetGame}
            variant="secondary"
            style={{ width: "120px" }} size="md">
            Play Again
          </Button>
        )}
      </div>

      {result && (
        <Text as="p" size="md" style={{ 
          fontFamily: "FuturaHandwritten",
          whiteSpace: "pre-line",
          background: "rgba(255,255,255,0.9)",
          padding: "15px",
          borderRadius: "10px",
          fontSize: "0.9rem",
          color: "#333"
        }}>
          {result}
        </Text>
      )}

      {/* ENHANCEMENT: AI Tutor Panel */}
      <AITutorPanel
        context="oneoff"
        gameState={gameState}
        playerAction={lastPlayerAction}
        visible={showTutor}
        onAdviceRequest={() => console.log("Advice requested for:", gameState)}
      />
    </div>
  );
};
