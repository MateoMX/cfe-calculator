import {
  DAC_REGIONS,
  DOMESTIC_TARIFFS,
  IVA_RATE,
  MONTHLY_MINIMUM_KWH,
  TARIFF_SNAPSHOT_META,
} from '../data/tariffs'
import {
  blockLabel,
  formatKwh,
  formatMonthLabel,
  translate,
  type Language,
} from '../i18n'
import {
  addDays,
  calendarDaysBetween,
  countSummerDaysInPeriod,
  formatDisplayDate,
  isSummerMonth,
  mixedSeasonInclusiveRanges,
  monthNumber,
  yearNumber,
} from './dates'
import type {
  BillEstimate,
  BillLine,
  BillingCycle,
  BlockKey,
  CalculatorInput,
  DacRisk,
  DailyAllowanceComparison,
  DailyAllowanceProfile,
  DailyBandThreshold,
  DomesticTariffCode,
  MixedPeriodBreakdown,
  MonthNumber,
  ProjectionResult,
  RateBlock,
  Season,
  SummerStartMonth,
} from './types'

/** Official DAC limit is monthly; convert to a daily pace for comparisons (≈ 30-day month). */
export function dacLimitDailyFromMonthly(limitKwhMonth: number): number {
  return limitKwhMonth / 30
}

/** Display period for subsidised-usage figures (allowances stay monthly; usage stays daily). */
export type AllowanceDisplayScale = 'daily' | 'monthly' | 'bimonthly'

/**
 * Scale an official monthly kWh value for display.
 * Monthly is canonical; bimonthly is exact ×2; daily is ÷30 (no intermediate rounding).
 */
export function scaleMonthlyAllowanceKwh(
  monthlyKwh: number,
  scale: AllowanceDisplayScale,
): number {
  if (scale === 'bimonthly') return monthlyKwh * 2
  if (scale === 'daily') return monthlyKwh / 30
  return monthlyKwh
}

/**
 * Scale an observed daily usage pace for display.
 * Daily is canonical for usage; monthly/bimonthly are ×30 / ×60.
 */
export function scaleDailyUsageKwh(dailyKwh: number, scale: AllowanceDisplayScale): number {
  if (scale === 'monthly') return dailyKwh * 30
  if (scale === 'bimonthly') return dailyKwh * 60
  return dailyKwh
}

/**
 * Scale a period-total kWh value (mixto chart geometry) for display.
 * Daily = ÷ periodDays; monthly/bimonthly normalize to 30/60-day conventions.
 */
export function scalePeriodAllowanceKwh(
  periodKwh: number,
  periodDays: number,
  scale: AllowanceDisplayScale,
): number {
  const days = Math.max(1, periodDays)
  if (scale === 'daily') return periodKwh / days
  if (scale === 'monthly') return (periodKwh * 30) / days
  return (periodKwh * 60) / days
}

/** Split a period total into summer / non-summer kWh by calendar day share. */
export function splitPeriodKwhBySeasonDays(
  periodKwh: number,
  summerDays: number,
  periodDays: number,
): { summerKwh: number; nonSummerKwh: number; nonSummerDays: number } {
  const days = Math.max(0, periodDays)
  const summer = Math.min(Math.max(0, summerDays), days)
  const nonSummerDays = Math.max(0, days - summer)
  if (days <= 0) {
    return { summerKwh: 0, nonSummerKwh: Math.max(0, periodKwh), nonSummerDays: 0 }
  }
  const summerKwh = Math.max(0, periodKwh) * (summer / days)
  const nonSummerKwh = Math.max(0, periodKwh) - summerKwh
  return { summerKwh, nonSummerKwh, nonSummerDays }
}

export function allowancePeriodUnitKey(
  scale: AllowanceDisplayScale,
): 'allowance.perDay' | 'allowance.perMonth' | 'allowance.perBimonth' {
  if (scale === 'monthly') return 'allowance.perMonth'
  if (scale === 'bimonthly') return 'allowance.perBimonth'
  return 'allowance.perDay'
}

export function requiredHistorySlots(billingCycle: BillingCycle): number {
  return billingCycle === 'mensual' ? 12 : 6
}

function filledHistoryValues(history: Array<number | null>): number[] {
  return history.filter(
    (value): value is number => value != null && Number.isFinite(value) && value >= 0,
  )
}

/**
 * Official monthly average for DAC: sum of period consumptions over the last 12 months ÷ 12.
 * Mensual: 12 monthly totals. Bimestral: 6 whole-receipt totals (each covers ~2 months).
 */
export function averageMonthlyFromHistory(
  history: Array<number | null>,
  billingCycle: BillingCycle,
): number | null {
  const required = requiredHistorySlots(billingCycle)
  const filled = filledHistoryValues(history)
  if (filled.length !== required || history.length < required) return null
  // Ensure the first `required` slots are all filled (no gaps).
  const window = history.slice(0, required)
  if (window.some((value) => value == null || !Number.isFinite(value) || value < 0)) {
    return null
  }
  const sum = window.reduce<number>((total, value) => total + (value as number), 0)
  return roundKwh(sum / 12)
}

/**
 * Next rolling monthly average after the current projected period replaces the oldest period.
 * History index 0 = most recent completed period; last index = oldest.
 */
