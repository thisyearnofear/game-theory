# Trustfall — Two Real-World ZK Patterns on Stellar

**[trustfall.xyz](https://trustfall.xyz)**

Trustfall demonstrates two distinct zero-knowledge proof patterns verified on-chain in Soroban smart contracts, using a trust-fall game as the interactive demo vehicle:

1. **Private Accreditation** — Prove you're on an allowlist without revealing which credential is yours. A Poseidon Merkle tree membership proof with nullifier-based replay protection. This is the same pattern used in real-world KYC/AML, accredited investor verification, and compliance-gated access — prove eligibility without exposing identity.

2. **Move Commitment Binding** — Prove a hash commitment is to a valid game move (not garbage) at commit time, before the opponent locks their stake. A keccak256 commitment with UltraHonk proof that the preimage is a valid move bound to a specific game. This pattern applies to any commit-reveal scheme where early validation prevents griefing — fair on-chain escrow, wagering, sealed-bid auctions.

Both proofs are generated client-side in the browser using Noir + bb.js (WASM, lazy-loaded) and verified on-chain by the `ultrahonk_soroban_verifier` using Stellar Protocol 25/26's native BN254 and Poseidon host functions.

_Built with Scaffold Stellar for the Stellar Hacks: Real-World ZK hackathon._

---

## Why This Matters for Stellar

Stellar moves real money — stablecoins, cross-border payments, tokenized assets, institutional settlement. These use cases require:

- **Compliance without exposure** — proving accreditation status without revealing customer identity
- **Fair settlement** — proving commitments are valid before locking counterparty funds

Trustfall demonstrates both patterns working on-chain today, using the cryptographic primitives Stellar shipped in Protocol 25 ("X-Ray") and Protocol 26 ("Yardstick"):

- **BN254 elliptic curve operations** — native host functions for pairing-based proof verification
- **Poseidon/Poseidon2 hashing** — ZK-friendly hashing used in the accreditation Merkle tree
- **keccak256** — used for move commitments, verified via host function

The gap between "powerful primitives" and "finished product" is where this project lives. We generate proofs off-chain with Noir, deploy a verifier contract on Stellar, and close the loop with a working frontend.

---

## The Two ZK Patterns

### Pattern 1: Private Accreditation (ZK Allowlist Membership)

**Real-world use case:** A payment operator needs to verify that a user is an accredited investor before allowing them to participate in a tokenized asset offering. The user proves they're on the accreditation allowlist without revealing which specific credential they hold — the operator learns only "this person is accredited," not "this person is credential #3."

**How it works:**

1. **Admin initializes** — The operator calls `initialize_accreditation` with a separate UltraHonk VK (for the allowlist circuit), a Merkle root of accredited credentials, and an admin address.
2. **Player proves** — The player selects their credential and generates a ZK proof in the browser. The proof proves their credential's Poseidon hash is a leaf in the tree with the public root, and emits a nullifier `poseidon(credential_id, game_id)`.
3. **Contract verifies** — `verify_accreditation` checks the root matches, verifies the UltraHonk proof on-chain, and records the nullifier. The contract learns only that the player is accredited — not which credential they hold.
4. **Nullifier prevents replay** — The same credential cannot accredit twice for the same game_id. Different game_ids produce different nullifiers, so the same credential can be used across games.

**Noir circuit:** `circuits/allowlist_membership/` — Poseidon Merkle tree membership (depth-4, 16 leaves) with nullifier. Uses `noir-lang/poseidon` (BN254 `hash_1` for leaves, `hash_2` for internal nodes). Public inputs: `merkle_root`, `nullifier`, `game_id`. Private inputs: `credential_id`, `merkle_path`, `path_indices`.

**Why Poseidon?** Poseidon is ZK-friendly — its arithmetic structure produces smaller circuits than keccak256, making proofs cheaper to generate and verify. Stellar Protocol 25 introduced native Poseidon host functions, making on-chain Poseidon operations affordable. This circuit uses them.

**Demo tree:** The frontend ships with a pre-computed Merkle tree containing credentials 1, 2, and 3 at leaves 0, 1, 2 (all other leaves = `hash_1(0)`). The admin panel lets you initialize accreditation on-chain; the player panel lets you select a credential and generate + verify a proof. In a production system, the operator would build the tree off-chain and distribute credentials + paths privately.

**Known limitation:** Nullifiers are pre-computed for `game_id=0` only. For other game_ids, a JavaScript Poseidon implementation (matching Noir BN254 parameters) would be needed to compute `poseidon(credential_id, game_id)` client-side. The ZK proof itself works for any game_id — only the frontend nullifier pre-computation needs the JS Poseidon.

### Pattern 2: Move Commitment Binding

**Real-world use case:** Any commit-reveal scheme where early validation prevents griefing. Sealed-bid auctions, fair escrow, wagering — any protocol where a party commits to a value and reveals later. Without ZK, a party can commit to garbage, observe the opponent's reveal, then "reveal" a winning value. The ZK proof makes the commitment binding at commit time.

**How it works:**

1. **Commit Phase** — Each player selects a move (C/D) and generates a random nonce. The browser computes `keccak256(move || nonce || game_id)` and generates an UltraHonk ZK proof. The contract verifies the proof on-chain, guaranteeing the commitment is to a valid move (0 or 1) with a known preimage — without revealing which move.
2. **Reveal Phase** — After both players commit, each reveals their move + nonce. The contract verifies `keccak256(move || nonce || game_id)` matches the commitment.
3. **Resolve Phase** — Payouts are calculated and XLM is transferred from escrow. If a player doesn't reveal in time, the opponent can claim forfeit.
4. **Recovery** — If no opponent joins before the commit deadline, player1 can `cancel_game` to reclaim their stake. If both players timeout on reveal, anyone can `claim_refund` to split the escrow.

**Noir circuit:** `circuits/move_commitment/` — Proves `keccak256(move || nonce || game_id) == commitment` where `move ∈ {0, 1}`. Uses the external `noir-lang/keccak256` library. Public inputs: `commitment_high`, `commitment_low` (two 128-bit Field elements for 32-byte alignment), `game_id`.

**What does the ZK proof add over plain hash commitment?** A plain hash commitment `H(move || nonce || game_id)` already hides the move and is binding _at reveal time_. The contract also has timeout-based forfeit logic that bounds the griefing vector. So what does the ZK proof add?

The ZK proof makes the commitment **binding at commit time**, not just at reveal time. Without the proof, a player could commit to an arbitrary hash with no valid preimage. The opponent would have to wait for the reveal deadline to expire, then call `claim_forfeit` — wasting an on-chain round and locking both stakes in escrow for the full timeout window. With the proof, the contract knows _at commit time_ that the hash is over a valid move (0 or 1) with a known preimage and the correct `game_id`:

1. **No griefing-as-stalling** — a garbage commitment is rejected immediately, before the opponent commits their own stake.
2. **Replay protection** — the proof binds the commitment to the specific `game_id`, preventing reuse across games.
3. **Provably valid state** — the contract never enters a state where a commitment has no valid reveal.

Proofs are not persisted on-chain (only the commitment is stored), keeping gas costs manageable. The proof is a one-time verification at commit; the reveal uses a cheap keccak256 host function comparison.

---

## The Demo Vehicle: Trust Fall Game

The two ZK patterns are demonstrated through a trust-fall game — a multiplayer Prisoner's Dilemma where players commit to Cooperate or Defect using ZK proofs, with real XLM at stake. The game framing makes the abstract cryptographic patterns tangible: you can see the commitment binding prevent griefing, and the accreditation gate control who can play.

The game also includes an educational sandbox (no wallet needed) inspired by Nicky Case's ["The Evolution of Trust"](https://ncase.me/trust/):

### Tutorial (vs AI) — Iterated Prisoner's Dilemma

Play against 9 stateful AI strategies that remember your past moves:

- **Tit-for-Tat** — cooperates first, then copies your last move
- **Tit-for-Two-Tat** — forgives one betrayal, retaliates after two
- **Grudge** — cooperates until you betray once, then defects forever
- **Pavlov** — win-stay, lose-shift
- **Prober** — tests you with C-D-C-C, then exploits or plays TFT
- **Generous TFT** — like TFT but forgives 10% of defections
- **Always Cooperate**, **Always Defect**, **Random**

Features: move history table, trust altitude (grows with mutual cooperation, resets on betrayal), noise slider ("the wind caught you" — random move flips 0-50%), payoff matrix editor (5 presets: Classic PD, Stag Hunt, Harmony, Snowdrift, High Temptation), strategy inspector (plain-English decision logic), AI tutor feedback.

### Tournament Mode — Evolution of Trust

All 9 strategies compete in a round-robin tournament. The weak are eliminated, the strong reproduce — matching Nicky Case's evolutionary simulation. Watch how noise kills strict Tit-for-Tat (can't forgive mistakes) while Generous TFT thrives. Configurable: noise level, rounds per match, selection pressure, payoff matrix.

