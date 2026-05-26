"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

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
import { tryApi, postApi, API_ENABLED } from "@/lib/api-client";
import type {
  KpiMetric,
  AuditEvent,
  Content,
  PlatformShare,
  PendingContent,
  ActivityEvent,
  SystemAlert,
  WorkflowInstance,
  AICheckResult,
  MediaAsset,
  AutomationRule,
  CalendarEvent,
  TimeSeriesPoint,
  User,
} from "@/types";

function delayed<T>(value: T, ms = 150): Promise<T> {
  return new Promise((resolve) => setTimeout(() => resolve(value), ms));
}

const apiKey = (k: string) => [k, API_ENABLED ? "api" : "mock"] as const;

// =========================================================================
// Queries (read)
// =========================================================================

export function useKpis() {
  return useQuery({
    queryKey: apiKey("kpis"),
    queryFn: async () => {
      const r = await tryApi<{ items: KpiMetric[] }>("kpis");
      return r?.items ?? (await delayed(dashboardKpis));
    },
  });
}

export function useAudienceSeries(range: AudienceRange) {
  return useQuery({
    queryKey: ["audience", range, API_ENABLED ? "api" : "mock"],
    queryFn: async () => {
      const r = await tryApi<{ items: TimeSeriesPoint[] }>(`audience?range=${range}`);
      return r?.items ?? (await delayed(audienceByRange[range]));
    },
  });
}

export function usePlatformShares() {
  return useQuery({
    queryKey: apiKey("platforms"),
    queryFn: async () => {
      const r = await tryApi<{ items: PlatformShare[] }>("kpis/platforms");
      return r?.items ?? (await delayed(platformShares));
    },
  });
}

export function usePendingContents() {
  return useQuery({
    queryKey: apiKey("pending-contents"),
    queryFn: async () => {
      const r = await tryApi<{ items: PendingContent[] }>("contents/pending");
      return r?.items ?? (await delayed(pendingContents));
    },
  });
}

export function useRecentActivity() {
  return useQuery({
    queryKey: apiKey("recent-activity"),
    queryFn: async () => {
      const r = await tryApi<{ items: ActivityEvent[] }>("activity");
      return r?.items ?? (await delayed(recentActivity));
    },
  });
}

export function useSystemAlerts() {
  return useQuery({
    queryKey: apiKey("system-alerts"),
    queryFn: async () => {
      const r = await tryApi<{ items: SystemAlert[] }>("notifications/system");
      return r?.items ?? (await delayed(systemAlerts));
    },
  });
}

export function useContents() {
  return useQuery({
    queryKey: apiKey("contents"),
    queryFn: async () => {
      const r = await tryApi<{ items: Content[] }>("contents");
      if (r?.items) {
        const apiIds = new Set(r.items.map((c) => c.id));
        const localOnly = contents.filter((c) => !apiIds.has(c.id));
        return [...r.items, ...localOnly];
      }
      return delayed(contents);
    },
  });
}

export function useWorkflows() {
  return useQuery({
    queryKey: apiKey("workflows"),
    queryFn: async () => {
      const r = await tryApi<{ items: WorkflowInstance[]; stepCounts: Record<number, number> }>(
        "workflows",
      );
      if (r?.items) {
        return { instances: r.items, counts: r.stepCounts };
      }
      return delayed({ instances: workflowInstances, counts: workflowCountsByStep });
    },
  });
}

export function useAIChecks() {
  return useQuery({
    queryKey: apiKey("ai-checks"),
    queryFn: async () => {
      const r = await tryApi<{ results: AICheckResult[]; score: number; recommendations: string[] }>(
        "ai/checks",
      );
      if (r) return r;
      return delayed({ results: aiCheckResults, score: aiGlobalScore, recommendations: aiRecommendations });
    },
  });
}

export function useMediaAssets() {
  return useQuery({
    queryKey: apiKey("media-assets"),
    queryFn: async () => {
      const r = await tryApi<{ items: MediaAsset[] }>("media");
      return r?.items ?? (await delayed(mediaAssets));
    },
  });
}

export function useAutomations() {
  return useQuery({
    queryKey: apiKey("automations"),
    queryFn: async () => {
      const r = await tryApi<{ items: AutomationRule[] }>("automations");
      return r?.items ?? (await delayed(automationRules));
    },
  });
}

export function useCalendarEvents() {
  return useQuery({
    queryKey: apiKey("calendar"),
    queryFn: async () => {
      const r = await tryApi<{ items: CalendarEvent[] }>("calendar");
      return r?.items ?? (await delayed(calendarEvents));
    },
  });
}

export function useAnalyticsDeep() {
  return useQuery({
    queryKey: apiKey("analytics-deep"),
    queryFn: async () => {
      const r = await tryApi<{
        engagementByDayOfWeek: typeof engagementByDayOfWeek;
        topContents: typeof topContents;
        topChannels: typeof topChannels;
      }>("analytics/deep");
      if (r) return r;
      return delayed({ engagementByDayOfWeek, topContents, topChannels });
    },
  });
}

export function useDiffusionMatrix() {
  return useQuery({
    queryKey: apiKey("diffusion"),
    queryFn: async () => {
      const r = await tryApi<{ matrix: typeof diffusionMatrix; stats: typeof diffusionQuickStats }>(
        "diffusion/matrix",
      );
      return r ?? (await delayed({ matrix: diffusionMatrix, stats: diffusionQuickStats }));
    },
  });
}

export function useUsers() {
  return useQuery({
    queryKey: apiKey("users"),
    queryFn: async () => {
      const r = await tryApi<{ items: User[] }>("users");
      return r?.items ?? (await delayed(users));
    },
  });
}

export function useAuditEvents() {
  return useQuery({
    queryKey: apiKey("audit"),
    queryFn: async () => {
      const r = await tryApi<{ items: AuditEvent[] }>("audit");
      // L'API a 10 events seed; le mock local en a 40 plus diverses pour la démo.
      // On privilégie le mock plus riche, mais on note que l'API répond bien.
      if (r?.items) return auditEvents;
      return delayed(auditEvents);
    },
  });
}

// =========================================================================
// Mutations (write)
// =========================================================================

export function useValidateContent() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, comment }: { id: string; comment?: string }) => {
      const r = await postApi<{ ok: boolean; validated: PendingContent; newStep: string }>(
        `contents/${id}/validate`,
        { comment },
      );
      return r;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["pending-contents", "api"] });
      queryClient.invalidateQueries({ queryKey: ["pending-contents", "mock"] });
    },
  });
}

export function useRejectContent() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, reason }: { id: string; reason?: string }) => {
      const r = await postApi<{ ok: boolean; rejected: PendingContent }>(
        `contents/${id}/reject`,
        { reason },
      );
      return r;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["pending-contents", "api"] });
      queryClient.invalidateQueries({ queryKey: ["pending-contents", "mock"] });
    },
  });
}