export function projectedNextMonthlyAverage(
  history: Array<number | null>,
  billingCycle: BillingCycle,
  projectedPeriodKwh: number,
): number | null {
  const required = requiredHistorySlots(billingCycle)
  const window = history.slice(0, required)
  if (
    window.length !== required ||
    window.some((value) => value == null || !Number.isFinite(value) || value < 0)
  ) {
    return null
  }
  // Drop oldest (last), keep the newer required-1 periods, add the projected current period.
  const kept = window.slice(0, required - 1) as number[]
  const sum = kept.reduce((total, value) => total + value, 0) + Math.max(0, projectedPeriodKwh)
  return roundKwh(sum / 12)
}

function roundMoney(value: number): number {
  return Math.round((value + Number.EPSILON) * 100) / 100
}

function roundKwh(value: number): number {
  return Math.round((value + Number.EPSILON) * 1000) / 1000
}

function scaleBlocks(blocks: RateBlock[], months: number): RateBlock[] {
  return blocks.map((block) => ({
    ...block,
    allowanceKwh: Number.isFinite(block.allowanceKwh)
      ? block.allowanceKwh * months
      : block.allowanceKwh,
  }))
}

function allocateKwh(totalKwh: number, blocks: RateBlock[]): Array<{ block: RateBlock; kwh: number }> {
  let remaining = Math.max(0, totalKwh)
  return blocks.map((block) => {
    const take = Number.isFinite(block.allowanceKwh)
      ? Math.min(remaining, block.allowanceKwh)
      : remaining
    remaining -= take
    return { block, kwh: take }
  })
}

function rateLookupMonth(
  nextCutoffISO: string,
  offsetDays: number,
): { year: number; month: MonthNumber } {
  const reference = addDays(nextCutoffISO, -offsetDays)
  return {
    year: yearNumber(reference),
    month: monthNumber(reference),
  }
}

/**
 * Mixed summer season decision for domestic tariffs.
 * Based on Manual de disposiciones (DOF 21-feb-2013), arts. 27–28.
 */
export function resolveSeasonMode(
  cycle: BillingCycle,
  summerDays: number,
  summerStart: SummerStartMonth | null,
  periodDays: number = cycle === 'mensual' ? 30 : 60,
  startsInSummer = false,
): {
  mode: 'verano' | 'fuera' | 'mixto'
  firstSeason: Season
  secondSeason: Season | null
  splitMonthly: boolean
  transitionDays: number
} {
  if (summerStart == null) {
    return {
      mode: 'fuera',
      firstSeason: 'fuera',
      secondSeason: null,
      splitMonthly: false,
      transitionDays: 0,
    }
  }

  const outsideSummerDays = Math.max(0, periodDays - summerDays)
  // At summer entry, classify by days newly in summer. At summer exit,
  // the Manual classifies by days newly outside summer (arts. 27–28).
  const transitionDays = startsInSummer ? outsideSummerDays : summerDays
  const initialSeason: Season = startsInSummer ? 'verano' : 'fuera'
  const laterSeason: Season = startsInSummer ? 'fuera' : 'verano'

  if (cycle === 'mensual') {
    const season = transitionDays <= 15 ? initialSeason : laterSeason
    return {
      mode: season,
      firstSeason: season,
      secondSeason: null,
      splitMonthly: false,
      transitionDays,
    }
  }

  // Bimestral
  if (transitionDays <= 15) {
    return {
      mode: initialSeason,
      firstSeason: initialSeason,
      secondSeason: null,
      splitMonthly: false,
      transitionDays,
    }
  }
  if (transitionDays <= 45) {
    return {
      mode: 'mixto',
      firstSeason: initialSeason,
      secondSeason: laterSeason,
      splitMonthly: true,
      transitionDays,
    }
  }
  return {
    mode: laterSeason,
    firstSeason: laterSeason,
    secondSeason: null,
    splitMonthly: false,
    transitionDays,
  }
}

function getDomesticTariff(code: Exclude<DomesticTariffCode, 'DAC'>) {
  return DOMESTIC_TARIFFS[code]
}

function getPrice(
  code: Exclude<DomesticTariffCode, 'DAC'>,
  month: MonthNumber,
  season: Season,
  key: BlockKey,
  year: number,
): number {
  const tariff = getDomesticTariff(code)
  const row =
    tariff.monthlyRates.find((rate) => rate.month === month && rate.season === season) ??
    tariff.monthlyRates.find((rate) => rate.month === month)
  const price = row?.prices[key]
  if (price == null) {
    throw new Error(`Sin cuota para ${code} ${key} ${season} ${month}/${year}`)
  }
  // For years other than snapshot year, still use snapshot month rates (static app).
  return price
}

function billDomesticPortion(
  code: Exclude<DomesticTariffCode, 'DAC'>,
  kwh: number,
  season: Season,
  rateMonth: MonthNumber,
  rateYear: number,
  monthFactor: number,
  language: Language,
  includeSeasonInLabel = false,
): BillLine[] {
  const tariff = getDomesticTariff(code)
  const blocks = scaleBlocks(tariff.blocksBySeason[season], monthFactor)
  return allocateKwh(kwh, blocks)
    .filter((item) => item.kwh > 0)
    .map((item) => {
      const rate = getPrice(code, rateMonth, season, item.block.key, rateYear)
      const amount = roundMoney(item.kwh * rate)
      const block = blockLabel(item.block.key, language)
      const label = includeSeasonInLabel
        ? translate(language, 'billing.lineLabelWithSeason', {
            tariff: tariff.name,
            block,
            season: translate(
              language,
              season === 'verano' ? 'billing.lineSeasonVerano' : 'billing.lineSeasonEstandar',
            ),
          })
        : translate(language, 'billing.lineLabel', {
            tariff: tariff.name,
            block,
          })
      return {
        key: item.block.key,
        label,
        kwh: roundKwh(item.kwh),
        rate,
        amount,
      }
    })
}

