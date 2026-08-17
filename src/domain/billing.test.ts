import { describe, expect, it } from 'vitest'
import {
  allocateDomesticBlocks,
  assessDacRisk,
  averageMonthlyFromHistory,
  buildDailyAllowanceComparison,
  buildDailyAllowanceProfile,
  estimateDomesticBill,
  formatAllowanceGuidance,
  projectedNextMonthlyAverage,
  resolveSeasonMode,
  scaleDailyUsageKwh,
  scaleMonthlyAllowanceKwh,
  scalePeriodAllowanceKwh,
  splitPeriodKwhBySeasonDays,
} from './billing'
import { createEmptyInput, estimateBill, resizeHistoryForCycle } from './estimate'

describe('domestic block allocation', () => {
  it('splits 1B summer bimestral 750 kWh into 250 + 200 + 300', () => {
    const blocks = allocateDomesticBlocks('1B', 'verano', 750, 2)
    expect(blocks).toEqual([
      { key: 'basico', label: 'Básico', kwh: 250 },
      { key: 'intermedio', label: 'Intermedio', kwh: 200 },
      { key: 'excedente', label: 'Excedente', kwh: 300 },
    ])
  })

  it('uses 1C summer intermediate low/high blocks', () => {
    const blocks = allocateDomesticBlocks('1C', 'verano', 500, 1)
    expect(blocks.map((block) => [block.key, block.kwh])).toEqual([
      ['basico', 150],
      ['intermedioBajo', 150],
      ['intermedioAlto', 150],
      ['excedente', 50],
    ])
  })
})

describe('season mode thresholds', () => {
  it('treats bimestral <=15 summer days as fuera', () => {
    expect(resolveSeasonMode('bimestral', 15, 5).mode).toBe('fuera')
  })

  it('treats bimestral 16-30 summer days as mixto', () => {
    expect(resolveSeasonMode('bimestral', 16, 5).mode).toBe('mixto')
    expect(resolveSeasonMode('bimestral', 30, 5).mode).toBe('mixto')
  })

  it('treats bimestral 31-45 summer days as mixto', () => {
    expect(resolveSeasonMode('bimestral', 31, 5).mode).toBe('mixto')
    expect(resolveSeasonMode('bimestral', 45, 5).mode).toBe('mixto')
  })

  it('treats bimestral >45 summer days as verano', () => {
    expect(resolveSeasonMode('bimestral', 46, 5).mode).toBe('verano')
  })

  it('treats mensual >15 summer days as verano', () => {
    expect(resolveSeasonMode('mensual', 16, 5).mode).toBe('verano')
    expect(resolveSeasonMode('mensual', 15, 5).mode).toBe('fuera')
  })

  it('classifies summer exit by non-summer days', () => {
    expect(resolveSeasonMode('mensual', 11, 4, 30, true).mode).toBe('fuera')
    expect(resolveSeasonMode('bimestral', 46, 4, 60, true).mode).toBe('verano')
    expect(resolveSeasonMode('bimestral', 41, 4, 60, true)).toMatchObject({
      mode: 'mixto',
      firstSeason: 'verano',
      secondSeason: 'fuera',
      transitionDays: 19,
    })
  })
})

