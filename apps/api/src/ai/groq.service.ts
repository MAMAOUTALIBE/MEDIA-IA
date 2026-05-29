import { Injectable, Logger, ServiceUnavailableException } from "@nestjs/common";

const GROQ_API_KEY = process.env.GROQ_API_KEY;
const GROQ_API_URL = "https://api.groq.com/openai/v1/chat/completions";
const MODEL = process.env.GROQ_MODEL ?? "llama-3.3-70b-versatile";

type ChatMessage = { role: "system" | "user" | "assistant"; content: string };

/**
 * GroqService — orchestre les appels Llama 3.3 70B via l'API OpenAI-compatible
 * de Groq pour les features éditoriales :
 *
 *   - generateTitles(body) → 5 titres alternatifs cohérents avec le brouillon
 *   - factCheck(body)      → flags + niveau de confiance + signaux à vérifier
 *   - socialPosts(...)     → posts adaptés par plateforme (twitter, instagram…)
 *
 * Stratégie de modèle : on utilise `llama-3.3-70b-versatile` pour les tâches
 * créatives (titres, social posts) où la qualité prime, et `llama-3.1-8b-instant`
 * pour les tâches structurées rapides (fact-check où on extrait des flags).
 *
 * Sans `GROQ_API_KEY`, isAvailable() = false et les endpoints retournent 503.
 */
@Injectable()
export class GroqService {
  private readonly logger = new Logger(GroqService.name);

  isAvailable(): boolean {
    return Boolean(GROQ_API_KEY);
  }

