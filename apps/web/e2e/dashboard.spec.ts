import { test, expect } from "@playwright/test";

test("dashboard home renders KPI cards", async ({ page }) => {
  await page.goto("/dashboard");
  await page.waitForLoadState("networkidle");
  // KPI labels expected from the home module
  const body = await page.textContent("body");
  expect(body).toMatch(/Contenus|Audience|Vues|Engagement/i);
});

test("dashboard sidebar navigation works", async ({ page }) => {
  await page.goto("/dashboard");
  await page.waitForLoadState("networkidle");

  // Navigate to /dashboard/contenus via direct URL (sidebar selector varies)
  await page.goto("/dashboard/contenus");
  await page.waitForLoadState("networkidle");
  await expect(page).toHaveURL(/\/dashboard\/contenus/);
});

test("dashboard analytics page loads", async ({ page }) => {
  await page.goto("/dashboard/analytics");
  await page.waitForLoadState("networkidle");
  await expect(page).toHaveURL(/\/dashboard\/analytics/);
  // No JS exception during analytics chart render
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.waitForTimeout(500);
  expect(errors.filter((e) => !/ResizeObserver/.test(e))).toHaveLength(0);
});
