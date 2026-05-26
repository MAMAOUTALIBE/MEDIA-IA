"use client";

import { useState } from "react";
import {
  Bell,
  AlertCircle,
  AlertTriangle,
  CheckCircle2,
  Info,
  AtSign,
  ShieldCheck,
  Server,
} from "lucide-react";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { InitialsAvatar } from "@/components/ui/initials-avatar";
import { systemAlerts } from "@/lib/mocks/system-alerts";
import { pendingContents } from "@/lib/mocks/contents";
import { mentions } from "@/lib/mocks/notifications";
import type { AlertSeverity } from "@/types";
import { formatRelative } from "@/lib/format";
import { cn } from "@/lib/utils";

const severityIcon: Record<AlertSeverity, React.ComponentType<{ size?: number; className?: string }>> = {
  info: Info,
  warning: AlertTriangle,
  error: AlertCircle,
  success: CheckCircle2,
};

const severityColor: Record<AlertSeverity, string> = {
  info: "text-info",
  warning: "text-warning",
  error: "text-danger",
  success: "text-success",
};

const stepLabel = {
  editor: "Rédacteur",
  chief: "Chef d'édition",
  direction: "Direction",
};

export function NotificationsPopover() {
  const [tab, setTab] = useState<"mentions" | "validations" | "system">("mentions");
  const unreadMentions = mentions.filter((m) => m.unread).length;
  const validationsCount = pendingContents.length;
  const systemCount = systemAlerts.length;
  const total = unreadMentions + validationsCount + systemCount;

  return (
    <Popover>
      <PopoverTrigger
        className="relative inline-flex h-9 w-9 items-center justify-center rounded-full text-text-secondary outline-none transition hover:bg-white/[0.06] hover:text-text-primary focus-visible:ring-2 focus-visible:ring-accent-violet"
        aria-label="Notifications"
      >
        <Bell size={18} strokeWidth={1.8} />
        {total > 0 && (
          <span className="absolute right-1 top-1 inline-flex h-4 min-w-4 items-center justify-center rounded-full bg-danger px-1 text-[10px] font-bold text-white">
            {total}
          </span>
        )}
      </PopoverTrigger>
      <PopoverContent
        align="end"
        className="w-[26rem] border-white/10 bg-popover/95 p-0 backdrop-blur-xl"
      >
        <div className="border-b border-white/10 px-4 py-3">
          <div className="flex items-center justify-between">
            <p className="text-sm font-semibold text-text-primary">Notifications</p>
            <span className="rounded-full bg-white/10 px-2 py-0.5 text-[10px] font-semibold text-text-secondary">
              {total} non lues
            </span>
          </div>
        </div>

        <Tabs value={tab} onValueChange={(v) => setTab(v as typeof tab)}>
          <TabsList className="m-3 grid h-9 w-[calc(100%-1.5rem)] grid-cols-3 border border-white/[0.06] bg-white/[0.03] p-0.5">
            <TabsTrigger value="mentions" className="h-8 gap-1.5 text-xs">
              <AtSign size={11} />
              Mentions
              {unreadMentions > 0 && (
                <span className="ml-0.5 rounded-full bg-accent-violet/20 px-1 text-[9px] font-bold text-accent-violet">
                  {unreadMentions}
                </span>
              )}
            </TabsTrigger>
            <TabsTrigger value="validations" className="h-8 gap-1.5 text-xs">
              <ShieldCheck size={11} />
              Validations
              {validationsCount > 0 && (
                <span className="ml-0.5 rounded-full bg-info/20 px-1 text-[9px] font-bold text-info">
                  {validationsCount}
                </span>
              )}
            </TabsTrigger>
            <TabsTrigger value="system" className="h-8 gap-1.5 text-xs">
              <Server size={11} />
              Système
              {systemCount > 0 && (
                <span className="ml-0.5 rounded-full bg-warning/20 px-1 text-[9px] font-bold text-warning">
                  {systemCount}
                </span>
              )}
            </TabsTrigger>
          </TabsList>

          <TabsContent value="mentions" className="!mt-0">
            <ul className="max-h-96 overflow-y-auto">
              {mentions.map((m) => (
                <li
                  key={m.id}
                  className={cn(
                    "flex gap-3 px-4 py-3 transition hover:bg-white/[0.03]",
                    m.unread && "bg-accent-violet/[0.04]",
                  )}
                >
                  <InitialsAvatar initials={m.actor.initials} color={m.actor.color} size={32} className="mt-0.5" />
                  <div className="min-w-0 flex-1">
                    <p className="text-xs text-text-primary">
                      <span className="font-semibold">{m.actor.name}</span>{" "}
                      <span className="text-text-secondary">{m.message}</span>
                    </p>
                    <p className="mt-0.5 line-clamp-2 text-[11px] italic text-text-secondary">
                      {m.context}
                    </p>
                    <p className="mt-1 text-[10px] uppercase tracking-wider text-text-muted">
                      {formatRelative(m.at)}
                    </p>
                  </div>
                  {m.unread && (
                    <span className="mt-2 inline-block h-2 w-2 shrink-0 rounded-full bg-accent-violet" />
                  )}
                </li>
              ))}
            </ul>
          </TabsContent>

          <TabsContent value="validations" className="!mt-0">
            <ul className="max-h-96 overflow-y-auto">
              {pendingContents.map((p) => (
                <li
                  key={p.id}
                  className="flex gap-3 px-4 py-3 transition hover:bg-white/[0.03]"
                >
                  <InitialsAvatar initials={p.author.initials} color={p.author.color} size={32} className="mt-0.5" />
                  <div className="min-w-0 flex-1">
                    <p className="text-xs text-text-primary">
                      <span className="font-semibold">{p.author.name}</span>{" "}
                      <span className="text-text-secondary">
                        soumet pour validation
                      </span>
                    </p>
                    <p className="mt-0.5 line-clamp-1 text-[11px] font-medium text-text-primary">
                      « {p.title} »
                    </p>
                    <div className="mt-1 flex items-center gap-2">
                      <span className="rounded-full bg-info-soft px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider text-info">
                        Étape {stepLabel[p.step]}
                      </span>
                      <span className="text-[10px] text-text-muted">
                        {formatRelative(p.submittedAt)}
                      </span>
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          </TabsContent>

          <TabsContent value="system" className="!mt-0">
            <ul className="max-h-96 overflow-y-auto">
              {systemAlerts.map((alert) => {
                const Icon = severityIcon[alert.severity];
                return (
                  <li
                    key={alert.id}
                    className="flex gap-3 px-4 py-3 transition hover:bg-white/[0.03]"
                  >
                    <Icon size={18} className={cn("mt-0.5 shrink-0", severityColor[alert.severity])} />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium text-text-primary">
                        {alert.title}
                      </p>
                      <p className="mt-0.5 text-xs text-text-secondary">{alert.detail}</p>
                      <p className="mt-1 text-[10px] uppercase tracking-wider text-text-muted">
                        {formatRelative(alert.at)}
                      </p>
                    </div>
                  </li>
                );
              })}
            </ul>
          </TabsContent>
        </Tabs>
      </PopoverContent>
    </Popover>
  );
}
