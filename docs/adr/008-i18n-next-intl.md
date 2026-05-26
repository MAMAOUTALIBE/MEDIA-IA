# ADR-008 — Internationalisation via next-intl (Sprint 6)

**Statut** : accepted
**Date** : 2026-05-26

## Contexte
La CMR vise une diffusion internationale d'État. Le front Next.js était entièrement en français hardcodé (~60 fichiers). Une migration vers une lib d'i18n est nécessaire avant tout déploiement multi-pays.

## Décision
Adopter **next-intl** (>= 5.x) comme lib d'i18n :
- Server-component first (compatible Next.js 15+ App Router + RSC streaming)
- Type-safe (clés validées via TypeScript)
- ICU MessageFormat pour pluralisation + interpolation
- RTL géré côté framework

### Langues de lancement (Sprint 6)
- `fr` — Français (langue par défaut, diffuseur public francophone)
- `en` — English (rayonnement international, audience anglophone)
- `ar` — العربية (RTL, audience maghrébine + diaspora)

### Phase 2 (Sprint 6b)
- `bm` — Bambara, `ff` — Peul, `son` — Songhaï, `tmh` — Tamacheq (langues nationales du Mali)
- Traduction IA assistée (Claude + DeepL) avec relecture humaine via Crowdin

### Phase 3 (international)
- `es`, `pt`, `zh` — pour rayonnement broadcast intercontinental

## Implémentation (Sprint 6)

Structure :
```
apps/web/src/
├── i18n/
│   ├── config.ts                # locales, RTL helpers
│   ├── request.ts               # next-intl server config (à créer Sprint 6.1)
│   └── locales/
│       ├── fr.json              # source de vérité
│       ├── en.json              # traduction
│       └── ar.json              # traduction
├── app/
│   ├── [locale]/                # route group (à mettre en place Sprint 6.1)
│   │   ├── (marketing)/
│   │   ├── dashboard/
│   │   └── mobile/
│   └── layout.tsx               # rendu dynamique de `dir` selon locale
└── middleware.ts                # négocie locale via Accept-Language
```

### Pattern d'usage
```tsx
// Server component
import { useTranslations } from "next-intl";

export default function ContentTitle() {
  const t = useTranslations("contents");
  return <h1>{t("title")}</h1>;
}
```

### CSP & RTL
- `<html lang={locale} dir={getDirection(locale)}>` au runtime
- `prefers-reduced-motion` respecté indépendamment de la locale
- Tailwind v4 : utiliser `rtl:` + `ltr:` modifiers pour les composants asymétriques (icônes flèches, etc.)

## Migration progressive
Sprint 6 livre :
1. ✅ next-intl installé + 3 catalogues FR/EN/AR de base (`common`, `nav`, `auth`, `contents`, `a11y`)
2. ✅ Config TS (locales, RTL helpers)
3. ✅ ADR rédigée
4. ⏳ Sprint 6.1 : middleware + [locale] route group + LocaleSwitcher dans topbar
5. ⏳ Sprint 6.2 : extraction de toutes les chaînes des composants existants
6. ⏳ Sprint 6.3 : pluralisation + dates locales (Intl.DateTimeFormat)

## Conséquences positives
- Compatibilité dès Sprint 6 pour audit gouvernemental (WCAG AAA exige sous-titres + transcript multi-langues)
- Le pipeline de traduction IA-assistée s'inscrit dans la roadmap Claude (Sprint 3)
- Souveraineté linguistique : ouvrir aux langues nationales en Phase 2

## Conséquences négatives
- ~60 fichiers à migrer progressivement (Sprint 6.2 lourd mais purement mécanique)
- +1 dépendance front
- Cache de page Next.js segmenté par locale (multiplie le coût CDN)

## Liens
- ADR-001 — Next.js 16 + React 19
- `docs/i18n.md` (plan initial)
- [ADR-009 — Accessibilité WCAG 2.2 AAA](./009-wcag-aaa.md)