### ZK Multiplayer — Real Stakes

Play against other humans with zero-knowledge commitment. Real XLM escrow. Single-round games and multi-round matches (best-of-3/5 with rematch). Stake presets (1/5/10 XLM). Persistent stats, game history, achievement system. Lobby with waiting indicator, copy game link, opponent-joined notification.

---

## Smart Contract

**Contract:** `contracts/zk_dilemma/` — Soroban contract with:

- On-chain UltraHonk proof verification (two separate VKs: one for move commitments, one for accreditation)
- keccak256 hash verification via host function
- XLM escrow with proper auth
- Timeout-based forfeit logic
- Recovery functions (`cancel_game`, `claim_refund`, `cancel_match`)
- Multi-round match support (best-of-3/5 with rematch)
- Private accreditation (Merkle root + nullifier tracking)
- Contract events for off-chain indexing
- 19/19 Rust tests passing

**Deployed on testnet:** `CA6PHYHU6OCKSW2KMSWQNBZ4DNUKUWGWNQDFJIHNS22WOT45F6WQTMG5` (deployed 2026-07-03)

### Contract Functions

```rust
// Initialization
fn initialize(env, vk_bytes: Bytes, xlm_token: Address)

// Single-round games
fn create_game(env, player, commitment, proof, stake) -> u64
fn join_game(env, player, game_id, commitment, proof) -> Result
fn reveal_move(env, player, game_id, move, nonce) -> Result
fn resolve_game(env, game_id) -> Result
fn claim_forfeit(env, game_id) -> Result
fn cancel_game(env, player1, game_id) -> Result
fn claim_refund(env, game_id) -> Result

// Multi-round matches (best-of-3/5)
fn create_match(env, player1, commitment, proof, stake, best_of) -> (u64, u64)
fn join_match(env, player2, match_id, commitment, proof) -> Result
fn start_next_round(env, player1, match_id, commitment, proof) -> u64
fn join_next_round(env, player2, match_id, commitment, proof) -> Result
fn rematch(env, player, old_match_id, commitment, proof) -> (u64, u64)
fn cancel_match(env, player1, match_id) -> Result

// Private accreditation
fn initialize_accreditation(env, vk_bytes: Bytes, merkle_root: Bytes, admin: Address)
fn update_accredited_root(env, merkle_root: Bytes)
fn verify_accreditation(env, proof: Bytes, merkle_root: Bytes, nullifier: Bytes, game_id: u64)
fn is_accreditation_initialized(env) -> bool
fn get_accredited_root(env) -> Option<Bytes>
```

