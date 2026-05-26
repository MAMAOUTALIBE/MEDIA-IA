"use client";

import { useQuery } from "@tanstack/react-query";

import { dashboardKpis } from "@/lib/mocks/kpis";
import { audienceByRange, type AudienceRange } from "@/lib/mocks/audience-series";
import { platformShares } from "@/lib/mocks/platforms";
import { contents, pendingContents } from "@/lib/mocks/contents";
import { recentActivity } from "@/lib/mocks/recent-activity";
import { systemAlerts } from "@/lib/mocks/system-alerts";
import { workflowInstances, workflowCountsByStep } from "@/lib/mocks/workflows";
import { aiCheckResults, aiGlobalScore, aiRecommendations } from "@/lib/mocks/ai-checks";
import { mediaAssets } from "@/lib/mocks/media-assets";
import { automationRules } from "@/lib/mocks/automation-rules";
import { calendarEvents } from "@/lib/mocks/calendar-events";
import { engagementByDayOfWeek, topContents, topChannels } from "@/lib/mocks/analytics-deep";
import { diffusionMatrix, diffusionQuickStats } from "@/lib/mocks/diffusion";
import { users } from "@/lib/mocks/users";
import { auditEvents } from "@/lib/mocks/audit-logs";

function delayed<T>(value: T, ms = 150): Promise<T> {
  return new Promise((resolve) => setTimeout(() => resolve(value), ms));
}

export function useKpis() {
  return useQuery({ queryKey: ["kpis"], queryFn: () => delayed(dashboardKpis) });
}

export function useAudienceSeries(range: AudienceRange) {
  return useQuery({
    queryKey: ["audience", range],
    queryFn: () => delayed(audienceByRange[range]),
  });
}

export function usePlatformShares() {
  return useQuery({ queryKey: ["platforms"], queryFn: () => delayed(platformShares) });
}

export function usePendingContents() {
  return useQuery({ queryKey: ["pending-contents"], queryFn: () => delayed(pendingContents) });
}

export function useRecentActivity() {
  return useQuery({ queryKey: ["recent-activity"], queryFn: () => delayed(recentActivity) });
}

export function useSystemAlerts() {
  return useQuery({ queryKey: ["system-alerts"], queryFn: () => delayed(systemAlerts) });
}

export function useContents() {
  return useQuery({ queryKey: ["contents"], queryFn: () => delayed(contents) });
}

export function useWorkflows() {
  return useQuery({
    queryKey: ["workflows"],
    queryFn: () => delayed({ instances: workflowInstances, counts: workflowCountsByStep }),
  });
}

export function useAIChecks() {
  return useQuery({
    queryKey: ["ai-checks"],
    queryFn: () => delayed({ results: aiCheckResults, score: aiGlobalScore, recommendations: aiRecommendations }),
  });
}

export function useMediaAssets() {
  return useQuery({ queryKey: ["media-assets"], queryFn: () => delayed(mediaAssets) });
}

export function useAutomations() {
  return useQuery({ queryKey: ["automations"], queryFn: () => delayed(automationRules) });
}

export function useCalendarEvents() {
  return useQuery({ queryKey: ["calendar"], queryFn: () => delayed(calendarEvents) });
}

export function useAnalyticsDeep() {
  return useQuery({
    queryKey: ["analytics-deep"],
    queryFn: () => delayed({ engagementByDayOfWeek, topContents, topChannels }),
  });
}

export function useDiffusionMatrix() {
  return useQuery({
    queryKey: ["diffusion"],
    queryFn: () => delayed({ matrix: diffusionMatrix, stats: diffusionQuickStats }),
  });
}

export function useUsers() {
  return useQuery({ queryKey: ["users"], queryFn: () => delayed(users) });
}

export function useAuditEvents() {
  return useQuery({ queryKey: ["audit"], queryFn: () => delayed(auditEvents) });
}
