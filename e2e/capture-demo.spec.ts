import { test, expect, Page } from "@playwright/test";

/**
 * Trustfall hackathon demo capture.
 *
 * Records seven segments as WebM. Each segment becomes a clip HyperFrames
 * composites into the final 2:30 video. Segments are ordered to lead with
 * the accreditation ZK primitive (real-world "identity/compliance" framing
 * the hackathon called out) and then reveal move-commit ZK as the mechanic
 * that makes the on-chain game grief-proof.
 *
 * Wallet signing is out-of-DOM (Freighter popup) — those moments are the
 * scripted pauses at the end of the accreditation & commit segments.
 * HyperFrames covers them with "Signing on Stellar…" overlay cards.
 * Segment 6 shows the resolved outcome by hitting a pre-existing
 * `/play/:gameId` URL.
 *
 * Env vars:
 *   BASE_URL              — default http://localhost:5173
 *   DEMO_RESOLVED_GAME_ID — a Resolved gameId on testnet for segment 6
 *                           (play one manually, note the id, export it)
 *   DEMO_WALLET_CONNECTED — set to "1" if Freighter is pre-connected and
 *                           auto-approves this origin, so the proof-gen and
 *                           accreditation clicks fire live
 */

const SLOW = 900; // pause after clicks so the render can settle for capture
const READ = 2500; // "let the viewer read" beat
const HERO = 4000; // opening/closing hero holds

async function cinePause(page: Page, ms: number) {
  await page.waitForTimeout(ms);
}

/** Hide anything that visually competes with the primary UI in capture. */
async function suppressChrome(page: Page) {
  await page.addStyleTag({
    content: `
      /* Kill scrollbars — they show up in WebM and look janky */
      ::-webkit-scrollbar { display: none !important; }
      html, body { scrollbar-width: none !important; }
      /* Freeze the mascot's idle sway — cute in-app, distracting in a demo */
      .tf-sway { animation: none !important; }
    `,
  });
}

/**
 * Skip the FirstRunWizard so the mascot + quiz can be the star of the
 * Home segment. Anything left with `_seen = true` here is a modal we're
 * choosing NOT to walk through in the video.
 */
async function primeStorage(
  page: Page,
  opts: {
    skipWizard?: boolean;
    skipQuiz?: boolean;
    skipZKOnboarding?: boolean;
  } = {},
) {
  await page.addInitScript((flags) => {
    try {
      if (flags.skipWizard) localStorage.setItem("tf_wizard_seen", "true");
      if (flags.skipQuiz) localStorage.setItem("tf_quiz_seen", "true");
      if (flags.skipZKOnboarding)
        localStorage.setItem("zk_onboarding_seen", "1");
    } catch {
      // storage locked before origin loads — ignored
    }
  }, opts);
}

/**
 * Seed a fake wallet so the WalletProvider (src/providers/WalletProvider.tsx)
 * hydrates with an address on mount without ever calling into StellarWalletsKit.
 *
 * The trick: WalletProvider skips the freighter poll when `walletId !== "freighter"`
 * AND `walletAddress` is set (see WalletProvider.tsx:94). So walletId="mock-e2e"
 * bypasses the extension check entirely — the provider just uses the stored
 * address as-is. Any signTransaction call will fail, but every capture segment
 * stops before the wallet popup anyway.
 *
 * Address defaults to deployer, a real testnet account, so on-chain reads work.
 */
async function seedMockWallet(
  page: Page,
  address = "GBWV32TY5M6PLR23DPCU56XCPKS2R74NS2N2UA5PTCOM5LRSRCIFM5LL",
) {
  await page.addInitScript((addr) => {
    try {
      localStorage.setItem("walletId", "mock-e2e");
      localStorage.setItem("walletAddress", addr);
      localStorage.setItem("walletNetwork", "TESTNET");
      localStorage.setItem(
        "networkPassphrase",
        "Test SDF Network ; September 2015",
      );
    } catch {
      // ignored
    }
  }, address);
}

