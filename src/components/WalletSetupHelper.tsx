/**
 * WalletSetupHelper — guided wallet setup for new users.
 *
 * Shows a 3-step checklist:
 *   1. Install Freighter (if not detected)
 *   2. Connect wallet
 *   3. Fund with testnet XLM (friendbot)
 *
 * Each step has a clear CTA and status indicator. Steps that are
 * already complete are collapsed. The whole helper disappears once
 * the wallet is connected and funded.
 */
import React, { useState, useCallback } from "react";
import { useWallet } from "../hooks/useWallet";
import { useWalletBalance } from "../hooks/useWalletBalance";
import { useNotification } from "../hooks/useNotification";
import { getFriendbotUrl } from "../util/friendbot";

type StepStatus = "done" | "active" | "todo";

interface StepProps {
  status: StepStatus;
  icon: string;
  title: string;
  body: string;
  cta?: { label: string; onClick: () => void; disabled?: boolean };
  children?: React.ReactNode;
}

const Step: React.FC<StepProps> = ({
  status,
  icon,
  title,
  body,
  cta,
  children,
}) => {
  if (status === "done") {
    return (
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: "12px",
          padding: "10px 16px",
          borderRadius: "var(--radius-sm)",
          background: "rgba(74, 222, 128, 0.06)",
          border: "1px solid rgba(74, 222, 128, 0.15)",
          fontFamily: "var(--font-body)",
        }}
      >
        <span style={{ fontSize: "18px" }}>✅</span>
        <span
          style={{ fontSize: "var(--text-sm)", color: "var(--text-muted)" }}
        >
          {title}
        </span>
      </div>
    );
  }

  return (
    <div
      style={{
        padding: "16px",
        borderRadius: "var(--radius-md)",
        background:
          status === "active" ? "rgba(102, 126, 234, 0.08)" : "transparent",
        border:
          status === "active"
            ? "1px solid rgba(102, 126, 234, 0.25)"
            : "1px solid var(--border-glass)",
        fontFamily: "var(--font-body)",
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
        <span style={{ fontSize: "22px", flexShrink: 0 }}>{icon}</span>
        <div style={{ flex: 1 }}>
          <h4
            style={{
              margin: "0 0 4px",
              fontSize: "var(--text-base)",
              color: "var(--text-primary)",
            }}
          >
            {title}
          </h4>
          <p
            style={{
              margin: 0,
              fontSize: "var(--text-sm)",
              color: "var(--text-secondary)",
              lineHeight: 1.4,
            }}
          >
            {body}
          </p>
        </div>
        {cta && (
          <button
            type="button"
            onClick={cta.onClick}
            disabled={cta.disabled}
            style={{
              flexShrink: 0,
              background: "var(--accent-violet)",
              color: "white",
              border: "none",
              borderRadius: "var(--radius-sm)",
              padding: "8px 16px",
              fontFamily: "var(--font-body)",
              fontSize: "var(--text-sm)",
              fontWeight: 600,
              cursor: cta.disabled ? "not-allowed" : "pointer",
              opacity: cta.disabled ? 0.5 : 1,
              whiteSpace: "nowrap",
            }}
          >
            {cta.label}
          </button>
        )}
      </div>
      {children}
    </div>
  );
};

export const WalletSetupHelper: React.FC = () => {
  const { address } = useWallet();
  const {
    isFunded,
    isLoading: balanceLoading,
    updateBalance,
  } = useWalletBalance();
  const { addNotification } = useNotification();
  const [isFunding, setIsFunding] = useState(false);

  // Detect if Freighter extension is installed
  const [freighterDetected, setFreighterDetected] = useState<boolean | null>(
    null,
  );

  React.useEffect(() => {
    // Freighter injects window.freighterNetwork or window.freighter
    const checkFreighter = () => {
      const w = window as unknown as Record<string, unknown>;
      setFreighterDetected(
        typeof w.freighterNetwork !== "undefined" ||
          typeof w.freighter !== "undefined" ||
          typeof w.albedo !== "undefined",
      );
    };
    checkFreighter();
    // Re-check after a delay (extensions may load after page)
    const timer = setTimeout(checkFreighter, 2000);
    return () => clearTimeout(timer);
  }, []);

  const handleFund = useCallback(async () => {
    if (!address) return;
    setIsFunding(true);
    try {
      const response = await fetch(getFriendbotUrl(address));
      if (response.ok) {
        addNotification("Account funded with testnet XLM!", "success");
        await updateBalance();
      } else {
        addNotification("Funding failed — you may already be funded.", "error");
      }
    } catch {
      addNotification("Network error — try again.", "error");
    } finally {
      setIsFunding(false);
    }
  }, [address, addNotification, updateBalance]);

  // Don't render if everything is done
  if (address && isFunded) return null;

  const step1Status: StepStatus = address ? "done" : "active";
  const step2Status: StepStatus = !address
    ? "todo"
    : isFunded
      ? "done"
      : "active";

  return (
    <div
      className="glass-panel"
      style={{
        padding: "24px",
        marginBottom: "24px",
        maxWidth: "560px",
        margin: "0 auto 24px",
      }}
    >
      <h3
        style={{
          fontFamily: "var(--font-display)",
          fontSize: "var(--text-xl)",
          color: "var(--text-primary)",
          margin: "0 0 4px",
          textAlign: "center",
        }}
      >
        🔧 Wallet Setup
      </h3>
      <p
        style={{
          fontFamily: "var(--font-body)",
          fontSize: "var(--text-sm)",
          color: "var(--text-muted)",
          textAlign: "center",
          margin: "0 0 20px",
        }}
      >
        3 steps to play for real — takes about 1 minute
      </p>

      <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
        {/* Step 1: Install Freighter */}
        {step1Status !== "done" && (
          <Step
            status={step1Status}
            icon="🦊"
            title="Install Freighter Wallet"
            body={
              freighterDetected === false
                ? "Freighter is a free Stellar wallet browser extension. You'll need it to sign transactions."
                : "Freighter detected! Click connect to link your wallet."
            }
            cta={
              freighterDetected === false
                ? {
                    label: "Get Freighter",
                    onClick: () =>
                      void window.open(
                        "https://www.freighter.app/",
                        "_blank",
                        "noopener",
                      ),
                  }
                : undefined
            }
          />
        )}

        {/* Step 2: Connect wallet */}
        {step1Status === "done" && step2Status !== "done" && (
          <Step
            status={step2Status}
            icon="🔗"
            title="Connect Your Wallet"
            body="Link your Freighter wallet to Trustfall so you can sign transactions."
          />
        )}

        {/* Step 3: Fund with testnet XLM */}
        {address && !isFunded && (
          <Step
            status="active"
            icon="💧"
            title="Get Testnet XLM"
            body="Fund your wallet with free testnet XLM — no real money needed. One click via Stellar Friendbot."
            cta={{
              label: isFunding ? "Funding..." : "Get Free XLM",
              onClick: () => void handleFund(),
              disabled: isFunding || balanceLoading,
            }}
          />
        )}

        {/* Success state */}
        {address && isFunded && (
          <div
            style={{
              textAlign: "center",
              padding: "16px",
              borderRadius: "var(--radius-md)",
              background: "rgba(74, 222, 128, 0.08)",
              border: "1px solid rgba(74, 222, 128, 0.2)",
              fontFamily: "var(--font-body)",
            }}
          >
            <span style={{ fontSize: "24px" }}>🎉</span>
            <p
              style={{
                margin: "8px 0 0",
                fontSize: "var(--text-sm)",
                color: "var(--accent-cooperate)",
                fontWeight: 600,
              }}
            >
              Wallet ready! You're all set to play.
            </p>
          </div>
        )}
      </div>
    </div>
  );
};
