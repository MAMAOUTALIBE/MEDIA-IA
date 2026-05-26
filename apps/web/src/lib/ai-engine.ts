import { dashboardKpis } from "@/lib/mocks/kpis";
import { contents, pendingContents } from "@/lib/mocks/contents";
import { systemAlerts } from "@/lib/mocks/system-alerts";
import { workflowInstances } from "@/lib/mocks/workflows";
import { aiGlobalScore, aiRecommendations } from "@/lib/mocks/ai-checks";
import { platformShares } from "@/lib/mocks/platforms";
import { users, usersById } from "@/lib/mocks/users";
import { audience30d } from "@/lib/mocks/audience-series";
import { automationRules } from "@/lib/mocks/automation-rules";
import { CHANNELS, ROLES, STATUS } from "@/lib/constants";
import { formatCompact } from "@/lib/format";

export interface AIAnswer {
  reply: string;
  bullets?: string[];
  citations?: string[];
}

/** Heuristic NLU — scores how strongly the question matches each intent. */
function score(q: string, keywords: string[]): number {
  const low = q.toLowerCase();
  return keywords.reduce((s, k) => (low.includes(k) ? s + 1 : s), 0);
}

export function ask(question: string): AIAnswer {
  const q = question.trim();
  if (!q) {
    return { reply: "Posez votre question — je peux interroger les contenus, l'audience, les workflows, l'IA ou les alertes." };
  }

  // Intents (highest score wins)
  const intents: Array<{ name: string; s: number }> = [
    { name: "pending", s: score(q, ["attente", "valider", "validation", "en cours", "queue", "à faire"]) },
    { name: "top_author", s: score(q, ["journaliste", "auteur", "actif", "productif", "qui écrit"]) },
    { name: "ai_score", s: score(q, ["score ia", "score", "qualité ia", "qualité", "fiabilité", "ia"]) },
    { name: "audience", s: score(q, ["audience", "vues", "trafic", "utilisateurs", "spectateurs"]) },
    { name: "platforms", s: score(q, ["plateforme", "canal", "canaux", "diffusion", "youtube", "facebook", "tiktok", "instagram"]) },
    { name: "live", s: score(q, ["direct", "live", "streaming", "antenne", "diffusion en direct", "spectateur"]) },
    { name: "alerts", s: score(q, ["alerte", "erreur", "problème", "incident", "incident en cours", "système"]) },
    { name: "workflows", s: score(q, ["workflow", "pipeline", "retard", "bloqué", "en retard"]) },
    { name: "kpi", s: score(q, ["kpi", "indicateur", "chiffre", "synthèse", "résumé", "performance"]) },
    { name: "automations", s: score(q, ["automatisation", "automation", "règle", "automatique", "n8n"]) },
    { name: "team", s: score(q, ["équipe", "team", "utilisateur", "membres", "rôle", "rédaction"]) },
    { name: "publication", s: score(q, ["publié", "publication", "publier", "diffusé", "en ligne"]) },
    { name: "help", s: score(q, ["aide", "help", "que peux-tu", "que peut", "capable", "expliquer", "fonctionnalités"]) },
  ];
  intents.sort((a, b) => b.s - a.s);
  const top = intents[0]!;
  if (top.s === 0) {
    return fallback(q);
  }

  switch (top.name) {
    case "pending":
      return answerPending();
    case "top_author":
      return answerTopAuthor();
    case "ai_score":
      return answerAIScore();
    case "audience":
      return answerAudience();
    case "platforms":
      return answerPlatforms();
    case "live":
      return answerLive();
    case "alerts":
      return answerAlerts();
    case "workflows":
      return answerWorkflows();
    case "kpi":
      return answerKpi();
    case "automations":
      return answerAutomations();
    case "team":
      return answerTeam();
    case "publication":
      return answerPublication();
    case "help":
    default:
      return answerHelp();
  }
}

function answerPending(): AIAnswer {
  const byStep: Record<string, number> = {};
  pendingContents.forEach((p) => {
    byStep[p.step] = (byStep[p.step] ?? 0) + 1;
  });
  const oldest = [...pendingContents].sort((a, b) => a.submittedAt.localeCompare(b.submittedAt))[0];
  return {
    reply: `Il y a actuellement **${pendingContents.length} contenu${pendingContents.length > 1 ? "s" : ""} en attente** dans le pipeline de validation.`,
    bullets: [
      `Chez le rédacteur : ${byStep["editor"] ?? 0}`,
      `Chef d'édition : ${byStep["chief"] ?? 0}`,
      `Direction éditoriale : ${byStep["direction"] ?? 0}`,
      oldest ? `Le plus ancien : « ${oldest.title} » par ${oldest.author.name}` : "",
    ].filter(Boolean),
  };
}

