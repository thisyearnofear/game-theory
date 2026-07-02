# Trustfall — Zero-Knowledge Prisoner's Dilemma on Stellar

## Hackathon: Stellar Hacks - Real-World ZK

**Project Name:** Trustfall

**Website:** [trustfall.xyz](https://trustfall.xyz)

**One-liner:** A ZK-powered multiplayer Prisoner's Dilemma on Stellar where players commit moves via zero-knowledge proofs, enabling truly simultaneous strategy selection on a transparent blockchain.

---

## The Problem

The Prisoner's Dilemma requires **simultaneous commitment** — neither player should know the opponent's move before committing their own. On a transparent public ledger like Stellar, this is fundamentally broken.

If Player 1 submits "Cooperate" as a plaintext transaction, Player 2 can read it on-chain before submitting "Defect." The game's strategic integrity collapses.

### Why Existing Workarounds Fall Short

| Approach                  | Problem                                                                                                                                       |
| ------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------- |
| Commit-reveal (hash only) | A player can commit to garbage, observe the opponent's reveal, then "reveal" a winning move. No proof the commitment is to a valid game move. |
| Trusted third party       | Defeats the purpose of decentralization. Single point of failure.                                                                             |
| Single-player AI only     | No real adversarial play. AI moves are deterministic and predictable.                                                                         |

## The ZK Solution

**Players commit moves via Noir ZK proofs. The contract verifies the commitment is to a valid game move without learning which move. Resolution happens after both players commit.**

### Why ZK Is Load-Bearing (Not Namechecked)

The ZK proof proves the commitment is to a **valid game move specifically** (C or D), not just any arbitrary value. Without ZK, a hash commitment could be to anything. A malicious player could commit to garbage, observe the opponent's reveal, then "reveal" a winning move. The ZK proof cryptographically guarantees the commitment is to a legitimate move before the opponent commits.

This is not privacy-for-privacy's-sake. The ZK proof is what makes fair, trustless multiplayer Prisoner's Dilemma possible on a public blockchain. Without it, the game is either broken (transparent moves) or trust-dependent (third-party arbiter).

---

## What Was Actually Built (Current State)

### ✅ Completed

1. **Noir circuit** (`circuits/move_commitment/`) — Proves `keccak256(move || nonce || game_id) == commitment` where `move ∈ {0, 1}`. Uses external `noir-lang/keccak256` library. Public inputs: `commitment_high`, `commitment_low` (two 128-bit Field elements for 32-byte alignment), `game_id`.

2. **Soroban contract** (`contracts/zk_dilemma/`) — On-chain UltraHonk proof verification via `ultrahonk_soroban_verifier` (NethermindEth). Keccak256 commitment verification. XLM escrow with proper auth. Timeout-based forfeit logic. Recovery functions (`cancel_game`, `claim_refund`) for stuck games. Contract events for off-chain indexing. Self-join prevention. `soroban-sdk` 26.x for BN254 host functions.

3. **Browser proof generation** — `@noir-lang/noir_js@1.0.0-beta.9` + `@aztec/bb.js@0.87.0` (pinned to match toolchain). Proof generated with `{ keccak: true }` (non-ZK keccak UltraHonk flavor) to match on-chain verifier. Circuit JSON served from `public/circuits/`. **Lazy-loaded** — bb.js/noir_js are dynamically imported on first proof generation, keeping the initial page load bundle at ~200KB (WASM only downloads when needed).

4. **Frontend** — React + TypeScript. GameLobby, CommitMove, RevealMove, GameResult components. `useZKDilemma` hook with typed client. Wallet integration via Stellar Wallets Kit. **Auto-retry** for game_id race condition in create flow. **Mobile responsive** breakpoints. **Onboarding overlay** (3-step ZK tutorial) on first visit to `/play`. Cancel/refund UI for stuck games with countdown timers.

5. **Tests** — 9/9 Rust tests passing, including `test_verify_proof_real_proof` (verifies a real 14,592-byte UltraHonk proof on-chain), `test_cancel_game_after_commit_deadline`, `test_claim_refund_both_timeout`, `test_self_join_prevented`. Cross-verified: bb.js-generated proof verified against the Rust on-chain verifier.

6. **Deployed** — Contract deployed and initialized on testnet: `CCJ6NWQDC7BAV2A6CU2D3D47F4MLGHRJMPANFLTQQMTZCHB4RVEDELQ7` (includes recovery functions + events, deployed 2026-07-02)

7. **WASM** — 28KB optimized contract WASM.

8. **Tutorial mode** — Educational slide system with local simulation (no wallet/contract needed). AI tutor feedback via Venice AI. **9 stateful iterated strategies** (Tit-for-Tat, Tit-for-Two-Tat, Grudge, Pavlov, Prober, Generous TFT, Always Cooperate, Always Defect, Random). Move history table, trust altitude visual, noise slider, payoff matrix editor, strategy inspector.

9. **Tournament mode** — Evolutionary tournament simulation matching Nicky Case's architecture. All 9 strategies compete in round-robin, weak eliminated, strong reproduce. Population bar chart, auto-play, noise slider, payoff matrix editor with presets, population-over-generations chart, winner detection.

10. **Trustfall thematic UI** — The entire experience is built around the trust fall metaphor. Commit phase = "the fall" (falling animation during proof generation). Result = "the catch or the impact" (catch animation for cooperation, impact for defection). Trust altitude grows with consecutive mutual cooperation.

### ⬜ Not Built (Honest Gaps)

1. **Reputation proofs** — The original plan included ZK reputation proofs ("I've cooperated in N% of games"). Not implemented. The circuit, contract functions, and frontend UI for this were not built.

2. **End-to-end browser test** — The cryptographic path (bb.js → on-chain verifier) is cross-verified, but a full two-wallet browser session has not been tested end-to-end.

3. ~~**Contract redeployment**~~ — ✅ Done (2026-07-02). The WASM with recovery functions and events is now deployed to testnet at `CCJ6NWQDC7BAV2A6CU2D3D47F4MLGHRJMPANFLTQQMTZCHB4RVEDELQ7`.

4. **On-chain iterated games** — The tutorial supports iterated play with stateful strategies, but the ZK multiplayer contract is still single-round. On-chain multi-round gameplay with move history is future work.

---

## Game Flow (ZK Multiplayer)

### Commit Phase

1. Player selects move (C or D) and generates a random nonce
2. Browser computes `keccak256(move || nonce || game_id)` — the commitment
3. Browser generates a Noir UltraHonk ZK proof:
   - **Public inputs**: `commitment_high`, `commitment_low` (32-byte commitment split into two 128-bit Field elements), `game_id`
   - **Private inputs**: `move` (must be 0 or 1), `nonce`
   - **Circuit constraints**: `move == 0 OR move == 1`, `keccak256(move || nonce || game_id) == commitment`
4. Player submits `commitment` + ZK proof to the Stellar contract
5. Contract verifies the ZK proof using the `ultrahonk_soroban_verifier` (BN254 host functions)
6. Contract records the commitment and rejects invalid proofs

### Reveal Phase

1. After both players have committed, each player reveals `move` and `nonce`
2. Contract verifies `keccak256(move || nonce || game_id) == commitment`
3. If a player fails to reveal within the timeout window, they forfeit (stake goes to opponent)

### Settlement Phase

1. Contract calculates payoffs using the standard Prisoner's Dilemma matrix
2. XLM is transferred from escrow to both players based on payoff
3. Game result is recorded on-chain (move values are now public, but strategic fairness was preserved during commitment)

---

## Technical Stack

### ZK Layer: Noir + UltraHonk

- **Circuit**: `circuits/move_commitment/src/main.nr` — keccak256-based commitment
- **Prover**: `@aztec/bb.js@0.87.0` in browser (WASM), `bb` CLI for testing
- **Verifier**: `ultrahonk_soroban_verifier` from NethermindEth/rs-soroban-ultrahonk
- **Proof size**: 14,592 bytes (456 field elements, non-ZK keccak flavor)
- **Hash function**: keccak256 (not Poseidon2 — changed to match contract's `env.crypto().keccak256`)

### Smart Contract: Soroban (Rust)

- `soroban-sdk` 26.x with `alloc` feature for WASM build
- BN254 host functions for pairing-based proof verification
- `env.crypto().keccak256()` for commitment verification
- Native XLM (Stellar Asset Contract) for escrow

### Frontend: React + TypeScript

- `@noir-lang/noir_js@1.0.0-beta.9` for witness generation
- `@aztec/bb.js@0.87.0` for UltraHonk proof generation
- `@noble/hashes` for client-side keccak256
- Circuit JSON loaded from `public/circuits/move_commitment.json`
- Stellar Wallets Kit for wallet connection

### Version Pinning

The browser proof generation packages are pinned to match the local toolchain:

- `nargo 1.0.0-beta.9` → `@noir-lang/noir_js@1.0.0-beta.9`
- `bb v0.87.0` → `@aztec/bb.js@0.87.0`

These must match. A version mismatch causes `acvm_js` to fail deserializing the circuit.

The proof is generated with `{ keccak: true }` (non-ZK keccak UltraHonk flavor) to match the on-chain verifier. Do NOT use `{ keccakZK: true }` or `{ verifierTarget: "evm" }` — those produce different proof variants that fail on-chain verification.

---

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                      Frontend (React)                         │
│                                                               │
│  ┌──────────────┐  ┌──────────────┐  ┌────────────────────┐  │
│  │  Tutorial     │  │  Tournament  │  │  ZK Multiplayer    │  │
│  │  (vs AI)      │  │  Mode        │  │  (real XLM stakes) │  │
│  │               │  │              │  │                    │  │
│  │  9 strategies │  │  Evolution   │  │  GameLobby         │  │
│  │  Move history │  │  simulation  │  │  CommitMove        │  │
│  │  Trust alt.   │  │  9 strategies│  │  RevealMove        │  │
│  │  Noise slider │  │  Auto-play   │  │  GameResult        │  │
│  │  Payoff edit  │  │  Payoff edit │  │                    │  │
│  │  Inspector    │  │              │  │                    │  │
│  └──────────────┘  └──────────────┘  └────────────────────┘  │
│                          │                                    │
│  ┌───────────────────────┼────────────────────────────────┐  │
│  │   noir_js + bb.js (WASM) Proof Generation              │  │
│  │   - Witness generation (noir_js)                        │  │
│  │   - UltraHonk proof (bb.js, keccak non-ZK)             │  │
│  │   - keccak256 commitment (@noble/hashes)               │  │
│  └───────────────────────┼────────────────────────────────┘  │
└──────────────────────────┼────────────────────────────────────┘
                           │
                    Stellar Wallet Kit
                           │
┌──────────────────────────┼────────────────────────────────────┐
│                   Stellar Testnet                              │
│                           │                                    │
│  ┌────────────────────────┼────────────────────────────────┐  │
│  │            zk_dilemma Contract                                │  │
│  │                                                                │  │
│  │  ┌─────────────┐  ┌─────────────┐  ┌────────────┐         │  │
│  │  │ Commit      │  │ Reveal &    │  │ Escrow &   │         │  │
│  │  │ Verifier    │  │ Resolve     │  │ Payout     │         │  │
│  │  │ (UltraHonk  │  │ (keccak256  │  │ (XLM SAC   │         │  │
│  │  │  proof chk) │  │  hash chk)  │  │  transfers)│         │  │
│  │  └─────────────┘  └─────────────┘  └────────────┘         │  │
│  └────────────────────────────────────────────────────────────┘  │
│                                                                  │
│  ┌────────────────────────────────────────────────────────────┐ │
│  │    ultrahonk_soroban_verifier (NethermindEth)               │ │
│  │  Verifies UltraHonk proofs using BN254 host funcs           │ │
│  └────────────────────────────────────────────────────────────┘ │
└──────────────────────────────────────────────────────────────────┘
```

---

## Contract Design: `zk_dilemma`

### Storage

```rust
enum GameStatus { AwaitingPlayer2, BothCommitted, Resolved, Forfeited, Cancelled }

struct Game {
    player1: Address,
    player2: Option<Address>,
    commitment1: Bytes,          // keccak256(move || nonce || game_id)
    commitment2: Option<Bytes>,
    move1: Option<Symbol>,       // Set during reveal
    move2: Option<Symbol>,
    nonce1: Option<u64>,
    nonce2: Option<u64>,
    stake: i128,
    status: GameStatus,
    created_at: u64,
    commit_deadline: u64,        // Timeout for opponent to commit
    reveal_deadline: u64,        // Timeout for both to reveal
}
```

Note: Proofs are NOT persisted on-chain. They are verified at commit time and discarded. Only the commitment is stored.

### Functions

```rust
fn initialize(env, vk_bytes: Bytes, xlm_token: Address)  // Set VK + token
fn create_game(env, player, commitment, proof, stake) -> u64
fn join_game(env, player, game_id, commitment, proof) -> Result
fn reveal_move(env, player, game_id, move, nonce) -> Result
fn resolve_game(env, game_id) -> Result
fn claim_forfeit(env, game_id) -> Result
fn cancel_game(env, player1, game_id) -> Result          // Recovery: no opponent joined
fn claim_refund(env, game_id) -> Result                  // Recovery: both timed out
fn get_game(env, game_id) -> Option<Game>
fn get_game_count(env) -> u32
fn get_vk(env) -> Option<Bytes>
```

### XLM Escrow

1. **`create_game`**: Transfer stake from player1 to contract escrow
2. **`join_game`**: Transfer stake from player2 to contract escrow
3. **`resolve_game`**: Transfer payouts to both players based on payoff matrix
4. **`claim_forfeit`**: Transfer full escrow (2× stake) to the revealing player
5. **`cancel_game`**: Return stake to player1 if no opponent joined before commit deadline
6. **`claim_refund`**: Split escrow — return each player's stake if both failed to reveal

### Events

The contract emits events for off-chain indexing:

- `GameCreated(game_id, player1, stake)`
- `GameJoined(game_id, player2)`
- `MoveRevealed(game_id, player, move)`
- `GameResolved(game_id, payout1, payout2)`
- `GameForfeited(game_id, winner)`
- `GameCancelled(game_id)`

---

## Submission Checklist

- [x] Open-source repo with full source code
- [x] Clear README.md explaining what was built, how ZK is used, and what's unfinished
- [x] ZK is load-bearing: Noir proofs verify move validity on-chain
- [x] Stellar integration: Soroban contract verifies proofs using BN254 host functions
- [x] Contracts deployed on testnet with real addresses
- [x] Honest about mock data or unfinished features in README
- [x] Recovery mechanisms (cancel_game, claim_refund) for stuck/locked funds
- [x] Contract events for off-chain indexing
- [x] Self-join vulnerability fixed
- [x] Mobile responsive UI
- [x] Onboarding overlay for new users
- [x] Lazy-loaded ZK WASM (code-split for fast initial page load)
- [x] Iterated tutorial with 9 stateful strategies, move history, trust altitude
- [x] Tournament mode with evolutionary simulation, population visualization
- [x] Configurable payoff matrix with 5 preset scenarios
- [x] Noise simulation ("the wind caught you") in both tutorial and tournament
- [x] Strategy inspector with plain-English decision logic explanations
- [x] Trustfall thematic UI (the fall, the catch, the impact)
- [ ] 2-3 minute demo video (script prepared at `docs/demo-script.md`)
- [ ] End-to-end browser test with two wallets
- [x] Contract redeployment with new recovery functions + events (2026-07-02)

---

## Key Resources

- [Noir Docs](https://noir-lang.org/docs/)
- [NethermindEth UltraHonk Soroban Verifier](https://github.com/NethermindEth/rs-soroban-ultrahonk)
- [Soroban Smart Contracts](https://developers.stellar.org/docs/build/smart-contracts)
- [Stellar Wallets Kit](https://github.com/Creit-Tech/Stellar-Wallets-Kit)
- [Stellar Protocol 26 Host Functions](https://developers.stellar.org/docs/learn/fundamentals/protocol-26)
