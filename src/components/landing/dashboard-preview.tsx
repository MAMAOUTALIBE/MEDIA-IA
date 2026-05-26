"use client";

import { Container } from "@/components/ui/container";
import { GlassCard } from "@/components/ui/glass-card";
import { FadeInOnScroll } from "./fade-in-on-scroll";
import { LayoutDashboard, FileText, Image as ImageIcon, Calendar, GitBranch, Zap, Send, BarChart3, Search, Bell } from "lucide-react";
import { Area, AreaChart, Cell, Pie, PieChart, ResponsiveContainer } from "recharts";
import { CHANNELS } from "@/lib/constants";

const audienceSpark = Array.from({ length: 20 }, (_, i) => ({
  v: 60 + Math.sin(i * 0.5) * 20 + i * 1.5,
}));

const platforms = [
  { c: "web", share: 45 },
  { c: "youtube", share: 25 },
  { c: "facebook", share: 15 },
  { c: "instagram", share: 10 },
  { c: "others", share: 5 },
] as const;

const navMini = [
  { icon: LayoutDashboard, label: "Tableau de bord", active: true },
  { icon: FileText, label: "Contenus" },
  { icon: ImageIcon, label: "Médias" },
  { icon: Calendar, label: "Calendrier éditorial" },
  { icon: GitBranch, label: "Workflows" },
  { icon: Zap, label: "Automatisations" },
  { icon: Send, label: "Diffusion" },
  { icon: BarChart3, label: "Analytics" },
];

const kpis = [
  { label: "Contenus publiés", value: "1,248", delta: "+12.5%" },
  { label: "Audience totale", value: "2.4M", delta: "+18.7%" },
  { label: "Vues vidéos", value: "5.7M", delta: "+23.1%" },
  { label: "Taux d'engagement", value: "4.8%", delta: "+8.3%" },
];

const activity = [
  { title: "Le journal de 20h du 31/05/2024", meta: "Site web, YouTube, Facebook", ago: "Il y a 10 min" },
  { title: "Interview - Ministre de la Culture", meta: "En cours de validation", ago: "Il y a 25 min" },
  { title: "Reportage : Festival des musiques", meta: "Site web, Instagram", ago: "Il y a 1h" },
  { title: "Flash Info – Élections Régionales", meta: "Telegram, Twitter", ago: "Il y a 2h" },
];

const pending = [
  { title: "Émission de - Éducation", meta: "En attente de validation · Rédacteur", ago: "Il y a 15 min" },
  { title: "Reportage - Inondations", meta: "En attente de validation · Chef d'édition", ago: "Il y a 45 min" },
];

