import { formatMonthLabel, translate } from '../i18n'
import type { Language } from '../i18n'
import type { MonthNumber, SummerStartMonth } from './types'

const MS_PER_DAY = 24 * 60 * 60 * 1000

export function parseISODate(value: string): Date {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value)
  if (!match) {
    throw new Error(`Fecha inválida: ${value}`)
  }
  const year = Number(match[1])
  const month = Number(match[2])
  const day = Number(match[3])
  const date = new Date(Date.UTC(year, month - 1, day))
  if (
    date.getUTCFullYear() !== year ||
    date.getUTCMonth() !== month - 1 ||
    date.getUTCDate() !== day
  ) {
    throw new Error(`Fecha inválida: ${value}`)
  }
  return date
}

export function formatISODate(date: Date): string {
  const year = date.getUTCFullYear()
  const month = String(date.getUTCMonth() + 1).padStart(2, '0')
  const day = String(date.getUTCDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

/** Local calendar date as YYYY-MM-DD (for "today" defaults in the UI). */
export function todayISO(now = new Date()): string {
  const year = now.getFullYear()
  const month = String(now.getMonth() + 1).padStart(2, '0')
  const day = String(now.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

export function formatDisplayDate(value: string, language: Language = 'es'): string {
  const date = parseISODate(value)
  return new Intl.DateTimeFormat(language === 'es' ? 'es-MX' : 'en-GB', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    timeZone: 'UTC',
  }).format(date)
}

/** Inclusive calendar days between two ISO dates (same day => 0). */
export function calendarDaysBetween(startISO: string, endISO: string): number {
  const start = parseISODate(startISO)
  const end = parseISODate(endISO)
  return Math.round((end.getTime() - start.getTime()) / MS_PER_DAY)
}

/** Short label for how many calendar days ago an ISO date is (relative to today). */
export function daysAgoLabel(
  iso: string,
  now = new Date(),
  language: Language = 'es',
): string | null {
  if (!iso) return null
  const days = calendarDaysBetween(iso, todayISO(now))
  if (days < 0) return null
  if (days === 0) return translate(language, 'dates.today')
  if (days === 1) return translate(language, 'dates.daysAgo1')
  return translate(language, 'dates.daysAgoN', { days })
}

export function addDays(iso: string, days: number): string {
  const date = parseISODate(iso)
  date.setUTCDate(date.getUTCDate() + days)
  return formatISODate(date)
}

export function monthNumber(iso: string): MonthNumber {
  return (parseISODate(iso).getUTCMonth() + 1) as MonthNumber
}

export function yearNumber(iso: string): number {
  return parseISODate(iso).getUTCFullYear()
}

export function isSummerMonth(
  month: MonthNumber,
  summerStart: SummerStartMonth | null,
): boolean {
  if (summerStart == null) return false
  for (let offset = 0; offset < 6; offset += 1) {
    const candidate = ((summerStart - 1 + offset) % 12) + 1
    if (candidate === month) return true
  }
  return false
}

/**
 * Count summer days in (start, end] using calendar days.
 * Meter reading dates are boundaries: the prior cutoff day is excluded and the
 * next cutoff day is included, matching period length = nextCutoff - previousCutoff.
 */
export function countSummerDaysInPeriod(
  startISO: string,
  endISO: string,
  summerStart: SummerStartMonth | null,
): number {
  if (summerStart == null) return 0
  const total = calendarDaysBetween(startISO, endISO)
  if (total <= 0) return 0
  let summerDays = 0
  for (let i = 1; i <= total; i += 1) {
    const dayISO = addDays(startISO, i)
    const month = monthNumber(dayISO)
    if (isSummerMonth(month, summerStart)) {
      summerDays += 1
    }
  }
  return summerDays
}

export interface MixedSeasonInclusiveRanges {
  summerRange: { startISO: string; endISO: string } | null
  nonSummerRange: { startISO: string; endISO: string } | null
}

/**
 * Inclusive service-day spans for summer and non-summer portions of (start, end].
 * Returns null for a season that has no billed days in the period.
 */
export function mixedSeasonInclusiveRanges(
  startISO: string,
  endISO: string,
  summerStart: SummerStartMonth | null,
): MixedSeasonInclusiveRanges {
  const total = calendarDaysBetween(startISO, endISO)
  if (total <= 0 || summerStart == null) {
    return { summerRange: null, nonSummerRange: null }
  }

  let summerStartDay: string | null = null
  let summerEndDay: string | null = null
  let nonSummerStartDay: string | null = null
  let nonSummerEndDay: string | null = null

  for (let i = 1; i <= total; i += 1) {
    const dayISO = addDays(startISO, i)
    if (isSummerMonth(monthNumber(dayISO), summerStart)) {
      if (summerStartDay == null) summerStartDay = dayISO
      summerEndDay = dayISO
    } else {
      if (nonSummerStartDay == null) nonSummerStartDay = dayISO
      nonSummerEndDay = dayISO
    }
  }

  return {
    summerRange:
      summerStartDay != null && summerEndDay != null
        ? { startISO: summerStartDay, endISO: summerEndDay }
        : null,
    nonSummerRange:
      nonSummerStartDay != null && nonSummerEndDay != null
        ? { startISO: nonSummerStartDay, endISO: nonSummerEndDay }
        : null,
  }
}

export function defaultNextCutoff(
  previousCutoffISO: string,
  cycle: 'mensual' | 'bimestral',
): string {
  return addDays(previousCutoffISO, cycle === 'mensual' ? 30 : 60)
}

/**
 * Shift an ISO date by whole calendar months, clamping the day to the
 * last day of the target month (e.g. 31 Mar − 1 month → 28/29 Feb).
 */
export function addCalendarMonths(iso: string, months: number): string {
  const date = parseISODate(iso)
  const day = date.getUTCDate()
  const target = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth() + months, 1))
  const lastDayOfMonth = new Date(
    Date.UTC(target.getUTCFullYear(), target.getUTCMonth() + 1, 0),
  ).getUTCDate()
  target.setUTCDate(Math.min(day, lastDayOfMonth))
  return formatISODate(target)
}

export interface ApproximatePeriodRange {
  /** Approximate period start (previous reading / corte). */
  startISO: string
  /** Approximate period end (current reading / corte for that receipt). */
  endISO: string
}

/**
 * Build approximate historical billing-period ranges for DAC history slots.
 * Index 0 is the most recent completed period ending on `previousCutoffISO`;
 * later indexes step backward by 1 month (mensual) or 2 months (bimestral).
 *
 * Each boundary is derived from the original cutoff anchor (n × step months),
 * so a February clamp on one boundary does not permanently shift older estimates.
 * Adjacent ranges stay contiguous because slot i's start equals slot i+1's end.
 * Returns null when the cutoff is missing or invalid — callers should not invent dates.
 */
export function approximateHistoryPeriodRanges(
  previousCutoffISO: string,
  cycle: 'mensual' | 'bimestral',
): ApproximatePeriodRange[] | null {
  if (!previousCutoffISO) return null
  try {
    parseISODate(previousCutoffISO)
  } catch {
    return null
  }

  const slotCount = cycle === 'mensual' ? 12 : 6
  const stepMonths = cycle === 'mensual' ? 1 : 2
  const ranges: ApproximatePeriodRange[] = []

  for (let index = 0; index < slotCount; index += 1) {
    const endISO = addCalendarMonths(previousCutoffISO, -index * stepMonths)
    const startISO = addCalendarMonths(previousCutoffISO, -(index + 1) * stepMonths)
    ranges.push({ startISO, endISO })
  }

  return ranges
}

function compactMonthDay(iso: string, language: Language, includeYear: boolean): string {
  const date = parseISODate(iso)
  const formatted = new Intl.DateTimeFormat(language === 'es' ? 'es-MX' : 'en-GB', {
    day: 'numeric',
    month: 'short',
    ...(includeYear ? { year: 'numeric' as const } : {}),
    timeZone: 'UTC',
  }).format(date)

  // Normalize "30 abr." / "30 Apr" → compact "30 abr" / "30 Apr" for UI hints.
  return formatted
    .replace(/\./g, '')
    .replace(/\s+/g, ' ')
    .trim()
    .replace(/ de /gi, ' ')
}

/**
 * Compact approximate range label, e.g. "≈ 30 abr–30 jun 2026".
 * Year is shown once when both ends share a year; otherwise on both ends.
 */
export function formatApproximatePeriodHint(
  startISO: string,
  endISO: string,
  language: Language = 'es',
): string {
  return `≈ ${formatInclusiveDateRange(startISO, endISO, language)}`
}

/**
 * Compact exact inclusive range label, e.g. "1 sep–30 sep 2026" / "1 Sep–30 Sep 2026".
 * Year is shown once when both ends share a year; otherwise on both ends.
 */
export function formatInclusiveDateRange(
  startISO: string,
  endISO: string,
  language: Language = 'es',
): string {
  const sameYear = yearNumber(startISO) === yearNumber(endISO)
  const start = compactMonthDay(startISO, language, !sameYear)
  const end = compactMonthDay(endISO, language, true)
  return `${start}–${end}`
}

/**
 * Whether a remembered previous corte is still useful for pre-filling the form.
 * Fresh if age is within the billing cycle length plus a 5-day grace window
 * (mensual ≤ 35 days, bimestral ≤ 65 days).
 */
export function isPreviousCutoffFresh(
  previousCutoffISO: string,
  cycle: 'mensual' | 'bimestral',
  now = new Date(),
): boolean {
  if (!previousCutoffISO) return false
  try {
    const ageDays = calendarDaysBetween(previousCutoffISO, todayISO(now))
    const maxAgeDays = (cycle === 'mensual' ? 30 : 60) + 5
    return ageDays >= 0 && ageDays <= maxAgeDays
  } catch {
    return false
  }
}

export const SUMMER_START_VALUES: SummerStartMonth[] = [2, 3, 4, 5]

/** @deprecated Prefer summerStartOptions(language) from i18n for localized labels. */
export const SUMMER_START_OPTIONS: Array<{ value: SummerStartMonth; label: string }> = [
  { value: 2, label: 'Febrero' },
  { value: 3, label: 'Marzo' },
  { value: 4, label: 'Abril' },
  { value: 5, label: 'Mayo' },
]

/** Spanish month labels kept for backward-compatible imports; prefer formatMonthLabel. */
export const MONTH_LABELS: Record<MonthNumber, string> = {
  1: formatMonthLabel(1, 'es'),
  2: formatMonthLabel(2, 'es'),
  3: formatMonthLabel(3, 'es'),
  4: formatMonthLabel(4, 'es'),
  5: formatMonthLabel(5, 'es'),
  6: formatMonthLabel(6, 'es'),
  7: formatMonthLabel(7, 'es'),
  8: formatMonthLabel(8, 'es'),
  9: formatMonthLabel(9, 'es'),
  10: formatMonthLabel(10, 'es'),
  11: formatMonthLabel(11, 'es'),
  12: formatMonthLabel(12, 'es'),
}