  private async chat(
    messages: ChatMessage[],
    opts: {
      model?: string;
      temperature?: number;
      maxTokens?: number;
      responseFormat?: "json_object" | "text";
    } = {},
  ): Promise<string> {
    if (!GROQ_API_KEY) {
      throw new ServiceUnavailableException(
        "GROQ_API_KEY non configurée — fonctionnalité IA indisponible",
      );
    }
    const body = {
      model: opts.model ?? MODEL,
      temperature: opts.temperature ?? 0.7,
      max_tokens: opts.maxTokens ?? 1024,
      messages,
      ...(opts.responseFormat === "json_object"
        ? { response_format: { type: "json_object" } }
        : {}),
    };
    const res = await fetch(GROQ_API_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${GROQ_API_KEY}`,
      },
      body: JSON.stringify(body),
    });
    if (!res.ok) {
      const detail = await res.text();
      this.logger.error(`Groq ${res.status}: ${detail.slice(0, 300)}`);
      throw new ServiceUnavailableException(`Groq upstream ${res.status}`);
    }
    const json = (await res.json()) as {
      choices?: Array<{ message?: { content?: string } }>;
    };
    const text = json.choices?.[0]?.message?.content ?? "";
    return text.trim();
  }

  /**
   * 5 titres alternatifs en français, lowercase-free, prêts à éditer.
   * Conserve la même information factuelle que le brouillon — ne change pas
   * les chiffres ni les noms propres.
   */
  async generateTitles(body: string, currentTitle?: string): Promise<string[]> {
    const system =
      "Tu es un rédacteur en chef expérimenté pour une rédaction TV francophone. " +
      "Tu proposes des titres percutants, factuels, sans clickbait, qui respectent " +
      "scrupuleusement les chiffres et noms propres du brouillon. Tu réponds en JSON.";
    const user =
      "Voici un brouillon de contenu éditorial. Propose 5 titres alternatifs.\n\n" +
      "Contraintes :\n" +
      "- Français, casse normale (pas de TOUTES MAJUSCULES)\n" +
      "- 6 à 12 mots chacun\n" +
      "- Pas de point d'interrogation gratuit, pas d'emoji\n" +
      "- Préserve tous les chiffres, dates, noms propres mentionnés\n" +
      "- Varie les angles : factuel, narratif, conséquence, contexte, témoignage\n\n" +
      (currentTitle ? `Titre actuel (à améliorer) : ${currentTitle}\n\n` : "") +
      `Brouillon :\n${body.slice(0, 4000)}\n\n` +
      'Réponds en JSON strict : {"titles": ["...", "...", "...", "...", "..."]}';

    const raw = await this.chat(
      [
        { role: "system", content: system },
        { role: "user", content: user },
      ],
      { temperature: 0.7, maxTokens: 512, responseFormat: "json_object" },
    );

    try {
      const parsed = JSON.parse(raw) as { titles?: string[] };
      const out = (parsed.titles ?? [])
        .filter((t) => typeof t === "string" && t.trim().length > 0)
        .map((t) => t.trim())
        .slice(0, 5);
      if (out.length === 0) throw new Error("empty titles array");
      return out;
    } catch (err) {
      this.logger.warn(`generateTitles parse failed: ${String(err)} | raw=${raw.slice(0, 200)}`);
      throw new ServiceUnavailableException("IA n'a pas renvoyé de JSON parsable");
    }
  }

  /**
   * Fact-check léger : identifie les affirmations factuelles potentiellement
   * sensibles (chiffres, dates, citations, noms propres), évalue le risque de
   * désinformation, suggère 2-3 sources à vérifier. Ne remplace PAS un
   * fact-checking humain — juste un signal préalable.
   */
  async factCheck(body: string): Promise<{
    overallRisk: "low" | "medium" | "high";
    flags: Array<{
      claim: string;
      risk: "low" | "medium" | "high";
      reason: string;
      verify: string;
    }>;
    suggestedSources: string[];
  }> {
    const system =
      "Tu es un fact-checker pour une rédaction TV publique francophone. " +
      "Tu identifies les affirmations factuelles vérifiables (chiffres, dates, " +
      "noms propres, citations) et tu signales celles qui méritent une vérification " +
      "avant publication. Tu n'inventes JAMAIS d'infos — uniquement analyse de ce qui " +
      "est dans le brouillon. Réponse en JSON strict.";
    const user =
      "Analyse ce brouillon et identifie les affirmations à vérifier.\n\n" +
      `Brouillon :\n${body.slice(0, 6000)}\n\n` +
      "Réponds en JSON strict avec cette structure :\n" +
      '{\n' +
      '  "overallRisk": "low" | "medium" | "high",\n' +
      '  "flags": [{ "claim": "<l\'affirmation citée verbatim>", "risk": "low|medium|high", "reason": "<pourquoi à vérifier>", "verify": "<comment vérifier en 1 phrase>" }],\n' +
      '  "suggestedSources": ["<source 1>", "<source 2>", "<source 3>"]\n' +
      "}";

    const raw = await this.chat(
      [
        { role: "system", content: system },
        { role: "user", content: user },
      ],
      { temperature: 0.3, maxTokens: 1024, responseFormat: "json_object" },
    );

    try {
      const parsed = JSON.parse(raw) as {
        overallRisk?: string;
        flags?: Array<{ claim?: string; risk?: string; reason?: string; verify?: string }>;
        suggestedSources?: string[];
      };
      const cleanRisk = (r: unknown): "low" | "medium" | "high" =>
        r === "high" || r === "medium" ? r : "low";
      return {
        overallRisk: cleanRisk(parsed.overallRisk),
        flags: (parsed.flags ?? [])
          .filter((f) => typeof f === "object" && f && typeof f.claim === "string")
          .map((f) => ({
            claim: String(f.claim).slice(0, 500),
            risk: cleanRisk(f.risk),
            reason: String(f.reason ?? "").slice(0, 500),
            verify: String(f.verify ?? "").slice(0, 500),
          }))
          .slice(0, 10),
        suggestedSources: (parsed.suggestedSources ?? [])
          .filter((s) => typeof s === "string")
          .slice(0, 5),
      };
    } catch (err) {
      this.logger.warn(`factCheck parse failed: ${String(err)} | raw=${raw.slice(0, 200)}`);
      throw new ServiceUnavailableException("IA n'a pas renvoyé de JSON parsable");
    }
  }

  /**
   * Génère un social post par plateforme demandée. Chaque plateforme a sa
   * tonalité, sa contrainte de longueur, et son angle.
   */
  async socialPosts(
    title: string,
    body: string,
    platforms: Array<"twitter" | "instagram" | "tiktok" | "facebook" | "telegram">,
  ): Promise<Record<string, string>> {
    const PLATFORM_RULES: Record<string, string> = {
      twitter:
        "X (Twitter) : 280 caractères max, ton informatif et neutre, 1-2 hashtags pertinents en fin, pas d'emoji excessif",
      instagram:
        "Instagram : 150 mots max, ton chaleureux et accessible, structure : accroche + contexte + appel à l'action douce, 3-5 hashtags pertinents en fin de post",
      tiktok:
        "TikTok : 90 mots max, ton dynamique et oral (comme si parlé à caméra), hook fort en première phrase, 2-3 hashtags trendy en fin",
      facebook:
        "Facebook : 200 mots max, ton conversationnel, peut poser une question pour engagement, 1-2 hashtags en fin",
      telegram:
        "Telegram : 300 mots max, ton informatif factuel, structure article condensé, pas d'emoji ni hashtags",
    };

    const rules = platforms
      .map((p) => `- ${p.toUpperCase()} : ${PLATFORM_RULES[p] ?? "ton journalistique standard"}`)
      .join("\n");

    const system =
      "Tu es responsable des réseaux sociaux d'une rédaction TV publique francophone. " +
      "Tu adaptes un contenu rédactionnel à chaque plateforme en respectant ses codes. " +
      "Tu préserves la véracité de l'information et ne dramatises jamais. " +
      "Réponse en JSON strict.";
    const user =
      "Adapte le contenu suivant en posts sociaux, un par plateforme demandée.\n\n" +
      "Plateformes et règles :\n" +
      rules +
      "\n\n" +
      `Titre : ${title}\n\n` +
      `Brouillon :\n${body.slice(0, 4000)}\n\n` +
      "Réponds en JSON strict, une clé par plateforme :\n" +
      `{ ${platforms.map((p) => `"${p}": "<post adapté>"`).join(", ")} }`;

    const raw = await this.chat(
      [
        { role: "system", content: system },
        { role: "user", content: user },
      ],
      { temperature: 0.6, maxTokens: 1024, responseFormat: "json_object" },
    );

    try {
      const parsed = JSON.parse(raw) as Record<string, unknown>;
      const out: Record<string, string> = {};
      for (const p of platforms) {
        const val = parsed[p];
        if (typeof val === "string" && val.trim().length > 0) {
          out[p] = val.trim();
        }
      }
      if (Object.keys(out).length === 0) {
        throw new Error("no platform output");
      }
      return out;
    } catch (err) {
      this.logger.warn(`socialPosts parse failed: ${String(err)} | raw=${raw.slice(0, 200)}`);
      throw new ServiceUnavailableException("IA n'a pas renvoyé de JSON parsable");
    }
  }
}
