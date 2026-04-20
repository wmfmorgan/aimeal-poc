/**
 * auth-flow.spec.ts
 *
 * Phase 2 browser contract: full auth happy-path coverage running against the
 * Netlify dev stack on http://127.0.0.1:8888.
 *
 * Flows covered:
 *   1. Signed-out visit to /household redirects to /auth
 *   2. Sign-up succeeds and lands on /household
 *   3. Login persists across a fresh browser context (AUTH-02)
 *   4. Logout from authenticated shell returns to /auth
 *   5. Password reset: request email → read from Inbucket → follow link → set new password → sign in
 *
 * Implementation notes:
 *   - Each run uses a unique timestamp-based email to avoid DB cleanup dependency
 *   - Inbucket REST API is at http://127.0.0.1:54334 (configured in supabase/config.toml)
 *   - Tests do NOT hit Supabase auth APIs directly — all flows go through the app on port 8888
 */

import { expect, test } from "@playwright/test";

// ---------------------------------------------------------------------------
// Utilities
// ---------------------------------------------------------------------------

function uniqueEmail(prefix = "test"): string {
  return `${prefix}+${Date.now()}@planplate.local`;
}

const DEFAULT_PASSWORD = "PlanPlate2026!";
const NEW_PASSWORD = "PlanPlate2026!New";
const INBUCKET_URL = "http://127.0.0.1:54334";
const APP_URL = "http://127.0.0.1:8888";

/**
 * Fetch the latest email for a given address from the Inbucket REST API.
 * Retries up to maxAttempts with a 1 s delay between attempts.
 */
async function getLatestResetEmail(
  request: import("@playwright/test").APIRequestContext,
  email: string,
  maxAttempts = 10
): Promise<string> {
  // Inbucket expects the mailbox name = local part before @
  const mailbox = email.split("@")[0];

  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    await new Promise((r) => setTimeout(r, 1000));

    const listResponse = await request.get(
      `${INBUCKET_URL}/api/v1/mailbox/${encodeURIComponent(mailbox)}`
    );

    if (!listResponse.ok()) continue;

    const messages = (await listResponse.json()) as Array<{ id: string }>;
    if (!messages || messages.length === 0) continue;

    // Get the most recent message (last in array)
    const latestId = messages[messages.length - 1].id;
    const msgResponse = await request.get(
      `${INBUCKET_URL}/api/v1/mailbox/${encodeURIComponent(mailbox)}/${latestId}`
    );

    if (!msgResponse.ok()) continue;

    const msg = (await msgResponse.json()) as { body: { text?: string; html?: string } };
    return msg.body.html ?? msg.body.text ?? "";
  }

  throw new Error(`No reset email found for ${email} after ${maxAttempts} attempts`);
}

/**
 * Extract the reset link from the email body.
 */
function extractResetLink(emailBody: string): string {
  // Supabase reset emails contain a URL with token_hash and type=recovery
  const match = emailBody.match(/href="([^"]*token_hash=[^"]+)"/i)
    ?? emailBody.match(/(https?:\/\/[^\s"<>]+token_hash=[^\s"<>]+)/i)
    ?? emailBody.match(/href="([^"]*type=recovery[^"]+)"/i)
    ?? emailBody.match(/(https?:\/\/[^\s"<>]+type=recovery[^\s"<>]+)/i);

  if (!match) {
    throw new Error("Could not extract reset link from email body. Body preview: " + emailBody.slice(0, 500));
  }

  return match[1];
}

// ---------------------------------------------------------------------------
// Test: Protected-route redirect
// ---------------------------------------------------------------------------

test("auth flow — signed-out visit to /household redirects to /auth", async ({ page }) => {
  await page.goto(`${APP_URL}/household`);
  await expect(page).toHaveURL(/\/auth/, { timeout: 10_000 });
  await expect(page.getByText("Sign in to PlanPlate")).toBeVisible();
});

// ---------------------------------------------------------------------------
// Test: Sign-up happy path
// ---------------------------------------------------------------------------

test("auth flow — sign-up succeeds and lands on /household", async ({ page }) => {
  const email = uniqueEmail("signup");

  await page.goto(`${APP_URL}/auth`);
  await expect(page.getByText("Sign in to PlanPlate")).toBeVisible({ timeout: 10_000 });

  // Switch to create-account mode
  await page.getByRole("button", { name: "Create account" }).click();
  await expect(page.getByPlaceholder("8 characters minimum")).toBeVisible();

  // Fill in the form
  await page.getByPlaceholder("you@example.com").fill(email);
  await page.getByPlaceholder("8 characters minimum").fill(DEFAULT_PASSWORD);

  // Submit — use the submit-type button
  const submitButton = page.locator("button[type=submit]").filter({ hasText: "Create account" });
  await submitButton.click();

  // Should land on /household
  await expect(page).toHaveURL(/\/household/, { timeout: 15_000 });
  await expect(page.getByText("Household placeholder")).toBeVisible();
});

// ---------------------------------------------------------------------------
// Test: Login persists across fresh browser context (AUTH-02)
// ---------------------------------------------------------------------------