function mergeLines(lines: BillLine[]): BillLine[] {
  const map = new Map<string, BillLine>()
  for (const line of lines) {
    const key = `${line.key}|${line.label}|${line.rate}`
    const existing = map.get(key)
    if (existing) {
      existing.kwh = roundKwh(existing.kwh + line.kwh)
      existing.amount = roundMoney(existing.amount + line.amount)
    } else {
      map.set(key, { ...line })
    }
  }
  return [...map.values()]
}

export function estimateDomesticBill(
  input: CalculatorInput,
  projectedKwh: number,
  language: Language = 'es',
): BillEstimate {
  if (input.tariffCode === 'DAC') {
    return estimateDacBill(input, projectedKwh, language)
  }

  const code = input.tariffCode
  const tariff = getDomesticTariff(code)
  const cycle = input.billingCycle
  const cycleWord =
    cycle === 'mensual'
      ? translate(language, 'form.cycleWordMensual')
      : translate(language, 'form.cycleWordBimestral')
  const assumptions: string[] = []
  const warnings: string[] = []

  const summerDays = countSummerDaysInPeriod(
    input.previousCutoffDate,
    input.nextCutoffDate,
    input.summerStartMonth,
  )
  const periodDays = calendarDaysBetween(input.previousCutoffDate, input.nextCutoffDate)
  // First included service day is the day after the previous reading.
  const startsInSummer = isSummerMonth(
    monthNumber(addDays(input.previousCutoffDate, 1)),
    input.summerStartMonth,
  )
  const seasonResolution = resolveSeasonMode(
    cycle,
    summerDays,
    input.summerStartMonth,
    periodDays,
    startsInSummer,
  )

  // Official rule: bimestral uses rates from 30 days before period end;
  // mensual uses rates from 15 days before period end.
  const primaryOffset = cycle === 'mensual' ? 15 : 30
  const primaryRef = rateLookupMonth(input.nextCutoffDate, primaryOffset)

  let lines: BillLine[] = []
  let seasonLabel = ''

  const monthFactor = cycle === 'mensual' ? 1 : 2
  const minimumKwh = MONTHLY_MINIMUM_KWH * monthFactor
  let billedKwh = Math.max(projectedKwh, minimumKwh)
  const minimumApplied = projectedKwh < minimumKwh

  if (minimumApplied) {
    assumptions.push(
      translate(language, 'billing.minAssumption', {
        minimum: minimumKwh,
        cycle: cycleWord,
      }),
    )
  }

  if (!seasonResolution.splitMonthly) {
    const season = seasonResolution.firstSeason
    seasonLabel =
      season === 'verano'
        ? translate(language, 'billing.seasonVerano')
        : code === '1'
          ? translate(language, 'billing.seasonNone')
          : translate(language, 'billing.seasonFuera')
    lines = billDomesticPortion(
      code,
      billedKwh,
      season,
      primaryRef.month,
      primaryRef.year,
      monthFactor,
      language,
    )
    assumptions.push(
      translate(language, 'billing.rateAssumption', {
        month: formatMonthLabel(primaryRef.month, language),
        year: primaryRef.year,
        offset: primaryOffset,
      }),
    )
  } else {
    // Day-weighted mixto: attribute kWh by summer/non-summer day share, then bill
    // each portion as a monthly fraction with that season's full official cupos
    // (Manual: two monthly fractions). Do not shrink Básico/Intermedio by days/30,
    // or leftover kWh is sent to Excedente while published monthly blocks look unused.
    const nonSummerDays = Math.max(0, periodDays - summerDays)
    const firstSeason = seasonResolution.firstSeason
    const secondSeason = seasonResolution.secondSeason!
    const firstDays = firstSeason === 'verano' ? summerDays : nonSummerDays
    const secondDays = secondSeason === 'verano' ? summerDays : nonSummerDays
    const firstKwh = periodDays > 0 ? billedKwh * (firstDays / periodDays) : 0
    const secondKwh = billedKwh - firstKwh

    const firstOffset = seasonResolution.transitionDays <= 30 ? 30 : 60
    const secondOffset = seasonResolution.transitionDays <= 30 ? 0 : 30
    const firstRef = rateLookupMonth(input.nextCutoffDate, firstOffset)
    const secondRef =
      secondOffset === 0
        ? { year: yearNumber(input.nextCutoffDate), month: monthNumber(input.nextCutoffDate) }
        : rateLookupMonth(input.nextCutoffDate, secondOffset)

    seasonLabel = translate(language, 'billing.seasonMixto')
    lines = mergeLines([
      ...billDomesticPortion(
        code,
        firstKwh,
        firstSeason,
        firstRef.month,
        firstRef.year,
        1,
        language,
        true,
      ),
      ...billDomesticPortion(
        code,
        secondKwh,
        secondSeason,
        secondRef.month,
        secondRef.year,
        1,
        language,
        true,
      ),
    ])
    assumptions.push(
      translate(language, 'billing.mixtoAssumption', {
        summerDays,
        nonSummerDays,
        summerKwh: formatKwh(roundKwh(firstSeason === 'verano' ? firstKwh : secondKwh), language),
        nonSummerKwh: formatKwh(
          roundKwh(firstSeason === 'fuera' ? firstKwh : secondKwh),
          language,
        ),
      }),
    )
    assumptions.push(
      translate(language, 'billing.mixtoFractions', {
        firstSeason:
          firstSeason === 'verano'
            ? translate(language, 'billing.seasonWordVerano')
            : translate(language, 'billing.seasonWordFuera'),
        firstDays,
        firstMonth: formatMonthLabel(firstRef.month, language),
        secondSeason:
          secondSeason === 'verano'
            ? translate(language, 'billing.seasonWordVerano')
            : translate(language, 'billing.seasonWordFuera'),
        secondDays,
        secondMonth: formatMonthLabel(secondRef.month, language),
      }),
    )
  }

  const energySubtotal = roundMoney(lines.reduce((sum, line) => sum + line.amount, 0))
  const otherCharges = roundMoney(input.optionalOtherCharges || 0)
  const ivaBase = energySubtotal + otherCharges
  const iva = roundMoney(ivaBase * IVA_RATE)
  const total = roundMoney(ivaBase + iva)

  assumptions.push(
    translate(language, 'billing.tariffAsOf', {
      date: formatDisplayDate(TARIFF_SNAPSHOT_META.asOf, language),
    }),
  )
  assumptions.push(
    translate(language, 'billing.dacLimitRef', {
      tariff: tariff.name,
      limit: tariff.dacLimitKwhMonth,
    }),
  )

  if (input.summerStartMonth != null) {
    assumptions.push(
      translate(language, 'billing.localSummer', {
        month: formatMonthLabel(input.summerStartMonth, language),
      }),
    )
  }

  return {
    seasonLabel,
    seasonMode: seasonResolution.mode,
    rateMonth: primaryRef.month,
    rateYear: primaryRef.year,
    billedKwh: roundKwh(billedKwh),
    minimumApplied,
    lines,
    energySubtotal,
    otherCharges,
    iva,
    total,
    assumptions,
    warnings,
  }
}

