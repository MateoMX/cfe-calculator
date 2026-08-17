import { readFileSync } from 'node:fs'
import path from 'node:path'
import { describe, expect, it } from 'vitest'
import {
  parseAgreementsPage,
  parseDacOficioMonthYear,
  parseDacPage,
  parseTarifa1BPage,
  parseTarifa1Page,
  parseTfsbYear,
} from './parsePages.ts'

const fixturesDir = path.join(import.meta.dirname, 'fixtures')

function fixture(name: string): string {
  return readFileSync(path.join(fixturesDir, name), 'utf8')
}

describe('parseAgreementsPage', () => {
  it('extracts years and oficio links including unquoted-style titles', () => {
    const parsed = parseAgreementsPage(fixture('agreements-healthy.html'))
    expect(parsed.yearSelectName).toContain('ddAnio')
    expect(parsed.years).toEqual([2025, 2026])
    expect(parsed.oficios.map((item) => item.title)).toEqual(
      expect.arrayContaining([
        'Oficio SHCP 349-B-1-069 Tarifa DAC julio 2026',
        'Oficio SHCP 349-B-1-070 TFSB Domésticas y Factor de Ajuste 2026',
      ]),
    )
  })
})

describe('parseDacPage', () => {
  it('reads consecutive published months and DAC limits', () => {
    const parsed = parseDacPage(fixture('dac-august.html'))
    expect(parsed.monthSelectName).toContain('ddMes')
    expect(parsed.publishedMonths).toEqual([1, 2, 3, 4, 5, 6, 7, 8])
    expect(parsed.dacLimits).toEqual(
      expect.arrayContaining([
        { tariffCode: '1', limitKwhMonth: 250 },
        { tariffCode: '1B', limitKwhMonth: 400 },
        { tariffCode: '1F', limitKwhMonth: 2500 },
      ]),
    )
  })
})

describe('domestic canaries', () => {
  it('parses Tarifa 1 and Tarifa 1B select contracts', () => {
    const tarifa1 = parseTarifa1Page(fixture('tarifa1.html'))
    const tarifa1b = parseTarifa1BPage(fixture('tarifa1b.html'))
    expect(tarifa1.consultMonthSelectName).toContain('ddMesConsulta')
    expect(tarifa1.consultMonths).toHaveLength(12)
    expect(tarifa1b.summerStartSelectName).toContain('ddMesVerano')
    expect(tarifa1b.consultMonthSelectName).toContain('ddMesConsulta')
  })
})

describe('oficio title helpers', () => {
  it('parses DAC month/year and TFSB year', () => {
    expect(parseDacOficioMonthYear('Oficio SHCP 349-B-1-080 Tarifa DAC agosto 2026')).toEqual({
      month: 8,
      year: 2026,
    })
    expect(
      parseTfsbYear('Oficio SHCP 349-B-1-070 TFSB Domésticas y Factor de Ajuste 2026'),
    ).toBe(2026)
  })
})
