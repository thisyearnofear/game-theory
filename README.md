# Trustfall — ZK Prisoner's Dilemma on Stellar

**[trustfall.xyz](https://trustfall.xyz)**

A zero-knowledge Prisoner's Dilemma on Stellar. Commit moves with ZK proofs — trust is proven, not promised. Inspired by Nicky Case's ["The Evolution of Trust"](https://github.com/ncase/trust), now with real XLM stakes and cryptographic fairness.

_Built with Scaffold Stellar for the Stellar Hackathon._

- ⚡️ Vite + React + TypeScript
- 🔗 Real XLM integration on Stellar testnet
- 🎮 ZK-powered multiplayer Prisoner's Dilemma
- 🔐 Keccak256 commitment-based reveal with on-chain verification
- 🛡️ Pre-commit hooks with secrets scanning + linting

## 🚀 Live Demo

**ZK Multiplayer Contract (Testnet):** `CBGH6QAUEZSYRG3GJZKCUX6ELK7GJZDQ7JN3NBXMZNGEHDZGPLMOI5NS`

> **Note:** The contract WASM has been updated with recovery functions (`cancel_game`, `claim_refund`) and events. Redeployment is pending — the currently deployed version does not yet include these additions.

The ZK contract is deployed and initialized with the Noir UltraHonk verification key. Real ZK proofs are generated client-side in the browser using `@noir-lang/noir_js` + `@aztec/bb.js` (lazy-loaded, only downloaded when needed) and verified on-chain by the `ultrahonk_soroban_verifier`.

## Requirements

- [Node.js](https://nodejs.org/en/download/package-manager) (v22, or higher)
- [npm](https://www.npmjs.com/): Comes with the node installer
- [Rust](https://rustup.rs/) + `stable` toolchain (for contract development)
- Stellar wallet with testnet XLM for playing

## Quick Start

```bash
git clone https://github.com/thisyearnofear/game-theory.git trustfall
cd trustfall
npm install
npm run dev
```

Open http://localhost:5173, connect your Stellar wallet, and play!

## How It Works

### 🧠 Tutorial (vs AI)

Learn the Prisoner's Dilemma with a local simulation — no wallet or contract needed:

- **Instant Gameplay** — local PD matrix calculation, no on-chain transaction
- **AI Strategies:** Random, Cooperator, Defector, Tit-for-Tat
- **AI Tutor Feedback** — contextual guidance via Venice AI

### 🔐 ZK Multiplayer

Play against other humans with **zero-knowledge commitment**:

1. **Commit Phase** — Each player selects a move (C/D) and generates a random nonce. The browser generates a **keccak256 commitment** hash and a **real UltraHonk ZK proof** (via `@noir-lang/noir_js` + `@aztec/bb.js`, lazy-loaded). The contract verifies the proof on-chain using the `ultrahonk_soroban_verifier`, guaranteeing the commitment is to a valid move (0 or 1) with a known preimage — without revealing which move.
2. **Reveal Phase** — After both players commit, each reveals their move + nonce. The contract verifies `keccak256(move || nonce || game_id)` matches the commitment.
3. **Resolve Phase** — Payouts are calculated and XLM is transferred from escrow. If a player doesn't reveal in time, the opponent can claim forfeit.
4. **Recovery** — If no opponent joins before the commit deadline, player1 can `cancel_game` to reclaim their stake. If both players timeout on reveal, anyone can `claim_refund` to split the escrow.

**Why ZK?** Without the proof, a player could commit to an arbitrary hash and grief the opponent by never revealing a valid move. The ZK proof makes the commitment **binding** at commit time: the contract knows the hash is over a valid move + known nonce + correct game*id, so the player \_can* reveal later. Proofs are not persisted on-chain (only the commitment is stored), keeping gas costs manageable.

**Smart Contract:** `contracts/zk_dilemma/` — Soroban contract with proper auth, XLM escrow, on-chain UltraHonk proof verification, keccak256 hash verification, timeout-based forfeit logic, recovery functions (cancel/refund), and contract events for off-chain indexing.

**Noir Circuit:** `circuits/move_commitment/` — Proves `keccak256(move || nonce || game_id) == commitment` where `move ∈ {0, 1}`. Uses the external `noir-lang/keccak256` library. Public inputs: `commitment_high`, `commitment_low` (two 128-bit Field elements for 32-byte alignment), `game_id`.

**Version Pinning:** The browser proof generation packages are pinned to match the local toolchain: `@noir-lang/noir_js@1.0.0-beta.9` and `@aztec/bb.js@0.87.0`. These must match `nargo` and `bb` versions used to compile the circuit. The proof is generated with `{ keccak: true }` (non-ZK keccak UltraHonk flavor) to match the on-chain verifier — do not use ZK-flavored proofs.

### Payoff Matrix (× stake multiplier)

| Your Move     | They Cooperate                | They Defect               |
| ------------- | ----------------------------- | ------------------------- |
| **Cooperate** | Both: 2× (Reward)             | You: 0, Them: 3× (Sucker) |
| **Defect**    | You: 3×, Them: 0 (Temptation) | Both: 0 (Punishment)      |

## Project Structure

```
trustfall/
├── circuits/                       # Noir ZK circuits
│   └── move_commitment/           # Move commitment circuit
├── contracts/
│   ├── zk_dilemma/                # ZK multiplayer contract (Rust + Soroban, recovery + events)
│   └── prisoners-dilemma/         # P2P reference implementation
├── src/                            # Frontend (React + TypeScript)
│   ├── components/
│   │   ├── zk/                    # ZK multiplayer UI (GameLobby, CommitMove, RevealMove, GameResult, OnboardingOverlay)
│   │   ├── slides/                # Educational slide system (local simulation tutorial)
│   │   ├── ai/                    # AI integration
│   │   └── ErrorBoundary.tsx      # Error boundary
│   ├── contracts/
│   │   ├── zk_dilemma/            # Generated TS client bindings
│   │   └── util.ts                # Network config
│   ├── hooks/
│   │   ├── useZKDilemma.ts        # ZK game hook (typed client, cancel/refund)
│   │   └── ...
│   ├── pages/
│   │   ├── ZKGamePage.tsx         # /play route - ZK game lobby + game view
│   │   ├── Home.tsx               # Tutorial / landing
│   │   └── Debugger.tsx           # Contract debugger
│   └── services/
│       └── noirProofService.ts    # Keccak256 commitment + proof generation (lazy-loaded)
├── .husky/pre-commit              # Pre-commit: secretlint + lint-staged
├── .secretlintrc.json             # Secrets scanning config
├── rust-toolchain.toml            # Rust toolchain (stable + wasm32v1-none)
└── package.json
```

## Development

### Building the Contract WASM

```bash
# Ensure rustup toolchain is on PATH for wasm builds
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
# 1. Build the WASM (ensure rustup toolchain is on PATH)
PATH="$HOME/.rustup/toolchains/stable-x86_64-apple-darwin/bin:$PATH" \
  stellar contract build

# 2. Deploy the contract
stellar contract deploy \
  --wasm target/wasm32v1-none/release/zk_dilemma.wasm \
  --source testnet-user \
  --network testnet

# 3. Initialize with the VK and native XLM SAC address
VK_HEX=$(xxd -p circuits/move_commitment/target/vk | tr -d '\n')
XLM_SAC="CDLZFC3SYJYDZT7K67VZ75HPJVIEUVNIXF47ZG2FB2RMQQVU2HHGCYSC"

stellar contract invoke \
  --id <DEPLOYED_CONTRACT_ID> \
  --source testnet-user \
  --network testnet \
  -- initialize --vk_bytes "$VK_HEX" --xlm_token "$XLM_SAC"
```

Set `VITE_ZK_DILEMMA_CONTRACT_ID` in `.env` to the deployed contract ID.

### Frontend

```bash
npm run dev       # Start dev server
npm run build     # Production build
npm run lint      # ESLint
npm run format    # Prettier
```

### Testing

```bash
# Rust contract tests
cargo test -p zk-dilemma

# TypeScript typecheck
npx tsc --noEmit
```

## Pre-commit Hooks

The project has a pre-commit hook (via Husky) that runs:

1. **`secretlint`** — Scans all staged files for secrets (API keys, tokens, passwords)
2. **`lint-staged`** — Runs ESLint auto-fix + Prettier formatting on staged files

## Inspiration

Trustfall adapts Nicky Case's ["The Evolution of Trust"](https://ncase.me/trust/) to blockchain, transforming theoretical game theory into experiential learning with real economic consequences and zero-knowledge privacy.

## Links

- **Website:** [trustfall.xyz](https://trustfall.xyz)
- **Source:** [github.com/thisyearnofear/game-theory](https://github.com/thisyearnofear/game-theory)

## License

Licensed under the Apache License, Version 2.0.
