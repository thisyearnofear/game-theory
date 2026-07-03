/**
 * Diagnostic: what does /play actually render when we seed a mock wallet?
 * Not part of the demo capture — throwaway.
 */
import { test } from "@playwright/test";

test("diagnose /play with mock wallet", async ({ page }) => {
  const errors: string[] = [];
  page.on("pageerror", (err) => errors.push(`pageerror: ${err.message}`));
  page.on("console", (msg) => {
    if (msg.type() === "error") errors.push(`console.error: ${msg.text()}`);
  });

  await page.addInitScript(() => {
    try {
      localStorage.clear();
      localStorage.setItem("walletId", "mock-e2e");
      localStorage.setItem(
        "walletAddress",
        "GBWV32TY5M6PLR23DPCU56XCPKS2R74NS2N2UA5PTCOM5LRSRCIFM5LL",
      );
      localStorage.setItem("walletNetwork", "TESTNET");
      localStorage.setItem(
        "networkPassphrase",
        "Test SDF Network ; September 2015",
      );
      localStorage.setItem("zk_onboarding_seen", "1");
    } catch {
      /* ignored */
    }
  });

  await page.goto("/play");
  await page.waitForTimeout(4000);

  const title = await page.title();
  const bodyText = (await page.locator("body").innerText()).slice(0, 600);
  const headings = await page.locator("h1, h2, h3, h4").allInnerTexts();
  const buttons = await page.locator("button:visible").allInnerTexts();

  console.log("PAGE_TITLE:", title);
  console.log("HEADINGS:", JSON.stringify(headings.slice(0, 20)));
  console.log("BUTTONS:", JSON.stringify(buttons.slice(0, 30)));
  console.log("BODY_TOP:", bodyText);
  console.log("PAGE_ERRORS:", JSON.stringify(errors.slice(0, 10)));
});
