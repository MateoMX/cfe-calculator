import {
  DAC_REGIONS,
  DOMESTIC_TARIFFS,
  IVA_RATE,
  MONTHLY_MINIMUM_KWH,
  TARIFF_SNAPSHOT_META,
} from '../data/tariffs-2026'
import {
  addDays,
  countSummerDaysInPeriod,
  formatDisplayDate,
  isSummerMonth,
  MONTH_LABELS,
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
  MonthNumber,
  RateBlock,
  Season,
  SummerStartMonth,
} from './types'

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
): {
  mode: 'verano' | 'fuera' | 'mixto'
  firstSeason: Season
  secondSeason: Season | null
  splitMonthly: boolean
} {
  if (summerStart == null) {
    return { mode: 'fuera', firstSeason: 'fuera', secondSeason: null, splitMonthly: false }
  }

  if (cycle === 'mensual') {
    if (summerDays <= 15) {
      return { mode: 'fuera', firstSeason: 'fuera', secondSeason: null, splitMonthly: false }
    }
    return { mode: 'verano', firstSeason: 'verano', secondSeason: null, splitMonthly: false }
  }

  // Bimestral
  if (summerDays <= 15) {
    return { mode: 'fuera', firstSeason: 'fuera', secondSeason: null, splitMonthly: false }
  }
  if (summerDays <= 30) {
    return {
      mode: 'mixto',
      firstSeason: 'fuera',
      secondSeason: 'verano',
      splitMonthly: true,
    }
  }
  if (summerDays <= 45) {
    return {
      mode: 'mixto',
      firstSeason: 'fuera',
      secondSeason: 'verano',
      splitMonthly: true,
    }
  }
  return { mode: 'verano', firstSeason: 'verano', secondSeason: null, splitMonthly: false }
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
): BillLine[] {
  const tariff = getDomesticTariff(code)
  const blocks = scaleBlocks(tariff.blocksBySeason[season], monthFactor)
  return allocateKwh(kwh, blocks)
    .filter((item) => item.kwh > 0)
    .map((item) => {
      const rate = getPrice(code, rateMonth, season, item.block.key, rateYear)
      const amount = roundMoney(item.kwh * rate)
      return {
        key: item.block.key,
        label: `${tariff.name} ${item.block.label}`,
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
): BillEstimate {
  if (input.tariffCode === 'DAC') {
    return estimateDacBill(input, projectedKwh)
  }

  const code = input.tariffCode
  const tariff = getDomesticTariff(code)
  const cycle = input.billingCycle
  const assumptions: string[] = []
  const warnings: string[] = []

  const summerDays = countSummerDaysInPeriod(
    input.previousCutoffDate,
    input.nextCutoffDate,
    input.summerStartMonth,
  )
  const seasonResolution = resolveSeasonMode(cycle, summerDays, input.summerStartMonth)

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
      `Se aplica el mínimo oficial de ${minimumKwh} kWh para un periodo ${cycle}.`,
    )
  }

  if (!seasonResolution.splitMonthly) {
    const season = seasonResolution.firstSeason
    seasonLabel =
      season === 'verano'
        ? 'Temporada de verano'
        : code === '1'
          ? 'Sin temporada de verano diferenciada'
          : 'Temporada fuera de verano'
    lines = billDomesticPortion(
      code,
      billedKwh,
      season,
      primaryRef.month,
      primaryRef.year,
      monthFactor,
    )
    assumptions.push(
      `Cuotas del mes de ${MONTH_LABELS[primaryRef.month]} ${primaryRef.year} (${primaryOffset} días antes del corte), conforme al Manual de facturación.`,
    )
  } else {
    // Split bimonthly consumption into two monthly halves with potentially different seasons/rates.
    const half = billedKwh / 2
    const firstOffset = summerDays > 30 && summerDays <= 45 ? 60 : 30
    const secondOffset = summerDays > 30 && summerDays <= 45 ? 30 : 0
    const firstRef = rateLookupMonth(input.nextCutoffDate, firstOffset)
    const secondRef =
      secondOffset === 0
        ? { year: yearNumber(input.nextCutoffDate), month: monthNumber(input.nextCutoffDate) }
        : rateLookupMonth(input.nextCutoffDate, secondOffset)

    // Determine which half is summer vs non-summer based on entry vs exit.
    // Heuristic: if the period starts in summer, first half is summer (exit mixto).
    const startsInSummer = isSummerMonth(
      monthNumber(input.previousCutoffDate),
      input.summerStartMonth,
    )
    const firstSeason: Season = startsInSummer ? 'verano' : 'fuera'
    const secondSeason: Season = startsInSummer ? 'fuera' : 'verano'

    seasonLabel = 'Periodo mixto (verano y fuera de verano)'
    lines = mergeLines([
      ...billDomesticPortion(code, half, firstSeason, firstRef.month, firstRef.year, 1),
      ...billDomesticPortion(code, half, secondSeason, secondRef.month, secondRef.year, 1),
    ])
    assumptions.push(
      `Periodo bimestral mixto con ${summerDays} días de verano: el consumo se divide en dos fracciones mensuales iguales (50/50), supuesto alineado al tratamiento de “dos meses exactos” del Manual (disposiciones 27–28); CFE no publica la fórmula exacta del reparto.`,
    )
    assumptions.push(
      `Primera fracción: ${firstSeason === 'verano' ? 'verano' : 'fuera de verano'} con cuotas de ${MONTH_LABELS[firstRef.month]}; segunda fracción: ${secondSeason === 'verano' ? 'verano' : 'fuera de verano'} con cuotas de ${MONTH_LABELS[secondRef.month]}.`,
    )
  }

  const energySubtotal = roundMoney(lines.reduce((sum, line) => sum + line.amount, 0))
  const otherCharges = roundMoney(input.optionalOtherCharges || 0)
  const ivaBase = energySubtotal + otherCharges
  const iva = roundMoney(ivaBase * IVA_RATE)
  const total = roundMoney(ivaBase + iva)

  assumptions.push(
    `Última actualización de tarifas: ${formatDisplayDate(TARIFF_SNAPSHOT_META.asOf)}. Las tarifas son correctas a esta fecha. El recibo oficial de CFE prevalece.`,
  )
  assumptions.push(
    `Límite DAC de referencia para ${tariff.name}: ${tariff.dacLimitKwhMonth} kWh/mes (promedio móvil de 12 meses).`,
  )

  if (input.summerStartMonth != null) {
    assumptions.push(
      `Verano local: 6 meses consecutivos a partir de ${MONTH_LABELS[input.summerStartMonth]}.`,
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

function estimateDacBill(input: CalculatorInput, projectedKwh: number): BillEstimate {
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
      label: `DAC cargo fijo (${region.regionName})`,
      kwh: 0,
      rate: region.fixedCharge,
      amount: fixed,
    },
    {
      key: 'energia',
      label: `DAC energía (${useSummer ? 'verano' : 'fuera de verano'})`,
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
    seasonLabel: useSummer ? 'DAC en temporada de verano' : 'DAC fuera de verano',
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
      'DAC usa cargo fijo más energía sin bloques subsidiados.',
      `Tarifas DAC regionales actualizadas y correctas al ${formatDisplayDate(TARIFF_SNAPSHOT_META.asOf)}; confirma el oficio mensual de tu recibo.`,
    ],
    warnings: [
      'La reclasificación a DAC depende del promedio móvil de 12 meses, no de un solo periodo.',
    ],
  }
}

export function assessDacRisk(input: CalculatorInput): DacRisk {
  if (input.tariffCode === 'DAC' || input.alreadyOnDac) {
    return {
      applicable: true,
      limitKwhMonth: 0,
      averageMonthlyKwh: null,
      aboveLimit: true,
      message:
        'Tu servicio está o se indicó como DAC. El cálculo usa cargos DAC; para volver a tarifa doméstica se requiere promedio bajo el límite durante 12 meses y trámite ante CFE.',
    }
  }

  const tariff = getDomesticTariff(input.tariffCode)
  const history = input.historicalMonthlyKwh.filter((value) => Number.isFinite(value) && value >= 0)
  if (history.length === 0) {
    return {
      applicable: true,
      limitKwhMonth: tariff.dacLimitKwhMonth,
      averageMonthlyKwh: null,
      aboveLimit: null,
      message: `Límite DAC de ${tariff.name}: ${tariff.dacLimitKwhMonth} kWh/mes promedio. Puedes capturar el historial opcional para estimar el riesgo.`,
    }
  }

  const average = history.reduce((sum, value) => sum + value, 0) / history.length
  const above = average > tariff.dacLimitKwhMonth
  return {
    applicable: true,
    limitKwhMonth: tariff.dacLimitKwhMonth,
    averageMonthlyKwh: roundKwh(average),
    aboveLimit: above,
    message: above
      ? `Tu promedio capturado (${average.toFixed(1)} kWh/mes) supera el límite de ${tariff.dacLimitKwhMonth} kWh/mes. Riesgo de reclasificación a DAC si se mantiene 12 meses.`
      : `Tu promedio capturado (${average.toFixed(1)} kWh/mes) está bajo el límite de ${tariff.dacLimitKwhMonth} kWh/mes.`,
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

function formatDailyKwh(value: number): string {
  return new Intl.NumberFormat('es-MX', { maximumFractionDigits: 2 }).format(value)
}

function seasonProfileLabel(season: Season, code: Exclude<DomesticTariffCode, 'DAC'>): string {
  if (code === '1') return 'Sin temporada diferenciada'
  return season === 'verano' ? 'Temporada de verano' : 'Fuera de verano'
}

/**
 * Convert monthly finite blocks into average daily thresholds for a comparison window.
 * periodDays is the number of days those (scaled) allowances cover.
 */
export function buildDailyAllowanceProfile(
  code: Exclude<DomesticTariffCode, 'DAC'>,
  season: Season,
  monthFactor: number,
  periodDays: number,
  rateMonth: MonthNumber,
  rateYear: number,
): DailyAllowanceProfile {
  const tariff = getDomesticTariff(code)
  const scaled = scaleBlocks(tariff.blocksBySeason[season], monthFactor)
  const finite = scaled.filter((block) => Number.isFinite(block.allowanceKwh))
  const days = Math.max(1, periodDays)

  let cumulative = 0
  const bands: DailyBandThreshold[] = finite.map((block) => {
    const bandDailyKwh = roundKwh(block.allowanceKwh / days)
    cumulative = roundKwh(cumulative + bandDailyKwh)
    return {
      key: block.key as DailyBandThreshold['key'],
      label: block.label,
      bandDailyKwh,
      cumulativeDailyKwh: cumulative,
      ratePerKwh: getPrice(code, rateMonth, season, block.key, rateYear),
    }
  })

  return {
    season,
    seasonLabel: seasonProfileLabel(season, code),
    bands,
    subsidizedCeilingDailyKwh: bands[bands.length - 1]?.cumulativeDailyKwh ?? 0,
    excedenteRatePerKwh: getPrice(code, rateMonth, season, 'excedente', rateYear),
  }
}

function guidanceForProfile(averageDailyKwh: number, profile: DailyAllowanceProfile): string {
  const avg = formatDailyKwh(averageDailyKwh)
  if (profile.bands.length === 0) {
    return `Tu promedio es de ${avg} kWh/día.`
  }

  const first = profile.bands[0]!
  if (averageDailyKwh <= first.cumulativeDailyKwh) {
    const headroom = roundKwh(first.cumulativeDailyKwh - averageDailyKwh)
    return `Tu promedio (${avg} kWh/día) cabe en ${first.label}. Te quedan ${formatDailyKwh(headroom)} kWh/día antes de pasar al siguiente bloque.`
  }

  for (let i = 1; i < profile.bands.length; i += 1) {
    const band = profile.bands[i]!
    const previous = profile.bands[i - 1]!
    if (averageDailyKwh <= band.cumulativeDailyKwh) {
      const abovePrevious = roundKwh(averageDailyKwh - previous.cumulativeDailyKwh)
      const headroom = roundKwh(band.cumulativeDailyKwh - averageDailyKwh)
      return `Tu promedio (${avg} kWh/día) supera ${previous.label} por ${formatDailyKwh(abovePrevious)} kWh/día y aún cabe en ${band.label}. Te quedan ${formatDailyKwh(headroom)} kWh/día antes del excedente.`
    }
  }

  const ceiling = profile.subsidizedCeilingDailyKwh
  const last = profile.bands[profile.bands.length - 1]!
  const excess = roundKwh(averageDailyKwh - ceiling)
  return `Tu promedio (${avg} kWh/día) supera ${last.label} por ${formatDailyKwh(excess)} kWh/día: esa parte se cobra como Excedente (precio alto).`
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
  const firstOffset = summerDays > 30 && summerDays <= 45 ? 60 : 30
  const secondOffset = summerDays > 30 && summerDays <= 45 ? 30 : 0
  const firstRef = rateLookupMonth(input.nextCutoffDate, firstOffset)
  const secondRef =
    secondOffset === 0
      ? { year: yearNumber(input.nextCutoffDate), month: monthNumber(input.nextCutoffDate) }
      : rateLookupMonth(input.nextCutoffDate, secondOffset)

  const startsInSummer = isSummerMonth(
    monthNumber(input.previousCutoffDate),
    input.summerStartMonth,
  )
  const firstSeason: Season = startsInSummer ? 'verano' : 'fuera'
  return firstSeason === 'verano'
    ? { verano: firstRef, fuera: secondRef }
    : { fuera: firstRef, verano: secondRef }
}

/**
 * Average daily cheap-band allowances for the user's tariff and season resolution,
 * compared against observed averageDailyKwh.
 */
export function buildDailyAllowanceComparison(
  input: CalculatorInput,
  averageDailyKwh: number,
  billingDays: number,
  seasonMode: BillEstimate['seasonMode'],
  rateMonth: MonthNumber,
  rateYear: number,
): DailyAllowanceComparison {
  if (input.tariffCode === 'DAC') {
    return {
      applicable: false,
      mode: 'dac',
      averageDailyKwh: roundKwh(averageDailyKwh),
      billingDays,
      profiles: [],
      guidance:
        'La tarifa DAC no tiene bloques subsidiados (Básico/Intermedio): toda la energía se cobra a la cuota DAC más el cargo fijo.',
    }
  }

  const code = input.tariffCode
  const days = Math.max(1, billingDays)

  if (seasonMode === 'mixto') {
    // Mixto bills two monthly halves independently; each profile uses one month of blocks
    // over half the billing period (≈ 30 days when the ciclo is 60).
    const halfDays = Math.max(1, days / 2)
    const refs = mixtoRateRefs(input)
    const fuera = buildDailyAllowanceProfile(
      code,
      'fuera',
      1,
      halfDays,
      refs.fuera.month,
      refs.fuera.year,
    )
    const verano = buildDailyAllowanceProfile(
      code,
      'verano',
      1,
      halfDays,
      refs.verano.month,
      refs.verano.year,
    )
    return {
      applicable: true,
      mode: 'mixto',
      averageDailyKwh: roundKwh(averageDailyKwh),
      billingDays: days,
      profiles: [fuera, verano],
      guidance: [
        `Periodo mixto: el consumo se reparte en dos fracciones mensuales. Compara tu promedio (${formatDailyKwh(averageDailyKwh)} kWh/día) con cada temporada.`,
        `Fuera de verano: ${guidanceForProfile(averageDailyKwh, fuera)}`,
        `Verano: ${guidanceForProfile(averageDailyKwh, verano)}`,
      ].join(' '),
    }
  }

  const season: Season = seasonMode === 'verano' ? 'verano' : 'fuera'
  const monthFactor = input.billingCycle === 'mensual' ? 1 : 2
  const profile = buildDailyAllowanceProfile(code, season, monthFactor, days, rateMonth, rateYear)

  return {
    applicable: true,
    mode: seasonMode,
    averageDailyKwh: roundKwh(averageDailyKwh),
    billingDays: days,
    profiles: [profile],
    guidance: guidanceForProfile(averageDailyKwh, profile),
  }
}
