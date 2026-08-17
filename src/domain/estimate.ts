import { DOMESTIC_TARIFFS, TARIFF_SNAPSHOT_META } from '../data/tariffs'
import { formatKwh, formatMoney, translate, type Language } from '../i18n'
import {
  assessDacRisk,
  buildDailyAllowanceComparison,
  estimateDomesticBill,
  requiredHistorySlots,
} from './billing'
import { formatDisplayDate, isSummerMonth, monthNumber, todayISO } from './dates'
import { projectConsumption, validateCalculatorInput } from './projection'
import type { CalculatorInput, FullEstimate, ValidationIssue } from './types'

export function buildNarrative(
  input: CalculatorInput,
  estimate: FullEstimate,
  language: Language = 'es',
): string {
  const { observed } = estimate.projection
  const avg = formatKwh(observed.averageDailyKwh, language)
  const consumed = formatKwh(observed.consumedKwh, language)
  const projected = formatKwh(estimate.bill.billedKwh, language)
  const cycleLabel =
    input.billingCycle === 'mensual'
      ? translate(language, 'form.cycleWordMensual')
      : translate(language, 'form.cycleWordBimestral')
  const daysLabel = estimate.projection.billingDays

  const summerHint =
    input.tariffCode === '1'
      ? translate(language, 'narrative.summerTariff1')
      : estimate.bill.seasonMode === 'verano'
        ? translate(language, 'narrative.summerAll')
        : estimate.bill.seasonMode === 'mixto'
          ? translate(language, 'narrative.summerMixto')
          : translate(language, 'narrative.summerFuera')

  const allowanceHint = (() => {
    if (input.tariffCode === 'DAC' || input.tariffCode === '1') return ''
    if (input.summerStartMonth == null) return ''
    const inSummer = isSummerMonth(monthNumber(input.currentReadingDate), input.summerStartMonth)
    if (!inSummer || estimate.bill.seasonMode === 'fuera') {
      return translate(language, 'narrative.allowanceFuera')
    }
    const tariff = DOMESTIC_TARIFFS[input.tariffCode]
    const rateMonth = monthNumber(input.currentReadingDate)
    const summerBasicRate = tariff.monthlyRates.find(
      (rate) => rate.month === rateMonth && rate.season === 'verano',
    )?.prices.basico
    const nonSummerBasicRate = tariff.monthlyRates.find(
      (rate) => rate.month === rateMonth && rate.season === 'fuera',
    )?.prices.basico
    const hasLowerBasicRate =
      summerBasicRate != null &&
      nonSummerBasicRate != null &&
      summerBasicRate < nonSummerBasicRate

    return translate(language, 'narrative.allowanceVerano', {
      lowerBasicRateHint: hasLowerBasicRate
        ? translate(language, 'narrative.lowerBasicRate')
        : '',
    })
  })()

  return [
    translate(language, 'narrative.p1', {
      currentDate: formatDisplayDate(input.currentReadingDate, language),
      currentReading: formatKwh(input.currentReading, language),
      previousDate: formatDisplayDate(input.previousCutoffDate, language),
      previousReading: formatKwh(input.previousReading, language),
      elapsedDays: observed.elapsedDays,
      consumed,
      avg,
    }),
    translate(language, 'narrative.p2', {
      tariff: input.tariffCode,
      cycle: cycleLabel,
      summerHint,
      allowanceHint,
    }),
    translate(language, 'narrative.p3', {
      nextCutoff: formatDisplayDate(input.nextCutoffDate, language),
      billingDays: daysLabel,
      projected,
      total: formatMoney(estimate.bill.total, language),
    }),
  ].join('\n\n')
}

export function estimateBill(
  input: CalculatorInput,
  language: Language = 'es',
): {
  issues: ValidationIssue[]
  estimate: FullEstimate | null
} {
  const issues = validateCalculatorInput(input, language)
  if (issues.length > 0) {
    return { issues, estimate: null }
  }

  const projection = projectConsumption(input)
  const bill = estimateDomesticBill(input, projection.projectedKwh, language)
  const dacRisk = assessDacRisk(input, projection, language)
  const dailyAllowance = buildDailyAllowanceComparison(
    input,
    projection.observed.averageDailyKwh,
    projection.billingDays,
    bill.seasonMode,
    bill.rateMonth,
    bill.rateYear,
    language,
  )

  const estimate: FullEstimate = {
    input,
    projection,
    bill,
    narrative: '',
    dacRisk,
    dataAsOf: TARIFF_SNAPSHOT_META.asOf,
    dailyAllowance,
  }
  estimate.narrative = buildNarrative(input, estimate, language)
  return { issues: [], estimate }
}

export function createEmptyInput(): CalculatorInput {
  return {
    tariffCode: '1B',
    summerStartMonth: 4,
    billingCycle: 'bimestral',
    previousReading: 0,
    currentReading: 0,
    previousCutoffDate: '',
    currentReadingDate: todayISO(),
    nextCutoffDate: '',
    optionalOtherCharges: 0,
    dacRegionId: 'central',
    historicalPeriodKwh: Array.from({ length: 6 }, () => null),
  }
}

export { requiredHistorySlots }

/** Resize / clear history slots when the billing cycle changes. */
export function resizeHistoryForCycle(
  previous: Array<number | null>,
  nextCycle: CalculatorInput['billingCycle'],
  previousCycle: CalculatorInput['billingCycle'],
): Array<number | null> {
  const nextLength = requiredHistorySlots(nextCycle)
  if (previousCycle === nextCycle) {
    const padded = previous.slice(0, nextLength)
    while (padded.length < nextLength) padded.push(null)
    return padded
  }
  // Monthly ↔ bimonthly conversion would invent data; start fresh.
  return Array.from({ length: nextLength }, () => null)
}
