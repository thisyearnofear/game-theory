# Demo Video Script — ZK Prisoner's Dilemma on Stellar (2-3 min)

## Pre-Demo Setup

- Two browser windows side by side (or two tabs)
- Both wallets connected to Stellar testnet with funded XLM
- Dev server running: `npm run dev`
- Have the terminal open to show test output

---

## Script

### [0:00-0:20] Hook — "What if trust was provable?"

**Show:** Terminal with `cargo test --release` running, 5/5 tests passing.

**Say:**

> "This is a Prisoner's Dilemma game on Stellar where your move is proven
> with zero-knowledge proofs. The contract verifies a real UltraHonk ZK proof
> on-chain before accepting your commitment — so you can't cheat."

### [0:20-0:50] The Problem — Why ZK matters here

**Show:** Slide to the architecture diagram (or just talk over the lobby screen).

**Say:**

> "In a normal commitment scheme, you hash your move and submit the hash.
> But nothing stops you from hashing garbage and griefing your opponent —
> they commit a real move, you never reveal, and the game stalls.
>
> With ZK, the contract verifies at commit time that your hash is over a
> valid move — 0 or 1 — with a known nonce and the correct game ID.
> The proof is 14,592 bytes and verifies in Soroban using BN254 pairing
> operations."

### [0:50-1:30] Player 1 Commits (left window)

**Show:** Click "Create New Game", select "Cooperate", enter stake (1 XLM).

**Say:**

> "Player 1 chooses Cooperate. The browser generates a random nonce,
> computes keccak256(move || nonce || game_id), and generates a real
> UltraHonk proof using Noir and bb.js — all client-side in WASM."

**Wait for:** "Generating ZK proof..." → proof generated → tx submitted.

**Show:** The game appears in the lobby with game ID and "Awaiting Player 2".

### [1:30-2:00] Player 2 Joins (right window)

**Show:** Switch to second browser, see the game in lobby, click "Join".

**Say:**

> "Player 2 sees the open game, chooses Defect, and generates their own
> ZK proof. The contract verifies both proofs on-chain before accepting
> the commitments."

**Wait for:** Proof generation + tx submission. Game status → "Both Committed".

### [2:00-2:30] Reveal Phase

**Show:** Both players reveal their moves.

**Say:**

> "Now both players reveal. The contract checks keccak256(move || nonce
> || game_id) matches the commitment. No ZK needed here — the proof
> already guaranteed the commitment was valid. The reveal just confirms
> the player actually knew the preimage."

**Show:** Payouts calculated. Player 1 (Cooperate) gets 0, Player 2 (Defect)
gets 3× stake. XLM transferred from escrow.

### [2:30-2:50] On-chain Verification

**Show:** Open stellar.expert link to the transactions.

**Say:**

> "Every step is on-chain on Stellar testnet. The contract is deployed
> at CBGH6QAUEZSYRG3GJZKCUX6ELK7GJZDQ7JN3NBXMZNGEHDZGPLMOI5NS.
> The ZK proof verification uses the Nethermind UltraHonk Soroban verifier
> with BN254 host functions from soroban-sdk 26."

### [2:50-3:00] Close

**Say:**

> "Real ZK proofs, real on-chain verification, real XLM stakes.
> The code is open source — Noir circuit, Soroban contract, and React
> frontend all in the repo. Thanks for watching."

---

## Key Points to Emphasize

1. **Real ZK** — not a mock or stub. The proof is 14,592 bytes of actual
   UltraHonk proof data, verified by BN254 pairings on-chain.
2. **Load-bearing** — without the proof, you can't create or join a game.
   The contract rejects invalid proofs (tested).
3. **Browser-native** — proof generation happens in the browser via WASM.
   No server, no trusted third party.
4. **Stellar-native** — uses Soroban's built-in keccak256 and BN254 host
   functions. No oracle, no bridge.

## Backup Slides (if asked)

- "How long does proof generation take?" — ~2-5 seconds in browser
- "What's the proof size?" — 14,592 bytes
- "What circuit?" — keccak256(move || nonce || game_id) == commitment,
  move constrained to {0, 1}, 3 public inputs (commitment_high,
  commitment_low, game_id)
- "What verifier?" — NethermindEth's rs-soroban-ultrahonk, UltraHonk
  protocol with BN254 curve
