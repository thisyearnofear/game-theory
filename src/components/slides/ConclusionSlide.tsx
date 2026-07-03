import React, { useState } from "react";
import { useWallet } from "../../hooks/useWallet";
import { SlideProps } from "../SlideSystem";

export const ConclusionSlide: React.FC<SlideProps> = () => {
  const [showApplications, setShowApplications] = useState(false);
  const { address } = useWallet();

  const realWorldApplications = [
    {
      title: "DeFi Protocols",
      icon: "🏦",
      description:
        "Reputation systems for lending, staking rewards for good behavior",
    },
    {
      title: "Social Networks",
      icon: "🌐",
      description: "Trust scores, content moderation, community governance",
    },
    {
      title: "Marketplaces",
      icon: "🛒",
      description: "Seller ratings, buyer protection, dispute resolution",
    },
    {
      title: "Governance",
      icon: "🏛️",
      description: "Voting systems, coalition building, policy cooperation",
    },
    {
      title: "Climate Action",
      icon: "🌍",
      description:
        "Carbon credits, international cooperation, tragedy of commons",
    },
  ];

  const rules = [
    {
      num: "1",
      title: "Be Nice",
      color: "var(--accent-cooperate)",
      text: "Don't defect first. Start with cooperation.",
    },
    {
      num: "2",
      title: "Be Provocable",
      color: "var(--accent-defect)",
      text: "Retaliate against defection. Don't be a pushover.",
    },
    {
      num: "3",
      title: "Be Forgiving",
      color: "var(--accent-cool)",
      text: "Return to cooperation after punishment.",
    },
    {
      num: "4",
      title: "Be Clear",
      color: "var(--accent-purple)",
      text: "Make your strategy easy to understand.",
    },
  ];

  return (
    <div style={{ maxWidth: "640px", margin: "0 auto", textAlign: "center" }}>
      <div
        data-animate
        style={{
          fontSize: "56px",
          marginBottom: "20px",
          filter: "drop-shadow(0 0 24px rgba(240, 160, 32, 0.4))",
        }}
      >
        🌟
      </div>

      <p
        data-animate
        style={{
          fontFamily: "var(--font-display)",
          fontSize: "var(--text-xl)",
          color: "var(--text-secondary)",
          marginBottom: "32px",
        }}
      >
        So, what have we learned about trust?
      </p>

      <div
        data-animate
        className="glass-panel"
        style={{
          padding: "32px",
          marginBottom: "28px",
        }}
      >
        <h3
          style={{
            fontFamily: "var(--font-display)",
            fontSize: "var(--text-xl)",
            marginBottom: "24px",
            color: "var(--text-primary)",
          }}
        >
          The Rules of Trust
        </h3>

        <div style={{ textAlign: "left", maxWidth: "420px", margin: "0 auto" }}>
          {rules.map((rule) => (
            <div key={rule.num} style={{ marginBottom: "16px" }}>
              <p
                style={{
                  fontFamily: "var(--font-body)",
                  color: rule.color,
                  fontWeight: 600,
                  fontSize: "var(--text-base)",
                  marginBottom: "2px",
                }}
              >
                {rule.num}. {rule.title}
              </p>
              <p
                style={{
                  fontFamily: "var(--font-body)",
                  color: "var(--text-secondary)",
                  fontSize: "var(--text-sm)",
                  margin: 0,
                }}
              >
                {rule.text}
              </p>
            </div>
          ))}
        </div>
      </div>

      <div data-animate>
        <button
          type="button"
          onClick={() => setShowApplications(!showApplications)}
          style={{
            background: "transparent",
            color: "var(--text-secondary)",
            border: "1px solid var(--border-glass)",
            borderRadius: "var(--radius-sm)",
            padding: "8px 16px",
            fontFamily: "var(--font-body)",
            fontSize: "var(--text-sm)",
            cursor: "pointer",
            marginBottom: "20px",
          }}
        >
          {showApplications ? "Hide" : "Show"} Real-World Applications
        </button>
      </div>

      {showApplications && (
        <div
          data-animate
          className="glass-panel"
          style={{
            padding: "24px",
            marginBottom: "28px",
          }}
        >
          <h4
            style={{
              fontFamily: "var(--font-display)",
              fontSize: "var(--text-lg)",
              marginBottom: "20px",
              color: "var(--text-primary)",
            }}
          >
            Trust in the Real World
          </h4>

          {realWorldApplications.map((app) => (
            <div
              key={app.title}
              className="glass-panel lift-on-hover"
              style={{
                textAlign: "left",
                marginBottom: "10px",
                padding: "14px 16px",
              }}
            >
              <p
                style={{
                  fontFamily: "var(--font-body)",
                  fontWeight: 600,
                  color: "var(--text-primary)",
                  marginBottom: "4px",
                  fontSize: "var(--text-sm)",
                }}
              >
                {app.icon} {app.title}
              </p>
              <p
                style={{
                  fontFamily: "var(--font-body)",
                  color: "var(--text-secondary)",
                  fontSize: "var(--text-xs)",
                  margin: 0,
                }}
              >
                {app.description}
              </p>
            </div>
          ))}
        </div>
      )}

      <p
        data-animate
        style={{
          fontFamily: "var(--font-display)",
          fontStyle: "italic",
          fontSize: "var(--text-lg)",
          color: "var(--text-muted)",
          marginBottom: "28px",
          lineHeight: 1.5,
        }}
      >
        "In the end, we're all in this together. The question isn't whether you{" "}
        <em>can</em> trust someone.
        <br />
        The question is whether you can trust someone{" "}
        <strong style={{ color: "var(--accent-warm)" }}>enough</strong>."
      </p>

      {address && (
        <div
          data-animate
          className="glass-panel"
          style={{
            padding: "20px",
            marginBottom: "20px",
          }}
        >
          <p
            style={{
              fontFamily: "var(--font-body)",
              color: "var(--text-primary)",
              marginBottom: "12px",
              fontSize: "var(--text-base)",
            }}
          >
            🎉 Congratulations! You've completed the journey.
          </p>
          <p
            style={{
              fontFamily: "var(--font-mono)",
              color: "var(--accent-violet)",
              fontSize: "var(--text-xs)",
              wordBreak: "break-all",
            }}
          >
            {address.slice(0, 8)}...{address.slice(-8)}
          </p>
        </div>
      )}

      <p
        data-animate
        style={{
          fontFamily: "var(--font-body)",
          color: "var(--text-muted)",
          fontSize: "var(--text-xs)",
          marginTop: "32px",
        }}
      >
        Based on "The Evolution of Trust" by Nicky Case
        <br />
        Enhanced with blockchain technology on Stellar
      </p>
    </div>
  );
};
