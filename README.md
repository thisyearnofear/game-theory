# Trustfall — ZK Prisoner's Dilemma on Stellar

**[trustfall.xyz](https://trustfall.xyz)**

A zero-knowledge Prisoner's Dilemma on Stellar. Commit moves with ZK proofs — trust is proven, not promised. Inspired by Nicky Case's ["The Evolution of Trust"](https://github.com/ncase/trust), now with real XLM stakes and cryptographic fairness.

_Built with Scaffold Stellar for the Stellar Hackathon._

- ⚡️ Vite + React + TypeScript
- 🔗 Real XLM integration on Stellar testnet
- 🎮 ZK-powered multiplayer Prisoner's Dilemma
- 🏟️ Multi-round matches — best-of-3/5 with rematch support
- 🔐 Keccak256 commitment-based reveal with on-chain verification
- 🧠 9 stateful iterated strategies (TFT, Grudge, Pavlov, Prober, and more)
- 🏆 Evolutionary tournament mode — watch trust evolve over generations
- 🎛️ Configurable payoff matrix with 5 preset scenarios
- 💨 Noise simulation — "the wind caught you"
- 📊 Persistent stats, game history, and achievement system
- 🛡️ Pre-commit hooks with secrets scanning + linting

## 🚀 Live Demo

**ZK Multiplayer Contract (Testnet):** `CCJ6NWQDC7BAV2A6CU2D3D47F4MLGHRJMPANFLTQQMTZCHB4RVEDELQ7`

> **Note:** The contract was previously deployed but has been pruned by Soroban's testnet ledger retention window. The WASM is built and ready for redeployment. See [Deploying to Testnet](#deploying-to-testnet) below.

The ZK contract includes single-round games and multi-round matches (best-of-3/5). Real ZK proofs are generated client-side in the browser using `@noir-lang/noir_js` + `@aztec/bb.js` (lazy-loaded, only downloaded when needed) and verified on-chain by the `ultrahonk_soroban_verifier`.

## Requirements

- [Node.js](https://nodejs.org/en/download/package-manager) (v22, or higher)
- [npm](https://www.npmjs.com/): Comes with the node installer
- [Rust](https://rustup.rs/) + `stable` toolchain (for contract development)
- Stellar wallet with testnet XLM for playing

## Quick Start

```bash
git clone https://github.com/thisyearnofear/trustfall.git
cd trustfall
npm install
npm run dev
```

Open http://localhost:5173, connect your Stellar wallet, and play!

## How It Works

Trustfall has three game modes, accessible from the main game screen:

### 🧠 Tutorial (vs AI) — Iterated Prisoner's Dilemma

Learn the Prisoner's Dilemma with a local simulation — no wallet or contract needed. Play multiple rounds against stateful AI strategies that remember your past moves:

- **9 Stateful Strategies:**
  - 🤝 **Tit-for-Tat** — cooperates first, then copies your last move
  - 🤝🤝 **Tit-for-Two-Tat** — forgives one betrayal, retaliates after two
  - 😡 **Grudge** — cooperates until you betray once, then defects forever
  - 🔄 **Pavlov** — win-stay, lose-shift: keeps doing what worked
  - 🔍 **Prober** — tests you with C-D-C-C, then exploits or plays TFT
  - 💖 **Generous TFT** — like TFT but forgives 10% of defections
  - 😇 **Always Cooperate** — unconditional trust
  - 😈 **Always Defect** — zero trust
  - 🎲 **Random** — 50/50 coin flip every round
- **Move History Table** — every round recorded with cumulative scores
- **Trust Altitude** — grows with consecutive mutual cooperation, resets on betrayal
- **Noise Slider** — "the wind caught you" — random move flips (0-50%). Watch TFT get stuck in retaliation loops, then switch to TF2T and watch it recover
- **Payoff Matrix Editor** — tweak P/S/R/T values with 5 presets (Classic PD, Stag Hunt, Harmony, Snowdrift, High Temptation). See how changing the game changes which strategy wins
- **Strategy Inspector** — click "Inspect [strategy name]" to see how it thinks: decision logic, first move, strengths, weaknesses, and a concrete round-by-round example
- **AI Tutor Feedback** — contextual guidance via Venice AI after each round

### 🏆 Tournament Mode — Evolution of Trust

Watch trust evolve over generations. All 9 strategies compete in a round-robin tournament, the weak are eliminated, the strong reproduce — matching Nicky Case's "Evolution of Trust" architecture:

- **Round-Robin Simulation** — every strategy plays every other strategy for N rounds
- **Evolution** — bottom strategies eliminated, top strategies reproduce
- **Population Bar Chart** — each strategy shown as a colored bar, width = population count
- **Auto-Play** — runs play → evolve → play loop automatically
- **Population-Over-Generations Chart** — stacked visualization of population composition across all generations
- **Winner Detection** — victory banner when one strategy reaches 80% of population
- **Configurable Parameters:**
  - 💨 **Noise** (0-50%) — "the wind caught you" — watch TFT die and TF2T/Generous TFT take over
  - 🔁 **Rounds per match** (3-30) — how many rounds each pair plays
  - ⚖️ **Selection pressure** (1-8) — how many to eliminate/reproduce per generation
  - 🎛️ **Payoff matrix** — 5 presets + custom P/S/R/T editing

**Try this:** Set noise to 10% and run auto-play. Watch strict Tit-for-Tat get stuck in retaliation loops and die out, while Generous TFT and TF2T thrive because they can forgive noise-induced mistakes.

### 🔐 ZK Multiplayer

Play against other humans with **zero-knowledge commitment**:

1. **Commit Phase** — Each player selects a move (C/D) and generates a random nonce. The browser generates a **keccak256 commitment** hash and a **real UltraHonk ZK proof** (via `@noir-lang/noir_js` + `@aztec/bb.js`, lazy-loaded). The contract verifies the proof on-chain using the `ultrahonk_soroban_verifier`, guaranteeing the commitment is to a valid move (0 or 1) with a known preimage — without revealing which move.
2. **Reveal Phase** — After both players commit, each reveals their move + nonce. The contract verifies `keccak256(move || nonce || game_id)` matches the commitment.
3. **Resolve Phase** — Payouts are calculated and XLM is transferred from escrow. If a player doesn't reveal in time, the opponent can claim forfeit.
4. **Recovery** — If no opponent joins before the commit deadline, player1 can `cancel_game` to reclaim their stake. If both players timeout on reveal, anyone can `claim_refund` to split the escrow.

**Two game modes:**

- **Single Round** — One-shot Prisoner's Dilemma with XLM stakes
- **Multi-Round Match** — Best-of-3 or best-of-5 series. The contract tracks round wins, ties, and automatically transitions between rounds. After a match completes, either player can call `rematch` to start a new match with the same opponent and settings.

**Game Design Features:**

- **Stake Presets** — 1 XLM, 5 XLM (recommended), 10 XLM, or custom
- **Persistent Stats** — Win/loss/tie record, net XLM, cooperation rate, game history (localStorage)
- **Achievement System** — Unlock badges (first catch, first betrayal, tournament winner, ZK player, ZK winner, etc.) with toast notifications
- **Lobby Feedback** — Pulsing waiting indicator, copy game link, opponent-joined notification with sound
- **Stake Filtering** — Filter open games by stake range (≤1, 1-5, 5+ XLM)
- **Play Again** — Quick rematch button after game resolution

**Why ZK?** Without the proof, a player could commit to an arbitrary hash and grief the opponent by never revealing a valid move. The ZK proof makes the commitment **binding** at commit time: the contract knows the hash is over a valid move + known nonce + correct game*id, so the player \_can* reveal later. Proofs are not persisted on-chain (only the commitment is stored), keeping gas costs manageable.

**Smart Contract:** `contracts/zk_dilemma/` — Soroban contract with proper auth, XLM escrow, on-chain UltraHonk proof verification, keccak256 hash verification, timeout-based forfeit logic, recovery functions (cancel/refund), multi-round match support (best-of-3/5 with rematch), and contract events for off-chain indexing. 15/15 Rust tests passing.

**Noir Circuit:** `circuits/move_commitment/` — Proves `keccak256(move || nonce || game_id) == commitment` where `move ∈ {0, 1}`. Uses the external `noir-lang/keccak256` library. Public inputs: `commitment_high`, `commitment_low` (two 128-bit Field elements for 32-byte alignment), `game_id`.

**Version Pinning:** The browser proof generation packages are pinned to match the local toolchain: `@noir-lang/noir_js@1.0.0-beta.9` and `@aztec/bb.js@0.87.0`. These must match `nargo` and `bb` versions used to compile the circuit. The proof is generated with `{ keccak: true }` (non-ZK keccak UltraHonk flavor) to match the on-chain verifier — do not use ZK-flavored proofs.

### Payoff Matrix (× stake multiplier, configurable in Tutorial & Tournament)

| Your Move     | They Cooperate                 | They Defect                |
| ------------- | ------------------------------ | -------------------------- |
| **Cooperate** | Both: R× (Reward)              | You: S×, Them: T× (Sucker) |
| **Defect**    | You: T×, Them: S× (Temptation) | Both: P× (Punishment)      |

**Default (Classic PD):** T=3, R=2, P=0, S=-1. The payoff matrix is editable in both Tutorial and Tournament modes — try Stag Hunt (T=2, R=3, P=1, S=0) to see how less temptation changes the dynamics, or High Temptation (T=10) to watch Always Defect dominate.

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
│   │   ├── zk/                    # ZK multiplayer UI
│   │   │   ├── GameLobby.tsx      # Lobby with stats, history, stake filters
│   │   │   ├── CommitMove.tsx     # Single-round commit with stake presets
│   │   │   ├── RevealMove.tsx     # Reveal phase with deadline countdown
│   │   │   ├── GameResult.tsx     # Result with Play Again, stats recording
│   │   │   ├── OnboardingOverlay.tsx # 3-step ZK tutorial
│   │   │   ├── StatsDisplay.tsx   # Persistent W/L/T stats panel
│   │   │   ├── MatchSetup.tsx     # Best-of-3/5 selector with stake presets
│   │   │   ├── MatchScoreboard.tsx # Visual win tally, round counter, winner banner
│   │   │   └── MatchCommitMove.tsx # Commit flow for match phases
│   │   ├── ui/                    # Shared UI components
│   │   │   ├── ElectricButton.tsx # Magnetic button with electric arc effect
│   │   │   ├── ShimmerButton.tsx  # Shimmer sweep button
│   │   │   ├── StaggerButton.tsx  # Stagger animation button
│   │   │   ├── AchievementBadge.tsx # Achievement system + unlock logic
│   │   │   ├── AchievementToast.tsx # Toast notification for unlocked achievements
│   │   │   └── ShareableResult.tsx # Shareable result card
│   │   ├── slides/                # Game modes + educational slides
│   │   │   ├── GameSlide.tsx      # Main game screen (3 modes: Tutorial, Tournament, Multiplayer)
│   │   │   ├── TournamentMode.tsx # Evolutionary tournament simulation UI
│   │   │   ├── PayoffMatrixEditor.tsx # Configurable P/S/R/T with presets
│   │   │   ├── StrategyInspector.tsx  # Plain-English strategy logic explanations
│   │   │   └── IntroSlide.tsx     # Landing / intro slide
│   │   ├── ai/                    # AI integration (Venice AI, personas)
│   │   └── ErrorBoundary.tsx      # Error boundary
│   ├── contracts/
│   │   ├── zk_dilemma/            # Generated TS client bindings (single-round + match functions)
│   │   └── util.ts                # Network config
│   ├── hooks/
│   │   ├── useZKDilemma.ts        # ZK game + match hook (typed client, all contract functions)
│   │   ├── useGameStats.ts        # Persistent game stats + history (localStorage)
│   │   └── ...
│   ├── pages/
│   │   ├── ZKGamePage.tsx         # /play route - lobby, single-round, matches, results
│   │   ├── Home.tsx               # Tutorial / landing
│   │   └── Debugger.tsx           # Contract debugger
│   ├── util/
│   │   ├── strategies.ts          # 9 stateful iterated strategies + payoff matrix
│   │   └── tournament.ts          # Tournament simulation engine (round-robin + evolution)
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
# Rust contract tests (15 tests: 7 single-round + 8 multi-round match)
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
- **Source:** [github.com/thisyearnofear/trustfall](https://github.com/thisyearnofear/trustfall)

## License

Licensed under the Apache License, Version 2.0.
