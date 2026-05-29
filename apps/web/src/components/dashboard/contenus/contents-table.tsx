"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useContents } from "@/lib/queries";
import { usersById } from "@/lib/mocks/users";
import { GlassCard } from "@/components/ui/glass-card";
import { InitialsAvatar } from "@/components/ui/initials-avatar";
import { ChannelIcon } from "@/components/ui/channel-icon";
import { StatusBadge } from "./status-badge";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Search, FileX2 } from "lucide-react";
import { formatRelative } from "@/lib/format";
import { EmptyState } from "@/components/ui/empty-state";
import { ApiErrorState } from "@/components/ui/api-error-state";
import { TableSkeleton } from "@/components/ui/loading-skeletons";
import type { ContentStatus, ContentType } from "@/types";

type Filter = "all" | "draft" | "validation" | "published" | "rejected";
const filterStatuses: Record<Filter, ContentStatus[]> = {
  all: ["draft", "pending_editor", "pending_chief", "pending_direction", "published", "rejected"],
  draft: ["draft"],
  validation: ["pending_editor", "pending_chief", "pending_direction"],
  published: ["published"],
  rejected: ["rejected"],
};

const typeLabel: Record<ContentType, string> = {
  article: "Article",
  video: "Vidéo",
  audio: "Audio",
  social: "Social",
};

export function ContentsTable() {
  const router = useRouter();
  const { data, error, isError, isLoading, refetch } = useContents();
  const [filter, setFilter] = useState<Filter>("all");
  const [search, setSearch] = useState("");

  const rows = useMemo(() => {
    const list = data ?? [];
    const allowed = new Set(filterStatuses[filter]);
    return list
      .filter((c) => allowed.has(c.status))
      .filter((c) => (search ? c.title.toLowerCase().includes(search.toLowerCase()) : true));
  }, [data, filter, search]);

  return (
    <GlassCard className="overflow-hidden">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-white/[0.06] p-4">
        <Tabs value={filter} onValueChange={(v) => setFilter(v as Filter)}>
          <TabsList className="h-9 border border-white/[0.06] bg-white/[0.03] p-0.5">
            <TabsTrigger value="all" className="h-8 px-3 text-xs">Tous</TabsTrigger>
            <TabsTrigger value="draft" className="h-8 px-3 text-xs">Brouillons</TabsTrigger>
            <TabsTrigger value="validation" className="h-8 px-3 text-xs">En validation</TabsTrigger>
            <TabsTrigger value="published" className="h-8 px-3 text-xs">Publiés</TabsTrigger>
            <TabsTrigger value="rejected" className="h-8 px-3 text-xs">Rejetés</TabsTrigger>
          </TabsList>
        </Tabs>
        <div className="relative">
          <Search size={14} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-text-muted" />
          <input
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Rechercher un contenu…"
            className="h-9 w-64 rounded-lg border border-white/[0.08] bg-white/[0.03] pl-9 pr-3 text-xs text-text-primary placeholder:text-text-muted focus:border-accent-violet/40 focus:outline-none focus:ring-2 focus:ring-accent-violet/20"
          />
        </div>
      </div>
      <div className="overflow-x-auto">
        <table className="min-w-full text-sm">
          <thead className="bg-white/[0.02]">
            <tr className="text-left text-[11px] uppercase tracking-wider text-text-muted">
              <th className="px-4 py-3 font-medium">Titre</th>
              <th className="px-4 py-3 font-medium">Auteur</th>
              <th className="px-4 py-3 font-medium">Type</th>
              <th className="px-4 py-3 font-medium">Statut</th>
              <th className="px-4 py-3 font-medium">Tags IA</th>
              <th className="px-4 py-3 font-medium">Canaux</th>
              <th className="px-4 py-3 font-medium">Mis à jour</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/[0.05]">
            {rows.map((c) => {
              const author = usersById[c.authorId];
              return (
                <tr
                  key={c.id}
                  onClick={() => router.push(`/dashboard/contenus/${c.id}`)}
                  className="cursor-pointer transition hover:bg-white/[0.04]"
                >
                  <td className="px-4 py-3">
                    <p className="line-clamp-1 font-medium text-text-primary">{c.title}</p>
                    <p
                      className="mt-0.5 line-clamp-1 text-xs text-text-secondary"
                      title={c.summary ?? c.excerpt}
                    >
                      {c.summary ?? c.excerpt}
                    </p>
                  </td>
                  <td className="px-4 py-3">
                    {author ? (
                      <div className="flex items-center gap-2 text-xs">
                        <InitialsAvatar initials={author.initials} color={author.color} size={24} />
                        <span className="text-text-secondary">{author.name}</span>
                      </div>
                    ) : (
                      <span className="text-xs text-text-muted">—</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-xs text-text-secondary">{typeLabel[c.type]}</td>
                  <td className="px-4 py-3">
                    <StatusBadge status={c.status} />
                  </td>
                  <td className="px-4 py-3">
                    {c.tags && c.tags.length > 0 ? (
                      <div className="flex flex-wrap items-center gap-1">
                        {c.tags.slice(0, 3).map((tag) => (
                          <span
                            key={tag}
                            className="rounded-full bg-accent-violet/15 px-2 py-0.5 text-[10px] font-medium text-accent-violet ring-1 ring-accent-violet/25"
                          >
                            {tag}
                          </span>
                        ))}
                        {c.tags.length > 3 && (
                          <span
                            className="text-[10px] text-text-muted"
                            title={c.tags.slice(3).join(", ")}
                          >
                            +{c.tags.length - 3}
                          </span>
                        )}
                      </div>
                    ) : (
                      <span className="text-[11px] text-text-muted">—</span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-1">
                      {c.channels.slice(0, 4).map((ch) => (
                        <ChannelIcon key={ch} channel={ch} size={14} />
                      ))}
                      {c.channels.length > 4 && (
                        <span className="text-[11px] text-text-muted">+{c.channels.length - 4}</span>
                      )}
                    </div>
                  </td>
                  <td className="px-4 py-3 text-xs text-text-muted">{formatRelative(c.updatedAt)}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
        {isError && <ApiErrorState error={error} onRetry={() => void refetch()} />}
        {!isError && !isLoading && rows.length === 0 && (
          <EmptyState
            icon={FileX2}
            title="Aucun contenu ne correspond aux filtres"
            description="Essayez d'élargir votre recherche ou de changer d'onglet pour voir d'autres contenus."
            action={
              <button
                type="button"
                onClick={() => {
                  setFilter("all");
                  setSearch("");
                }}
                className="rounded-lg border border-white/[0.08] bg-white/[0.03] px-3 py-1.5 text-xs font-medium text-text-primary transition hover:bg-white/[0.06]"
              >
                Réinitialiser les filtres
              </button>
            }
          />
        )}
        {!isError && isLoading && (
          <div className="p-4">
            <TableSkeleton rows={8} columns={7} />
          </div>
        )}
      </div>
    </GlassCard>
  );
}
