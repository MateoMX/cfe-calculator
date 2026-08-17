import {
  getAvailableTariffYears,
  getDefaultTariffSnapshot,
  getTariffSnapshot,
} from '../../src/data/tariffs.ts'
import type { RepoBaseline } from './types.ts'

function joinUrl(base: string, relative: string): string {
  const normalized = base.endsWith('/') ? base : `${base}/`
  return new URL(relative, normalized).toString()
}

export function loadRepoBaseline(): RepoBaseline {
  const years = getAvailableTariffYears()
  const current = getDefaultTariffSnapshot()
  const dacLimits: Record<string, number> = {}
  for (const [code, tariff] of Object.entries(current.domesticTariffs)) {
    dacLimits[code] = tariff.dacLimitKwhMonth
  }

  let latestDacYear = current.meta.year
  let latestDacMonth = 0
  for (const year of years) {
    const snapshot = getTariffSnapshot(year)
    if (!snapshot) continue
    for (const schedule of snapshot.dacMonthlySchedules) {
      const value = schedule.year * 12 + schedule.month
      if (value > latestDacYear * 12 + latestDacMonth) {
        latestDacYear = schedule.year
        latestDacMonth = schedule.month
      }
    }
  }

  if (latestDacMonth === 0) {
    throw new Error('No DAC monthly schedules are registered in the repository')
  }

  const sourceUrl = current.meta.sourceUrl
  return {
    asOf: current.meta.asOf,
    years,
    latestDacYear,
    latestDacMonth,
    dacLimits,
    sourceUrl,
    agreementsUrl: current.meta.agreementsUrl,
    dacUrl: current.meta.dacUrl,
    tarifa1Url: joinUrl(sourceUrl, 'Tarifas/Tarifa1.aspx'),
    tarifa1bUrl: joinUrl(sourceUrl, 'Tarifas/Tarifa1B.aspx'),
  }
}
