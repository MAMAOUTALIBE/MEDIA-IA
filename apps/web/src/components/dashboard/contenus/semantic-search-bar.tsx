"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Search, Sparkles, Loader2 } from "lucide-react";
import { GlassCard } from "@/components/ui/glass-card";
import { useSearchContents } from "@/lib/queries";

/**
 * Recherche sémantique pgvector + fallback keyword.
 *
 * UX :
 *   - Tape ≥ 2 caractères, débounce 300ms (TanStack Query gère via enabled)
 *   - Affiche un dropdown avec résultats + indicateur "mode: sémantique" ou
 *     "mode: keyword" pour expliquer pourquoi tel résultat ressort.
 *   - Clic = navigue vers /dashboard/contenus/:id
 */
export function SemanticSearchBar() {
  const [q, setQ] = useState("");
  const [focused, setFocused] = useState(false);
  const router = useRouter();
  const { data, isFetching } = useSearchContents(q);

  const showDropdown = focused && q.trim().length >= 2;

  return (
    <div className="relative w-full max-w-2xl">
      <div className="relative">
        <Search
          size={16}
          className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-text-muted"
        />
        <input
          type="search"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          onFocus={() => setFocused(true)}
          onBlur={() => setTimeout(() => setFocused(false), 150)}
          placeholder="Recherche sémantique — tape « réforme éducative au Mali »…"
          className="h-11 w-full rounded-xl border border-white/[0.08] bg-white/[0.03] pl-10 pr-12 text-sm text-text-primary placeholder:text-text-muted focus:border-accent-violet/40 focus:outline-none focus:ring-2 focus:ring-accent-violet/20"
        />
        {isFetching && (
          <Loader2
            size={14}
            className="absolute right-4 top-1/2 -translate-y-1/2 animate-spin text-accent-violet"
          />
        )}
      </div>

      {showDropdown && (
        <GlassCard className="absolute left-0 right-0 top-full z-40 mt-2 max-h-96 overflow-y-auto p-2">
          {data && data.count > 0 ? (
            <>
              <div className="mb-1 flex items-center gap-2 border-b border-white/[0.05] px-2 py-1.5">
                <Sparkles size={12} className="text-accent-violet" />
                <span className="text-[10px] uppercase tracking-wider text-text-muted">
                  {data.mode === "semantic"
                    ? `Résultats par similarité de sens (${data.count})`
                    : `Résultats par mots-clés (${data.count})`}
                </span>
              </div>
              <ul className="space-y-0.5">
                {data.items.map((c) => (
                  <li key={c.id}>
                    <button
                      type="button"
                      onMouseDown={() => router.push(`/dashboard/contenus/${c.id}`)}
                      className="w-full rounded-lg px-3 py-2 text-left transition hover:bg-white/[0.04]"
                    >
                      <p className="line-clamp-1 text-sm font-medium text-text-primary">
                        {c.title}
                      </p>
                      <p className="line-clamp-1 text-xs text-text-secondary">
                        {c.summary ?? c.excerpt ?? "—"}
                      </p>
                      {c.tags && c.tags.length > 0 && (
                        <div className="mt-1 flex flex-wrap gap-1">
                          {c.tags.slice(0, 4).map((t) => (
                            <span
                              key={t}
                              className="rounded-full bg-accent-violet/10 px-1.5 py-0.5 text-[9px] text-accent-violet"
                            >
                              {t}
                            </span>
                          ))}
                        </div>
                      )}
                    </button>
                  </li>
                ))}
              </ul>
            </>
          ) : (
            <p className="px-3 py-4 text-center text-xs text-text-muted">
              Aucun résultat pour « {q} »
            </p>
          )}
        </GlassCard>
      )}
    </div>
  );
}
