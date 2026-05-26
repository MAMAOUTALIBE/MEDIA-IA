# Matrice de conformité ISO/IEC 27001:2022 — CMR

Cette matrice associe chaque contrôle de l'Annexe A de la norme à son implémentation dans la plateforme CMR et au sprint qui l'a livré (ou planifié).

## A.5 — Politiques de sécurité de l'information

| Contrôle | Implémentation CMR | Sprint |
|---|---|---|
| 5.1 Politiques de sécurité | ADR-006 (sécurité baseline) + `docs/SKILLS.md` | 0 |
| 5.2 Rôles & responsabilités | RBAC 6 rôles + RolesGuard hiérarchique | 0.3 |
| 5.7 Threat intelligence | Sentry alerts + Snyk + Trivy + CodeQL | 0.7 + Final |
| 5.10 Politique d'usage acceptable | `docs/CONTRIBUTING.md` | 0 |
| 5.30 Continuité d'activité | Backup pgBackRest + MinIO mirror + WORM 30y | 8 + 6 |

## A.6 — Organisation des ressources humaines

| Contrôle | Implémentation | Sprint |
|---|---|---|
| 6.1 Vérification des candidats | Process RH externe à la plateforme | n/a |
| 6.3 Sensibilisation sécurité | Formation MFA obligatoire (login force setup) | 1 + Final |

## A.7 — Sécurité physique

| Contrôle | Implémentation | Sprint |
|---|---|---|
| 7.1-7.14 | Hébergement souverain ANSSI/SecNumCloud Tier III+ | Final (déploiement) |

## A.8 — Sécurité opérationnelle

| Contrôle | Implémentation | Sprint |
|---|---|---|
| 8.1 Inventaire actifs | K8s + ArgoCD + SBOM par image | 8 + Final |
| 8.2 Classification info | Tags Content (sensibilité) + accès RBAC | 0.3 |
| 8.3 Étiquetage | metadata.classification (Sprint Final.2) | Final |
| 8.5 Auth | Argon2id + MFA + JWT HS512 + Refresh DB | 0.2 + 1 |
| 8.6 Configuration | Helmet + ValidationPipe + CORS + Throttler | 0.4 |
| 8.7 Anti-malware | ClamAV sur uploads (Sprint Final.5) | Final |
| 8.8 Vulnérabilités | Snyk + Trivy + CodeQL + Renovate + Dependabot | 0.7 |
| 8.9 Gestion configuration | GitOps ArgoCD + Helm + Terraform | 8b |
| 8.10 Suppression info | Soft delete + droit à l'oubli RGPD | Final |
| 8.11 Masquage données | Pino redaction logs + Sentry scrub PII | 0 + 0.7 |
| 8.12 Prévention fuite | NetworkPolicy K8s + egress filtering | 8 |
| 8.13 Backups | pgBackRest quotidien + WAL + tests resto mensuels | 8 |
| 8.14 Redondance | 3 replicas K8s + multi-AZ + HPA 3-20 | 8 |
| 8.15 Journalisation | Audit chain SHA-256 chaîné + Pino logs structurés | 1.4 |
| 8.16 Surveillance | Grafana + Prometheus + Loki + alerts | 8 + 8b |
| 8.17 Synchronisation horloge | NTP via K8s + pg_advisory_xact_lock pour ordre audit | 8 + 2 |
| 8.18 Outils privilégiés | Aucun accès SSH prod ; kubectl via mTLS + audit kube-apiserver | Final |
| 8.19 Installation logiciel | Image-immutable Docker scratch/distroless + ArgoCD | 8 |
| 8.20 Sécurité réseaux | TLS 1.3 + Helmet + mTLS service-to-service | 0 + Final |
| 8.21 Sécurité services réseau | NetworkPolicy + Ingress NGINX + rate limit | 8 |
| 8.22 Séparation réseaux | Namespaces K8s + NetworkPolicy + VPC | 8 |
| 8.23 Filtrage web | WAF Cloudflare/CRS (Sprint Final) | Final |
| 8.24 Crypto | Argon2id + AES-256 + RSA-4096 + SHA-256 | 0.2 + Final |
| 8.25 Cycle développement sécurisé | docs/SKILLS.md pipeline 3-skills + ADRs | 0 |
| 8.26 Spécification sécurité | ADR-006 + tests Vitest + Playwright | 0 |
| 8.27 Sécurité architecture | ADR-001 à 010 documentent l'architecture | 0-6 |
| 8.28 Code sécurisé | Argon2 + JwtAuthGuard + Validation + Helmet | 0 |
| 8.29 Tests sécurité | Vitest unit + Playwright e2e + pentest annuel | 0 + Final |
| 8.30 Développement externalisé | Code review + CODEOWNERS + signed commits | 0 + Final |
| 8.31 Séparation environnements | dev/staging/prod K8s + ArgoCD branches | 8 + Final |
| 8.32 Gestion changements | Conventional Commits + PR + 2 reviewers chiefs | 0 |
| 8.33 Données test | Seed déterministe + fixture isolation cmr_test | 0.1 + 0.8 |
| 8.34 Audit système | AuditService chaîné SHA-256 + Prom metrics + OTel | 1.4 + 8 |

