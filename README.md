# Game Theory on Stellar

A dApp bringing game theory to life on the Stellar network, inspired by Nicky Case's ["The Evolution of Trust"](https://github.com/ncase/trust). Experience the Prisoner's Dilemma with real XLM stakes, making cooperation and defection decisions truly impactful.

_Built with Scaffold Stellar for the Stellar Hackathon._

- ⚡️ Vite + React + TypeScript
- 🔗 Auto-generated contract clients
- 🧩 Interactive game components
- 🛠 Hot reload for contract changes
- 🧪 Easy local/testnet deployment
- 💰 Real stakes for deeper engagement

This project demonstrates innovative use of Scaffold Stellar to create educational and entertaining blockchain applications with economic incentives.

## Requirements

Before getting started, make sure you’ve met the requirements listed in the [Soroban documentation](https://developers.stellar.org/docs/build/smart-contracts/getting-started/setup) and that the following tools are installed :

- [Rust](https://www.rust-lang.org/tools/install)
- [Cargo](https://doc.rust-lang.org/cargo/) (comes with Rust)
- Rust target: install the compilation target listed in the [Soroban setup guide](https://developers.stellar.org/docs/build/smart-contracts/getting-started/setup)
- [Node.js](https://nodejs.org/en/download/package-manager) (v22, or higher)
- [npm](https://www.npmjs.com/): Comes with the node installer or can also be installed package managers such as Homebrew, Chocolatey, apt, etc.
- [Stellar CLI](https://github.com/stellar/stellar-core)
- [Scaffold Stellar CLI Plugin](https://github.com/AhaLabs/scaffold-stellar)

## Quick Start

To get started with a fresh Scaffold Stellar project, follow the steps below:

1. Initialize a new project:

```bash
stellar scaffold init my-project
cd my-project
```

2. Set up your development environment:

```bash
# Copy and configure environment variables like network and STELLAR_SCAFFOLD_ENV
cp .env.example .env

# Install frontend dependencies
npm install
```

Have a look at `environments.toml` for more fined-grained control.

3. Start development environment:

```bash
npm run dev
```

Open the server URL in your web browser. 

4. For testnet/mainnet deployment:

When you are ready for testnet, you need to deploy your contract using
`stellar registry`. Some commands to get you started.

```bash
#  Note --source-account argument is omitted for clarity

# First publish your contract to the registry
stellar registry publish

# Then deploy an instance with constructor parameters
stellar registry deploy \
  --deployed-name my-contract \
  --published-name my-contract \
  -- \
  --param1 value1

# Can access the help docs with --help
stellar registry deploy \
  --deployed-name my-contract \
  --published-name my-contract \
  -- \
  --help

# Install the deployed contract locally
stellar registry create-alias my-contract
```

## Project Structure

This project extends Scaffold Stellar with custom game theory contracts and components:

```
game-theory/                     # Game Theory on Stellar dApp
├── contracts/                   # Smart contracts (Rust)
│   ├── guess-the-number/        # Example contract
│   └── prisoners-dilemma/       # Prisoner's Dilemma with stakes
├── packages/                    # Auto-generated TypeScript clients
├── src/                         # Frontend React application
│   ├── components/              # React components (GuessTheNumber, PrisonersDilemma)
│   ├── contracts/               # Contract interaction helpers
│   ├── debug/                   # Debugging contract explorer
│   ├── hooks/                   # Custom React hooks (useWallet)
│   ├── pages/                   # App Pages (Home, Debugger)
│   ├── App.tsx                  # Main application component
│   └── main.tsx                 # Application entry point
├── target/                      # Build artifacts and WASM files
├── environments.toml            # Environment configurations
├── package.json                 # Frontend dependencies
└── .env                         # Local environment variables
```

## Key Features

### Prisoner's Dilemma Contract
- **Real Stakes**: Players stake XLM to participate, making decisions financially impactful.
- **Payoff Matrix**: Implements classic game theory payoffs (Reward: 2XLM, Temptation: 3XLM, Sucker: 0XLM, Punishment: 0XLM).
- **Secure Moves**: Commit-reveal pattern prevents cheating (planned enhancement).

### Frontend Components
- **Interactive UI**: Payoff matrix display and game flow.
- **Wallet Integration**: Stellar Wallet Kit for seamless authentication and transactions.
- **Educational**: Combines Nicky Case's narrative with blockchain execution.

### Innovation
Unlike traditional simulations, this dApp requires "skin in the game," transforming theoretical concepts into experiential learning with tangible rewards and penalties.

## Inspiration

This project borrows concepts from Nicky Case's ["The Evolution of Trust"](https://ncase.me/trust/), an interactive guide to game theory. By adapting the Prisoner's Dilemma mechanics to Stellar with real economic stakes, we create a bridge between educational simulations and blockchain applications.

## Hackathon Goals

- Demonstrate Scaffold Stellar's speed and efficiency in building dApps.
- Showcase innovative DeFi/GameFi applications with token incentives.
- Integrate Stellar Wallet Kit for seamless user experience.
- Win prizes by building a deployed smart contract with a functional frontend.
