import {
  EXPECTED_AGREEMENTS,
  EXPECTED_DAC,
  EXPECTED_TARIFA_1,
  EXPECTED_TARIFA_1B,
  NUMBER_TO_SPANISH_MONTH,
} from './expectedSchema.ts'
import { parseDacOficioMonthYear, parseTfsbYear } from './parsePages.ts'
import type { Finding, LiveExtract, MonitorResult, RepoBaseline } from './types.ts'

function ymKey(year: number, month: number): number {
  return year * 12 + month
}

function isConsecutiveMonths(months: number[]): boolean {
  if (months.length === 0) return false
  for (let i = 0; i < months.length; i += 1) {
    if (months[i] !== i + 1) return false
  }
  return true
}

export function validateStructure(live: LiveExtract): Finding[] {
  const findings: Finding[] = []

  if (!live.agreements.yearSelectName?.includes(EXPECTED_AGREEMENTS.yearSelectNameIncludes)) {
    findings.push({
      kind: 'structure_change',
      code: 'agreements_year_select_missing',
      summary:
        'Agreements page is missing the expected year select control (name containing ddAnio).',
      clearBy:
        'Update scripts/cfe-monitor/expectedSchema.ts and parsers after confirming the new CFE markup.',
      sourceUrl: undefined,
    })
  }

  if (live.agreements.oficios.length === 0) {
    findings.push({
      kind: 'structure_change',
      code: 'agreements_oficios_missing',
      summary:
        'Agreements page has no Oficio SHCP / DescargaAcuerdo links matching the expected pattern.',
      clearBy:
        'Update scripts/cfe-monitor/parsePages.ts / expectedSchema.ts after inspecting the live HTML.',
    })
  }

  if (!live.dac.yearSelectName?.includes(EXPECTED_DAC.yearSelectNameIncludes)) {
    findings.push({
      kind: 'structure_change',
      code: 'dac_year_select_missing',
      summary: 'DAC page is missing the expected year select control.',
      clearBy:
        'Update scripts/cfe-monitor/expectedSchema.ts and parsers after confirming the new CFE markup.',
    })
  }

  if (!live.dac.monthSelectName?.includes(EXPECTED_DAC.monthSelectNameIncludes)) {
    findings.push({
      kind: 'structure_change',
      code: 'dac_month_select_missing',
      summary: 'DAC page is missing the expected month select control (name containing ddMes).',
      clearBy:
        'Update scripts/cfe-monitor/expectedSchema.ts and parsers after confirming the new CFE markup.',
    })
  } else if (!isConsecutiveMonths(live.dac.publishedMonths)) {
    findings.push({
      kind: 'structure_change',
      code: 'dac_month_options_unexpected',
      summary: `DAC month select options are not consecutive 1..N Spanish/numeric months (got: ${live.dac.publishedMonths.join(', ') || 'none'}).`,
      clearBy:
        'Update scripts/cfe-monitor/parsePages.ts / expectedSchema.ts if CFE changed month encoding.',
    })
  }

  const limitCodes = new Set(live.dac.dacLimits.map((row) => row.tariffCode))
  for (const code of EXPECTED_DAC.expectedLimitCodes) {
    if (!limitCodes.has(code)) {
      findings.push({
        kind: 'structure_change',
        code: 'dac_limit_row_missing',
        summary: `DAC high-consumption limit table is missing Tarifa ${code}.`,
        clearBy:
          'Update scripts/cfe-monitor/parsePages.ts after confirming the DAC limit table markup.',
        tariffKind: 'DAC',
      })
    }
  }

  if (
    !live.tarifa1.consultMonthSelectName?.includes(
      EXPECTED_TARIFA_1.consultMonthSelectNameIncludes,
    )
  ) {
    findings.push({
      kind: 'structure_change',
      code: 'tarifa1_consult_select_missing',
      summary: 'Tarifa 1 canary page is missing the expected consult-month select.',
      clearBy:
        'Update scripts/cfe-monitor/expectedSchema.ts and parsers after confirming the new CFE markup.',
      tariffKind: 'domestic',
    })
  }

  if (
    !live.tarifa1b.summerStartSelectName?.includes(
      EXPECTED_TARIFA_1B.summerStartSelectNameIncludes,
    )
  ) {
    findings.push({
      kind: 'structure_change',
      code: 'tarifa1b_summer_select_missing',
      summary: 'Tarifa 1B canary page is missing the expected summer-start select.',
      clearBy:
        'Update scripts/cfe-monitor/expectedSchema.ts and parsers after confirming the new CFE markup.',
      tariffKind: 'domestic',
    })
  }

  if (
    !live.tarifa1b.consultMonthSelectName?.includes(
      EXPECTED_TARIFA_1B.consultMonthSelectNameIncludes,
    )
  ) {
    findings.push({
      kind: 'structure_change',
      code: 'tarifa1b_consult_select_missing',
      summary: 'Tarifa 1B canary page is missing the expected consult-month select.',
      clearBy:
        'Update scripts/cfe-monitor/expectedSchema.ts and parsers after confirming the new CFE markup.',
      tariffKind: 'domestic',
    })
  }

  return findings
}

