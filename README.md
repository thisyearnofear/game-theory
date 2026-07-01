# Game Theory on Stellar — ZK Trust

A dApp bringing game theory to life on the Stellar network, inspired by Nicky Case's ["The Evolution of Trust"](https://github.com/ncase/trust). Experience the Prisoner's Dilemma with real XLM stakes and **zero-knowledge proofs** for fair multiplayer play, making cooperation and defection decisions truly impactful.

_Built with Scaffold Stellar for the Stellar Hackathon._

- ⚡️ Vite + React + TypeScript
- 🔗 Real XLM integration on Stellar testnet
- 🎮 ZK-powered multiplayer Prisoner's Dilemma
- 🔐 Keccak256 commitment-based reveal with on-chain verification
- 🛡️ Pre-commit hooks with secrets scanning + linting

## 🚀 Live Demo

**Single-Player Contract (Testnet):** `CB47IPOHTEZ62KC32JWANALO6FEKSAMXMMMZQGK7GEM5P45M2SQZCXQY`

**ZK Multiplayer Contract (Testnet):** Coming soon after deployment

## Requirements

- [Node.js](https://nodejs.org/en/download/package-manager) (v22, or higher)
- [npm](https://www.npmjs.com/): Comes with the node installer
- [Rust](https://rustup.rs/) + `stable` toolchain (for contract development)
- Stellar wallet with testnet XLM for playing

## Quick Start

```bash
git clone <repository-url>
cd game-theory
npm install
npm run dev
```

Open http://localhost:5173, connect your Stellar wallet, and play!

## How It Works

### 🧠 Single Player (AI)

Fast, instant gameplay against algorithmic AI opponents with real XLM stakes:
- **Instant Resolution** — one transaction completes the entire game
- **AI Strategies:** Random, Cooperator, Defector, Tit-for-Tat

### 🔐 ZK Multiplayer (New!)

Play against other humans with **zero-knowledge commitment**:

1. **Commit Phase** — Each player selects a move (C/D) and generates a random nonce. The contract receives a **keccak256 commitment** hash + ZK proof, proving the commitment is to a valid move without revealing which one.
2. **Reveal Phase** — After both players commit, each reveals their move + nonce. The contract verifies `keccak256(move || nonce || game_id)` matches the commitment.
3. **Resolve Phase** — Payouts are calculated and XLM is transferred from escrow. If a player doesn't reveal in time, the opponent can claim forfeit.

**Smart Contract:** `contracts/zk_dilemma/` — Soroban contract with proper auth, XLM escrow, keccak256 hash verification, and timeout-based forfeit logic.

### Payoff Matrix (× stake multiplier)

| Your Move | They Cooperate | They Defect |
|-----------|---------------|-------------|
| **Cooperate** | Both: 2× (Reward) | You: 0, Them: 3× (Sucker) |
| **Defect** | You: 3×, Them: 0 (Temptation) | Both: 0 (Punishment) |

## Project Structure

```
game-theory/
├── circuits/                       # Noir ZK circuits
│   └── move_commitment/           # Move commitment circuit
├── contracts/
│   ├── zk_dilemma/                # ZK multiplayer contract (Rust + Soroban)
│   ├── single-player-dilemma/     # Single-player AI contract
│   └── prisoners-dilemma/         # P2P reference implementation
├── src/                            # Frontend (React + TypeScript)
│   ├── components/
│   │   ├── zk/                    # ZK multiplayer UI (GameLobby, CommitMove, RevealMove, GameResult)
│   │   ├── slides/                # Educational slide system
│   │   ├── ai/                    # AI integration
│   │   └── ErrorBoundary.tsx      # Error boundary
│   ├── contracts/
│   │   ├── zk_dilemma/            # Generated TS client bindings
│   │   └── util.ts                # Network config
│   ├── hooks/
│   │   ├── useZKDilemma.ts        # ZK game hook (typed client)
│   │   ├── useSinglePlayerGame.ts # Single-player hook
│   │   └── ...
│   ├── pages/
│   │   ├── ZKGamePage.tsx         # /play route - ZK game lobby + game view
│   │   ├── Home.tsx               # Tutorial / landing
│   │   └── Debugger.tsx           # Contract debugger
│   └── services/
│       └── noirProofService.ts    # Keccak256 commitment + proof generation
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
stellar contract deploy \
  --wasm target/wasm32v1-none/release/zk_dilemma.wasm \
  --source testnet-user \
  --network testnet \
  -- --admin <YOUR_TESTNET_ADDRESS>
```

Set `VITE_ZK_DILEMMA_CONTRACT_ID` in `.env` to the deployed address.

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

Adapts Nicky Case's ["The Evolution of Trust"](https://ncase.me/trust/) to blockchain, transforming theoretical game theory into experiential learning with real economic consequences and zero-knowledge privacy.

## License

Licensed under the Apache License, Version 2.0.
