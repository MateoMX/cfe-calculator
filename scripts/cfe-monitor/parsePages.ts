import { load, type CheerioAPI } from 'cheerio'
import {
  EXPECTED_AGREEMENTS,
  EXPECTED_DAC,
  EXPECTED_TARIFA_1,
  EXPECTED_TARIFA_1B,
  SPANISH_MONTH_TO_NUMBER,
} from './expectedSchema.ts'
import type {
  DacLimitRow,
  OficioLink,
  ParsedAgreementsPage,
  ParsedDacPage,
  ParsedDomesticCanaryPage,
} from './types.ts'

type SelectEl = ReturnType<CheerioAPI>

function normalizeText(value: string): string {
  return value.replace(/\s+/g, ' ').trim()
}

function findSelectByNameIncludes($: CheerioAPI, needle: string): SelectEl | null {
  let found: SelectEl | null = null
  $('select').each((_i, el) => {
    if (found) return
    const name = $(el).attr('name') ?? $(el).attr('id') ?? ''
    if (name.includes(needle)) found = $(el)
  })
  return found
}

function optionNumbers($: CheerioAPI, $select: SelectEl): number[] {
  const values: number[] = []
  $select.find('option').each((_i, el) => {
    const valueAttr = $(el).attr('value')
    const text = normalizeText($(el).text())
    const fromValue = Number(valueAttr)
    if (Number.isInteger(fromValue) && fromValue > 0) {
      values.push(fromValue)
      return
    }
    const upper = text.toUpperCase()
    const fromLabel = SPANISH_MONTH_TO_NUMBER[upper]
    if (fromLabel != null) {
      values.push(fromLabel)
      return
    }
    if (/^\d{4}$/.test(text)) values.push(Number(text))
  })
  return [...new Set(values)].sort((a, b) => a - b)
}

function selectName($select: SelectEl | null): string | null {
  if ($select == null) return null
  return $select.attr('name') ?? $select.attr('id') ?? null
}

function normalizeTariffCode(raw: string): string {
  const upper = raw.toUpperCase()
  if (upper === '1') return '1'
  const match = /^1([A-F])$/.exec(upper)
  return match ? `1${match[1]}` : upper
}

export function parseAgreementsPage(html: string): ParsedAgreementsPage {
  const $ = load(html)
  const yearSelect = findSelectByNameIncludes($, EXPECTED_AGREEMENTS.yearSelectNameIncludes)
  const years = yearSelect ? optionNumbers($, yearSelect) : []

  const oficios: OficioLink[] = []
  const pushOficio = (title: string, href: string) => {
    const cleanTitle = normalizeText(title)
    if (!cleanTitle.includes(EXPECTED_AGREEMENTS.oficioTitleIncludes)) return
    if (oficios.some((item) => item.title === cleanTitle)) return
    const idMatch = /[?&]id=(\d+)/i.exec(href)
    const yearMatch = /[?&]anio=(\d{4})/i.exec(href) ?? /(\d{4})/.exec(cleanTitle)
    oficios.push({
      title: cleanTitle,
      href,
      id: idMatch?.[1],
      year: yearMatch ? Number(yearMatch[1]) : undefined,
    })
  }

  $('a').each((_i, el) => {
    const href = $(el).attr('href') ?? ''
    const title = normalizeText($(el).text())
    if (
      href.includes(EXPECTED_AGREEMENTS.oficioHrefIncludes) ||
      title.includes(EXPECTED_AGREEMENTS.oficioTitleIncludes)
    ) {
      pushOficio(title, href)
    }
  })

  if (oficios.length === 0) {
    $('td, li').each((_i, el) => {
      const text = normalizeText($(el).text())
      const match = /Oficio\s+SHCP[^\n|]*/i.exec(text)
      if (!match) return
      const href = $(el).find('a').first().attr('href') ?? ''
      pushOficio(match[0], href)
    })
  }

  return {
    years,
    yearSelectName: selectName(yearSelect),
    oficios,
  }
}

