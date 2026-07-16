import { regionalNotesFor } from '../data/locations'
import { TARIFF_SNAPSHOT_META } from '../data/tariffs-2026'
import { assessDacRisk, buildDailyAllowanceComparison, estimateDomesticBill } from './billing'
import { formatDisplayDate, isSummerMonth, monthNumber, todayISO } from './dates'
import { projectConsumption, validateCalculatorInput } from './projection'
import type { CalculatorInput, FullEstimate, ValidationIssue } from './types'

function formatMoney(value: number): string {
  return new Intl.NumberFormat('es-MX', {
    style: 'currency',
    currency: 'MXN',
  }).format(value)
}

function formatKwh(value: number): string {
  return new Intl.NumberFormat('es-MX', {
    maximumFractionDigits: 2,
  }).format(value)
}

export function buildNarrative(input: CalculatorInput, estimate: FullEstimate): string {
  const { observed } = estimate.projection
  const avg = formatKwh(observed.averageDailyKwh)
  const consumed = formatKwh(observed.consumedKwh)
  const projected = formatKwh(estimate.bill.billedKwh)
  const cycleLabel = input.billingCycle === 'mensual' ? 'mensual' : 'bimestral'
  const daysLabel = estimate.projection.billingDays

  const summerHint =
    input.tariffCode === '1'
      ? 'La tarifa 1 no diferencia temporada de verano.'
      : estimate.bill.seasonMode === 'verano'
        ? 'Todos estos días caen en temporada de verano (rangos subsidiados ampliados).'
        : estimate.bill.seasonMode === 'mixto'
          ? 'El periodo cruza el inicio o fin del verano, por lo que se aplica el tratamiento de periodo mixto.'
          : 'Estos días están fuera de la temporada de verano.'

  const allowanceHint = (() => {
    if (input.tariffCode === 'DAC' || input.tariffCode === '1') return ''
    if (input.summerStartMonth == null) return ''
    const inSummer = isSummerMonth(monthNumber(input.currentReadingDate), input.summerStartMonth)
    if (!inSummer || estimate.bill.seasonMode === 'fuera') {
      return ' Fuera de verano, los rangos subsidiados son menores.'
    }
    return ` En verano, tu tarifa ${input.tariffCode} amplia los bloques de consumo con precio preferente.`
  })()

  return [
    `Como hoy ${formatDisplayDate(input.currentReadingDate)} tu lectura es ${formatKwh(input.currentReading)} y tu lectura anterior del ${formatDisplayDate(input.previousCutoffDate)} era ${formatKwh(input.previousReading)}, en ${observed.elapsedDays} días has usado ${consumed} kWh, un promedio de ${avg} kWh por día.`,
    `Estás en la tarifa ${input.tariffCode} con facturación ${cycleLabel}. ${summerHint}${allowanceHint}`,
    `Si mantienes este ritmo durante el resto del periodo (corte estimado el ${formatDisplayDate(input.nextCutoffDate)}, ${daysLabel} días), el consumo estimado es de ${projected} kWh y el importe aproximado sería ${formatMoney(estimate.bill.total)} (incluye IVA).`,
  ].join('\n\n')
}

export function estimateBill(input: CalculatorInput): {
  issues: ValidationIssue[]
  estimate: FullEstimate | null
} {
  const issues = validateCalculatorInput(input)
  if (issues.length > 0) {
    return { issues, estimate: null }
  }

  const projection = projectConsumption(input)
  const bill = estimateDomesticBill(input, projection.projectedKwh)
  const dacRisk = assessDacRisk(input)
  const regionalNotes = regionalNotesFor(input.stateCode, input.municipality)
  const dailyAllowance = buildDailyAllowanceComparison(
    input,
    projection.observed.averageDailyKwh,
    projection.billingDays,
    bill.seasonMode,
    bill.rateMonth,
    bill.rateYear,
  )

  const estimate: FullEstimate = {
    input,
    projection,
    bill,
    narrative: '',
    dacRisk,
    regionalNotes,
    dataAsOf: TARIFF_SNAPSHOT_META.asOf,
    dailyAllowance,
  }
  estimate.narrative = buildNarrative(input, estimate)
  return { issues: [], estimate }
}

export function createEmptyInput(): CalculatorInput {
  return {
    stateCode: '',
    municipality: '',
    tariffCode: '1B',
    summerStartMonth: 5,
    billingCycle: 'bimestral',
    previousReading: 0,
    currentReading: 0,
    previousCutoffDate: '',
    currentReadingDate: todayISO(),
    nextCutoffDate: '',
    optionalOtherCharges: 0,
    alreadyOnDac: false,
    dacRegionId: 'central',
    historicalMonthlyKwh: [],
  }
}
