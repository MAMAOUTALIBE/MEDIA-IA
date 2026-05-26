# ADR-001: Stack frontend Next.js 16 + React 19 + Tailwind v4

- **Statut** : accepted
- **Date** : 2026-05-26
- **Auteurs** : @MAMAOUTALIBE

## Contexte

Démarrage greenfield d'une plateforme média de production avec exigences :
- TypeScript strict bout-en-bout
- SSR + streaming pour la performance perçue (rédactions consultent dashboards en continu)
- Écosystème UI riche (sidebar custom, charts, drag-drop, palette ⌘K)
- Compatibilité full responsive + futur mobile RN
- Talent pool important (Sénégal/Maghreb : très large bassin React/TS)

## Décision

**Next.js 16 (App Router) + React 19 + TailwindCSS v4 + shadcn (base-ui preset `base-nova`)**.

## Options considérées

1. **Next.js + React 19** ← choisi
   - ✅ App Router stable, server components, streaming SSR, route groups
   - ✅ Écosystème massif, talent abondant
   - ✅ Cohabitation parfaite avec TS strict + Prisma + tRPC
   - ❌ Bundle initial peut grossir si pas vigilant
2. **Remix / React Router v7**
   - ✅ Loaders/actions élégants, philosophy web standards
   - ❌ Moins de patterns pour les dashboards admin
   - ❌ Talent pool plus restreint
3. **SvelteKit**
   - ✅ Très performant, code compact
   - ❌ Bassin de talents plus petit
   - ❌ Réécriture nécessaire de l'écosystème UI (pas de shadcn natif)
4. **Astro**
   - ❌ Trop orienté contenu statique pour notre dashboard interactif

## Conséquences

- ✅ Compatibilité native avec Vercel preview deploys (démos commerciales)
- ✅ Server Components réduisent le bundle client (KPI cards, audit table)
- ⚠️ React 19 récent → certaines libs (cmdk, base-ui) ont eu des incompats résolues récemment
- 🔁 Revisite si Vercel devient prohibitif (auto-hébergement Node toujours possible)

## Liens

- [Next.js 16 release notes](https://nextjs.org/blog/next-16)
- ADR-002 (composants UI)
