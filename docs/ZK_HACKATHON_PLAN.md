# Trustfall — Two Real-World ZK Patterns on Stellar

## Hackathon: Stellar Hacks - Real-World ZK

**Project Name:** Trustfall

**Website:** [trustfall.xyz](https://trustfall.xyz)

**One-liner:** Two distinct ZK proof patterns verified on-chain in Soroban — private accreditation (Poseidon Merkle tree membership) and commitment binding (keccak256 + UltraHonk) — demonstrated through a trust-fall game with real XLM stakes.

---

## The Two ZK Patterns

### Pattern 1: Private Accreditation (ZK Allowlist Membership)

**Real-world use case:** KYC/AML compliance, accredited investor verification, compliance-gated access to tokenized assets. Prove you're on an allowlist without revealing which credential is yours.

**How it works:**

1. Admin publishes a Poseidon Merkle root of accredited credentials on-chain
2. Player generates a ZK proof that their credential is in the tree, plus a nullifier `poseidon(credential_id, game_id)`
3. Contract verifies the proof, checks the root, records the nullifier
4. The contract learns only "this person is accredited" — not which credential they hold

**Circuit:** `circuits/allowlist_membership/` — Poseidon Merkle tree membership (depth-4, 16 leaves) with nullifier. Uses `noir-lang/poseidon` (BN254 `hash_1` for leaves, `hash_2` for internal nodes). Public inputs: `merkle_root`, `nullifier`, `game_id`. Private inputs: `credential_id`, `merkle_path`, `path_indices`.

**Why Poseidon?** ZK-friendly hashing produces smaller circuits than keccak256. Stellar Protocol 25 ("X-Ray") introduced native Poseidon host functions, making on-chain Poseidon operations affordable.

**Contract functions:** `initialize_accreditation`, `update_accredited_root`, `verify_accreditation`, `is_accreditation_initialized`, `get_accredited_root` — with separate VK storage, root matching, nullifier replay prevention, and event emission.

**Tests (4):** real proof verification, wrong root rejection, nullifier replay rejection, uninitialized rejection.

**Known limitation:** Nullifiers pre-computed for `game_id=0` only. Frontend needs JS Poseidon for other game_ids. The ZK proof itself works for any game_id.

### Pattern 2: Move Commitment Binding

**Real-world use case:** Any commit-reveal scheme where early validation prevents griefing — sealed-bid auctions, fair escrow, wagering. Prove a hash commitment is to a valid value at commit time, before the counterparty locks their funds.

**How it works:**

1. Player selects a move (C/D) and generates a random nonce
2. Browser computes `keccak256(move || nonce || game_id)` and generates an UltraHonk ZK proof
3. Contract verifies the proof on-chain — the commitment is to a valid move (0 or 1) with a known preimage
4. After both commit, players reveal; contract verifies the hash matches

**Circuit:** `circuits/move_commitment/` — Proves `keccak256(move || nonce || game_id) == commitment` where `move ∈ {0, 1}`. Uses `noir-lang/keccak256`. Public inputs: `commitment_high`, `commitment_low`, `game_id`.

**Why ZK over plain hash commitment?** A plain hash hides the move and is binding at reveal time. But a player can commit to garbage with no valid preimage, forcing the opponent to wait for the forfeit deadline. The ZK proof makes the commitment binding at commit time — garbage is rejected immediately, before the opponent locks their stake.

**Contract functions:** `create_game`, `join_game`, `reveal_move`, `resolve_game`, `claim_forfeit`, `cancel_game`, `claim_refund`, plus multi-round match functions (`create_match`, `join_match`, `start_next_round`, `rematch`, `cancel_match`).

**Tests (15):** 7 single-round (real proof verification, fake proof rejection, wrong-length rejection, zero-stake rejection, payout calculation, cancel after deadline, refund on both timeout, self-join prevention) + 8 multi-round match (create match, invalid best-of, full best-of-3, completed after two wins, cancel after timeout, forfeit awards round).

---

## Why ZK Is Load-Bearing (Not Namechecked)

Both ZK patterns do real work:

- **Accreditation:** Without ZK, the contract would need to store the full allowlist on-chain (gas-expensive, privacy-destroying) or trust an off-chain oracle. The ZK proof lets the contract verify membership without seeing the list.
- **Commitment binding:** Without ZK, a player can commit to garbage and grief the opponent. The ZK proof rejects invalid commitments at commit time, before stakes are locked.

Removing either ZK pattern breaks the corresponding feature. This is not ZK-for-ZK's-sake.

---

## Stellar Integration

Both patterns use Stellar's native cryptographic primitives:

- **BN254 elliptic curve operations** (Protocol 25 "X-Ray" + Protocol 26 "Yardstick") — 9 additional host functions for multi-scalar multiplication, scalar-field arithmetic, and curve-membership checks. Used for UltraHonk proof verification.
- **Poseidon/Poseidon2 hashing** (Protocol 25) — ZK-friendly hashing used in the accreditation Merkle tree.
- **keccak256** — used for move commitments, verified via host function.
- **Native XLM (Stellar Asset Contract)** — real escrow with stake transfers.

Proofs are generated off-chain in the browser using Noir + bb.js (WASM, lazy-loaded) and verified on-chain by the `ultrahonk_soroban_verifier` (NethermindEth).

**Deployed on testnet:** `CA6PHYHU6OCKSW2KMSWQNBZ4DNUKUWGWNQDFJIHNS22WOT45F6WQTMG5` (2026-07-03)

---

## What Was Built

### ZK Layer

1. **Two Noir circuits** — move commitment (keccak256) and allowlist membership (Poseidon Merkle tree)
2. **Browser proof generation** — `@noir-lang/noir_js@1.0.0-beta.9` + `@aztec/bb.js@0.87.0`, lazy-loaded, pinned to match toolchain
3. **On-chain verification** — `ultrahonk_soroban_verifier` with BN254 host functions, two separate VKs

### Smart Contract

4. **Soroban contract** — both ZK patterns, XLM escrow, timeout-based forfeit, recovery functions, multi-round matches (best-of-3/5 with rematch), nullifier tracking, contract events. 19/19 tests passing.
5. **Deployed on testnet** — real contract address, verified game/match counts

### Frontend

6. **React + TypeScript** — game lobby, commit/reveal flow, match scoreboard, accreditation panel, stats, achievements
7. **Educational sandbox** — 9 stateful AI strategies, evolutionary tournament mode, noise simulation, payoff matrix editor, strategy inspector (inspired by Nicky Case's "Evolution of Trust")
8. **Thematic UI** — trust fall metaphor throughout, SVG mascot with reactive expressions, personality quiz onboarding

### Tests

9. **19/19 Rust tests** — 7 single-round + 8 multi-round match + 4 accreditation
10. **TypeScript clean** — typecheck passes
11. **ESLint clean** — no errors
12. **Vite build succeeds** — production build deploys to Cloudflare Pages

---

## What's Not Built (Honest Gaps)

1. **Reputation proofs** — original plan included ZK reputation proofs ("I've cooperated in N% of games"). Not implemented. Future work.
2. **End-to-end browser test** — cryptographic path (bb.js → on-chain verifier) is cross-verified in Rust tests, but full two-wallet browser session not tested.
3. **Accreditation demo tree is pre-computed** — 3 credentials with hardcoded Merkle paths. Production system would build tree off-chain and distribute paths privately.
4. **Nullifiers only for game_id=0** — frontend needs JS Poseidon for other game_ids. Circuit handles any game_id.
5. **No proof generation timeout** — if bb.js WASM fails to load, UI hangs.
6. **Polling, not websockets** — frontend polls every 5 seconds. No event subscription or batching.

---

## Technical Stack

### ZK

- **Circuits:** Noir (`circuits/move_commitment/`, `circuits/allowlist_membership/`)
- **Prover:** `@aztec/bb.js@0.87.0` (browser WASM), `bb` CLI (testing)
- **Verifier:** `ultrahonk_soroban_verifier` (NethermindEth)
- **Proof size:** 14,592 bytes (move commitment)

### Contract

- `soroban-sdk` 26.x with `alloc` feature
- BN254 host functions (Protocol 25/26)
- Poseidon host functions (Protocol 25)
- `env.crypto().keccak256()` host function
- Native XLM SAC for escrow

### Frontend

- Vite + React + TypeScript
- `@noir-lang/noir_js@1.0.0-beta.9` (witness generation)
- `@aztec/bb.js@0.87.0` (UltraHonk proof generation, lazy-loaded)
- `@noble/hashes` (client-side keccak256)
- Stellar Wallets Kit

### Version Pinning

- `nargo 1.0.0-beta.9` → `@noir-lang/noir_js@1.0.0-beta.9`
- `bb v0.87.0` → `@aztec/bb.js@0.87.0`
- Proof generated with `{ keccak: true }` (non-ZK keccak UltraHonk flavor)

---

## Architecture

```
┌──────────────────────────────────────────────────────────────────┐
│                         Frontend (React)                           │
│                                                                    │
│  ┌──────────────┐  ┌──────────────┐  ┌─────────────────────────┐  │
│  │  Educational │  │  Tournament  │  │  ZK Multiplayer          │  │
│  │  Sandbox     │  │  Mode        │  │  (real XLM stakes)       │  │
│  │  (9 AI str.) │  │  (evolution) │  │  GameLobby + Accreditation│ │
│  └──────────────┘  └──────────────┘  └─────────────────────────┘  │
│                          │                                         │
│  ┌───────────────────────┼─────────────────────────────────────┐  │
│  │  noir_js + bb.js (WASM) Proof Generation                     │  │
│  │  - Move commitment proof (keccak256)                         │  │
│  │  - Accreditation proof (Poseidon Merkle tree)                │  │
│  └───────────────────────┼─────────────────────────────────────┘  │
└──────────────────────────┼────────────────────────────────────────┘
                           │
                    Stellar Wallet Kit
                           │
┌──────────────────────────┼────────────────────────────────────────┐
│                   Stellar Testnet                                   │
│                           │                                         │
│  ┌────────────────────────┼─────────────────────────────────────┐  │
│  │            zk_dilemma Contract                                  │  │
│  │                                                                  │  │
│  │  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────────┐  │  │
│  │  │ Move     │  │ Reveal & │  │ Escrow & │  │ Accreditation│  │  │
│  │  │ Commit   │  │ Resolve  │  │ Payout   │  │ Verification │  │  │
│  │  │ Verifier │  │ (keccak  │  │ (XLM SAC │  │ (Poseidon    │  │  │
│  │  │ (UltraHonk)│ │  hash)   │  │  xfers)  │  │  Merkle tree)│  │  │
│  │  └──────────┘  └──────────┘  └──────────┘  └──────────────┘  │  │
│  └────────────────────────────────────────────────────────────────┘  │
│                                                                      │
│  ┌────────────────────────────────────────────────────────────────┐ │
│  │    ultrahonk_soroban_verifier (NethermindEth)                   │ │
│  │  Verifies UltraHonk proofs using BN254 host functions           │ │
│  └────────────────────────────────────────────────────────────────┘ │
└──────────────────────────────────────────────────────────────────────┘
```

---

## Submission Checklist

- [x] Open-source repo with full source code
- [x] Clear README.md explaining what was built, how ZK is used, and what's unfinished
- [x] ZK is load-bearing: two distinct patterns, both doing real work
- [x] Stellar integration: Soroban contract verifies proofs using BN254 + Poseidon host functions
- [x] Contracts deployed on testnet (`CA6PHYHU6OCKSW2KMSWQNBZ4DNUKUWGWNQDFJIHNS22WOT45F6WQTMG5`)
- [x] Honest about mock data and unfinished features in README
- [x] 19/19 contract tests passing (7 single-round + 8 multi-round + 4 accreditation)
- [x] TypeScript clean, ESLint clean, Vite build succeeds
- [x] Live deployment at trustfall.xyz
- [ ] 2-3 minute demo video

---

## Key Resources

- [Noir Docs](https://noir-lang.org/docs/)
- [NethermindEth UltraHonk Soroban Verifier](https://github.com/NethermindEth/rs-soroban-ultrahonk)
- [Soroban Smart Contracts](https://developers.stellar.org/docs/build/smart-contracts)
- [Stellar Wallets Kit](https://github.com/Creit-Tech/Stellar-Wallets-Kit)
- [Stellar Protocol 25 Host Functions](https://developers.stellar.org/docs/learn/fundamentals/protocol-25)
- [Stellar Protocol 26 Host Functions](https://developers.stellar.org/docs/learn/fundamentals/protocol-26)
