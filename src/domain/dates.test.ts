import { describe, expect, it } from 'vitest'
import { isPreviousCutoffFresh } from './dates'

describe('isPreviousCutoffFresh', () => {
  const today = new Date(2026, 7, 25) // 25 August 2026 local

  it('keeps a June 30 corte fresh for bimestral (within 60+5 days)', () => {
    expect(isPreviousCutoffFresh('2026-06-30', 'bimestral', today)).toBe(true)
  })

  it('rejects a June 30 corte for mensual (beyond 30+5 days)', () => {
    expect(isPreviousCutoffFresh('2026-06-30', 'mensual', today)).toBe(false)
  })

  it('accepts a corte at the exact grace boundary', () => {
    expect(isPreviousCutoffFresh('2026-07-21', 'mensual', today)).toBe(true)
    expect(isPreviousCutoffFresh('2026-06-21', 'bimestral', today)).toBe(true)
  })

  it('rejects a corte one day past the grace boundary', () => {
    expect(isPreviousCutoffFresh('2026-07-20', 'mensual', today)).toBe(false)
    expect(isPreviousCutoffFresh('2026-06-20', 'bimestral', today)).toBe(false)
  })

  it('rejects empty or invalid dates', () => {
    expect(isPreviousCutoffFresh('', 'bimestral', today)).toBe(false)
    expect(isPreviousCutoffFresh('not-a-date', 'bimestral', today)).toBe(false)
  })

  it('rejects future corte dates', () => {
    expect(isPreviousCutoffFresh('2026-08-26', 'bimestral', today)).toBe(false)
  })
})
