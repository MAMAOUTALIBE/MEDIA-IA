import { Injectable, Logger } from "@nestjs/common";
import Anthropic from "@anthropic-ai/sdk";
import { CircuitBreaker } from "../common/circuit-breaker";
import { PrismaService } from "../prisma/prisma.service";

const MODEL = process.env.CLAUDE_MODEL ?? "claude-sonnet-4-6";
const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY;

/**
 * Sprint 3 — Claude Sonnet 4.6 réel avec prompt caching (TTL 5 min).
 *
 * Architecture :
 *  - Système prompt long (charte éditoriale + format de réponse) → MARQUÉ
 *    `cache_control: ephemeral` → réutilisé sans re-tokeniser pour 5 min
 *  - Snapshot dashboard (KPI + workflow counts + alertes système) calculé
 *    en DB à chaque requête mais agrégé en court résumé pour rester sous le
 *    seuil de coût
 *  - Streaming SSE via `messages.stream()`
 *  - Si ANTHROPIC_API_KEY absent → throw NotAvailable (AiService fallback heuristique)
 *
 * Refs :
 *  - https://docs.anthropic.com/en/docs/build-with-claude/prompt-caching
 *  - ADR-006 / ADR-007 (souveraineté : LLM derrière API proxy si requis)
 */
@Injectable()
export class ClaudeService {
  private readonly logger = new Logger(ClaudeService.name);
  private readonly client: Anthropic | null;
  // Claude rate-limits and partial outages should fail fast rather than queue
  // requests against a known-degraded upstream.
  private readonly breaker = new CircuitBreaker({
    name: "claude",
    failureThreshold: 5,
    resetTimeoutMs: 30_000,
  });

  constructor(private readonly prisma: PrismaService) {
    if (!ANTHROPIC_API_KEY) {
      this.client = null;
      this.logger.warn("ANTHROPIC_API_KEY not set — Claude integration disabled, falling back to heuristic engine");
    } else {
      this.client = new Anthropic({ apiKey: ANTHROPIC_API_KEY });
    }
  }

  isAvailable(): boolean {
    return this.client !== null && this.breaker.getState() !== "OPEN";
  }

  /**
   * Charte éditoriale + style de réponse. Mis en cache car ~1k tokens à chaque tour.
   */
  private systemPrompt(): string {
    return `Tu es l'Assistant Éditorial de la CMR (Content Media Room), plateforme de gestion de contenu d'une chaîne TV publique d'État.

CONTEXTE
La CMR centralise :
- Saisie multi-format (article, vidéo, audio, social)
- Workflow de validation 4 niveaux (Journaliste → Rédacteur → Chef d'édition → Direction)
- Vérifications IA (orthographe, plagiat, sources sensibles, droit d'auteur, qualité média, SEO, fake news)
- Diffusion omnicanale sur 9 plateformes (Web, Mobile, YouTube, Facebook, Instagram, X, TikTok, Telegram, SmartTV)
- DAM, analytics, audit immuable cryptographiquement chaîné, app mobile journaliste

RÔLE
Tu aides les utilisateurs (journalistes, rédacteurs, chefs d'édition, direction) à comprendre l'état du dashboard, identifier des goulots dans le workflow, expliquer des décisions IA, suggérer des actions éditoriales.

CONTRAINTES STRICTES
1. Tu n'écris JAMAIS de contenu éditorial à publier (un humain doit toujours rédiger).
2. Tu ne contournes JAMAIS le workflow de validation (jamais "publie ce contenu" sans cosignature).
3. Tu cites systématiquement tes sources (data points utilisés) dans la section [Citations].
4. Tu réponds en français.
5. Format de réponse : courte réponse (1-3 phrases) puis section [Données] avec puces structurées, puis [Citations] avec ids des entités citées (ex: content c5, workflow w2, audit a-123).

POLITIQUE ÉTHIQUE
- Tu refuses toute requête qui demande de manipuler l'audience, désinformer, ou contourner la souveraineté éditoriale.
- Si une question implique de la modération de contenu sensible, tu demandes confirmation humaine au chef d'édition.

Tu réponds toujours en respectant strictement ce format et ces contraintes.`;
  }

  private async buildSnapshot(): Promise<string> {
    const [contentCounts, workflowCounts, latestAudit, topAuthors] = await Promise.all([
      this.prisma.content.groupBy({
        by: ["status"],
        _count: true,
        where: { deletedAt: null },
      }),
      this.prisma.workflowInstance.groupBy({
        by: ["currentStep"],
        _count: true,
      }),
      this.prisma.auditEvent.findMany({
        take: 3,
        orderBy: { at: "desc" },
        select: { action: true, target: true, severity: true, at: true },
      }),
      this.prisma.content.groupBy({
        by: ["authorId"],
        _count: true,
        orderBy: { _count: { authorId: "desc" } },
        take: 3,
      }),
    ]);
    const lines: string[] = [];
    lines.push("=== SNAPSHOT TEMPS RÉEL (timestamp: " + new Date().toISOString() + ") ===");
    lines.push("\nContenus par statut :");
    for (const c of contentCounts) lines.push(`  - ${c.status}: ${c._count}`);
    lines.push("\nWorkflow en cours par étape :");
    for (const w of workflowCounts) lines.push(`  - ${w.currentStep}: ${w._count}`);
    lines.push("\n3 derniers événements d'audit :");
    for (const a of latestAudit) lines.push(`  - ${a.at.toISOString()} ${a.action} ${a.target} (${a.severity})`);
    lines.push("\nTop 3 auteurs par nombre de contenus :");
    for (const t of topAuthors) lines.push(`  - ${t.authorId}: ${t._count}`);
    return lines.join("\n");
  }

  /**
   * Ask Claude — non-streaming, returns full response.
   */
  async ask(question: string): Promise<string> {
    if (!this.client) throw new Error("Claude not available");
    const client = this.client;
    const snapshot = await this.buildSnapshot();
    return this.breaker.exec(async () => {
      const res = await client.messages.create({
        model: MODEL,
        max_tokens: 1024,
        system: [
          {
            type: "text",
            text: this.systemPrompt(),
            cache_control: { type: "ephemeral" }, // ~1k tokens cached 5 min
          },
        ],
        messages: [
          {
            role: "user",
            content: `${snapshot}\n\n---\nQUESTION UTILISATEUR :\n${question}`,
          },
        ],
      });
      const text = res.content
        .map((b) => (b.type === "text" ? b.text : ""))
        .filter(Boolean)
        .join("\n");
      return text || "(aucune réponse)";
    });
  }

  /**
   * Streaming ask — async generator yielding text chunks as Claude streams.
   */
  async *askStream(question: string): AsyncGenerator<string> {
    if (!this.client) throw new Error("Claude not available");
    const snapshot = await this.buildSnapshot();
    const stream = this.client.messages.stream({
      model: MODEL,
      max_tokens: 1024,
      system: [
        {
          type: "text",
          text: this.systemPrompt(),
          cache_control: { type: "ephemeral" },
        },
      ],
      messages: [
        {
          role: "user",
          content: `${snapshot}\n\n---\nQUESTION UTILISATEUR :\n${question}`,
        },
      ],
    });
    for await (const event of stream) {
      if (event.type === "content_block_delta" && event.delta.type === "text_delta") {
        yield event.delta.text;
      }
    }
  }
}
