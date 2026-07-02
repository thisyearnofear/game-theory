/**
 * RealThingSlide — Step 7: "The Real Thing"
 *
 * The bridge to ZK multiplayer. The user has learned the theory.
 * Now they can play with real XLM stakes, protected by zero-knowledge proofs.
 * This slide explains WHY ZK matters (commit-reveal fairness) and
 * provides a clear CTA to enter the ZK multiplayer flow.
 */

import React from "react";
import { useNavigate } from "react-router-dom";
import { SlideProps } from "../SlideSystem";
import { useWallet } from "../../hooks/useWallet";
import { ElectricButton } from "../ui/ElectricButton";

export const RealThingSlide: React.FC<SlideProps> = () => {
  const navigate = useNavigate();
  const { address } = useWallet();

  return (
    <div style={{ maxWidth: "640px", margin: "0 auto", textAlign: "center" }}>
      <h2
        data-animate
        style={{
          fontFamily: "var(--font-display)",
          fontSize: "var(--text-3xl)",
          marginBottom: "16px",
        }}
      >
        The Real Thing
      </h2>

      <p
        data-animate
        style={{
          fontFamily: "var(--font-body)",
          fontSize: "var(--text-lg)",
          color: "var(--text-secondary)",
          marginBottom: "32px",
          lineHeight: 1.6,
        }}
      >
        You understand how trust evolves. Now play for real — with XLM at stake,
        against a human opponent, where neither of you can cheat.
      </p>

      {/* How it works */}
      <div
        data-animate
        className="glass-panel"
        style={{ padding: "28px", marginBottom: "24px", textAlign: "left" }}
      >
        <p
          style={{
            fontFamily: "var(--font-body)",
            fontSize: "var(--text-xs)",
            color: "var(--text-muted)",
            marginBottom: "20px",
            textTransform: "uppercase",
            letterSpacing: "0.1em",
          }}
        >
          How zero-knowledge keeps it fair
        </p>

        <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
          <div
            style={{ display: "flex", gap: "16px", alignItems: "flex-start" }}
          >
            <div
              style={{
                minWidth: "32px",
                height: "32px",
                borderRadius: "50%",
                background: "rgba(102,126,234,0.15)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontFamily: "var(--font-display)",
                fontSize: "var(--text-lg)",
                color: "var(--accent-violet)",
              }}
            >
              1
            </div>
            <div>
              <p
                style={{
                  fontFamily: "var(--font-body)",
                  fontSize: "var(--text-sm)",
                  fontWeight: 600,
                  color: "var(--text-primary)",
                  margin: "0 0 4px",
                }}
              >
                Commit
              </p>
              <p
                style={{
                  fontFamily: "var(--font-body)",
                  fontSize: "var(--text-sm)",
                  color: "var(--text-secondary)",
                  margin: 0,
                }}
              >
                You lock in your move with a zero-knowledge proof. Your opponent
                can't see what you chose — but they can verify you can't change
                it.
              </p>
            </div>
          </div>

          <div
            style={{ display: "flex", gap: "16px", alignItems: "flex-start" }}
          >
            <div
              style={{
                minWidth: "32px",
                height: "32px",
                borderRadius: "50%",
                background: "rgba(240,160,32,0.15)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontFamily: "var(--font-display)",
                fontSize: "var(--text-lg)",
                color: "var(--accent-warm)",
              }}
            >
              2
            </div>
            <div>
              <p
                style={{
                  fontFamily: "var(--font-body)",
                  fontSize: "var(--text-sm)",
                  fontWeight: 600,
                  color: "var(--text-primary)",
                  margin: "0 0 4px",
                }}
              >
                Reveal
              </p>
              <p
                style={{
                  fontFamily: "var(--font-body)",
                  fontSize: "var(--text-sm)",
                  color: "var(--text-secondary)",
                  margin: 0,
                }}
              >
                Once both players have committed, you reveal. The proof
                guarantees the revealed move matches the commitment.
              </p>
            </div>
          </div>

          <div
            style={{ display: "flex", gap: "16px", alignItems: "flex-start" }}
          >
            <div
              style={{
                minWidth: "32px",
                height: "32px",
                borderRadius: "50%",
                background: "rgba(74,222,128,0.15)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontFamily: "var(--font-display)",
                fontSize: "var(--text-lg)",
                color: "var(--accent-cooperate)",
              }}
            >
              3
            </div>
            <div>
              <p
                style={{
                  fontFamily: "var(--font-body)",
                  fontSize: "var(--text-sm)",
                  fontWeight: 600,
                  color: "var(--text-primary)",
                  margin: "0 0 4px",
                }}
              >
                Resolve
              </p>
              <p
                style={{
                  fontFamily: "var(--font-body)",
                  fontSize: "var(--text-sm)",
                  color: "var(--text-secondary)",
                  margin: 0,
                }}
              >
                The smart contract on Stellar pays out automatically. No
                intermediary, no escrow — just math and the blockchain.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Wallet status */}
      <div data-animate style={{ marginBottom: "24px" }}>
        {address ? (
          <div
            className="glass-panel"
            style={{
              padding: "16px",
              borderColor: "rgba(74,222,128,0.3)",
            }}
          >
            <p
              style={{
                fontFamily: "var(--font-body)",
                fontSize: "var(--text-sm)",
                color: "var(--accent-cooperate)",
                margin: 0,
              }}
            >
              ✓ Wallet connected — {address.slice(0, 8)}...{address.slice(-6)}
            </p>
          </div>
        ) : (
          <p
            style={{
              fontFamily: "var(--font-body)",
              fontSize: "var(--text-sm)",
              color: "var(--text-muted)",
            }}
          >
            You'll need to connect a Stellar wallet to play for real stakes.
          </p>
        )}
      </div>

      {/* CTA */}
      <div data-animate>
        <ElectricButton
          onClick={() => void navigate("/play")}
          color="violet"
          size="lg"
        >
          Play for real →
        </ElectricButton>
      </div>

      <p
        data-animate
        style={{
          fontFamily: "var(--font-body)",
          fontSize: "var(--text-xs)",
          color: "var(--text-muted)",
          marginTop: "24px",
        }}
      >
        Testnet only — no real money at risk. Powered by Noir ZK proofs on
        Stellar Soroban.
      </p>
    </div>
  );
};
