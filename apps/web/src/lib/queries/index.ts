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
  AuditAction,
  AuditSeverity,
  ChannelKey,
  Content,
  ContentType,
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
const strictApiWhenAuthenticated = { strictWhenAuthenticated: true } as const;

const WORKFLOW_STEP_TO_NUMBER = {
  submitted: 1,
  editor: 2,
  chief: 3,
  direction: 4,
  published: 5,
} as const;

type ApiWorkflowInstance = {
  id: string;
  contentId?: string;
  currentStep: keyof typeof WORKFLOW_STEP_TO_NUMBER | 1 | 2 | 3 | 4 | 5;
  startedAt?: string;
  contentTitle?: string;
  contentType?: ContentType;
  channels?: ChannelKey[];
  author?: WorkflowInstance["author"];
  pendingFor?: string;
  content?: {
    title?: string;
    type?: ContentType;
    channels?: Array<ChannelKey | { channel: ChannelKey }>;
  };
  submittedBy?: WorkflowInstance["author"];
};

type ApiAutomationRule = Omit<Partial<AutomationRule>, "icon"> & {
  icon?: AutomationRule["icon"] | string | null;
  lastRunAt?: string | null;
  createdAt?: string;
  updatedAt?: string;
};

type ApiMediaAsset = Partial<MediaAsset> & {
  thumbnailUrl?: string | null;
  sizeBytes?: number | string | null;
  durationSec?: number | null;
  uploadedById?: string | null;
  createdAt?: string;
  updatedAt?: string;
};

type ApiAuditEvent = Omit<Partial<AuditEvent>, "metadata"> & {
  metadata?: unknown;
  actorId?: string | null;
  ip?: string | null;
};

function safeIsoDate(value: unknown, fallback = new Date().toISOString()): string {
  if (typeof value !== "string" || value.length === 0) return fallback;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? fallback : date.toISOString();
}

function pendingForSince(value: unknown): string {
  if (typeof value !== "string") return "—";
  const started = new Date(value).getTime();
  if (Number.isNaN(started)) return "—";
  const minutes = Math.max(0, Math.round((Date.now() - started) / 60_000));
  if (minutes < 60) return `${minutes}min`;
  const hours = Math.floor(minutes / 60);
  const rest = minutes % 60;
  if (hours < 24) return rest > 0 ? `${hours}h ${rest}min` : `${hours}h`;
  const days = Math.floor(hours / 24);
  return `${days}j ${hours % 24}h`;
}

function formatBytes(value: unknown): string {
  const bytes = typeof value === "bigint" ? Number(value) : Number(value);
  if (!Number.isFinite(bytes) || bytes <= 0) return "—";
  const units = ["B", "KB", "MB", "GB", "TB"];
  let size = bytes;
  let unit = 0;
  while (size >= 1024 && unit < units.length - 1) {
    size /= 1024;
    unit += 1;
  }
  return `${size.toFixed(size >= 10 || unit === 0 ? 0 : 1)} ${units[unit]}`;
}

function inferAutomationIcon(rule: ApiAutomationRule): AutomationRule["icon"] {
  if (rule.icon && ["zap", "bell", "calendar", "link", "video", "globe"].includes(rule.icon)) {
    return rule.icon as AutomationRule["icon"];
  }
  const text = `${rule.name ?? ""} ${rule.trigger ?? ""} ${rule.action ?? ""}`.toLowerCase();
  if (text.includes("cron") || text.includes("newsletter") || text.includes("jour")) return "calendar";
  if (text.includes("video") || text.includes("short") || text.includes("transcription")) return "video";
  if (text.includes("alert") || text.includes("notif") || text.includes("modération")) return "bell";
  if (text.includes("youtube") || text.includes("cross")) return "link";
  if (text.includes("archive") || text.includes("storage")) return "globe";
  return "zap";
}

function mapAutomationRule(rule: ApiAutomationRule): AutomationRule {
  return {
    id: String(rule.id),
    name: rule.name ?? "Règle sans nom",
    description: rule.description ?? rule.name ?? "Automatisation éditoriale",
    trigger: rule.trigger ?? "Déclencheur non configuré",
    action: rule.action ?? "Action non configurée",
    active: Boolean(rule.active),
    runs: Number(rule.runs ?? 0),
    lastRun: safeIsoDate(rule.lastRun ?? rule.lastRunAt ?? rule.updatedAt ?? rule.createdAt),
    icon: inferAutomationIcon(rule),
  };
}

