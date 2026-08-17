/** Committed structural expectations for CFE household tariff pages. */

export const SPANISH_MONTHS = [
  'ENERO',
  'FEBRERO',
  'MARZO',
  'ABRIL',
  'MAYO',
  'JUNIO',
  'JULIO',
  'AGOSTO',
  'SEPTIEMBRE',
  'OCTUBRE',
  'NOVIEMBRE',
  'DICIEMBRE',
] as const

export const SPANISH_MONTH_TO_NUMBER: Record<string, number> = {
  ENERO: 1,
  FEBRERO: 2,
  MARZO: 3,
  ABRIL: 4,
  MAYO: 5,
  JUNIO: 6,
  JULIO: 7,
  AGOSTO: 8,
  SEPTIEMBRE: 9,
  OCTUBRE: 10,
  NOVIEMBRE: 11,
  DICIEMBRE: 12,
}

export const NUMBER_TO_SPANISH_MONTH: Record<number, string> = Object.fromEntries(
  Object.entries(SPANISH_MONTH_TO_NUMBER).map(([name, month]) => [month, name]),
)

export const EXPECTED_AGREEMENTS = {
  yearSelectNameIncludes: 'ddAnio',
  oficioHrefIncludes: 'DescargaAcuerdo.aspx',
  oficioTitleIncludes: 'Oficio SHCP',
  dacOficioTitlePattern:
    /Oficio\s+SHCP\s+[\w.-]+\s+Tarifa\s+DAC\s+([A-Za-zÁÉÍÓÚáéíóú]+)\s+(\d{4})/i,
  tfsbOficioTitlePattern:
    /Oficio\s+SHCP\s+[\w.-]+\s+TFSB\s+Dom[eé]sticas.*?(?:Factor\s+de\s+Ajuste\s+)?(\d{4})/i,
} as const

export const EXPECTED_DAC = {
  yearSelectNameIncludes: 'ddAnio',
  monthSelectNameIncludes: 'ddMes',
  expectedLimitCodes: ['1', '1A', '1B', '1C', '1D', '1E', '1F'] as const,
} as const

export const EXPECTED_TARIFA_1 = {
  consultMonthSelectNameIncludes: 'ddMesConsulta',
} as const

export const EXPECTED_TARIFA_1B = {
  summerStartSelectNameIncludes: 'ddMesVerano',
  consultMonthSelectNameIncludes: 'ddMesConsulta',
} as const

export const USER_AGENT =
  'CFE-Calculator-Monitor/1.0 (+https://github.com; weekly tariff publication check)'

export const FETCH_TIMEOUT_MS = 30_000
export const FETCH_RETRIES = 2