function estimateDacBill(
  input: CalculatorInput,
  projectedKwh: number,
  language: Language,
): BillEstimate {
  const region =
    DAC_REGIONS.find((item) => item.regionId === input.dacRegionId) ?? DAC_REGIONS[0]!
  const summerDays = countSummerDaysInPeriod(
    input.previousCutoffDate,
    input.nextCutoffDate,
    input.summerStartMonth,
  )
  const useSummer = summerDays > 15
  const energyRate =
    useSummer || region.energyNonSummer == null
      ? region.energySummer
      : region.energyNonSummer

  const monthFactor = input.billingCycle === 'mensual' ? 1 : 2
  const minimumKwh = MONTHLY_MINIMUM_KWH * monthFactor
  const billedKwh = Math.max(projectedKwh, minimumKwh)
  const fixed = roundMoney(region.fixedCharge * monthFactor)
  const energyAmount = roundMoney(billedKwh * energyRate)
  const lines: BillLine[] = [
    {
      key: 'cargoFijo',
      label: translate(language, 'billing.dacFixed', { region: region.regionName }),
      kwh: 0,
      rate: region.fixedCharge,
      amount: fixed,
    },
    {
      key: 'energia',
      label: translate(
        language,
        useSummer ? 'billing.dacEnergyVerano' : 'billing.dacEnergyFuera',
      ),
      kwh: roundKwh(billedKwh),
      rate: energyRate,
      amount: energyAmount,
    },
  ]
  const energySubtotal = roundMoney(fixed + energyAmount)
  const otherCharges = roundMoney(input.optionalOtherCharges || 0)
  const iva = roundMoney((energySubtotal + otherCharges) * IVA_RATE)
  const total = roundMoney(energySubtotal + otherCharges + iva)
  const ref = rateLookupMonth(
    input.nextCutoffDate,
    input.billingCycle === 'mensual' ? 15 : 30,
  )

  return {
    seasonLabel: translate(
      language,
      useSummer ? 'billing.dacSeasonVerano' : 'billing.dacSeasonFuera',
    ),
    seasonMode: useSummer ? 'verano' : 'fuera',
    rateMonth: ref.month,
    rateYear: ref.year,
    billedKwh: roundKwh(billedKwh),
    minimumApplied: projectedKwh < minimumKwh,
    lines,
    energySubtotal,
    otherCharges,
    iva,
    total,
    assumptions: [
      translate(language, 'billing.dacAssumption1'),
      translate(language, 'billing.dacAssumption2', {
        date: formatDisplayDate(TARIFF_SNAPSHOT_META.asOf, language),
      }),
    ],
    warnings: [translate(language, 'billing.dacWarning')],
  }
}

