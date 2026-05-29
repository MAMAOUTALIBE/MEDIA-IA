"use client";

import { useParams } from "next/navigation";
import Link from "next/link";
import { useDraftsStore } from "@/lib/stores/drafts-store";
import { useContent } from "@/lib/queries";
import { useEffectiveRole } from "@/lib/use-rbac";
import { usersById, currentUser } from "@/lib/mocks/users";
import { ContentEditor } from "@/components/dashboard/contenus/content-editor";
import { FileQuestion, ArrowLeft, Loader2 } from "lucide-react";
import { GlassCard } from "@/components/ui/glass-card";
import type { Content } from "@/types";

export default function ContentEditPage() {
  const params = useParams<{ id: string }>();
  const id = params.id;
  const getDraft = useDraftsStore((s) => s.getById);
  const draft = getDraft(id);
  // API hook : si le content vient de l'API, c'est la source de vérité ;
  // sinon on tombe sur les mocks (mode démo offline).
  const { data: apiContent, isLoading } = useContent(draft ? undefined : id);
  const role = useEffectiveRole();

  if (!draft && isLoading) {
    return (
      <div className="mx-auto max-w-md py-16 text-center">
        <Loader2 size={20} className="mx-auto animate-spin text-accent-violet" />
        <p className="mt-2 text-xs text-text-secondary">Chargement…</p>
      </div>
    );
  }

  const content = (draft ?? apiContent) as Content | undefined;
  if (!content) {
    return (
      <div className="mx-auto max-w-md py-16">
        <GlassCard className="p-8 text-center">
          <span className="mx-auto inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-accent-blue/12 to-accent-violet/10 text-accent-violet ring-1 ring-white/[0.08]">
            <FileQuestion size={22} />
          </span>
          <p className="mt-4 text-base font-semibold text-text-primary">
            Contenu introuvable
          </p>
          <p className="mt-1 text-xs text-text-secondary">
            L&apos;identifiant <code className="font-mono text-text-primary">{id}</code> ne correspond à aucun contenu ni brouillon enregistré.
          </p>
          <Link
            href="/dashboard/contenus"
            className="mt-5 inline-flex items-center gap-2 rounded-lg border border-white/[0.08] bg-white/[0.03] px-3 py-2 text-xs font-medium text-text-primary transition hover:bg-white/[0.08]"
          >
            <ArrowLeft size={12} />
            Retour à la liste
          </Link>
        </GlassCard>
      </div>
    );
  }
  const author = draft ? currentUser : usersById[content.authorId] ?? currentUser;
  // Source = "api" si on a un vrai content backend (id ne commence pas par draft-),
  // sinon "local" = brouillon Zustand uniquement.
  const source: "api" | "local" = draft ? "local" : "api";
  void role; // disponible pour gating UI ultérieur
  return <ContentEditor content={content} author={author} source={source} />;
}