describe('bill estimate', () => {
  it('prices the 1B 750 kWh summer bimestral example with July rates and IVA', () => {
    const input = {
      ...createEmptyInput(),
      tariffCode: '1B' as const,
      summerStartMonth: 5 as const,
      billingCycle: 'bimestral' as const,
      previousReading: 1000,
      currentReading: 1200,
      previousCutoffDate: '2026-06-30',
      currentReadingDate: '2026-07-16',
      nextCutoffDate: '2026-08-29',
    }

    const { estimate, issues } = estimateBill(input)
    expect(issues).toHaveLength(0)
    expect(estimate).not.toBeNull()
    expect(estimate!.bill.billedKwh).toBe(750)
    expect(estimate!.bill.seasonMode).toBe('verano')

    // 30 days before 2026-08-29 => 2026-07-30 => July rates
    const basico = estimate!.bill.lines.find((line) => line.key === 'basico')
    const intermedio = estimate!.bill.lines.find((line) => line.key === 'intermedio')
    const excedente = estimate!.bill.lines.find((line) => line.key === 'excedente')

    expect(basico).toMatchObject({ kwh: 250, rate: 1.01 })
    expect(intermedio).toMatchObject({ kwh: 200, rate: 1.171 })
    expect(excedente).toMatchObject({ kwh: 300, rate: 4.016 })

    const energy = 250 * 1.01 + 200 * 1.171 + 300 * 4.016
    expect(estimate!.bill.energySubtotal).toBeCloseTo(Math.round(energy * 100) / 100, 2)
    expect(estimate!.bill.iva).toBeCloseTo(
      Math.round(estimate!.bill.energySubtotal * 0.16 * 100) / 100,
      2,
    )
    expect(estimate!.bill.total).toBeCloseTo(
      Math.round((estimate!.bill.energySubtotal + estimate!.bill.iva) * 100) / 100,
      2,
    )
  })

  it('applies monthly minimum of 25 kWh', () => {
    const input = {
      ...createEmptyInput(),
      tariffCode: '1' as const,
      summerStartMonth: null,
      billingCycle: 'mensual' as const,
      previousReading: 100,
      currentReading: 105,
      previousCutoffDate: '2026-06-01',
      currentReadingDate: '2026-06-10',
      nextCutoffDate: '2026-07-01',
    }

    const bill = estimateDomesticBill(input, (5 / 9) * 30)
    expect(bill.minimumApplied).toBe(true)
    expect(bill.billedKwh).toBe(25)
  })

  it('applies bimestral minimum of 50 kWh', () => {
    const input = {
      ...createEmptyInput(),
      tariffCode: '1' as const,
      summerStartMonth: null,
      billingCycle: 'bimestral' as const,
      previousReading: 100,
      currentReading: 110,
      previousCutoffDate: '2026-06-01',
      currentReadingDate: '2026-06-10',
      nextCutoffDate: '2026-07-31',
    }

    const bill = estimateDomesticBill(input, 20)
    expect(bill.minimumApplied).toBe(true)
    expect(bill.billedKwh).toBe(50)
  })

  it('uses day-weighted September summer and October non-summer rates for an October 20 mixed exit bill', () => {
    const input = {
      ...createEmptyInput(),
      tariffCode: '1B' as const,
      summerStartMonth: 4 as const,
      billingCycle: 'bimestral' as const,
      previousCutoffDate: '2026-08-21',
      nextCutoffDate: '2026-10-20',
    }

    const bill = estimateDomesticBill(input, 300)

    expect(bill.seasonMode).toBe('mixto')
    // 40 summer days / 20 non-summer → 200 / 100 kWh, each billed with a full month of cupos.
    expect(bill.lines).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          key: 'basico',
          label: 'Tarifa 1B Básico (verano)',
          kwh: 125,
          rate: 1.016,
        }),
        expect.objectContaining({
          key: 'intermedio',
          label: 'Tarifa 1B Intermedio (verano)',
          kwh: 75,
          rate: 1.179,
        }),
        expect.objectContaining({
          key: 'basico',
          label: 'Tarifa 1B Básico (estándar)',
          kwh: 75,
          rate: 1.14,
        }),
        expect.objectContaining({
          key: 'intermedio',
          label: 'Tarifa 1B Intermedio (estándar)',
          kwh: 25,
          rate: 1.385,
        }),
      ]),
    )
    expect(bill.lines.reduce((sum, line) => sum + line.kwh, 0)).toBeCloseTo(300, 3)
    expect(bill.assumptions).toEqual(
      expect.arrayContaining([
        expect.stringMatching(/40 días de verano y 20 fuera de verano/i),
        expect.stringMatching(/200 kWh en verano y 100 kWh fuera/i),
        expect.stringMatching(
          /Primera fracción: verano \(40 días\) con cuotas de septiembre; segunda fracción: fuera de verano \(20 días\) con cuotas de octubre/i,
        ),
      ]),
    )
  })

  it('fills official monthly subsidized blocks before mixto excess', () => {
    const input = {
      ...createEmptyInput(),
      tariffCode: '1B' as const,
      summerStartMonth: 4 as const,
      billingCycle: 'bimestral' as const,
      previousCutoffDate: '2026-08-21',
      nextCutoffDate: '2026-10-20',
    }

    // 360 kWh → 240 summer / 120 standard; summer overflows the 225 monthly cupo.
    const bill = estimateDomesticBill(input, 360)
    expect(bill.lines).toEqual([
      expect.objectContaining({
        key: 'basico',
        label: 'Tarifa 1B Básico (verano)',
        kwh: 125,
      }),
      expect.objectContaining({
        key: 'intermedio',
        label: 'Tarifa 1B Intermedio (verano)',
        kwh: 100,
      }),
      expect.objectContaining({
        key: 'excedente',
        label: 'Tarifa 1B Excedente (verano)',
        kwh: 15,
      }),
      expect.objectContaining({
        key: 'basico',
        label: 'Tarifa 1B Básico (estándar)',
        kwh: 75,
      }),
      expect.objectContaining({
        key: 'intermedio',
        label: 'Tarifa 1B Intermedio (estándar)',
        kwh: 45,
      }),
    ])
  })

  it('splits mixto excess across summer and standard when rates differ', () => {
    const input = {
      ...createEmptyInput(),
      tariffCode: '1B' as const,
      summerStartMonth: 4 as const,
      billingCycle: 'bimestral' as const,
      previousCutoffDate: '2026-08-21',
      nextCutoffDate: '2026-10-20',
    }

    // 600 kWh → 400 summer / 200 standard; both seasons hit excess at Sep vs Oct rates.
    const bill = estimateDomesticBill(input, 600)
    const excess = bill.lines.filter((line) => line.key === 'excedente')

    expect(excess).toEqual([
      expect.objectContaining({
        label: 'Tarifa 1B Excedente (verano)',
        kwh: 175,
        rate: 4.041,
      }),
      expect.objectContaining({
        label: 'Tarifa 1B Excedente (estándar)',
        kwh: 25,
        rate: 4.054,
      }),
    ])
  })

  it('fills 1B monthly Basic and Intermediate before Excess on a Sep–Oct mixed exit bill', () => {
    const input = {
      ...createEmptyInput(),
      tariffCode: '1B' as const,
      summerStartMonth: 4 as const,
      billingCycle: 'bimestral' as const,
      previousReading: 1000,
      currentReading: 1150,
      previousCutoffDate: '2026-09-01',
      currentReadingDate: '2026-09-15',
      nextCutoffDate: '2026-10-31',
    }

    const { estimate, issues } = estimateBill(input)
    expect(issues).toHaveLength(0)
    const bill = estimate!.bill
    expect(bill.seasonMode).toBe('mixto')
    expect(bill.billedKwh).toBe(643)
    expect(bill.lines.map((line) => [line.label, line.kwh])).toEqual([
      ['Tarifa 1B Básico (verano)', 125],
      ['Tarifa 1B Intermedio (verano)', 100],
      ['Tarifa 1B Excedente (verano)', 85.783],
      ['Tarifa 1B Básico (estándar)', 75],
      ['Tarifa 1B Intermedio (estándar)', 100],
      ['Tarifa 1B Excedente (estándar)', 157.217],
    ])
    expect(bill.lines.reduce((sum, line) => sum + line.kwh, 0)).toBeCloseTo(643, 3)
  })

  it('uses October non-summer rates for a monthly October 20 exit bill', () => {
    const input = {
      ...createEmptyInput(),
      tariffCode: '1B' as const,
      summerStartMonth: 4 as const,
      billingCycle: 'mensual' as const,
      previousCutoffDate: '2026-09-20',
      nextCutoffDate: '2026-10-20',
    }

    const bill = estimateDomesticBill(input, 100)

    expect(bill.seasonMode).toBe('fuera')
    expect(bill.rateMonth).toBe(10)
    expect(bill.lines[0]).toMatchObject({ key: 'basico', kwh: 75, rate: 1.14 })
  })
})

