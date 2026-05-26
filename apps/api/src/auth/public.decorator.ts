import { SetMetadata } from "@nestjs/common";

export const IS_PUBLIC_KEY = "auth:isPublic";

/**
 * Décorateur opt-out du JwtAuthGuard global.
 * Usage : `@Public()` sur un controller/handler qui ne requiert pas de token.
 * Réservé aux endpoints volontairement non protégés (login, health, webhooks signés).
 */
export const Public = () => SetMetadata(IS_PUBLIC_KEY, true);