function answerTopAuthor(): AIAnswer {
  const counts: Record<string, number> = {};
  contents.forEach((c) => {
    counts[c.authorId] = (counts[c.authorId] ?? 0) + 1;
  });
  const ranked = Object.entries(counts).sort((a, b) => b[1] - a[1]).slice(0, 3);
  const top = ranked[0];
  if (!top) return { reply: "Aucune donnée disponible sur les auteurs." };
  const topUser = usersById[top[0]];
  return {
    reply: `**${topUser?.name ?? "Inconnu"}** est le journaliste le plus actif avec **${top[1]} contenus** sur la période.`,
    bullets: ranked
      .map(([uid, n]) => {
        const u = usersById[uid];
        if (!u) return null;
        return `${u.name} (${ROLES[u.role].label}) — ${n} contenus`;
      })
      .filter((x): x is string => Boolean(x)),
  };
}

function answerAIScore(): AIAnswer {
  return {
    reply: `Le score IA global de conformité éditoriale est de **${aiGlobalScore}/100** — qualifié d'excellent.`,
    bullets: aiRecommendations.length > 0
      ? ["Recommandations IA en cours :", ...aiRecommendations.map((r) => `• ${r}`)]
      : ["Aucune recommandation — tous les contrôles passent."],
  };
}

function answerAudience(): AIAnswer {
  const audienceKpi = dashboardKpis.find((k) => k.key === "audience");
  const last = audience30d[audience30d.length - 1];
  const first = audience30d[0];
  const growth = first && last ? Math.round(((last.views - first.views) / first.views) * 100) : 0;
  return {
    reply: `L'audience totale est de **${audienceKpi ? formatCompact(audienceKpi.value) : "—"}** (${audienceKpi?.delta ? `+${audienceKpi.delta}%` : ""} vs mois dernier), avec ${growth >= 0 ? "une croissance" : "une baisse"} de **${Math.abs(growth)}%** sur les 30 derniers jours.`,
    bullets: [
      `Vues vidéos cumulées : ${formatCompact(dashboardKpis.find((k) => k.key === "video_views")?.value ?? 0)}`,
      `Taux d'engagement : ${dashboardKpis.find((k) => k.key === "engagement")?.value ?? 0}%`,
      last ? `Hier : ${formatCompact(last.views)} vues · ${formatCompact(last.users)} utilisateurs uniques` : "",
    ].filter(Boolean),
  };
}

function answerPlatforms(): AIAnswer {
  const top = [...platformShares].sort((a, b) => b.share - a.share).slice(0, 5);
  return {
    reply: `Les 9 plateformes connectées totalisent l'ensemble des publications digitales — voici les **5 premières** en part d'audience :`,
    bullets: top.map((p) => `${CHANNELS[p.channel].label} — ${p.share}%`),
  };
}

function answerLive(): AIAnswer {
  return {
    reply: `Une diffusion est **actuellement en direct** — *Journal de 20h, Édition spéciale Élections régionales*.`,
    bullets: [
      "Spectateurs simultanés : ~48 200 (cf. compteur live)",
      "Pic d'audience : 52 400",
      "6 canaux de diffusion actifs en parallèle (YouTube, Facebook, Instagram, X, TikTok, Smart TV)",
      "Santé du flux : excellente · 6.2 Mbps · 0.02% de dropped frames",
    ],
    citations: ["/dashboard/live"],
  };
}

function answerAlerts(): AIAnswer {
  const sev = (s: string) => systemAlerts.filter((a) => a.severity === s).length;
  return {
    reply: `Il y a **${systemAlerts.length} alerte${systemAlerts.length > 1 ? "s" : ""} système** actives en ce moment.`,
    bullets: [
      `Critiques : ${sev("error")}`,
      `Avertissements : ${sev("warning")}`,
      `Informations : ${sev("info")}`,
      ...systemAlerts.slice(0, 3).map((a) => `• ${a.title} — ${a.detail}`),
    ],
  };
}

function answerWorkflows(): AIAnswer {
  const late = workflowInstances.filter((w) => /^\d+h/.test(w.pendingFor));
  return {
    reply: `**${workflowInstances.length} workflows** sont en cours, dont **${late.length}** en retard (> 1h).`,
    bullets: late.length > 0
      ? late.map((w) => `${w.contentTitle} — bloqué à l'étape ${w.currentStep}/4 depuis ${w.pendingFor}`)
      : ["Aucun workflow en retard — toutes les étapes avancent."],
  };
}

function answerKpi(): AIAnswer {
  return {
    reply: `Synthèse des **4 KPI principaux** sur la période courante :`,
    bullets: dashboardKpis.map((k) => {
      const value =
        k.formatter === "percent"
          ? `${k.value}%`
          : k.formatter === "compact"
            ? formatCompact(k.value)
            : k.value.toLocaleString("fr-FR");
      return `${k.label} : **${value}** (${k.trend === "up" ? "+" : "-"}${k.delta}%)`;
    }),
  };
}

