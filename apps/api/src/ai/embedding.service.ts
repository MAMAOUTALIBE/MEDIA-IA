import { Injectable, Logger } from "@nestjs/common";

const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
const OPENAI_URL = "https://api.openai.com/v1/embeddings";
const MODEL = process.env.OPENAI_EMBEDDING_MODEL ?? "text-embedding-3-small";
const DIMENSIONS = Number(process.env.EMBEDDING_DIMENSIONS ?? 384);

/**
 * EmbeddingService — vectorise le texte CMR pour la recherche sémantique.
 *
 * Provider : OpenAI text-embedding-3-small en 384 dimensions (option
 * `dimensions` du endpoint, qui tronque l'embedding 1536 native sans perte
 * sémantique significative — économise 75% d'espace disque + index).
 *
 * Si OPENAI_API_KEY manque, isAvailable() = false et embed() retourne null.
 * Les contents seront créés sans embedding — la recherche sémantique fera
 * fallback sur full-text search (keyword) côté ContentsService.
 *
 * Pourquoi pas Groq : Groq n'expose pas encore d'endpoint embeddings publique
 * en 2026-05. Voyage AI ou Cohere sont des alternatives ; OpenAI reste le
 * choix par défaut pour la qualité/prix sur du français.
 */
@Injectable()
export class EmbeddingService {
  private readonly logger = new Logger(EmbeddingService.name);

  isAvailable(): boolean {
    return Boolean(OPENAI_API_KEY);
  }

  /**
   * Renvoie un vecteur `DIMENSIONS`-d, ou null si l'upstream est indispo.
   * On ne throw PAS pour ne pas faire planter createDraft/updateDraft —
   * un content sans embedding sera juste invisible à la recherche sémantique
   * tant qu'un backfill ne tourne pas.
   */
  async embed(text: string): Promise<number[] | null> {
    if (!OPENAI_API_KEY) return null;
    const cleaned = text.replace(/\s+/g, " ").trim().slice(0, 8000);
    if (cleaned.length < 10) return null;

    try {
      const res = await fetch(OPENAI_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${OPENAI_API_KEY}`,
        },
        body: JSON.stringify({
          model: MODEL,
          input: cleaned,
          dimensions: DIMENSIONS,
        }),
      });
      if (!res.ok) {
        const body = await res.text();
        this.logger.warn(`OpenAI embed ${res.status}: ${body.slice(0, 200)}`);
        return null;
      }
      const json = (await res.json()) as {
        data?: Array<{ embedding?: number[] }>;
      };
      const v = json.data?.[0]?.embedding;
      if (!Array.isArray(v) || v.length !== DIMENSIONS) {
        this.logger.warn(`OpenAI returned invalid embedding (len=${v?.length ?? 0})`);
        return null;
      }
      return v;
    } catch (err) {
      this.logger.warn(`Embedding fetch failed: ${String(err)}`);
      return null;
    }
  }

  /**
   * Sérialise un vecteur en littéral pgvector. Format : `[0.1,0.2,...]`.
   * Postgres comprend ça directement quand inséré comme string + cast `::vector`.
   */
  serialize(vector: number[]): string {
    return "[" + vector.map((n) => n.toFixed(6)).join(",") + "]";
  }
}
