import { DAC_REGIONS, TARIFF_OPTIONS } from './data/tariffs'
import { SUMMER_START_VALUES } from './domain/dates'
import { createEmptyInput, requiredHistorySlots } from './domain/estimate'
import type {
  BillingCycle,
  CalculatorInput,
  DomesticTariffCode,
  SummerStartMonth,
} from './domain/types'

export const SHARE_LINK_VERSION = '1'

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/

function isTariffCode(value: string): value is DomesticTariffCode {
  return TARIFF_OPTIONS.some((option) => option.code === value)
}

function isBillingCycle(value: string): value is BillingCycle {
  return value === 'mensual' || value === 'bimestral'
}

function isSummerStartMonth(value: number): value is SummerStartMonth {
  return SUMMER_START_VALUES.includes(value as SummerStartMonth)
}

function isDacRegionId(value: string): boolean {
  return DAC_REGIONS.some((region) => region.regionId === value)
}

function isIsoDate(value: string): boolean {
  if (!ISO_DATE.test(value)) return false
  const date = new Date(`${value}T00:00:00`)
  return Number.isFinite(date.getTime())
}

function parseNonNegativeNumber(raw: string | null): number | null {
  if (raw == null || raw === '') return null
  const value = Number(raw)
  if (!Number.isFinite(value) || value < 0) return null
  return value
}

function parseHistory(raw: string | null, cycle: BillingCycle): Array<number | null> | null {
  const slots = requiredHistorySlots(cycle)
  if (raw == null) {
    return Array.from({ length: slots }, () => null)
  }

  const parts = raw.split(',')
  if (parts.length > slots) return null

  const history: Array<number | null> = []
  for (const part of parts) {
    if (part === '') {
      history.push(null)
      continue
    }
    const value = Number(part)
    if (!Number.isFinite(value) || value < 0) return null
    history.push(value)
  }
  while (history.length < slots) history.push(null)
  return history
}

/** Extract the query portion from a location hash (`#/?a=1` or `#?a=1`). */
export function queryFromHash(hash: string): string {
  const trimmed = hash.trim()
  const queryIndex = trimmed.indexOf('?')
  if (queryIndex < 0) return ''
  return trimmed.slice(queryIndex + 1)
}

/** Path portion of the hash without query (`#/`, `#/tariffs`, …). */
export function pathFromHash(hash: string): string {
  const trimmed = hash.trim()
  const queryIndex = trimmed.indexOf('?')
  return queryIndex < 0 ? trimmed : trimmed.slice(0, queryIndex)
}

export function encodeCalculatorInput(input: CalculatorInput): URLSearchParams {
  const params = new URLSearchParams()
  params.set('v', SHARE_LINK_VERSION)
  params.set('tariff', input.tariffCode)
  if (input.summerStartMonth != null) {
    params.set('summer', String(input.summerStartMonth))
  }
  params.set('cycle', input.billingCycle)
  params.set('prev', String(input.previousReading))
  params.set('curr', String(input.currentReading))
  if (input.previousCutoffDate) params.set('prevDate', input.previousCutoffDate)
  if (input.currentReadingDate) params.set('currDate', input.currentReadingDate)
  if (input.nextCutoffDate) params.set('nextDate', input.nextCutoffDate)
  if (input.optionalOtherCharges !== 0) {
    params.set('other', String(input.optionalOtherCharges))
  }
  params.set('dac', input.dacRegionId)
  if (input.historicalPeriodKwh.some((value) => value != null)) {
    params.set(
      'hist',
      input.historicalPeriodKwh.map((value) => (value == null ? '' : String(value))).join(','),
    )
  }
  return params
}

/** Hash fragment encoding the calculator input, e.g. `#/?v=1&tariff=1B&…`. */
export function hashForCalculatorInput(input: CalculatorInput): string {
  return `#/?${encodeCalculatorInput(input).toString()}`
}

/** Absolute share URL for the current page origin + path, with encoded hash params. */
export function buildShareUrl(
  input: CalculatorInput,
  location: Pick<Location, 'origin' | 'pathname' | 'search'> = window.location,
): string {
  return `${location.origin}${location.pathname}${location.search}${hashForCalculatorInput(input)}`
}

export function inputHasExpertShareFields(input: CalculatorInput): boolean {
  return (
    input.optionalOtherCharges > 0 || input.historicalPeriodKwh.some((value) => value != null)
  )
}

/**
 * Parse a share payload from a hash (or raw query string).
 * Returns null when there is no versioned share data or required fields are invalid.
 */
export function parseCalculatorInputFromHash(hash: string): CalculatorInput | null {
  const query = hash.includes('?') || hash.startsWith('#') ? queryFromHash(hash) : hash
  if (!query) return null

  const params = new URLSearchParams(query)
  if (params.get('v') !== SHARE_LINK_VERSION) return null

  const tariffRaw = params.get('tariff')
  const cycleRaw = params.get('cycle')
  if (!tariffRaw || !isTariffCode(tariffRaw)) return null
  if (!cycleRaw || !isBillingCycle(cycleRaw)) return null

  const base = createEmptyInput()
  const tariffCode = tariffRaw
  const billingCycle = cycleRaw

  let summerStartMonth: SummerStartMonth | null
  if (tariffCode === '1') {
    summerStartMonth = null
  } else if (!params.has('summer')) {
    summerStartMonth = base.summerStartMonth
  } else {
    const summer = Number(params.get('summer'))
    if (!isSummerStartMonth(summer)) return null
    summerStartMonth = summer
  }

  const previousReading = parseNonNegativeNumber(params.get('prev'))
  if (params.has('prev') && previousReading == null) return null

  const currentReading = parseNonNegativeNumber(params.get('curr'))
  if (params.has('curr') && currentReading == null) return null

  const previousCutoffDate = params.get('prevDate') ?? ''
  if (previousCutoffDate && !isIsoDate(previousCutoffDate)) return null

  const currentReadingDate = params.get('currDate') ?? base.currentReadingDate
  if (params.has('currDate')) {
    if (!currentReadingDate || !isIsoDate(currentReadingDate)) return null
  }

  const nextCutoffDate = params.get('nextDate') ?? ''
  if (nextCutoffDate && !isIsoDate(nextCutoffDate)) return null

  const optionalOtherCharges = parseNonNegativeNumber(params.get('other'))
  if (params.has('other') && optionalOtherCharges == null) return null

  const dacRegionId = params.get('dac') ?? base.dacRegionId
  if (!isDacRegionId(dacRegionId)) return null

  const historicalPeriodKwh = parseHistory(params.get('hist'), billingCycle)
  if (historicalPeriodKwh == null) return null

  return {
    tariffCode,
    summerStartMonth,
    billingCycle,
    previousReading: previousReading ?? base.previousReading,
    currentReading: currentReading ?? base.currentReading,
    previousCutoffDate,
    currentReadingDate,
    nextCutoffDate,
    optionalOtherCharges: optionalOtherCharges ?? 0,
    dacRegionId,
    historicalPeriodKwh,
  }
}

export async function copyTextToClipboard(text: string): Promise<boolean> {
  try {
    if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(text)
      return true
    }
  } catch {
    // Fall through to the legacy path below.
  }

  try {
    const textarea = document.createElement('textarea')
    textarea.value = text
    textarea.setAttribute('readonly', '')
    textarea.style.position = 'fixed'
    textarea.style.opacity = '0'
    document.body.appendChild(textarea)
    textarea.select()
    const ok = document.execCommand('copy')
    document.body.removeChild(textarea)
    return ok
  } catch {
    return false
  }
}