describe('allowance period scaling', () => {
  it('keeps official monthly cupos exact and derives daily / bimonthly without round-trip error', () => {
    expect(scaleMonthlyAllowanceKwh(100, 'monthly')).toBe(100)
    expect(scaleMonthlyAllowanceKwh(100, 'bimonthly')).toBe(200)
    expect(scaleMonthlyAllowanceKwh(100, 'daily')).toBeCloseTo(100 / 30, 10)

    expect(scaleMonthlyAllowanceKwh(400, 'monthly')).toBe(400)
    expect(scaleMonthlyAllowanceKwh(400, 'bimonthly')).toBe(800)
    expect(scaleMonthlyAllowanceKwh(400, 'daily')).toBeCloseTo(400 / 30, 10)

    // Observed usage stays daily-native.
    expect(scaleDailyUsageKwh(12.5, 'daily')).toBe(12.5)
    expect(scaleDailyUsageKwh(12.5, 'monthly')).toBe(375)
    expect(scaleDailyUsageKwh(12.5, 'bimonthly')).toBe(750)
  })

  it('scales mixto period totals against the actual period length', () => {
    expect(scalePeriodAllowanceKwh(600, 60, 'daily')).toBe(10)
    expect(scalePeriodAllowanceKwh(600, 60, 'monthly')).toBe(300)
    expect(scalePeriodAllowanceKwh(600, 60, 'bimonthly')).toBe(600)
  })

  it('splits period kWh by summer day share and conserves the total', () => {
    const split = splitPeriodKwhBySeasonDays(300, 41, 60)
    expect(split).toEqual({
      summerKwh: 205,
      nonSummerKwh: 95,
      nonSummerDays: 19,
    })
    expect(split.summerKwh + split.nonSummerKwh).toBe(300)
  })
})

