import { useEffect, useRef, useState, type RefObject } from 'react'
import { AppNav } from './components/AppNav'
import { CalculatorForm } from './components/CalculatorForm'
import { EstimateResult } from './components/EstimateResult'
import { InfoPopover } from './components/InfoPopover'
import { LanguageSwitcher } from './components/LanguageSwitcher'
import { MobileShell } from './components/MobileShell'
import { TariffReferencePage } from './components/TariffReferencePage'
import { TARIFF_OPTIONS, TARIFF_SNAPSHOT_META } from './data/tariffs'
import {
  defaultNextCutoff,
  formatDisplayDate,
  isPreviousCutoffFresh,
  SUMMER_START_VALUES,
} from './domain/dates'
import { createEmptyInput, estimateBill, requiredHistorySlots } from './domain/estimate'
import type { CalculatorInput, FullEstimate, SummerStartMonth, ValidationIssue } from './domain/types'
import { useIsMobile } from './hooks/useIsMobile'
import {
  LanguageProvider,
  resolveInitialLanguage,
  useI18n,
  type Language,
} from './i18n'
import {
  readAppViewFromLocation,
  setAppViewHash,
  type AppView,
} from './navigation'
import {
  buildShareUrl,
  copyTextToClipboard,
  parseCalculatorInputFromHash,
} from './shareLink'
import './App.css'

const PREFERENCES_STORAGE_KEY = 'cfe-calculator.preferences.v1'

function isTariffCode(value: unknown): value is CalculatorInput['tariffCode'] {
  return typeof value === 'string' && TARIFF_OPTIONS.some((option) => option.code === value)
}

function isSummerStartMonth(value: unknown): value is SummerStartMonth {
  return typeof value === 'number' && SUMMER_START_VALUES.includes(value as SummerStartMonth)
}

function createInputWithSavedPreferences(): CalculatorInput {
  const input = createEmptyInput()

  try {
    const stored = window.localStorage.getItem(PREFERENCES_STORAGE_KEY)
    if (!stored) return input

    const preferences = JSON.parse(stored) as Record<string, unknown>
    const tariffCode = isTariffCode(preferences.tariffCode)
      ? preferences.tariffCode
      : input.tariffCode
    const billingCycle =
      preferences.billingCycle === 'mensual' || preferences.billingCycle === 'bimestral'
        ? preferences.billingCycle
        : input.billingCycle
    const summerStartMonth =
      tariffCode === '1'
        ? null
        : isSummerStartMonth(preferences.summerStartMonth)
          ? preferences.summerStartMonth
          : input.summerStartMonth

    const previousCutoffDate =
      typeof preferences.previousCutoffDate === 'string' &&
      isPreviousCutoffFresh(preferences.previousCutoffDate, billingCycle)
        ? preferences.previousCutoffDate
        : ''
    const previousReading =
      previousCutoffDate &&
      typeof preferences.previousReading === 'number' &&
      Number.isFinite(preferences.previousReading) &&
      preferences.previousReading >= 0
        ? preferences.previousReading
        : input.previousReading

    return {
      ...input,
      tariffCode,
      summerStartMonth,
      billingCycle,
      previousReading,
      previousCutoffDate,
      nextCutoffDate: previousCutoffDate
        ? defaultNextCutoff(previousCutoffDate, billingCycle)
        : input.nextCutoffDate,
      historicalPeriodKwh: Array.from({ length: requiredHistorySlots(billingCycle) }, () => null),
    }
  } catch {
    return input
  }
}

function createInitialInput(): CalculatorInput {
  const fromPreferences = createInputWithSavedPreferences()
  const fromShare = parseCalculatorInputFromHash(window.location.hash)
  return fromShare ?? fromPreferences
}

interface DesktopLayoutProps {
  input: CalculatorInput
  issues: ValidationIssue[]
  estimate: FullEstimate | null
  resultRef: RefObject<HTMLElement | null>
  formInstanceKey: number
  onChange: (next: CalculatorInput) => void
  onSubmit: () => void
  onCopyShareLink: () => Promise<boolean>
  onNavigate: (view: AppView) => void
}

function DesktopLayout({
  input,
  issues,
  estimate,
  resultRef,
  formInstanceKey,
  onChange,
  onSubmit,
  onCopyShareLink,
  onNavigate,
}: DesktopLayoutProps) {
  const { language, t } = useI18n()

  return (
    <div className="page">
      <header className="hero">
        <div className="hero-top">
          <AppNav view="calculator" onNavigate={onNavigate} />
          <h1>{t('app.title')}</h1>
          <LanguageSwitcher />
        </div>
        <p>{t('app.blurb')}</p>
        <div className="info-tip">
          {t('app.infoTip')}{' '}
          <InfoPopover label={t('app.madeWithLoveLabel')}>{t('app.madeWithLove')}</InfoPopover>
        </div>
        <p className="privacy-note">
          <svg className="privacy-note-icon" viewBox="0 0 20 20" aria-hidden="true" focusable="false">
            <path
              d="M10 1.75 3.75 4.25v4.6c0 3.85 2.5 7.45 6.25 8.9 3.75-1.45 6.25-5.05 6.25-8.9V4.25L10 1.75Z"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinejoin="round"
            />
            <path
              d="M7.6 10.05 9.2 11.6l3.3-3.45"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
          {t('app.privacyNote')}
        </p>
      </header>

      <main className="layout">
        <CalculatorForm
          key={formInstanceKey}
          value={input}
          issues={issues}
          onChange={onChange}
          onSubmit={onSubmit}
          onCopyShareLink={onCopyShareLink}
        />
        {estimate ? (
          <EstimateResult ref={resultRef} estimate={estimate} />
        ) : (
          <aside className="card placeholder">
            <h2>{t('app.placeholderTitle')}</h2>
            <p>{t('app.placeholderBody')}</p>
            <ul>
              <li>{t('app.placeholderItem1')}</li>
              <li>{t('app.placeholderItem2')}</li>
              <li>{t('app.placeholderItem3')}</li>
            </ul>
            <p className="meta">
              {t('app.metaUpdated', {
                date: formatDisplayDate(TARIFF_SNAPSHOT_META.asOf, language),
              })}
            </p>
          </aside>
        )}
      </main>

      <footer className="page-footer">
        <p>{t('app.footer')}</p>
      </footer>
    </div>
  )
}

