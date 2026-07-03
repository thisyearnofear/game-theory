/**
 * Home — Landing hub
 *
 * Replaces the 8-slide linear deck as the landing page. Three clear entry
 * points (Learn / Tournament / Play) presented as glass-panel cards, plus
 * a brief hero explaining what Trustfall is.
 *
 * The guided narrative slide deck is now at /learn.
 * The tutorial sandbox is at /learn/play.
 * The tournament is at /tournament.
 * ZK multiplayer is at /play.
 */

import React, { useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { ElectricButton } from "../components/ui/ElectricButton";
import { useWallet } from "../hooks/useWallet";
import { FirstRunWizard, NextStepHint } from "../components/FirstRunWizard";
import {
  PersonalityQuiz,
  getStoredProfile,
} from "../components/PersonalityQuiz";
import { DemoRound } from "../components/DemoRound";
import { TrustFallCharacter } from "../components/TrustFallCharacter";
import { useFirstRun } from "../hooks/useFirstRun";
import { useMascot } from "../components/MascotContext";

interface HubCard {
  icon: string;
  title: string;
  description: string;
  cta: string;
  route: string;
  color: string;
  glow: string;
}

const CARDS: HubCard[] = [
  {
    icon: "🤝",
    title: "Learn",
    description:
      "Play the iterated Prisoner's Dilemma against 9 stateful AI strategies. Adjust noise, payoffs, and watch how trust evolves.",
    cta: "Start learning",
    route: "/learn/play",
    color: "var(--accent-violet)",
    glow: "rgba(102, 126, 234, 0.15)",
  },
  {
    icon: "🏆",
    title: "Tournament",
    description:
      "Watch all 9 strategies compete in an evolutionary tournament. The weak are eliminated, the strong reproduce. Trust evolves.",
    cta: "Watch it evolve",
    route: "/tournament",
    color: "var(--accent-warm)",
    glow: "rgba(240, 160, 32, 0.15)",
  },
  {
    icon: "🔒",
    title: "Play for Real",
    description:
      "ZK-powered multiplayer with real XLM stakes. Commit moves with zero-knowledge proofs — trust is proven, not promised.",
    cta: "Enter ZK lobby",
    route: "/play",
    color: "var(--accent-cooperate)",
    glow: "rgba(74, 222, 128, 0.12)",
  },
];

const Home: React.FC = () => {
  const navigate = useNavigate();
  const { address } = useWallet();
  const { unlock, milestones } = useFirstRun();
  const profile = getStoredProfile();
  const { react } = useMascot();
  const greetedRef = useRef(false);

  // Greet the user on arrival (once per session)
  useEffect(() => {
    if (greetedRef.current) return;
    greetedRef.current = true;
    // Delay slightly so it doesn't fire during page transition
    const timer = setTimeout(() => {
      if (milestones.first_zk_game) {
        react("welcome_back");
      }
    }, 800);
    return () => clearTimeout(timer);
  }, [react, milestones.first_zk_game]);

  return (
    <div
      style={{
        minHeight: "calc(100vh - 64px)",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        padding: "40px 24px",
      }}
    >
      <FirstRunWizard />
      <PersonalityQuiz />

      {/* Next step hint for returning users */}
      <NextStepHint />

      {/* Hero */}
      <div style={{ textAlign: "center", marginBottom: "48px" }}>
        <div
          data-animate
          style={{
            marginBottom: "20px",
            display: "flex",
            justifyContent: "center",
          }}
        >
          <TrustFallCharacter state="celebrating" color="you" size="xl" />
        </div>
        <h1
          style={{
            fontFamily: "var(--font-display)",
            fontSize: "var(--text-4xl)",
            marginBottom: "16px",
            lineHeight: 1.05,
          }}
        >
          The Evolution of Trust
        </h1>
        <p
          style={{
            fontFamily: "var(--font-display)",
            fontSize: "var(--text-xl)",
            maxWidth: "560px",
            margin: "0 auto 16px",
            lineHeight: 1.5,
            color: "var(--text-secondary)",
          }}
        >
          An interactive guide to why we trust — and why trust{" "}
          <em style={{ color: "var(--accent-warm)" }}>evolves</em>. Learn the
          theory, watch strategies compete, then put real stakes on the line
          with zero-knowledge proofs.
        </p>
        <p
          style={{
            fontFamily: "var(--font-body)",
            fontSize: "var(--text-sm)",
            color: "var(--text-muted)",
          }}
        >
          Based on Nicky Case's "The Evolution of Trust" — enhanced with ZK
          proofs on Stellar.
        </p>
      </div>

      {/* Three entry points */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))",
          gap: "20px",
          maxWidth: "880px",
          width: "100%",
        }}
      >
        {CARDS.map((card) => (
          <div
            key={card.title}
            className="glass-panel"
            style={{
              padding: "28px 24px",
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              textAlign: "center",
              cursor: "pointer",
              boxShadow: `0 8px 32px ${card.glow}`,
              transition: "all var(--duration-normal) var(--ease-out)",
            }}
            onClick={() => {
              if (card.route === "/learn" || card.route === "/learn/play") {
                unlock("visited_learn");
              }
              void navigate(card.route);
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.transform = "translateY(-4px)";
              e.currentTarget.style.boxShadow = `0 16px 48px ${card.glow}`;
              e.currentTarget.style.borderColor = card.color;
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.transform = "translateY(0)";
              e.currentTarget.style.boxShadow = `0 8px 32px ${card.glow}`;
              e.currentTarget.style.borderColor = "var(--border-glass)";
            }}
          >
            <div
              style={{
                fontSize: "2.5rem",
                marginBottom: "16px",
                filter: `drop-shadow(0 0 12px ${card.glow})`,
              }}
            >
              {card.icon}
            </div>
            <h3
              style={{
                fontFamily: "var(--font-display)",
                fontSize: "var(--text-2xl)",
                color: card.color,
                marginBottom: "12px",
              }}
            >
              {card.title}
            </h3>
            <p
              style={{
                fontFamily: "var(--font-body)",
                fontSize: "var(--text-sm)",
                color: "var(--text-secondary)",
                lineHeight: 1.6,
                marginBottom: "24px",
                flex: 1,
              }}
            >
              {card.description}
            </p>
            <ElectricButton
              onClick={() => {
                if (card.route === "/learn" || card.route === "/learn/play") {
                  unlock("visited_learn");
                }
                void navigate(card.route);
              }}
              color={
                card.title === "Learn"
                  ? "violet"
                  : card.title === "Tournament"
                    ? "warm"
                    : "cooperate"
              }
              size="md"
            >
              {card.cta} →
            </ElectricButton>
          </div>
        ))}
      </div>

      {/* Wallet hint for Play card */}
      {!address && (
        <p
          style={{
            fontFamily: "var(--font-body)",
            fontSize: "var(--text-xs)",
            color: "var(--text-muted)",
            marginTop: "32px",
            textAlign: "center",
          }}
        >
          💡 To play for real XLM stakes, connect a Stellar wallet from the top
          right.
        </p>
      )}

      {/* Trust profile badge (if quiz completed) */}
      {profile && (
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "8px",
            marginTop: "24px",
            padding: "8px 16px",
            borderRadius: "99px",
            background: "rgba(102, 126, 234, 0.08)",
            border: "1px solid rgba(102, 126, 234, 0.2)",
            fontFamily: "var(--font-body)",
            fontSize: "var(--text-sm)",
            color: "var(--text-secondary)",
          }}
        >
          <span>Your trust profile:</span>
          <span style={{ fontWeight: 700, color: "var(--accent-violet)" }}>
            {profile === "cooperator"
              ? "🤝 Cooperator"
              : profile === "strategist"
                ? "🧠 Strategist"
                : profile === "survivor"
                  ? "🛡️ Survivor"
                  : "🎲 Wildcard"}
          </span>
        </div>
      )}

      {/* Demo round — shows new users what the game looks like */}
      {!milestones.played_tutorial && (
        <div style={{ marginTop: "48px", maxWidth: "600px", width: "100%" }}>
          <p
            style={{
              fontFamily: "var(--font-display)",
              fontSize: "var(--text-lg)",
              color: "var(--text-secondary)",
              textAlign: "center",
              marginBottom: "16px",
            }}
          >
            See how it works ↓
          </p>
          <DemoRound size="md" />
        </div>
      )}

      {/* Guided journey link */}
      <button
        type="button"
        onClick={() => void navigate("/learn")}
        style={{
          marginTop: "40px",
          padding: "10px 24px",
          borderRadius: "var(--radius-sm)",
          border: "1px solid var(--border-glass)",
          background: "transparent",
          color: "var(--text-secondary)",
          fontFamily: "var(--font-body)",
          fontSize: "var(--text-sm)",
          cursor: "pointer",
          transition: "all var(--duration-fast) var(--ease-out)",
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.background = "var(--bg-glass-light)";
          e.currentTarget.style.color = "var(--text-primary)";
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.background = "transparent";
          e.currentTarget.style.color = "var(--text-secondary)";
        }}
      >
        📖 Prefer the guided narrative? Take the full journey →
      </button>
    </div>
  );
};

export default Home;
