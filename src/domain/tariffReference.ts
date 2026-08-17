import {
  getAvailableTariffYears,
  getDefaultTariffSnapshot,
  getTariffSnapshot,
  resolveDefaultTariffYear,
  type TariffSnapshot,
} from '../data/tariffs'
import type {
  BlockKey,
  DacRegionRates,
  DomesticTariffCode,
  DomesticTariffDefinition,
  MonthNumber,
  RateBlock,
  Season,
} from './types'

export type DomesticReferenceCode = Exclude<DomesticTariffCode, 'DAC'>

export interface ReferenceBlockRow {
  key: BlockKey
  allowanceKwh: number
  cumulativeKwh: number
  /** Null when the snapshot has no published price for this block/month/season. */
  ratePerKwh: number | null
}

export interface SeasonReference {
  season: Season
  blocks: ReferenceBlockRow[]
}

export interface MonthRateCell {
  month: MonthNumber
  season: Season
  rates: Partial<Record<BlockKey, number | null>>
}

const MONTHS: MonthNumber[] = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12]

export {
  getAvailableTariffYears,
  getDefaultTariffSnapshot,
  getTariffSnapshot,
  resolveDefaultTariffYear,
}
export type { TariffSnapshot }

/** Treat missing or non-positive prices as unpublished / not applicable. */
export function normalizePublishedRate(price: number | undefined | null): number | null {
  if (price == null || !Number.isFinite(price) || price <= 0) return null
  return price
}

function requireSnapshot(year: number): TariffSnapshot {
  const snapshot = getTariffSnapshot(year)
  if (!snapshot) {
    throw new Error(`No tariff snapshot registered for year ${year}`)
  }
  return snapshot
}

export function getDomesticTariffDefinition(
  code: DomesticReferenceCode,
  year: number = resolveDefaultTariffYear(),
): DomesticTariffDefinition {
  return requireSnapshot(year).domesticTariffs[code]
}

export function getPublishedRate(
  code: DomesticReferenceCode,
  month: MonthNumber,
  season: Season,
  key: BlockKey,
  year: number = resolveDefaultTariffYear(),
): number | null {
  const tariff = getDomesticTariffDefinition(code, year)
  const exact = tariff.monthlyRates.find(
    (rate) => rate.year === year && rate.month === month && rate.season === season,
  )
  if (exact) {
    return normalizePublishedRate(exact.prices[key])
  }

  // Tarifa 1 stores only non-summer rows; summer pricing is identical.
  if (code === '1' && season === 'verano') {
    const fallback = tariff.monthlyRates.find(
      (rate) => rate.year === year && rate.month === month,
    )
    return normalizePublishedRate(fallback?.prices[key])
  }

  // Older snapshots may omit an explicit year on every row; still match month/season.
  const loose = tariff.monthlyRates.find(
    (rate) => rate.month === month && rate.season === season,
  )
  if (loose) {
    return normalizePublishedRate(loose.prices[key])
  }

  if (code === '1' && season === 'verano') {
    const fallback = tariff.monthlyRates.find((rate) => rate.month === month)
    return normalizePublishedRate(fallback?.prices[key])
  }

  return null
}

function buildBlockRows(
  code: DomesticReferenceCode,
  month: MonthNumber,
  season: Season,
  blocks: RateBlock[],
  year: number,
): ReferenceBlockRow[] {
  let cumulative = 0
  return blocks.map((block) => {
    if (Number.isFinite(block.allowanceKwh)) {
      cumulative += block.allowanceKwh
    }
    return {
      key: block.key,
      allowanceKwh: block.allowanceKwh,
      cumulativeKwh: Number.isFinite(block.allowanceKwh)
        ? cumulative
        : Number.POSITIVE_INFINITY,
      ratePerKwh: getPublishedRate(code, month, season, block.key, year),
    }
  })
}

export function getSeasonReference(
  code: DomesticReferenceCode,
  month: MonthNumber,
  season: Season,
  year: number = resolveDefaultTariffYear(),
): SeasonReference {
  const tariff = getDomesticTariffDefinition(code, year)
  return {
    season,
    blocks: buildBlockRows(code, month, season, tariff.blocksBySeason[season], year),
  }
}

export function getMonthMatrix(
  code: DomesticReferenceCode,
  season: Season,
  year: number = resolveDefaultTariffYear(),
): MonthRateCell[] {
  const tariff = getDomesticTariffDefinition(code, year)
  const blockKeys = tariff.blocksBySeason[season].map((block) => block.key)
  return MONTHS.map((month) => {
    const rates: Partial<Record<BlockKey, number | null>> = {}
    for (const key of blockKeys) {
      rates[key] = getPublishedRate(code, month, season, key, year)
    }
    return { month, season, rates }
  })
}

