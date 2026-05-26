# ADR-010 — Archivage légal & WORM (Sprint 6)

**Statut** : accepted
**Date** : 2026-05-26

## Contexte
En tant que diffuseur public d'État, la CMR est soumise à :
- **Dépôt légal numérique** (envoi automatique des contenus diffusés à l'archive nationale équivalente INA)
- **Conservation 30 ans** pour les contenus d'information
- **Droit de réponse** : workflow tracé + délai légal
- **Réquisition judiciaire** : portail réponse aux autorités avec audit

Le storage S3/MinIO (Sprint 4) ne fournit pas ces garanties par défaut.

## Décision

### 1. Tiering du stockage
```
Chaud   (S3 standard)  : 90 jours — accès immédiat, contenus actifs
Tiède   (S3 IA)        : 1 an     — accès < 12h, archive d'opération
Froid   (Glacier)      : 30 ans   — accès < 24h, archive légale (immuable)
```

### 2. Object Lock WORM (Write Once Read Many)
- Tous les objets en archive **froide** sont créés avec **`ObjectLockMode: COMPLIANCE`**
  + **retention période 30 ans**
- En mode COMPLIANCE, même l'admin du bucket ne peut pas supprimer ou modifier
  avant la retention date
- Bucket dédié `cmr-legal-archive` distinct de `cmr-media`
- Versioning activé (pour empêcher l'écrasement même via clé identique)

### 3. Dépôt légal automatique
- Workflow : `content.published` event (Sprint 5) → handler `legalDepositConnector`
- Envoi métadonnées normalisées EBU Core + fichiers vers l'archive nationale
- Statut tracé dans table `LegalDeposit` (à créer Sprint 6.2) :
  ```
  LegalDeposit { id, contentId, depositId, status, depositedAt, archiveResponse, sha256 }
  ```
- Re-tentative auto en cas d'échec (DLQ Kafka — Sprint 5b)

### 4. Droit de réponse
- Nouvelle route `/dashboard/droit-de-reponse` (Sprint 6.5)
- Workflow dédié avec délai légal automatique (J+3 réponse requise, sinon escalade)
- Cosignature obligatoire de la Direction
- Audit chain (Sprint 1.4) inclut event `legal_response_published`

### 5. Réquisition judiciaire
- Endpoint admin-only `/api/admin/judicial-request` (Sprint Final)
- Export des données utilisateur, contenus, audit log signé (RFC 3161 timestamp authority)
- Bundle ZIP chiffré avec clé partagée à l'autorité requérante
- Audit event `judicial_export` ne peut être supprimé (WORM)

## Conséquences positives
- Conformité réglementaire prouvable
- Audit chain (Sprint 1.4) déjà cryptographiquement vérifiable → +30 ans de conservation
- Sécurité : COMPLIANCE WORM = même un admin compromis ne peut effacer
- Coûts maîtrisés : Glacier ~0.004$/GB/mois, ~1% du coût standard

## Conséquences négatives
- Storage Glacier latence : 1-12h pour restauration → process à anticiper si demande
- Coût de re-traitement (re-encoding HEVC en 2050 pour formats obsolètes) à provisionner
- Process opérationnel : équipe Legal/Archives à former

## Implémentation par phase

| Sprint | Livrable |
|---|---|
| 6 (cette ADR) | ✅ ADR + architecture définie |
| 6.2 | Table `LegalDeposit` + migration Prisma |
| 6.3 | Bucket S3 cmr-legal-archive (Object Lock COMPLIANCE 30y) |
| 6.4 | Handler `legalDepositConnector` sur `content.published` |
| 6.5 | UI /droit-de-reponse + workflow + cosignature |
| Final | Endpoint /judicial-request + audit signé RFC 3161 |

## Liens
- ADR-006 — Sécurité baseline
- ADR-008 — i18n
- AWS S3 Object Lock : https://docs.aws.amazon.com/AmazonS3/latest/userguide/object-lock.html
- RFC 3161 — Time-Stamp Protocol
