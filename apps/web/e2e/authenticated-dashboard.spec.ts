import { createHmac } from "node:crypto";
import { expect, test, type Page } from "@playwright/test";

const API = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000/api";
const JWT_SECRET =
  process.env.JWT_SECRET ??
  "dev_only_min_64_chars_MEDIA_IA_local_secret_change_before_production_2026";

function base64url(value: string) {
  return Buffer.from(value).toString("base64url");
}

function signJwt(payload: Record<string, unknown>) {
  const now = Math.floor(Date.now() / 1000);
  const header = { alg: "HS512", typ: "JWT" };
  const body = { ...payload, iat: now, exp: now + 3600 };
  const data = `${base64url(JSON.stringify(header))}.${base64url(JSON.stringify(body))}`;
  const signature = createHmac("sha512", JWT_SECRET).update(data).digest("base64url");
  return `${data}.${signature}`;
}

const adminToken = signJwt({
  sub: "u11",
  email: "e.rousseau@cmr.tv",
  role: "admin",
  name: "Elise Rousseau",
});

const journalistToken = signJwt({
  sub: "u1",
  email: "a.diop@cmr.tv",
  role: "journalist",
  name: "Aissatou Diop",
});

const adminUser = {
  id: "u11",
  name: "Elise Rousseau",
  email: "e.rousseau@cmr.tv",
  role: "admin",
  team: "Direction",
  initials: "ER",
  color: "#10b981",
};

const journalistUser = {
  id: "u1",
  name: "Aissatou Diop",
  email: "a.diop@cmr.tv",
  role: "journalist",
  team: "Politique",
  initials: "AD",
  color: "#22d3ee",
};

async function seedSession(
  page: Page,
  session: { token: string; user: typeof adminUser },
) {
  await page.addInitScript(({ token, user }) => {
    window.localStorage.setItem("cmr-auth-token", token);
    window.localStorage.setItem(
      "cmr-auth",
      JSON.stringify({
        state: {
          token,
          user,
        },
        version: 0,
      }),
    );
  }, session);
}

async function seedAdminSession(page: Page) {
  await seedSession(page, { token: adminToken, user: adminUser });
}

async function seedJournalistSession(page: Page) {
  await seedSession(page, { token: journalistToken, user: journalistUser });
}

test("authenticated dashboard pages render with API data", async ({ page }) => {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  page.on("console", (message) => {
    if (message.type() === "error") errors.push(message.text());
  });

  await seedAdminSession(page);

  for (const route of [
    "/dashboard",
    "/dashboard/contenus",
    "/dashboard/analytics",
    "/dashboard/diffusion",
    "/dashboard/calendrier",
    "/dashboard/automatisations",
    "/dashboard/workflows",
    "/dashboard/medias",
    "/dashboard/audit",
    "/dashboard/utilisateurs",
  ]) {
    await page.goto(route);
    await page.waitForLoadState("networkidle");
    await expect(page.locator("body")).not.toContainText("This page couldn’t load");
    await expect(page.locator("body")).not.toContainText("Données API indisponibles");
  }

  expect(errors).toEqual([]);
});

test("authenticated API errors are not replaced by mock data", async ({ page }) => {
  await seedAdminSession(page);
  await page.route("**/api/audit", (route) =>
    route.fulfill({
      status: 500,
      contentType: "text/plain",
      body: "boom",
    }),
  );

  await page.goto("/dashboard/audit");
  await page.waitForLoadState("networkidle");
  await expect(page.getByText("Données API indisponibles")).toBeVisible();
  await expect(page.getByText(/HTTP 500/)).toBeVisible();
});

test("RBAC hides restricted navigation for journalist and blocks direct access", async ({ page }) => {
  await seedJournalistSession(page);

  await page.goto("/dashboard");
  await page.waitForLoadState("networkidle");

  const navigation = page.getByRole("complementary", { name: "Navigation principale" });
  await expect(navigation.getByRole("link", { name: /Tableau de bord/i })).toBeVisible();
  await expect(navigation.getByRole("link", { name: /Contenus/i })).toBeVisible();
  await expect(navigation.getByRole("link", { name: /Utilisateurs/i })).toHaveCount(0);
  await expect(navigation.getByRole("link", { name: /Audit/i })).toHaveCount(0);
  await expect(navigation.getByRole("link", { name: /Automatisations/i })).toHaveCount(0);
  await expect(navigation.getByRole("link", { name: /Workflows/i })).toHaveCount(0);

  await page.goto("/dashboard/audit");
  await page.waitForLoadState("networkidle");
  await expect(page.getByText("Accès refusé")).toBeVisible();
});

test("RBAC keeps admin-only navigation visible for admin", async ({ page }) => {
  await seedAdminSession(page);

  await page.goto("/dashboard");
  await page.waitForLoadState("networkidle");

  const navigation = page.getByRole("complementary", { name: "Navigation principale" });
  await expect(navigation.getByRole("link", { name: /Utilisateurs/i })).toBeVisible();
  await expect(navigation.getByRole("link", { name: /Audit/i })).toBeVisible();
  await expect(navigation.getByRole("link", { name: /Automatisations/i })).toBeVisible();
  await expect(navigation.getByRole("link", { name: /Workflows/i })).toBeVisible();
});

test("automation toggle persists through API", async ({ request }) => {
  const headers = { Authorization: `Bearer ${adminToken}` };
  const before = await request.get(`${API}/automations`, { headers });
  expect(before.status()).toBe(200);
  const beforeBody = await before.json();
  const rule = beforeBody.items.find((item: { id: string }) => item.id === "ar1");
  expect(rule).toBeTruthy();

  const target = !rule.active;
  const toggle = await request.patch(`${API}/automations/ar1`, {
    headers,
    data: { active: target },
  });
  expect(toggle.status()).toBe(200);

  const after = await request.get(`${API}/automations`, { headers });
  expect(after.status()).toBe(200);
  const afterBody = await after.json();
  expect(afterBody.items.find((item: { id: string }) => item.id === "ar1")?.active).toBe(target);

  const restore = await request.patch(`${API}/automations/ar1`, {
    headers,
    data: { active: rule.active },
  });
  expect(restore.status()).toBe(200);
});