/** Published DAC months for a snapshot year, ascending. */
export function getAvailableDacMonths(
  year: number = resolveDefaultTariffYear(),
): MonthNumber[] {
  return requireSnapshot(year)
    .dacMonthlySchedules.map((schedule) => schedule.month)
    .sort((a, b) => a - b)
}

/** Newest published DAC month for the year (falls back undefined if none). */
export function resolveDefaultDacMonth(
  year: number = resolveDefaultTariffYear(),
): MonthNumber | undefined {
  const months = getAvailableDacMonths(year)
  return months[months.length - 1]
}

function resolveDacScheduleMonth(
  year: number,
  month?: MonthNumber,
): MonthNumber | undefined {
  const available = getAvailableDacMonths(year)
  if (available.length === 0) return undefined
  if (month != null && available.includes(month)) return month
  return available[available.length - 1]
}

export function getDacRegions(
  year: number = resolveDefaultTariffYear(),
  month?: MonthNumber,
): DacRegionRates[] {
  const snapshot = requireSnapshot(year)
  const resolvedMonth = resolveDacScheduleMonth(year, month)
  if (resolvedMonth == null) return snapshot.dacRegions
  const schedule = snapshot.dacMonthlySchedules.find(
    (entry) => entry.month === resolvedMonth,
  )
  return schedule?.regions ?? snapshot.dacRegions
}

export function getDacRegion(
  regionId: string,
  year: number = resolveDefaultTariffYear(),
  month?: MonthNumber,
): DacRegionRates | undefined {
  return getDacRegions(year, month).find((region) => region.regionId === regionId)
}

export function getSnapshotMeta(year: number = resolveDefaultTariffYear()) {
  return requireSnapshot(year).meta
}

export interface TariffDataStatus {
  /** Latest snapshot `asOf` across all registered years (ISO date). */
  lastCheckedAsOf: string
  /** Inclusive coverage start: January 1 of the earliest registered year. */
  rangeStartISO: string
  /** Inclusive coverage end: December 31 of the latest registered year. */
  rangeEndISO: string
}

/**
 * Overall data freshness and coverage for the tariff reference page.
 * Coverage spans all registered snapshot years (Jan 1 of earliest → Dec 31 of latest).
 * Last check reuses the newest snapshot `asOf` date.
 */
export function getTariffDataStatus(
  availableYears: number[] = getAvailableTariffYears(),
): TariffDataStatus {
  if (availableYears.length === 0) {
    throw new Error('No tariff snapshots are registered')
  }
  const earliestYear = Math.min(...availableYears)
  const latestYear = Math.max(...availableYears)
  let lastCheckedAsOf = requireSnapshot(availableYears[0]!).meta.asOf
  for (const year of availableYears) {
    const asOf = requireSnapshot(year).meta.asOf
    if (asOf > lastCheckedAsOf) lastCheckedAsOf = asOf
  }
  return {
    lastCheckedAsOf,
    rangeStartISO: `${earliestYear}-01-01`,
    rangeEndISO: `${latestYear}-12-31`,
  }
}

/**
 * Data freshness and coverage for published DAC monthly schedules.
 * Coverage starts on the first day of the earliest published month and ends
 * on the last day of the latest published month.
 */
export function getDacTariffDataStatus(
  availableYears: number[] = getAvailableTariffYears(),
): TariffDataStatus {
  let earliest: { year: number; month: MonthNumber } | undefined
  let latest: { year: number; month: MonthNumber } | undefined
  let lastCheckedAsOf: string | undefined

  for (const year of availableYears) {
    const snapshot = requireSnapshot(year)
    if (snapshot.dacMonthlySchedules.length === 0) continue

    if (lastCheckedAsOf == null || snapshot.meta.asOf > lastCheckedAsOf) {
      lastCheckedAsOf = snapshot.meta.asOf
    }

    for (const schedule of snapshot.dacMonthlySchedules) {
      const point = { year, month: schedule.month }
      const value = year * 12 + schedule.month
      if (earliest == null || value < earliest.year * 12 + earliest.month) earliest = point
      if (latest == null || value > latest.year * 12 + latest.month) latest = point
    }
  }

  if (earliest == null || latest == null || lastCheckedAsOf == null) {
    throw new Error('No DAC tariff schedules are registered')
  }

  const lastDay = new Date(Date.UTC(latest.year, latest.month, 0)).getUTCDate()
  return {
    lastCheckedAsOf,
    rangeStartISO: `${earliest.year}-${String(earliest.month).padStart(2, '0')}-01`,
    rangeEndISO: `${latest.year}-${String(latest.month).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`,
  }
}

export function getDomesticTariffCodes(
  year: number = resolveDefaultTariffYear(),
): DomesticReferenceCode[] {
  return Object.keys(requireSnapshot(year).domesticTariffs) as DomesticReferenceCode[]
}

export function getAllMonths(): MonthNumber[] {
  return MONTHS
}
