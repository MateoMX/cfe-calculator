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
  stateCode: string
  municipality: string
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
  historicalMonthlyKwh: number[]
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

export interface DacRisk {
  applicable: boolean
  limitKwhMonth: number
  averageMonthlyKwh: number | null
  aboveLimit: boolean | null
  message: string
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
}

export interface FullEstimate {
  input: CalculatorInput
  projection: ProjectionResult
  bill: BillEstimate
  narrative: string
  dacRisk: DacRisk
  regionalNotes: string[]
  dataAsOf: string
  dailyAllowance: DailyAllowanceComparison
}