function answerAutomations(): AIAnswer {
  const active = automationRules.filter((r) => r.active).length;
  const runs = automationRules.reduce((s, r) => s + r.runs, 0);
  const top = [...automationRules].sort((a, b) => b.runs - a.runs).slice(0, 3);
  return {
    reply: `**${active}/${automationRules.length} règles** d'automatisation sont actives, pour un total de **${formatCompact(runs)} déclenchements** cumulés.`,
    bullets: top.map((r) => `${r.name} — ${formatCompact(r.runs)} runs`),
  };
}

function answerTeam(): AIAnswer {
  const byRole: Record<string, number> = {};
  users.forEach((u) => {
    byRole[u.role] = (byRole[u.role] ?? 0) + 1;
  });
  return {
    reply: `L'équipe compte **${users.length} membres** répartis sur **${Object.keys(byRole).length} rôles**.`,
    bullets: Object.entries(byRole).map(
      ([role, n]) => `${ROLES[role as keyof typeof ROLES].label} : ${n}`,
    ),
  };
}

function answerPublication(): AIAnswer {
  const published = contents.filter((c) => c.status === "published");
  const total = contents.length;
  const byType: Record<string, number> = {};
  published.forEach((c) => {
    byType[c.type] = (byType[c.type] ?? 0) + 1;
  });
  return {
    reply: `**${published.length}/${total} contenus** sont actuellement publiés (${Math.round((published.length / total) * 100)}% du corpus).`,
    bullets: [
      `Vidéos : ${byType["video"] ?? 0}`,
      `Articles : ${byType["article"] ?? 0}`,
      `Social : ${byType["social"] ?? 0}`,
      `Audio : ${byType["audio"] ?? 0}`,
      `Statuts : ${Object.entries(STATUS)
        .map(([k]) => `${STATUS[k as keyof typeof STATUS].label} (${contents.filter((c) => c.status === k).length})`)
        .join(" · ")}`,
    ],
  };
}

function answerHelp(): AIAnswer {
  return {
    reply: "Je peux interroger les données du dashboard. Voici quelques exemples :",
    bullets: [
      "« Combien de contenus en attente de validation ? »",
      "« Quel journaliste publie le plus ? »",
      "« Quel est le score IA moyen ? »",
      "« Quelles plateformes performent le mieux ? »",
      "« Que se passe-t-il en direct ? »",
      "« Y a-t-il des alertes système ? »",
      "« Combien de règles d'automatisation actives ? »",
    ],
  };
}

function fallback(q: string): AIAnswer {
  return {
    reply: `Je ne suis pas certain de comprendre « *${q}* ». Essayez de reformuler — je sais interroger les contenus, l'audience, les workflows, les alertes, l'IA, les plateformes ou l'équipe.`,
    bullets: [
      "« Combien de contenus en attente ? »",
      "« Quel est le score IA actuel ? »",
      "« Que se passe-t-il en direct ? »",
    ],
  };
}

export const SUGGESTED_PROMPTS = [
  "Combien de contenus en attente de validation ?",
  "Quel journaliste publie le plus ?",
  "Que se passe-t-il en direct ?",
  "Quel est le score IA actuel ?",
  "Quelles plateformes performent le mieux ?",
  "Y a-t-il des alertes ou workflows en retard ?",
];

export interface SlashCommand {
  command: string;
  argHint?: string;
  description: string;
}

export const SLASH_COMMANDS: SlashCommand[] = [
  { command: "/goto", argHint: "<page>", description: "Naviguer vers une page du dashboard" },
  { command: "/help", description: "Afficher l'aide et les exemples de questions" },
  { command: "/clear", description: "Effacer la conversation courante" },
  { command: "/export", description: "Exporter la conversation au format Markdown" },
  { command: "/summary", description: "Résumé express de l'état du dashboard" },
];

export function summary(): AIAnswer {
  return {
    reply: "**Synthèse temps réel** du dashboard CMR :",
    bullets: [
      `KPI · Contenus publiés ${dashboardKpis[0]?.value.toLocaleString("fr-FR")} (+${dashboardKpis[0]?.delta}%)`,
      `Audience totale ${formatCompact(dashboardKpis[1]?.value ?? 0)} (+${dashboardKpis[1]?.delta}%)`,
      `${pendingContents.length} contenus en attente · ${workflowInstances.length} workflows en cours`,
      `Score IA global : ${aiGlobalScore}/100`,
      `Alertes système : ${systemAlerts.length} actives`,
      `Top plateforme : ${CHANNELS[platformShares[0]?.channel ?? "web"].label} (${platformShares[0]?.share}%)`,
    ],
  };
}
