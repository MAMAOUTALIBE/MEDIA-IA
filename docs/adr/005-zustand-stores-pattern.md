# ADR-005: État côté client — Zustand stores avec persist sélectif

- **Statut** : accepted
- **Date** : 2026-05-26
- **Auteurs** : @MAMAOUTALIBE

## Contexte

L'app a plusieurs sources de vérité côté client à gérer avant l'arrivée du backend :
- **UI ephemeral** : sidebar collapsed, command palette open, theme toggle
- **Optimistic updates** : contenu validé/rejeté côté UX en attendant la confirmation API
- **Drafts utilisateur** : brouillons créés via le Dialog Templates qui doivent survivre à un reload
- **Mobile journaliste** : soumissions terrain avec workflow d'avancement local

TanStack Query gère le cache server-state. Zustand est utilisé pour le local-state qui dépasse `useState` (besoin de partage cross-component ou persistance).

## Décision

Adopter **Zustand 5** avec le middleware `persist` (sélectif via `partialize`), un store par concern :
- `ui-store.ts` — UI ephemeral persistée (sidebar collapsed)
- `pending-store.ts` — validations/rejets optimistes (pas persisté, reset au reload)
- `drafts-store.ts` — brouillons templates (persistés)
- `mobile-store.ts` — soumissions terrain (persistées avec seed)

## Options considérées

1. **Zustand + persist sélectif** ← choisi
   - ✅ API minimaliste, hooks naturels
   - ✅ Persist déclaratif via middleware (localStorage)
   - ✅ Pas de Provider à mettre dans `layout.tsx`
2. **Redux Toolkit + RTK Query**
   - ✅ DevTools puissantes
   - ❌ Boilerplate excessif pour 4 stores simples
   - ❌ Concurrence avec TanStack Query qu'on a déjà adopté
3. **Jotai (atomic state)**
   - ✅ Très granulaire
   - ❌ Pattern atomique moins lisible pour des stores métier groupés
4. **React Context + useReducer**
   - ❌ Re-renders cascade trop fréquents avec nos contenus interactifs

## Conséquences

- ✅ 4 stores autonomes, faciles à tester unitairement
- ✅ Persistance triviale → l'utilisateur retrouve ses brouillons après refresh
- ⚠️ Quand le backend arrive, les drafts devront migrer vers une API `/api/drafts` (et la persistance localStorage devient un fallback offline). Plan : garder Zustand pour l'UI ephemeral, déprécier `drafts-store` au profit d'un hook `useDrafts()` TanStack Query branché sur l'API
- 🔁 Revisite Phase 1 (backend) : migrer `drafts-store` → API persistance
- 🔁 Revisite Phase 5 (mobile RN) : `mobile-store` devient l'offline-first queue avec WatermelonDB

## Liens

- `apps/web/src/lib/stores/ui-store.ts`
- `apps/web/src/lib/stores/pending-store.ts`
- `apps/web/src/lib/stores/drafts-store.ts`
- `apps/web/src/lib/stores/mobile-store.ts`