test("auth flow — login persists after closing and reopening the browser context", async ({ browser }) => {
  const email = uniqueEmail("persist");

  // --- First context: sign up and confirm we reach /household ---
  const context1 = await browser.newContext();
  const page1 = await context1.newPage();

  await page1.goto(`${APP_URL}/auth`);
  await expect(page1.getByText("Sign in to PlanPlate")).toBeVisible({ timeout: 10_000 });

  await page1.getByRole("button", { name: "Create account" }).click();
  await page1.getByPlaceholder("you@example.com").fill(email);
  await page1.getByPlaceholder("8 characters minimum").fill(DEFAULT_PASSWORD);
  await page1.locator("button[type=submit]").filter({ hasText: "Create account" }).click();
  await expect(page1).toHaveURL(/\/household/, { timeout: 15_000 });

  // Save storage state (cookies + localStorage including Supabase session)
  const storageState = await context1.storageState();
  await context1.close();

  // --- Second context: load the saved storage state ---
  const context2 = await browser.newContext({ storageState });
  const page2 = await context2.newPage();

  // Navigate directly to a protected route — should NOT be redirected to /auth
  await page2.goto(`${APP_URL}/household`);
  await expect(page2).toHaveURL(/\/household/, { timeout: 15_000 });
  await expect(page2.getByText("Household placeholder")).toBeVisible();
  await context2.close();
});

// ---------------------------------------------------------------------------
// Test: Logout
// ---------------------------------------------------------------------------

test("auth flow — logout from authenticated shell returns to /auth", async ({ page }) => {
  const email = uniqueEmail("logout");

  // Sign up
  await page.goto(`${APP_URL}/auth`);
  await expect(page.getByText("Sign in to PlanPlate")).toBeVisible({ timeout: 10_000 });
  await page.getByRole("button", { name: "Create account" }).click();
  await page.getByPlaceholder("you@example.com").fill(email);
  await page.getByPlaceholder("8 characters minimum").fill(DEFAULT_PASSWORD);
  await page.locator("button[type=submit]").filter({ hasText: "Create account" }).click();
  await expect(page).toHaveURL(/\/household/, { timeout: 15_000 });

  // Click Sign out in the shell
  await page.getByRole("button", { name: /sign out/i }).click();

  // Should land on /auth
  await expect(page).toHaveURL(/\/auth/, { timeout: 10_000 });
  await expect(page.getByText("Sign in to PlanPlate")).toBeVisible();
});

// ---------------------------------------------------------------------------
// Test: Password reset happy path (Inbucket)
// ---------------------------------------------------------------------------

test("auth flow — password reset via Inbucket email link", async ({ page, request }) => {
  const email = uniqueEmail("reset");

  // --- Step 1: Sign up the user ---
  await page.goto(`${APP_URL}/auth`);
  await expect(page.getByText("Sign in to PlanPlate")).toBeVisible({ timeout: 10_000 });
  await page.getByRole("button", { name: "Create account" }).click();
  await page.getByPlaceholder("you@example.com").fill(email);
  await page.getByPlaceholder("8 characters minimum").fill(DEFAULT_PASSWORD);
  await page.locator("button[type=submit]").filter({ hasText: "Create account" }).click();
  await expect(page).toHaveURL(/\/household/, { timeout: 15_000 });

  // --- Step 2: Sign out ---
  await page.getByRole("button", { name: /sign out/i }).click();
  await expect(page).toHaveURL(/\/auth/, { timeout: 10_000 });

  // --- Step 3: Request a password reset ---
  await page.getByText("Forgot password?").click();
  await expect(page.getByText("Send reset link")).toBeVisible();
  await page.getByPlaceholder("you@example.com").fill(email);
  await page.locator("button[type=submit]").filter({ hasText: "Send reset link" }).click();

  // Confirm success banner
  await expect(page.getByText(/check your email/i)).toBeVisible({ timeout: 10_000 });

  // --- Step 4: Retrieve reset email from Inbucket ---
  const emailBody = await getLatestResetEmail(request, email);
  const resetLink = extractResetLink(emailBody);

  // The reset link points to the Supabase auth endpoint (127.0.0.1:54331 typically).
  // We need to follow it so Supabase sets the recovery session, then it redirects to
  // our app at http://127.0.0.1:8888/auth#type=recovery&...
  // Navigate to the link — Playwright will follow redirects
  await page.goto(resetLink);

  // --- Step 5: App should enter reset-complete mode ---
  // The page should end up on /auth with the reset form or be redirected there
  await expect(page).toHaveURL(/\/auth/, { timeout: 15_000 });
  await expect(page.getByText("Set new password")).toBeVisible({ timeout: 10_000 });

  // --- Step 6: Set new password ---
  await page.getByPlaceholder("8 characters minimum").fill(NEW_PASSWORD);
  await page.getByPlaceholder("••••••••").fill(NEW_PASSWORD);
  await page.locator("button[type=submit]").filter({ hasText: "Set new password" }).click();

  // Success feedback
  await expect(page.getByText(/password has been updated/i)).toBeVisible({ timeout: 10_000 });

  // --- Step 7: Should auto-return to sign-in mode after 2.5s ---
  await expect(page.getByText("Sign in to PlanPlate")).toBeVisible({ timeout: 7_000 });

  // --- Step 8: Sign in with the new password ---
  await page.getByPlaceholder("you@example.com").fill(email);
  await page.getByPlaceholder("••••••••").fill(NEW_PASSWORD);
  await page.locator("button[type=submit]").filter({ hasText: /^sign in$/ }).click();

  await expect(page).toHaveURL(/\/household/, { timeout: 15_000 });
  await expect(page.getByText("Household placeholder")).toBeVisible();
});
