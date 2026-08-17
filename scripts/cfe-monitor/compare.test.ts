import { readFileSync } from 'node:fs'
import path from 'node:path'
import { describe, expect, it } from 'vitest'
import { classifyResult, compareToBaseline, validateStructure } from './compare.ts'
import {
  parseAgreementsPage,
  parseDacPage,
  parseTarifa1BPage,
  parseTarifa1Page,
} from './parsePages.ts'
import type { LiveExtract, RepoBaseline } from './types.ts'

const fixturesDir = path.join(import.meta.dirname, 'fixtures')

function fixture(name: string): string {
  return readFileSync(path.join(fixturesDir, name), 'utf8')
}

function liveFrom(
  agreements: string,
  dac: string,
  tarifa1 = 'tarifa1.html',
  tarifa1b = 'tarifa1b.html',
): LiveExtract {
  return {
    agreements: parseAgreementsPage(fixture(agreements)),
    dac: parseDacPage(fixture(dac)),
    tarifa1: parseTarifa1Page(fixture(tarifa1)),
    tarifa1b: parseTarifa1BPage(fixture(tarifa1b)),
  }
}

const repo: RepoBaseline = {
  asOf: '2026-07-16',
  years: [2026],
  latestDacYear: 2026,
  latestDacMonth: 7,
  dacLimits: {
    '1': 250,
    '1A': 300,
    '1B': 400,
    '1C': 850,
    '1D': 1000,
    '1E': 2000,
    '1F': 2500,
  },
  sourceUrl: 'https://app.cfe.mx/Aplicaciones/CCFE/Tarifas/TarifasCRECasa/',
  agreementsUrl:
    'https://app.cfe.mx/Aplicaciones/CCFE/Tarifas/TarifasCRECasa/Acuerdos/AcuerdosCasa.aspx',
  dacUrl: 'https://app.cfe.mx/Aplicaciones/CCFE/Tarifas/TarifasCRECasa/Tarifas/TarifaDAC.aspx',
  tarifa1Url: 'https://example.test/Tarifa1.aspx',
  tarifa1bUrl: 'https://example.test/Tarifa1B.aspx',
}

describe('validateStructure + compareToBaseline', () => {
  it('reports no_changes when live markers match the July baseline', () => {
    const live = liveFrom('agreements-healthy.html', 'dac-july.html')
    const findings = [...validateStructure(live), ...compareToBaseline(live, repo)]
    expect(classifyResult(findings)).toBe('no_changes')
  })

  it('reports rates_found when DAC August appears ahead of repo July', () => {
    const live = liveFrom('agreements-august-dac.html', 'dac-august.html')
    const structure = validateStructure(live)
    expect(classifyResult(structure)).toBe('no_changes')
    const findings = compareToBaseline(live, repo)
    expect(classifyResult(findings)).toBe('rates_found')
    expect(findings.some((f) => f.code === 'dac_month_ahead')).toBe(true)
    expect(findings.some((f) => f.code === 'dac_oficio_ahead')).toBe(true)
    expect(findings.every((f) => f.tariffKind === 'DAC' || f.code.startsWith('dac_'))).toBe(true)
  })

  it('reports rates_found for a new domestic TFSB year', () => {
    const live = liveFrom('agreements-new-year.html', 'dac-july.html')
    const findings = compareToBaseline(live, repo)
    expect(classifyResult(findings)).toBe('rates_found')
    expect(findings.some((f) => f.code === 'domestic_tfsb_new_year')).toBe(true)
    expect(findings.some((f) => f.code === 'new_year_on_portal')).toBe(true)
  })

  it('reports unable_to_check when DAC structure breaks', () => {
    const live = liveFrom('agreements-healthy.html', 'dac-broken.html')
    const findings = validateStructure(live)
    expect(classifyResult(findings)).toBe('unable_to_check')
    expect(findings.some((f) => f.kind === 'structure_change')).toBe(true)
  })

  it('repeats the same rates_found classification on identical inputs', () => {
    const live = liveFrom('agreements-august-dac.html', 'dac-august.html')
    const first = classifyResult(compareToBaseline(live, repo))
    const second = classifyResult(compareToBaseline(live, repo))
    expect(first).toBe('rates_found')
    expect(second).toBe('rates_found')
  })
})
