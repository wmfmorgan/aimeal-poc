import { expect, test } from "@playwright/test";

test("ping smoke", async ({ page }) => {
  await page.goto("/");

  await expect(page.getByText("API Connected")).toBeVisible({ timeout: 20_000 });
  await expect(
    page.getByText(/the frontend can reach the local Supabase tRPC edge function through Netlify/i)
  ).toBeVisible();
});
