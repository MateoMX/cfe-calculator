import { describe, expect, it } from 'vitest'
import { DOMESTIC_TARIFFS, TARIFF_SNAPSHOT_META } from './tariffs-2026'

describe('tariff snapshot integrity', () => {
  it('has metadata and all domestic tariffs', () => {
    expect(TARIFF_SNAPSHOT_META.asOf).toBe('2026-07-16')
    expect(Object.keys(DOMESTIC_TARIFFS)).toEqual(['1', '1A', '1B', '1C', '1D', '1E', '1F'])
  })

  it('matches verified July 2026 1B summer prices from CFE portal', () => {
    const julySummer = DOMESTIC_TARIFFS['1B'].monthlyRates.find(
      (rate) => rate.month === 7 && rate.season === 'verano',
    )
    expect(julySummer?.prices.basico).toBe(1.01)
    expect(julySummer?.prices.intermedio).toBe(1.171)
    expect(julySummer?.prices.excedente).toBe(4.016)
  })

  it('keeps official monthly block allowances', () => {
    expect(DOMESTIC_TARIFFS['1B'].blocksBySeason.verano.map((b) => b.allowanceKwh)).toEqual([
      125,
      100,
      Number.POSITIVE_INFINITY,
    ])
    expect(DOMESTIC_TARIFFS['1F'].blocksBySeason.verano.map((b) => b.allowanceKwh)).toEqual([
      300,
      900,
      1300,
      Number.POSITIVE_INFINITY,
    ])
    expect(DOMESTIC_TARIFFS['1'].dacLimitKwhMonth).toBe(250)
    expect(DOMESTIC_TARIFFS['1B'].dacLimitKwhMonth).toBe(400)
    expect(DOMESTIC_TARIFFS['1F'].dacLimitKwhMonth).toBe(2500)
  })
})
