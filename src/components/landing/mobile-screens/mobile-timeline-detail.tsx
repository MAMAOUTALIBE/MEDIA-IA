import { Clock, CheckCircle2, ChevronLeft } from "lucide-react";

const timeline = [
  { label: "Soumis par", role: "Journaliste", time: "21/05/2024 - 10:15", active: false, done: true },
  { label: "Pris en charge par", role: "Rédacteur", time: "21/05/2024 - 10:20", active: false, done: true },
  { label: "En attente de validation", role: "Chef d'édition", time: "—", active: true, done: false },
  { label: "Approbation finale", role: "Direction", time: "—", active: false, done: false },
];

export function MobileTimelineDetail() {
  return (
    <div className="flex h-full flex-col bg-bg-base text-text-primary">
      <div className="flex items-center justify-between border-b border-white/[0.05] px-4 pt-8 pb-3">
        <ChevronLeft size={16} className="text-text-secondary" />
        <p className="text-xs font-semibold">Détails</p>
        <span className="text-[10px] text-text-muted">9:41</span>
      </div>
      <div className="border-b border-white/[0.05] p-3 space-y-2">
        <span className="inline-flex items-center gap-1 rounded-full bg-warning-soft px-2 py-0.5 text-[9px] font-semibold text-warning">
          <Clock size={9} />
          En attente de validation
        </span>
        <p className="text-[10px] text-text-muted">Il y a 10 min</p>
        <div>
          <p className="text-[9px] uppercase tracking-wider text-text-muted">Statut</p>
          <p className="mt-1 text-[11px] font-semibold text-text-primary">Rédacteur</p>
        </div>
        <div>
          <p className="text-[9px] uppercase tracking-wider text-text-muted">Prochain</p>
          <p className="mt-1 text-[11px] font-semibold text-text-primary">Chef d&apos;édition</p>
        </div>
      </div>
      <div className="flex-1 overflow-y-auto p-3">
        <p className="mb-3 text-[9px] uppercase tracking-wider text-text-muted">Historique</p>
        <ol className="relative space-y-3 pl-4">
          <span className="absolute left-1.5 top-1 h-full w-px bg-white/[0.08]" aria-hidden />
          {timeline.map((t, i) => (
            <li key={i} className="relative">
              <span
                className={`absolute -left-[14px] top-1 h-2.5 w-2.5 rounded-full ring-2 ring-bg-base ${
                  t.done ? "bg-success" : t.active ? "bg-warning" : "bg-white/20"
                }`}
                aria-hidden
              />
              <p className="text-[10px] text-text-muted">{t.label}</p>
              <p className="text-[11px] font-medium text-text-primary">{t.role}</p>
              <p className="mt-0.5 text-[9px] text-text-muted">{t.time}</p>
              {t.done && (
                <CheckCircle2 size={10} className="absolute right-0 top-1 text-success" />
              )}
            </li>
          ))}
        </ol>
      </div>
    </div>
  );
}
