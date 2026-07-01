# ZK Trust: Zero-Knowledge Prisoner's Dilemma on Stellar

## Hackathon: Stellar Hacks - Real-World ZK

**Project Name:** ZK Trust (evolution of the existing "Game Theory on Stellar")

**One-liner:** A ZK-powered private multiplayer Prisoner's Dilemma on Stellar where players commit moves via zero-knowledge proofs, enabling truly simultaneous strategy selection on a transparent blockchain, plus private reputation proofs that let players prove their cooperation history without revealing individual moves.

---

## The Problem

The Prisoner's Dilemma requires **simultaneous commitment** — neither player should know the opponent's move before committing their own. On a transparent public ledger like Stellar, this is fundamentally broken.

If Player 1 submits "Cooperate" as a plaintext transaction, Player 2 can read it on-chain before submitting "Defect." The game's strategic integrity collapses. The current app sidesteps this by only supporting single-player (AI) games with deterministic AI moves, which makes the AI predictable and eliminates true adversarial play.

### Why Existing Workarounds Fall Short

| Approach | Problem |
|---|---|
| Commit-reveal (hash only) | A player can commit to garbage, observe the opponent's reveal, then "reveal" a winning move. No proof the commitment is to a valid game move. |
| Trusted third party | Defeats the purpose of decentralization. Single point of failure. |
| Single-player AI only | No real adversarial play. AI moves are deterministic and predictable. Current state of this app. |

## The ZK Solution

**Players commit moves via Noir ZK proofs. The contract verifies the commitment is to a valid game move without learning which move. Resolution happens after both players commit.**

### Why ZK Is Load-Bearing (Not Namechecked)

The ZK proof proves the commitment is to a **valid game move specifically** (C or D), not just any arbitrary value. Without ZK, a hash commitment could be to anything. A malicious player could commit to garbage, observe the opponent's reveal, then "reveal" a winning move. The ZK proof cryptographically guarantees the commitment is to a legitimate move before the opponent commits.

This is not privacy-for-privacy's-sake. The ZK proof is what makes fair, trustless multiplayer Prisoner's Dilemma possible on a public blockchain. Without it, the game is either broken (transparent moves) or trust-dependent (third-party arbiter).

### Secondary ZK Feature: Private Reputation Proofs

After playing multiple games, a player generates a ZK proof: "I have cooperated in at least N% of my games" — verified over their encrypted game history without revealing individual moves, opponents, or outcomes. This enables trust-building reputation systems on-chain, directly connecting to the app's educational theme about how trust evolves through repeated interaction.

**Real-world relevance**: This pattern — proving properties about private transaction history without revealing the transactions themselves — maps directly to compliance proofs, creditworthiness assertions, and institutional settlement scenarios where privacy is a hard requirement.

---

## Game Flow (ZK Multiplayer)

### Commit Phase

1. Player selects move (C or D) and generates a random nonce
2. Off-chain, player generates a Noir ZK proof:
   - **Public inputs**: `commitment = Poseidon2(move, nonce, player_address, game_id)`
   - **Private inputs**: `move` (must be 0 or 1), `nonce`
   - **Circuit constraints**: `move == 0 OR move == 1` (proves the commitment is to a valid game move)
3. Player submits `commitment` + ZK proof to the Stellar contract
4. Contract verifies the ZK proof using Protocol 25/26 native host functions (Poseidon2 + BN254)
5. Contract records the commitment and rejects invalid proofs

### Reveal Phase

1. After both players have committed, each player reveals `move` and `nonce`
2. Contract verifies `Poseidon2(move, nonce, player_address, game_id) == commitment`
3. If a player fails to reveal within the timeout window, they forfeit (stake goes to opponent)
4. Contract calculates payoffs using the standard Prisoner's Dilemma matrix

### Settlement Phase

1. Contract transfers XLM based on payoff calculation
2. Game result is recorded on-chain (move values are now public, but the strategic fairness was preserved during the commitment phase)
3. Player's encrypted reputation accumulator is updated for future ZK reputation proofs

### Reputation Proof Flow (Bonus)

1. Player accumulates encrypted game history (wins, losses, cooperation rate) in a Merkle tree stored on-chain
2. To prove reputation: player generates a Noir proof over the Merkle tree — "My cooperation rate across N games is at least X%"
3. Contract verifies the proof without learning individual game outcomes
4. Other contracts or dApps can request reputation proofs for matchmaking, staking requirements, or trust scoring

---

## Technical Stack

