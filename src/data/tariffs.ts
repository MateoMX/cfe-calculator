import type {
  DacMonthSchedule,
  DacRegionRates,
  DomesticTariffCode,
  DomesticTariffDefinition,
  TariffSnapshotMeta,
} from '../domain/types'
import {
  DAC_MONTHLY_SCHEDULES as DAC_MONTHLY_SCHEDULES_2026,
  DAC_REGIONS as DAC_REGIONS_2026,
  DOMESTIC_TARIFFS as DOMESTIC_TARIFFS_2026,
  IVA_RATE as IVA_RATE_2026,
  MONTHLY_MINIMUM_KWH as MONTHLY_MINIMUM_KWH_2026,
  TARIFF_OPTIONS as TARIFF_OPTIONS_2026,
  TARIFF_SNAPSHOT_META as TARIFF_SNAPSHOT_META_2026,
} from './tariffs-2026'

export interface TariffSnapshot {
  meta: TariffSnapshotMeta
  domesticTariffs: Record<
    Exclude<DomesticTariffCode, 'DAC'>,
    DomesticTariffDefinition
  >
  /** Official DAC schedules by calendar month (published months only). */
  dacMonthlySchedules: DacMonthSchedule[]
  /**
   * Latest published DAC regional rates for the calculator and shared UI.
   * Prefer month-specific lookups on the tariff reference page.
   */
  dacRegions: DacRegionRates[]
  ivaRate: number
  monthlyMinimumKwh: number
  tariffOptions: typeof TARIFF_OPTIONS_2026
}

const SNAPSHOTS: Record<number, TariffSnapshot> = {
  2026: {
    meta: TARIFF_SNAPSHOT_META_2026,
    domesticTariffs: DOMESTIC_TARIFFS_2026,
    dacMonthlySchedules: DAC_MONTHLY_SCHEDULES_2026,
    dacRegions: DAC_REGIONS_2026,
    ivaRate: IVA_RATE_2026,
    monthlyMinimumKwh: MONTHLY_MINIMUM_KWH_2026,
    tariffOptions: TARIFF_OPTIONS_2026,
  },
}

/** Years with a registered snapshot, newest first. */
export function getAvailableTariffYears(): number[] {
  return Object.keys(SNAPSHOTS)
    .map(Number)
    .sort((a, b) => b - a)
}

export function getTariffSnapshot(year: number): TariffSnapshot | undefined {
  return SNAPSHOTS[year]
}

/**
 * Prefer the current calendar year when it is registered — even if a future
 * year's data was published early — otherwise fall back to the newest snapshot.
 */
export function resolveDefaultTariffYear(
  availableYears: number[] = getAvailableTariffYears(),
  today: Date = new Date(),
): number {
  if (availableYears.length === 0) {
    throw new Error('No tariff snapshots are registered')
  }
  const currentYear = today.getFullYear()
  if (availableYears.includes(currentYear)) return currentYear
  return Math.max(...availableYears)
}

export function getDefaultTariffSnapshot(
  today: Date = new Date(),
): TariffSnapshot {
  const year = resolveDefaultTariffYear(getAvailableTariffYears(), today)
  const snapshot = getTariffSnapshot(year)
  if (!snapshot) {
    throw new Error(`Missing tariff snapshot for year ${year}`)
  }
  return snapshot
}

/** Calculator and shared UI continue to use the default (current) snapshot. */
const CURRENT = getDefaultTariffSnapshot()

export const TARIFF_SNAPSHOT_META = CURRENT.meta
export const DOMESTIC_TARIFFS = CURRENT.domesticTariffs
export const DAC_REGIONS = CURRENT.dacRegions
export const IVA_RATE = CURRENT.ivaRate
export const MONTHLY_MINIMUM_KWH = CURRENT.monthlyMinimumKwh
export const TARIFF_OPTIONS = CURRENT.tariffOptions
