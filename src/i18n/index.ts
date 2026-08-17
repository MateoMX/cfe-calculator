import {
  createContext,
  createElement,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react'
import type { BlockKey, MonthNumber, SummerStartMonth } from '../domain/types'
import { translate, type MessageKey } from './messages'
import {
  intlLocale,
  isLanguage,
  resolveLanguageFromLocale,
  type Language,
} from './types'

export type { Language, MessageKey }
export { isLanguage, resolveLanguageFromLocale, intlLocale, translate }

export function formatMoney(value: number, language: Language): string {
  return new Intl.NumberFormat(intlLocale(language), {
    style: 'currency',
    currency: 'MXN',
  }).format(value)
}

export function formatMoneyRate(value: number, language: Language): string {
  return new Intl.NumberFormat(intlLocale(language), {
    style: 'currency',
    currency: 'MXN',
    minimumFractionDigits: 3,
    maximumFractionDigits: 3,
  }).format(value)
}

export function formatKwh(value: number, language: Language, maximumFractionDigits = 2): string {
  return new Intl.NumberFormat(intlLocale(language), {
    maximumFractionDigits,
  }).format(value)
}

export function formatMonthLabel(month: MonthNumber, language: Language): string {
  return translate(language, `dates.month.${month}` as MessageKey)
}

export function formatMonthTitle(month: SummerStartMonth, language: Language): string {
  return translate(language, `dates.monthTitle.${month}` as MessageKey)
}

export function summerStartOptions(language: Language): Array<{ value: SummerStartMonth; label: string }> {
  return ([2, 3, 4, 5] as const).map((value) => ({
    value,
    label: formatMonthTitle(value, language),
  }))
}

export function blockLabel(key: BlockKey, language: Language): string {
  return translate(language, `allowance.block.${key}` as MessageKey)
}

export function tariffOptionLabel(code: string, language: Language): string {
  if (code === 'DAC') return translate(language, 'form.tariffOptionDac')
  return translate(language, 'form.tariffOption', { code })
}

export function applyDocumentLanguage(language: Language): void {
  document.documentElement.lang = language
  document.title = translate(language, 'doc.title')
  const description = document.querySelector('meta[name="description"]')
  if (description) {
    description.setAttribute('content', translate(language, 'doc.description'))
  }
}

function readStoredLanguage(): Language | null {
  try {
    const stored = window.localStorage.getItem('cfe-calculator.preferences.v1')
    if (!stored) return null
    const preferences = JSON.parse(stored) as Record<string, unknown>
    return isLanguage(preferences.language) ? preferences.language : null
  } catch {
    return null
  }
}

export function resolveInitialLanguage(): Language {
  const stored = readStoredLanguage()
  if (stored) return stored
  const locale =
    typeof navigator !== 'undefined'
      ? navigator.language || navigator.languages?.[0] || null
      : null
  return resolveLanguageFromLocale(locale)
}

interface I18nContextValue {
  language: Language
  setLanguage: (language: Language) => void
  t: (key: MessageKey, params?: Record<string, string | number>) => string
}

const I18nContext = createContext<I18nContextValue | null>(null)

export function LanguageProvider({
  children,
  initialLanguage,
}: {
  children: ReactNode
  initialLanguage?: Language
}) {
  const [language, setLanguageState] = useState<Language>(
    () => initialLanguage ?? resolveInitialLanguage(),
  )

  useEffect(() => {
    applyDocumentLanguage(language)
  }, [language])

  const setLanguage = useCallback((next: Language) => {
    setLanguageState(next)
  }, [])

  const value = useMemo<I18nContextValue>(
    () => ({
      language,
      setLanguage,
      t: (key, params) => translate(language, key, params),
    }),
    [language, setLanguage],
  )

  return createElement(I18nContext.Provider, { value }, children)
}

export function useI18n(): I18nContextValue {
  const context = useContext(I18nContext)
  if (!context) {
    throw new Error('useI18n must be used within LanguageProvider')
  }
  return context
}