export function DashboardPreview() {
  return (
    <section className="py-16">
      <Container>
        <FadeInOnScroll>
          <GlassCard variant="elevated" className="overflow-hidden">
            {/* Topbar */}
            <div className="flex h-12 items-center gap-3 border-b border-white/[0.06] bg-bg-base/40 px-4 backdrop-blur-xl">
              <div className="flex gap-1.5">
                <span className="h-2.5 w-2.5 rounded-full bg-red-400/70" />
                <span className="h-2.5 w-2.5 rounded-full bg-amber-300/70" />
                <span className="h-2.5 w-2.5 rounded-full bg-green-400/70" />
              </div>
              <div className="relative ml-2 flex-1 max-w-md">
                <Search size={12} className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-text-muted" />
                <input
                  readOnly
                  defaultValue="Rechercher un contenu…"
                  className="h-7 w-full rounded-md border border-white/[0.08] bg-white/[0.03] pl-7 pr-2 text-[11px] text-text-muted"
                />
              </div>
              <span className="inline-flex h-7 w-7 items-center justify-center rounded-md text-text-muted">
                <Bell size={12} />
              </span>
              <span className="h-6 w-6 rounded-full bg-gradient-to-br from-accent-blue to-accent-violet" />
            </div>

            <div className="grid grid-cols-[180px_1fr]">
              {/* Sidebar */}
              <aside className="border-r border-white/[0.06] bg-sidebar/60 p-3">
                <p className="mb-2 px-2 text-[10px] font-bold uppercase tracking-wider text-accent-violet">CMR</p>
                <ul className="space-y-0.5">
                  {navMini.map((n) => {
                    const Icon = n.icon;
                    return (
                      <li
                        key={n.label}
                        className={`flex items-center gap-2 rounded-md px-2 py-1.5 text-[11px] ${n.active ? "bg-gradient-to-r from-accent-blue/15 to-accent-violet/10 text-text-primary" : "text-text-secondary"}`}
                      >
                        <Icon size={11} />
                        <span className="truncate">{n.label}</span>
                      </li>
                    );
                  })}
                </ul>
              </aside>

              {/* Main */}
              <div className="space-y-3 p-4">
                <p className="text-sm font-semibold text-text-primary">Tableau de bord</p>
                <div className="grid grid-cols-4 gap-2">
                  {kpis.map((k) => (
                    <div
                      key={k.label}
                      className="rounded-lg border border-white/[0.06] bg-white/[0.02] p-2"
                    >
                      <p className="text-[9px] text-text-muted">{k.label}</p>
                      <p className="mt-0.5 text-base font-bold text-text-primary">{k.value}</p>
                      <p className="text-[9px] font-semibold text-success">{k.delta}</p>
                    </div>
                  ))}
                </div>

                <div className="grid grid-cols-[2fr_1fr] gap-2">
                  {/* activity */}
                  <div className="rounded-lg border border-white/[0.06] bg-white/[0.02] p-2">
                    <p className="mb-1 text-[10px] font-semibold text-text-primary">Activité récente</p>
                    <ul className="space-y-1">
                      {activity.map((a) => (
                        <li key={a.title} className="flex items-start gap-2">
                          <span className="mt-0.5 h-5 w-5 shrink-0 rounded bg-gradient-to-br from-accent-blue/30 to-accent-violet/30" />
                          <div className="min-w-0">
                            <p className="truncate text-[10px] font-medium text-text-primary">{a.title}</p>
                            <p className="text-[9px] text-text-muted">{a.meta} · {a.ago}</p>
                          </div>
                        </li>
                      ))}
                    </ul>
                  </div>
                  {/* chart */}
                  <div className="rounded-lg border border-white/[0.06] bg-white/[0.02] p-2">
                    <p className="mb-1 text-[10px] font-semibold text-text-primary">Statistiques d&apos;audience</p>
                    <div className="h-16">
                      <ResponsiveContainer width="100%" height="100%">
                        <AreaChart data={audienceSpark} margin={{ top: 0, right: 0, bottom: 0, left: 0 }}>
                          <defs>
                            <linearGradient id="preview-audience" x1="0" y1="0" x2="0" y2="1">
                              <stop offset="0%" stopColor="#60a5fa" stopOpacity={0.6} />
                              <stop offset="100%" stopColor="#60a5fa" stopOpacity={0} />
                            </linearGradient>
                          </defs>
                          <Area type="monotone" dataKey="v" stroke="#60a5fa" strokeWidth={1.4} fill="url(#preview-audience)" />
                        </AreaChart>
                      </ResponsiveContainer>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-[1fr_140px] gap-2">
                  {/* pending */}
                  <div className="rounded-lg border border-white/[0.06] bg-white/[0.02] p-2">
                    <p className="mb-1 text-[10px] font-semibold text-text-primary">Contenus en attente</p>
                    <ul className="space-y-1">
                      {pending.map((p) => (
                        <li
                          key={p.title}
                          className="flex items-center justify-between gap-2 rounded-md border border-white/[0.05] bg-white/[0.025] px-2 py-1.5"
                        >
                          <div className="min-w-0">
                            <p className="truncate text-[10px] font-medium text-text-primary">{p.title}</p>
                            <p className="text-[9px] text-text-muted">{p.meta} · {p.ago}</p>
                          </div>
                          <span className="rounded bg-warning-soft px-1.5 py-0.5 text-[9px] font-bold text-warning">À valider</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                  {/* donut */}
                  <div className="rounded-lg border border-white/[0.06] bg-white/[0.02] p-2">
                    <p className="mb-1 text-[10px] font-semibold text-text-primary">Répartition</p>
                    <div className="relative h-24">
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie data={platforms.slice() as unknown as Array<{ c: string; share: number }>} dataKey="share" nameKey="c" innerRadius={26} outerRadius={44} stroke="rgba(0,0,0,0.5)">
                            {platforms.map((p) => (
                              <Cell key={p.c} fill={p.c === "others" ? "#9ca3af" : CHANNELS[p.c as keyof typeof CHANNELS]?.color ?? "#9ca3af"} />
                            ))}
                          </Pie>
                        </PieChart>
                      </ResponsiveContainer>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </GlassCard>
        </FadeInOnScroll>
      </Container>
    </section>
  );
}