export function assessDacRisk(
  input: CalculatorInput,
  projection?: ProjectionResult,
  language: Language = 'es',
): DacRisk {
  const required = requiredHistorySlots(input.billingCycle)
  const provided = filledHistoryValues(input.historicalPeriodKwh).length
  const currentMonthlyPaceKwh =
    projection != null ? roundKwh(projection.observed.averageDailyKwh * 30) : null
  const formatMonth = (value: number) => formatKwh(value, language, 1)

  if (input.tariffCode === 'DAC') {
    return {
      applicable: true,
      status: 'already_dac',
      limitKwhMonth: 0,
      requiredHistorySlots: required,
      providedHistorySlots: provided,
      averageMonthlyKwh: null,
      currentMonthlyPaceKwh,
      projectedNextAverageMonthlyKwh: null,
      currentPaceAboveLimit: null,
      aboveLimit: true,
      projectedAboveLimit: null,
      message: translate(language, 'dac.alreadyMessage'),
      detailParagraphs: [
        translate(language, 'dac.alreadyDetail1'),
        translate(language, 'dac.alreadyDetail2'),
      ],
    }
  }

  const tariff = getDomesticTariff(input.tariffCode)
  const limit = tariff.dacLimitKwhMonth
  const cycleLabel =
    input.billingCycle === 'mensual'
      ? translate(language, 'dac.cycleMensuales')
      : translate(language, 'dac.cycleBimestrales')
  const historyRule =
    input.billingCycle === 'mensual'
      ? translate(language, 'dac.historyRuleMensual')
      : translate(language, 'dac.historyRuleBimestral')

  const currentPaceAboveLimit =
    currentMonthlyPaceKwh != null ? currentMonthlyPaceKwh > limit : null

  const average = averageMonthlyFromHistory(input.historicalPeriodKwh, input.billingCycle)
  if (average == null) {
    const missing = Math.max(0, required - provided)
    const paceNote =
      currentPaceAboveLimit === true && currentMonthlyPaceKwh != null
        ? translate(language, 'dac.incompletePaceAbove', {
            pace: formatMonth(currentMonthlyPaceKwh),
            limit,
          })
        : currentMonthlyPaceKwh != null
          ? translate(language, 'dac.incompletePaceOk', {
              pace: formatMonth(currentMonthlyPaceKwh),
              limit,
            })
          : ''

    return {
      applicable: true,
      status: 'incomplete_history',
      limitKwhMonth: limit,
      requiredHistorySlots: required,
      providedHistorySlots: provided,
      averageMonthlyKwh: null,
      currentMonthlyPaceKwh,
      projectedNextAverageMonthlyKwh: null,
      currentPaceAboveLimit,
      aboveLimit: null,
      projectedAboveLimit: null,
      message: translate(language, 'dac.incompleteMessage', {
        tariff: tariff.name,
        limit,
        paceNote,
        required,
        cycleLabel,
        missing,
      }),
      detailParagraphs: [
        historyRule,
        translate(language, 'dac.incompleteDetailMain'),
        provided === 0
          ? translate(language, 'dac.incompleteDetailEmpty', { required, cycleLabel })
          : translate(language, 'dac.incompleteDetailPartial', {
              provided,
              required,
              missing,
            }),
      ],
    }
  }

  const projectedNext =
    projection != null
      ? projectedNextMonthlyAverage(
          input.historicalPeriodKwh,
          input.billingCycle,
          projection.projectedKwh,
        )
      : null
  const aboveLimit = average > limit
  const projectedAboveLimit = projectedNext != null ? projectedNext > limit : null
  const status =
    aboveLimit
      ? 'above_limit'
      : projectedAboveLimit
        ? 'projected_crossing'
        : 'below_limit'

  const detailParagraphs = [
    historyRule,
    translate(language, 'dac.avgDetail', {
      average: formatMonth(average),
      limit,
    }),
  ]

  if (currentMonthlyPaceKwh != null) {
    detailParagraphs.push(
      translate(language, 'dac.paceDetail', {
        pace: formatMonth(currentMonthlyPaceKwh),
        projected: formatMonth(projection!.projectedKwh),
      }),
    )
  }

  if (projectedNext != null) {
    detailParagraphs.push(
      projectedAboveLimit
        ? translate(language, 'dac.nextAbove', { next: formatMonth(projectedNext) })
        : translate(language, 'dac.nextBelow', { next: formatMonth(projectedNext) }),
    )
  }

  const message = aboveLimit
    ? translate(language, 'dac.messageAbove', {
        average: formatMonth(average),
        limit,
      })
    : projectedAboveLimit && projectedNext != null
      ? translate(language, 'dac.messageCrossing', {
          average: formatMonth(average),
          next: formatMonth(projectedNext),
          limit,
        })
      : `${translate(language, 'dac.messageBelow', {
          average: formatMonth(average),
          limit,
        })}${
          projectedNext != null
            ? translate(language, 'dac.messageBelowNext', {
                next: formatMonth(projectedNext),
              })
            : ''
        }`

  return {
    applicable: true,
    status,
    limitKwhMonth: limit,
    requiredHistorySlots: required,
    providedHistorySlots: provided,
    averageMonthlyKwh: average,
    currentMonthlyPaceKwh,
    projectedNextAverageMonthlyKwh: projectedNext,
    currentPaceAboveLimit,
    aboveLimit,
    projectedAboveLimit,
    message,
    detailParagraphs,
  }
}

/** Pure allocator used by tests for known block outcomes. */
export function allocateDomesticBlocks(
  code: Exclude<DomesticTariffCode, 'DAC'>,
  season: Season,
  kwh: number,
  monthFactor: number,
): Array<{ key: BlockKey; label: string; kwh: number }> {
  const tariff = getDomesticTariff(code)
  const blocks = scaleBlocks(tariff.blocksBySeason[season], monthFactor)
  return allocateKwh(kwh, blocks)
    .filter((item) => item.kwh > 0)
    .map((item) => ({
      key: item.block.key,
      label: item.block.label,
      kwh: roundKwh(item.kwh),
    }))
}

