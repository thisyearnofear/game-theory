# Game Theory on Stellar

A dApp bringing game theory to life on the Stellar network, inspired by Nicky Case's ["The Evolution of Trust"](https://github.com/ncase/trust). Experience the Prisoner's Dilemma with real XLM stakes, making cooperation and defection decisions truly impactful.

_Built with Scaffold Stellar for the Stellar Hackathon._

- ⚡️ Vite + React + TypeScript
- 🔗 Real XLM integration on Stellar testnet
- 🎮 Interactive Prisoner's Dilemma with stakes
- 🛠 Hot reload for frontend changes
- 🧪 Deployed on Stellar testnet
- 💰 Real financial consequences for game decisions

This project demonstrates innovative use of Scaffold Stellar to create educational and entertaining blockchain applications with economic incentives.

## 🚀 Live Demo

**Contract Address (Testnet):** `CBYVH4IX35LOTKMJF5234XAZ7HKB6CEU7KVJ3GD6AMB7WI57F3GOS4QE`

**Explorer:** [View on Stellar Expert](https://stellar.expert/explorer/testnet/contract/CBYVH4IX35LOTKMJF5234XAZ7HKB6CEU7KVJ3GD6AMB7WI57F3GOS4QE)

## Requirements

- [Node.js](https://nodejs.org/en/download/package-manager) (v22, or higher)
- [npm](https://www.npmjs.com/): Comes with the node installer
- Stellar wallet with testnet XLM for playing

## Quick Start

1. **Clone and install:**

```bash
git clone <repository-url>
cd game-theory
npm install
```

2. **Start the application:**

```bash
npm run dev
# or
npx vite
```

3. **Connect wallet and play:**
   - Open http://localhost:5173
   - Connect your Stellar wallet
   - Switch to testnet network
   - Fund your wallet with testnet XLM from [Stellar Laboratory](https://laboratory.stellar.org/#account-creator)
   - Stake XLM and play the Prisoner's Dilemma!

## How It Works

### The Prisoner's Dilemma with Real Stakes

Unlike traditional simulations, this dApp requires "skin in the game":

- **Stake XLM:** Players must stake real testnet XLM to participate
- **Choose Strategy:** Cooperate or Defect without knowing opponent's choice
- **Real Payoffs:** Outcomes directly affect your wallet balance

### Game Modes

#### 🤖 Single Player (Recommended)

**Fast, instant gameplay against AI opponents**

- **Instant Resolution:** One transaction completes the entire game
- **AI Strategies:**
  - Random: Makes unpredictable decisions
  - Cooperator: Always cooperates
  - Defector: Always defects
  - Tit-for-Tat: Mirrors your moves
- **Best For:** Learning game theory concepts, quick games, low gas fees
- **Smart Contract:** `CB47IPOHTEZ62KC32JWANALO6FEKSAMXMMMZQGK7GEM5P45M2SQZCXQY`

**Game Flow:**

1. Select your move (Cooperate/Defect)
2. Choose AI strategy
3. Stake XLM
4. Contract plays game and resolves in one transaction
5. Receive payouts instantly

#### 👥 Multiplayer (Coming Soon)

**Play against other human players with real stakes**

- Multi-transaction flow for human-vs-human gameplay
- Requires coordination between two players
- Full trust dynamics with real human strategy
- Smart Contract: `CDY3NB4ZS5DTF3CEAHNXTZ4QFJXZKHECE7HIAPMMDNNJW7CNDPG274TF`

### Payoff Matrix (in XLM)

| Your Move \ Opponent's Move | Cooperate                            | Defect                                    |
| --------------------------- | ------------------------------------ | ----------------------------------------- |
| **Cooperate**               | Both get 2 XLM (Reward)              | You: 0, Opponent: 3 XLM (Sucker's Payoff) |
| **Defect**                  | You: 3, Opponent: 0 XLM (Temptation) | Both get 0 XLM (Punishment)               |

## Project Structure

```
game-theory/                         # Game Theory on Stellar dApp
├── contracts/                       # Smart contracts (Rust)
│   ├── single-player-dilemma/       # Single-player AI contract (NEW)
│   │   ├── src/
│   │   │   ├── lib.rs              # Core contract logic
│   │   │   └── error.rs            # Error types
│   │   └── README.md               # Contract documentation
│   └── prisoners-dilemma/           # P2P reference implementation
├── packages/                        # Auto-generated TypeScript clients
│   ├── single_player_dilemma/       # Generated from single-player contract
│   └── prisoners_dilemma/           # Generated from P2P contract
├── src/                             # Frontend React application
│   ├── components/                  # React components
│   │   ├── ai/                     # AI integration (Venice + Algo)
│   │   ├── slides/                 # Educational slide system
│   │   └── PrisonersDilemma.tsx    # Game UI
│   ├── contracts/                   # Contract utilities
│   ├── hooks/                       # Custom React hooks
│   ├── pages/                       # App Pages
│   ├── util/                        # Helpers (strategies, wallet, etc)
│   ├── styles/                      # CSS styling
│   └── App.tsx                      # Main application
├── public/assets/                   # Visual assets and sounds
├── environments.toml                # Environment configurations
└── package.json                     # Frontend dependencies
```

## Key Features

### Multiple Game Modes

- **🤖 Single Player Mode** (Active)
  - Instant one-transaction games against AI
  - Minimal gas fees
  - Perfect for learning
  - Multiple AI difficulty levels (Cooperator, Defector, Random, Tit-for-Tat)

- **👥 Multiplayer Mode** (Coming Soon)
  - True P2P games with human opponents
  - Full trust dynamics
  - Real human strategy and psychology

### Real XLM Integration

- **Testnet Deployment:** Contracts deployed on Stellar testnet
- **Wallet Integration:** Stellar Wallet Kit for seamless transactions
- **Real Stakes:** Actual XLM transfers based on game outcomes
- **Instant Settlement:** Results recorded on blockchain immediately

### Immersive Design

- **Nicky Case Inspired:** Visual design inspired by "The Evolution of Trust"
- **FuturaHandwritten Font:** Authentic typography from original
- **Interactive Payoff Matrix:** Clear visualization of game mechanics
- **Sound Effects:** Audio feedback for game actions
- **Mode Selection UI:** Clear distinction between game types

### Educational Value

- **Game Theory Concepts:** Learn cooperation vs. defection dynamics
- **Economic Incentives:** Experience how real stakes affect decision-making
- **AI Behavior Analysis:** Understand different strategies in action
- **Blockchain Education:** Understand smart contracts through gameplay

## Development

### Contract Development

#### Building

```bash
# Build all contracts
cargo build --target wasm32-unknown-unknown --release

# Or build specific contract
cd contracts/single-player-dilemma
cargo build --target wasm32-unknown-unknown --release
```

#### Generating TypeScript Bindings

```bash
# Single-player contract
stellar contract bindings typescript \
  --wasm target/wasm32-unknown-unknown/release/single_player_dilemma.wasm \
  --output-dir packages/single_player_dilemma

# P2P contract (reference)
stellar contract bindings typescript \
  --wasm target/wasm32-unknown-unknown/release/prisoners_dilemma.wasm \
  --output-dir packages/prisoners_dilemma
```

#### Deploying to Testnet

```bash
# Single-player contract (recommended)
stellar contract deploy \
  --wasm target/wasm32-unknown-unknown/release/single_player_dilemma.wasm \
  --source testnet-user \
  --network testnet \
  -- --admin <YOUR_TESTNET_ADDRESS>

# Update environments.toml with deployed contract address
```

### Frontend Development

```bash
# Start development server with hot reload
npm run dev

# Build for production
npm run build

# Run linter
npm run lint
```

### Testing

```bash
# Test single-player contract
cd contracts/single-player-dilemma
cargo test
```

## Inspiration

This project adapts Nicky Case's ["The Evolution of Trust"](https://ncase.me/trust/) to blockchain, transforming theoretical game theory into experiential learning with real economic consequences.

## License

Licensed under the Apache License, Version 2.0.