## A.9 — Acquisition, développement, maintenance des systèmes

Couvert par A.8.25-A.8.34 (sécurité dev) et A.8.7-A.8.9 (vulnérabilités).

## A.10 — Relations fournisseurs

| Contrôle | Implémentation | Sprint |
|---|---|---|
| 10.1 Politique fournisseurs | Approbation pre-engagement (Anthropic, AWS, Sentry) | Final |
| 10.2 Sécurité accords | DPA RGPD + clauses contractuelles type CE | Final |

## A.11 — Conformité

| Contrôle | Implémentation | Sprint |
|---|---|---|
| 11.1 Identification exigences | RGPD + Loi Mali data protection + Convention ONU | 0 + 6 |
| 11.2 Droits propriété intellectuelle | Licences vérifiées AI checks | 3 |
| 11.3 Protection enregistrements | WORM 30y + audit chain immuable | 6 |
| 11.4 Protection PII | Argon2id + pgcrypto + droit à l'oubli | 0.2 + Final |
| 11.5 Cryptographie réglementée | AES-256 / RSA-4096 / SHA-256 conforme ANSSI RGS | 0 + Final |

## Niveau de maturité actuel

| Domaine | Couverture | Gaps majeurs |
|---|---|---|
| Authentification (A.8.5) | ★★★★★ | — |
| Autorisation (A.5.2) | ★★★★☆ | ABAC fin via Cerbos (Sprint 1.5) |
| Logging & monitoring (A.8.15-16) | ★★★★☆ | Alerts SOC 24/7 |
| Cryptographie (A.8.24) | ★★★★☆ | HSM/KMS souverain à finaliser |
| Backup/DR (A.8.13-14) | ★★★☆☆ | Tests resto multi-région trimestriels |
| Gestion vulnérabilités (A.8.8) | ★★★★☆ | Pentest annuel ANSSI |
| Réseau (A.8.20-22) | ★★★★☆ | mTLS Linkerd/Istio |
| Suppl. chain (A.10) | ★★★☆☆ | DPA Anthropic + DPA Sentry |
| Continuité (A.5.30) | ★★★☆☆ | Plan DRP testé annuel |
| **Score global pré-pentest** | **76 %** | Cible : ≥ 90% avant certification |

## Roadmap certification

1. **Sprint Final + 1 mois** : pré-audit interne + remédiation
2. **+ 2 mois** : pré-audit cabinet certifié (BSI, Bureau Veritas, AFNOR)
3. **+ 4 mois** : audit certification stade 1 + 2
4. **+ 6 mois** : certificat ISO 27001:2022 délivré
5. **Annuel** : audit surveillance + recertification 3 ans
