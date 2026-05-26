# ADR-006 — Baseline sécurité (Sprint 0)

**Statut** : accepted
**Date** : 2026-05-26
**Décideur** : architecture team

## Contexte
MEDIA-IA / CMR cible un usage de diffuseur public d'État. À l'audit initial, le MVP présente plusieurs failles incompatibles avec une exposition en environnement gouvernemental :
- aucun guard JWT sur les endpoints API → toutes les routes sont publiques
- mots de passe en clair dans `auth.service.ts`
- données 100 % en mémoire → pas de persistance, pas de chiffrement au repos
- pas de rate limiting, pas de Helmet, pas de CSRF côté front
- pas de validation DTO entrante
- pas d'audit cryptographiquement chaîné

## Décision
Implémenter la baseline suivante comme socle non négociable du Sprint 0 :

1. **Persistance** : Postgres 16 dédié, schéma Prisma migré, soft delete via `deletedAt`
2. **Hash mot de passe** : Argon2id (paramètres OWASP 2024 : m=64MiB, t=3, p=4) — pas bcrypt seul
3. **Authentification** : JWT signé HS512 + clé ≥ 64 caractères chargée depuis `.env`
4. **Guards** : `JwtAuthGuard` enregistré en `APP_GUARD` global, décorateur `@Public()` opt-out explicite par endpoint
5. **RBAC** : décorateur `@Roles()` + `RolesGuard`, 6 rôles initiaux issus de `packages/types`
6. **Rate limiting** : `@nestjs/throttler` global 100 req/min par IP, durci sur `/auth/login` à 5/min
7. **Headers sécurité** : Helmet (CSP, HSTS, X-Frame-Options DENY, Referrer-Policy)
8. **CORS** : whitelist explicite (web origin uniquement), `credentials: true`
9. **Validation entrée** : `class-validator` + `ValidationPipe` global `whitelist: true, forbidNonWhitelisted: true`
10. **Cookies session** : HttpOnly + Secure + SameSite=Strict + path=/
11. **Logs** : Pino structurés, redaction automatique des champs `password`, `token`, `authorization`
12. **Audit chaîné** : `AuditEvent.checksumSha256` = SHA-256(JSON record + prevHash), vérifiable
13. **Secrets** : aucun secret commité, `.env.example` documenté, pre-commit `git-secrets` ou `gitleaks`

## Conséquences positives
- Conformité ANSSI baseline + RGPD prête
- Audit immuable opposable juridiquement
- Surface d'attaque réduite avant exposition externe

## Conséquences négatives
- Migration de 17 controllers nécessaire (1-2 jours mécaniques)
- Surcoût léger sur les requêtes auth (Argon2id ≈ 50 ms par hash)
- DX : impossible de tester l'API sans login (mitigation : seed comptes de dev)

## Alternatives écartées
- **Bcrypt seul** : moins résistant aux GPU modernes que Argon2id
- **API publique read-only sans auth** : incompatible avec confidentialité des contenus en cours de validation
- **OAuth2 / OIDC directement** : reporté à Sprint 1 (intégration IdP gouv) — JWT local suffit pour Sprint 0

## Liens
- ADR-007 — Souveraineté & hébergement national (à venir)
- `docs/SKILLS.md` — pipeline de validation
- `docs/ROADMAP.md` — phasage 12 mois
