"use client";

import { Zap } from "lucide-react";

const items = [
  "FLASH — Conseil des ministres exceptionnel ce soir à 19h00",
  "MARCHÉS — Le BRVM termine en hausse de +1.4% sur la journée",
  "SPORT — La finale du championnat national fixée à samedi 28/05",
  "INTERNATIONAL — Sommet de l'UA : Dakar accueille les délégations dès vendredi",
  "CULTURE — Festival des musiques : 220 000 entrées sur le week-end",
  "MÉTÉO — Vigilance orange pour orages sur le centre du pays",
  "TECH — Le satellite national entre en orbite avec succès",
];

export function BreakingNewsTicker() {
  // Duplicate items for seamless infinite scroll
  const loop = [...items, ...items];
  return (
    <div className="relative overflow-hidden rounded-2xl border border-white/[0.06] bg-bg-elevated/60 ring-1 ring-white/[0.04]">
      <div className="absolute left-0 top-0 z-10 flex h-full items-center gap-2 bg-gradient-to-r from-warning/20 via-warning/10 to-transparent px-3">
        <span className="relative inline-flex h-2 w-2">
          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-warning opacity-75" />
          <span className="relative inline-flex h-2 w-2 rounded-full bg-warning shadow-[0_0_8px_rgba(245,158,11,0.7)]" />
        </span>
        <span className="inline-flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-warning">
          <Zap size={11} />
          Breaking
        </span>
      </div>
      <div
        aria-hidden
        className="pointer-events-none absolute right-0 top-0 z-10 h-full w-16 bg-gradient-to-l from-bg-elevated to-transparent"
      />
      <div className="flex items-center py-2 pl-32 pr-4">
        <div className="flex animate-[cmr-ticker_60s_linear_infinite] gap-12 whitespace-nowrap text-xs text-text-secondary">
          {loop.map((t, i) => (
            <span key={i} className="inline-flex items-center gap-2">
              <span className="inline-block h-1 w-1 rounded-full bg-warning" />
              {t}
            </span>
          ))}
        </div>
      </div>
      <style>{`@keyframes cmr-ticker{from{transform:translateX(0)}to{transform:translateX(-50%)}}`}</style>
    </div>
  );
}