describe('daily allowance comparison', () => {
  it('stores 1B summer blocks as official monthly cumulative thresholds', () => {
    const profile = buildDailyAllowanceProfile('1B', 'verano', 2, 60, 7, 2026)
    expect(profile.bands.map((band) => [band.key, band.bandMonthlyKwh, band.cumulativeMonthlyKwh])).toEqual([
      ['basico', 125, 125],
      ['intermedio', 100, 225],
    ])
    expect(profile.subsidizedCeilingMonthlyKwh).toBe(225)
    expect(profile.bands[0]!.ratePerKwh).toBe(1.01)
    expect(profile.bands[1]!.ratePerKwh).toBe(1.171)
    expect(profile.excedenteRatePerKwh).toBe(4.016)
  })

  it('uses smaller 1B non-summer monthly ceilings', () => {
    const profile = buildDailyAllowanceProfile('1B', 'fuera', 2, 60, 7, 2026)
    expect(profile.bands.map((band) => [band.key, band.cumulativeMonthlyKwh])).toEqual([
      ['basico', 75],
      ['intermedio', 175],
    ])
  })

  it('builds separate summer and standard profiles for mixto periods', () => {
    const input = {
      ...createEmptyInput(),
      tariffCode: '1B' as const,
      summerStartMonth: 5 as const,
      billingCycle: 'bimestral' as const,
      previousCutoffDate: '2026-04-15',
      nextCutoffDate: '2026-06-14',
    }
    const comparison = buildDailyAllowanceComparison(input, 12.5, 60, 'mixto', 5, 2026)
    expect(comparison.applicable).toBe(true)
    expect(comparison.mode).toBe('mixto')
    expect(comparison.profiles).toHaveLength(2)
    expect(comparison.profiles.map((profile) => profile.season)).toEqual(['verano', 'fuera'])
    // 45 summer / 15 non-summer days → 562.5 / 187.5 kWh at 12.5 kWh/day over 60 days.
    expect(comparison.mixedPeriod).toEqual({
      periodDays: 60,
      summerDays: 45,
      nonSummerDays: 15,
      summerKwh: 562.5,
      nonSummerKwh: 187.5,
      summerRange: { startISO: '2026-05-01', endISO: '2026-06-14' },
      nonSummerRange: { startISO: '2026-04-16', endISO: '2026-04-30' },
    })

    const summer = comparison.profiles[0]!
    const standard = comparison.profiles[1]!
    // Day-prorated cupos: summer 125·45/30 + 100·45/30; standard 75·15/30 + 100·15/30.
    expect(summer.bands.map((band) => [band.key, band.bandMonthlyKwh, band.usedKwh])).toEqual([
      ['basico', 187.5, 187.5],
      ['intermedio', 150, 150],
    ])
    expect(summer.subsidizedCeilingMonthlyKwh).toBe(337.5)
    expect(summer.excessUsedKwh).toBe(225)
    expect(summer.bands.every((band) => band.ratePerKwh != null)).toBe(true)

    expect(standard.bands.map((band) => [band.key, band.bandMonthlyKwh, band.usedKwh])).toEqual([
      ['basico', 37.5, 37.5],
      ['intermedio', 50, 50],
    ])
    expect(standard.subsidizedCeilingMonthlyKwh).toBe(87.5)
    expect(standard.excessUsedKwh).toBe(100)
    expect(standard.bands.every((band) => band.ratePerKwh != null)).toBe(true)

    const totalUsed =
      summer.bands.reduce((sum, band) => sum + (band.usedKwh ?? 0), 0) +
      (summer.excessUsedKwh ?? 0) +
      standard.bands.reduce((sum, band) => sum + (band.usedKwh ?? 0), 0) +
      (standard.excessUsedKwh ?? 0)
    expect(totalUsed).toBeCloseTo(750, 6)

    expect(comparison.guidance).toMatch(/45 días de verano \(562\.5 kWh\)/i)
    expect(comparison.guidance).toMatch(/15 fuera de verano \(187\.5 kWh\)/i)
    expect(comparison.guidance).toMatch(/Verano:/i)
    expect(comparison.guidance).toMatch(/Fuera de verano:/i)
  })

  it('counts Sep 1–30 as summer for an Aug 31–Oct 30 exit period', () => {
    const input = {
      ...createEmptyInput(),
      tariffCode: '1B' as const,
      summerStartMonth: 4 as const,
      billingCycle: 'bimestral' as const,
      previousCutoffDate: '2026-08-31',
      nextCutoffDate: '2026-10-30',
    }
    const comparison = buildDailyAllowanceComparison(input, 6.45, 60, 'mixto', 9, 2026)
    expect(comparison.mixedPeriod).toEqual({
      periodDays: 60,
      summerDays: 30,
      nonSummerDays: 30,
      summerKwh: 193.5,
      nonSummerKwh: 193.5,
      summerRange: { startISO: '2026-09-01', endISO: '2026-09-30' },
      nonSummerRange: { startISO: '2026-10-01', endISO: '2026-10-30' },
    })
    expect(comparison.mixedPeriod!.summerDays + comparison.mixedPeriod!.nonSummerDays).toBe(60)

    const summer = comparison.profiles.find((profile) => profile.season === 'verano')!
    const standard = comparison.profiles.find((profile) => profile.season === 'fuera')!
    expect(summer.bands.map((band) => [band.key, band.bandMonthlyKwh, band.usedKwh])).toEqual([
      ['basico', 125, 125],
      ['intermedio', 100, 68.5],
    ])
    expect(summer.excessUsedKwh).toBe(0)
    expect(standard.bands.map((band) => [band.key, band.bandMonthlyKwh, band.usedKwh])).toEqual([
      ['basico', 75, 75],
      ['intermedio', 100, 100],
    ])
    expect(standard.excessUsedKwh).toBe(18.5)
  })

  it('includes intermediate low/high bands for 1C summer', () => {
    const profile = buildDailyAllowanceProfile('1C', 'verano', 1, 30, 7, 2026)
    expect(profile.bands.map((band) => band.key)).toEqual([
      'basico',
      'intermedioBajo',
      'intermedioAlto',
    ])
    expect(profile.subsidizedCeilingMonthlyKwh).toBe(450)
    expect(profile.bands.map((band) => band.ratePerKwh)).toEqual([1.01, 1.171, 1.505])
  })

  it('explains when the daily average sits in Excedente', () => {
    const input = {
      ...createEmptyInput(),
      tariffCode: '1B' as const,
      summerStartMonth: 5 as const,
      billingCycle: 'bimestral' as const,
    }
    const comparison = buildDailyAllowanceComparison(input, 12.5, 60, 'verano', 7, 2026)
    expect(comparison.guidance).toMatch(/Excedente/i)
    expect(comparison.guidance).toMatch(/12\.5 kWh\/día/)
    expect(comparison.profiles[0]!.excedenteRatePerKwh).toBe(4.016)
  })

  it('scales allowance guidance for monthly and bimonthly display', () => {
    const input = {
      ...createEmptyInput(),
      tariffCode: '1B' as const,
      summerStartMonth: 5 as const,
      billingCycle: 'bimestral' as const,
    }
    const comparison = buildDailyAllowanceComparison(input, 12.5, 60, 'verano', 7, 2026)
    expect(formatAllowanceGuidance(comparison, 'es', 'daily')).toMatch(/12\.5 kWh\/día/)
    expect(formatAllowanceGuidance(comparison, 'es', 'monthly')).toMatch(/375 kWh\/mes/)
    expect(formatAllowanceGuidance(comparison, 'es', 'bimonthly')).toMatch(/750 kWh\/bimestre/)
    expect(formatAllowanceGuidance(comparison, 'en', 'monthly')).toMatch(/375 kWh\/month/)
    // Excess is derived from exact monthly cupos (375 − 225), not rounded daily × 30.
    expect(formatAllowanceGuidance(comparison, 'es', 'monthly')).toMatch(/150 kWh\/mes/)
    expect(formatAllowanceGuidance(comparison, 'es', 'bimonthly')).toMatch(/300 kWh\/bimestre/)
  })

  it('returns a non-applicable DAC explanation without inventing blocks', () => {
    const input = {
      ...createEmptyInput(),
      tariffCode: 'DAC' as const,
      summerStartMonth: 5 as const,
    }
    const comparison = buildDailyAllowanceComparison(input, 20, 60, 'verano', 7, 2026)
    expect(comparison.applicable).toBe(false)
    expect(comparison.mode).toBe('dac')
    expect(comparison.profiles).toHaveLength(0)
    expect(comparison.guidance).toMatch(/no tiene bloques subsidiados/i)
  })

  it('attaches dailyAllowance to the full estimate', () => {
    const input = {
      ...createEmptyInput(),
      tariffCode: '1B' as const,
      summerStartMonth: 5 as const,
      billingCycle: 'bimestral' as const,
      previousReading: 1000,
      currentReading: 1200,
      previousCutoffDate: '2026-06-30',
      currentReadingDate: '2026-07-16',
      nextCutoffDate: '2026-08-29',
    }
    const { estimate, issues } = estimateBill(input)
    expect(issues).toHaveLength(0)
    expect(estimate!.dailyAllowance.applicable).toBe(true)
    expect(estimate!.dailyAllowance.averageDailyKwh).toBe(12.5)
    expect(estimate!.dailyAllowance.profiles[0]!.subsidizedCeilingMonthlyKwh).toBe(225)
    expect(estimate!.dailyAllowance.profiles[0]!.bands[0]!.ratePerKwh).toBe(1.01)
    expect(estimate!.dailyAllowance.profiles[0]!.excedenteRatePerKwh).toBe(4.016)
    expect(estimate!.dailyAllowance.dacLimitKwhMonth).toBe(400)
    expect(estimate!.dailyAllowance.currentPaceAboveDacLimit).toBe(false)
  })
})

