import { useEffect, useMemo, useRef, useState } from 'react'
import { CalculatorForm } from './components/CalculatorForm'
import { EstimateResult } from './components/EstimateResult'
import { getState } from './data/locations'
import { TARIFF_OPTIONS, TARIFF_SNAPSHOT_META } from './data/tariffs-2026'
import { defaultNextCutoff, isPreviousCutoffFresh, SUMMER_START_OPTIONS } from './domain/dates'
import { createEmptyInput, estimateBill } from './domain/estimate'
import type { CalculatorInput, FullEstimate, SummerStartMonth, ValidationIssue } from './domain/types'
import './App.css'

const PREFERENCES_STORAGE_KEY = 'cfe-calculator.preferences.v1'

function isTariffCode(value: unknown): value is CalculatorInput['tariffCode'] {
  return typeof value === 'string' && TARIFF_OPTIONS.some((option) => option.code === value)
}

function isSummerStartMonth(value: unknown): value is SummerStartMonth {
  return (
    typeof value === 'number' &&
    SUMMER_START_OPTIONS.some((option) => option.value === value)
  )
}

function createInputWithSavedPreferences(): CalculatorInput {
  const input = createEmptyInput()

  try {
    const stored = window.localStorage.getItem(PREFERENCES_STORAGE_KEY)
    if (!stored) return input

    const preferences = JSON.parse(stored) as Record<string, unknown>
    const state =
      typeof preferences.stateCode === 'string' ? getState(preferences.stateCode) : undefined
    const municipality =
      state && typeof preferences.municipality === 'string'
        && state.municipalities.includes(preferences.municipality)
        ? preferences.municipality
        : ''
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
      stateCode: state?.code ?? '',
      municipality,
      tariffCode,
      summerStartMonth,
      billingCycle,
      previousReading,
      previousCutoffDate,
      nextCutoffDate: previousCutoffDate
        ? defaultNextCutoff(previousCutoffDate, billingCycle)
        : input.nextCutoffDate,
    }
  } catch {
    return input
  }
}

export default function App() {
  const [input, setInput] = useState<CalculatorInput>(() => createInputWithSavedPreferences())
  const [issues, setIssues] = useState<ValidationIssue[]>([])
  const [estimate, setEstimate] = useState<FullEstimate | null>(null)
  const resultRef = useRef<HTMLElement>(null)
  const shouldScrollToResult = useRef(false)

  useEffect(() => {
    try {
      window.localStorage.setItem(
        PREFERENCES_STORAGE_KEY,
        JSON.stringify({
          stateCode: input.stateCode,
          municipality: input.municipality,
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
    input.stateCode,
    input.municipality,
    input.tariffCode,
    input.summerStartMonth,
    input.billingCycle,
    input.previousReading,
    input.previousCutoffDate,
  ])

  useEffect(() => {
    if (!shouldScrollToResult.current || !estimate) return
    shouldScrollToResult.current = false
    resultRef.current?.scrollIntoView?.({ behavior: 'smooth', block: 'start' })
  }, [estimate])

  const exampleHint = useMemo(
    () =>
      'Ejemplo: lectura 1000 el 30 de junio y 1200 el 16 de julio ⇒ 200 kWh en 16 días (12.5 kWh/día).',
    [],
  )

  function handleSubmit() {
    const result = estimateBill(input)
    setIssues(result.issues)
    setEstimate(result.estimate)
    if (result.estimate) {
      shouldScrollToResult.current = true
    }
  }

  return (
    <div className="page">
      <header className="hero">
        <p className="eyebrow">Herramienta estática · GitHub Pages</p>
        <h1>Calculadora de recibo CFE</h1>
        <p>
          Estima tu próximo recibo doméstico a partir de lecturas del medidor, tu tarifa, el punto del
          ciclo de facturación y la temporada de verano. Todo corre en tu navegador; no se envían datos
          a ningún servidor.
        </p>
        <p className="meta">
          Fotografía tarifaria vigente al <strong>{TARIFF_SNAPSHOT_META.asOf}</strong>. {exampleHint}
        </p>
      </header>

      <main className="layout">
        <CalculatorForm
          value={input}
          issues={issues}
          onChange={(next) => {
            setInput(next)
            setIssues([])
          }}
          onSubmit={handleSubmit}
        />
        {estimate ? (
          <EstimateResult ref={resultRef} estimate={estimate} />
        ) : (
          <aside className="card placeholder">
            <h2>Tu resultado aparecerá aquí</h2>
            <p>
              Completa el formulario con los datos de tu recibo y medidor. Verás el desglose por
              bloques (básico, intermedio, excedente), IVA y una explicación en lenguaje claro.
            </p>
            <ul>
              <li>Tarifas 1, 1A–1F y DAC</li>
              <li>Ciclos mensual y bimestral</li>
              <li>Reglas de verano y periodos mixtos</li>
            </ul>
          </aside>
        )}
      </main>

      <footer className="page-footer">
        <p>
          No afiliado a CFE. Estimación informativa basada en publicaciones oficiales. El aviso-recibo
          prevalece sobre esta herramienta.
        </p>
      </footer>
    </div>
  )
}
