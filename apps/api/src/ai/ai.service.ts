/**
 * AI Service — moteur d'intents heuristique côté serveur.
 *
 * Ce service interroge les datasets in-memory pour répondre à des questions
 * en langage naturel sur l'état du dashboard. Il est conçu pour être facilement
 * remplacé par un LLM réel (Claude/GPT) en Phase 2 :
 *
 *   1. Remplacer `score()` + intent switch par un appel `LLMClient.chat()` avec
 *      tool use sur les mêmes datasets.
 *   2. Garder la signature `ask(question): AIAnswer` pour ne pas casser le web.
 *   3. Activer streaming via `ask$()` qui retourne un AsyncIterable de chunks.
 */

import { Injectable } from "@nestjs/common";
import { dashboardKpis, contents, systemAlerts, users, usersById, platformShares } from "../mocks/data";
import {
  pendingContents,
  recentActivity,
  aiGlobalScore,
  aiRecommendations,
  automationRules,
} from "../mocks/data-extra";
import { workflowInstances } from "../mocks/data";

export interface AIAnswer {
  reply: string;
  bullets?: string[];
  citations?: string[];
}

function score(q: string, keywords: string[]): number {
  const low = q.toLowerCase();
  return keywords.reduce((s, k) => (low.includes(k) ? s + 1 : s), 0);
}

function formatCompact(n: number): string {
  if (Math.abs(n) >= 1_000_000) {
    return `${(n / 1_000_000).toFixed(n % 1_000_000 === 0 ? 0 : 1).replace(/\.0$/, "")}M`;
  }
  if (Math.abs(n) >= 1_000) {
    return `${(n / 1_000).toFixed(n % 1_000 === 0 ? 0 : 1).replace(/\.0$/, "")}k`;
  }
  return n.toLocaleString("fr-FR");
}

const ROLE_LABELS: Record<string, string> = {
  journalist: "Journaliste",
  editor: "Rédacteur",
  chief: "Chef d'édition",
  direction: "Direction éditoriale",
  community_manager: "Community Manager",
  admin: "Administrateur",
};

const CHANNEL_LABELS: Record<string, string> = {
  web: "Site Web",
  mobile: "Mobile Apps",
  youtube: "YouTube",
  facebook: "Facebook",
  instagram: "Instagram",
  twitter: "X / Twitter",
  tiktok: "TikTok",
  telegram: "Telegram",
  smarttv: "Smart TV",
};

@Injectable()
export class AiService {
  ask(question: string): AIAnswer {
    const q = question.trim();
    if (!q) {
      return { reply: "Posez votre question — je peux interroger contenus, audience, workflows, IA, alertes." };
    }
    const intents = [
      { name: "pending", s: score(q, ["attente", "valider", "validation", "en cours", "queue", "à faire"]) },
      { name: "top_author", s: score(q, ["journaliste", "auteur", "actif", "productif", "qui écrit"]) },
      { name: "ai_score", s: score(q, ["score ia", "score", "qualité ia", "qualité", "fiabilité"]) },
      { name: "audience", s: score(q, ["audience", "vues", "trafic", "utilisateurs", "spectateurs"]) },
      { name: "platforms", s: score(q, ["plateforme", "canal", "canaux", "diffusion", "youtube", "facebook", "tiktok", "instagram"]) },
      { name: "live", s: score(q, ["direct", "live", "streaming", "antenne", "spectateur"]) },
      { name: "alerts", s: score(q, ["alerte", "erreur", "problème", "incident", "système"]) },
      { name: "workflows", s: score(q, ["workflow", "pipeline", "retard", "bloqué"]) },
      { name: "kpi", s: score(q, ["kpi", "indicateur", "chiffre", "synthèse", "résumé", "performance"]) },
      { name: "automations", s: score(q, ["automatisation", "automation", "règle", "automatique", "n8n"]) },
      { name: "team", s: score(q, ["équipe", "team", "utilisateur", "membres", "rôle", "rédaction"]) },
      { name: "publication", s: score(q, ["publié", "publication", "publier", "diffusé", "en ligne"]) },
      { name: "help", s: score(q, ["aide", "help", "que peux-tu", "capable", "expliquer", "fonctionnalités"]) },
    ];
    intents.sort((a, b) => b.s - a.s);
    const top = intents[0]!;
    if (top.s === 0) return this.fallback(q);

    switch (top.name) {
      case "pending": return this.answerPending();
      case "top_author": return this.answerTopAuthor();
      case "ai_score": return this.answerAIScore();
      case "audience": return this.answerAudience();
      case "platforms": return this.answerPlatforms();
      case "live": return this.answerLive();
      case "alerts": return this.answerAlerts();
      case "workflows": return this.answerWorkflows();
      case "kpi": return this.answerKpi();
      case "automations": return this.answerAutomations();
      case "team": return this.answerTeam();
      case "publication": return this.answerPublication();
      case "help":
      default: return this.answerHelp();
    }
  }

  /** Streaming version : chunks the reply word by word, yielded async. */
  async *askStream(question: string): AsyncGenerator<string> {
    const answer = this.ask(question);
    const full = answer.reply;
    const words = full.split(/(\s+)/);
    for (const word of words) {
      yield word;
      await new Promise((r) => setTimeout(r, 25 + Math.random() * 40));
    }
    if (answer.bullets && answer.bullets.length > 0) {
      yield "\n\n";
      for (const b of answer.bullets) {
        yield `\n• ${b}`;
        await new Promise((r) => setTimeout(r, 80));
      }
    }
  }

