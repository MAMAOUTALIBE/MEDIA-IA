"use client";

import Link from "next/link";
import { useMobileStore, STEP_LABEL, STEP_COLOR } from "@/lib/stores/mobile-store";
import { ChannelIcon } from "@/components/ui/channel-icon";
import { formatRelative } from "@/lib/format";
import { ChevronRight, PlusCircle } from "lucide-react";

const tabs: Array<{ key: "all" | "submitted" | "published"; label: string }> = [
  { key: "all", label: "Tous" },
  { key: "submitted", label: "En attente" },
  { key: "published", label: "Publiés" },
];

import { useState } from "react";

export default function MobileContenusPage() {
  const submissions = useMobileStore((s) => s.submissions);
  const [filter, setFilter] = useState<"all" | "submitted" | "published">("all");

  const list = submissions.filter((s) => {
    if (filter === "all") return true;
    if (filter === "published") return s.step === "published";
    return s.step !== "published";
  });

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-xl font-bold tracking-tight text-text-primary">Mes contenus</h1>
        <p className="mt-1 text-xs text-text-secondary">
          Suivi en temps réel de vos soumissions et validations.
        </p>
      </div>

      <div className="flex gap-1 rounded-xl border border-white/[0.06] bg-white/[0.03] p-1">
        {tabs.map((t) => (
          <button
            key={t.key}
            type="button"
            onClick={() => setFilter(t.key)}
            className={`flex-1 rounded-lg px-2 py-1.5 text-xs font-medium transition ${
              filter === t.key
                ? "bg-gradient-to-br from-accent-blue/20 to-accent-violet/20 text-text-primary ring-1 ring-accent-violet/30"
                : "text-text-secondary hover:bg-white/[0.04]"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {list.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-white/[0.10] p-8 text-center">
          <PlusCircle size={28} className="mx-auto text-accent-violet" />
          <p className="mt-3 text-sm font-semibold text-text-primary">Aucun contenu ici</p>
          <p className="mt-1 text-xs text-text-secondary">
            Démarrez en publiant une dépêche depuis l&apos;onglet « Publier ».
          </p>
          <Link
            href="/mobile/publish"
            className="mt-4 inline-flex items-center gap-1.5 rounded-lg bg-gradient-to-r from-accent-blue to-accent-violet px-3 py-2 text-xs font-semibold text-white"
          >
            <PlusCircle size={12} />
            Nouvelle publication
          </Link>
        </div>
      ) : (
        <ul className="space-y-2">
          {list.map((s) => (
            <li key={s.id}>
              <Link
                href={`/mobile/contenus/${s.id}`}
                className="flex items-start gap-3 rounded-2xl border border-white/[0.06] bg-white/[0.025] p-3 transition active:scale-[0.98] hover:bg-white/[0.04]"
              >
                <span
                  className="mt-1 inline-block h-2 w-2 shrink-0 rounded-full"
                  style={{ background: STEP_COLOR[s.step] }}
                  aria-hidden
                />
                <div className="min-w-0 flex-1">
                  <p className="line-clamp-2 text-sm font-medium text-text-primary">
                    {s.title}
                  </p>
                  <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
                    <span
                      className="inline-flex items-center gap-1 rounded-full px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider"
                      style={{
                        color: STEP_COLOR[s.step],
                        background: `${STEP_COLOR[s.step]}22`,
                      }}
                    >
                      {STEP_LABEL[s.step]}
                    </span>
                    <span className="text-[10px] text-text-muted">
                      · {s.category} · {formatRelative(s.createdAt)}
                    </span>
                  </div>
                  <div className="mt-1.5 flex items-center gap-1">
                    {s.channels.map((c) => (
                      <ChannelIcon key={c} channel={c} size={10} />
                    ))}
                  </div>
                </div>
                <ChevronRight size={14} className="mt-2 text-text-muted" />
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
