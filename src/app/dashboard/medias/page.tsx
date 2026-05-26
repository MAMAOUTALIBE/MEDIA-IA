"use client";

import { useState } from "react";
import { GlassCard } from "@/components/ui/glass-card";
import { useMediaAssets } from "@/lib/queries";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Search, Upload, Video, Music, Image as ImageIcon, FileText, Play, FolderOpen } from "lucide-react";
import type { MediaType } from "@/types";
import { formatRelative } from "@/lib/format";
import { EmptyState } from "@/components/ui/empty-state";
import { CardGridSkeleton } from "@/components/ui/loading-skeletons";
import { UploadZone } from "@/components/dashboard/medias/upload-zone";

type Filter = "all" | MediaType;

const typeIcons = {
  image: ImageIcon,
  video: Video,
  audio: Music,
  document: FileText,
};

export default function MediasPage() {
  const { data, isLoading } = useMediaAssets();
  const [filter, setFilter] = useState<Filter>("all");
  const [search, setSearch] = useState("");

  const list = (data ?? []).filter((m) => (filter === "all" ? true : m.type === filter))
    .filter((m) => (search ? m.title.toLowerCase().includes(search.toLowerCase()) : true));

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-text-primary">Médiathèque</h1>
          <p className="mt-1 text-sm text-text-secondary">
            DAM intelligent — recherche par tags, IA, et droits d&apos;auteur.
          </p>
        </div>
        <button
          type="button"
          className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-accent-blue to-accent-violet px-4 py-2 text-sm font-semibold text-white shadow-glow-violet transition hover:opacity-95"
        >
          <Upload size={16} />
          Uploader
        </button>
      </div>

      <UploadZone />

      <div className="flex flex-wrap items-center justify-between gap-3">
        <Tabs value={filter} onValueChange={(v) => setFilter(v as Filter)}>
          <TabsList className="h-9 border border-white/[0.06] bg-white/[0.03] p-0.5">
            <TabsTrigger value="all" className="h-8 px-3 text-xs">Tous</TabsTrigger>
            <TabsTrigger value="image" className="h-8 px-3 text-xs">Images</TabsTrigger>
            <TabsTrigger value="video" className="h-8 px-3 text-xs">Vidéos</TabsTrigger>
            <TabsTrigger value="audio" className="h-8 px-3 text-xs">Audio</TabsTrigger>
          </TabsList>
        </Tabs>
        <div className="relative">
          <Search size={14} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-text-muted" />
          <input
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Rechercher un média…"
            className="h-9 w-64 rounded-lg border border-white/[0.08] bg-white/[0.03] pl-9 pr-3 text-xs text-text-primary placeholder:text-text-muted focus:border-accent-violet/40 focus:outline-none focus:ring-2 focus:ring-accent-violet/20"
          />
        </div>
      </div>

      {isLoading ? (
        <CardGridSkeleton count={10} />
      ) : list.length === 0 ? (
        <EmptyState
          icon={FolderOpen}
          title="Aucun média dans cette catégorie"
          description="Modifiez vos filtres ou uploadez un nouveau média pour enrichir le DAM."
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
      ) : (
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
        {list.map((m) => {
          const Icon = typeIcons[m.type];
          return (
            <GlassCard key={m.id} className="group relative overflow-hidden">
              <div className="relative aspect-[4/3] overflow-hidden bg-bg-elevated">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={m.thumbnail}
                  alt={m.title}
                  className="h-full w-full object-cover transition group-hover:scale-105"
                  loading="lazy"
                />
                <div className="absolute inset-x-2 bottom-2 flex items-center gap-1 rounded-full bg-bg-base/80 px-2 py-1 text-[10px] font-semibold text-text-primary backdrop-blur ring-1 ring-white/10 w-fit">
                  <Icon size={10} />
                  <span>{m.size}</span>
                </div>
                {m.type === "video" && (
                  <span className="absolute right-2 top-2 inline-flex h-7 w-7 items-center justify-center rounded-full bg-bg-base/80 ring-1 ring-white/15 backdrop-blur">
                    <Play size={12} className="text-white" />
                  </span>
                )}
              </div>
              <div className="p-3">
                <p className="line-clamp-1 text-xs font-medium text-text-primary">{m.title}</p>
                <p className="mt-0.5 text-[10px] text-text-muted">
                  {m.uploadedBy} · {formatRelative(m.uploadedAt)}
                </p>
              </div>
            </GlassCard>
          );
        })}
      </div>
      )}
    </div>
  );
}
