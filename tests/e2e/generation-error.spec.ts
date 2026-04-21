import { expect, test, type Page, type Route } from "@playwright/test";

const DEFAULT_PASSWORD = "PlanPlate2026!";

function uniqueEmail(prefix = "generation-error"): string {
  return `${prefix}+${Date.now()}@planplate.local`;
}

async function signUp(page: Page, prefix: string) {
  const email = uniqueEmail(prefix);

  await page.goto("/auth");
  await page.getByRole("button", { name: "Create account" }).click();
  await page.getByPlaceholder("you@example.com").fill(email);
  await page.getByPlaceholder("8 characters minimum").fill(DEFAULT_PASSWORD);
  await page.locator("button[type=submit]").filter({ hasText: "Create account" }).click();
  await expect(page).toHaveURL(/\/household/, { timeout: 15_000 });
}

function trpcJson(data: unknown) {
  return JSON.stringify([{ result: { data } }]);
}

async function mockHousehold(route: Route) {
  await route.fulfill({
    status: 200,
    contentType: "application/json",
    body: trpcJson({
      id: "household-test-id",
      name: "Morgan Family",
      cookingSkillLevel: "intermediate",
      appliances: ["oven", "air fryer"],
      members: [
        {
          id: "member-1",
          name: "Alex",
          allergies: ["peanuts"],
          avoidances: ["olives"],
          dietType: "",
        },
      ],
    }),
  });
}

test.describe("Generation stream error", () => {
  test("failed start shows StreamErrorBanner and retry returns to form", async ({ page }) => {
    await signUp(page, "generation-error-start");

    await page.route("**/functions/v1/trpc/household.get**", mockHousehold);
    await page.route("**/functions/v1/trpc/mealPlan.create**", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: trpcJson({ id: "test-plan-id-error" }),
      });
    });
    await page.route("**/functions/v1/generate-draft", async (route) => {
      await route.fulfill({
        status: 500,
        body: "Internal Server Error",
      });
    });

    await page.goto("/plan/new");
    await page.getByRole("button", { name: /Generate Your Plan/i }).click();

    await expect(page.getByRole("alert").filter({ hasText: /generation failed to start/i })).toBeVisible();
    await expect(page.getByRole("button", { name: "Try again →" })).toBeVisible();

    await page.getByRole("button", { name: "Try again →" }).click();
    await expect(page.getByText("Generate your meal plan draft")).toBeVisible();
  });

  test("mid-stream failure preserves partial cards and surfaces retry", async ({ page }) => {
    await page.addInitScript(() => {
      const originalFetch = window.fetch.bind(window);

      window.fetch = async (input, init) => {
        const url = typeof input === "string" ? input : input.url;
        if (!url.includes("/functions/v1/generate-draft")) {
          return originalFetch(input, init);
        }

        const encoder = new TextEncoder();
        const stream = new ReadableStream<Uint8Array>({
          start(controller) {
            controller.enqueue(
              encoder.encode(
                'data: {"day_of_week":"Monday","meal_type":"breakfast","title":"Crispy Breakfast Hash","short_description":"Potatoes, peppers, and eggs in one skillet."}\n\n'
              )
            );
            setTimeout(() => {
              controller.error(new Error("Mock stream failure"));
            }, 0);
          },
        });

        return new Response(stream, {
          status: 200,
          headers: { "Content-Type": "text/event-stream" },
        });
      };
    });

    await signUp(page, "generation-error-partial");

    await page.route("**/functions/v1/trpc/household.get**", mockHousehold);
    await page.route("**/functions/v1/trpc/mealPlan.create**", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: trpcJson({ id: "test-plan-id-partial" }),
      });
    });

    await page.goto("/plan/new");
    await page.getByRole("button", { name: /Generate Your Plan/i }).click();

    await expect(page.getByText("Crispy Breakfast Hash")).toBeVisible({ timeout: 3000 });
    await expect(page.getByRole("alert").filter({ hasText: /stream/i })).toBeVisible({ timeout: 3000 });
    await expect(page.getByText("Crispy Breakfast Hash")).toBeVisible();
  });
});
