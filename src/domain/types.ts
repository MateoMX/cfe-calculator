export type DomesticTariffCode = '1' | '1A' | '1B' | '1C' | '1D' | '1E' | '1F' | 'DAC'

export type BillingCycle = 'mensual' | 'bimestral'

export type Season = 'verano' | 'fuera'

export type BlockKey =
  | 'basico'
  | 'intermedio'
  | 'intermedioBajo'
  | 'intermedioAlto'
  | 'excedente'
  | 'energia'
  | 'cargoFijo'

export type SummerStartMonth = 2 | 3 | 4 | 5

export type MonthNumber = 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 | 11 | 12

export interface RateBlock {
  key: BlockKey
  label: string
  /** Monthly kWh allowance; Infinity for open-ended blocks. */
  allowanceKwh: number
}

export interface MonthlyRates {
  year: number
  month: MonthNumber
  season: Season
  prices: Partial<Record<BlockKey, number>>
}

export interface DomesticTariffDefinition {
  code: Exclude<DomesticTariffCode, 'DAC'>
  name: string
  minSummerTempC: number | null
  dacLimitKwhMonth: number
  blocksBySeason: Record<Season, RateBlock[]>
  monthlyRates: MonthlyRates[]
}

export interface DacRegionRates {
  regionId: string
  regionName: string
  fixedCharge: number
  energySummer: number
  energyNonSummer: number | null
}

export interface TariffSnapshotMeta {
  asOf: string
  year: number
  sourceName: string
  sourceUrl: string
  agreementsUrl: string
  notes: string[]
}

export interface CalculatorInput {
  tariffCode: DomesticTariffCode
  summerStartMonth: SummerStartMonth | null
  billingCycle: BillingCycle
  previousReading: number
  currentReading: number
  previousCutoffDate: string
  currentReadingDate: string
  nextCutoffDate: string
  optionalOtherCharges: number
  alreadyOnDac: boolean
  dacRegionId: string
  /**
   * Billing-period consumptions from prior receipts (kWh per period).
   * Mensual: up to 12 monthly totals. Bimestral: up to 6 whole-receipt totals.
   * Index 0 is the most recent completed period; higher indexes are older.
   * Null slots are empty / not yet provided.
   */
  historicalPeriodKwh: Array<number | null>
}

export interface ValidationIssue {
  field?: keyof CalculatorInput | 'general'
  message: string
}

export interface ObservedUsage {
  consumedKwh: number
  elapsedDays: number
  averageDailyKwh: number
}

export interface ProjectionResult {
  billingDays: number
  remainingDays: number
  projectedKwh: number
  observed: ObservedUsage
}

export interface BillLine {
  key: BlockKey
  label: string
  kwh: number
  rate: number
  amount: number
}

export interface BillEstimate {
  seasonLabel: string
  seasonMode: 'verano' | 'fuera' | 'mixto'
  rateMonth: MonthNumber
  rateYear: number
  billedKwh: number
  minimumApplied: boolean
  lines: BillLine[]
  energySubtotal: number
  otherCharges: number
  iva: number
  total: number
  assumptions: string[]
  warnings: string[]
}

export type DacRiskStatus =
  | 'already_dac'
  | 'incomplete_history'
  | 'below_limit'
  | 'above_limit'
  | 'projected_crossing'

export interface DacRisk {
  applicable: boolean
  status: DacRiskStatus
  limitKwhMonth: number
  requiredHistorySlots: number
  providedHistorySlots: number
  /** Rolling monthly average from a complete 12-month window (sum of period totals / 12). */
  averageMonthlyKwh: number | null
  /** Current observed pace expressed as kWh/mes (daily average × 30). */
  currentMonthlyPaceKwh: number | null
  /** Estimated next rolling average after replacing the oldest period with the projected current period. */
  projectedNextAverageMonthlyKwh: number | null
  currentPaceAboveLimit: boolean | null
  /** Whether the completed historical average is already above the DAC limit. */
  aboveLimit: boolean | null
  /** Whether the projected next rolling average would be above the DAC limit. */
  projectedAboveLimit: boolean | null
  message: string
  detailParagraphs: string[]
}

/** Finite subsidized band expressed as an average daily allowance. */
export interface DailyBandThreshold {
  key: Exclude<BlockKey, 'excedente' | 'energia' | 'cargoFijo'>
  label: string
  /** This band's own average daily allowance (kWh/día). */
  bandDailyKwh: number
  /** Cumulative ceiling through this band (kWh/día). */
  cumulativeDailyKwh: number
  /** Official energy price for this band ($/kWh). */
  ratePerKwh: number
}

export interface DailyAllowanceProfile {
  season: Season
  seasonLabel: string
  bands: DailyBandThreshold[]
  /** Highest cumulative ceiling among finite (cheap) bands. */
  subsidizedCeilingDailyKwh: number
  /** Official Excedente price for this season/month ($/kWh). */
  excedenteRatePerKwh: number
}

export interface DailyAllowanceComparison {
  applicable: boolean
  mode: 'verano' | 'fuera' | 'mixto' | 'dac'
  averageDailyKwh: number
  billingDays: number
  profiles: DailyAllowanceProfile[]
  guidance: string
  /** Official DAC monthly limit expressed as an average daily pace (kWh/día ≈ limit/30). */
  dacLimitDailyKwh: number | null
  /** Official DAC monthly limit for the selected domestic tariff. */
  dacLimitKwhMonth: number | null
  /** True when the current daily pace exceeds the DAC daily equivalent. */
  currentPaceAboveDacLimit: boolean | null
}

export interface FullEstimate {
  input: CalculatorInput
  projection: ProjectionResult
  bill: BillEstimate
  narrative: string
  dacRisk: DacRisk
  dataAsOf: string
  dailyAllowance: DailyAllowanceComparison
}
