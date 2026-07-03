import { test, expect, Page } from "@playwright/test";

/**
 * Trustfall hackathon demo capture.
 *
 * Records seven segments as WebM. Each segment becomes a clip HyperFrames
 * composites into the final 2:30 video. Segments are ordered to match the
 * `product-launch-video` skill's shot list.
 *
 * Wallet signing is out-of-DOM (Freighter popup) — those moments are the
 * scripted pauses at the end of segment 5 & 6. HyperFrames covers them with
 * "Signing on Stellar…" overlay cards; segment 7 shows the resolved outcome
 * by hitting a pre-existing `/play/:gameId` URL.
 *
 * Env vars:
 *   BASE_URL              — default http://localhost:5173
 *   DEMO_RESOLVED_GAME_ID — a Resolved gameId on testnet for segment 7
 *                           (pick one from lobby after running a real game)
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
      /* Freeze the mascot's idle sway — it's cute in-app, distracting in a demo */
      .tf-sway { animation: none !important; }
    `,
  });
}

test.describe("Trustfall demo capture", () => {
  test.beforeEach(async ({ page }) => {
    // Fresh state each run so the onboarding overlay always fires.
    await page.context().clearCookies();
    await page.addInitScript(() => {
      try {
        localStorage.clear();
        sessionStorage.clear();
      } catch {
        // storage may be locked before origin loads — ignored
      }
    });
  });

  // ─────────────────────────────────────────────────────────────────────────
  // SEGMENT 1 — Hero landing (~6s)
  //   HyperFrames overlays: title card "Trustfall — Trust is proven, not
  //   promised" fades over the last 2s of this clip.
  // ─────────────────────────────────────────────────────────────────────────
  test("01-hero-landing", async ({ page }) => {
    await page.goto("/");
    await suppressChrome(page);
    await cinePause(page, HERO);

    // Slow scroll reveals below-fold value props if any exist
    await page.evaluate(() =>
      window.scrollTo({ top: 400, behavior: "smooth" }),
    );
    await cinePause(page, 2000);
    await page.evaluate(() => window.scrollTo({ top: 0, behavior: "smooth" }));
    await cinePause(page, 1500);
  });

  // ─────────────────────────────────────────────────────────────────────────
  // SEGMENT 2 — Tutorial vs AI (~15s)
  //   The Prisoner's Dilemma concept, one round against an AI strategy.
  //   Pure local — no wallet, deterministic.
  // ─────────────────────────────────────────────────────────────────────────
  test("02-tutorial-vs-ai", async ({ page }) => {
    await page.goto("/learn/play");
    await suppressChrome(page);
    await cinePause(page, READ);

    // Play a mutual-cooperation round so the payoff feels good on screen.
    // Selector is text-based so it survives styling changes.
    const cooperate = page.getByRole("button", { name: /cooperate/i }).first();
    await cooperate.waitFor({ state: "visible", timeout: 10_000 });
    await cinePause(page, SLOW);
    await cooperate.click();
    await cinePause(page, READ);

    // Second round — betray, so the viewer sees the payoff math flip.
    const defect = page.getByRole("button", { name: /defect/i }).first();
    if (await defect.isVisible().catch(() => false)) {
      await defect.click();
      await cinePause(page, READ);
    }
  });

  // ─────────────────────────────────────────────────────────────────────────
  // SEGMENT 3 — Tournament evolution (~12s)
  //   Nicky Case "Evolution of Trust" — auto-play a few generations so the
  //   population bar chart animates. Zero wallet, deterministic.
  // ─────────────────────────────────────────────────────────────────────────
  test("03-tournament-evolution", async ({ page }) => {
    await page.goto("/tournament");
    await suppressChrome(page);
    await cinePause(page, READ);

    const autoPlay = page
      .getByRole("button", { name: /auto[-\s]?play|start/i })
      .first();
    if (await autoPlay.isVisible().catch(() => false)) {
      await autoPlay.click();
      // Let it churn — this is the visual money shot of the tournament view.
      await cinePause(page, 8000);
    } else {
      // Fallback: hold on the static view; HyperFrames can Ken-Burns it.
      await cinePause(page, 8000);
    }
  });

  // ─────────────────────────────────────────────────────────────────────────
  // SEGMENT 4 — ZK Lobby + onboarding (~15s)
  //   The 3-step ZK explainer overlay is the load-bearing narrative beat.
  // ─────────────────────────────────────────────────────────────────────────
  test("04-zk-lobby-and-onboarding", async ({ page }) => {
    await page.goto("/play");
    await suppressChrome(page);
    await cinePause(page, READ);

    // First-run overlay: click through all 3 steps.
    for (let step = 0; step < 3; step++) {
      const next = page
        .getByRole("button", { name: /next|let's play/i })
        .first();
      if (!(await next.isVisible().catch(() => false))) break;
      await cinePause(page, READ);
      await next.click();
      await cinePause(page, SLOW);
    }

    // Back in the lobby. Hold on the list of open testnet games.
    await cinePause(page, READ);
  });

  // ─────────────────────────────────────────────────────────────────────────
  // SEGMENT 5 — The ZK moment (~10s)  ★ core beat ★
  //   User selects Cooperate → "Falling…" spinner = real UltraHonk proof gen
  //   happening client-side (@aztec/bb.js). This is what proves ZK is
  //   load-bearing, not a slide.
  //
  //   NOTE: This segment ends BEFORE the wallet sign popup. HyperFrames
  //   layers a "Signing on Stellar…" card over the last 2s.
  // ─────────────────────────────────────────────────────────────────────────
  test("05-commit-and-proof-generation", async ({ page }) => {
    // Skip onboarding by pre-setting the seen flag so we jump straight to the
    // create flow.
    await page.addInitScript(() => {
      localStorage.setItem("zk_onboarding_seen", "1");
    });

    await page.goto("/play");
    await suppressChrome(page);
    await cinePause(page, SLOW);

    // Enter the create flow. Text may drift — grep the button by an inclusive
    // regex so the script survives copy changes.
    const create = page
      .getByRole("button", { name: /create.*(single|game|round)/i })
      .first();
    if (await create.isVisible().catch(() => false)) {
      await create.click();
    } else {
      // Fallback: any "Create" button in the lobby
      await page
        .getByRole("button", { name: /create/i })
        .first()
        .click();
    }
    await cinePause(page, READ);

    // Pick Cooperate — the "moral" choice makes better demo footage.
    const cooperate = page.getByRole("button", { name: /cooperate/i }).first();
    await cooperate.waitFor({ state: "visible", timeout: 10_000 });
    await cooperate.click({ trial: false });
    await cinePause(page, SLOW);

    // Click "✋ Let go" — this triggers commitment + proof generation.
    // Without a connected wallet the flow stops at the wallet check, which
    // is exactly what we want: the button transitions to "Falling…" only if
    // a wallet is connected. For the pure UI capture we hover the CTA and
    // hold so HyperFrames can overlay the proof-gen animation.
    const submit = page
      .getByRole("button", { name: /let go|committing|falling/i })
      .first();
    await expect(submit).toBeVisible({ timeout: 5000 });
    await submit.hover();
    await cinePause(page, READ);

    // If a wallet IS connected (e.g. Freighter with a fresh testnet key
    // pre-approved for this origin), fire the click and let the "Falling…"
    // state render for ~2s. If not, we've already captured the pre-click
    // state above — HyperFrames handles the rest.
    if (process.env.DEMO_WALLET_CONNECTED === "1") {
      await submit.click();
      await cinePause(page, 2500); // "Falling…" proof-gen state
    }
  });

  // ─────────────────────────────────────────────────────────────────────────
  // SEGMENT 6 — Resolved outcome (~12s)
  //   Requires DEMO_RESOLVED_GAME_ID: a real Resolved game on testnet.
  //   Play one manually, note the id, export it, re-run this spec.
  //   Skipped otherwise — HyperFrames can substitute a mock card.
  // ─────────────────────────────────────────────────────────────────────────
  test("06-resolved-outcome", async ({ page }) => {
    const gameId = process.env.DEMO_RESOLVED_GAME_ID;
    test.skip(
      !gameId,
      "Set DEMO_RESOLVED_GAME_ID to a Resolved testnet gameId",
    );

    await page.goto(`/play/${gameId}`);
    await suppressChrome(page);
    await cinePause(page, HERO);

    // Slow pan by scrolling if the result card is tall
    await page.evaluate(() =>
      window.scrollTo({ top: 300, behavior: "smooth" }),
    );
    await cinePause(page, 3000);
    await page.evaluate(() => window.scrollTo({ top: 0, behavior: "smooth" }));
    await cinePause(page, 2500);
  });

  // ─────────────────────────────────────────────────────────────────────────
  // SEGMENT 7 — Closing hero (~5s)
  //   Back on the landing to close the loop with the URL.
  // ─────────────────────────────────────────────────────────────────────────
  test("07-close", async ({ page }) => {
    await page.goto("/");
    await suppressChrome(page);
    await cinePause(page, HERO);
  });
});
