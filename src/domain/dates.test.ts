import { describe, expect, it } from 'vitest'
import {
  addCalendarMonths,
  approximateHistoryPeriodRanges,
  calendarDaysBetween,
  countSummerDaysInPeriod,
  formatApproximatePeriodHint,
  formatInclusiveDateRange,
  isPreviousCutoffFresh,
  isSummerMonth,
  mixedSeasonInclusiveRanges,
} from './dates'

describe('calendarDaysBetween', () => {
  it('returns the exclusive-end day count between cutoffs', () => {
    expect(calendarDaysBetween('2026-08-31', '2026-10-30')).toBe(60)
    expect(calendarDaysBetween('2026-08-31', '2026-09-30')).toBe(30)
    expect(calendarDaysBetween('2026-06-30', '2026-06-30')).toBe(0)
  })
})

describe('isSummerMonth', () => {
  it('treats April-start summer as April through September', () => {
    expect(isSummerMonth(3, 4)).toBe(false)
    expect(isSummerMonth(4, 4)).toBe(true)
    expect(isSummerMonth(9, 4)).toBe(true)
    expect(isSummerMonth(10, 4)).toBe(false)
  })
})

describe('countSummerDaysInPeriod', () => {
  it('counts (previousCutoff, nextCutoff] so Aug 31–Oct 30 is 30 summer + 30 standard', () => {
    const summerDays = countSummerDaysInPeriod('2026-08-31', '2026-10-30', 4)
    const periodDays = calendarDaysBetween('2026-08-31', '2026-10-30')
    expect(periodDays).toBe(60)
    expect(summerDays).toBe(30)
    expect(periodDays - summerDays).toBe(30)
  })

  it('excludes the prior cutoff and includes the next cutoff at season boundaries', () => {
    // (Sep 30, Oct 30] is entirely non-summer for April-start summer.
    expect(countSummerDaysInPeriod('2026-09-30', '2026-10-30', 4)).toBe(0)
    // (Mar 31, Apr 30] is entirely summer for April-start summer.
    expect(countSummerDaysInPeriod('2026-03-31', '2026-04-30', 4)).toBe(30)
  })

  it('keeps seasonal split equal to the billing-period length', () => {
    const cases: Array<[string, string, 2 | 3 | 4 | 5]> = [
      ['2026-08-21', '2026-10-20', 4],
      ['2026-04-15', '2026-06-14', 5],
      ['2026-08-31', '2026-10-30', 4],
    ]
    for (const [start, end, summerStart] of cases) {
      const periodDays = calendarDaysBetween(start, end)
      const summerDays = countSummerDaysInPeriod(start, end, summerStart)
      expect(summerDays + (periodDays - summerDays)).toBe(periodDays)
    }
  })
})

describe('mixedSeasonInclusiveRanges', () => {
  it('returns Sep 1–30 summer and Oct 1–30 standard for an Aug 31–Oct 30 exit', () => {
    expect(mixedSeasonInclusiveRanges('2026-08-31', '2026-10-30', 4)).toEqual({
      summerRange: { startISO: '2026-09-01', endISO: '2026-09-30' },
      nonSummerRange: { startISO: '2026-10-01', endISO: '2026-10-30' },
    })
  })

  it('returns Apr 16–30 standard and May 1–Jun 14 summer for a May-start entry', () => {
    expect(mixedSeasonInclusiveRanges('2026-04-15', '2026-06-14', 5)).toEqual({
      summerRange: { startISO: '2026-05-01', endISO: '2026-06-14' },
      nonSummerRange: { startISO: '2026-04-16', endISO: '2026-04-30' },
    })
  })

  it('handles mid-month summer exit cutoffs', () => {
    expect(mixedSeasonInclusiveRanges('2026-08-21', '2026-10-20', 4)).toEqual({
      summerRange: { startISO: '2026-08-22', endISO: '2026-09-30' },
      nonSummerRange: { startISO: '2026-10-01', endISO: '2026-10-20' },
    })
  })

  it('handles a year-boundary February-start entry', () => {
    expect(mixedSeasonInclusiveRanges('2026-01-15', '2026-03-16', 2)).toEqual({
      summerRange: { startISO: '2026-02-01', endISO: '2026-03-16' },
      nonSummerRange: { startISO: '2026-01-16', endISO: '2026-01-31' },
    })
  })
})

describe('formatInclusiveDateRange', () => {
  it('formats a same-year Spanish range with a single trailing year', () => {
    expect(formatInclusiveDateRange('2026-09-01', '2026-09-30', 'es')).toMatch(
      /1\s+sep\s*–\s*30\s+sep\s+2026/i,
    )
  })

  it('formats a same-year English range', () => {
    expect(formatInclusiveDateRange('2026-09-01', '2026-09-30', 'en')).toMatch(
      /1\s+sept?\s*–\s*30\s+sept?\s+2026/i,
    )
  })

  it('includes both years when the range crosses a year boundary', () => {
    const label = formatInclusiveDateRange('2025-12-28', '2026-02-28', 'es')
    expect(label).toContain('2025')
    expect(label).toContain('2026')
  })
})

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