### Contract Tests (19/19 passing)

**Single-round (7 tests):** real proof verification, fake proof rejection, wrong-length rejection, zero-stake rejection, payout calculation, cancel after deadline, refund on both timeout, self-join prevention.

**Multi-round match (8 tests):** create match, invalid best-of, full best-of-3, completed after two wins, cancel after timeout, forfeit awards round.

**Accreditation (4 tests):** real proof verification, wrong root rejection, nullifier replay rejection, uninitialized rejection.

---

## Technical Stack

### ZK Layer: Noir + UltraHonk

- **Circuits:** `circuits/move_commitment/` (keccak256 commitment), `circuits/allowlist_membership/` (Poseidon Merkle tree membership)
- **Prover:** `@aztec/bb.js@0.87.0` in browser (WASM), `bb` CLI for testing
- **Verifier:** `ultrahonk_soroban_verifier` from NethermindEth/rs-soroban-ultrahonk
- **Proof size:** 14,592 bytes (move commitment), comparable for accreditation
- **Hash functions:** keccak256 (move commitments, via host function), Poseidon (accreditation Merkle tree, BN254 parameters)

### Smart Contract: Soroban (Rust)

- `soroban-sdk` 26.x with `alloc` feature for WASM build
- BN254 host functions for pairing-based proof verification (Protocol 25/26)
- Poseidon host functions for ZK-friendly hashing (Protocol 25)
- `env.crypto().keccak256()` for commitment verification
- Native XLM (Stellar Asset Contract) for escrow

