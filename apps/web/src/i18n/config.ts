/**
 * Sprint 6 — i18n configuration.
 *
 * Trois locales lancées dès Sprint 6 :
 *   - fr (par défaut)
 *   - en
 *   - ar (RTL — direction="rtl" sur <html>)
 *
 * Phase 2 prévues : bambara, peul, songhaï, tamacheq (langues nationales),
 * puis ES/PT/ZH pour rayonnement international.
 *
 * Migration des chaînes : `src/components/**` doit progressivement remplacer
 * les littéraux français par `useTranslations()` puis `t("namespace.key")`.
 */

export const locales = ["fr", "en", "ar"] as const;
export type Locale = (typeof locales)[number];

export const defaultLocale: Locale = "fr";

export const rtlLocales: Locale[] = ["ar"];

export function isRtl(locale: Locale): boolean {
  return rtlLocales.includes(locale);
}

export function getDirection(locale: Locale): "ltr" | "rtl" {
  return isRtl(locale) ? "rtl" : "ltr";
}

export const localeNames: Record<Locale, string> = {
  fr: "Français",
  en: "English",
  ar: "العربية",
};
