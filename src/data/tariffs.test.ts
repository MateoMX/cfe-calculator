import { describe, expect, it } from 'vitest'
import { normalizePublishedRate } from '../domain/tariffReference'
import type { BlockKey, Season } from '../domain/types'
import {
  DAC_REGIONS,
  DOMESTIC_TARIFFS,
  TARIFF_SNAPSHOT_META,
  getAvailableTariffYears,
  getTariffSnapshot,
  resolveDefaultTariffYear,
} from './tariffs'
import { DAC_MONTHLY_SCHEDULES } from './tariffs-2026'

const DOMESTIC_CODES = ['1', '1A', '1B', '1C', '1D', '1E', '1F'] as const
const SEASONS: Season[] = ['verano', 'fuera']
const MONTHS = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12] as const

describe('tariff snapshot registry', () => {
  it('registers available years newest-first and exposes the 2026 snapshot', () => {
    expect(getAvailableTariffYears()).toEqual([2026])
    expect(getTariffSnapshot(2026)?.meta.year).toBe(2026)
    expect(getTariffSnapshot(2027)).toBeUndefined()
    expect(TARIFF_SNAPSHOT_META.year).toBe(2026)
  })

  it('defaults to the current calendar year when registered, even if a future year exists', () => {
    expect(resolveDefaultTariffYear([2027, 2026], new Date('2026-07-17T12:00:00Z'))).toBe(2026)
    expect(resolveDefaultTariffYear([2027, 2026], new Date('2027-02-01T12:00:00Z'))).toBe(2027)
  })

  it('falls back to the newest published snapshot when the current year is missing', () => {
    expect(resolveDefaultTariffYear([2026, 2025], new Date('2027-01-15T12:00:00Z'))).toBe(2026)
    expect(resolveDefaultTariffYear([2025], new Date('2026-07-17T12:00:00Z'))).toBe(2025)
  })
})

