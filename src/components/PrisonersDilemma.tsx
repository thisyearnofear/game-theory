import { useState } from "react";
import { Button, Input, Text, Box } from "@stellar/design-system";
import { useWallet } from "../hooks/useWallet";
import { Howl } from "howler";
// import pd from "../contracts/prisoners_dilemma"; // Assuming generated

// Import styles from inspiration
import "../styles/slides.css";
import "../styles/balloon.css";

export const PrisonersDilemma = () => {
  const [gameId, setGameId] = useState<number>();
  const [move, setMove] = useState<string>("");
  const [stake, setStake] = useState<string>("1");
  const [status, setStatus] = useState<string>("");
  const { address } = useWallet();

  // Sound effects
  const coinSound = new Howl({ src: ["/assets/sounds/coin_insert.mp3"] });
  const clickSound = new Howl({ src: ["/assets/sounds/click_plink_pop_boop.mp3"] });

  if (!address) {
    return (
      <Text as="p" size="md">
        Connect wallet to play Prisoner's Dilemma with real stakes!
      </Text>
    );
  }

  const createGame = async () => {
    if (!stake) return;
    coinSound.play();
    // const { result } = await pd.create_game({
    //   player1: address,
    //   stake: BigInt(stake) * BigInt(10_000_000), // 1 XLM
    // });
    // if (result.isOk()) {
    //   setGameId(Number(result.unwrap()));
    //   setStatus("Game created. Waiting for player 2.");
    // }
    setStatus("Game creation simulated. Game ID: 1");
  };

  const joinGame = async () => {
    if (!gameId || !move) return;
    clickSound.play();
    // const { result } = await pd.join_game({
    //   player2: address,
    //   game_id: BigInt(gameId),
    //   move_: move === "cooperate" ? "C" : "D",
    // });
    // if (result.isOk()) {
    //   setStatus("Joined game. Moves submitted. Resolve to see results.");
    // }
    setStatus("Joined simulated game.");
  };

  const resolveGame = async () => {
    if (!gameId) return;
    clickSound.play();
    // const { result } = await pd.resolve_game({
    //   game_id: BigInt(gameId),
    // });
    // if (result.isOk()) {
    //   setStatus("Game resolved. Check your balance for payouts!");
    // }
    setStatus("Game resolved. You won/lost based on moves.");
  };

  return (
    <Box gap="md">
      <Text as="h2" size="lg">
        Prisoner's Dilemma with Skin in the Game
      </Text>
      <Text as="p" size="md">
        Stake XLM and choose to Cooperate or Defect. Outcomes affect your wallet!
      </Text>
      <Text as="h3" size="md">
        The Payoff Matrix (Stakes in XLM)
      </Text>
      <div style={{ fontSize: "1.2em", margin: "20px 0" }}>
        <p>Imagine you're playing a game where you and another player each decide to Cooperate or Defect. Your choices determine payouts:</p>
      </div>
      <table style={{ borderCollapse: "collapse", width: "100%", fontSize: "1.1em", border: "2px solid #333" }}>
        <thead>
          <tr style={{ backgroundColor: "#f0f0f0" }}>
            <th style={{ border: "1px solid #333", padding: "10px" }}></th>
            <th style={{ border: "1px solid #333", padding: "10px", color: "#4089DD" }}>Player 2 Cooperates</th>
            <th style={{ border: "1px solid #333", padding: "10px", color: "#FF5E5E" }}>Player 2 Defects</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td style={{ border: "1px solid #333", padding: "10px", fontWeight: "bold", color: "#4089DD" }}>Player 1 Cooperates</td>
            <td style={{ border: "1px solid #333", padding: "10px", backgroundColor: "#e8f5e8" }}>Both get <strong>2 XLM</strong> (Reward)</td>
            <td style={{ border: "1px solid #333", padding: "10px", backgroundColor: "#ffeaea" }}>Player 1: <strong>0</strong>, Player 2: <strong>3</strong> (Sucker/Temptation)</td>
          </tr>
          <tr>
            <td style={{ border: "1px solid #333", padding: "10px", fontWeight: "bold", color: "#FF5E5E" }}>Player 1 Defects</td>
            <td style={{ border: "1px solid #333", padding: "10px", backgroundColor: "#ffeaea" }}>Player 1: <strong>3</strong>, Player 2: <strong>0</strong> (Temptation/Sucker)</td>
            <td style={{ border: "1px solid #333", padding: "10px", backgroundColor: "#f5f5f5" }}>Both get <strong>0 XLM</strong> (Punishment)</td>
          </tr>
        </tbody>
      </table>
      <div style={{ fontSize: "1.1em", margin: "20px 0", color: "#666" }}>
        <p>In this dApp, you put real XLM on the line. Cooperation builds trust, but defection might pay off... or not. Choose wisely!</p>
      </div>
      <Box gap="sm">
        <Input
          label="Stake (XLM)"
          id="stake"
          value={stake}
          onChange={(e) => setStake(e.target.value)}
        />
        <Button onClick={createGame} variant="primary">
          Create Game
        </Button>
      </Box>
      <Box gap="sm">
        <Input
          label="Game ID"
          id="gameId"
          value={gameId || ""}
          onChange={(e) => setGameId(Number(e.target.value))}
        />
        <select value={move} onChange={(e) => setMove(e.target.value)}>
          <option value="">Choose Move</option>
          <option value="cooperate">Cooperate</option>
          <option value="defect">Defect</option>
        </select>
        <Button onClick={joinGame} variant="primary">
          Join Game
        </Button>
      </Box>
      <Button onClick={resolveGame} variant="secondary">
        Resolve Game
      </Button>
      <Text as="p" size="md">
        {status}
      </Text>
    </Box>
  );
};
