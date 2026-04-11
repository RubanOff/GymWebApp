import { expect, test } from "@playwright/test";

const e2eEmail = process.env.E2E_EMAIL;
const e2ePassword = process.env.E2E_PASSWORD;
const allowWrite = process.env.E2E_ALLOW_WRITE === "true";

async function signIn(page: import("@playwright/test").Page) {
  await page.goto("/login");
  await page.getByLabel("Email").fill(e2eEmail ?? "");
  await page.getByLabel("Password").fill(e2ePassword ?? "");
  await page.getByRole("button", { name: "Sign in" }).click();
  await expect(page).toHaveURL(/\/dashboard$/);
}

test("redirects unauthenticated users to login and renders auth UI", async ({ page }) => {
  await page.goto("/");
  await expect(page).toHaveURL(/\/login$/);

  await expect(
    page.getByRole("heading", { name: "Get in, log workout, get out." }),
  ).toBeVisible();
  await expect(page.getByLabel("Email")).toBeVisible();
  await expect(page.getByLabel("Password")).toBeVisible();
  await expect(page.getByRole("button", { name: "Sign in" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Send magic link" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Send password reset link" })).toBeVisible();
});

test.describe("authenticated smoke", () => {
  test.skip(!e2eEmail || !e2ePassword, "E2E_EMAIL and E2E_PASSWORD are required.");

  test("opens core protected screens after login", async ({ page }) => {
    await signIn(page);

    await expect(
      page.getByRole("heading", { name: "Ready to train?" }),
    ).toBeVisible();

    await page.goto("/history");
    await expect(page.getByRole("heading", { name: "History" })).toBeVisible();

    await page.goto("/templates");
    await expect(
      page.getByRole("heading", { name: "Templates", exact: true }),
    ).toBeVisible();

    await page.goto("/progress");
    await expect(page.getByRole("heading", { name: "Progress" })).toBeVisible();

    await page.goto("/workouts/new");
    await expect(page.getByRole("heading", { name: "New workout" })).toBeVisible();
  });

  test("can create a workout when write smoke is enabled", async ({ page }) => {
    test.skip(!allowWrite, "Set E2E_ALLOW_WRITE=true to enable write smoke.");

    await signIn(page);
    await page.goto("/workouts/new");

    const title = `E2E Workout ${Date.now()}`;
    await page.getByLabel("Title").fill(title);
    await page.getByRole("button", { name: "Create workout" }).click();

    await expect(page).toHaveURL(/\/workouts\/.+$/);
    await expect(
      page.getByRole("heading", { name: "Workout", exact: true }),
    ).toBeVisible();
    await expect(page.getByLabel("Title")).toHaveValue(title);
  });
});
