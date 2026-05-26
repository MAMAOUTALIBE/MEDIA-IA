import { describe, expect, it, beforeEach } from "vitest";
import { AiService } from "./ai.service";

describe("AiService", () => {
  let svc: AiService;

  beforeEach(() => {
    svc = new AiService();
  });

  describe("ask() — intent matching", () => {
    it("retourne aide générique pour question vide", () => {
      const r = svc.ask("");
      expect(r.reply).toContain("Posez votre question");
    });

    it("détecte l'intent 'pending' sur 'contenus en attente'", () => {
      const r = svc.ask("Combien de contenus en attente ?");
      expect(r.reply).toMatch(/en attente/);
      expect(r.bullets).toBeDefined();
      expect(r.bullets!.some((b) => /rédacteur/i.test(b))).toBe(true);
      expect(r.bullets!.some((b) => b.includes("Chef d'édition"))).toBe(true);
    });

    it("détecte l'intent 'top_author' sur 'journaliste actif'", () => {
      const r = svc.ask("Quel journaliste est le plus actif ?");
      expect(r.reply).toMatch(/journaliste le plus actif/i);
      expect(r.bullets).toBeDefined();
      // Au moins un nom de journaliste
      expect(r.bullets!.length).toBeGreaterThan(0);
    });

    it("détecte l'intent 'ai_score' sur 'score IA'", () => {
      const r = svc.ask("Quel est le score IA actuel ?");
      expect(r.reply).toMatch(/98\/100/);
    });

    it("détecte l'intent 'live' sur 'en direct'", () => {
      const r = svc.ask("Que se passe-t-il en direct ?");
      expect(r.reply).toMatch(/direct|live/i);
      expect(r.citations).toContain("/dashboard/live");
    });

    it("détecte l'intent 'alerts' sur 'alertes système'", () => {
      const r = svc.ask("Y a-t-il des alertes ?");
      expect(r.reply).toMatch(/alerte/i);
    });

    it("détecte l'intent 'platforms' sur 'plateformes'", () => {
      const r = svc.ask("Quelles plateformes performent le mieux ?");
      expect(r.reply).toContain("9 plateformes");
      expect(r.bullets).toBeDefined();
      expect(r.bullets!.length).toBe(5); // top 5
    });

    it("retourne fallback pour question hors sujet", () => {
      const r = svc.ask("xyzzy blob foo");
      expect(r.reply).toMatch(/Je ne suis pas certain/i);
    });

    it("détecte help explicitement", () => {
      const r = svc.ask("aide");
      expect(r.reply).toMatch(/exemples/i);
      expect(r.bullets!.length).toBeGreaterThanOrEqual(5);
    });
  });

  describe("summary()", () => {
    it("renvoie un résumé avec KPI + alertes + score IA", () => {
      const s = svc.summary();
      expect(s.reply).toMatch(/Synthèse temps réel/);
      expect(s.bullets).toBeDefined();
      expect(s.bullets!.length).toBeGreaterThanOrEqual(5);
      // Doit mentionner le score IA
      expect(s.bullets!.some((b) => b.includes("Score IA"))).toBe(true);
    });
  });

  describe("askStream()", () => {
    it("yield au moins un chunk pour une question valide", async () => {
      const chunks: string[] = [];
      for await (const c of svc.askStream("score IA ?")) {
        chunks.push(c);
        if (chunks.length > 50) break; // sécurité
      }
      expect(chunks.length).toBeGreaterThan(3);
      const full = chunks.join("");
      expect(full).toMatch(/98/);
    });
  });
});
