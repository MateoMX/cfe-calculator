export type MonitorResult = 'no_changes' | 'rates_found' | 'unable_to_check'

export type FindingKind = 'new_data' | 'structure_change' | 'fetch_error'

export type TariffKind = 'DAC' | 'domestic'

export interface Finding {
  kind: FindingKind
  code: string
  summary: string
  clearBy: string
  tariffKind?: TariffKind
  year?: number
  month?: number
  sourceUrl?: string
}

export interface PageFetchResult {
  url: string
  ok: boolean
  status?: number
  error?: string
  html?: string
}

export interface OficioLink {
  title: string
  href: string
  id?: string
  year?: number
}

export interface DacLimitRow {
  tariffCode: string
  limitKwhMonth: number
}

export interface ParsedAgreementsPage {
  years: number[]
  yearSelectName: string | null
  oficios: OficioLink[]
}

export interface ParsedDacPage {
  years: number[]
  yearSelectName: string | null
  monthSelectName: string | null
  publishedMonths: number[]
  dacLimits: DacLimitRow[]
}

export interface ParsedDomesticCanaryPage {
  page: 'Tarifa1' | 'Tarifa1B'
  consultMonthSelectName: string | null
  summerStartSelectName: string | null
  consultMonths: number[]
}

export interface LiveExtract {
  agreements: ParsedAgreementsPage
  dac: ParsedDacPage
  tarifa1: ParsedDomesticCanaryPage
  tarifa1b: ParsedDomesticCanaryPage
}

export interface RepoBaseline {
  asOf: string
  years: number[]
  latestDacYear: number
  latestDacMonth: number
  dacLimits: Record<string, number>
  sourceUrl: string
  agreementsUrl: string
  dacUrl: string
  tarifa1Url: string
  tarifa1bUrl: string
}

export interface MonitorReport {
  result: MonitorResult
  checkedAt: string
  repo: {
    asOf: string
    years: number[]
    latestDacYear: number
    latestDacMonth: number
  }
  pages: Array<{
    url: string
    ok: boolean
    status?: number
    error?: string
  }>
  findings: Finding[]
}
