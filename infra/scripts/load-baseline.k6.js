// Load test baseline — k6 scenario for the CMR API.
//
// What this measures
//   - p95 response time under steady load (200 VUs, 2 min)
//   - error rate budget (<1%)
//   - per-endpoint thresholds (health, list, problem responses)
//
// Why baseline matters
//   The go-live runbook targets 50k RPS HTTP. This file is the *reference*
//   load used in CI smoke-perf to catch regressions before staging — not the
//   prod sizing run. Bump VUs / duration in `stages` for capacity testing.
//
// Run
//   API_BASE_URL=https://api.cmr.tv k6 run infra/scripts/load-baseline.k6.js
//   k6 run --out json=results.json infra/scripts/load-baseline.k6.js
//
// Install
//   brew install k6   (macOS)
//   apt-get install k6 (debian/ubuntu — see https://k6.io/docs/get-started/installation)

import http from "k6/http";
import { check, sleep } from "k6";
import { Rate, Trend } from "k6/metrics";

const BASE = __ENV.API_BASE_URL || "http://localhost:4001/api";

const errorRate = new Rate("errors");
const healthLatency = new Trend("health_latency_ms");
const listLatency = new Trend("list_latency_ms");
const problemLatency = new Trend("problem_latency_ms");

export const options = {
  scenarios: {
    steady: {
      executor: "ramping-vus",
      startVUs: 0,
      stages: [
        { duration: "30s", target: 50 },   // warmup
        { duration: "1m",  target: 200 },  // ramp
        { duration: "2m",  target: 200 },  // sustain
        { duration: "30s", target: 0 },    // cool-down
      ],
      gracefulRampDown: "30s",
    },
  },
  thresholds: {
    http_req_failed:   ["rate<0.01"],              // <1% failures overall
    http_req_duration: ["p(95)<500", "p(99)<1500"],
    errors:            ["rate<0.01"],
    health_latency_ms: ["p(95)<50"],               // health must stay tiny
    list_latency_ms:   ["p(95)<300"],
    problem_latency_ms:["p(95)<50"],               // 4xx envelope is cheap
  },
};

export default function () {
  // 1. Health — should be near-instant and never error.
  let res = http.get(`${BASE}/health`, { tags: { endpoint: "health" } });
  healthLatency.add(res.timings.duration);
  check(res, {
    "health 200": (r) => r.status === 200,
    "health body has ok": (r) => r.json("ok") === true,
  }) || errorRate.add(1);

  // 2. List endpoint (cheap aggregate) — sample a hot read path.
  res = http.get(`${BASE}/kpis`, { tags: { endpoint: "kpis" } });
  listLatency.add(res.timings.duration);
  check(res, {
    "kpis 200": (r) => r.status === 200,
    "kpis has items": (r) => Array.isArray(r.json("items")),
  }) || errorRate.add(1);

  // 3. Problem envelope path — confirm 4xx stays cheap under load (filter cost).
  res = http.get(`${BASE}/does-not-exist`, { tags: { endpoint: "404" } });
  problemLatency.add(res.timings.duration);
  check(res, {
    "404 returns": (r) => r.status === 404,
    "problem+json": (r) => (r.headers["Content-Type"] || "").includes("problem+json"),
  }) || errorRate.add(1);

  sleep(0.5);
}
