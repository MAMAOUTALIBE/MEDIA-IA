# ADR-004: Design tokens via Tailwind v4 `@theme` (CSS-first)

- **Statut** : accepted
- **Date** : 2026-05-26
- **Auteurs** : @MAMAOUTALIBE

## Contexte

Le brief UI demande un thème sombre futuriste (glassmorphism + gradients bleu/violet). Tailwind v4 a abandonné le `tailwind.config.ts` au profit d'une déclaration **CSS-first** via `@theme inline` dans `globals.css`. Il faut décider : (a) suivre ce pattern, (b) garder un config TS, (c) externaliser dans un design tokens system (Style Dictionary, Tokens Studio).

## Décision

Déclarer tous les tokens dans `apps/web/src/app/globals.css` via `:root { --token: value }` puis exposer à Tailwind via `@theme inline { --color-… : var(--token) }`. Pas de `tailwind.config.ts` séparé pour les tokens.

## Options considérées

1. **CSS-first Tailwind v4 `@theme`** ← choisi
   - ✅ Simple, single source of truth dans `globals.css`
   - ✅ Compatible avec dark/light mode futur (juste swap `:root`)
   - ✅ Pas de step de build supplémentaire
   - ❌ Moins partageable cross-platform (mobile RN consomme du JS, pas du CSS)
2. **Tokens Studio / Style Dictionary**
   - ✅ Standard pour cross-platform (web + mobile + iOS native + Android)
   - ❌ Build step, complexité
   - ⚠️ Justifié seulement si app native lance avant Phase 5
3. **Hardcoder Tailwind config TS**
   - ❌ Legacy v3, non recommandé en v4

## Conséquences

- ✅ Tokens visibles d'un coup d'œil dans `globals.css` (110 lignes)
- ✅ Animations, glassmorphism helpers, scrollbar perso → tout au même endroit
- ⚠️ Quand on attaquera l'app Expo mobile (Phase 5), il faudra dupliquer les couleurs en JS — ou adopter Tokens Studio à ce moment
- 🔁 Revisite avant le démarrage Phase 5 (mobile RN)

## Tokens définis

Variables racine `:root` :
- Fond : `--bg-base`, `--bg-elevated`, `--bg-card`, `--bg-glass`, `--bg-glass-strong`
- Bordures : `--border-glass`, `--border-glass-strong`
- Accents : `--accent-blue`, `--accent-violet`, `--accent-cyan` (+ versions `-soft`)
- Texte : `--text-primary`, `--text-secondary`, `--text-muted`
- Statuts : `--success`, `--warning`, `--danger`, `--info` (+ versions `-soft`)
- shadcn mapping : `--background`, `--foreground`, `--card`, `--popover`, `--primary`, `--secondary`, `--muted`, `--accent`, `--destructive`, `--border`, `--input`, `--ring`, `--radius`
- Sidebar : `--sidebar`, `--sidebar-*`
- Charts : `--chart-1` à `--chart-5`

Helpers utilitaires `.glass`, `.glass-strong`, `.gradient-text`, `.gradient-bg`, `.mesh-bg`.

## Liens

- [Tailwind v4 CSS-first config](https://tailwindcss.com/docs/v4-beta#using-css-instead-of-javascript)
- `apps/web/src/app/globals.css`
