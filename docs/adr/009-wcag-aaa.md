# ADR-009 — Accessibilité WCAG 2.2 niveau AAA (Sprint 6)

**Statut** : accepted
**Date** : 2026-05-26

## Contexte
La CMR est une plateforme de service public d'État. La loi (et le droit international — Convention ONU relative aux droits des personnes handicapées) exige une **accessibilité de niveau AAA** pour les portails d'État, supérieure à WCAG AA qui est la baseline de la plupart des sites privés.

L'audit Lighthouse CI baseline (Sprint 0.7) impose **a11y ≥ 0.95** sur toutes les routes publiques. WCAG 2.2 AAA impose **≥ 0.98 idéalement 1.00**.

## Décision
Adopter la checklist WCAG 2.2 AAA suivante, intégrée aux tests CI :

### Critères AAA non négociables

| Critère | Test automatisé | Sprint cible |
|---|---|---|
| **1.2.6 LSF (langue des signes)** sur vidéos préenregistrées | Manuel — process éditorial | Sprint 6b |
| **1.2.8 Transcript** complet pour tout média | Whisper (Sprint 3) | Sprint 3 ✅ |
| **1.2.9 Audiodescription** en direct (live) | Manuel — opérateur | Sprint 4b |
| **1.4.6 Contraste 7:1** (texte normal) / 4.5:1 (texte large) | axe-core + Lighthouse | Sprint 0.7 ✅ + Sprint 6.3 |
| **1.4.8 Présentation visuelle** : largeur 80c max, justify off, espacement lignes 1.5+ | CSS Tailwind utility `prose` + custom | Sprint 6.3 |
| **2.1.3 Clavier (sans exception)** : toute fonctionnalité accessible au clavier | Playwright e2e + axe | Sprint 6.3 |
| **2.2.3 Pas de timeout** sauf temps réel essentiel | Audit code search | Sprint 6.3 |
| **2.3.2 Aucun flash >3/s** | axe + manuel | Sprint 6.3 |
| **2.4.8 Localisation** dans la page (breadcrumbs partout) | Composant `<Breadcrumbs>` obligatoire | Sprint 6.3 |
| **3.1.3 Mots inhabituels** définis (glossaire) | Composant `<Abbreviation>` | Sprint 6.4 |
| **3.1.5 Niveau de lecture** ≤ collège (Flesch) | Linter custom CI | Sprint 6.4 |
| **3.3.5 Aide contextuelle** sur formulaires | Pattern `<FormHelp>` | Sprint 6.4 |

### Outillage automatisé

```bash
# CI gates (Sprint 8 — intégration)
pnpm --filter @cmr/web exec axe src/**/*.tsx           # axe-core unit-level
pnpm --filter @cmr/web exec lhci autorun               # Lighthouse a11y ≥ 0.98
pnpm --filter @cmr/web exec playwright test --grep a11y # e2e clavier + lecteur d'écran
```

### Tests utilisateurs (Sprint Final)
- NVDA (Windows) — 1 session/release
- VoiceOver (macOS + iOS) — 1 session/release
- Talkback (Android) — 1 session/release
- Utilisateurs malvoyants — partenariat asso (handicap visuel + moteur)

### Médias spécifiques

Pour la vidéo broadcast (Sprint 4b — live RTMP → HLS) :
- **Piste sous-titres** SRT/WebVTT — obligatoire (séparée du flux principal)
- **Piste audiodescription** AAC séparée — programmé pour journaux et docs
- **Piste LSF** incrustée optionnelle — décision éditoriale par programme
- **Transcript téléchargeable** — généré par Whisper + relecture humaine

Pour le DAM (Sprint 4) :
- `MediaAsset.altText` — obligatoire pour images (validation server-side)
- `MediaAsset.transcript` — obligatoire pour audio/vidéo (auto-rempli par Whisper)

## Conséquences positives
- Conformité légale assurée (Mali Loi sur le handicap + Convention ONU)
- Surface utilisateur élargie (~20% de la population a un handicap)
- Meilleurs SEO et utilisabilité globale

## Conséquences négatives
- Coût d'auteur supplémentaire (sous-titrage + audiodescription = ~2-3h par programme broadcast)
- Process éditorial alourdi (cosignature accessibilité avant publication broadcast)
- ROI sur les langues moins représentées (LSF malienne ?) à évaluer Sprint Final

## Liens
- ADR-008 — i18n next-intl
- WCAG 2.2 : https://www.w3.org/TR/WCAG22/
- `docs/SKILLS.md` — pipeline 3-skills (validator doit vérifier a11y)
