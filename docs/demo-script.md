# Demo Video Script — Trustfall (2-3 min)

## Pre-Demo Setup

- Browser open to trustfall.xyz
- Wallet connected to Stellar testnet with funded XLM
- Terminal open to show test output (optional, for credibility)

---

## Script

### [0:00-0:20] Hook — "Two ZK patterns, one demo"

**Show:** trustfall.xyz landing page

**Say:**

> "This is Trustfall — two real-world zero-knowledge proof patterns
> verified on-chain in a Stellar smart contract. The first pattern is
> private accreditation: prove you're on an allowlist without revealing
> which credential is yours. The second is commitment binding: prove a
> hash commitment is valid before anyone locks their funds. We demo
> both through a trust-fall game with real XLM stakes."

### [0:20-0:50] Pattern 1: Private Accreditation

**Show:** Navigate to the accreditation panel. Show the admin initialize
accreditation with the Merkle root and VK.

**Say:**

> "First, private accreditation. An admin publishes a Merkle root of
> accredited credentials on-chain. This uses Poseidon hashing — a
> ZK-friendly hash for which Stellar Protocol 25 introduced native host
> functions."

**Show:** Switch to player view. Select a credential. Click "Prove
Accreditation." Wait for proof generation.

**Say:**

> "Now the player generates a ZK proof in the browser that their
> credential is in the tree — without revealing which one. The contract
> verifies the proof on-chain and records a nullifier to prevent replay.
> The contract learns 'this person is accredited,' not 'this is
> credential #3.' This is the same pattern used in KYC compliance,
> accredited investor verification, and access control."

**Show:** Proof verified successfully on-chain.

### [0:50-1:30] Pattern 2: Move Commitment Binding

**Show:** Navigate to ZK multiplayer. Click "Create New Game." Select
"Cooperate." Enter stake (1 XLM).

**Say:**

> "Second pattern: commitment binding. In a normal commit-reveal scheme,
> you hash your move and submit the hash. But nothing stops you from
> hashing garbage and griefing your opponent — they'd have to wait for
> the forfeit deadline to get their funds back."

**Show:** Proof generation starts. Show the "Generating ZK proof..."
status.

**Say:**

> "With ZK, the browser generates an UltraHonk proof that the commitment
> is to a valid move — 0 or 1 — with a known nonce and the correct game
> ID. The contract verifies this proof on-chain using BN254 host
> functions from Stellar Protocol 25 and 26. If the commitment is
> garbage, it's rejected immediately — before the opponent locks their
> stake."

**Show:** Game created in lobby. Switch to second browser, join the
game, generate proof, submit. Both reveal.

**Say:**

> "Both players commit with ZK proofs. Both reveal. The contract
> verifies the keccak256 hashes match and transfers XLM from escrow.
> Real proofs, real on-chain verification, real stakes."

### [1:30-2:00] Educational Sandbox (brief)

**Show:** Switch to Tutorial mode. Play one round against Tit-for-Tat.

**Say:**

> "The game also includes an educational sandbox inspired by Nicky
> Case's 'Evolution of Trust.' Nine AI strategies, evolutionary
> tournaments, noise simulation — learn why trust evolves, then play
> for real with ZK-protected stakes."

### [2:00-2:20] Close

**Show:** Terminal with `cargo test -p zk-dilemma` — 19/19 passing.

**Say:**

> "Two ZK patterns, both load-bearing, both verified on-chain. 19
> contract tests passing. Live on Stellar testnet at trustfall.xyz.
> Thanks for watching."

---

## Key Points to Emphasize

1. **Two patterns, not one** — most submissions have one circuit. We have
   two distinct ZK patterns, each solving a different real-world problem.
2. **Accreditation is the real-world hook** — KYC/AML, compliance, access
   control. This maps directly to what Stellar is built for.
3. **Stellar Protocol 25/26 primitives** — we use BN254 host functions and
   Poseidon hashing, the exact primitives the hackathon is celebrating.
4. **Load-bearing ZK** — removing either pattern breaks the corresponding
   feature. Not ZK-for-ZK's-sake.
5. **Browser-native** — proof generation happens in the browser via WASM.
   No server, no trusted third party.
6. **Real on-chain verification** — 14,592-byte UltraHonk proofs verified
   by BN254 pairings on-chain. 19/19 tests passing.

## Backup Answers (if asked)

- **"How long does proof generation take?"** — ~2-5 seconds in browser
- **"What's the proof size?"** — 14,592 bytes (move commitment)
- **"What circuits?"** — keccak256 commitment (move) + Poseidon Merkle tree (accreditation)
- **"What verifier?"** — NethermindEth's rs-soroban-ultrahonk, UltraHonk protocol with BN254
- **"Why Poseidon for accreditation?"** — ZK-friendly, smaller circuits, Stellar Protocol 25 has native host functions
- **"What are the 9 strategies?"** — TFT, TF2T, Grudge, Pavlov, Prober, Generous TFT, Always Cooperate, Always Defect, Random
- **"Known limitations?"** — accreditation demo tree is pre-computed (3 credentials), nullifiers only for game_id=0, no two-wallet browser test, no proof generation timeout
- **"How does the accreditation pattern apply to real use cases?"** — KYC/AML (prove accredited status without revealing identity), compliance-gated token offerings, access control for tokenized assets
- **"How does commitment binding apply beyond games?"** — sealed-bid auctions, fair escrow, any commit-reveal scheme where early validation prevents griefing