describe('tariff snapshot integrity', () => {
  it('has metadata, official links, and all domestic tariffs', () => {
    expect(TARIFF_SNAPSHOT_META.asOf).toBe('2026-08-17')
    expect(TARIFF_SNAPSHOT_META.year).toBe(2026)
    expect(TARIFF_SNAPSHOT_META.sourceUrl).toMatch(/^https:\/\//)
    expect(TARIFF_SNAPSHOT_META.agreementsUrl).toMatch(/^https:\/\//)
    expect(TARIFF_SNAPSHOT_META.dacUrl).toMatch(/TarifaDAC/i)
    expect(TARIFF_SNAPSHOT_META.manualUrl).toMatch(/\.pdf$/i)
    expect(Object.keys(DOMESTIC_TARIFFS)).toEqual([...DOMESTIC_CODES])
  })

  it('matches CFE portal August 2026 prices for every domestic tariff', () => {
    const august = {
      '1': { season: 'fuera' as const, prices: { basico: 1.132, intermedio: 1.377, excedente: 4.028 } },
      '1A': { season: 'verano' as const, prices: { basico: 1.013, intermedio: 1.175, excedente: 4.028 } },
      '1B': { season: 'verano' as const, prices: { basico: 1.013, intermedio: 1.175, excedente: 4.028 } },
      '1C': {
        season: 'verano' as const,
        prices: { basico: 1.013, intermedioBajo: 1.175, intermedioAlto: 1.51, excedente: 4.028 },
      },
      '1D': {
        season: 'verano' as const,
        prices: { basico: 1.013, intermedioBajo: 1.175, intermedioAlto: 1.51, excedente: 4.028 },
      },
      '1E': {
        season: 'verano' as const,
        prices: { basico: 0.848, intermedioBajo: 1.048, intermedioAlto: 1.36, excedente: 4.028 },
      },
      '1F': {
        season: 'verano' as const,
        prices: { basico: 0.848, intermedioBajo: 1.048, intermedioAlto: 2.55, excedente: 4.028 },
      },
    }

    for (const code of DOMESTIC_CODES) {
      const expected = august[code]
      const row = DOMESTIC_TARIFFS[code].monthlyRates.find(
        (rate) => rate.month === 8 && rate.season === expected.season,
      )
      expect(row?.prices, code).toMatchObject(expected.prices)
    }
  })

  it('includes Feb–Apr summer prices that CFE only shows when that month is the summer start', () => {
    expect(
      DOMESTIC_TARIFFS['1A'].monthlyRates.find((rate) => rate.month === 2 && rate.season === 'verano')
        ?.prices,
    ).toMatchObject({ basico: 0.995, intermedio: 1.151, excedente: 3.956 })
    expect(
      DOMESTIC_TARIFFS['1B'].monthlyRates.find((rate) => rate.month === 4 && rate.season === 'verano')
        ?.prices,
    ).toMatchObject({ basico: 1.001, intermedio: 1.159, excedente: 3.98 })
    expect(
      DOMESTIC_TARIFFS['1C'].monthlyRates.find((rate) => rate.month === 3 && rate.season === 'verano')
        ?.prices,
    ).toMatchObject({
      basico: 0.998,
      intermedioBajo: 1.155,
      intermedioAlto: 1.485,
      excedente: 3.968,
    })
    expect(
      DOMESTIC_TARIFFS['1E'].monthlyRates.find((rate) => rate.month === 2 && rate.season === 'verano')
        ?.prices,
    ).toMatchObject({
      basico: 0.83,
      intermedioBajo: 1.03,
      intermedioAlto: 1.336,
      excedente: 3.956,
    })
    expect(
      DOMESTIC_TARIFFS['1F'].monthlyRates.find((rate) => rate.month === 3 && rate.season === 'verano')
        ?.prices,
    ).toMatchObject({
      basico: 0.833,
      intermedioBajo: 1.033,
      intermedioAlto: 2.51,
      excedente: 3.968,
    })
  })

  it('keeps official monthly block allowances and DAC thresholds for every tariff', () => {
    const expectedLimits = {
      '1': 250,
      '1A': 300,
      '1B': 400,
      '1C': 850,
      '1D': 1000,
      '1E': 2000,
      '1F': 2500,
    } as const

    for (const code of DOMESTIC_CODES) {
      expect(DOMESTIC_TARIFFS[code].dacLimitKwhMonth).toBe(expectedLimits[code])
      for (const season of SEASONS) {
        const blocks = DOMESTIC_TARIFFS[code].blocksBySeason[season]
        expect(blocks.length).toBeGreaterThan(0)
        expect(blocks.at(-1)?.key).toBe('excedente')
        expect(blocks.at(-1)?.allowanceKwh).toBe(Number.POSITIVE_INFINITY)
      }
    }

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
  })

  it('stores usable season×month rates and never treats unpublished zeros as real prices', () => {
    for (const code of DOMESTIC_CODES) {
      const tariff = DOMESTIC_TARIFFS[code]
      for (const season of SEASONS) {
        const blockKeys = tariff.blocksBySeason[season].map((block) => block.key)
        for (const month of MONTHS) {
          const row =
            tariff.monthlyRates.find((rate) => rate.month === month && rate.season === season) ??
            (code === '1'
              ? tariff.monthlyRates.find((rate) => rate.month === month)
              : undefined)
          expect(row, `${code} ${season} ${month}`).toBeTruthy()
          for (const key of blockKeys) {
            const price = row?.prices[key as BlockKey]
            if (price == null) continue
            if (price <= 0) {
              expect(normalizePublishedRate(price)).toBeNull()
            } else {
              expect(price).toBeGreaterThan(0)
            }
          }
        }
      }
    }
  })

  it('includes official monthly DAC schedules and exposes August as the latest published rates', () => {
    expect(DAC_MONTHLY_SCHEDULES.map((schedule) => schedule.month)).toEqual([
      1, 2, 3, 4, 5, 6, 7, 8,
    ])
    expect(getTariffSnapshot(2026)?.dacMonthlySchedules).toHaveLength(8)

    const january = DAC_MONTHLY_SCHEDULES.find((schedule) => schedule.month === 1)
    const may = DAC_MONTHLY_SCHEDULES.find((schedule) => schedule.month === 5)
    const july = DAC_MONTHLY_SCHEDULES.find((schedule) => schedule.month === 7)
    const august = DAC_MONTHLY_SCHEDULES.find((schedule) => schedule.month === 8)

    expect(january?.regions.find((region) => region.regionId === 'central')).toMatchObject({
      fixedCharge: 142.41,
      energySummer: 6.653,
      energyNonSummer: null,
    })
    expect(may?.regions.find((region) => region.regionId === 'central')).toMatchObject({
      fixedCharge: 145.24,
      energySummer: 6.842,
    })
    expect(july?.regions.find((region) => region.regionId === 'central')).toMatchObject({
      fixedCharge: 144.95,
      energySummer: 6.713,
    })
    expect(august?.regions.find((region) => region.regionId === 'central')).toMatchObject({
      fixedCharge: 145.04,
      energySummer: 6.63,
    })

    expect(DAC_REGIONS).toEqual(august?.regions)
    expect(DAC_REGIONS).toHaveLength(6)
    expect(new Set(DAC_REGIONS.map((region) => region.regionId)).size).toBe(6)
    expect(DAC_REGIONS.find((region) => region.regionId === 'baja-california')?.energyNonSummer).toBe(
      5.536,
    )
    expect(
      DAC_REGIONS.find((region) => region.regionId === 'baja-california-sur')?.energyNonSummer,
    ).toBe(5.536)
    expect(DAC_REGIONS.find((region) => region.regionId === 'central')?.energyNonSummer).toBeNull()
  })
})