function AppContent() {
  const { language } = useI18n()
  const isMobile = useIsMobile()
  const [view, setView] = useState<AppView>(() => readAppViewFromLocation())
  const [input, setInput] = useState<CalculatorInput>(() => createInitialInput())
  const [issues, setIssues] = useState<ValidationIssue[]>([])
  const [estimate, setEstimate] = useState<FullEstimate | null>(null)
  const [formInstanceKey, setFormInstanceKey] = useState(0)
  const resultRef = useRef<HTMLElement>(null)
  const shouldScrollToResult = useRef(false)
  const shouldRebuildOnLanguageChange = useRef(false)
  const previousLanguage = useRef(language)
  const lastShareHash = useRef(window.location.hash)

  useEffect(() => {
    function syncFromHash() {
      setView(readAppViewFromLocation())
      const hash = window.location.hash
      if (hash === lastShareHash.current) return
      lastShareHash.current = hash
      const shared = parseCalculatorInputFromHash(hash)
      if (!shared) return
      setInput(shared)
      setIssues([])
      setEstimate(null)
      shouldRebuildOnLanguageChange.current = false
      setFormInstanceKey((current) => current + 1)
    }
    syncFromHash()
    window.addEventListener('hashchange', syncFromHash)
    return () => window.removeEventListener('hashchange', syncFromHash)
  }, [])

  function handleNavigate(next: AppView) {
    setView(next)
    setAppViewHash(next)
    lastShareHash.current = window.location.hash
  }

  useEffect(() => {
    try {
      window.localStorage.setItem(
        PREFERENCES_STORAGE_KEY,
        JSON.stringify({
          language,
          tariffCode: input.tariffCode,
          summerStartMonth: input.summerStartMonth,
          billingCycle: input.billingCycle,
          previousReading: input.previousReading,
          previousCutoffDate: input.previousCutoffDate,
        }),
      )
    } catch {
      // The calculator remains usable when browser storage is unavailable.
    }
  }, [
    language,
    input.tariffCode,
    input.summerStartMonth,
    input.billingCycle,
    input.previousReading,
    input.previousCutoffDate,
  ])

  useEffect(() => {
    if (!shouldScrollToResult.current || !estimate || isMobile) return
    shouldScrollToResult.current = false
    resultRef.current?.scrollIntoView?.({ behavior: 'smooth', block: 'start' })
  }, [estimate, isMobile])

  useEffect(() => {
    if (previousLanguage.current === language) return
    previousLanguage.current = language
    if (!shouldRebuildOnLanguageChange.current) return
    const result = estimateBill(input, language)
    setIssues(result.issues)
    setEstimate(result.estimate)
  }, [language, input])

  function handleSubmit() {
    const result = estimateBill(input, language)
    setIssues(result.issues)
    setEstimate(result.estimate)
    shouldRebuildOnLanguageChange.current = true
    if (result.estimate) {
      shouldScrollToResult.current = true
    }
  }

  function handleChange(next: CalculatorInput) {
    setInput(next)
    setIssues([])
  }

  async function handleCopyShareLink(): Promise<boolean> {
    return copyTextToClipboard(buildShareUrl(input))
  }

  if (view === 'tariffs') {
    if (isMobile) {
      return <MobileTariffsShell onNavigate={handleNavigate} />
    }
    return <TariffReferencePage onNavigate={handleNavigate} />
  }

  if (isMobile) {
    return (
      <MobileShell
        input={input}
        issues={issues}
        estimate={estimate}
        formInstanceKey={formInstanceKey}
        onChange={handleChange}
        onSubmit={handleSubmit}
        onCopyShareLink={handleCopyShareLink}
        onNavigate={handleNavigate}
      />
    )
  }

  return (
    <DesktopLayout
      input={input}
      issues={issues}
      estimate={estimate}
      resultRef={resultRef}
      formInstanceKey={formInstanceKey}
      onChange={handleChange}
      onSubmit={handleSubmit}
      onCopyShareLink={handleCopyShareLink}
      onNavigate={handleNavigate}
    />
  )
}

function MobileTariffsShell({ onNavigate }: { onNavigate: (view: AppView) => void }) {
  const { t } = useI18n()

  return (
    <div className="m-app m-app--tariffs">
      <header className="m-app-bar">
        <div className="m-app-bar-leading">
          <AppNav view="tariffs" onNavigate={onNavigate} />
          <h1 className="m-app-bar-title">{t('tariffs.title')}</h1>
        </div>
        <LanguageSwitcher />
      </header>
      <div className="m-tariffs-scroll">
        <TariffReferencePage onNavigate={onNavigate} compact />
        <p className="m-footer">{t('app.footer')}</p>
      </div>
    </div>
  )
}

export default function App({ initialLanguage }: { initialLanguage?: Language } = {}) {
  return (
    <LanguageProvider initialLanguage={initialLanguage ?? resolveInitialLanguage()}>
      <AppContent />
    </LanguageProvider>
  )
}
