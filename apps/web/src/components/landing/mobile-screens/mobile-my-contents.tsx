import { ChevronLeft, Plus } from "lucide-react";

const items = [
  { title: "Ouverture du nouveau centre culturel à Dakar", status: "En attente", color: "#f59e0b", ago: "Il y a 10 min" },
  { title: "Interview — Artiste XYZ", status: "Brouillon", color: "#9ca3af", ago: "Il y a 1h" },
  { title: "Reportage — Terrain", status: "En attente", color: "#f59e0b", ago: "Il y a 3h" },
  { title: "Conférence de presse", status: "Publié", color: "#10b981", ago: "Il y a 1j" },
  { title: "Festival — Backstage", status: "Publié", color: "#10b981", ago: "Il y a 2j" },
];

const tabs = ["Tous", "Brouillons", "En attente", "Publiés"];

export function MobileMyContents() {
  return (
    <div className="flex h-full flex-col bg-bg-base text-text-primary">
      <div className="flex items-center justify-between border-b border-white/[0.05] px-4 pt-8 pb-3">
        <ChevronLeft size={16} className="text-text-secondary" />
        <p className="text-xs font-semibold">Mes contenus</p>
        <Plus size={14} className="text-accent-violet" />
      </div>
      <div className="flex gap-2 border-b border-white/[0.05] px-4 py-2">
        {tabs.map((t, i) => (
          <span
            key={t}
            className={`text-[10px] font-medium ${i === 0 ? "text-accent-violet" : "text-text-muted"}`}
          >
            {t}
          </span>
        ))}
      </div>
      <ul className="flex-1 divide-y divide-white/[0.04] overflow-y-auto">
        {items.map((item) => (
          <li key={item.title} className="flex items-start gap-2 px-3 py-2.5">
            <span className="mt-0.5 h-9 w-9 shrink-0 rounded-md bg-gradient-to-br from-accent-blue/25 to-accent-violet/25" />
            <div className="min-w-0 flex-1">
              <p className="line-clamp-2 text-[11px] font-medium text-text-primary">{item.title}</p>
              <div className="mt-1 flex items-center gap-1.5">
                <span
                  className="inline-flex items-center gap-1 rounded-full px-1.5 py-0.5 text-[9px] font-semibold"
                  style={{ color: item.color, background: `${item.color}22` }}
                >
                  {item.status}
                </span>
                <span className="text-[9px] text-text-muted">{item.ago}</span>
              </div>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
