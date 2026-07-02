# Product Review — ZK Prisoner's Dilemma on Stellar

Comprehensive review of product design, UI/UX, system architecture, reliability/performance, and intuitiveness/cogency. Based on full codebase analysis (contract, circuit, frontend).

---

## 1. Product Design

### What's working

**ZK value proposition is real and well-articulated.** The core insight — that a hash-only commit-reveal scheme allows griefing because players can commit to garbage — is correct, and the ZK proof genuinely solves it. The circuit proves `move ∈ {0,1}` and `keccak256(move || nonce || game_id) == commitment`, which is exactly the binding guarantee needed. This is not ZK-for-ZK's-sake; removing it breaks the game.

**Game theory model is sound.** The payoff matrix (CC=2×, CD=0/3×, DC=3×/0, DD=0) is the standard Prisoner's Dilemma. Escrow-then-reveal with timeout forfeit is the right structural design for on-chain games.

**Trust model is cleanly separated.** The circuit proves commitment validity; the contract proves game mechanics (auth, state, timing, payouts); the frontend proves proper randomness. Each layer does what it's good at.

### What's not working

**~~Single-player mode is broken.~~** ✅ **Fixed.** The broken single-player contract stub has been removed. The tutorial now uses a local simulation (no wallet/contract needed) with the same strategy classes. The tutorial mode label has been updated to "Tutorial (vs AI)" to set correct expectations.

**No game discovery mechanism.** Players can only see games in the lobby by polling `get_game_count` and iterating. Contract events are now emitted (`GameCreated`, `GameJoined`, etc.) enabling future off-chain indexing, but no event subscription or filter for open games is built yet. For a hackathon demo, you need two browsers side-by-side. For real use, you'd need a relay/matchmaking layer.

**No iterated games.** The original plan mentioned multi-round gameplay. Only single-round is supported. This limits the educational value — the Nicky Case inspiration is specifically about _repeated_ interaction building trust.

**Reputation proofs not built.** The original plan's most novel ZK feature (proving cooperation rate without revealing individual moves) was not implemented. This was the feature that would have distinguished this from a standard commit-reveal scheme.

### Recommendations

1. ~~**Hide or remove the single-player entry point**~~ ✅ Done — replaced with local simulation
2. **Add a "copy game link" button** in the lobby so players can share game IDs out-of-band
3. **Be honest in the demo** about what's built vs. planned — the ZK commit-reveal is real and load-bearing; reputation proofs are future work

---

## 2. UI/UX

### What's working

**Commit flow has good feedback states.** The "choose → generating → submitting" progression with spinner + status text + debug info gives users clear visibility into what's happening during the slowest part of the flow (proof generation).

**Nonce display is prominent.** The yellow "Save Your Nonce!" box with monospace text is hard to miss. The sessionStorage auto-fill on reveal is a good UX touch.

**Payoff matrix is always visible** during move selection, which helps users understand the game theory.

**Move selection buttons are visually distinct** — green Cooperate vs. red Defect with emoji icons.

### What's not working

**~~Reveal phase requires re-selecting your move.~~** ✅ **Fixed.** The reveal phase now auto-fills the committed move from localStorage and provides helper text for confirmation.

**~~No mobile responsiveness.~~** ✅ **Fixed.** Responsive breakpoints added at `max-width: 640px` — 2-column grids collapse to single column, move buttons stack vertically, padding reduced.

**Debug info shown to end users.** The commitment hash prefix and proof hex prefix are displayed in the status box. Non-technical users won't understand these. Should be behind a toggle or removed in production.

**Silent wallet disconnect.** If the wallet disconnects during a game (polling detects it), the app silently returns to "Connect Your Wallet" with no explanation. Users may think the app crashed.

**No visual polling indicator.** The game view polls every 5 seconds but shows no indicator that it's waiting for updates. Users don't know if the page is live or stuck.

**~~Reveal deadline UX is unclear.~~** ✅ **Partially fixed.** Cancel and refund buttons now appear when deadlines pass, with countdown timers showing time remaining. Claim forfeit is still not surfaced as a button.

### Recommendations

1. ~~**Auto-fill move in reveal phase**~~ ✅ Done
2. ~~**Add responsive breakpoints**~~ ✅ Done
3. **Hide debug info behind a toggle** — "Show technical details" checkbox
4. **Add toast notification on wallet disconnect** — "Wallet disconnected. Reconnect to continue."
5. **Add "Last updated: 12:34:05" timestamp** in the game view polling area
6. ~~**Show actionable buttons after deadline**~~ ✅ Done for cancel/refund; claim forfeit button still needed

---

## 3. System Architecture

### What's working