export function compareToBaseline(live: LiveExtract, repo: RepoBaseline): Finding[] {
  const findings: Finding[] = []
  const covered = ymKey(repo.latestDacYear, repo.latestDacMonth)

  const dacMaxMonth = live.dac.publishedMonths.at(-1)
  if (dacMaxMonth != null) {
    // Assume selected year on DAC page is the newest available year from the year select,
    // falling back to repo latest DAC year.
    const dacYear =
      live.dac.years.filter((year) => year >= repo.latestDacYear).sort((a, b) => b - a)[0] ??
      repo.latestDacYear
    if (ymKey(dacYear, dacMaxMonth) > covered) {
      findings.push({
        kind: 'new_data',
        code: 'dac_month_ahead',
        summary: `DAC portal lists month ${dacMaxMonth} (${NUMBER_TO_SPANISH_MONTH[dacMaxMonth] ?? dacMaxMonth}) for ${dacYear}, beyond repo coverage ${repo.latestDacYear}-${String(repo.latestDacMonth).padStart(2, '0')}.`,
        clearBy:
          'Add the new DAC month to DAC_MONTHLY_SCHEDULES in the year snapshot, bump TARIFF_SNAPSHOT_META.asOf, and update tests.',
        tariffKind: 'DAC',
        year: dacYear,
        month: dacMaxMonth,
        sourceUrl: repo.dacUrl,
      })
    }
  }

  for (const oficio of live.agreements.oficios) {
    const dac = parseDacOficioMonthYear(oficio.title)
    if (dac && ymKey(dac.year, dac.month) > covered) {
      findings.push({
        kind: 'new_data',
        code: 'dac_oficio_ahead',
        summary: `New DAC oficio beyond repo coverage: ${oficio.title}`,
        clearBy:
          'Import the new DAC month rates into the year snapshot, bump asOf, and update tests.',
        tariffKind: 'DAC',
        year: dac.year,
        month: dac.month,
        sourceUrl: repo.agreementsUrl,
      })
    }

    const tfsbYear = parseTfsbYear(oficio.title)
    if (tfsbYear != null && !repo.years.includes(tfsbYear)) {
      findings.push({
        kind: 'new_data',
        code: 'domestic_tfsb_new_year',
        summary: `Domestic TFSB agreement for ${tfsbYear} is published but not registered in the repo: ${oficio.title}`,
        clearBy:
          'Create src/data/tariffs-YYYY.ts, register it in src/data/tariffs.ts, bump asOf, and update tests.',
        tariffKind: 'domestic',
        year: tfsbYear,
        sourceUrl: repo.agreementsUrl,
      })
    }
  }

  const portalYears = new Set([...live.agreements.years, ...live.dac.years])
  for (const year of portalYears) {
    if (year >= Math.min(...repo.years) && !repo.years.includes(year)) {
      // Only alert for current/future years relative to newest repo year
      if (year >= Math.max(...repo.years)) {
        findings.push({
          kind: 'new_data',
          code: 'new_year_on_portal',
          summary: `CFE year selector includes ${year}, which is not registered in SNAPSHOTS.`,
          clearBy:
            'Add tariffs-YYYY.ts and register the snapshot in src/data/tariffs.ts when official rates are available.',
          tariffKind: 'domestic',
          year,
          sourceUrl: repo.sourceUrl,
        })
      }
    }
  }

  for (const row of live.dac.dacLimits) {
    const expected = repo.dacLimits[row.tariffCode]
    if (expected != null && expected !== row.limitKwhMonth) {
      findings.push({
        kind: 'new_data',
        code: 'dac_limit_drift',
        summary: `DAC high-consumption limit for Tarifa ${row.tariffCode} is ${row.limitKwhMonth} kWh/mes on CFE, but repo has ${expected}.`,
        clearBy:
          'Update dacLimitKwhMonth in the year snapshot (and tariffs.test.ts expectedLimits).',
        tariffKind: 'DAC',
        sourceUrl: repo.dacUrl,
      })
    }
  }

  return dedupeFindings(findings)
}

function dedupeFindings(findings: Finding[]): Finding[] {
  const seen = new Set<string>()
  const out: Finding[] = []
  for (const finding of findings) {
    const key = [
      finding.code,
      finding.year ?? '',
      finding.month ?? '',
      finding.tariffKind ?? '',
      finding.summary,
    ].join('|')
    if (seen.has(key)) continue
    seen.add(key)
    out.push(finding)
  }
  return out
}

export function classifyResult(findings: Finding[]): MonitorResult {
  if (findings.some((finding) => finding.kind === 'structure_change' || finding.kind === 'fetch_error')) {
    return 'unable_to_check'
  }
  if (findings.some((finding) => finding.kind === 'new_data')) {
    return 'rates_found'
  }
  return 'no_changes'
}
