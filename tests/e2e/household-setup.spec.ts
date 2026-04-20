import { expect, test } from "@playwright/test";

const DEFAULT_PASSWORD = "PlanPlate2026!";

function uniqueEmail(prefix = "household"): string {
  return `${prefix}+${Date.now()}@planplate.local`;
}

async function signUpAndLandOnHousehold(page: import("@playwright/test").Page, prefix: string) {
  const email = uniqueEmail(prefix);

  await page.goto("/auth");
  await page.getByRole("button", { name: "Create account" }).click();
  await page.getByPlaceholder("you@example.com").fill(email);
  await page.getByPlaceholder("8 characters minimum").fill(DEFAULT_PASSWORD);
  await page.locator("button[type=submit]").filter({ hasText: "Create account" }).click();

  await expect(page).toHaveURL(/\/household/, { timeout: 15_000 });
}

async function clickSaveAndWait(page: import("@playwright/test").Page) {
  const saveResponsePromise = page.waitForResponse(
    (response) =>
      response.url().includes("/functions/v1/trpc") &&
      response.request().method() === "POST",
    { timeout: 15_000 }
  );

  await page.getByRole("button", { name: "Save Household" }).click();

  await saveResponsePromise;
}

function successAlert(page: import("@playwright/test").Page) {
  return page.getByRole("alert").filter({
    hasText: "Household saved. Your meal plans will reflect these preferences.",
  });
}

test.describe("Household Setup", () => {
  test("create flow saves a new household and keeps the user on /household", async ({ page }) => {
    await signUpAndLandOnHousehold(page, "household-create");

    await expect(page.getByText("Set up your household to get personalised plans")).toBeVisible();

    await page.getByLabel("Household Name").fill("Editorial Test House");
    await page.getByRole("button", { name: "Intermediate" }).click();
    await page.getByRole("button", { name: "+ Add Member" }).click();
    await page.getByLabel("Name").last().fill("Alex");
    await page.getByRole("button", { name: "Milk" }).click();
    await page.getByRole("button", { name: "Air Fryer" }).click();
    await clickSaveAndWait(page);

    await expect(successAlert(page)).toBeVisible({ timeout: 10_000 });
    await expect(page).toHaveURL(/\/household/);
    await expect(page.getByLabel("Household Name")).toHaveValue("Editorial Test House");
  });

  test("save with no household name or members shows validation and skips persistence", async ({ page }) => {
    await signUpAndLandOnHousehold(page, "household-validation");

    await page.getByRole("button", { name: "Save Household" }).click();

    await expect(page.getByText("Household name is required.")).toBeVisible();
    await expect(page.getByText("Add at least one household member before saving.")).toBeVisible();
  });

  test("revisiting /household pre-fills the saved form and hides the welcome nudge", async ({ page }) => {
    await signUpAndLandOnHousehold(page, "household-edit");

    const uniqueName = `E2E House ${Date.now()}`;

    await page.getByLabel("Household Name").fill(uniqueName);
    await page.getByRole("button", { name: "Beginner" }).click();
    await page.getByRole("button", { name: "+ Add Member" }).click();
    await page.getByLabel("Name").last().fill("Jamie");
    await clickSaveAndWait(page);

    await expect(successAlert(page)).toBeVisible({ timeout: 10_000 });

    await page.goto("/");
    await page.goto("/household");

    await expect(page.getByLabel("Household Name")).toHaveValue(uniqueName);
    await expect(page.getByText("Set up your household to get personalised plans")).toHaveCount(0);
  });

  test("member management supports expand, edit, and inline delete confirmation", async ({ page }) => {
    await signUpAndLandOnHousehold(page, "household-member");

    await page.getByLabel("Household Name").fill("Member Control House");
    await page.getByRole("button", { name: "Advanced" }).click();
    await page.getByRole("button", { name: "+ Add Member" }).click();
    await page.getByLabel("Name").last().fill("Taylor");
    await clickSaveAndWait(page);

    await expect(successAlert(page)).toBeVisible({ timeout: 10_000 });

    await page.getByRole("button", { name: "Edit Member" }).click();
    await page.getByRole("button", { name: "Peanuts" }).click();
    await page.getByLabel("Diet Type").selectOption("vegan");
    await page.getByRole("button", { name: "Done Editing" }).click();

    await expect(page.getByText(/Vegan · Peanuts/i)).toBeVisible();

    await page.getByRole("button", { name: "Remove" }).first().click();
    await expect(page.getByText("Are you sure you want to remove this member?")).toBeVisible();
    await page.getByRole("button", { name: "Cancel" }).click();
    await expect(page.getByText("Are you sure you want to remove this member?")).toHaveCount(0);

    await page.getByRole("button", { name: "Remove" }).first().click();
    const confirmation = page
      .locator("article")
      .filter({ hasText: "Are you sure you want to remove this member?" })
      .first();
    await confirmation.getByRole("button", { name: "Remove" }).click();
    await expect(page.getByText("No members yet. Add at least one person so the AI can personalize your plan.")).toBeVisible();
  });
});
