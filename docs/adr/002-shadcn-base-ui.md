# ADR-002: Composants UI — shadcn preset base-nova (base-ui sous-jacent)

- **Statut** : accepted
- **Date** : 2026-05-26
- **Auteurs** : @MAMAOUTALIBE

## Contexte

Le projet a besoin de ~25 composants accessibles (Dialog, Popover, DropdownMenu, Sheet, Tabs, Tooltip, Command palette, Toast…). Construire from scratch = 2-3 mois d'effort. Utiliser une lib + thème = quelques jours.

## Décision

Adopter **shadcn/ui** avec le preset `base-nova` (qui utilise `@base-ui/react` comme primitives sous-jacentes, héritier moderne de Radix).

## Options considérées

1. **shadcn + base-nova** ← choisi
   - ✅ Code généré dans le repo (`src/components/ui/`), donc modifiable
   - ✅ Pas de dépendance runtime à un design system tiers
   - ✅ Cohérent avec React 19 et Tailwind v4
   - ❌ Pattern d'API base-ui différent de Radix : pas de `asChild` sur les triggers (fait crasher cmdk au premier essai — voir ADR-003)
2. **shadcn classique (radix)**
   - ✅ Plus de stabilité communautaire
   - ❌ Pattern devenu legacy ; le projet pousse base-ui pour les nouvelles installations
3. **Headless UI Tailwind**
   - ✅ Plus minimaliste
   - ❌ Catalog plus petit (pas de Sheet ni Command palette)
4. **Mantine / Chakra / MUI**
   - ❌ Trop opinionated sur le thème, dur à matcher le glassmorphism custom

## Conséquences

- ✅ Liberté totale de modifier les composants UI (les patches de bug restent dans notre repo)
- ⚠️ Le pattern `<DropdownMenuTrigger asChild>` legacy doit être réécrit pour base-ui (corrigé sur tous nos composants)
- ⚠️ Le `CommandDialog` v4.7 ne wrappe pas auto en `<Command>` — il faut ajouter le wrap dans notre `CommandPalette` (voir [`src/components/dashboard/shell/command-palette.tsx`](../../src/components/dashboard/shell/command-palette.tsx))
- 🔁 Revisite si base-ui change drastiquement d'API (improbable, projet stable)

## Liens

- [shadcn base preset docs](https://ui.shadcn.com/docs/base)
- [@base-ui/react](https://base-ui.com)
- ADR-003 (palette ⌘K cmdk fix)
