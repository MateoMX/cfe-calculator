import { translate, type Language } from '../i18n'
import { calendarDaysBetween } from './dates'
import type { BillingCycle, CalculatorInput, ProjectionResult, ValidationIssue } from './types'

export function validateCalculatorInput(
  input: CalculatorInput,
  language: Language = 'es',
): ValidationIssue[] {
  const issues: ValidationIssue[] = []
  const t = (key: Parameters<typeof translate>[1], params?: Record<string, string | number>) =>
    translate(language, key, params)

  if (!input.tariffCode) {
    issues.push({ field: 'tariffCode', message: t('validation.tariffRequired') })
  }
  if (input.tariffCode !== '1' && input.summerStartMonth == null) {
    issues.push({
      field: 'summerStartMonth',
      message: t('validation.summerRequired'),
    })
  }
  if (input.tariffCode === 'DAC' && !input.dacRegionId) {
    issues.push({ field: 'dacRegionId', message: t('validation.dacRegionRequired') })
  }
  if (!Number.isFinite(input.previousReading) || input.previousReading < 0) {
    issues.push({ field: 'previousReading', message: t('validation.previousReadingInvalid') })
  }
  if (!Number.isFinite(input.currentReading) || input.currentReading < 0) {
    issues.push({ field: 'currentReading', message: t('validation.currentReadingInvalid') })
  }
  if (
    Number.isFinite(input.previousReading) &&
    Number.isFinite(input.currentReading) &&
    input.currentReading < input.previousReading
  ) {
    issues.push({
      field: 'currentReading',
      message: t('validation.currentReadingTooLow'),
    })
  }
  if (!input.previousCutoffDate) {
    issues.push({ field: 'previousCutoffDate', message: t('validation.previousCutoffRequired') })
  }
  if (!input.currentReadingDate) {
    issues.push({ field: 'currentReadingDate', message: t('validation.currentReadingDateRequired') })
  }
  if (!input.nextCutoffDate) {
    issues.push({ field: 'nextCutoffDate', message: t('validation.nextCutoffRequired') })
  }

  if (input.previousCutoffDate && input.currentReadingDate) {
    const elapsed = calendarDaysBetween(input.previousCutoffDate, input.currentReadingDate)
    if (elapsed <= 0) {
      issues.push({
        field: 'currentReadingDate',
        message: t('validation.currentReadingDateOrder'),
      })
    }
  }

  if (input.previousCutoffDate && input.nextCutoffDate) {
    const billingDays = calendarDaysBetween(input.previousCutoffDate, input.nextCutoffDate)
    if (billingDays <= 0) {
      issues.push({
        field: 'nextCutoffDate',
        message: t('validation.nextCutoffOrder'),
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
      message: t('validation.readingPastCutoff'),
    })
  }

  if (input.optionalOtherCharges < 0) {
    issues.push({
      field: 'optionalOtherCharges',
      message: t('validation.otherChargesNegative'),
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
  const projectedKwh = Math.round(averageDailyKwh * billingDays)

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