### Frontend: React + TypeScript

- `@noir-lang/noir_js@1.0.0-beta.9` for witness generation
- `@aztec/bb.js@0.87.0` for UltraHonk proof generation
- `@noble/hashes` for client-side keccak256
- Circuit JSON loaded from `public/circuits/`
- Stellar Wallets Kit for wallet connection
- Lazy-loaded ZK WASM (code-split for fast initial page load)

### Version Pinning

The browser proof generation packages are pinned to match the local toolchain:

- `nargo 1.0.0-beta.9` → `@noir-lang/noir_js@1.0.0-beta.9`
- `bb v0.87.0` → `@aztec/bb.js@0.87.0`

These must match. A version mismatch causes `acvm_js` to fail deserializing the circuit. The proof is generated with `{ keccak: true }` (non-ZK keccak UltraHonk flavor) to match the on-chain verifier.

---

## Quick Start

```bash
git clone https://github.com/thisyearnofear/trustfall.git
cd trustfall
npm install
npm run dev
```

Open http://localhost:5173, connect your Stellar wallet, and play.

**Requirements:** Node.js v22+, npm, Rust + stable toolchain (for contract development), Stellar wallet with testnet XLM.

---

## Project Structure

```
trustfall/
├── circuits/                       # Noir ZK circuits
│   ├── move_commitment/           # Pattern 2: keccak256 commitment binding
│   └── allowlist_membership/      # Pattern 1: Poseidon Merkle tree accreditation
├── contracts/
│   └── zk_dilemma/                # Soroban contract (both ZK patterns, escrow, matches)
├── src/                            # Frontend (React + TypeScript)
│   ├── components/
│   │   ├── zk/                    # ZK multiplayer UI
│   │   │   ├── GameLobby.tsx
│   │   │   ├── CommitMove.tsx
│   │   │   ├── RevealMove.tsx
│   │   │   ├── GameResult.tsx
│   │   │   ├── AccreditationPanel.tsx  # Private accreditation UI
│   │   │   ├── MatchSetup.tsx
│   │   │   ├── MatchScoreboard.tsx
│   │   │   └── MatchCommitMove.tsx
│   │   ├── slides/                # Educational sandbox
│   │   └── ui/                    # Shared UI components
│   ├── hooks/
│   │   ├── useZKDilemma.ts        # Contract hook (all functions incl. accreditation)
│   │   └── useGameStats.ts
│   ├── services/
│   │   ├── noirProofService.ts         # Move commitment proof generation
│   │   └── accreditationProofService.ts # Accreditation proof generation
│   ├── util/
│   │   ├── strategies.ts          # 9 stateful iterated strategies
│   │   ├── tournament.ts          # Evolutionary tournament engine
│   │   └── merkleTree.ts          # Pre-computed Poseidon Merkle tree data
│   └── pages/
│       ├── ZKGamePage.tsx
│       ├── TutorialSandbox.tsx
│       └── Home.tsx
├── docs/                          # Hackathon plan, demo script, product review
└── package.json
```

