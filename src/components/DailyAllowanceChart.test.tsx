import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it } from 'vitest'
import {
  buildDailyAllowanceComparison,
  buildDailyAllowanceProfile,
} from '../domain/billing'
import { createEmptyInput } from '../domain/estimate'
import type { DailyAllowanceComparison } from '../domain/types'
import { LanguageProvider } from '../i18n'
import { DailyAllowanceChart } from './DailyAllowanceChart'

const DISPLAY_SCALE_STORAGE_KEY = 'cfe-calculator.allowanceScale.v1'

function makeComparison(): DailyAllowanceComparison {
  const profile = buildDailyAllowanceProfile('1B', 'verano', 2, 60, 7, 2026, 'en')
  return {
    applicable: true,
    mode: 'verano',
    averageDailyKwh: 12.5,
    billingDays: 60,
    profiles: [profile],
    mixedPeriod: null,
    guidance: 'stub guidance',
    dacLimitKwhMonth: 400,
    currentPaceAboveDacLimit: false,
  }
}

function makeMixtoComparison(language: 'en' | 'es' = 'en'): DailyAllowanceComparison {
  const input = {
    ...createEmptyInput(),
    tariffCode: '1B' as const,
    summerStartMonth: 5 as const,
    billingCycle: 'bimestral' as const,
    previousCutoffDate: '2026-04-15',
    nextCutoffDate: '2026-06-14',
  }
  return buildDailyAllowanceComparison(input, 12.5, 60, 'mixto', 5, 2026, language)
}

function renderChart(
  billingCycle: 'mensual' | 'bimestral' = 'bimestral',
  comparison: DailyAllowanceComparison = makeComparison(),
  language: 'en' | 'es' = 'en',
) {
  return render(
    <LanguageProvider initialLanguage={language}>
      <DailyAllowanceChart
        comparison={comparison}
        tariffCode="1B"
        billingCycle={billingCycle}
      />
    </LanguageProvider>,
  )
}

describe('DailyAllowanceChart display scale preference', () => {
  beforeEach(() => {
    window.localStorage.clear()
  })

  it('defaults to Daily when nothing is stored', () => {
    renderChart()

    expect(screen.getByRole('tab', { name: 'Daily' })).toHaveAttribute('aria-selected', 'true')
    expect(window.localStorage.getItem(DISPLAY_SCALE_STORAGE_KEY)).toBe('daily')
  })

  it('restores a stored Monthly preference', () => {
    window.localStorage.setItem(DISPLAY_SCALE_STORAGE_KEY, 'monthly')
    renderChart()

    expect(screen.getByRole('tab', { name: 'Monthly' })).toHaveAttribute('aria-selected', 'true')
  })

  it('persists the selected scale when the user changes it', async () => {
    const user = userEvent.setup()
    renderChart()

    await user.click(screen.getByRole('tab', { name: 'Bimonthly' }))

    expect(screen.getByRole('tab', { name: 'Bimonthly' })).toHaveAttribute(
      'aria-selected',
      'true',
    )
    expect(window.localStorage.getItem(DISPLAY_SCALE_STORAGE_KEY)).toBe('bimonthly')
  })

  it('downgrades a stored Bimonthly preference when billing is monthly', () => {
    window.localStorage.setItem(DISPLAY_SCALE_STORAGE_KEY, 'bimonthly')
    renderChart('mensual')

    expect(screen.getByRole('tab', { name: 'Monthly' })).toHaveAttribute('aria-selected', 'true')
    expect(screen.queryByRole('tab', { name: 'Bimonthly' })).not.toBeInTheDocument()
    expect(window.localStorage.getItem(DISPLAY_SCALE_STORAGE_KEY)).toBe('monthly')
  })
})