export function parseDacPage(html: string): ParsedDacPage {
  const $ = load(html)
  const yearSelect = findSelectByNameIncludes($, EXPECTED_DAC.yearSelectNameIncludes)

  let monthSelect: SelectEl | null = null
  $('select').each((_i, el) => {
    const name = $(el).attr('name') ?? ''
    if (!name.includes(EXPECTED_DAC.monthSelectNameIncludes)) return
    if (name.includes('Anio')) return
    const candidate = $(el)
    const nums = optionNumbers($, candidate)
    if (nums.some((n) => n >= 1 && n <= 12)) monthSelect = candidate
  })

  const dacLimits: DacLimitRow[] = []
  $('tr').each((_i, row) => {
    const cells = $(row)
      .find('td')
      .toArray()
      .map((cell) => normalizeText($(cell).text()))
    if (cells.length < 2) return
    const label = cells[0] ?? ''
    const codeMatch = /^Tarifa\s+(1[A-Fa-f]?)\b/.exec(label)
    if (!codeMatch) return
    const amountCell =
      cells.find((cell, index) => index > 0 && /\d/.test(cell.replace(/,/g, ''))) ?? ''
    const amount = Number(amountCell.replace(/,/g, '').replace(/[^\d.]/g, ''))
    if (!Number.isFinite(amount) || amount <= 0) return
    dacLimits.push({
      tariffCode: normalizeTariffCode(codeMatch[1]!),
      limitKwhMonth: amount,
    })
  })

  return {
    years: yearSelect ? optionNumbers($, yearSelect) : [],
    yearSelectName: selectName(yearSelect),
    monthSelectName: selectName(monthSelect),
    publishedMonths: monthSelect
      ? optionNumbers($, monthSelect).filter((n) => n >= 1 && n <= 12)
      : [],
    dacLimits,
  }
}

export function parseTarifa1Page(html: string): ParsedDomesticCanaryPage {
  const $ = load(html)
  const consult = findSelectByNameIncludes($, EXPECTED_TARIFA_1.consultMonthSelectNameIncludes)
  return {
    page: 'Tarifa1',
    consultMonthSelectName: selectName(consult),
    summerStartSelectName: null,
    consultMonths: consult
      ? optionNumbers($, consult).filter((n) => n >= 1 && n <= 12)
      : [],
  }
}

export function parseTarifa1BPage(html: string): ParsedDomesticCanaryPage {
  const $ = load(html)
  const summer = findSelectByNameIncludes($, EXPECTED_TARIFA_1B.summerStartSelectNameIncludes)
  let consult: SelectEl | null = null
  $('select').each((_i, el) => {
    const name = $(el).attr('name') ?? ''
    if (!name.includes(EXPECTED_TARIFA_1B.consultMonthSelectNameIncludes)) return
    consult = $(el)
  })
  return {
    page: 'Tarifa1B',
    consultMonthSelectName: selectName(consult),
    summerStartSelectName: selectName(summer),
    consultMonths: consult
      ? optionNumbers($, consult).filter((n) => n >= 1 && n <= 12)
      : [],
  }
}

export function parseDacOficioMonthYear(
  title: string,
): { month: number; year: number } | null {
  const match = EXPECTED_AGREEMENTS.dacOficioTitlePattern.exec(title)
  if (!match) return null
  const monthName = match[1]!.toUpperCase()
  const month = SPANISH_MONTH_TO_NUMBER[monthName]
  const year = Number(match[2])
  if (month == null || !Number.isInteger(year)) return null
  return { month, year }
}

export function parseTfsbYear(title: string): number | null {
  const match = EXPECTED_AGREEMENTS.tfsbOficioTitlePattern.exec(title)
  if (!match) return null
  const year = Number(match[1])
  return Number.isInteger(year) ? year : null
}
