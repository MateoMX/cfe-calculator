export type Language = 'es' | 'en'

export function isLanguage(value: unknown): value is Language {
  return value === 'es' || value === 'en'
}

/**
 * Resolve UI language from a browser locale string.
 * Unknown/missing locales and es/it/pt (including regional variants) → Spanish.
 * English and every other language → English.
 */
export function resolveLanguageFromLocale(locale?: string | null): Language {
  if (!locale) return 'es'
  const primary = locale.toLowerCase().split(/[-_]/)[0]?.trim() ?? ''
  if (!primary) return 'es'
  if (primary === 'es' || primary === 'it' || primary === 'pt') return 'es'
  return 'en'
}

export function intlLocale(language: Language): string {
  return language === 'es' ? 'es-MX' : 'en-GB'
}
