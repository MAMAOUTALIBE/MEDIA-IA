# Architecture Decision Records (ADR)

Décisions techniques structurantes du projet MEDIA-IA / CMR.

Format MADR (Markdown Any Decision Record). Toute nouvelle ADR est numérotée séquentiellement et passe par les statuts `proposed → accepted → deprecated`.

## Index

| ADR | Titre | Statut |
|---|---|---|
| [000](./000-template.md) | Template | — |
| [001](./001-frontend-stack.md) | Stack frontend Next.js 16 + React 19 + Tailwind v4 | accepted |
| [002](./002-shadcn-base-ui.md) | Composants UI — shadcn preset base-nova | accepted |
| [003](./003-command-palette-cmdk.md) | Palette ⌘K via cmdk + wrap `<Command>` | accepted |
| [004](./004-design-tokens-tailwind-v4.md) | Design tokens via Tailwind v4 `@theme` CSS-first | accepted |
| [005](./005-zustand-stores-pattern.md) | État client — Zustand stores avec persist sélectif | accepted |

## Comment proposer une nouvelle ADR

1. Copier `000-template.md` → `NNN-titre-court.md` (numéro suivant)
2. Statut `proposed`
3. Ouvrir une PR taggée `adr`
4. Discussion en review → merge avec statut `accepted` ou `rejected`
5. Une décision qui en remplace une autre marque l'ancienne `superseded by [ADR-NNN]`
