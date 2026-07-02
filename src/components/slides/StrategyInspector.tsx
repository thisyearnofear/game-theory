import React from "react";
import { Text } from "@stellar/design-system";
import { getStrategyInfo, type StrategyId } from "../../util/strategies";

interface StrategyInspectorProps {
  strategyId: StrategyId;
}

/**
 * Explains a strategy's decision logic in plain English.
 * Educational component — helps users understand WHY each strategy
 * behaves the way it does.
 */
const STRATEGY_LOGIC: Record<
  StrategyId,
  {
    howItWorks: string;
    firstMove: string;
    strength: string;
    weakness: string;
    example: string;
  }
> = {
  tft: {
    howItWorks:
      "Starts by cooperating. Then copies whatever you did last round. You cooperate? It cooperates. You defect? It defects back.",
    firstMove: "Cooperate (trust first)",
    strength:
      "Never gets exploited twice. Retaliates immediately but forgives immediately too.",
    weakness:
      "In a noisy world, it gets stuck in endless retaliation loops — you both keep copying each other's defection.",
    example:
      "Round 1: C. You play D. Round 2: D (copies you). You play C. Round 3: C (copies you). Back to peace.",
  },
  all_c: {
    howItWorks: "Always cooperates. No matter what. Unconditional trust.",
    firstMove: "Cooperate",
    strength:
      "Creates maximum mutual benefit when paired with another cooperator.",
    weakness: "Gets brutally exploited by defectors. The ultimate sucker.",
    example: "Every round: C. Even if you defect 100 times. It never learns.",
  },
  all_d: {
    howItWorks: "Always defects. No matter what. Zero trust.",
    firstMove: "Defect",
    strength:
      "Can never be exploited. Always gets at least the punishment payoff.",
    weakness:
      "Can never achieve mutual cooperation. Dooms everyone to mutual defection.",
    example:
      "Every round: D. Even against a cooperator. It takes everything and builds nothing.",
  },
  tf2t: {
    howItWorks:
      "Like Tit-for-Tat, but it takes TWO betrayals in a row before it retaliates. One defection is forgiven.",
    firstMove: "Cooperate",
    strength:
      "Much more forgiving than TFT. Breaks out of retaliation loops caused by noise.",
    weakness:
      "Can be exploited by strategies that defect occasionally — it forgives too much.",
    example:
      "Round 1: C. You play D. Round 2: C (forgives once). You play D again. Round 3: D (now it retaliates).",
  },
  grudge: {
    howItWorks:
      "Cooperates happily... until you betray it ONCE. Then it defects forever. No forgiveness. No mercy.",
    firstMove: "Cooperate",
    strength: "Punishes betrayal severely. One strike and you're out.",
    weakness:
      "One mistake (yours or noise) ruins the relationship permanently. Cannot recover.",
    example:
      "Round 1: C. You play D. Round 2+: D forever. Even if you cooperate 1000 times after.",
  },
  pavlov: {
    howItWorks:
      "Win-Stay, Lose-Shift. If the last round went well (you both cooperated), keep doing the same thing. If it went badly, switch.",
    firstMove: "Cooperate",
    strength:
      "Recovers from noise faster than TFT. If both accidentally defect, it switches back to cooperate.",
    weakness:
      "Can be exploited by a smart defector who times their defections.",
    example:
      "Round 1: C. Both cooperate — stay. Round 2: C. You defect — it switches. Round 3: D.",
  },
  prober: {
    howItWorks:
      "Tests you with a sequence: Cooperate, Defect, Cooperate, Cooperate. If you ever retaliate during the test, it plays Tit-for-Tat. If you NEVER retaliate, it switches to Always Defect — you're a sucker.",
    firstMove: "Cooperate (testing phase)",
    strength:
      "Identifies and exploits unconditional cooperators. Adapts to your strategy.",
    weakness:
      "The test phase wastes rounds and can trigger grudges from other strategies.",
    example:
      "Rounds 1-4: C, D, C, C. If you played D at any point → TFT. If you never played D → Always Defect.",
  },
  gtft: {
    howItWorks:
      "Like Tit-for-Tat, but 10% of the time when you defect, it forgives you and cooperates anyway.",
    firstMove: "Cooperate",
    strength:
      "Breaks retaliation loops. In noisy environments, it outperforms strict TFT.",
    weakness:
      "The 10% forgiveness rate means it occasionally gets exploited. More forgiving = more vulnerable.",
    example:
      "Round 1: C. You play D. Round 2: D (usually)... but 10% chance it plays C instead (forgives).",
  },
  random: {
    howItWorks:
      "Flips a coin every round. 50% cooperate, 50% defect. No memory, no strategy, no pattern.",
    firstMove: "Random",
    strength:
      "Unpredictable. Cannot be exploited by pattern-reading strategies.",
    weakness:
      "Also can't cooperate with itself. Achieves nothing. The baseline of chaos.",
    example:
      "Every round: 50/50 coin flip. No memory of past rounds. No logic.",
  },
};