function formatScaledUsageKwh(
  dailyValue: number,
  language: Language,
  scale: AllowanceDisplayScale,
): string {
  return formatKwh(scaleDailyUsageKwh(dailyValue, scale), language)
}

function formatScaledMonthlyKwh(
  monthlyValue: number,
  language: Language,
  scale: AllowanceDisplayScale,
): string {
  return formatKwh(scaleMonthlyAllowanceKwh(monthlyValue, scale), language)
}

function seasonProfileLabel(
  season: Season | 'mixto',
  code: Exclude<DomesticTariffCode, 'DAC'>,
  language: Language,
): string {
  if (season === 'mixto') return translate(language, 'billing.seasonProfileMixto')
  if (code === '1') return translate(language, 'billing.seasonProfileNone')
  return season === 'verano'
    ? translate(language, 'billing.seasonProfileVerano')
    : translate(language, 'billing.seasonProfileFuera')
}

/**
 * Allocate one season's attributed kWh through day-prorated official monthly cupos.
 * Band units are period totals for that season (allowance × seasonDays / 30) so
 * the mixed chart can recover published daily (÷30) and monthly figures.
 */
export function buildSeasonProratedAllowanceProfile(
  code: Exclude<DomesticTariffCode, 'DAC'>,
  season: Season,
  seasonDays: number,
  seasonKwh: number,
  rateMonth: MonthNumber,
  rateYear: number,
  language: Language = 'es',
): DailyAllowanceProfile {
  const tariff = getDomesticTariff(code)
  const factor = Math.max(0, seasonDays) / 30
  const finite = tariff.blocksBySeason[season].filter((block) =>
    Number.isFinite(block.allowanceKwh),
  )
  const scaled = finite.map((block) => ({
    ...block,
    allowanceKwh: block.allowanceKwh * factor,
  }))

  let remaining = Math.max(0, seasonKwh)
  let cumulative = 0
  const bands: DailyBandThreshold[] = []
  for (const block of scaled) {
    const key = block.key as DailyBandThreshold['key']
    const allowed = block.allowanceKwh
    if (allowed <= 0) continue
    const used = Math.min(remaining, allowed)
    remaining = Math.max(0, remaining - used)
    cumulative += allowed
    bands.push({
      key,
      label: blockLabel(block.key, language),
      bandMonthlyKwh: roundKwh(allowed),
      cumulativeMonthlyKwh: roundKwh(cumulative),
      ratePerKwh: getPrice(code, rateMonth, season, block.key, rateYear),
      usedKwh: roundKwh(used),
    })
  }

  return {
    season,
    seasonLabel:
      season === 'verano'
        ? translate(language, 'allowance.seasonSummer')
        : translate(language, 'allowance.seasonStandard'),
    bands,
    subsidizedCeilingMonthlyKwh: roundKwh(cumulative),
    excedenteRatePerKwh: getPrice(code, rateMonth, season, 'excedente', rateYear),
    excessUsedKwh: roundKwh(remaining),
  }
}

/**
 * Build separate summer and standard allowance profiles for a mixed-period chart.
 */
export function buildMixedAllowanceProfiles(
  code: Exclude<DomesticTariffCode, 'DAC'>,
  summerDays: number,
  nonSummerDays: number,
  summerKwh: number,
  nonSummerKwh: number,
  veranoRef: { month: MonthNumber; year: number },
  fueraRef: { month: MonthNumber; year: number },
  language: Language = 'es',
): DailyAllowanceProfile[] {
  return [
    buildSeasonProratedAllowanceProfile(
      code,
      'verano',
      summerDays,
      summerKwh,
      veranoRef.month,
      veranoRef.year,
      language,
    ),
    buildSeasonProratedAllowanceProfile(
      code,
      'fuera',
      nonSummerDays,
      nonSummerKwh,
      fueraRef.month,
      fueraRef.year,
      language,
    ),
  ]
}

/**
 * Build subsidised-band thresholds from official monthly allowances.
 * monthFactor / periodDays are accepted for call-site compatibility but unused:
 * display scales derive daily (÷30) and bimonthly (×2) from the monthly values.
 */
export function buildDailyAllowanceProfile(
  code: Exclude<DomesticTariffCode, 'DAC'>,
  season: Season,
  _monthFactor: number,
  _periodDays: number,
  rateMonth: MonthNumber,
  rateYear: number,
  language: Language = 'es',
): DailyAllowanceProfile {
  const tariff = getDomesticTariff(code)
  const finite = tariff.blocksBySeason[season].filter((block) =>
    Number.isFinite(block.allowanceKwh),
  )

  let cumulative = 0
  const bands: DailyBandThreshold[] = finite.map((block) => {
    const bandMonthlyKwh = block.allowanceKwh
    cumulative += bandMonthlyKwh
    return {
      key: block.key as DailyBandThreshold['key'],
      label: blockLabel(block.key, language),
      bandMonthlyKwh,
      cumulativeMonthlyKwh: cumulative,
      ratePerKwh: getPrice(code, rateMonth, season, block.key, rateYear),
    }
  })

  return {
    season,
    seasonLabel: seasonProfileLabel(season, code, language),
    bands,
    subsidizedCeilingMonthlyKwh: bands[bands.length - 1]?.cumulativeMonthlyKwh ?? 0,
    excedenteRatePerKwh: getPrice(code, rateMonth, season, 'excedente', rateYear),
  }
}

