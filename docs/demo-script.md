# Demo Video Script — Trustfall (3-4 min)

## Pre-Demo Setup

- Two browser windows side by side (or two tabs)
- Both wallets connected to Stellar testnet with funded XLM
- Dev server running: `npm run dev`
- Have the terminal open to show test output

---

## Script

### [0:00-0:20] Hook — "What if trust was provable?"

**Show:** Terminal with `cargo test --release` running, 9/9 tests passing.

**Say:**

> "This is Trustfall — a Prisoner's Dilemma game on Stellar where your move
> is proven with zero-knowledge proofs. But it's also a game theory sandbox:
> 9 AI strategies, evolutionary tournaments, configurable payoffs, and noise.
> You can learn why trust evolves, then play for real with ZK-protected stakes."

### [0:20-0:50] Tutorial Mode — Iterated Play Against AI

**Show:** Click "Tutorial (vs AI)" mode. Select "Tit-for-Tat" as opponent.

**Say:**

> "First, the tutorial. You play against 9 different AI strategies, each with
> its own personality. Tit-for-Tat starts by trusting you, then copies whatever
> you did last. Let's play a few rounds."

**Show:** Play 3 rounds — Cooperate, Cooperate, Defect. Show the move history
table filling up, trust altitude growing then resetting.

**Say:**

> "See the trust altitude? It grows when we both cooperate, resets when I
> betray. Now let me show you what makes each strategy tick."

**Show:** Click "Inspect Tit-for-Tat" to open the Strategy Inspector.

**Say:**

> "The strategy inspector explains in plain English how each AI thinks — its
> decision logic, strengths, weaknesses, and a concrete example. This is what
> makes the tutorial educational, not just a game."

### [0:50-1:30] Noise + Payoff Matrix — "The Wind Caught You"

**Show:** Drag the noise slider to 10%.

**Say:**

> "Now the interesting part — noise. In the real world, mistakes happen.
> The wind catches you. With 10% noise, moves get randomly flipped. Watch
> what happens when I play TFT with noise — we get stuck in endless
> retaliation."

**Show:** Play a few rounds with noise on. Show a round where a move gets
flipped — "The wind caught someone!"

**Show:** Open the Payoff Matrix Editor. Click "High Temptation" preset.

**Say:**

> "You can also change the game itself. The payoff matrix is fully
> configurable — 5 presets from Classic PD to Stag Hunt to High Temptation.
> Set temptation to 10x and watch how defection becomes irresistible."

### [1:30-2:20] Tournament Mode — Evolution of Trust

**Show:** Switch to "Tournament" mode.

**Say:**

> "Now the tournament. All 9 strategies compete in a round-robin. The weak
> are eliminated, the strong reproduce. This is Nicky Case's 'Evolution of
> Trust' brought to life."

**Show:** Click "Play Tournament" — watch the population bar chart update
with scores. Click "Evolve" — show strategies being eliminated and reproducing.

**Say:**

> "With no noise, Tit-for-Tat dominates — it's nice, provokable, and
> forgiving. But let's add 10% noise and auto-play..."

**Show:** Set noise to 10%, click "Auto-play". Watch generations tick by.

**Say:**

> "With noise, strict Tit-for-Tat dies — it can't forgive mistakes. But
> Generous TFT and Tit-for-Two-Tat thrive because they can forgive. The
> strategy that wins depends on the environment. That's the whole lesson."

**Show:** Winner banner appears when one strategy reaches 80%.

### [2:20-2:40] The Problem — Why ZK Matters

**Show:** Switch to "Multiplayer" mode.

**Say:**

> "The tutorial teaches you _why_ trust matters. Now let me show you _how_
> to play for real — with zero-knowledge proofs on Stellar.
>
> In a normal commitment scheme, you hash your move and submit the hash.
> But nothing stops you from hashing garbage and griefing your opponent.
> With ZK, the contract verifies at commit time that your hash is over a
> valid move — 0 or 1 — with a known nonce and the correct game ID."

### [2:40-3:10] Player 1 Commits (left window)

**Show:** Click "Create New Game", select "Cooperate", enter stake (1 XLM).

**Say:**

> "Player 1 chooses Cooperate. The browser generates a random nonce,
> computes keccak256(move || nonce || game_id), and generates a real
> UltraHonk proof using Noir and bb.js — all client-side in WASM."

**Wait for:** "Generating ZK proof..." → proof generated → tx submitted.

**Show:** The game appears in the lobby with game ID and "Awaiting Player 2".

### [3:10-3:30] Player 2 Joins + Reveal (right window)

**Show:** Switch to second browser, see the game in lobby, click "Join".
Select "Defect", generate proof, submit. Then both reveal.

**Say:**

> "Player 2 sees the open game, chooses Defect, generates their own ZK proof.
> Both reveal. The contract verifies the keccak256 hash matches. Payouts
> calculated — Player 2 gets 3× stake, Player 1 gets 0. XLM transferred
> from escrow."

### [3:30-3:45] Close

**Say:**

> "Learn why trust evolves in the tutorial. Experiment with noise, payoffs,
> and tournaments. Then play for real with ZK-protected XLM stakes on
> Stellar. Real ZK proofs, real on-chain verification, real consequences.
> Thanks for watching."

---

## Key Points to Emphasize

1. **Three modes, one story** — Tutorial teaches _why_, Tournament shows
   _what happens_, Multiplayer lets you _play for real_
2. **Real ZK** — not a mock or stub. The proof is 14,592 bytes of actual
   UltraHonk proof data, verified by BN254 pairings on-chain
3. **Load-bearing** — without the proof, you can't create or join a game.
   The contract rejects invalid proofs (tested)
4. **Browser-native** — proof generation happens in the browser via WASM.
   No server, no trusted third party
5. **Educational depth** — 9 strategies with full state machines, strategy
   inspector, configurable payoffs, noise simulation. This isn't just a
   game — it's a game theory sandbox
6. **Nicky Case lineage** — the tournament mode directly implements the
   evolutionary simulation from "The Evolution of Trust"

## Backup Slides (if asked)

- "How long does proof generation take?" — ~2-5 seconds in browser
- "What's the proof size?" — 14,592 bytes
- "What circuit?" — keccak256(move || nonce || game_id) == commitment,
  move constrained to {0, 1}, 3 public inputs (commitment_high,
  commitment_low, game_id)
- "What verifier?" — NethermindEth's rs-soroban-ultrahonk, UltraHonk
  protocol with BN254 curve
- "What are the 9 strategies?" — TFT, TF2T, Grudge, Pavlov, Prober,
  Generous TFT, Always Cooperate, Always Defect, Random
- "Can I change the payoff matrix?" — Yes, 5 presets + custom P/S/R/T
  editing in both Tutorial and Tournament modes
- "What does noise do?" — Randomly flips moves. Shows how strategies
  that can't forgive mistakes (TFT, Grudge) die out, while forgiving
  strategies (TF2T, Generous TFT) thrive
