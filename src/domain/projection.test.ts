import { describe, expect, it } from 'vitest'
import { createEmptyInput } from './estimate'
import { projectConsumption, validateCalculatorInput } from './projection'

describe('projection', () => {
  it('calculates 200 kWh in 16 days as 12.5 kWh/day', () => {
    const input = {
      ...createEmptyInput(),
      stateCode: 'YUC',
      municipality: 'Mérida',
      previousReading: 1000,
      currentReading: 1200,
      previousCutoffDate: '2026-06-30',
      currentReadingDate: '2026-07-16',
      nextCutoffDate: '2026-08-29',
      billingCycle: 'bimestral' as const,
      tariffCode: '1B' as const,
      summerStartMonth: 5 as const,
    }

    const projection = projectConsumption(input)
    expect(projection.observed.consumedKwh).toBe(200)
    expect(projection.observed.elapsedDays).toBe(16)
    expect(projection.observed.averageDailyKwh).toBe(12.5)
    expect(projection.billingDays).toBe(60)
    expect(projection.projectedKwh).toBe(750)
  })

  it('rejects inverted readings and dates', () => {
    const issues = validateCalculatorInput({
      ...createEmptyInput(),
      stateCode: 'YUC',
      municipality: 'Mérida',
      previousReading: 1200,
      currentReading: 1000,
      previousCutoffDate: '2026-07-16',
      currentReadingDate: '2026-06-30',
      nextCutoffDate: '2026-06-01',
      summerStartMonth: 5,
    })

    expect(issues.some((issue) => issue.field === 'currentReading')).toBe(true)
    expect(issues.some((issue) => issue.field === 'currentReadingDate')).toBe(true)
  })
})
