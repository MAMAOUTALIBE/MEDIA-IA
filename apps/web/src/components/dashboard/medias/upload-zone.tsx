"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { GlassCard } from "@/components/ui/glass-card";
import {
  CloudUpload,
  X,
  Image as ImageIcon,
  Video,
  Music,
  FileText,
  CheckCircle2,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

interface UploadItem {
  id: string;
  name: string;
  size: number;
  type: "image" | "video" | "audio" | "document";
  progress: number;
  done: boolean;
}

function inferType(name: string): UploadItem["type"] {
  const ext = name.split(".").pop()?.toLowerCase() ?? "";
  if (["mp4", "mov", "mkv", "webm", "avi"].includes(ext)) return "video";
  if (["mp3", "wav", "ogg", "flac", "m4a"].includes(ext)) return "audio";
  if (["jpg", "jpeg", "png", "webp", "gif", "avif", "heic"].includes(ext)) return "image";
  return "document";
}

const icons = { image: ImageIcon, video: Video, audio: Music, document: FileText };

function formatBytes(n: number): string {
  if (n >= 1_000_000_000) return `${(n / 1_000_000_000).toFixed(1)} Go`;
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)} Mo`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(0)} Ko`;
  return `${n} o`;
}

export function UploadZone({ canUpload = true }: { canUpload?: boolean }) {
  const [hover, setHover] = useState(false);
  const [items, setItems] = useState<UploadItem[]>([]);
  const inputRef = useRef<HTMLInputElement>(null);

  const addFiles = useCallback((files: FileList | File[]) => {
    const list = Array.from(files);
    if (list.length === 0) return;
    setItems((prev) => [
      ...prev,
      ...list.map((f) => ({
        id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
        name: f.name,
        size: f.size,
        type: inferType(f.name),
        progress: 0,
        done: false,
      })),
    ]);
    toast.info(
      `${list.length} fichier${list.length > 1 ? "s" : ""} ajouté${list.length > 1 ? "s" : ""} à la file d'upload`,
      { description: "Traitement IA en cours…" },
    );
  }, []);

  // Simulate upload progress
  useEffect(() => {
    const pending = items.filter((i) => !i.done);
    if (pending.length === 0) return;
    const id = setInterval(() => {
      setItems((prev) =>
        prev.map((i) => {
          if (i.done) return i;
          const step = 4 + Math.random() * 14;
          const next = Math.min(100, i.progress + step);
          return next >= 100 ? { ...i, progress: 100, done: true } : { ...i, progress: next };
        }),
      );
    }, 350);
    return () => clearInterval(id);
  }, [items]);

  function onDrop(e: React.DragEvent<HTMLDivElement>) {
    e.preventDefault();
    setHover(false);
    if (!canUpload) return;
    if (e.dataTransfer.files) addFiles(e.dataTransfer.files);
  }
  function onDragOver(e: React.DragEvent<HTMLDivElement>) {
    e.preventDefault();
    if (!canUpload) return;
    setHover(true);
  }
  function onDragLeave() {
    setHover(false);
  }

  function remove(id: string) {
    setItems((prev) => prev.filter((i) => i.id !== id));
  }

  function loadDemo() {
    if (!canUpload) return;
    addFiles([
      new File([], "Reportage_terrain_Dakar.mp4", { type: "video/mp4" }),
      new File([], "Photo_couverture.jpg", { type: "image/jpeg" }),
      new File([], "Podcast_episode_14.mp3", { type: "audio/mpeg" }),
    ] as File[]);
  }

  const activeCount = items.filter((i) => !i.done).length;

  return (
    <GlassCard className="overflow-hidden">
      <div
        onDrop={onDrop}
        onDragOver={onDragOver}
        onDragLeave={onDragLeave}
        className={cn(
          "relative flex flex-col items-center justify-center gap-2 p-8 text-center transition",
          hover
            ? "bg-gradient-to-br from-accent-blue/10 via-accent-violet/10 to-transparent ring-2 ring-accent-violet"
            : "ring-1 ring-dashed ring-white/[0.08] hover:bg-white/[0.025]",
        )}
        role="button"
        tabIndex={canUpload ? 0 : -1}
        aria-disabled={!canUpload}
        onClick={() => {
          if (canUpload) inputRef.current?.click();
        }}
      >
        <input
          ref={inputRef}
          type="file"
          multiple
          disabled={!canUpload}
          className="sr-only"
          onChange={(e) => {
            if (e.target.files) addFiles(e.target.files);
            e.target.value = "";
          }}
        />
        <span
          className={cn(
            "inline-flex h-14 w-14 items-center justify-center rounded-2xl transition",
            hover
              ? "bg-gradient-to-br from-accent-blue to-accent-violet text-white shadow-glow-violet"
              : "bg-gradient-to-br from-accent-blue/15 to-accent-violet/10 text-accent-violet ring-1 ring-white/[0.08]",
          )}
        >
          <CloudUpload size={24} />
        </span>
        <p className="mt-2 text-sm font-semibold text-text-primary">
          {!canUpload
            ? "Upload réservé aux équipes habilitées"
            : hover
              ? "Déposez les fichiers pour les ajouter au DAM"
              : "Glissez vos médias ici ou cliquez pour parcourir"}
        </p>
        <p className="text-xs text-text-secondary">
          {canUpload
            ? "Vidéos · Images · Audio · jusqu'à 5 Go par fichier · transcription Whisper automatique"
            : "Vous pouvez consulter la médiathèque, mais votre rôle ne permet pas d'ajouter des fichiers."}
        </p>
        <div className="mt-2 flex items-center gap-2">
          <button
            type="button"
            disabled={!canUpload}
            onClick={(e) => {
              e.stopPropagation();
              if (canUpload) inputRef.current?.click();
            }}
            className="rounded-lg border border-white/[0.08] bg-white/[0.03] px-3 py-1.5 text-xs font-medium text-text-primary transition hover:bg-white/[0.06] disabled:cursor-not-allowed disabled:opacity-40"
          >
            Choisir des fichiers
          </button>
          <button
            type="button"
            disabled={!canUpload}
            onClick={(e) => {
              e.stopPropagation();
              loadDemo();
            }}
            className="rounded-lg border border-white/[0.08] bg-transparent px-3 py-1.5 text-xs font-medium text-text-secondary transition hover:bg-white/[0.04] hover:text-text-primary disabled:cursor-not-allowed disabled:opacity-40"
          >
            Charger une démo
          </button>
        </div>
      </div>

      {items.length > 0 && (
        <div className="border-t border-white/[0.06] p-4">
          <div className="mb-2 flex items-center justify-between">
            <p className="text-[10px] font-semibold uppercase tracking-wider text-text-muted">
              File d&apos;upload
            </p>
            <p className="text-[11px] text-text-secondary">
              {activeCount > 0
                ? `${activeCount} en cours · ${items.length - activeCount} terminé${items.length - activeCount > 1 ? "s" : ""}`
                : `${items.length} terminé${items.length > 1 ? "s" : ""}`}
            </p>
          </div>
          <ul className="space-y-2">
            {items.map((i) => {
              const Icon = icons[i.type];
              return (
                <li
                  key={i.id}
                  className="flex items-center gap-3 rounded-xl bg-white/[0.025] p-3 ring-1 ring-white/[0.06]"
                >
                  <span
                    className={cn(
                      "inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-lg",
                      i.done
                        ? "bg-success-soft text-success"
                        : "bg-white/[0.04] text-text-secondary",
                    )}
                  >
                    {i.done ? <CheckCircle2 size={14} /> : <Icon size={14} />}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-xs font-medium text-text-primary">{i.name}</p>
                    <div className="mt-1.5 flex items-center gap-2">
                      <div className="h-1 flex-1 overflow-hidden rounded-full bg-white/[0.06]">
                        <div
                          className={cn(
                            "h-full rounded-full transition-all duration-300",
                            i.done
                              ? "bg-success"
                              : "bg-gradient-to-r from-accent-blue to-accent-violet",
                          )}
                          style={{ width: `${i.progress}%` }}
                        />
                      </div>
                      <span className="shrink-0 text-[10px] tabular-nums text-text-muted">
                        {Math.round(i.progress)}% · {formatBytes(i.size)}
                      </span>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => remove(i.id)}
                    className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-md text-text-secondary transition hover:bg-white/[0.06] hover:text-text-primary"
                    aria-label="Retirer"
                  >
                    <X size={12} />
                  </button>
                </li>
              );
            })}
          </ul>
        </div>
      )}
    </GlassCard>
  );
}