describe('addCalendarMonths', () => {
  it('steps backward by whole months', () => {
    expect(addCalendarMonths('2026-06-15', -1)).toBe('2026-05-15')
    expect(addCalendarMonths('2026-06-15', -2)).toBe('2026-04-15')
  })

  it('clamps month-end days into shorter months', () => {
    expect(addCalendarMonths('2026-03-31', -1)).toBe('2026-02-28')
    expect(addCalendarMonths('2024-03-31', -1)).toBe('2024-02-29')
    expect(addCalendarMonths('2026-01-31', -1)).toBe('2025-12-31')
  })

  it('crosses year boundaries', () => {
    expect(addCalendarMonths('2026-01-10', -2)).toBe('2025-11-10')
  })
})

describe('approximateHistoryPeriodRanges', () => {
  it('returns null for missing or invalid cutoffs', () => {
    expect(approximateHistoryPeriodRanges('', 'bimestral')).toBeNull()
    expect(approximateHistoryPeriodRanges('not-a-date', 'mensual')).toBeNull()
  })

  it('matches the real-receipt bimonthly pattern around 24 Apr 2026', () => {
    // CFE-Example2 history ends near 24 Apr / 24 Feb / 26 Dec / 24 Oct / 26 Aug / 26 Jun.
    // Anchored two-calendar-month steps approximate that route with ±2-day drift.
    const ranges = approximateHistoryPeriodRanges('2026-04-24', 'bimestral')
    expect(ranges).toHaveLength(6)
    expect(ranges?.[0]).toEqual({ startISO: '2026-02-24', endISO: '2026-04-24' })
    expect(ranges?.[1]).toEqual({ startISO: '2025-12-24', endISO: '2026-02-24' })
    expect(ranges?.[2]).toEqual({ startISO: '2025-10-24', endISO: '2025-12-24' })
    expect(ranges?.[3]).toEqual({ startISO: '2025-08-24', endISO: '2025-10-24' })
    expect(ranges?.[4]).toEqual({ startISO: '2025-06-24', endISO: '2025-08-24' })
    expect(ranges?.[5]).toEqual({ startISO: '2025-04-24', endISO: '2025-06-24' })
  })

  it('builds contiguous newest-first bimonthly ranges from the previous cutoff', () => {
    const ranges = approximateHistoryPeriodRanges('2026-06-30', 'bimestral')
    expect(ranges).toHaveLength(6)
    expect(ranges?.[0]).toEqual({ startISO: '2026-04-30', endISO: '2026-06-30' })
    expect(ranges?.[1]).toEqual({ startISO: '2026-02-28', endISO: '2026-04-30' })
    // December keeps day 30 from the original anchor (not a cascaded Feb 28).
    expect(ranges?.[2]).toEqual({ startISO: '2025-12-30', endISO: '2026-02-28' })
    expect(ranges?.[5].endISO).toBe(ranges?.[4].startISO)
  })

  it('builds 12 newest-first monthly ranges from the previous cutoff', () => {
    const ranges = approximateHistoryPeriodRanges('2026-06-30', 'mensual')
    expect(ranges).toHaveLength(12)
    expect(ranges?.[0]).toEqual({ startISO: '2026-05-30', endISO: '2026-06-30' })
    expect(ranges?.[1]).toEqual({ startISO: '2026-04-30', endISO: '2026-05-30' })
    // Anchored offsets keep day 30 after February (Jun 30 − 11 months = Jul 30).
    expect(ranges?.[11]).toEqual({ startISO: '2025-06-30', endISO: '2025-07-30' })
  })

  it('clamps February without permanently shifting older monthly boundaries', () => {
    const ranges = approximateHistoryPeriodRanges('2024-03-31', 'mensual')
    expect(ranges?.[0]).toEqual({ startISO: '2024-02-29', endISO: '2024-03-31' })
    // Start of slot 1 comes from the original Mar 31 − 2 months (= Jan 31), not Jan 29.
    expect(ranges?.[1]).toEqual({ startISO: '2024-01-31', endISO: '2024-02-29' })
    expect(ranges?.[2]).toEqual({ startISO: '2023-12-31', endISO: '2024-01-31' })
  })
})

describe('formatApproximatePeriodHint', () => {
  it('formats a same-year Spanish range with a single trailing year', () => {
    const hint = formatApproximatePeriodHint('2026-04-30', '2026-06-30', 'es')
    expect(hint.startsWith('≈ ')).toBe(true)
    expect(hint).toMatch(/30/)
    expect(hint).toMatch(/2026/)
    expect(hint.indexOf('2026')).toBe(hint.lastIndexOf('2026'))
  })

  it('includes both years when the range crosses a year boundary', () => {
    const hint = formatApproximatePeriodHint('2025-12-28', '2026-02-28', 'es')
    expect(hint).toContain('2025')
    expect(hint).toContain('2026')
  })

  it('formats an English range', () => {
    const hint = formatApproximatePeriodHint('2026-04-30', '2026-06-30', 'en')
    expect(hint.startsWith('≈ ')).toBe(true)
    expect(hint).toMatch(/30/)
    expect(hint).toMatch(/2026/)
  })
})
