# Contribuer à MEDIA-IA · CMR

Merci de l'intérêt porté au projet. Ce document définit le workflow attendu pour proposer des changements.

## Workflow Git

1. **Forker** ou créer une branche depuis `main`.
2. Nommer la branche en fonction de l'intention :
   - `feat/<sujet>` — nouvelle fonctionnalité
   - `fix/<sujet>` — correction de bug
   - `chore/<sujet>` — maintenance, refactor, build
   - `docs/<sujet>` — documentation seule
   - `test/<sujet>` — tests seuls
3. Faire des **commits atomiques** (un changement = un commit).
4. **Conventional Commits** obligatoire :
   ```
   feat(dashboard): add diffusion cell detail Sheet
   fix(audit): handle empty filter result
   chore(deps): bump next 16.2.6 → 16.3.0
   ```
5. Ouvrir une **Pull Request** vers `main` avec le template fourni.
6. CI doit être verte (typecheck + lint + build) **avant review**.
7. Squash-merge appliqué par défaut.

## Standards de code

- **TypeScript strict** (pas de `any` sans justification commentée)
- **ESLint clean** — pas d'option `--fix` qui masquerait un problème de fond
- **Pas d'apostrophe brute dans JSX** → `&apos;` (règle `react/no-unescaped-entities`)
- **Tokens de design** — utiliser uniquement les variables CSS définies dans `apps/web/src/app/globals.css` (`--bg-base`, `--accent-violet`, etc.)
- **Composants shadcn** — installés via la CLI shadcn, jamais réécrits à la main
- **Hooks TanStack Query** dans `apps/web/src/lib/queries/` — point unique de swap mocks → API

## Tests

À venir (Phase 1 du roadmap). En attendant :
- Vérifier visuellement les changements sur les routes touchées
- Lancer `pnpm typecheck && pnpm lint` avant de pusher
- Pour les changements visuels, capture d'écran dans la PR

## Architecture Decision Records (ADR)

Toute décision technique structurante est documentée dans `docs/adr/`.
Format MADR (Markdown Any Decision Record).
- Numérotation séquentielle : `001-titre-court.md`
- Statut : `proposed` → `accepted` → `deprecated` → `superseded by [ADR-N]`

Avant de proposer un changement architectural majeur (nouvelle dépendance lourde, refactor cross-module, abandon d'une couche), ouvrir d'abord une ADR en `proposed`.

## Sécurité

Ne **jamais committer** :
- secrets, tokens, mots de passe
- `.env`, `.env.local`, fichiers credentials
- dumps de base de données contenant des données réelles

Voir `.gitignore` pour la liste des patterns ignorés.

Vulnérabilité découverte → email à `security@gmd2025.org` (privé), pas d'issue publique.

## Process de review

- 1 reviewer minimum pour les fix
- 2 reviewers minimum pour les feat (un côté front, un côté back si transverse)
- CODEOWNERS auto-assigne les reviewers selon les paths modifiés

## Questions ?

Ouvrir une issue avec le label `question` ou contacter `contact@gmd2025.org`.