describe('DAC history averaging', () => {
  it('averages 12 monthly totals as sum / 12', () => {
    const history = Array.from({ length: 12 }, () => 300)
    expect(averageMonthlyFromHistory(history, 'mensual')).toBe(300)
  })

  it('averages 6 bimonthly receipt totals as sum / 12', () => {
    // Six bills of 800 kWh → 4800 / 12 = 400 kWh/mes
    const history = Array.from({ length: 6 }, () => 800)
    expect(averageMonthlyFromHistory(history, 'bimestral')).toBe(400)
  })

  it('returns null for incomplete history', () => {
    expect(averageMonthlyFromHistory([200, 210, 220, null, null, null], 'bimestral')).toBeNull()
    expect(averageMonthlyFromHistory(Array.from({ length: 11 }, () => 200), 'mensual')).toBeNull()
  })

  it('treats equality to the limit as not above (only superior counts)', () => {
    const history = Array.from({ length: 6 }, () => 800) // 400 exactly for 1B
    const input = {
      ...createEmptyInput(),
      tariffCode: '1B' as const,
      billingCycle: 'bimestral' as const,
      historicalPeriodKwh: history,
      previousReading: 1000,
      currentReading: 1100,
      previousCutoffDate: '2026-06-30',
      currentReadingDate: '2026-07-16',
      nextCutoffDate: '2026-08-29',
    }
    const { estimate } = estimateBill(input)
    expect(estimate!.dacRisk.averageMonthlyKwh).toBe(400)
    expect(estimate!.dacRisk.aboveLimit).toBe(false)
    expect(estimate!.dacRisk.status).toBe('below_limit')
  })

  it('flags historical average above the limit', () => {
    const history = Array.from({ length: 6 }, () => 900) // 450 > 400
    const risk = assessDacRisk({
      ...createEmptyInput(),
      tariffCode: '1B',
      billingCycle: 'bimestral',
      historicalPeriodKwh: history,
    })
    expect(risk.status).toBe('above_limit')
    expect(risk.aboveLimit).toBe(true)
    expect(risk.averageMonthlyKwh).toBe(450)
  })

  it('projects the next rolling average by replacing the oldest period', () => {
    // Newest → oldest: five 700s and one old 1000. Sum=4500, avg=375.
    // Drop oldest 1000, add projected 1200 → sum=4700 / 12 ≈ 391.667
    const history = [700, 700, 700, 700, 700, 1000]
    expect(projectedNextMonthlyAverage(history, 'bimestral', 1200)).toBeCloseTo(391.667, 3)
  })

  it('marks projected_crossing when history is under but next cycle would exceed', () => {
    // Average = 390. Current pace high: 12.5 kWh/day → 750 projected bimestre.
    // History newest→oldest mostly low except we need sum/12 < 400 and next > 400.
    // Keep five periods totaling X, oldest Y, projected 900.
    // sum of 6 = 12 * 390 = 4680. Drop oldest 480, add 900 → 5100 / 12 = 425 > 400.
    const history = [840, 840, 840, 840, 840, 480]
    expect(averageMonthlyFromHistory(history, 'bimestral')).toBe(390)

    const input = {
      ...createEmptyInput(),
      tariffCode: '1B' as const,
      summerStartMonth: 5 as const,
      billingCycle: 'bimestral' as const,
      historicalPeriodKwh: history,
      previousReading: 1000,
      currentReading: 1200,
      previousCutoffDate: '2026-06-30',
      currentReadingDate: '2026-07-16',
      nextCutoffDate: '2026-08-29',
    }
    // projectedKwh = 12.5 * 60 = 750
    // next = (4680 - 480 + 750) / 12 = 4950 / 12 = 412.5
    const { estimate } = estimateBill(input)
    expect(estimate!.dacRisk.status).toBe('projected_crossing')
    expect(estimate!.dacRisk.projectedNextAverageMonthlyKwh).toBe(412.5)
    expect(estimate!.dacRisk.projectedAboveLimit).toBe(true)
    expect(estimate!.dacRisk.aboveLimit).toBe(false)
  })

  it('explains incomplete history without inventing an average', () => {
    const input = {
      ...createEmptyInput(),
      tariffCode: '1B' as const,
      summerStartMonth: 5 as const,
      billingCycle: 'bimestral' as const,
      historicalPeriodKwh: [700, 700, null, null, null, null],
      previousReading: 1000,
      currentReading: 1200,
      previousCutoffDate: '2026-06-30',
      currentReadingDate: '2026-07-16',
      nextCutoffDate: '2026-08-29',
    }
    const { estimate } = estimateBill(input)
    expect(estimate!.dacRisk.status).toBe('incomplete_history')
    expect(estimate!.dacRisk.averageMonthlyKwh).toBeNull()
    expect(estimate!.dacRisk.providedHistorySlots).toBe(2)
    expect(estimate!.dacRisk.requiredHistorySlots).toBe(6)
    expect(estimate!.dacRisk.message).toMatch(/Faltan 4/i)
  })

  it('clears history when switching billing cycle', () => {
    const previous = [100, 200, 300, 400, 500, 600]
    expect(resizeHistoryForCycle(previous, 'mensual', 'bimestral')).toEqual(
      Array.from({ length: 12 }, () => null),
    )
  })

  it('includes exact DAC monthly threshold on the allowance comparison', () => {
    const input = {
      ...createEmptyInput(),
      tariffCode: '1B' as const,
      summerStartMonth: 5 as const,
      billingCycle: 'bimestral' as const,
    }
    // 15 kWh/day → 450 kWh/mes > 400 limit
    const comparison = buildDailyAllowanceComparison(input, 15, 60, 'verano', 7, 2026)
    expect(comparison.dacLimitKwhMonth).toBe(400)
    expect(comparison.currentPaceAboveDacLimit).toBe(true)
  })
})