describe('DailyAllowanceChart mixed period', () => {
  beforeEach(() => {
    window.localStorage.clear()
  })

  it('renders a 50/50 summer and standard allowance chart', () => {
    renderChart('bimestral', makeMixtoComparison(), 'en')

    expect(screen.getByRole('heading', { name: 'Mixed-period split' })).toBeInTheDocument()
    expect(screen.getByText(/\(1 May–14 Jun 2026\)/i)).toBeInTheDocument()
    expect(screen.getByText(/\(16 Apr–30 Apr 2026\)/i)).toBeInTheDocument()
    expect(screen.getByText(/45 days: 562\.5 kWh/i)).toBeInTheDocument()
    expect(screen.getByText(/15 days: 187\.5 kWh/i)).toBeInTheDocument()
    expect(document.querySelectorAll('.allowance-mixed-breakdown-usage')).toHaveLength(2)
    expect(document.querySelectorAll('.allowance-mixed-column-range')).toHaveLength(2)
    expect(
      screen.getByRole('heading', { name: 'Mixed period (summer and standard)' }),
    ).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'Summer' })).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'Standard' })).toBeInTheDocument()
    expect(document.querySelectorAll('.allowance-chart--mixed')).toHaveLength(1)
    expect(document.querySelectorAll('.allowance-mixed-column')).toHaveLength(2)
    expect(document.querySelectorAll('.allowance-mixed-body')).toHaveLength(2)
    expect(document.querySelectorAll('.allowance-mixed-bar-stage')).toHaveLength(2)
    expect(document.querySelectorAll('.allowance-mixed-details')).toHaveLength(2)
    expect(document.querySelectorAll('.allowance-mixed-detail').length).toBeGreaterThanOrEqual(4)

    const firstColumnLabels = [
      ...document.querySelectorAll(
        '.allowance-mixed-column:first-child .allowance-mixed-detail-label',
      ),
    ].map((node) => node.textContent)
    expect(firstColumnLabels[0]).toMatch(/Excess/i)
    expect(firstColumnLabels.at(-1)).toMatch(/Basic/i)

    const chart = screen.getByRole('img', { name: /Mixed period\. Summer/i })
    expect(chart.getAttribute('aria-label')).toMatch(/Summer \(/i)
    expect(chart.getAttribute('aria-label')).toMatch(/Standard \(/i)
  })

  it('plots summer and standard bars on the same monthly kWh scale', () => {
    renderChart('bimestral', makeMixtoComparison(), 'en')

    const columns = document.querySelectorAll('.allowance-mixed-column')
    expect(columns).toHaveLength(2)
    const summerBasic = columns[0]!.querySelector('.allowance-vbar-zone')
    const standardBasic = columns[1]!.querySelector('.allowance-vbar-zone')
    expect(summerBasic).not.toBeNull()
    expect(standardBasic).not.toBeNull()

    const flexGrow = (element: Element) => Number.parseFloat(String((element as HTMLElement).style.flex))
    // 1B official monthly Basic: 125 summer vs 75 standard.
    expect(flexGrow(summerBasic!) / flexGrow(standardBasic!)).toBeCloseTo(125 / 75, 5)

    const dacMarkers = document.querySelectorAll('.allowance-marker--dac.allowance-marker--mixed')
    expect(dacMarkers).toHaveLength(2)
    expect((dacMarkers[0] as HTMLElement).style.bottom).toBe(
      (dacMarkers[1] as HTMLElement).style.bottom,
    )

    const usageMarkers = document.querySelectorAll('.allowance-marker--avg.allowance-marker--mixed')
    expect(usageMarkers).toHaveLength(2)
    expect((usageMarkers[0] as HTMLElement).style.bottom).toBe(
      (usageMarkers[1] as HTMLElement).style.bottom,
    )
  })

  it('keeps the mixed split visible when the display scale changes', async () => {
    const user = userEvent.setup()
    renderChart('bimestral', makeMixtoComparison('es'), 'es')

    expect(screen.getByText(/45 días: 562\.5 kWh/i)).toBeInTheDocument()
    expect(screen.getByText(/15 días: 187\.5 kWh/i)).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'Verano' })).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'Estándar' })).toBeInTheDocument()
    await user.click(screen.getByRole('tab', { name: 'Bimestral' }))
    expect(screen.getByText(/45 días: 562\.5 kWh/i)).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'Verano' })).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'Estándar' })).toBeInTheDocument()
    expect(document.querySelectorAll('.allowance-mixed-detail').length).toBeGreaterThanOrEqual(4)
    expect(screen.getByRole('tab', { name: 'Bimestral' })).toHaveAttribute('aria-selected', 'true')
  })
})