**Contract function design is clean.** `create_game → join_game → reveal_move → resolve_game` (or `claim_forfeit`) is a clear state machine. Each function has proper auth, state validation, and error handling.

**Proof verification is correctly separated.** The `verify_proof` helper handles serialization and verifier setup; `verify_reveal` handles hash verification. These are distinct cryptographic operations with different trust assumptions.

**Public input serialization is consistent.** The 96-byte blob (3 × 32-byte Field elements) is constructed identically in the contract, circuit, and frontend. Big-endian encoding, zero-padding, and commitment split (high/low) all match.

**Keccak256 preimage is identical across all three components.** `move_byte (1) || nonce (8 BE) || game_id (8 BE)` = 17 bytes. Verified in circuit (`main.nr`), frontend (`noirProofService.ts`), and contract (`lib.rs`).

**Version pinning is correct.** `@noir-lang/noir_js@1.0.0-beta.9` matches `nargo 1.0.0-beta.9`; `@aztec/bb.js@0.87.0` matches `bb v0.87.0`. Proof flavor (`{ keccak: true }`) matches the on-chain verifier.

### What's not working

**~~CRITICAL: Self-join vulnerability.~~** ✅ **Fixed.** `join_game()` now checks `if player2 == game.player1 { return Err(Error::Unauthorized) }`. Test `test_self_join_prevented` verifies this.

**~~Stuck games with locked funds.~~** ✅ **Fixed.** Two recovery functions added:

- `cancel_game`: player1 reclaims stake if no opponent joins before commit deadline
- `claim_refund`: anyone can trigger split refund if both players timeout on reveal

**~~Wrong error in `claim_forfeit`.~~** ✅ **Fixed.** Now returns `GameNotReady` instead of `MoveAlreadyRevealed`.

**~~Game ID race condition.~~** ✅ **Fixed.** Frontend auto-retries up to 2 times if `create_game` fails with a proof/commitment mismatch, re-fetching the game count each time.

**~~No event emission.~~** ✅ **Fixed.** Contract now emits `GameCreated`, `GameJoined`, `MoveRevealed`, `GameResolved`, `GameForfeited`, `GameCancelled` events.

### Recommendations

1. ~~**Fix self-join vulnerability immediately**~~ ✅ Done
2. ~~**Add `cancel_game` function**~~ ✅ Done
3. ~~**Add `claim_double_forfeit` function**~~ ✅ Done (as `claim_refund`)
4. ~~**Fix the error message** in `claim_forfeit`~~ ✅ Done
5. ~~**Add auto-retry for game_id race**~~ ✅ Done
6. ~~**Consider events**~~ ✅ Done

---

## 4. Reliability & Performance

### What's working

**Proof generation is the critical path and it works.** bb.js generates a 14,592-byte proof that verifies against the on-chain Rust verifier. This was cross-verified (bb.js proof → Rust verifier test).

**Contract tests are comprehensive.** 9/9 tests pass: real proof verification, fake proof rejection, wrong-length rejection, zero-stake rejection, payout calculation, cancel after deadline, cancel before deadline fails, refund on both timeout, self-join prevention.

**Error handling is consistent.** All contract functions use `Result<T, Error>` with the `?` operator. All frontend hook functions use try-catch-finally with `isLoading` and `error` state.

### What's not working

**Proof generation latency is unknown in-browser.** The Rust test verifies the proof, but browser WASM performance varies. The UI shows "Generating ZK proof..." but there's no timeout or progress indicator. If bb.js WASM fails to load (e.g., worker path issues), the app hangs silently.

**No proof generation timeout.** If bb.js hangs (WASM init failure, browser incompatibility), the user is stuck on "Generating ZK proof..." forever. No timeout, no error, no fallback.

**~~Bundle size is large.~~** ✅ **Fixed.** bb.js and noir_js are now lazy-loaded via dynamic `import()`. The initial page load bundle is ~200KB; the ~10MB WASM only downloads when the user first triggers proof generation.

**Polling is inefficient.** The frontend polls `get_game` every 5 seconds for each active game. With N games, that's N requests every 5 seconds. No batching, no websocket, no event subscription.

**~~Nonce stored in sessionStorage only.~~** ✅ **Fixed.** Nonce is now stored in localStorage first (with sessionStorage fallback), surviving browser close.

### Recommendations

1. **Add proof generation timeout** — 30-second timeout with error message "Proof generation timed out. Please try again."
2. ~~**Lazy-load bb.js**~~ ✅ Done — dynamically imported on first proof generation
3. **Show WASM download progress** — "Loading ZK engine... (4.2MB)" during first proof generation
4. ~~**Store nonce in localStorage with game_id key**~~ ✅ Done
5. **Batch game polling** — fetch all active games in one request (add `get_games_by_player` contract function)
6. **Add a "I lost my nonce" recovery path** — explain that funds will be forfeited, provide a "Claim Forfeit for opponent" button if applicable

