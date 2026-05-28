#!/usr/bin/env node
/**
 * Module-by-module functional audit.
 *
 * Visits every dashboard route as an authenticated admin, captures:
 *  - HTTP status of the route
 *  - JS console errors / page errors
 *  - presence of skeleton-stuck states (no real content rendered)
 *  - failed network requests (4xx/5xx)
 *  - screenshot per module
 *
 * Outputs a structured JSON report + summary table.
 *
 * Usage:  node infra/scripts/audit-modules.mjs
 *         WEB=http://192.168.1.166:3001 node infra/scripts/audit-modules.mjs
 */
import { chromium } from "playwright";
import { writeFileSync, mkdirSync } from "node:fs";

const WEB = process.env.WEB ?? "http://localhost:3001";
const API = process.env.API ?? "http://localhost:4001";
const ADMIN_EMAIL = process.env.ADMIN_EMAIL ?? "e.rousseau@cmr.tv";
const ADMIN_PWD = process.env.ADMIN_PWD ?? "cmr2025!Dev";
const OUT_DIR = "/tmp/cmr-audit";
mkdirSync(OUT_DIR, { recursive: true });

// Acquire a real JWT via the live login endpoint instead of a fake stub token
// so dashboard data fetches actually succeed under test.
async function login() {
  const r = await fetch(`${API}/api/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email: ADMIN_EMAIL, password: ADMIN_PWD }),
  });
  if (!r.ok) throw new Error(`Login failed: HTTP ${r.status}`);
  const body = await r.json();
  return { token: body.token, user: body.user };
}

console.log(`Logging in as ${ADMIN_EMAIL}...`);
const { token, user } = await login();
console.log(`✓ Token acquired for ${user.email} (${user.role})\n`);

const MODULES = [
  { slug: "landing", path: "/" },
  { slug: "dashboard-home", path: "/dashboard" },
  { slug: "contenus", path: "/dashboard/contenus" },
  { slug: "medias", path: "/dashboard/medias" },
  { slug: "live", path: "/dashboard/live" },
  { slug: "calendrier", path: "/dashboard/calendrier" },
  { slug: "workflows", path: "/dashboard/workflows" },
  { slug: "automatisations", path: "/dashboard/automatisations" },
  { slug: "diffusion", path: "/dashboard/diffusion" },
  { slug: "analytics", path: "/dashboard/analytics" },
  { slug: "audit", path: "/dashboard/audit" },
  { slug: "utilisateurs", path: "/dashboard/utilisateurs" },
  { slug: "parametres", path: "/dashboard/parametres" },
  { slug: "mobile", path: "/mobile" },
  { slug: "mobile-contenus", path: "/mobile/contenus" },
  { slug: "mobile-publish", path: "/mobile/publish" },
];

const browser = await chromium.launch({
  args: ["--autoplay-policy=no-user-gesture-required"],
});
const ctx = await browser.newContext({
  viewport: { width: 1440, height: 900 },
  deviceScaleFactor: 2,
});

// Seed both stores:
//  - `cmr-auth-token`  → consumed directly by the fetch wrapper (api-client)
//  - `cmr-auth`        → Zustand persisted state; without it, bootstrap()
//    treats the session as missing and triggers a doomed /auth/refresh.
await ctx.addInitScript(
  ({ token, user }) => {
    localStorage.setItem("cmr-auth-token", token);
    localStorage.setItem(
      "cmr-auth",
      JSON.stringify({ state: { user, token }, version: 0 }),
    );
  },
  { token, user },
);

const results = [];

for (const mod of MODULES) {
  const url = `${WEB}${mod.path}`;
  const page = await ctx.newPage();
  const consoleErrors = [];
  const pageErrors = [];
  const failedRequests = [];

  page.on("console", (msg) => {
    if (msg.type() === "error") consoleErrors.push(msg.text().slice(0, 300));
  });
  page.on("pageerror", (err) => pageErrors.push(String(err).slice(0, 300)));
  page.on("requestfailed", (req) => {
    const url = req.url();
    // Ignore unrelated noise — favicons, source maps, browser extensions.
    if (/\.map$/.test(url) || /favicon/.test(url)) return;
    failedRequests.push(`${req.method()} ${url} — ${req.failure()?.errorText ?? "unknown"}`);
  });
  page.on("response", (res) => {
    if (res.status() >= 400 && !res.url().includes(WEB + "/_next/data/")) {
      // Skip Next.js prefetch data 404s which are expected on app-router.
      const target = res.url();
      if (target.includes("/api/") || target.startsWith(WEB)) {
        failedRequests.push(`HTTP ${res.status()} ← ${target}`);
      }
    }
  });

  let status = 0;
  let title = "";
  let h1 = "";
  let hasContent = false;
  let loaded = false;
  try {
    const response = await page.goto(url, { waitUntil: "networkidle", timeout: 25000 });
    status = response?.status() ?? 0;
    await page.waitForTimeout(1200);
    title = await page.title();
    h1 = (await page.locator("h1").first().textContent({ timeout: 2000 }).catch(() => "")) ?? "";
    // Heuristic: page has real content if it has > 1 h1/h2/h3 OR many buttons/tables.
    hasContent = await page.evaluate(() => {
      const heads = document.querySelectorAll("h1, h2, h3").length;
      const buttons = document.querySelectorAll("button").length;
      const tables = document.querySelectorAll("table").length;
      const cards = document.querySelectorAll('[class*="rounded-2xl"], [class*="rounded-xl"]').length;
      return heads >= 1 || buttons >= 3 || tables >= 1 || cards >= 3;
    });
    loaded = true;
  } catch (err) {
    pageErrors.push(`NAV: ${err instanceof Error ? err.message : String(err)}`.slice(0, 200));
  }

  const shotPath = `${OUT_DIR}/${mod.slug}.png`;
  await page.screenshot({ path: shotPath, fullPage: false }).catch(() => undefined);

  const verdict =
    !loaded
      ? "❌ NAV-FAIL"
      : status >= 400
        ? `❌ HTTP-${status}`
        : pageErrors.length || consoleErrors.length
          ? "🟡 JS-ERR"
          : !hasContent
            ? "🟡 EMPTY"
            : "✅ OK";

  results.push({
    slug: mod.slug,
    path: mod.path,
    status,
    loaded,
    title: title.slice(0, 80),
    h1: h1.slice(0, 80),
    hasContent,
    consoleErrors,
    pageErrors,
    failedRequests,
    screenshot: shotPath,
    verdict,
  });

  console.log(
    `${verdict.padEnd(14)} ${mod.path.padEnd(30)} status=${status} content=${hasContent ? "y" : "n"} errs=${consoleErrors.length + pageErrors.length} netErr=${failedRequests.length}`,
  );
  await page.close();
  // Throttler-friendly pacing — most buckets are 30-100 req/min/IP and 16
  // modules × multiple bootstrap calls would otherwise burn through them.
  await new Promise((r) => setTimeout(r, 2500));
}

await browser.close();

writeFileSync(`${OUT_DIR}/report.json`, JSON.stringify(results, null, 2));
const failed = results.filter((r) => r.verdict !== "✅ OK");

console.log("\n==== Summary ====");
console.log(`Total modules : ${results.length}`);
console.log(`OK            : ${results.length - failed.length}`);
console.log(`With issues   : ${failed.length}`);
if (failed.length) {
  console.log("\nIssues:");
  for (const r of failed) {
    console.log(`  ${r.verdict} ${r.path}`);
    if (r.pageErrors.length) console.log(`    page-errors : ${r.pageErrors.slice(0, 2).join(" | ")}`);
    if (r.consoleErrors.length) console.log(`    console     : ${r.consoleErrors.slice(0, 2).join(" | ")}`);
    if (r.failedRequests.length) console.log(`    net-failed  : ${r.failedRequests.slice(0, 2).join(" | ")}`);
  }
}
console.log(`\nFull report : ${OUT_DIR}/report.json`);
console.log(`Screenshots : ${OUT_DIR}/<slug>.png`);
