import { test, expect } from "@playwright/test";

test("landing page loads with main CTA", async ({ page }) => {
  await page.goto("/");
  await expect(page).toHaveTitle(/CMR|MEDIA-IA|Content/i);
  // No blocking JS errors
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.waitForLoadState("networkidle");
  expect(errors).toHaveLength(0);
});

test("security headers present on landing", async ({ request }) => {
  const res = await request.get("/");
  expect(res.headers()["x-frame-options"]).toBe("DENY");
  expect(res.headers()["x-content-type-options"]).toBe("nosniff");
  expect(res.headers()["referrer-policy"]).toBe("strict-origin-when-cross-origin");
});