function mapWorkflowInstance(wf: ApiWorkflowInstance): WorkflowInstance {
  const rawStep = wf.currentStep;
  const currentStep =
    typeof rawStep === "number"
      ? rawStep
      : WORKFLOW_STEP_TO_NUMBER[rawStep] ?? 1;
  const author = wf.author ?? wf.submittedBy ?? { name: "Inconnu", initials: "?", color: "#64748b" };
  const rawChannels = wf.channels ?? wf.content?.channels ?? [];
  const channels = rawChannels.map((ch) => (typeof ch === "string" ? ch : ch.channel));
  return {
    id: wf.id,
    contentTitle: wf.contentTitle ?? wf.content?.title ?? wf.contentId ?? "Contenu sans titre",
    contentType: wf.contentType ?? wf.content?.type ?? "article",
    currentStep: Math.min(Math.max(currentStep, 1), 5) as WorkflowInstance["currentStep"],
    author,
    pendingFor: wf.pendingFor ?? pendingForSince(wf.startedAt),
    channels,
    startedAt: safeIsoDate(wf.startedAt),
  };
}

function mapStepCounts(stepCounts: Record<string, number> | undefined) {
  const counts = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
  if (!stepCounts) return counts;
  for (const [key, value] of Object.entries(stepCounts)) {
    const numericKey = Number(key);
    const stepNumber = Number.isFinite(numericKey)
      ? numericKey
      : WORKFLOW_STEP_TO_NUMBER[key as keyof typeof WORKFLOW_STEP_TO_NUMBER];
    if (stepNumber && stepNumber >= 1 && stepNumber <= 5) {
      counts[stepNumber as 1 | 2 | 3 | 4 | 5] = value;
    }
  }
  return counts;
}

function mapMediaAsset(asset: ApiMediaAsset): MediaAsset {
  const httpUrl = typeof asset.url === "string" && /^https?:\/\//.test(asset.url) ? asset.url : null;
  const thumbnail =
    asset.thumbnail ??
    asset.thumbnailUrl ??
    (httpUrl ? httpUrl.replace("w=1200", "w=320&h=200&fit=crop") : "/file.svg");
  return {
    id: String(asset.id),
    title: asset.title ?? "Média sans titre",
    type: asset.type ?? "document",
    url: asset.url ?? thumbnail,
    thumbnail,
    duration: asset.duration ?? asset.durationSec ?? undefined,
    size: asset.size ?? formatBytes(asset.sizeBytes),
    uploadedAt: safeIsoDate(asset.uploadedAt ?? asset.createdAt ?? asset.updatedAt),
    uploadedBy: asset.uploadedBy ?? asset.uploadedById ?? "Équipe média",
    tags: asset.tags ?? [],
  };
}

function mapAuditEvent(event: ApiAuditEvent): AuditEvent {
  return {
    id: String(event.id),
    at: safeIsoDate(event.at),
    actorId: event.actorId ?? "system",
    action: (event.action ?? "settings_change") as AuditAction,
    target: event.target ?? "Action système",
    severity: (event.severity ?? "info") as AuditSeverity,
    ip: event.ip ?? "—",
    status: event.status ?? "success",
    metadata:
      typeof event.metadata === "string"
        ? event.metadata
        : event.metadata
          ? JSON.stringify(event.metadata)
          : undefined,
  };
}

// =========================================================================
// Queries (read)
// =========================================================================

export function useKpis() {
  return useQuery({
    queryKey: apiKey("kpis"),
    queryFn: async () => {
      const r = await tryApi<{ items: KpiMetric[] }>("kpis", strictApiWhenAuthenticated);
      return r?.items ?? (await delayed(dashboardKpis));
    },
  });
}

export function useAudienceSeries(range: AudienceRange) {
  return useQuery({
    queryKey: ["audience", range, API_ENABLED ? "api" : "mock"],
    queryFn: async () => {
      const r = await tryApi<{ items: TimeSeriesPoint[] }>(
        `audience?range=${range}`,
        strictApiWhenAuthenticated,
      );
      return r?.items ?? (await delayed(audienceByRange[range]));
    },
  });
}