---

## Development

### Building the Contract WASM

```bash
PATH="$HOME/.rustup/toolchains/stable-x86_64-apple-darwin/bin:$PATH" \
  stellar contract build --package zk-dilemma
```

### Generating TypeScript Bindings

```bash
stellar contract bindings typescript \
  --wasm target/wasm32v1-none/release/zk_dilemma.wasm \
  --output-dir src/contracts/zk_dilemma \
  --overwrite
```

### Deploying to Testnet

```bash
# 1. Build the WASM
PATH="$HOME/.rustup/toolchains/stable-x86_64-apple-darwin/bin:$PATH" stellar contract build

# 2. Deploy
stellar contract deploy \
  --wasm target/wasm32v1-none/release/zk_dilemma.wasm \
  --source testnet-user --network testnet

# 3. Initialize with VK and native XLM SAC address
VK_HEX=$(xxd -p circuits/move_commitment/target/vk | tr -d '\n')
XLM_SAC="CDLZFC3SYJYDZT7K67VZ75HPJVIEUVNIXF47ZG2FB2RMQQVU2HHGCYSC"

stellar contract invoke \
  --id <DEPLOYED_CONTRACT_ID> \
  --source testnet-user --network testnet \
  -- initialize --vk_bytes "$VK_HEX" --xlm_token "$XLM_SAC"
```

Set `VITE_ZK_DILEMMA_CONTRACT_ID` in `.env` to the deployed contract ID.

### Testing

```bash
# Rust contract tests (19 tests: 7 single-round + 8 multi-round + 4 accreditation)
cargo test -p zk-dilemma

# TypeScript typecheck
npx tsc --noEmit
```

### Frontend

```bash
npm run dev       # Start dev server
npm run build     # Production build
npm run lint      # ESLint
npm run format    # Prettier
```

---

## What's Honest About This

We'd rather be honest about gaps than polish a mystery:

- **Accreditation demo tree is pre-computed** — 3 credentials with hardcoded Merkle paths. A production system would build the tree off-chain and distribute paths privately. The ZK proof itself is real and works for any tree structure.
- **Nullifiers only pre-computed for game_id=0** — the frontend needs a JS Poseidon implementation to compute nullifiers for other game_ids. The circuit handles any game_id; only the client-side helper is limited.
- **No end-to-end two-wallet browser test** — the cryptographic path (bb.js → on-chain verifier) is cross-verified in Rust tests, but a full two-wallet browser session hasn't been tested.
- **No proof generation timeout** — if bb.js WASM fails to load, the UI hangs. No timeout or fallback.
- **Polling, not websockets** — the frontend polls `get_game` every 5 seconds. No event subscription or batching.
- **Reputation proofs not built** — the original plan included ZK reputation proofs ("I've cooperated in N% of games"). Not implemented. Future work.

---

## Inspiration

Trustfall adapts Nicky Case's ["The Evolution of Trust"](https://ncase.me/trust/) to blockchain, transforming theoretical game theory into experiential learning with real economic consequences and zero-knowledge privacy. The two ZK patterns demonstrated here — private accreditation and commitment binding — are directly applicable to the compliance, escrow, and fair settlement use cases that Stellar is built for.

## Links

- **Website:** [trustfall.xyz](https://trustfall.xyz)
- **Source:** [github.com/thisyearnofear/trustfall](https://github.com/thisyearnofear/trustfall)

## License

Licensed under the Apache License, Version 2.0.