export const StrategyInspector: React.FC<StrategyInspectorProps> = ({
  strategyId,
}) => {
  const info = getStrategyInfo(strategyId);
  const logic = STRATEGY_LOGIC[strategyId];

  return (
    <div
      className="tf-fade-in-up"
      style={{
        marginTop: "10px",
        background: "rgba(255,255,255,0.95)",
        borderRadius: "12px",
        padding: "16px",
        textAlign: "left",
        border: `2px solid ${info.color}40`,
      }}
    >
      {/* Header */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: "8px",
          marginBottom: "12px",
        }}
      >
        <span style={{ fontSize: "24px" }}>{info.emoji}</span>
        <Text
          as="h4"
          size="md"
          style={{
            fontFamily: "var(--font-body)",
            color: info.color,
            margin: 0,
          }}
        >
          {info.name}
        </Text>
      </div>

      {/* How it works */}
      <div style={{ marginBottom: "10px" }}>
        <Text
          as="p"
          size="xs"
          style={{
            fontFamily: "var(--font-body)",
            color: "var(--text-muted)",
            margin: "0 0 4px 0",
            fontSize: "0.75rem",
            fontWeight: "bold",
          }}
        >
          HOW IT WORKS
        </Text>
        <Text
          as="p"
          size="sm"
          style={{
            fontFamily: "var(--font-body)",
            color: "var(--text-primary)",
            margin: 0,
            fontSize: "0.85rem",
            lineHeight: 1.4,
          }}
        >
          {logic.howItWorks}
        </Text>
      </div>

      {/* First move */}
      <div style={{ marginBottom: "10px" }}>
        <Text
          as="p"
          size="xs"
          style={{
            fontFamily: "var(--font-body)",
            color: "var(--text-muted)",
            margin: "0 0 4px 0",
            fontSize: "0.75rem",
            fontWeight: "bold",
          }}
        >
          FIRST MOVE
        </Text>
        <Text
          as="p"
          size="sm"
          style={{
            fontFamily: "var(--font-body)",
            color: "var(--text-primary)",
            margin: 0,
            fontSize: "0.85rem",
          }}
        >
          {logic.firstMove}
        </Text>
      </div>

      {/* Strength + Weakness */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1fr 1fr",
          gap: "10px",
          marginBottom: "10px",
        }}
      >
        <div>
          <Text
            as="p"
            size="xs"
            style={{
              fontFamily: "var(--font-body)",
              color: "#4CAF50",
              margin: "0 0 4px 0",
              fontSize: "0.75rem",
              fontWeight: "bold",
            }}
          >
            ✅ STRENGTH
          </Text>
          <Text
            as="p"
            size="xs"
            style={{
              fontFamily: "var(--font-body)",
              color: "var(--text-primary)",
              margin: 0,
              fontSize: "0.8rem",
              lineHeight: 1.3,
            }}
          >
            {logic.strength}
          </Text>
        </div>
        <div>
          <Text
            as="p"
            size="xs"
            style={{
              fontFamily: "var(--font-body)",
              color: "#F44336",
              margin: "0 0 4px 0",
              fontSize: "0.75rem",
              fontWeight: "bold",
            }}
          >
            ❌ WEAKNESS
          </Text>
          <Text
            as="p"
            size="xs"
            style={{
              fontFamily: "var(--font-body)",
              color: "var(--text-primary)",
              margin: 0,
              fontSize: "0.8rem",
              lineHeight: 1.3,
            }}
          >
            {logic.weakness}
          </Text>
        </div>
      </div>

      {/* Example */}
      <div
        style={{
          background: "rgba(102, 126, 234, 0.06)",
          borderRadius: "8px",
          padding: "10px",
          border: "1px solid rgba(102, 126, 234, 0.15)",
        }}
      >
        <Text
          as="p"
          size="xs"
          style={{
            fontFamily: "var(--font-body)",
            color: "#667eea",
            margin: "0 0 4px 0",
            fontSize: "0.75rem",
            fontWeight: "bold",
          }}
        >
          📖 EXAMPLE
        </Text>
        <Text
          as="p"
          size="xs"
          style={{
            fontFamily: "var(--font-body)",
            color: "var(--text-secondary)",
            margin: 0,
            fontSize: "0.8rem",
            lineHeight: 1.4,
            fontStyle: "italic",
          }}
        >
          {logic.example}
        </Text>
      </div>
    </div>
  );
};
