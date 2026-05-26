import { test, expect } from "@playwright/test";

const API = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000/api";

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
  const res = await request.post(`${API}/auth/login`, {
    data: { email: "e.rousseau@cmr.tv", password: "cmr2025!Dev" },
  });
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
