# Storybook — plan d'adoption

## Pourquoi

Documenter visuellement les ~25 composants UI partagés (`apps/web/src/components/ui/*`) facilite :
- L'onboarding des nouveaux développeurs front
- La revue de design isolée du contexte applicatif
- Les tests visuels automatisés (Chromatic, Percy)
- L'exposition d'un design system aux partenaires

## Lib retenue

**Storybook 8.x** avec **builder Vite** (plus rapide que Webpack, mieux supporté avec Next.js 16).

## Plan d'adoption

### Étape 1 — Install

```bash
cd apps/web
pnpm dlx storybook@latest init --builder vite --type react
```

Ceci crée :
- `.storybook/main.ts` (config)
- `.storybook/preview.tsx` (decorators)
- Quelques stories d'exemple

### Étape 2 — Decorator dark mode forcé

`.storybook/preview.tsx` :
```ts
import "@/app/globals.css";
import type { Preview } from "@storybook/react";

const preview: Preview = {
  decorators: [
    (Story) => (
      <div className="dark min-h-screen bg-bg-base p-8">
        <Story />
      </div>
    ),
  ],
  parameters: {
    backgrounds: { default: "dark" },
  },
};
export default preview;
```

### Étape 3 — Stories prioritaires (6 composants)

| Composant | Path | Variants à couvrir |
|---|---|---|
| `GlassCard` | `apps/web/src/components/ui/glass-card.tsx` | default / elevated / accent / subtle |
| `KpiCard` | `apps/web/src/components/dashboard/home/kpi-card.tsx` | up / down, formatters compact/percent/number |
| `StatusBadge` | `apps/web/src/components/dashboard/contenus/status-badge.tsx` | 6 statuts (draft, pending_*, published, rejected) |
| `ChannelIcon` | `apps/web/src/components/ui/channel-icon.tsx` | 9 canaux × {decorated, plain} |
| `InitialsAvatar` | `apps/web/src/components/ui/initials-avatar.tsx` | sizes 16/24/32/48/72, 6 couleurs |
| `EmptyState` | `apps/web/src/components/ui/empty-state.tsx` | avec/sans icon, avec/sans action |

### Étape 4 — Couverture étendue (V2)

À 80% des composants ui/ couverts, brancher Chromatic pour la diff visuelle automatique sur chaque PR.

## Estimation effort

- Install + config : 1 h
- 6 stories pivots : 3 h
- Couverture complète des ~25 composants ui/ : 2 j
- Chromatic + CI integration : 0.5 j

## Pourquoi pas tout de suite

- Storybook install ~5 min interactive sur ce poste Guest sans connectivité fiable
- Pas d'équipe actuellement (Storybook prend tout son sens à 3+ devs)
- Phase 0 backend prioritaire pour livrer un produit utilisable

## Référence

- [Storybook for Next.js docs](https://storybook.js.org/docs/get-started/nextjs)
