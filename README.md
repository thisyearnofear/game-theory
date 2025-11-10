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

### Payoff Matrix (in XLM)

| Player 1 \ Player 2 | Cooperate | Defect |
|---------------------|-----------|---------|
| **Cooperate** | Both get 2 XLM (Reward) | P1: 0, P2: 3 XLM (Sucker/Temptation) |
| **Defect** | P1: 3, P2: 0 XLM (Temptation/Sucker) | Both get 0 XLM (Punishment) |

### Game Flow

1. **Create Game:** Player 1 stakes XLM and creates a game
2. **Join Game:** Player 2 joins with their move (Cooperate/Defect)
3. **Resolve Game:** Contract calculates payoffs and distributes XLM

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

### Real XLM Integration
- **Testnet Deployment:** Contract deployed on Stellar testnet
- **Wallet Integration:** Stellar Wallet Kit for seamless transactions
- **Real Stakes:** Actual XLM transfers based on game outcomes
- **Transaction History:** All games recorded on blockchain

### Immersive Design
- **Nicky Case Inspired:** Visual design inspired by "The Evolution of Trust"
- **FuturaHandwritten Font:** Authentic typography from original
- **Interactive Payoff Matrix:** Clear visualization of game mechanics
- **Sound Effects:** Audio feedback for game actions

### Educational Value
- **Game Theory Concepts:** Learn cooperation vs. defection dynamics
- **Economic Incentives:** Experience how real stakes affect decision-making
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