test.describe("Trustfall demo capture", () => {
  test.beforeEach(async ({ page }) => {
    await page.context().clearCookies();
    await page.addInitScript(() => {
      try {
        localStorage.clear();
        sessionStorage.clear();
      } catch {
        // ignored
      }
    });
  });

  // ─────────────────────────────────────────────────────────────────────────
  // SEGMENT 1 — First-run wizard (~10s)  ★ opening beat ★
  //   Welcome mascot + 3-pillar structure (Learn → Tutorial → Play for Real).
  //   Step 3 literally reads "commit moves with zero-knowledge proofs" — this
  //   is the app's own thesis, on-screen, in the first 10 seconds. Perfect
  //   opener. Ends with a soft "Explore on my own" dismiss so segment 2 can
  //   pick up on the hero.
  // ─────────────────────────────────────────────────────────────────────────
  test("01-first-run-wizard", async ({ page }) => {
    // Leave tf_wizard_seen unset so the wizard auto-opens; skip everything
    // else so nothing occludes it.
    await primeStorage(page, { skipQuiz: true });
    await page.goto("/");
    await suppressChrome(page);
    await cinePause(page, HERO); // hold on mascot + "Welcome to Trustfall"

    // Slow read-beat over the three steps
    await cinePause(page, READ);

    // Optional close-shot: dismiss with "Explore on my own" so the hero
    // is briefly visible at the end of the clip — good handoff to seg 2.
    const dismiss = page
      .getByRole("button", { name: /explore on my own/i })
      .first();
    if (await dismiss.isVisible().catch(() => false)) {
      await dismiss.click();
      await cinePause(page, 1500);
    }
  });

  // ─────────────────────────────────────────────────────────────────────────
  // SEGMENT 2 — Hero landing + mascot (~6s)
  //   HyperFrames overlays: title card "Trust is proven, not promised"
  //   fades over the last 2s of this clip.
  // ─────────────────────────────────────────────────────────────────────────
  test("02-hero-landing", async ({ page }) => {
    // Skip both modals so the celebrating mascot + hero copy is uncovered.
    await primeStorage(page, { skipWizard: true, skipQuiz: true });
    await page.goto("/");
    await suppressChrome(page);
    await cinePause(page, HERO);

    // Gentle scroll to reveal the three entry-point cards.
    await page.evaluate(() =>
      window.scrollTo({ top: 500, behavior: "smooth" }),
    );
    await cinePause(page, 2000);
    await page.evaluate(() => window.scrollTo({ top: 0, behavior: "smooth" }));
    await cinePause(page, 1500);
  });

  // ─────────────────────────────────────────────────────────────────────────
  // SEGMENT 3 — Personality quiz (~12s)
  //   The quiz humanizes "what is trust" better than any diagram. 5
  //   questions → mascot-based reveal of the viewer's trust archetype.
  //   Pure local — no wallet.
  // ─────────────────────────────────────────────────────────────────────────
  test("03-personality-quiz", async ({ page }) => {
    // We want the quiz to auto-show, so leave tf_quiz_seen unset; skip the
    // FirstRunWizard so nothing occludes the quiz.
    await primeStorage(page, { skipWizard: true });
    await page.goto("/");
    await suppressChrome(page);
    await cinePause(page, READ);

    // The quiz opens on Q1 (no intro screen). Loop through 5 questions
    // clicking the first answer option, then hold on the archetype reveal.
    // We scope every click to the modal by anchoring on the "Q N of N"
    // progress indicator — this stops us from hitting the "Start learning →"
    // button behind the modal in the Home entry cards.
    for (let step = 0; step < 6; step++) {
      const progress = page.getByText(/Q\d+ of \d+/);
      const inQuestion = await progress.isVisible().catch(() => false);
      if (!inQuestion) break;

      // Find the quiz modal container by ancestry from the progress text,
      // then click the first non-"Skip" answer button inside it.
      const quizModal = page.locator("div").filter({ has: progress }).last();
      const answer = quizModal
        .getByRole("button")
        .filter({ hasNotText: /skip/i })
        .first();
      await answer.click();
      await cinePause(page, 1200);
    }

    // Result screen: mascot + archetype name. Hold — don't click
    // "Start Learning →" because that would navigate away mid-clip.
    await cinePause(page, READ * 2);
  });

  // ─────────────────────────────────────────────────────────────────────────
  // SEGMENT 4 — Tournament evolution (~10s)
  //   Nicky Case "Evolution of Trust" — auto-play generations so the
  //   population bar chart animates. Zero wallet, deterministic.
  // ─────────────────────────────────────────────────────────────────────────
  test("04-tournament-evolution", async ({ page }) => {
    await primeStorage(page, { skipWizard: true, skipQuiz: true });
    await page.goto("/tournament");
    await suppressChrome(page);
    await cinePause(page, READ);

    const autoPlay = page
      .getByRole("button", { name: /auto[-\s]?play|start/i })
      .first();
    if (await autoPlay.isVisible().catch(() => false)) {
      await autoPlay.click();
      await cinePause(page, 8000);
    } else {
      await cinePause(page, 8000);
    }
  });

  // ─────────────────────────────────────────────────────────────────────────
  // SEGMENT 5 — Accreditation ZK (~15s)  ★ lead ZK beat ★
  //   Poseidon Merkle tree membership + nullifier. Prove the viewer is on
  //   the accredited allowlist without revealing which credential is theirs.
  //   Maps to the "identity / compliance proofs" example the hackathon
  //   called out as an especially good fit for Stellar.
  //
  //   Ends before the wallet sign popup — HyperFrames overlays the sign
  //   moment with a "Signing on Stellar…" card and a Poseidon/Merkle diagram.
  // ─────────────────────────────────────────────────────────────────────────
  test("05-accreditation-zk", async ({ page }) => {
    await primeStorage(page, {
      skipWizard: true,
      skipQuiz: true,
      skipZKOnboarding: true,
    });
    // Seed a fake wallet so /play renders the AccreditationPanel + lobby
    // without the Connect prompt occluding them.
    await seedMockWallet(page);
    await page.goto("/play");
    await suppressChrome(page);
    await cinePause(page, READ);

    // Scroll the AccreditationPanel into view — it lives inside /play below
    // the lobby, so we bring it to the top of the frame.
    const panelHeading = page.getByRole("heading", {
      name: /private accreditation/i,
    });
    await panelHeading.waitFor({ state: "visible", timeout: 10_000 });
    await panelHeading.scrollIntoViewIfNeeded();
    await cinePause(page, READ);

    // Expand the "Technical details" so the Merkle root / Poseidon language
    // is visible — this is what earns the ZK claim in the video.
    const techToggle = page.getByText(/technical details/i).first();
    if (await techToggle.isVisible().catch(() => false)) {
      await techToggle.click();
      await cinePause(page, READ);
      await techToggle.click(); // collapse so the next shot is clean
      await cinePause(page, SLOW);
    }

    // Prime the credential selector so the viewer sees a real choice.
    const credSelect = page.locator("select").first();
    if (await credSelect.isVisible().catch(() => false)) {
      await credSelect.selectOption({ index: 1 });
      await cinePause(page, SLOW);
    }

    // Hover the "Prove Accreditation" CTA. If wallet is pre-connected and
    // the contract is already initialized, fire the click and capture the
    // "Generating proof…" → "Verifying on-chain…" transitions live.
    const proveCta = page
      .getByRole("button", { name: /prove accreditation|generating proof/i })
      .first();
    if (await proveCta.isVisible().catch(() => false)) {
      await proveCta.hover();
      await cinePause(page, READ);

      if (process.env.DEMO_WALLET_CONNECTED === "1") {
        await proveCta.click();
        await cinePause(page, 3500); // "Generating proof…" client-side bb.js
      }
    } else {
      // If the panel is in Admin "Initialize Accreditation" state instead,
      // hover that CTA — the narrative still lands.
      const initCta = page
        .getByRole("button", { name: /initialize accreditation/i })
        .first();
      if (await initCta.isVisible().catch(() => false)) {
        await initCta.hover();
        await cinePause(page, READ);
      }
    }
  });

  // ─────────────────────────────────────────────────────────────────────────
  // SEGMENT 6 — Move commitment ZK (~10s)  ★ second ZK beat ★
  //   Player selects Cooperate → "Falling…" spinner = real UltraHonk proof
  //   gen happening client-side. The narrative payoff: this proof makes
  //   the commitment BINDING at commit time, so garbage commits are
  //   rejected before the opponent locks their stake.
  //
  //   Also ends before the wallet sign popup. HyperFrames overlay cuts in.
  // ─────────────────────────────────────────────────────────────────────────
  test("06-commit-and-proof-generation", async ({ page }) => {
    await primeStorage(page, {
      skipWizard: true,
      skipQuiz: true,
      skipZKOnboarding: true,
    });
    await seedMockWallet(page);
    await page.goto("/play");
    await suppressChrome(page);
    await cinePause(page, SLOW);

    const create = page
      .getByRole("button", { name: /create.*(single|game|round)/i })
      .first();
    if (await create.isVisible().catch(() => false)) {
      await create.click();
    } else {
      await page
        .getByRole("button", { name: /create/i })
        .first()
        .click();
    }
    await cinePause(page, READ);

    // Pick Cooperate — the "moral" choice is stronger demo footage.
    const cooperate = page.getByRole("button", { name: /cooperate/i }).first();
    await cooperate.waitFor({ state: "visible", timeout: 10_000 });
    await cooperate.click();
    await cinePause(page, SLOW);

    // Focus the submit CTA — this triggers commit + proof gen when clicked.
    const submit = page
      .getByRole("button", { name: /let go|committing|falling/i })
      .first();
    await expect(submit).toBeVisible({ timeout: 5000 });
    await submit.hover();
    await cinePause(page, READ);

    if (process.env.DEMO_WALLET_CONNECTED === "1") {
      await submit.click();
      await cinePause(page, 2500); // "Falling…" proof-gen state
    }
  });

  // ─────────────────────────────────────────────────────────────────────────
  // SEGMENT 7 — Resolved outcome (~12s)
  //   Requires DEMO_RESOLVED_GAME_ID: a real Resolved game on testnet.
  //   Play one manually, note the id, export it, re-run this spec.
  //   Skipped otherwise — HyperFrames can substitute a mock card.
  // ─────────────────────────────────────────────────────────────────────────
  test("07-resolved-outcome", async ({ page }) => {
    const gameId = process.env.DEMO_RESOLVED_GAME_ID;
    test.skip(
      !gameId,
      "Set DEMO_RESOLVED_GAME_ID to a Resolved testnet gameId",
    );

    await primeStorage(page, {
      skipWizard: true,
      skipQuiz: true,
      skipZKOnboarding: true,
    });
    await page.goto(`/play/${gameId}`);
    await suppressChrome(page);
    await cinePause(page, HERO);

    await page.evaluate(() =>
      window.scrollTo({ top: 300, behavior: "smooth" }),
    );
    await cinePause(page, 3000);
    await page.evaluate(() => window.scrollTo({ top: 0, behavior: "smooth" }));
    await cinePause(page, 2500);
  });

  // ─────────────────────────────────────────────────────────────────────────
  // SEGMENT 8 — Closing hero (~5s)
  //   Back on the landing to close with the URL + mascot.
  // ─────────────────────────────────────────────────────────────────────────
  test("08-close", async ({ page }) => {
    await primeStorage(page, { skipWizard: true, skipQuiz: true });
    await page.goto("/");
    await suppressChrome(page);
    await cinePause(page, HERO);
  });
});
