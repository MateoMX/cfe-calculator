import { describe, expect, it } from 'vitest'
import { allocateDomesticBlocks, estimateDomesticBill, resolveSeasonMode } from './billing'
import { createEmptyInput, estimateBill } from './estimate'

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
})

describe('bill estimate', () => {
  it('prices the 1B 750 kWh summer bimestral example with July rates and IVA', () => {
    const input = {
      ...createEmptyInput(),
      stateCode: 'YUC',
      municipality: 'Mérida',
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
      stateCode: 'CMX',
      municipality: 'Coyoacán',
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
      stateCode: 'CMX',
      municipality: 'Coyoacán',
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
})
