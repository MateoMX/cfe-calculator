import { useEffect, useRef, useState } from 'react'
import type { CalculatorInput, FullEstimate, ValidationIssue } from '../domain/types'
import { useI18n } from '../i18n'
import type { AppView } from '../navigation'
import { AppNav } from './AppNav'
import { CalculatorForm } from './CalculatorForm'
import { EstimateResult } from './EstimateResult'
import { LanguageSwitcher } from './LanguageSwitcher'

const MOBILE_FORM_ID = 'cfe-mobile-calculator-form'

type MobileScreen = 'input' | 'result'

interface Props {
  input: CalculatorInput
  issues: ValidationIssue[]
  estimate: FullEstimate | null
  expertMode: boolean
  formInstanceKey?: number
  onChange: (next: CalculatorInput) => void
  onSubmit: () => void
  onExpertModeChange: (enabled: boolean) => void
  onCopyShareLink: () => Promise<boolean>
  onNavigate: (view: AppView) => void
}

function firstFieldIssue(issues: ValidationIssue[]): ValidationIssue | undefined {
  return issues.find((issue) => issue.field && issue.field !== 'general')
}

function scrollFieldIntoMobileView(screen: HTMLElement, control: HTMLElement) {
  const target =
    control.closest<HTMLElement>('.form-field') ??
    control.closest<HTMLElement>('label') ??
    control
  const actionBar = screen.closest('.m-app')?.querySelector<HTMLElement>('.m-action-bar')
  const actionBarHeight = actionBar?.getBoundingClientRect().height ?? 0
  const visibleHeight = Math.max(0, screen.clientHeight - actionBarHeight)
  const screenRect = screen.getBoundingClientRect()
  const targetRect = target.getBoundingClientRect()
  const targetTopInScreen = targetRect.top - screenRect.top + screen.scrollTop
  const nextScrollTop = Math.max(
    0,
    targetTopInScreen - visibleHeight / 2 + targetRect.height / 2,
  )

  // Avoid scrollIntoView — it can horizontally shift the two-panel track.
  screen.scrollTo({ top: nextScrollTop, behavior: 'smooth' })
}

export function MobileShell({
  input,
  issues,
  estimate,
  expertMode,
  formInstanceKey = 0,
  onChange,
  onSubmit,
  onExpertModeChange,
  onCopyShareLink,
  onNavigate,
}: Props) {
  const { t } = useI18n()
  const [screen, setScreen] = useState<MobileScreen>('input')
  const screensRef = useRef<HTMLDivElement>(null)
  const inputScreenRef = useRef<HTMLElement>(null)
  const resultScreenRef = useRef<HTMLElement>(null)
  const previousEstimate = useRef<FullEstimate | null>(null)
  const previousIssues = useRef<ValidationIssue[]>([])

  useEffect(() => {
    if (estimate && estimate !== previousEstimate.current) {
      setScreen('result')
    }
    previousEstimate.current = estimate
  }, [estimate])

  useEffect(() => {
    // Keep the slide track aligned; never use scrollIntoView here — it can
    // horizontally scroll the screens viewport and hide the active panel.
    if (screensRef.current) screensRef.current.scrollLeft = 0
    if (screen === 'result' && resultScreenRef.current) {
      resultScreenRef.current.scrollTop = 0
    }
  }, [screen, estimate])

  useEffect(() => {
    const issuesChanged = previousIssues.current !== issues
    previousIssues.current = issues
    if (!issuesChanged || issues.length === 0 || estimate) return

    const issue = firstFieldIssue(issues)
    if (!issue?.field) return

    const inputScreen = inputScreenRef.current
    if (!inputScreen) return

    const control = inputScreen.querySelector<HTMLElement>(`[data-field="${issue.field}"]`)
    if (!control) return

    setScreen('input')
    control.focus({ preventScroll: true })
    scrollFieldIntoMobileView(inputScreen, control)
  }, [issues, estimate])

  function goToInput() {
    setScreen('input')
  }

  return (
    <div className={`m-app m-app--${screen}`}>
      <header className="m-app-bar">
        <div className="m-app-bar-leading">
          <AppNav view="calculator" onNavigate={onNavigate} />
          {screen === 'result' && (
            <button
              type="button"
              className="m-back-button"
              onClick={goToInput}
              aria-label={t('mobile.back')}
            >
              <svg viewBox="0 0 20 20" aria-hidden="true" focusable="false">
                <path
                  d="M12.5 4.5 7 10l5.5 5.5"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.8"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </button>
          )}
          <h1 className="m-app-bar-title">
            {screen === 'result' ? t('mobile.resultsTitle') : t('app.title')}
          </h1>
        </div>
        <LanguageSwitcher />
      </header>

      <div className="m-screens" ref={screensRef}>
        <div className={`m-screen-track ${screen === 'result' ? 'm-screen-track--result' : ''}`}>
          <section
            ref={inputScreenRef}
            className="m-screen m-screen--input"
            aria-hidden={screen !== 'input'}
            inert={screen !== 'input' ? true : undefined}
          >
            <div className="m-intro">
              <p>{t('app.blurb')}</p>
              <p className="m-privacy-note">
                <svg
                  className="privacy-note-icon"
                  viewBox="0 0 20 20"
                  aria-hidden="true"
                  focusable="false"
                >
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
            </div>

            <CalculatorForm
              key={formInstanceKey}
              formId={MOBILE_FORM_ID}
              showInlineSubmit={false}
              value={input}
              issues={issues}
              expertMode={expertMode}
              onChange={onChange}
              onSubmit={onSubmit}
              onExpertModeChange={onExpertModeChange}
              onCopyShareLink={onCopyShareLink}
            />

            <p className="m-footer">{t('app.footer')}</p>
          </section>

          <section
            ref={resultScreenRef}
            className="m-screen m-screen--result"
            aria-hidden={screen !== 'result'}
            inert={screen !== 'result' ? true : undefined}
          >
            {estimate ? (
              <EstimateResult estimate={estimate} expertMode={expertMode} />
            ) : (
              <aside className="card placeholder">
                <h2>{t('app.placeholderTitle')}</h2>
                <p>{t('app.placeholderBody')}</p>
              </aside>
            )}
          </section>
        </div>
      </div>

      <div className="m-action-bar">
        {screen === 'input' ? (
          <button type="submit" form={MOBILE_FORM_ID} className="primary m-action-button">
            {t('form.submit')}
          </button>
        ) : (
          <button type="button" className="primary m-action-button" onClick={goToInput}>
            {t('mobile.editInputs')}
          </button>
        )}
      </div>
    </div>
  )
}
