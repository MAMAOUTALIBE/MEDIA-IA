import { test, expect, type APIRequestContext, type Page } from "@playwright/test";

const API = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000/api";

test.describe.configure({ mode: "serial" });

async function loginWithRetry(request: APIRequestContext) {
  for (let attempt = 0; attempt < 14; attempt += 1) {
    const res = await request.post(`${API}/auth/login`, {
      data: { email: "e.rousseau@cmr.tv", password: "cmr2025!Dev" },
    });
    if (res.status() !== 429) return res;
    await new Promise((resolve) => setTimeout(resolve, 5_000));
  }
  return request.post(`${API}/auth/login`, {
    data: { email: "e.rousseau@cmr.tv", password: "cmr2025!Dev" },
  });
}

async function submitUiLoginWithRetry(page: Page) {
  for (let attempt = 0; attempt < 14; attempt += 1) {
    const responsePromise = page.waitForResponse(
      (response) =>
        response.url().includes("/api/auth/login") && response.request().method() === "POST",
      { timeout: 20_000 },
    );
    await page.getByRole("button", { name: /^Se connecter$/i }).click();
    const res = await responsePromise;
    if (res.status() !== 429) return res;
    await page.waitForTimeout(5_000);
  }

  const responsePromise = page.waitForResponse(
    (response) =>
      response.url().includes("/api/auth/login") && response.request().method() === "POST",
    { timeout: 20_000 },
  );
  await page.getByRole("button", { name: /^Se connecter$/i }).click();
  return responsePromise;
}

test("API health is publicly reachable", async ({ request }) => {
  const res = await request.get(`${API}/health`);
  expect(res.status()).toBe(200);
  const body = await res.json();
  expect(body.ok).toBe(true);
});

test("API protected route returns 401 without token", async ({ request }) => {
  const res = await request.get(`${API}/users`);
  expect(res.status()).toBe(401);
});

test("API login flow returns JWT for valid creds", async ({ request }) => {
  test.setTimeout(90_000);
  const res = await loginWithRetry(request);
  expect(res.status()).toBe(201);
  const body = await res.json();
  expect(body.token).toBeTruthy();
  expect(body.user.role).toBe("admin");

  // Token works on protected endpoint
  const me = await request.get(`${API}/auth/me`, {
    headers: { Authorization: `Bearer ${body.token}` },
  });
  expect(me.status()).toBe(200);
  const meBody = await me.json();
  expect(meBody.email).toBe("e.rousseau@cmr.tv");
});

test("UI login/logout flow refreshes, persists and clears the session", async ({ page }) => {
  test.setTimeout(100_000);

  await page.context().clearCookies();
  await page.goto("/dashboard", { waitUntil: "domcontentloaded" });
  await page.evaluate(() => {
    window.localStorage.clear();
    window.sessionStorage.clear();
  });
  await page.reload({ waitUntil: "networkidle" });

  await page.getByRole("button", { name: "Menu utilisateur" }).click();
  await expect(page.getByText("Mode démo · non authentifié")).toBeVisible();
  await page.getByRole("menuitem", { name: /Se connecter/i }).click();

  await expect(page.getByRole("dialog", { name: /Connexion CMR/i })).toBeVisible();
  await page.getByLabel("Email").fill("e.rousseau@cmr.tv");
  await page.getByLabel("Mot de passe").fill("cmr2025!Dev");

  const login = await submitUiLoginWithRetry(page);
  expect(login.status()).toBe(201);
  await expect(page.getByRole("dialog", { name: /Connexion CMR/i })).toBeHidden();
  await expect
    .poll(() => page.evaluate(() => window.localStorage.getItem("cmr-auth-token")))
    .toBeTruthy();

  await page.getByRole("button", { name: "Menu utilisateur" }).click();
  await expect(page.getByText("Connecté JWT")).toBeVisible();

  await page.keyboard.press("Escape");
  await page.evaluate(() => {
    window.localStorage.removeItem("cmr-auth-token");
    window.localStorage.removeItem("cmr-auth");
  });
  const refresh = page.waitForResponse(
    (response) =>
      response.url().includes("/api/auth/refresh") && response.request().method() === "POST",
  );
  await page.reload({ waitUntil: "networkidle" });
  expect((await refresh).status()).toBe(201);
  await expect
    .poll(() => page.evaluate(() => window.localStorage.getItem("cmr-auth-token")))
    .toBeTruthy();

  await page.getByRole("button", { name: "Menu utilisateur" }).click();
  await expect(page.getByText("Connecté JWT")).toBeVisible();

  const logout = page.waitForResponse(
    (response) =>
      response.url().includes("/api/auth/logout") && response.request().method() === "POST",
  );
  await page.getByRole("menuitem", { name: /Se déconnecter/i }).click();
  expect((await logout).status()).toBe(201);

  await page.getByRole("button", { name: "Menu utilisateur" }).click();
  await expect(page.getByText("Mode démo · non authentifié")).toBeVisible();
  await expect
    .poll(() => page.evaluate(() => window.localStorage.getItem("cmr-auth-token")))
    .toBeNull();
});
