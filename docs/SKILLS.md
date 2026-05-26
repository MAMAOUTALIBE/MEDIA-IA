# Pipeline 3-skills — convention de livraison MEDIA-IA

Toute modification non triviale du code passe par trois étapes obligatoires. Aucun bloc n'est marqué "completed" sans que les trois aient validé.

## 🔨 Skill 1 — Coder
**Responsabilité** : implémenter le bloc fonctionnel (code applicatif, migrations, configs).
**Outils** : `Edit`, `Write`, subagent `general-purpose` pour les blocs longs.
**Sortie attendue** :
- Code commité (ou prêt à l'être) dans le bon module
- Diff résumé en 3-5 lignes
- Liste des fichiers touchés

**Garde-fous** :
- Pas de mock ajouté à un endpoint existant qui doit aller en DB
- Pas de secret hardcodé (`bcrypt`, `argon2` minimum sur les passwords)
- Respecter ADR-001 à ADR-005 (stack frontend) et ADR-006 (sécurité baseline)
- Conventional Commits obligatoires : `feat:`, `fix:`, `chore:`, `test:`, `refactor:`

## 🧪 Skill 2 — Tester
**Responsabilité** : garantir qu'aucun bloc n'entre dans `main` sans test exécuté.
**Outils** : Vitest (unit + integration), Playwright (e2e), k6 (charge), Lighthouse (perf+a11y).
**Sortie attendue** :
- `pnpm test` → vert
- Au moins 1 test unit + 1 test integration par nouveau endpoint
- 1 test e2e par parcours utilisateur critique (login, créer contenu, valider, publier)
- Couverture cible : ≥ 80 % sur les services, ≥ 60 % sur les controllers

**Garde-fous** :
- Si test échoue → retour `Coder`, pas de skip
- Tests intégration utilisent un schéma Postgres isolé (`cmr_test` sur le même container, base séparée)
- Pas de `.skip` ou `.only` mergé
- Snapshot tests autorisés mais doivent être expliqués

## ✅ Skill 3 — Validator
**Responsabilité** : code review sécurité + architecture + conventions avant merge.
**Outils** : subagent `Explore` (lecture rapide multi-fichiers) ou code-reviewer dédié.
**Checklist obligatoire** :
- [ ] Pas d'endpoint exposé sans `JwtAuthGuard` (sauf `@Public()` explicite)
- [ ] Pas de secret en clair (logs, configs, mocks)
- [ ] Pas de mot de passe en clair en DB ou en mémoire
- [ ] Conformité Prisma : indices sur FK, `deletedAt` pour soft delete
- [ ] Pas de N+1 sur les queries (include/select explicites)
- [ ] Conformité ADR du repo
- [ ] Erreurs i18n-ready (codes d'erreur stables, pas de chaînes en dur)
- [ ] Logs structurés (pino), pas de `console.log`
- [ ] Validation DTOs côté API (`class-validator` ou Zod)

**Sortie attendue** : ✅ APPROVED ou liste de défauts → retour Coder.

## 📋 Workflow
1. Coder propose un bloc avec diff
2. Tester écrit/exécute les tests → vert obligatoire
3. Validator inspecte → APPROVED ou REJECTED
4. Si REJECTED : retour étape 1
5. Si APPROVED : `git commit -m "feat(...)" + push`
6. CI GitHub Actions doit aussi être verte avant merge

## 🤖 Mode autonome
Quand l'utilisateur demande "fais tout jusqu'à Sprint Final", aucune question n'est posée. Les décisions raisonnables sont prises directement (port DB, secret JWT généré, version de lib choisie). Voir mémoire `feedback_skills_3_pipeline`.

## Outils CI gates (à activer Sprint 0.7)
- ESLint + Prettier : `pnpm lint`
- Typecheck strict : `pnpm typecheck`
- Vitest : `pnpm test`
- Build : `pnpm build`
- Playwright e2e : `pnpm e2e`
- Lighthouse CI : performance/a11y/SEO budgets
- Snyk + Trivy : SCA + container scan
- CodeQL : SAST