export function usePlatformShares() {
  return useQuery({
    queryKey: apiKey("platforms"),
    queryFn: async () => {
      const r = await tryApi<{ items: PlatformShare[] }>(
        "kpis/platforms",
        strictApiWhenAuthenticated,
      );
      return r?.items ?? (await delayed(platformShares));
    },
  });
}

export function usePendingContents() {
  return useQuery({
    queryKey: apiKey("pending-contents"),
    queryFn: async () => {
      const r = await tryApi<{ items: PendingContent[] }>(
        "contents/pending",
        strictApiWhenAuthenticated,
      );
      return r?.items ?? (await delayed(pendingContents));
    },
  });
}

export function useRecentActivity() {
  return useQuery({
    queryKey: apiKey("recent-activity"),
    queryFn: async () => {
      const r = await tryApi<{ items: ActivityEvent[] }>("activity", strictApiWhenAuthenticated);
      return r?.items ?? (await delayed(recentActivity));
    },
  });
}

export function useSystemAlerts() {
  return useQuery({
    queryKey: apiKey("system-alerts"),
    queryFn: async () => {
      const r = await tryApi<{ items: SystemAlert[] }>(
        "notifications/system",
        strictApiWhenAuthenticated,
      );
      return r?.items ?? (await delayed(systemAlerts));
    },
  });
}

export function useContents() {
  return useQuery({
    queryKey: apiKey("contents"),
    queryFn: async () => {
      const r = await tryApi<{ items: Content[] }>("contents", strictApiWhenAuthenticated);
      if (r?.items) {
        const apiIds = new Set(r.items.map((c) => c.id));
        const localOnly = contents.filter((c) => !apiIds.has(c.id));
        return [...r.items, ...localOnly];
      }
      return delayed(contents);
    },
  });
}

// =============================================================================
// Sprint RBAC — Mutations CRUD pour journalistes (ownership-aware)
// =============================================================================

type CreateContentPayload = {
  title: string;
  body?: string;
  excerpt?: string;
  type: Content["type"];
  channels?: ChannelKey[];
};

type UpdateContentPayload = {
  title?: string;
  body?: string;
  excerpt?: string;
  channels?: ChannelKey[];
};

export function useCreateContent() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (payload: CreateContentPayload) => {
      return postApi<Content>("contents", payload, "POST");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["contents"] });
    },
  });
}

export function useUpdateContent() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, payload }: { id: string; payload: UpdateContentPayload }) => {
      return postApi<Content>(`contents/${id}`, payload, "PATCH");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["contents"] });
    },
  });
}

export function useSubmitContent() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      return postApi<{ instance: { id: string; currentStep: string }; content: Content }>(
        `contents/${id}/submit`,
        undefined,
        "POST",
      );
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["contents"] });
      queryClient.invalidateQueries({ queryKey: ["pending"] });
    },
  });
}

export function useDeleteContent() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      await postApi<void>(`contents/${id}`, undefined, "DELETE");
      return { id };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["contents"] });
    },
  });
}

// =============================================================================
// Sprint IA-Générative — assistant éditorial (Groq Llama 3.3 70B)
// =============================================================================

export function useGenerateTitles() {
  return useMutation({
    mutationFn: async (payload: { contentId?: string; body?: string; currentTitle?: string }) => {
      return postApi<{ titles: string[]; engine: string }>(
        "ai/generate-titles",
        payload,
        "POST",
      );
    },
  });
}

type FactCheckResult = {
  overallRisk: "low" | "medium" | "high";
  flags: Array<{
    claim: string;
    risk: "low" | "medium" | "high";
    reason: string;
    verify: string;
  }>;
  suggestedSources: string[];
  engine: string;
};

export function useFactCheck() {
  return useMutation({
    mutationFn: async (payload: { contentId?: string; body?: string }) => {
      return postApi<FactCheckResult>("ai/fact-check", payload, "POST");
    },
  });
}

