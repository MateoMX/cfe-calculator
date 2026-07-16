import { calendarDaysBetween } from './dates'
import type { BillingCycle, CalculatorInput, ProjectionResult, ValidationIssue } from './types'

export function validateCalculatorInput(input: CalculatorInput): ValidationIssue[] {
  const issues: ValidationIssue[] = []

  if (!input.tariffCode) {
    issues.push({ field: 'tariffCode', message: 'Indica la tarifa de tu recibo.' })
  }
  if (input.tariffCode !== '1' && input.summerStartMonth == null) {
    issues.push({
      field: 'summerStartMonth',
      message: 'Indica el mes en que comienza el verano en tu localidad (aparece en CFE o en tu recibo).',
    })
  }
  if (input.tariffCode === 'DAC' && !input.dacRegionId) {
    issues.push({ field: 'dacRegionId', message: 'Selecciona la región DAC de tu recibo.' })
  }
  if (!Number.isFinite(input.previousReading) || input.previousReading < 0) {
    issues.push({ field: 'previousReading', message: 'La lectura anterior debe ser un número válido.' })
  }
  if (!Number.isFinite(input.currentReading) || input.currentReading < 0) {
    issues.push({ field: 'currentReading', message: 'La lectura actual debe ser un número válido.' })
  }
  if (
    Number.isFinite(input.previousReading) &&
    Number.isFinite(input.currentReading) &&
    input.currentReading < input.previousReading
  ) {
    issues.push({
      field: 'currentReading',
      message: 'La lectura actual no puede ser menor que la lectura anterior.',
    })
  }
  if (!input.previousCutoffDate) {
    issues.push({ field: 'previousCutoffDate', message: 'Indica la fecha de corte del recibo anterior.' })
  }
  if (!input.currentReadingDate) {
    issues.push({ field: 'currentReadingDate', message: 'Indica la fecha de tu lectura actual.' })
  }
  if (!input.nextCutoffDate) {
    issues.push({ field: 'nextCutoffDate', message: 'Indica la fecha estimada del próximo corte.' })
  }

  if (input.previousCutoffDate && input.currentReadingDate) {
    const elapsed = calendarDaysBetween(input.previousCutoffDate, input.currentReadingDate)
    if (elapsed <= 0) {
      issues.push({
        field: 'currentReadingDate',
        message: 'La lectura actual debe ser posterior a la fecha de corte anterior.',
      })
    }
  }

  if (input.previousCutoffDate && input.nextCutoffDate) {
    const billingDays = calendarDaysBetween(input.previousCutoffDate, input.nextCutoffDate)
    if (billingDays <= 0) {
      issues.push({
        field: 'nextCutoffDate',
        message: 'El próximo corte debe ser posterior a la fecha de corte anterior.',
      })
    }
  }

  if (
    input.previousCutoffDate &&
    input.currentReadingDate &&
    input.nextCutoffDate &&
    calendarDaysBetween(input.currentReadingDate, input.nextCutoffDate) < 0
  ) {
    issues.push({
      field: 'currentReadingDate',
      message:
        'La fecha de lectura rebasa el corte estimado. Revisa el corte anterior o el ciclo de facturación.',
    })
  }

  if (input.optionalOtherCharges < 0) {
    issues.push({
      field: 'optionalOtherCharges',
      message: 'Los cargos adicionales no pueden ser negativos.',
    })
  }

  return issues
}

export function projectConsumption(input: CalculatorInput): ProjectionResult {
  const elapsedDays = calendarDaysBetween(input.previousCutoffDate, input.currentReadingDate)
  const billingDays = calendarDaysBetween(input.previousCutoffDate, input.nextCutoffDate)
  const consumedKwh = input.currentReading - input.previousReading
  const averageDailyKwh = elapsedDays > 0 ? consumedKwh / elapsedDays : 0
  const remainingDays = Math.max(0, calendarDaysBetween(input.currentReadingDate, input.nextCutoffDate))
  const projectedKwh = averageDailyKwh * billingDays

  return {
    billingDays,
    remainingDays,
    projectedKwh,
    observed: {
      consumedKwh,
      elapsedDays,
      averageDailyKwh,
    },
  }
}

export function nominalBillingDays(cycle: BillingCycle): number {
  return cycle === 'mensual' ? 30 : 60
}
