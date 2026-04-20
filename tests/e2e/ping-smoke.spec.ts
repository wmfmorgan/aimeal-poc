/**
 * ping-smoke.spec.ts
 *
 * Revised Phase 2 browser smoke contract.
 *
 * Phase 1 directly asserted "API Connected" at `/`. After Phase 2 introduced
 * global route protection, a signed-out visit to `/` redirects to `/auth` —
 * the old assertion would fail because `/auth` is now the landing surface.
 *
 * This suite covers two things:
 *   1. Signed-out redirect: a fresh visit to `/` lands on `/auth` (not a raw home page)
 *   2. Connectivity proof: the Netlify → Supabase tRPC path still works, now verified
 *      through the `/auth` page which hosts the ConnectivityProof component for
 *      signed-out users
 */

import { expect, test } from "@playwright/test";

test("ping smoke — signed-out visit to / redirects to /auth", async ({ page }) => {
  await page.goto("/");

  // After route protection, unsigned users are sent to /auth
  await expect(page).toHaveURL(/\/auth/, { timeout: 15_000 });
  await expect(page.getByText("Sign in to PlanPlate")).toBeVisible();
});

test("ping smoke — connectivity badge visible on /auth for signed-out users", async ({ page }) => {
  // The ConnectivityProof component lives on /auth; it uses the same
  // usePingStatus hook that previously appeared on the home page.
  await page.goto("/auth");

  // Wait for the connectivity badge to resolve (it makes a live tRPC call through Netlify)
  await expect(page.getByText("API Connected")).toBeVisible({ timeout: 20_000 });
  await expect(page.getByText(/connectivity/i)).toBeVisible();
});
