# Single Player Prisoner's Dilemma Contract

A Soroban smart contract for playing the Prisoner's Dilemma against AI opponents with **real XLM at stake**.

## Overview

This contract implements a complete single-player game experience where:
- Players stake real XLM (testnet) to play
- Contract generates deterministic AI moves
- Payouts are calculated and transferred immediately
- All games are recorded on-chain for transparency and verification

## Key Features

### Real Financial Integration
- **Stake XLM**: Players transfer actual XLM from their wallet
- **Instant Payouts**: Contract transfers winnings back to player
- **Verifiable**: All transactions visible on Stellar Expert
- **Deterministic**: AI moves are reproducible and auditable

### AI Strategies
Four distinct AI strategies, each with predictable behavior:
- **Random** (`RND`): 50/50 chance of cooperate/defect
- **Always Cooperate** (`COOP`): Trusts every player
- **Always Defect** (`DEF`): Never trusts
- **Tit-for-Tat** (`TFT`): First move cooperates (extensible for iterated games)

### Game History & Analytics
- Track all player games on-chain
- Retrieve game results with full context
- Build leaderboards and statistics
- Player reputation system foundation

## Contract Functions

### `play_game`
Execute a complete game in a single transaction.

```rust
pub fn play_game(
    env: &Env,
    player: Address,
    player_move: Symbol,      // "C" or "D"
    ai_strategy: Symbol,      // "RND", "COOP", "DEF", "TFT"
    stake: i128,              // in stroops (1 XLM = 10,000,000 stroops)
) -> Result<GameResult, Error>
```

**Returns**: `GameResult` containing:
- Both moves (C = Cooperate, D = Defect)
- Both payouts (in stroops)
- Game ID (sequential, verifiable)
- Timestamp
- AI strategy used

### `get_game`
Retrieve game details by ID.

### `get_result`
Retrieve complete game result with payouts.

### `get_player_history`
Get player's last N games with full results.

### `get_game_count`
Total games played on contract.

## Payoff Matrix

```
                AI Cooperates    AI Defects
You Cooperate        2 XLM         0 XLM
You Defect           3 XLM         0 XLM
```

(Multiplied by stake amount)

## Building

```bash
cd contracts/single-player-dilemma
cargo build --target wasm32-unknown-unknown --release
```

## Deploying to Testnet

```bash
# Build
cargo build --target wasm32-unknown-unknown --release

# Generate TypeScript bindings
stellar contract bindings typescript \
  --wasm target/wasm32-unknown-unknown/release/single_player_dilemma.wasm \
  --output-dir ../../packages/single_player_dilemma

# Deploy
stellar contract deploy \
  --wasm target/wasm32-unknown-unknown/release/single_player_dilemma.wasm \
  --source testnet-user \
  --network testnet \
  -- --admin <YOUR_TESTNET_ADDRESS>
```

## Testing

```bash
cargo test
```

## Key Design Decisions

### Deterministic AI Moves
AI moves are generated from `game_id` and ledger `sequence`, ensuring:
- **Reproducibility**: Same input always produces same result
- **Verifiability**: Move generation logic is on-chain
- **Fairness**: Can't change AI behavior mid-transaction
- **Gas efficiency**: No random number generation overhead

### Single Transaction Pattern
All game logic (create, resolve, payout) happens in one `play_game` call:
- **Simplicity**: No multi-step coordination needed
- **Atomicity**: Either full game completes or reverts
- **User Experience**: Single confirmation from wallet
- **Cost efficiency**: One transaction fee instead of three

### On-Chain Game History
All games stored persistently:
- **Transparency**: Any party can verify outcomes
- **Analytics**: Player statistics and patterns
- **Leaderboards**: Public reputation and rankings
- **Educational**: Understand AI and human decision-making

## Future Enhancements

- **Iterated Games**: Multiple rounds with strategy evolution
- **Player vs Player**: Extend for multiplayer with proper escrow
- **Tournaments**: Ecosystem for competing against strategies
- **Dynamic Pricing**: Stake amounts affect payout multipliers
- **Governance**: Community-voted AI strategies or payoff matrices