function guidanceForProfile(
  averageDailyKwh: number,
  profile: DailyAllowanceProfile,
  language: Language,
  scale: AllowanceDisplayScale = 'daily',
): string {
  const unit = translate(language, allowancePeriodUnitKey(scale))
  const avg = formatScaledUsageKwh(averageDailyKwh, language, scale)
  const avgMonthly = scaleDailyUsageKwh(averageDailyKwh, 'monthly')
  if (profile.bands.length === 0) {
    return translate(language, 'guidance.simpleAvg', { avg, unit })
  }

  const first = profile.bands[0]!
  if (avgMonthly <= first.cumulativeMonthlyKwh) {
    const headroom = first.cumulativeMonthlyKwh - avgMonthly
    return translate(language, 'guidance.inFirst', {
      avg,
      band: first.label,
      headroom: formatScaledMonthlyKwh(headroom, language, scale),
      unit,
    })
  }

  for (let i = 1; i < profile.bands.length; i += 1) {
    const band = profile.bands[i]!
    const previous = profile.bands[i - 1]!
    if (avgMonthly <= band.cumulativeMonthlyKwh) {
      const abovePrevious = avgMonthly - previous.cumulativeMonthlyKwh
      const headroom = band.cumulativeMonthlyKwh - avgMonthly
      return translate(language, 'guidance.inMiddle', {
        avg,
        previous: previous.label,
        above: formatScaledMonthlyKwh(abovePrevious, language, scale),
        band: band.label,
        headroom: formatScaledMonthlyKwh(headroom, language, scale),
        unit,
      })
    }
  }

  const ceiling = profile.subsidizedCeilingMonthlyKwh
  const last = profile.bands[profile.bands.length - 1]!
  const excess = avgMonthly - ceiling
  return translate(language, 'guidance.excess', {
    avg,
    band: last.label,
    excess: formatScaledMonthlyKwh(excess, language, scale),
    unit,
  })
}

function guidanceForSeasonPortion(
  seasonKwh: number,
  seasonDays: number,
  profile: DailyAllowanceProfile,
  language: Language,
  scale: AllowanceDisplayScale,
): string {
  const unit = translate(language, allowancePeriodUnitKey(scale))
  const days = Math.max(1, seasonDays)
  const avgDaily = seasonKwh / days
  const avg = formatScaledUsageKwh(avgDaily, language, scale)
  const formatPortion = (periodValue: number) =>
    formatKwh(scalePeriodAllowanceKwh(periodValue, days, scale), language)

  if (profile.bands.length === 0) {
    return translate(language, 'guidance.simpleAvg', { avg, unit })
  }

  const first = profile.bands[0]!
  if (seasonKwh <= first.cumulativeMonthlyKwh) {
    const headroom = first.cumulativeMonthlyKwh - seasonKwh
    return translate(language, 'guidance.inFirst', {
      avg,
      band: first.label,
      headroom: formatPortion(headroom),
      unit,
    })
  }

  for (let i = 1; i < profile.bands.length; i += 1) {
    const band = profile.bands[i]!
    const previous = profile.bands[i - 1]!
    if (seasonKwh <= band.cumulativeMonthlyKwh) {
      const abovePrevious = seasonKwh - previous.cumulativeMonthlyKwh
      const headroom = band.cumulativeMonthlyKwh - seasonKwh
      return translate(language, 'guidance.inMiddle', {
        avg,
        previous: previous.label,
        above: formatPortion(abovePrevious),
        band: band.label,
        headroom: formatPortion(headroom),
        unit,
      })
    }
  }

  const ceiling = profile.subsidizedCeilingMonthlyKwh
  const last = profile.bands[profile.bands.length - 1]!
  const excess = seasonKwh - ceiling
  return translate(language, 'guidance.excess', {
    avg,
    band: last.label,
    excess: formatPortion(excess),
    unit,
  })
}

/** Format subsidised-usage guidance for a display period (default: daily). */
export function formatAllowanceGuidance(
  comparison: Pick<
    DailyAllowanceComparison,
    'mode' | 'averageDailyKwh' | 'profiles' | 'guidance' | 'mixedPeriod'
  >,
  language: Language,
  scale: AllowanceDisplayScale = 'daily',
): string {
  if (!comparison.profiles.length || comparison.mode === 'dac') {
    return comparison.guidance
  }

  const avg = comparison.averageDailyKwh
  if (comparison.mode === 'mixto' && comparison.mixedPeriod) {
    const mixed = comparison.mixedPeriod
    const unit = translate(language, allowancePeriodUnitKey(scale))
    const summerProfile = comparison.profiles.find((profile) => profile.season === 'verano')
    const standardProfile = comparison.profiles.find((profile) => profile.season === 'fuera')
    const parts = [
      translate(language, 'guidance.mixtoIntro', {
        avg: formatScaledUsageKwh(avg, language, scale),
        unit,
        summerDays: mixed.summerDays,
        nonSummerDays: mixed.nonSummerDays,
        summerKwh: formatKwh(mixed.summerKwh, language),
        nonSummerKwh: formatKwh(mixed.nonSummerKwh, language),
      }),
    ]
    if (summerProfile) {
      parts.push(
        translate(language, 'guidance.mixtoVerano', {
          text: guidanceForSeasonPortion(
            mixed.summerKwh,
            mixed.summerDays,
            summerProfile,
            language,
            scale,
          ),
        }),
      )
    }
    if (standardProfile) {
      parts.push(
        translate(language, 'guidance.mixtoFuera', {
          text: guidanceForSeasonPortion(
            mixed.nonSummerKwh,
            mixed.nonSummerDays,
            standardProfile,
            language,
            scale,
          ),
        }),
      )
    }
    return parts.join(' ')
  }

  return guidanceForProfile(avg, comparison.profiles[0]!, language, scale)
}

