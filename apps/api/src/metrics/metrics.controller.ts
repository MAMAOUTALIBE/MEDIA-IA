import { Controller, Get, Header, Res } from "@nestjs/common";
import type { Response } from "express";
import { register, collectDefaultMetrics, Counter, Histogram } from "prom-client";
import { Public } from "../auth/public.decorator";

// Init default Node.js metrics once (event loop lag, GC, heap, etc.)
collectDefaultMetrics({ prefix: "cmr_api_" });

// Domain metrics
export const httpRequests = new Counter({
  name: "cmr_api_http_requests_total",
  help: "Total HTTP requests received",
  labelNames: ["method", "route", "status"] as const,
});

export const workflowTransitions = new Counter({
  name: "cmr_api_workflow_transitions_total",
  help: "Workflow step transitions (validate/reject)",
  labelNames: ["from_step", "to_step", "decision"] as const,
});

export const publicationsTotal = new Counter({
  name: "cmr_api_publications_total",
  help: "Publications attempted across all connectors",
  labelNames: ["channel", "status"] as const,
});

export const llmLatency = new Histogram({
  name: "cmr_api_llm_response_ms",
  help: "Claude API response time in ms",
  labelNames: ["mode"] as const,
  buckets: [50, 100, 250, 500, 1000, 2500, 5000, 10000, 30000],
});

@Controller("metrics")
export class MetricsController {
  /**
   * Prometheus scrape endpoint (sera scrapé par Prometheus en Sprint 8b).
   * Marqué @Public car les endpoints de métriques sont conventionnellement
   * non-auth dans le mesh interne (Kubernetes NetworkPolicy fait l'isolation).
   */
  @Public()
  @Get()
  @Header("Content-Type", register.contentType)
  async scrape(@Res({ passthrough: true }) res: Response) {
    res.setHeader("Content-Type", register.contentType);
    return register.metrics();
  }
}