  summary(): AIAnswer {
    return {
      reply: "**Synthèse temps réel** du dashboard CMR :",
      bullets: [
        `Contenus publiés ${dashboardKpis[0]?.value.toLocaleString("fr-FR")} (+${dashboardKpis[0]?.delta}%)`,
        `Audience totale ${formatCompact(dashboardKpis[1]?.value ?? 0)} (+${dashboardKpis[1]?.delta}%)`,
        `${pendingContents.length} contenus en attente · ${workflowInstances.length} workflows en cours`,
        `Score IA global : ${aiGlobalScore}/100`,
        `Alertes système : ${systemAlerts.length} actives`,
        `Top plateforme : ${CHANNEL_LABELS[platformShares[0]?.channel ?? "web"]} (${platformShares[0]?.share}%)`,
      ],
    };
  }

  private answerPending(): AIAnswer {
    const byStep: Record<string, number> = {};
    pendingContents.forEach((p) => { byStep[p.step] = (byStep[p.step] ?? 0) + 1; });
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

  private answerTopAuthor(): AIAnswer {
    const counts: Record<string, number> = {};
    contents.forEach((c) => { counts[c.authorId] = (counts[c.authorId] ?? 0) + 1; });
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
          return `${u.name} (${ROLE_LABELS[u.role]}) — ${n} contenus`;
        })
        .filter((x): x is string => Boolean(x)),
    };
  }

  private answerAIScore(): AIAnswer {
    return {
      reply: `Le score IA global de conformité éditoriale est de **${aiGlobalScore}/100** — qualifié d'excellent.`,
      bullets: aiRecommendations.length > 0
        ? ["Recommandations IA en cours :", ...aiRecommendations.map((r) => `• ${r}`)]
        : ["Aucune recommandation — tous les contrôles passent."],
    };
  }

  private answerAudience(): AIAnswer {
    const audienceKpi = dashboardKpis.find((k) => k.key === "audience");
    return {
      reply: `L'audience totale est de **${audienceKpi ? formatCompact(audienceKpi.value) : "—"}** (${audienceKpi?.delta ? `+${audienceKpi.delta}%` : ""} vs mois dernier).`,
      bullets: [
        `Vues vidéos cumulées : ${formatCompact(dashboardKpis.find((k) => k.key === "video_views")?.value ?? 0)}`,
        `Taux d'engagement : ${dashboardKpis.find((k) => k.key === "engagement")?.value ?? 0}%`,
      ],
    };
  }

  private answerPlatforms(): AIAnswer {
    const top = [...platformShares].sort((a, b) => b.share - a.share).slice(0, 5);
    return {
      reply: `Les 9 plateformes connectées totalisent l'ensemble des publications digitales — voici les **5 premières** en part d'audience :`,
      bullets: top.map((p) => `${CHANNEL_LABELS[p.channel]} — ${p.share}%`),
    };
  }

  private answerLive(): AIAnswer {
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

  private answerAlerts(): AIAnswer {
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

  private answerWorkflows(): AIAnswer {
    const late = workflowInstances.filter((w) => /^\d+h/.test(w.pendingFor));
    return {
      reply: `**${workflowInstances.length} workflows** sont en cours, dont **${late.length}** en retard (> 1h).`,
      bullets: late.length > 0
        ? late.map((w) => `${w.contentTitle} — bloqué à l'étape ${w.currentStep}/4 depuis ${w.pendingFor}`)
        : ["Aucun workflow en retard."],
    };
  }

  private answerKpi(): AIAnswer {
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

  private answerAutomations(): AIAnswer {
    const active = automationRules.filter((r) => r.active).length;
    const runs = automationRules.reduce((s, r) => s + r.runs, 0);
    const top = [...automationRules].sort((a, b) => b.runs - a.runs).slice(0, 3);
    return {
      reply: `**${active}/${automationRules.length} règles** d'automatisation sont actives, pour un total de **${formatCompact(runs)} déclenchements** cumulés.`,
      bullets: top.map((r) => `${r.name} — ${formatCompact(r.runs)} runs`),
    };
  }

  private answerTeam(): AIAnswer {
    const byRole: Record<string, number> = {};
    users.forEach((u) => { byRole[u.role] = (byRole[u.role] ?? 0) + 1; });
    return {
      reply: `L'équipe compte **${users.length} membres** répartis sur **${Object.keys(byRole).length} rôles**.`,
      bullets: Object.entries(byRole).map(
        ([role, n]) => `${ROLE_LABELS[role] ?? role} : ${n}`,
      ),
    };
  }

  private answerPublication(): AIAnswer {
    const published = contents.filter((c) => c.status === "published");
    return {
      reply: `**${published.length}/${contents.length} contenus** sont actuellement publiés (${Math.round((published.length / contents.length) * 100)}% du corpus).`,
      bullets: [
        `Activité récente : ${recentActivity.slice(0, 3).map((a) => a.message).join(" · ")}`,
      ],
    };
  }

  private answerHelp(): AIAnswer {
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

  private fallback(q: string): AIAnswer {
    return {
      reply: `Je ne suis pas certain de comprendre « *${q}* ». Reformulez — je sais interroger contenus, audience, workflows, alertes, IA, plateformes, équipe.`,
      bullets: [
        "« Combien de contenus en attente ? »",
        "« Quel est le score IA actuel ? »",
        "« Que se passe-t-il en direct ? »",
      ],
    };
  }
}
