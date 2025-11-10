import React, { useState, useEffect } from "react";
import { Button, Text, Input } from "@stellar/design-system";
import { useWallet } from "../../hooks/useWallet";
import { Howl } from "howler";
import { SlideProps } from "../SlideSystem";
import pd from "../../contracts/prisoners_dilemma";

// DRY: Tournament strategies from Nicky Case's research
const TOURNAMENT_STRATEGIES = {
  "copycat": "Tit-for-Tat: Start nice, then copy opponent",
  "always-cooperate": "Always Cooperate: Be nice to everyone", 
  "always-defect": "Always Defect: Trust no one",
  "grudger": "Grudger: Forgive never, forget never",
  "detective": "Detective: Test, then exploit or cooperate",
  "copykitten": "Copykitten: Forgive once, then retaliate",
  "simpleton": "Simpleton: Cooperate if both did same last round",
  "random": "Random: Flip a coin every round"
} as const;

interface TournamentEntry {
  strategy: keyof typeof TOURNAMENT_STRATEGIES;
  score: number;
  games: number;
}

export const TournamentSlide: React.FC<SlideProps> = () => {
  const [selectedStrategy, setSelectedStrategy] = useState<keyof typeof TOURNAMENT_STRATEGIES>("copycat");
  const [stake, setStake] = useState("1");
  const [tournamentResults, setTournamentResults] = useState<TournamentEntry[]>([]);
  const [isRunning, setIsRunning] = useState(false);
  const [currentMatch, setCurrentMatch] = useState("");
  const { address } = useWallet();

  // PERFORMANT: Sound effects
  const tournamentSound = new Howl({ src: ["/assets/sounds/coin_insert.mp3"] });

  // MODULAR: Simulate tournament (in real version, this would be on-chain)
  const runTournament = async () => {
    if (!address) return;
    
    setIsRunning(true);
    tournamentSound.play();
    
    const strategies = Object.keys(TOURNAMENT_STRATEGIES) as (keyof typeof TOURNAMENT_STRATEGIES)[];
    const results: TournamentEntry[] = strategies.map(strategy => ({
      strategy,
      score: 0,
      games: 0
    }));

    // Simulate round-robin tournament
    for (let i = 0; i < strategies.length; i++) {
      for (let j = i + 1; j < strategies.length; j++) {
        const strategy1 = strategies[i];
        const strategy2 = strategies[j];
        
        setCurrentMatch(`${strategy1} vs ${strategy2}`);
        await new Promise(resolve => setTimeout(resolve, 500)); // Visual delay
        
        // Simulate game results based on strategy matchups
        const [score1, score2] = simulateStrategyMatchup(strategy1, strategy2);
        
        results[i].score += score1;
        results[i].games += 1;
        results[j].score += score2;
        results[j].games += 1;
      }
    }

    // Sort by average score
    results.sort((a, b) => (b.score / b.games) - (a.score / a.games));
    setTournamentResults(results);
    setIsRunning(false);
    setCurrentMatch("");
  };

  // DRY: Strategy matchup simulation based on game theory
  const simulateStrategyMatchup = (
    strategy1: keyof typeof TOURNAMENT_STRATEGIES, 
    strategy2: keyof typeof TOURNAMENT_STRATEGIES
  ): [number, number] => {
    // Simplified simulation based on known strategy interactions
    const matchups: Record<string, [number, number]> = {
      "copycat-copycat": [30, 30], // Mutual cooperation
      "copycat-always-cooperate": [30, 30],
      "copycat-always-defect": [5, 25], // Exploited once, then mutual defection
      "copycat-grudger": [30, 30],
      "always-cooperate-always-defect": [0, 50], // Fully exploited
      "always-defect-always-defect": [10, 10], // Mutual defection
      "grudger-always-defect": [5, 25], // Betrayed once, then defection
      // Add more realistic matchups...
    };

    const key1 = `${strategy1}-${strategy2}`;
    const key2 = `${strategy2}-${strategy1}`;
    
    if (matchups[key1]) return matchups[key1];
    if (matchups[key2]) return [matchups[key2][1], matchups[key2][0]];
    
    // Default: random with slight cooperation bias
    return [Math.floor(Math.random() * 40) + 10, Math.floor(Math.random() * 40) + 10];
  };

  const createRealTournament = async () => {
    if (!address || !stake) return;
    
    try {
      // In real implementation, create on-chain tournament
      const stakeAmount = BigInt(parseFloat(stake) * 10_000_000);
      
      // This would create a tournament contract
      console.log("Creating tournament with stake:", stakeAmount);
      
      // For now, just run simulation
      await runTournament();
    } catch (error) {
      console.error("Tournament creation failed:", error);
    }
  };

  if (!address) {
    return (
      <div style={{ textAlign: "center", padding: "40px" }}>
        <Text as="p" size="md" style={{ 
          fontFamily: "FuturaHandwritten", 
          color: "rgba(255,255,255,0.9)",
          fontSize: "1.2rem"
        }}>
          Connect your wallet to enter tournaments
        </Text>
      </div>
    );
  }

  return (
    <div style={{ maxWidth: "700px", margin: "0 auto", textAlign: "center" }}>
      <Text as="p" size="md" style={{ 
        fontFamily: "FuturaHandwritten", 
        color: "rgba(255,255,255,0.9)",
        fontSize: "1.1rem",
        marginBottom: "30px",
        lineHeight: "1.5"
      }}>
        What if we pit different strategies against each other? 
        In 1980, Robert Axelrod ran the first computer tournament...
      </Text>

      {/* CLEAN: Strategy selection */}
      <div style={{ 
        background: "rgba(255,255,255,0.9)", 
        padding: "25px", 
        borderRadius: "15px",
        marginBottom: "20px"
      }}>
        <Text as="h3" size="md" style={{ 
          fontFamily: "FuturaHandwritten",
          margin: "0 0 20px 0",
          color: "#333"
        }}>
          Choose Your Strategy
        </Text>
        
        <select 
          value={selectedStrategy} 
          onChange={(e) => setSelectedStrategy(e.target.value as keyof typeof TOURNAMENT_STRATEGIES)}
          disabled={isRunning}
          style={{ 
            fontFamily: "FuturaHandwritten", 
            padding: "10px 15px",
            borderRadius: "8px",
            border: "1px solid #ddd",
            width: "100%",
            marginBottom: "15px"
          }}
        >
          {Object.entries(TOURNAMENT_STRATEGIES).map(([key, description]) => (
            <option key={key} value={key}>
              {description}
            </option>
          ))}
        </select>

        <Input value={stake}
          onChange={(e) = id="input" fieldSize="md"> setStake(e.target.value)}
          placeholder="Tournament entry (XLM)"
          type="number"
          min="0.1"
          step="0.1"
          disabled={isRunning}
          style={{ marginBottom: "15px", textAlign: "center" }}
        />

        <Button onClick={createRealTournament}
          disabled={isRunning || !stake}
          style={{ 
            fontFamily: "FuturaHandwritten",
            width: "200px",
            background: isRunning ? "#ccc" : "#667eea"
          }} size="md">
          {isRunning ? "Running..." : "Enter Tournament"}
        </Button>
      </div>

      {/* PERFORMANT: Tournament progress */}
      {isRunning && (
        <div style={{ 
          background: "rgba(255,255,255,0.8)", 
          padding: "20px", 
          borderRadius: "10px",
          marginBottom: "20px"
        }}>
          <Text as="p" size="md" style={{ 
            fontFamily: "FuturaHandwritten",
            color: "#333",
            fontSize: "1.1rem"
          }}>
            🏆 Tournament in Progress...
          </Text>
          <Text as="p" size="md" style={{ 
            fontFamily: "FuturaHandwritten",
            color: "#666",
            fontSize: "0.9rem"
          }}>
            {currentMatch}
          </Text>
        </div>
      )}

      {/* MODULAR: Results display */}
      {tournamentResults.length > 0 && (
        <div style={{ 
          background: "rgba(255,255,255,0.9)", 
          padding: "25px", 
          borderRadius: "15px"
        }}>
          <Text as="h3" size="md" style={{ 
            fontFamily: "FuturaHandwritten",
            margin: "0 0 20px 0",
            color: "#333"
          }}>
            🏆 Tournament Results
          </Text>
          
          {tournamentResults.map((result, index) => (
            <div key={result.strategy} style={{ 
              display: "flex", 
              justifyContent: "space-between",
              alignItems: "center",
              padding: "10px 15px",
              margin: "5px 0",
              background: index === 0 ? "#FFD700" : index < 3 ? "#f0f0f0" : "white",
              borderRadius: "8px",
              border: result.strategy === selectedStrategy ? "2px solid #667eea" : "1px solid #ddd"
            }}>
              <span style={{ fontFamily: "FuturaHandwritten", fontWeight: "bold" }}>
                #{index + 1} {result.strategy.replace("-", " ").toUpperCase()}
                {result.strategy === selectedStrategy && " (YOU)"}
              </span>
              <span style={{ fontFamily: "FuturaHandwritten" }}>
                {Math.round(result.score / result.games)} avg
              </span>
            </div>
          ))}

          <Text as="p" size="md" style={{ 
            fontFamily: "FuturaHandwritten",
            color: "#666",
            fontSize: "0.9rem",
            fontStyle: "italic",
            marginTop: "20px"
          }}>
            {tournamentResults[0]?.strategy === "copycat" 
              ? "Tit-for-Tat wins! Being nice but firm pays off."
              : `${tournamentResults[0]?.strategy.replace("-", " ")} dominated this tournament!`}
          </Text>
        </div>
      )}

      {/* Educational insight */}
      <Text as="p" size="md" style={{ 
        fontFamily: "FuturaHandwritten",
        color: "rgba(255,255,255,0.8)",
        fontSize: "0.9rem",
        fontStyle: "italic",
        marginTop: "20px",
        lineHeight: "1.4"
      }}>
        In Axelrod's original tournament, Tit-for-Tat won by being: 
        <strong> Nice</strong> (never defect first), 
        <strong> Retaliatory</strong> (punish defection), 
        <strong> Forgiving</strong> (return to cooperation), and 
        <strong> Clear</strong> (easy to understand).
      </Text>
    </div>
  );
};