### ZK Layer: Noir

**Why Noir over Circom/RISC Zero:**
- Rust-based syntax, consistent with existing Rust contract code
- Simple circuit (prove knowledge of valid move + nonce that hashes to commitment)
- Protocol 26 made Noir (UltraHonk) proof verification meaningfully cheaper on Stellar
- Existing verifier: [yugocabrio/rs-soroban-ultrahonk](https://github.com/yugocabrio/rs-soroban-ultrahonk)
- Readable circuit code matches the educational tone of the project

**Noir Circuit (conceptual):**
```noir
fn main(
    // Private inputs
    move: Field,     // 0 = Cooperate, 1 = Defect
    nonce: Field,    // Random blinding value
    // Public inputs
    commitment: pub Field,
    player_address: pub Field,
    game_id: pub Field,
) {
    // Constraint: move must be valid (0 or 1)
    let is_valid = move == 0 | move == 1;
    assert(is_valid);

    // Constraint: commitment must match
    let computed = poseidon2([move, nonce, player_address, game_id]);
    assert(computed == commitment);
}
```

### Smart Contract Layer: Soroban (Rust)

**New contract: `zk_dilemma`**

Leverages Protocol 25 ("X-Ray") host functions:
- `Poseidon2` hashing for commitments
- `BN254` elliptic curve operations for proof verification

Leverages Protocol 26 ("Yardstick") host functions:
- Multi-scalar multiplication for batch proof verification
- Scalar-field arithmetic for efficient proof math

### Frontend: React + TypeScript (existing)

- Noir proofs generated client-side using `noir_js` (WASM)
- Existing wallet integration (Stellar Wallets Kit) reused
- Existing educational slide system repurposed as an onboarding tutorial before ZK multiplayer

### Proof Generation: Off-chain

- Noir proofs generated in the browser via `noir_js_wasm`
- Prover key bundled with the frontend
- Verification key embedded in the Soroban verifier contract

---

## Architecture

```
┌─────────────────────────────────────────────────────────┐
│                    Frontend (React)                       │
│                                                          │
│  ┌──────────────┐  ┌──────────────┐  ┌───────────────┐  │
│  │  Educational  │  │  ZK Game     │  │  Reputation   │  │
│  │  Tutorial     │  │  Lobby &     │  │  Dashboard    │  │
│  │  (slides)     │  │  Matchmaking │  │  (ZK proofs)  │  │
│  └──────────────┘  └──────────────┘  └───────────────┘  │
│                           │                              │
│  ┌────────────────────────┼──────────────────────────┐  │
│  │         Noir JS (WASM) Proof Generation           │  │
│  │  - Move commitment proof                            │  │
│  │  - Reputation proof                                 │  │
│  └────────────────────────┼──────────────────────────┘  │
└──────────────────────────┼──────────────────────────────┘
                           │
                    Stellar Wallet Kit
                           │
┌──────────────────────────┼──────────────────────────────┐
│                   Stellar Testnet                        │
│                           │                              │
│  ┌────────────────────────┼──────────────────────────┐  │
│  │            zk_dilemma Contract                      │  │
│  │                                                      │  │
│  │  ┌─────────────┐  ┌─────────────┐  ┌────────────┐  │  │
│  │  │ Commit      │  │ Reveal &    │  │ Reputation │  │  │
│  │  │ Verifier    │  │ Resolve     │  │ Accrual    │  │  │
│  │  │ (ZK proof   │  │ (payoff     │  │ (encrypted │  │  │
│  │  │  check)     │  │  calc +     │  │  Merkle    │  │  │
│  │  │             │  │  XLM transfer│ │  tree)     │  │  │
│  │  └─────────────┘  └─────────────┘  └────────────┘  │  │
│  │                                                      │  │
│  │  Uses Protocol 25/26 host functions:                │  │
│  │  - poseidon2_hash() for commitments                 │  │
│  │  - bn254_scalar_mul() for proof verification        │  │
│  │  - bn254_msm() for multi-scalar multiplication      │  │
│  └──────────────────────────────────────────────────────┘  │
│                                                          │
│  ┌──────────────────────────────────────────────────────┐│
│  │         UltraHonk Verifier Contract                  ││
│  │  (from yugocabrio/rs-soroban-ultrahonk)              ││
│  │  Verifies Noir proofs using BN254 host functions     ││
│  └──────────────────────────────────────────────────────┘│
└──────────────────────────────────────────────────────────┘
```

---

## App Restructure

The app restructures around ZK multiplayer as the primary experience, with the existing educational slides serving as an onboarding tutorial.

### New Page Structure

```
/                    → Landing: "Zero-Knowledge Trust" intro + Connect Wallet
/tutorial            → Educational slides (existing, repurposed as onboarding)
/play                → ZK Multiplayer game lobby + active games
/reputation          → Player reputation dashboard with ZK proof generation
/history             → On-chain game history (public reveals only)
/debug               → Contract debugger (existing, kept for development)
```

### Component Restructure

**Delete (superseded by ZK multiplayer):**
- `src/components/PrisonersDilemma.tsx` — replaced by ZK game component
- `src/hooks/useGameState.ts` — replaced by ZK game hook
- `src/components/GuessTheNumber.tsx` — scaffold demo, not part of the product
- `src/components/slides/TournamentSlide.tsx` — client-side simulation, replaced by on-chain ZK tournament (if time permits)
- `src/components/slides/IteratedSlide.tsx` — client-side simulation, replaced by on-chain iterated ZK games (if time permits)

**Keep & fix:**
- `src/components/slides/IntroSlide.tsx` — update content for ZK framing
- `src/components/slides/GameSlide.tsx` — refactor as the tutorial game (single-player, no stakes, teaching the basics)
- `src/components/slides/ConclusionSlide.tsx` — update for ZK + privacy themes
- `src/components/SlideSystem.tsx` — keep as tutorial framework
- `src/components/Character.tsx` — keep, reuse in multiplayer UI
- `src/components/AudioManager.tsx` — keep, fix Howl instantiation
- `src/components/ai/*` — keep AI tutor for educational mode, potentially add ZK-aware tutoring
- `src/providers/WalletProvider.tsx` — keep, fix polling
- `src/hooks/useWallet.ts` — keep
- `src/hooks/useWalletBalance.ts` — keep
- `src/components/ConnectAccount.tsx`, `WalletButton.tsx`, `NetworkPill.tsx`, `FundAccountButton.tsx` — keep

**New (ZK multiplayer):**
- `contracts/zk_dilemma/` — new Soroban contract (Rust)
- `src/contracts/zk_dilemma.ts` — generated TS client
- `noir-circuits/move_commitment/` — Noir circuit for move commitment
- `noir-circuits/reputation/` — Noir circuit for reputation proofs
- `src/hooks/useZKGame.ts` — ZK game state management
- `src/hooks/useNoirProof.ts` — Noir proof generation hook
- `src/hooks/useReputation.ts` — reputation proof generation
- `src/components/game/GameLobby.tsx` — matchm finding, create/join games
- `src/components/game/CommitMove.tsx` — move selection + ZK proof generation
- `src/components/game/RevealMove.tsx` — reveal phase UI
- `src/components/game/GameResult.tsx` — outcome display with on-chain verification
- `src/components/game/ActiveGames.tsx` — list of games awaiting opponents
- `src/components/reputation/ReputationDashboard.tsx` — reputation stats + proof generation
- `src/components/reputation/ReputationProof.tsx` — generate and verify reputation proofs

---

## Contract Design: `zk_dilemma`

### Storage

```rust
// Game states
enum GameStatus { AwaitingPlayer2, BothCommitted, Revealed, Resolved, Forfeited }

struct Game {
    player1: Address,
    player2: Option<Address>,
    commitment1: Option<Hash>,    // Poseidon2(move, nonce, player, game_id)
    commitment2: Option<Hash>,
    proof1: Option<Vec<u8>>,       // Noir proof bytes
    proof2: Option<Vec<u8>>,
    move1: Option<Symbol>,         // Set during reveal
    move2: Option<Symbol>,
    nonce1: Option<Field>,
    nonce2: Option<Field>,
    stake: i128,
    status: GameStatus,
    created_at: u64,
    commit_deadline: u64,          // Timeout for opponent to commit
    reveal_deadline: u64,          // Timeout for both to reveal
}

// Reputation (encrypted Merkle tree root per player)
struct ReputationState {
    merkle_root: Hash,
    total_games: u32,
    commitment: Field,             // Pedersen commitment to cooperation rate
}
```

### Functions

```rust
// Create a new game with ZK commitment
fn create_game(env, player, commitment, proof, stake) -> u64

// Join with ZK commitment
fn join_game(env, player, game_id, commitment, proof) -> Result

// Reveal move + nonce (contract verifies against commitment)
fn reveal_move(env, player, game_id, move, nonce) -> Result

// Resolve after both reveal (or forfeit after timeout)
fn resolve_game(env, game_id) -> Result<(payout1, payout2)>

// Claim forfeit if opponent didn't reveal
fn claim_forfeit(env, game_id) -> Result

// Update reputation Merkle tree (called during resolve)
fn update_reputation(env, player, new_leaf, merkle_proof) -> Result

// Verify a reputation ZK proof
fn verify_reputation(env, player, proof, public_cooperation_rate) -> bool
```

### XLM Transfers (fixing the critical gap)

The current contracts don't transfer XLM. The new `zk_dilemma` contract will:

1. **On `create_game`**: Transfer stake from player1 to contract escrow
2. **On `join_game`**: Transfer stake from player2 to contract escrow
3. **On `resolve_game`**: Transfer payouts to both players based on payoff matrix
4. **On `claim_forfeit`**: Transfer full escrow to the revealing player

Uses `token::Client` from the Soroban SDK for native XLM (Stellar asset contract).

---

## Bug Fixes (Integrated into ZK Refactor)

The following issues from the code review are addressed as part of the ZK restructure:

### Critical Fixes

1. **Implement actual XLM transfers** — The new `zk_dilemma` contract handles escrow and payout transfers using `token::Client`. No more TODO.

2. **Fix Tit-for-Tat** — TFT requires move history. The new contract stores move history per game, and TFT logic mirrors the opponent's last move. For iterated games (future scope), per-player history enables true TFT.

3. **Consolidate duplicate implementations** — Delete `PrisonersDilemma.tsx` and `useGameState.ts`. The `GameSlide.tsx` becomes the tutorial-only component. All real games go through the new `useZKGame` hook.

4. **Unify payoff values** — Single source of truth in the `zk_dilemma` contract: CC=2x, CD=0/3x, DC=3x/0, DD=0. Frontend reads from contract result, not local calculation.

5. **Wire up `strategies.ts`** — Either integrate the 9 strategies into the ZK game (for AI opponents in tutorial mode) or remove as dead code. Plan: integrate for tutorial mode, remove for ZK multiplayer (which is human-vs-human).

6. **Fix `txHash` placeholders** — Use actual transaction hashes from `signAndSend` response.

### Architecture Fixes

7. **Fix wallet polling** — Reduce from 1s to 5s. Don't call `getAddress()` on every poll (only on initial connect and explicit reconnect). Use stored address from localStorage.

8. **Fix Howl instantiation** — Move `new Howl()` calls into `useMemo` or `useRef` hooks. The `AudioManager` singleton pattern is correct; the direct Howl calls in `PrisonersDilemma.tsx` and `TournamentSlide.tsx` are the problem (and those files are being deleted).

9. **Add error boundaries** — Wrap the app in React Error Boundaries with fallback UI. Especially important for ZK proof generation failures.

10. **Remove dead code** — `LLMOpponent.ts` (never used), `GuessTheNumber.tsx` (scaffold demo), unused contracts (`fungible-allowlist`, `nft-enumerable`), `useSubscription.ts` (no events to subscribe to yet).

### Code Quality Fixes

11. **Extract inline styles** — Create CSS modules for each component. The `slides.css` file is a start; extend the pattern.

12. **Add responsive design** — Media queries for mobile/tablet. Critical for a hackathon demo that judges might view on various devices.

13. **Remove `as any` casts** — Type the `connectWallet` response properly.

14. **Fix `eslint-disable` comments** — Address the exhaustive-deps warnings in `WalletProvider` and `Debugger` properly rather than suppressing.

---

## Current Status: ✅ Phase 1 Complete, Phase 2 Complete (Core Done)

### Phase 1: Foundation — Complete ✅

1. ✅ **Dead code deleted** — `PrisonersDilemma.tsx`, `useGameState.ts`, `GuessTheNumber.tsx`, `LLMOpponent.ts`, unused contracts removed
2. ✅ **Error boundaries added** — `ErrorBoundary.tsx` wraps the app
3. ✅ **Noir circuit written** — Move commitment circuit at `circuits/move_commitment/` using `pedersen_hash`
4. ✅ **`zk_dilemma` contract built** — Complete contract with:
   - `create_game` (commit + proof verification via keccak256)
   - `join_game` (commit + proof verification)
   - `reveal_move` (keccak256 hash verification)
   - `resolve_game` (payoff calculation + XLM transfers)
   - `claim_forfeit` (timeout-based escrow return)
5. ✅ **Rust tests written** — 8 tests covering game logic, commitment verification, payoff calculation, error cases
6. ✅ **Noir circuit compiles** — Generates `move_commitment.json`

### Phase 2: Core ZK Multiplayer — Complete ✅

1. ✅ **`reveal_move` implemented** — Verifies keccak256(move || nonce || game_id) against stored commitment
2. ✅ **`resolve_game` implemented** — Payoff calculation with payout matrix (CC=2×, CD=0/3×, DC=3×/0, DD=0) + XLM escrow transfers
3. ✅ **`claim_forfeit` implemented** — Full escrow (2× stake) to the player who revealed before deadline
4. ✅ **Frontend built:**
   - `GameLobby` — Create/join games, list active and open games
   - `CommitMove` — Move selection (Cooperate/Defect), stake input, keccak256 commitment generation, proof generation
   - `RevealMove` — Reveal with nonce auto-fill from sessionStorage, deadline timer, forfeit info
   - `GameResult` — Outcome display, resolve/forfeit actions, payout visualization
5. ✅ **`useZKDilemma` hook wired** — Full lifecycle: fetch games, create, join, reveal, resolve, claim forfeit
6. ✅ **WASM compiled** — `zk_dilemma.wasm` (11KB) built for `wasm32v1-none` target
7. ✅ **TypeScript bindings generated** — Auto-generated typed `Client` at `src/contracts/zk_dilemma/`
8. ✅ **TypeScript typechecks pass** — `npx tsc --noEmit` clean
9. ✅ **Pre-commit hook added** — `secretlint` (secrets scanning) + `lint-staged` (ESLint + Prettier)

### Phase 3: Reputation System (Days 7-9)

**Goal:** ZK reputation proofs over game history — Not yet started

### Phase 4: Polish & Submit (Days 10-12)

**Goal:** Hackathon-ready submission — Partially done

1. ✅ README updated with ZK explanation and project structure
2. ⬜ Record 2-3 minute demo video
3. ⬜ Final testnet testing of complete flow
4. ⬜ Deploy final contracts to testnet

---

## Submission Checklist

- [ ] Open-source repo with full source code
- [ ] Clear README.md explaining what was built, how ZK is used, and what's unfinished
- [ ] 2-3 minute demo video showing ZK multiplayer game + reputation proof
- [ ] ZK is load-bearing: Noir proofs verify move validity on-chain, reputation proofs verify private history
- [ ] Stellar integration: Soroban contract verifies proofs using Protocol 25/26 host functions
- [ ] Contracts deployed on testnet with real addresses
- [ ] Honest about mock data or unfinished features in README

---

## Risk Assessment

| Risk | Likelihood | Impact | Mitigation |
|---|---|---|---|
| Noir proof verification too expensive on-chain | Medium | High | Start with simple circuit (1 constraint). Benchmark gas cost early in Phase 1. Fall back to Circom/Groth16 if UltraHonk is too costly. |
| `noir_js_wasm` browser integration issues | Medium | High | Test WASM proof generation in browser early. Fallback: generate proofs server-side via a lightweight API. |
| UltraHonk verifier contract bugs | Low | Critical | Use the existing yugocabrio/rs-soroban-ultrahonk verifier. Write thorough contract tests. |
| XLM transfer complexity in Soroban | Low | Medium | Use established `token::Client` pattern. Reference existing Soroban token examples. |
| Scope creep on reputation system | Medium | Low | Reputation is bonus. If Phase 2 runs long, ship without it and note in README. |
| Frontend WASM bundle size | Low | Low | Noir WASM is ~2MB. Acceptable for a dApp. Lazy-load if needed. |

---

## Key Resources

- [Noir Docs](https://noir-lang.org/docs/)
- [Noir Stellar Verifier (UltraHonk)](https://github.com/yugocabrio/rs-soroban-ultrahonk)
- [Noir on Stellar E2E Tutorial](https://jamesbachini.com/noir-on-stellar/)
- [Stellar Protocol 25 Host Functions](https://developers.stellar.org/docs/learn/fundamentals/protocol-25)
- [Stellar Protocol 26 Host Functions](https://developers.stellar.org/docs/learn/fundamentals/protocol-26)
- [Soroban Smart Contracts](https://developers.stellar.org/docs/build/smart-contracts)
- [Stellar Wallets Kit](https://github.com/Creit-Tech/Stellar-Wallets-Kit)
- [Poseidon2 Hashing](https://eprint.iacr.org/2023/323)
