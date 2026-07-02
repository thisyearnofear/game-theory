# Trustfall — Development Roadmap

## 🎯 Current Status: ZK Multiplayer + Multi-Round Matches + Game Theory Sandbox

- ✅ ZK Dilemma Soroban contract (`contracts/zk_dilemma/`) — on-chain UltraHonk proof verification, keccak256 commitment, XLM escrow, forfeit logic, recovery functions (cancel_game, claim_refund), contract events, self-join prevention, **multi-round matches (best-of-3/5 with rematch)**
- ✅ Noir move-commitment circuit (`circuits/move_commitment/`) — keccak256-based, external `noir-lang/keccak256` library
- ✅ UltraHonk verifier integrated (`ultrahonk_soroban_verifier` crate from NethermindEth)
- ✅ soroban-sdk upgraded to 26.x for BN254 host functions
- ✅ Real ZK proof verified on-chain in Rust tests (15/15 tests passing — 7 single-round + 8 multi-round match)
- ✅ Browser proof generation via `@noir-lang/noir_js` + `@aztec/bb.js` (lazy-loaded, code-split)
- ✅ Contract deployed to testnet (pruned by retention window — WASM built and ready for redeployment)
- ✅ ZK multiplayer frontend — GameLobby, CommitMove, RevealMove, GameResult, OnboardingOverlay, StatsDisplay, MatchSetup, MatchScoreboard, MatchCommitMove
- ✅ `useZKDilemma` hook with typed auto-generated client (all single-round + match functions)
- ✅ `useGameStats` hook — persistent stats and game history in localStorage
- ✅ WASM compiled + TypeScript bindings (regenerated with match functions)
- ✅ Pre-commit hooks with secrets scanning (secretlint) + linting (lint-staged)
- ✅ Interactive slide system (5 slides) with local simulation tutorial
- ✅ Mobile responsive breakpoints across ZK components
- ✅ Auto-retry for game_id race condition in create flow
- ✅ Nonce persisted in localStorage (survives browser close)
- ✅ Move auto-fill in reveal phase
- ✅ Trustfall thematic UI — the fall, the catch, the impact (CSS animations, trust altitude visual)
- ✅ Iterated tutorial — 9 stateful strategies (TFT, TF2T, Grudge, Pavlov, Prober, Generous TFT, All-C, All-D, Random), move history table, trust altitude, noise slider, payoff matrix editor, strategy inspector
- ✅ Tournament mode — evolutionary simulation, round-robin, population bar chart, auto-play, noise slider, payoff presets, population-over-generations chart, winner detection
- ✅ Configurable payoff matrix — 5 presets (Classic PD, Stag Hunt, Harmony, Snowdrift, High Temptation), live dilemma type detection, custom P/S/R/T editing
- ✅ Noise simulation — "the wind caught you" — random move flips in both tutorial and tournament
- ✅ Strategy inspector — plain-English decision logic, strengths/weaknesses, round-by-round examples for all 9 strategies
- ✅ Achievement system — unlockable badges (first_catch, first_betrayal, tournament_winner, zk_player, zk_winner, etc.) with toast notifications
- ✅ Persistent game stats — W/L/T record, net XLM, cooperation rate, game history
- ✅ Stake guidance — presets (1/5/10 XLM), recommended indicator, lobby filter by stake range
- ✅ Lobby feedback — waiting indicator, copy game link, opponent-joined notification with sound
- ✅ Multi-round matches — best-of-3/5, visual scoreboard, rematch with same opponent
- ✅ Shareable results — generate shareable cards from tournament outcomes
- ✅ Custom cursor with proximity-aware interactions
- ✅ 3D tilt + spotlight on strategy cards
- ✅ Directional slide transitions with parallax

## 🚀 Phase 3: AI Integration & Deployment

**Goal**: End-to-end test with two wallets, contract redeployment, AI-enhanced tutorial

### 3.0 ZK Contract Deployment

- ✅ Deploy `zk_dilemma` WASM to testnet (initial version)
- ✅ Set `VITE_ZK_DILEMMA_CONTRACT_ID` in .env
- ⬜ Redeploy contract with recovery functions + events
- ⬜ End-to-end test with two wallets

### 3.1 LLM AI Opponents

- **Smart AI strategies** that adapt and learn
- **Personality-driven opponents** (aggressive, cautious, adaptive)
- **Natural language explanations** of AI decisions
- **Dynamic difficulty** based on player performance

### 3.2 AI Tutoring System

- ✅ Contextual guidance during tutorial gameplay (Venice AI)
- ✅ Strategy explanations after each round
- ✅ Game theory education integrated into experience
- ⬜ Personalized learning paths based on player behavior

### 3.3 Enhanced Tutorial Modes

- ✅ Local simulation (no wallet/contract needed)
- ✅ 9 stateful iterated strategies (TFT, TF2T, Grudge, Pavlov, Prober, Generous TFT, All-C, All-D, Random)
- ✅ Move history table with cumulative scores
- ✅ Trust altitude visual (grows with cooperation, resets on betrayal)
- ✅ Noise slider — "the wind caught you" — random move flips
- ✅ Payoff matrix editor with 5 preset scenarios
- ✅ Strategy inspector — plain-English decision logic for all 9 strategies
- ✅ Tournament mode — evolutionary simulation with population visualization
- ⬜ Campaign mode with progressive difficulty
- ✅ Achievement system (badges + toast notifications, no XLM rewards yet)
- ⬜ Leaderboards for tutorial performance (persistent stats exist locally; no global leaderboard)