---

## 5. Intuitiveness & Cogency

### What's working

**The ZK explanation in the README is honest and clear.** "Without the proof, a player could commit to an arbitrary hash and grief the opponent" is the right framing. The "Why ZK?" section directly answers the judge's first question.

**The demo script is well-structured.** It walks through the two-player flow, emphasizes that ZK is load-bearing, and highlights the on-chain verification. The "Key Points to Emphasize" section is good for staying on message.

**The payoff matrix is always visible** during move selection, which grounds the game theory in something tangible.

### What's not working

**~~The app doesn't explain itself to a new user.~~** ✅ **Fixed.** A 3-step onboarding overlay (`OnboardingOverlay.tsx`) now appears on first visit to `/play`, explaining: (1) Choose your move, (2) Zero-Knowledge proof generation, (3) Commit then reveal. Dismissed state persisted in localStorage.

**The "Generating ZK proof..." step is a black box.** Users don't know what's happening, how long it will take, or what a ZK proof is. A one-line explanation like "Creating a zero-knowledge proof that your move is valid (this takes a few seconds)" would help.

**~~The reveal phase doesn't explain why re-selection is needed.~~** ✅ **Fixed.** The reveal phase now auto-fills the committed move and provides helper text explaining the confirmation.

**The nonce presentation is scary.** "Save Your Nonce! You'll need this to reveal your move" with a big number in monospace is intimidating. Users don't know what a nonce is or why they need to save it. Better: "Your secret code (saved automatically in your browser) — write this down as backup."

**No connection between the tutorial and the game.** The educational slides teach game theory concepts but don't mention ZK. The ZK game doesn't reference the tutorial. A judge watching the demo has to mentally connect two disconnected experiences.

### Recommendations

1. ~~**Add a 3-step onboarding overlay**~~ ✅ Done
2. **Add helper text during proof generation** — "Creating a zero-knowledge proof that your move is valid. This takes a few seconds."
3. **Reframe the nonce** — "Your secret code" with "Saved automatically — write it down as backup in case you close your browser"
4. **Connect the tutorial to the game** — add a final slide that says "Ready to play for real? Click here to start a ZK game" linking to `/play`
5. **Add a "How it works" expandable section** in the lobby — 3 sentences about commit-reveal + ZK, with a link to the README for details

---

## Priority Summary

### Fixed before demo (critical) ✅

| #   | Issue                                                 | Impact                | Status            |
| --- | ----------------------------------------------------- | --------------------- | ----------------- |
| 1   | Self-join vulnerability in `join_game`                | Game-breaking exploit | ✅ Fixed + tested |
| 2   | Auto-fill move in reveal phase                        | Major UX confusion    | ✅ Fixed          |
| 3   | Store nonce in localStorage (not just sessionStorage) | Fund-loss risk        | ✅ Fixed          |

### Fixed if time permits (high value) ✅

| #   | Issue                              | Impact              | Status            |
| --- | ---------------------------------- | ------------------- | ----------------- |
| 4   | Add `cancel_game` for stuck escrow | Locked funds        | ✅ Fixed + tested |
| 5   | Add proof generation timeout       | Silent hang         | ⬜ Not done       |
| 6   | Hide debug info behind toggle      | Polish              | ⬜ Not done       |
| 7   | Add onboarding overlay             | Judge comprehension | ✅ Done           |
| 8   | Fix `claim_forfeit` error message  | Misleading error    | ✅ Fixed          |
| 9   | Add responsive breakpoints         | Mobile judging      | ✅ Done           |

### Previously acknowledged, now fixed ✅

| #   | Issue                     | Impact                 | Status                            |
| --- | ------------------------- | ---------------------- | --------------------------------- |
| 10  | No event emission         | No off-chain indexing  | ✅ Events added                   |
| 11  | Large WASM bundle (~10MB) | Slow first load        | ✅ Lazy-loaded                    |
| 12  | Game ID race condition    | Rare but unrecoverable | ✅ Auto-retry added               |
| 13  | Single-player mode broken | Dead end in UI         | ✅ Replaced with local simulation |

### Acknowledge in README (won't fix)

| #   | Issue                                       | Impact                           |
| --- | ------------------------------------------- | -------------------------------- |
| 14  | Reputation proofs not built                 | Future work                      |
| 15  | No proof generation timeout                 | Silent hang risk                 |
| 16  | Inefficient polling (no batching/websocket) | Scalability                      |
| 17  | Contract redeployment needed                | New functions not yet on testnet |
