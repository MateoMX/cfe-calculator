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

export function formatDisplayDate(value: string): string {
  const date = parseISODate(value)
  return new Intl.DateTimeFormat('es-MX', {
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

/** Short Spanish label for how many calendar days ago an ISO date is (relative to today). */
export function daysAgoLabel(iso: string, now = new Date()): string | null {
  if (!iso) return null
  const days = calendarDaysBetween(iso, todayISO(now))
  if (days < 0) return null
  if (days === 0) return 'hoy'
  if (days === 1) return 'hace 1 día'
  return `hace ${days} días`
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
 * Count summer days in [start, end) using calendar days.
 * End date is exclusive to match period length = nextCutoff - previousCutoff.
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
  for (let i = 0; i < total; i += 1) {
    const dayISO = addDays(startISO, i)
    const month = monthNumber(dayISO)
    if (isSummerMonth(month, summerStart)) {
      summerDays += 1
    }
  }
  return summerDays
}

export function defaultNextCutoff(
  previousCutoffISO: string,
  cycle: 'mensual' | 'bimestral',
): string {
  return addDays(previousCutoffISO, cycle === 'mensual' ? 30 : 60)
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

export const SUMMER_START_OPTIONS: Array<{ value: SummerStartMonth; label: string }> = [
  { value: 2, label: 'Febrero' },
  { value: 3, label: 'Marzo' },
  { value: 4, label: 'Abril' },
  { value: 5, label: 'Mayo' },
]

export const MONTH_LABELS: Record<MonthNumber, string> = {
  1: 'enero',
  2: 'febrero',
  3: 'marzo',
  4: 'abril',
  5: 'mayo',
  6: 'junio',
  7: 'julio',
  8: 'agosto',
  9: 'septiembre',
  10: 'octubre',
  11: 'noviembre',
  12: 'diciembre',
}