## 🏆 Phase 4: Advanced Game Theory Concepts & Tournament System

**Goal**: Expand beyond single-round Prisoner's Dilemma to include iterated games and tournaments like the original Nicky Case project

### 4.1 Iterated Games (Tutorial) — ✅ Complete

- ✅ **Multi-round gameplay** with memory of past interactions (stateful strategies)
- ✅ **Strategy implementation** — 9 strategies with full state machines (Tit-for-Tat, Grudger, Pavlov, etc.)
- ✅ **Trust evolution tracking** — trust altitude visual grows with mutual cooperation
- ✅ **Historical move analysis** — move history table with per-round breakdown
- ✅ **Noise simulation** — "the wind caught you" — random move flips with contextual labels
- ✅ **On-chain multi-round matches** — best-of-3/5 with rematch support, contract tracks round wins/ties

### 4.2 Tournament System — ✅ Complete (off-chain simulation)

- ✅ **Automated tournaments** with all 9 strategy types competing in round-robin
- ✅ **Performance tracking** — average score per strategy, ranked score table
- ✅ **Strategy registry** — all 9 strategies with unique colors, emojis, and descriptions
- ✅ **Population dynamics simulation** — eliminate weak, reproduce strong, watch evolution
- ✅ **Auto-play** — runs play → evolve → play loop automatically
- ✅ **Population-over-generations chart** — stacked visualization of population composition
- ✅ **Winner detection** — victory banner when one strategy reaches 80% dominance
- ✅ **Configurable parameters** — noise, rounds per match, selection pressure, payoff matrix
- ⬜ On-chain tournament with prize pool distribution via smart contracts

### 4.3 Real-Time Multiplayer

- **WebSocket integration** for live games
- **Matchmaking system** based on skill/stakes
- **Spectator mode** for learning
- **Chat system** with moderation

### 4.4 Advanced Blockchain Features

- **Reputation NFTs** that evolve with gameplay
- **Strategy marketplace** for trading AI algorithms
- **Governance tokens** for community decisions
- **Cross-chain integration** for broader reach

## 🏗️ Contract Architecture Redesign (Technical)

**Goal**: Transform from single-contract model to modular system supporting full educational experience

### 4.5 Modular Contract System

- **Base Game Contract**: Enhanced version of current single-round functionality
- **Iterated Games Contract**: Support for multiple rounds with move history
- **Tournament Contract**: Strategy competition and performance tracking
- **Strategy Factory Contract**: On-chain strategy registration and management
- **Results Aggregator Contract**: Analytics and educational feedback tracking

### 4.6 Key Technical Requirements

- **Extended State Management**: Complex game histories and trust tracking
- **Strategy Implementation**: On-chain logic for various game theory strategies
- **Gas Optimization**: Efficient storage and computation patterns
- **Event Logging**: For frontend visualization and AI tutoring integration
- **Migration Path**: Maintaining backward compatibility during transition

## 🌍 Phase 5: Community & Ecosystem

**Goal**: Self-sustaining community of trust researchers and players

### 5.1 Educational Platform

- **Course creation tools** for educators
- **Research collaboration** features
- **Academic partnerships** and citations
- **Certification system** for game theory knowledge

### 5.2 Developer Ecosystem

- **Strategy SDK** for custom AI development
- **Plugin system** for community extensions
- **API access** for researchers
- **Open source contributions** and bounties

### 5.3 Real-World Applications

- **Corporate training** modules
- **Policy simulation** tools
- **Social experiment** platform
- **Research data** collection and analysis

## 🔧 Technical Debt & Optimizations

- ✅ **Mobile responsiveness** — breakpoints added for ZK components
- ✅ **Bundle size** — bb.js/noir.js lazy-loaded (code-split)
- ✅ **Game recovery** — cancel_game + claim_refund for stuck funds
- ✅ **Self-join prevention** — player1 cannot join as player2
- ✅ **Nonce persistence** — localStorage with sessionStorage fallback
- ✅ **Game ID race condition** — auto-retry on create
- ✅ **Contract events** — emitted for all state transitions
- ✅ **Multi-round match support** — Match struct, best-of-3/5, rematch, cancel_match, 8 new tests
- ✅ **Game design closed loops** — post-game Play Again, persistent stats, stake guidance, lobby feedback
- ✅ **Achievement system** — unlockable badges with toast notifications
- ✅ **Dead code removal** — single-player contract stub removed, tutorial uses local simulation
- ✅ **Strategy architecture** — refactored from stateless functions to stateful IteratedStrategy classes
- ✅ **Payoff matrix** — refactored from hardcoded values to configurable PayoffMatrix interface
- **Performance monitoring** and optimization
- **Accessibility compliance** (WCAG 2.1)
- **Internationalization** support
- **Advanced analytics** and user insights
- **Bundle size** — tournament + tutorial code could be code-split from ZK multiplayer bundle

## 📊 Success Metrics

- **User engagement**: Session duration, return rate
- **Educational impact**: Knowledge retention, behavior change
- **Economic activity**: XLM volume, transaction frequency
- **Community growth**: Active users, content creation
- **Academic adoption**: Research citations, educational use

---

_This roadmap follows our core principles: ENHANCEMENT FIRST, AGGRESSIVE CONSOLIDATION, PREVENT BLOAT_