function mixtoRateRefs(input: CalculatorInput): {
  fuera: { month: MonthNumber; year: number }
  verano: { month: MonthNumber; year: number }
} {
  const summerDays = countSummerDaysInPeriod(
    input.previousCutoffDate,
    input.nextCutoffDate,
    input.summerStartMonth,
  )
  const periodDays = calendarDaysBetween(input.previousCutoffDate, input.nextCutoffDate)
  // First included service day is the day after the previous reading.
  const startsInSummer = isSummerMonth(
    monthNumber(addDays(input.previousCutoffDate, 1)),
    input.summerStartMonth,
  )
  const resolution = resolveSeasonMode(
    input.billingCycle,
    summerDays,
    input.summerStartMonth,
    periodDays,
    startsInSummer,
  )
  const firstOffset = resolution.transitionDays <= 30 ? 30 : 60
  const secondOffset = resolution.transitionDays <= 30 ? 0 : 30
  const firstRef = rateLookupMonth(input.nextCutoffDate, firstOffset)
  const secondRef =
    secondOffset === 0
      ? { year: yearNumber(input.nextCutoffDate), month: monthNumber(input.nextCutoffDate) }
      : rateLookupMonth(input.nextCutoffDate, secondOffset)

  const firstSeason = resolution.firstSeason
  return firstSeason === 'verano'
    ? { verano: firstRef, fuera: secondRef }
    : { fuera: firstRef, verano: secondRef }
}

/**
 * Official monthly cheap-band allowances for the user's tariff and season resolution,
 * compared against observed averageDailyKwh (via a 30-day monthly pace).
 */
export function buildDailyAllowanceComparison(
  input: CalculatorInput,
  averageDailyKwh: number,
  billingDays: number,
  seasonMode: BillEstimate['seasonMode'],
  rateMonth: MonthNumber,
  rateYear: number,
  language: Language = 'es',
): DailyAllowanceComparison {
  if (input.tariffCode === 'DAC') {
    return {
      applicable: false,
      mode: 'dac',
      averageDailyKwh: roundKwh(averageDailyKwh),
      billingDays,
      profiles: [],
      mixedPeriod: null,
      guidance: translate(language, 'guidance.dac'),
      dacLimitKwhMonth: null,
      currentPaceAboveDacLimit: null,
    }
  }

  const code = input.tariffCode
  const days = Math.max(1, billingDays)
  const tariff = getDomesticTariff(code)
  const dacLimitKwhMonth = tariff.dacLimitKwhMonth
  const avgDaily = roundKwh(averageDailyKwh)
  const monthlyPace = scaleDailyUsageKwh(avgDaily, 'monthly')
  const currentPaceAboveDacLimit = monthlyPace > dacLimitKwhMonth

  if (seasonMode === 'mixto') {
    const summerDays = countSummerDaysInPeriod(
      input.previousCutoffDate,
      input.nextCutoffDate,
      input.summerStartMonth,
    )
    const periodDays = calendarDaysBetween(input.previousCutoffDate, input.nextCutoffDate)
    const periodUsage = avgDaily * Math.max(1, periodDays)
    const split = splitPeriodKwhBySeasonDays(periodUsage, summerDays, periodDays)
    const refs = mixtoRateRefs(input)
    const profiles = buildMixedAllowanceProfiles(
      code,
      summerDays,
      split.nonSummerDays,
      split.summerKwh,
      split.nonSummerKwh,
      refs.verano,
      refs.fuera,
      language,
    )
    const seasonRanges = mixedSeasonInclusiveRanges(
      input.previousCutoffDate,
      input.nextCutoffDate,
      input.summerStartMonth,
    )
    const mixedPeriod: MixedPeriodBreakdown = {
      periodDays: Math.max(1, periodDays),
      summerDays,
      nonSummerDays: split.nonSummerDays,
      summerKwh: roundKwh(split.summerKwh),
      nonSummerKwh: roundKwh(split.nonSummerKwh),
      summerRange: seasonRanges.summerRange,
      nonSummerRange: seasonRanges.nonSummerRange,
    }
    return {
      applicable: true,
      mode: 'mixto',
      averageDailyKwh: avgDaily,
      billingDays: days,
      profiles,
      mixedPeriod,
      guidance: formatAllowanceGuidance(
        {
          mode: 'mixto',
          averageDailyKwh: avgDaily,
          profiles,
          mixedPeriod,
          guidance: '',
        },
        language,
        'daily',
      ),
      dacLimitKwhMonth,
      currentPaceAboveDacLimit,
    }
  }

  const season: Season = seasonMode === 'verano' ? 'verano' : 'fuera'
  const profile = buildDailyAllowanceProfile(
    code,
    season,
    1,
    30,
    rateMonth,
    rateYear,
    language,
  )

  return {
    applicable: true,
    mode: seasonMode,
    averageDailyKwh: avgDaily,
    billingDays: days,
    profiles: [profile],
    mixedPeriod: null,
    guidance: guidanceForProfile(averageDailyKwh, profile, language),
    dacLimitKwhMonth,
    currentPaceAboveDacLimit,
  }
}