export function useSocialPosts() {
  return useMutation({
    mutationFn: async (payload: {
      contentId?: string;
      title?: string;
      body?: string;
      platforms: Array<"twitter" | "instagram" | "tiktok" | "facebook" | "telegram">;
    }) => {
      return postApi<{ posts: Record<string, string>; engine: string }>(
        "ai/social-posts",
        payload,
        "POST",
      );
    },
  });
}

// =============================================================================
// Sprint Search — recherche sémantique pgvector + fallback keyword
// =============================================================================

type SearchResult = {
  count: number;
  items: Array<
    Content & {
      distance?: number;
      summary?: string | null;
      tags?: string[];
    }
  >;
  mode: "semantic" | "keyword" | "empty";
};

export function useSearchContents(q: string, opts: { enabled?: boolean } = {}) {
  return useQuery({
    queryKey: ["contents-search", q] as const,
    enabled: opts.enabled !== false && q.trim().length >= 2,
    queryFn: async () => {
      const r = await tryApi<SearchResult>(
        `contents/search?q=${encodeURIComponent(q)}&limit=20`,
        strictApiWhenAuthenticated,
      );
      return r ?? { count: 0, items: [], mode: "empty" as const };
    },
  });
}

export function useWorkflows() {
  return useQuery({
    queryKey: apiKey("workflows"),
    queryFn: async () => {
      const r = await tryApi<{ items: ApiWorkflowInstance[]; stepCounts: Record<string, number> }>(
        "workflows",
        strictApiWhenAuthenticated,
      );
      if (r?.items) {
        return { instances: r.items.map(mapWorkflowInstance), counts: mapStepCounts(r.stepCounts) };
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
        strictApiWhenAuthenticated,
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
      const r = await tryApi<{ items: ApiMediaAsset[] }>("media", strictApiWhenAuthenticated);
      return r?.items ? r.items.map(mapMediaAsset) : await delayed(mediaAssets);
    },
  });
}

export function useAutomations() {
  return useQuery({
    queryKey: apiKey("automations"),
    queryFn: async () => {
      const r = await tryApi<{ items: ApiAutomationRule[] }>(
        "automations",
        strictApiWhenAuthenticated,
      );
      return r?.items ? r.items.map(mapAutomationRule) : await delayed(automationRules);
    },
  });
}

export function useToggleAutomation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, active }: { id: string; active: boolean }) => {
      const r = await postApi<{ ok: boolean; rule: ApiAutomationRule }>(
        `automations/${id}`,
        { active },
        "PATCH",
      );
      return { ok: r.ok, rule: mapAutomationRule(r.rule) };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["automations"] });
    },
  });
}

export function useCalendarEvents() {
  return useQuery({
    queryKey: apiKey("calendar"),
    queryFn: async () => {
      const r = await tryApi<{ items: CalendarEvent[] }>("calendar", strictApiWhenAuthenticated);
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
      }>("analytics/deep", strictApiWhenAuthenticated);
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
        strictApiWhenAuthenticated,
      );
      return r ?? (await delayed({ matrix: diffusionMatrix, stats: diffusionQuickStats }));
    },
  });
}

export function useUsers() {
  return useQuery({
    queryKey: apiKey("users"),
    queryFn: async () => {
      const r = await tryApi<{ items: User[] }>("users", strictApiWhenAuthenticated);
      return r?.items ?? (await delayed(users));
    },
  });
}

export function useAuditEvents() {
  return useQuery({
    queryKey: apiKey("audit"),
    queryFn: async () => {
      const r = await tryApi<{ items: ApiAuditEvent[] }>("audit", strictApiWhenAuthenticated);
      if (r?.items) return r.items.map(mapAuditEvent);
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
      const r = await postApi<{ ok: boolean; fromStep?: string; toStep?: string }>(
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
      const r = await postApi<{ ok: boolean; decision?: string }>(
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

export function useAdvanceWorkflow() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, comment }: { id: string; comment?: string }) => {
      const r = await postApi<{
        ok: boolean;
        instance: ApiWorkflowInstance;
        fromStep?: string;
        toStep?: string;
        decision?: string;
      }>(`workflows/${id}/advance`, { comment });
      return r;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["workflows", "api"] });
      queryClient.invalidateQueries({ queryKey: ["workflows", "mock"] });
    },
  });
}
