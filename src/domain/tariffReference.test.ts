import { describe, expect, it } from 'vitest'
import { DAC_REGIONS } from '../data/tariffs'
import {
  getAvailableDacMonths,
  getDacTariffDataStatus,
  getDacRegion,
  getDacRegions,
  getDomesticTariffCodes,
  getMonthMatrix,
  getPublishedRate,
  getSeasonReference,
  getSnapshotMeta,
  getTariffDataStatus,
  normalizePublishedRate,
  resolveDefaultDacMonth,
} from './tariffReference'

describe('tariffReference helpers', () => {
  it('treats zero and missing prices as unpublished', () => {
    expect(normalizePublishedRate(0)).toBeNull()
    expect(normalizePublishedRate(-1)).toBeNull()
    expect(normalizePublishedRate(undefined)).toBeNull()
    expect(normalizePublishedRate(1.01)).toBe(1.01)
  })

  it('returns published July 2026 1B summer rates and null for unavailable high-band months', () => {
    expect(getPublishedRate('1B', 7, 'verano', 'basico', 2026)).toBe(1.01)
    expect(getPublishedRate('1B', 7, 'verano', 'intermedio', 2026)).toBe(1.171)
    expect(getPublishedRate('1C', 1, 'verano', 'intermedioAlto', 2026)).toBeNull()
    expect(getPublishedRate('1C', 7, 'verano', 'intermedioAlto', 2026)).toBe(1.505)
  })

  it('builds season block rows with cumulative allowances for the selected year', () => {
    const summer = getSeasonReference('1B', 7, 'verano', 2026)
    expect(summer.blocks.map((row) => row.key)).toEqual(['basico', 'intermedio', 'excedente'])
    expect(summer.blocks[0]?.cumulativeKwh).toBe(125)
    expect(summer.blocks[1]?.cumulativeKwh).toBe(225)
    expect(summer.blocks[2]?.cumulativeKwh).toBe(Number.POSITIVE_INFINITY)
  })

  it('exposes a 12-month matrix and snapshot metadata for the selected year', () => {
    const matrix = getMonthMatrix('1B', 'fuera', 2026)
    expect(matrix).toHaveLength(12)
    expect(matrix[0]?.rates.basico).toBeGreaterThan(0)
    expect(getDomesticTariffCodes(2026)).toEqual(['1', '1A', '1B', '1C', '1D', '1E', '1F'])
    expect(getSnapshotMeta(2026).year).toBe(2026)
    expect(getSnapshotMeta(2026).asOf).toBe('2026-08-17')
    expect(DAC_REGIONS).toHaveLength(6)
  })

  it('resolves published DAC months and falls back to the latest month when needed', () => {
    expect(getAvailableDacMonths(2026)).toEqual([1, 2, 3, 4, 5, 6, 7, 8])
    expect(resolveDefaultDacMonth(2026)).toBe(8)
    expect(getDacRegion('central', 2026, 1)?.energySummer).toBe(6.653)
    expect(getDacRegion('central', 2026, 7)?.energySummer).toBe(6.713)
    expect(getDacRegion('central', 2026, 8)?.energySummer).toBe(6.63)
    expect(getDacRegion('baja-california', 2026, 8)?.energyNonSummer).toBe(5.536)
    // Unpublished month (September) falls back to August.
    expect(getDacRegions(2026, 9)).toEqual(getDacRegions(2026, 8))
    expect(getDacRegions(2026)).toEqual(DAC_REGIONS)
  })

  it('derives overall last-check date and registered coverage range', () => {
    expect(getTariffDataStatus([2026])).toEqual({
      lastCheckedAsOf: '2026-08-17',
      rangeStartISO: '2026-01-01',
      rangeEndISO: '2026-12-31',
    })
  })

  it('derives the coverage range from published DAC months', () => {
    expect(getDacTariffDataStatus([2026])).toEqual({
      lastCheckedAsOf: '2026-08-17',
      rangeStartISO: '2026-01-01',
      rangeEndISO: '2026-08-31',
    })
  })
})
