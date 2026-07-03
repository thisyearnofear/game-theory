import React, { useState, useEffect, useCallback } from "react";
import { useWallet } from "../../hooks/useWallet";
import { useZKDilemma } from "../../hooks/useZKDilemma";
import {
  generateAccreditationProof,
  getAllCredentials,
} from "../../services/accreditationProofService";
import { getMerkleRootBytes, MERKLE_ROOT_HEX } from "../../util/merkleTree";
import { ShimmerButton } from "../ui/ShimmerButton";

/**
 * Accreditation Panel -- demonstrates the private allowlist membership ZK proof.
 *
 * Two modes:
 * 1. Admin: Initialize accreditation on the contract (set VK + Merkle root)
 * 2. Player: Generate a ZK proof of allowlist membership and verify on-chain
 *
 * The ZK proof proves "I hold a credential in the Merkle tree" without
 * revealing which credential is mine. The contract verifies the proof
 * on-chain and records a nullifier to prevent replay.
 */

const CardDiv: React.FC<{
  children: React.ReactNode;
  style?: React.CSSProperties;
}> = ({ children, style }) => (
  <div
    className="glass-panel"
    style={{
      borderRadius: "12px",
      padding: "24px",
      ...style,
    }}
  >
    {children}
  </div>
);

export const AccreditationPanel: React.FC = () => {
  const { address } = useWallet();
  const {
    checkAccreditationInitialized,
    getAccreditedRoot,
    initializeAccreditation,
    verifyAccreditation,
    isLoading,
    error,
  } = useZKDilemma();

  const [accreditationReady, setAccreditationReady] = useState(false);
  const [onChainRoot, setOnChainRoot] = useState<string | null>(null);
  const [selectedCredential, setSelectedCredential] = useState(0);
  const [proofStatus, setProofStatus] = useState<string>("");
  const [verified, setVerified] = useState(false);
  const [generating, setGenerating] = useState(false);

  const credentials = getAllCredentials();

  const checkStatus = useCallback(async () => {
    const ready = await checkAccreditationInitialized();
    setAccreditationReady(ready);
    if (ready) {
      const root = await getAccreditedRoot();
      setOnChainRoot(root);
    }
  }, [checkAccreditationInitialized, getAccreditedRoot]);

  useEffect(() => {
    void checkStatus();
  }, [checkStatus]);

  const handleInitialize = async () => {
    if (!address) return;
    setProofStatus("Initializing accreditation on-chain...");
    try {
      // Load the accreditation VK from the public directory
      const vkResponse = await fetch("/circuits/allowlist_membership_vk.bin");
      if (!vkResponse.ok) throw new Error("Failed to load accreditation VK");
      const vkBytes = new Uint8Array(await vkResponse.arrayBuffer());

      const rootBytes = getMerkleRootBytes();
      await initializeAccreditation(address, vkBytes, rootBytes);
      setProofStatus(
        "Accreditation initialized! Players can now prove membership.",
      );
      await checkStatus();
    } catch (err) {
      setProofStatus(
        `Error: ${err instanceof Error ? err.message : String(err)}`,
      );
    }
  };

  const handleVerify = async () => {
    if (!address) return;
    const credential = credentials[selectedCredential];
    if (!credential) return;

    setGenerating(true);
    setProofStatus(
      "Generating ZK proof in browser (lazy-loading Noir + bb.js)...",
    );
    setVerified(false);

    try {
      const { proof, merkleRoot, nullifier } = await generateAccreditationProof(
        {
          credentialId: credential.credentialId,
          merklePath: credential.merklePath,
          pathIndices: credential.pathIndices,
          gameId: 0,
        },
      );

      setProofStatus(
        "Proof generated! Verifying on-chain via UltraHonk verifier...",
      );

      await verifyAccreditation(proof, merkleRoot, nullifier, 0);

      setProofStatus(
        "Accreditation verified on-chain! You are a verified accredited participant.",
      );
      setVerified(true);
    } catch (err) {
      setProofStatus(
        `Error: ${err instanceof Error ? err.message : String(err)}`,
      );
    } finally {
      setGenerating(false);
    }
  };

  return (
    <CardDiv style={{ marginBottom: "20px" }}>
      <h3 style={{ margin: "0 0 8px 0", fontSize: "1.3rem", color: "#e0e7ff" }}>
        Private Accreditation (ZK Allowlist Proof)
      </h3>
      <p
        style={{
          margin: "0 0 16px 0",
          fontSize: "0.9rem",
          color: "#94a3b8",
          lineHeight: 1.5,
        }}
      >
        Prove you're on the accredited allowlist{" "}
        <strong>without revealing which credential is yours</strong>. Uses a
        Poseidon Merkle tree (Stellar Protocol 25 native host function) +
        UltraHonk ZK proof verified on-chain. The nullifier prevents replay
        without linking to your identity.
      </p>

      {/* Status display */}
      <div
        style={{
          marginBottom: "16px",
          display: "flex",
          gap: "12px",
          flexWrap: "wrap",
        }}
      >
        <div
          style={{
            padding: "6px 12px",
            borderRadius: "8px",
            fontSize: "0.85rem",
            background: accreditationReady
              ? "rgba(34,197,94,0.15)"
              : "rgba(239,68,68,0.15)",
            border: `1px solid ${accreditationReady ? "rgba(34,197,94,0.3)" : "rgba(239,68,68,0.3)"}`,
            color: accreditationReady ? "#4ade80" : "#f87171",
          }}
        >
          {accreditationReady
            ? "Accreditation Active"
            : "Accreditation Not Initialized"}
        </div>
        {onChainRoot && (
          <div
            style={{
              padding: "6px 12px",
              borderRadius: "8px",
              fontSize: "0.8rem",
              fontFamily: "monospace",
              background: "rgba(99,102,241,0.15)",
              border: "1px solid rgba(99,102,241,0.3)",
              color: "#a5b4fc",
            }}
          >
            Root: {onChainRoot.slice(0, 12)}...{onChainRoot.slice(-8)}
          </div>
        )}
        {verified && (
          <div
            style={{
              padding: "6px 12px",
              borderRadius: "8px",
              fontSize: "0.85rem",
              background: "rgba(34,197,94,0.2)",
              border: "1px solid rgba(34,197,94,0.4)",
              color: "#4ade80",
            }}
          >
            You are accredited!
          </div>
        )}
      </div>

      {/* Admin section */}
      {!accreditationReady && (
        <div style={{ marginBottom: "16px" }}>
          <h4
            style={{ margin: "0 0 8px 0", fontSize: "1rem", color: "#c7d2fe" }}
          >
            Admin: Initialize Accreditation
          </h4>
          <p
            style={{
              margin: "0 0 12px 0",
              fontSize: "0.85rem",
              color: "#94a3b8",
            }}
          >
            Deploy the accreditation VK and Merkle root on-chain. This is a
            one-time setup that sets you as the admin who can later update the
            root.
          </p>
          <ShimmerButton
            onClick={() => void handleInitialize()}
            disabled={!address || isLoading}
          >
            {isLoading ? "Initializing..." : "Initialize Accreditation"}
          </ShimmerButton>
        </div>
      )}

      {/* Player section */}
      {accreditationReady && (
        <div>
          <h4
            style={{ margin: "0 0 8px 0", fontSize: "1rem", color: "#c7d2fe" }}
          >
            Player: Prove Accreditation
          </h4>
          <p
            style={{
              margin: "0 0 12px 0",
              fontSize: "0.85rem",
              color: "#94a3b8",
            }}
          >
            Select your credential and generate a ZK proof. The proof proves
            your credential is in the Merkle tree without revealing which one.
            The contract verifies it on-chain.
          </p>

          <div style={{ marginBottom: "12px" }}>
            <label
              style={{
                display: "block",
                marginBottom: "6px",
                fontSize: "0.85rem",
                color: "#cbd5e1",
              }}
            >
              Your credential:
            </label>
            <select
              value={selectedCredential}
              onChange={(e) => setSelectedCredential(Number(e.target.value))}
              disabled={generating || isLoading}
              style={{
                width: "100%",
                padding: "8px 12px",
                borderRadius: "8px",
                background: "rgba(15,23,42,0.6)",
                border: "1px solid rgba(99,102,241,0.3)",
                color: "#e0e7ff",
                fontSize: "0.9rem",
              }}
            >
              {credentials.map((cred, i) => (
                <option key={i} value={i}>
                  Credential #{cred.credentialId} (leaf {i})
                </option>
              ))}
            </select>
          </div>

          <ShimmerButton
            onClick={() => void handleVerify()}
            disabled={!address || generating || isLoading || verified}
          >
            {generating
              ? "Generating proof..."
              : verified
                ? "Verified!"
                : "Prove Accreditation"}
          </ShimmerButton>
        </div>
      )}

      {/* Status / error messages */}
      {proofStatus && (
        <div
          style={{
            marginTop: "12px",
            padding: "10px 14px",
            borderRadius: "8px",
            fontSize: "0.85rem",
            background: proofStatus.startsWith("Error")
              ? "rgba(239,68,68,0.1)"
              : verified
                ? "rgba(34,197,94,0.1)"
                : "rgba(99,102,241,0.1)",
            border: `1px solid ${
              proofStatus.startsWith("Error")
                ? "rgba(239,68,68,0.2)"
                : verified
                  ? "rgba(34,197,94,0.2)"
                  : "rgba(99,102,241,0.2)"
            }`,
            color: proofStatus.startsWith("Error")
              ? "#fca5a5"
              : verified
                ? "#4ade80"
                : "#a5b4fc",
          }}
        >
          {proofStatus}
        </div>
      )}

      {error && (
        <div
          style={{
            marginTop: "8px",
            padding: "8px 12px",
            borderRadius: "8px",
            fontSize: "0.85rem",
            background: "rgba(239,68,68,0.1)",
            border: "1px solid rgba(239,68,68,0.2)",
            color: "#fca5a5",
          }}
        >
          {error}
        </div>
      )}

      {/* Technical details */}
      <details style={{ marginTop: "16px" }}>
        <summary
          style={{ cursor: "pointer", fontSize: "0.85rem", color: "#818cf8" }}
        >
          Technical details
        </summary>
        <div
          style={{
            marginTop: "8px",
            fontSize: "0.8rem",
            color: "#94a3b8",
            lineHeight: 1.6,
          }}
        >
          <p>
            <strong>Circuit:</strong>{" "}
            <code>circuits/allowlist_membership/</code> -- Noir circuit proving
            Poseidon Merkle tree membership with nullifier.
          </p>
          <p>
            <strong>Tree:</strong> Depth-4 Poseidon Merkle tree (16 leaves) over
            credential IDs 1, 2, 3. Empty leaves = <code>hash_1(0)</code>.
          </p>
          <p>
            <strong>Hash:</strong> Poseidon (BN254) from{" "}
            <code>noir-lang/poseidon</code>. Stellar Protocol 25 "X-Ray" added
            native Poseidon host functions.
          </p>
          <p>
            <strong>Proof:</strong> UltraHonk (14,592 bytes), verified on-chain
            via
            <code>ultrahonk_soroban_verifier</code>.
          </p>
          <p>
            <strong>Privacy:</strong> The contract learns only the Merkle root
            (public) and the nullifier (prevents replay). It cannot determine
            which credential the player holds.
          </p>
          <p>
            <strong>Merkle root:</strong> <code>{MERKLE_ROOT_HEX}</code>
          </p>
        </div>
      </details>
    </CardDiv>
  );
};
