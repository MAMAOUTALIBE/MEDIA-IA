# ADR-003: Palette de commandes ⌘K via cmdk + wrapping `<Command>`

- **Statut** : accepted
- **Date** : 2026-05-26
- **Auteurs** : @MAMAOUTALIBE

## Contexte

L'UX moderne (Linear, Notion, Vercel, Raycast) repose largement sur une command palette ⌘K. CMR ciblant 200+ utilisateurs power-user (rédacteurs, chefs d'édition), c'est un investissement à fort ROI ergonomique.

shadcn fournit un wrapper autour de `cmdk` (Pacôk Korpe). Mais le `CommandDialog` généré par shadcn v4.7 **ne wrappe pas automatiquement les enfants dans `<Command>`** (le Root cmdk qui fournit le contexte). Résultat : `CommandInput` crashe avec `TypeError: Cannot read properties of undefined (reading 'subscribe')` à la première ouverture.

## Décision

Utiliser **cmdk** via shadcn, mais wrapper systématiquement le contenu de `CommandDialog` dans un composant `<Command>` explicite.

Notre `CommandPalette` (`apps/web/src/components/dashboard/shell/command-palette.tsx`) suit le pattern :

```tsx
<CommandDialog open={open} onOpenChange={setOpen} title="…">
  <Command>                            {/* ← obligatoire avec shadcn v4.7 base-nova */}
    <CommandInput placeholder="…" />
    <CommandList>…</CommandList>
  </Command>
</CommandDialog>
```

## Options considérées

1. **cmdk + wrap Command manuel** ← choisi
   - ✅ Reste sur la lib standard
   - ✅ Compatible avec les futures versions shadcn (le wrap est explicite)
   - ❌ 1 ligne de boilerplate
2. **Réécrire CommandDialog pour wrapper auto**
   - ✅ Plus DRY si plusieurs palettes
   - ❌ Diverge de l'upstream shadcn → chaque `pnpm dlx shadcn add` peut réécrire le fichier
3. **Implémenter notre propre fuzzy search**
   - ❌ Réinventer la roue (Fuse.js + DialogPrimitive)

## Conséquences

- ✅ Bug runtime résolu, vérifié via Playwright (`/tmp/cmr-verify/81-cmdk-search.png`)
- ⚠️ Si shadcn corrige le bug en v4.8+, on aura un double wrap (inoffensif mais à nettoyer)
- 🔁 Si on adopte une autre lib (kbar, command-score), revoir cette ADR

## Liens

- [cmdk repo](https://github.com/pacocoursey/cmdk)
- Bug observé : `/tmp/cmr-verify/71c-cmdk-open.png` (avant fix) → `/tmp/cmr-verify/81-cmdk-search.png` (après)
- Commit du fix : (à venir avec push initial)
