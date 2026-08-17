import type {
  DomesticTariffDefinition,
  DacMonthSchedule,
  DacRegionRates,
  MonthNumber,
  RateBlock,
  Season,
  TariffSnapshotMeta,
} from '../domain/types'

export const TARIFF_SNAPSHOT_META: TariffSnapshotMeta = {
  asOf: '2026-08-17',
  year: 2026,
  sourceName: 'CFE Tarifas Hogar / Oficios SHCP 349-B-1-070 y DAC mensuales',
  sourceUrl: 'https://app.cfe.mx/Aplicaciones/CCFE/Tarifas/TarifasCRECasa/',
  agreementsUrl:
    'https://app.cfe.mx/Aplicaciones/CCFE/Tarifas/TarifasCRECasa/Acuerdos/AcuerdosCasa.aspx',
  dacUrl:
    'https://app.cfe.mx/Aplicaciones/CCFE/Tarifas/TarifasCRECasa/Tarifas/TarifaDAC.aspx',
  manualUrl: 'http://www.diputados.gob.mx/LeyesBiblio/regla/n365.pdf',
  notes: [
    'Última actualización: 17 de agosto de 2026. Las tarifas son correctas a esta fecha.',
    'Los bloques mensuales y las cuotas domésticas 1–1F de 2026 provienen del Oficio SHCP 349-B-1-070 (TFSB / Factor de Ajuste). El 17 de agosto de 2026 se descargaron del portal CFE las páginas Tarifa 1 y 1A–1F (12 meses; verano y fuera) y las seis regiones DAC.',
    'Verano doméstico: el portal publica cuotas de verano para febrero–octubre cuando el mes de inicio de verano cae en esa ventana (inicios oficiales 2–5). Enero, noviembre y diciembre no pueden ser verano con ese esquema.',
    'DAC: cuotas regionales oficiales mes a mes (enero–agosto 2026) del portal CFE / oficios SHCP; agosto = Oficio 349-B-1-078. Septiembre aparece en el selector del portal pero aún no publica tablas de cuotas.',
    'El verano local es de seis meses consecutivos a partir del mes de inicio fijado para la localidad.',
    'En periodos bimestrales mixtos, el consumo se reparte por días de verano y fuera de verano; cada fracción se cobra con los cupos mensuales oficiales de esa temporada (supuesto documentado; el Manual no detalla el reparto exacto del kWh agregado).',
  ],
}

const MONTHS = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12] as const satisfies readonly MonthNumber[]

function monthlySeries(values: number[]): Record<MonthNumber, number> {
  const out = {} as Record<MonthNumber, number>
  MONTHS.forEach((month, index) => {
    out[month] = values[index]!
  })
  return out
}

const BASIC_COMMON = monthlySeries([
  1.11, 1.113, 1.116, 1.119, 1.122, 1.125, 1.128, 1.132, 1.136, 1.14, 1.144, 1.148,
])
const INTER_COMMON = monthlySeries([
  1.349, 1.353, 1.357, 1.361, 1.365, 1.369, 1.373, 1.377, 1.381, 1.385, 1.389, 1.393,
])
const EXCESS_COMMON = monthlySeries([
  3.944, 3.956, 3.968, 3.98, 3.992, 4.004, 4.016, 4.028, 4.041, 4.054, 4.067, 4.08,
])

/** Summer $/kWh for 1A–1D. Feb–Oct are published; Jan/Nov/Dec cannot fall in a Feb–May summer window. */
const SUMMER_BASIC_1A_1D = monthlySeries([
  BASIC_COMMON[1],
  0.995,
  0.998,
  1.001,
  1.004,
  1.007,
  1.01,
  1.013,
  1.016,
  1.019,
  BASIC_COMMON[11],
  BASIC_COMMON[12],
])
const SUMMER_INTER_1A_1D = monthlySeries([
  INTER_COMMON[1],
  1.151,
  1.155,
  1.159,
  1.163,
  1.167,
  1.171,
  1.175,
  1.179,
  1.183,
  INTER_COMMON[11],
  INTER_COMMON[12],
])
const SUMMER_HIGH_1C_1D = monthlySeries([
  0, 1.48, 1.485, 1.49, 1.495, 1.5, 1.505, 1.51, 1.515, 1.52, 0, 0,
])

/** Summer $/kWh for 1E–1F (Feb–Oct published). */
const SUMMER_BASIC_1E_1F = monthlySeries([
  BASIC_COMMON[1],
  0.83,
  0.833,
  0.836,
  0.839,
  0.842,
  0.845,
  0.848,
  0.851,
  0.854,
  BASIC_COMMON[11],
  BASIC_COMMON[12],
])
const SUMMER_LOW_1E_1F = monthlySeries([
  INTER_COMMON[1],
  1.03,
  1.033,
  1.036,
  1.039,
  1.042,
  1.045,
  1.048,
  1.051,
  1.054,
  INTER_COMMON[11],
  INTER_COMMON[12],
])
const SUMMER_HIGH_1E = monthlySeries([
  0, 1.336, 1.34, 1.344, 1.348, 1.352, 1.356, 1.36, 1.364, 1.368, 0, 0,
])
const SUMMER_HIGH_1F = monthlySeries([
  0, 2.502, 2.51, 2.518, 2.526, 2.534, 2.542, 2.55, 2.558, 2.566, 0, 0,
])

function blocks(
  items: Array<[RateBlock['key'], string, number]>,
): RateBlock[] {
  return items.map(([key, label, allowanceKwh]) => ({ key, label, allowanceKwh }))
}

function buildRates(
  seasonResolver: (month: MonthNumber) => Season,
  priceFor: (month: MonthNumber, season: Season) => Partial<Record<RateBlock['key'], number>>,
) {
  return MONTHS.map((month) => {
    const season = seasonResolver(month)
    return {
      year: 2026,
      month,
      season,
      prices: priceFor(month, season),
    }
  })
}

/** Helper: rates when summer months are known for the rate table itself.
 * Actual season for a user depends on their summer start month. */
function alwaysNonSummer(): Season {
  return 'fuera'
}

function tariff1(): DomesticTariffDefinition {
  return {
    code: '1',
    name: 'Tarifa 1',
    minSummerTempC: null,
    dacLimitKwhMonth: 250,
    blocksBySeason: {
      verano: blocks([
        ['basico', 'Básico', 75],
        ['intermedio', 'Intermedio', 65],
        ['excedente', 'Excedente', Number.POSITIVE_INFINITY],
      ]),
      fuera: blocks([
        ['basico', 'Básico', 75],
        ['intermedio', 'Intermedio', 65],
        ['excedente', 'Excedente', Number.POSITIVE_INFINITY],
      ]),
    },
    monthlyRates: buildRates(alwaysNonSummer, (month) => ({
      basico: BASIC_COMMON[month],
      intermedio: INTER_COMMON[month],
      excedente: EXCESS_COMMON[month],
    })),
  }
}

function makeWarmTariff(
  code: DomesticTariffDefinition['code'],
  name: string,
  temp: number,
  dacLimit: number,
  summerBlocks: RateBlock[],
  nonSummerBlocks: RateBlock[],
  summerPrices: (
    month: MonthNumber,
  ) => Partial<Record<RateBlock['key'], number>>,
  nonSummerPrices: (
    month: MonthNumber,
  ) => Partial<Record<RateBlock['key'], number>>,
): DomesticTariffDefinition {
  return {
    code,
    name,
    minSummerTempC: temp,
    dacLimitKwhMonth: dacLimit,
    blocksBySeason: {
      verano: summerBlocks,
      fuera: nonSummerBlocks,
    },
    // Store both season price tables for every month so the engine can pick by user season.
    monthlyRates: MONTHS.flatMap((month) => [
      {
        year: 2026,
        month,
        season: 'verano' as const,
        prices: summerPrices(month),
      },
      {
        year: 2026,
        month,
        season: 'fuera' as const,
        prices: nonSummerPrices(month),
      },
    ]),
  }
}

const nonSummerSimple = (month: MonthNumber) => ({
  basico: BASIC_COMMON[month],
  intermedio: INTER_COMMON[month],
  excedente: EXCESS_COMMON[month],
})

export const DOMESTIC_TARIFFS: Record<
  Exclude<DomesticTariffDefinition['code'], never>,
  DomesticTariffDefinition
> = {
  '1': tariff1(),
  '1A': makeWarmTariff(
    '1A',
    'Tarifa 1A',
    25,
    300,
    blocks([
      ['basico', 'Básico', 100],
      ['intermedio', 'Intermedio', 50],
      ['excedente', 'Excedente', Number.POSITIVE_INFINITY],
    ]),
    blocks([
      ['basico', 'Básico', 75],
      ['intermedio', 'Intermedio', 75],
      ['excedente', 'Excedente', Number.POSITIVE_INFINITY],
    ]),
    (month) => ({
      basico: SUMMER_BASIC_1A_1D[month],
      intermedio: SUMMER_INTER_1A_1D[month],
      excedente: EXCESS_COMMON[month],
    }),
    nonSummerSimple,
  ),
  '1B': makeWarmTariff(
    '1B',
    'Tarifa 1B',
    28,
    400,
    blocks([
      ['basico', 'Básico', 125],
      ['intermedio', 'Intermedio', 100],
      ['excedente', 'Excedente', Number.POSITIVE_INFINITY],
    ]),
    blocks([
      ['basico', 'Básico', 75],
      ['intermedio', 'Intermedio', 100],
      ['excedente', 'Excedente', Number.POSITIVE_INFINITY],
    ]),
    (month) => ({
      basico: SUMMER_BASIC_1A_1D[month],
      intermedio: SUMMER_INTER_1A_1D[month],
      excedente: EXCESS_COMMON[month],
    }),
    nonSummerSimple,
  ),
  '1C': makeWarmTariff(
    '1C',
    'Tarifa 1C',
    30,
    850,
    blocks([
      ['basico', 'Básico', 150],
      ['intermedioBajo', 'Intermedio bajo', 150],
      ['intermedioAlto', 'Intermedio alto', 150],
      ['excedente', 'Excedente', Number.POSITIVE_INFINITY],
    ]),
    blocks([
      ['basico', 'Básico', 75],
      ['intermedio', 'Intermedio', 100],
      ['excedente', 'Excedente', Number.POSITIVE_INFINITY],
    ]),
    (month) => ({
      basico: SUMMER_BASIC_1A_1D[month],
      intermedioBajo: SUMMER_INTER_1A_1D[month],
      intermedioAlto: SUMMER_HIGH_1C_1D[month],
      excedente: EXCESS_COMMON[month],
    }),
    nonSummerSimple,
  ),
  '1D': makeWarmTariff(
    '1D',
    'Tarifa 1D',
    31,
    1000,
    blocks([
      ['basico', 'Básico', 175],
      ['intermedioBajo', 'Intermedio bajo', 225],
      ['intermedioAlto', 'Intermedio alto', 200],
      ['excedente', 'Excedente', Number.POSITIVE_INFINITY],
    ]),
    blocks([
      ['basico', 'Básico', 75],
      ['intermedio', 'Intermedio', 125],
      ['excedente', 'Excedente', Number.POSITIVE_INFINITY],
    ]),
    (month) => ({
      basico: SUMMER_BASIC_1A_1D[month],
      intermedioBajo: SUMMER_INTER_1A_1D[month],
      intermedioAlto: SUMMER_HIGH_1C_1D[month],
      excedente: EXCESS_COMMON[month],
    }),
    nonSummerSimple,
  ),
  '1E': makeWarmTariff(
    '1E',
    'Tarifa 1E',
    32,
    2000,
    blocks([
      ['basico', 'Básico', 300],
      ['intermedioBajo', 'Intermedio bajo', 450],
      ['intermedioAlto', 'Intermedio alto', 150],
      ['excedente', 'Excedente', Number.POSITIVE_INFINITY],
    ]),
    blocks([
      ['basico', 'Básico', 75],
      ['intermedio', 'Intermedio', 125],
      ['excedente', 'Excedente', Number.POSITIVE_INFINITY],
    ]),
    (month) => ({
      basico: SUMMER_BASIC_1E_1F[month],
      intermedioBajo: SUMMER_LOW_1E_1F[month],
      intermedioAlto: SUMMER_HIGH_1E[month],
      excedente: EXCESS_COMMON[month],
    }),
    nonSummerSimple,
  ),
  '1F': makeWarmTariff(
    '1F',
    'Tarifa 1F',
    33,
    2500,
    blocks([
      ['basico', 'Básico', 300],
      ['intermedioBajo', 'Intermedio bajo', 900],
      ['intermedioAlto', 'Intermedio alto', 1300],
      ['excedente', 'Excedente', Number.POSITIVE_INFINITY],
    ]),
    blocks([
      ['basico', 'Básico', 75],
      ['intermedio', 'Intermedio', 125],
      ['excedente', 'Excedente', Number.POSITIVE_INFINITY],
    ]),
    (month) => ({
      basico: SUMMER_BASIC_1E_1F[month],
      intermedioBajo: SUMMER_LOW_1E_1F[month],
      intermedioAlto: SUMMER_HIGH_1F[month],
      excedente: EXCESS_COMMON[month],
    }),
    nonSummerSimple,
  ),
}

type DacMonthRow = {
  month: MonthNumber
  fixedCharge: number
  regions: Array<{
    regionId: string
    regionName: string
    energySummer: number
    energyNonSummer: number | null
  }>
}

/**
 * Official monthly DAC schedules from the CFE Tarifa DAC portal
 * (section 6.- Cuotas aplicables) and matching SHCP monthly oficios.
 *
 * How to refresh: open dacUrl, choose year, then a month in section 6.
 * CFE renders two tables — Baja California / Baja California Sur (summer +
 * non-summer energy) and the other regions (summer energy only, national
 * fixed charge). Copy those numbers into a new row below. The month dropdown
 * can list a future month before cuotas exist; skip any month whose tables
 * are empty. Cross-check the matching “Oficio SHCP … Tarifa DAC {mes} {año}”
 * PDF on agreementsUrl. Only months with published values belong here.
 */
const DAC_MONTH_ROWS: DacMonthRow[] = [
  {
    month: 1,
    fixedCharge: 142.41,
    regions: [
      { regionId: 'baja-california', regionName: 'Baja California', energySummer: 6.469, energyNonSummer: 5.557 },
      { regionId: 'baja-california-sur', regionName: 'Baja California Sur', energySummer: 7.049, energyNonSummer: 5.557 },
      { regionId: 'noroeste', regionName: 'Noroeste', energySummer: 6.234, energyNonSummer: null },
      { regionId: 'norte-noreste', regionName: 'Norte y Noreste', energySummer: 6.073, energyNonSummer: null },
      { regionId: 'sur-peninsular', regionName: 'Sur y Peninsular', energySummer: 6.169, energyNonSummer: null },
      { regionId: 'central', regionName: 'Central', energySummer: 6.653, energyNonSummer: null },
    ],
  },
  {
    month: 2,
    fixedCharge: 143.19,
    regions: [
      { regionId: 'baja-california', regionName: 'Baja California', energySummer: 6.45, energyNonSummer: 5.54 },
      { regionId: 'baja-california-sur', regionName: 'Baja California Sur', energySummer: 7.028, energyNonSummer: 5.54 },
      { regionId: 'noroeste', regionName: 'Noroeste', energySummer: 6.215, energyNonSummer: null },
      { regionId: 'norte-noreste', regionName: 'Norte y Noreste', energySummer: 6.055, energyNonSummer: null },
      { regionId: 'sur-peninsular', regionName: 'Sur y Peninsular', energySummer: 6.15, energyNonSummer: null },
      { regionId: 'central', regionName: 'Central', energySummer: 6.633, energyNonSummer: null },
    ],
  },
  {
    month: 3,
    fixedCharge: 144.46,
    regions: [
      { regionId: 'baja-california', regionName: 'Baja California', energySummer: 7.038, energyNonSummer: 6.045 },
      { regionId: 'baja-california-sur', regionName: 'Baja California Sur', energySummer: 7.669, energyNonSummer: 6.045 },
      { regionId: 'noroeste', regionName: 'Noroeste', energySummer: 6.782, energyNonSummer: null },
      { regionId: 'norte-noreste', regionName: 'Norte y Noreste', energySummer: 6.607, energyNonSummer: null },
      { regionId: 'sur-peninsular', regionName: 'Sur y Peninsular', energySummer: 6.711, energyNonSummer: null },
      { regionId: 'central', regionName: 'Central', energySummer: 7.238, energyNonSummer: null },
    ],
  },
  {
    month: 4,
    fixedCharge: 144.95,
    regions: [
      { regionId: 'baja-california', regionName: 'Baja California', energySummer: 6.392, energyNonSummer: 5.49 },
      { regionId: 'baja-california-sur', regionName: 'Baja California Sur', energySummer: 6.965, energyNonSummer: 5.49 },
      { regionId: 'noroeste', regionName: 'Noroeste', energySummer: 6.159, energyNonSummer: null },
      { regionId: 'norte-noreste', regionName: 'Norte y Noreste', energySummer: 6.0, energyNonSummer: null },
      { regionId: 'sur-peninsular', regionName: 'Sur y Peninsular', energySummer: 6.095, energyNonSummer: null },
      { regionId: 'central', regionName: 'Central', energySummer: 6.574, energyNonSummer: null },
    ],
  },
  {
    month: 5,
    fixedCharge: 145.24,
    regions: [
      { regionId: 'baja-california', regionName: 'Baja California', energySummer: 6.653, energyNonSummer: 5.714 },
      { regionId: 'baja-california-sur', regionName: 'Baja California Sur', energySummer: 7.249, energyNonSummer: 5.714 },
      { regionId: 'noroeste', regionName: 'Noroeste', energySummer: 6.41, energyNonSummer: null },
      { regionId: 'norte-noreste', regionName: 'Norte y Noreste', energySummer: 6.245, energyNonSummer: null },
      { regionId: 'sur-peninsular', regionName: 'Sur y Peninsular', energySummer: 6.344, energyNonSummer: null },
      { regionId: 'central', regionName: 'Central', energySummer: 6.842, energyNonSummer: null },
    ],
  },
  {
    month: 6,
    fixedCharge: 144.79,
    regions: [
      { regionId: 'baja-california', regionName: 'Baja California', energySummer: 6.566, energyNonSummer: 5.639 },
      { regionId: 'baja-california-sur', regionName: 'Baja California Sur', energySummer: 7.154, energyNonSummer: 5.639 },
      { regionId: 'noroeste', regionName: 'Noroeste', energySummer: 6.326, energyNonSummer: null },
      { regionId: 'norte-noreste', regionName: 'Norte y Noreste', energySummer: 6.163, energyNonSummer: null },
      { regionId: 'sur-peninsular', regionName: 'Sur y Peninsular', energySummer: 6.261, energyNonSummer: null },
      { regionId: 'central', regionName: 'Central', energySummer: 6.752, energyNonSummer: null },
    ],
  },
  {
    month: 7,
    fixedCharge: 144.95,
    regions: [
      { regionId: 'baja-california', regionName: 'Baja California', energySummer: 6.528, energyNonSummer: 5.606 },
      { regionId: 'baja-california-sur', regionName: 'Baja California Sur', energySummer: 7.113, energyNonSummer: 5.606 },
      { regionId: 'noroeste', regionName: 'Noroeste', energySummer: 6.289, energyNonSummer: null },
      { regionId: 'norte-noreste', regionName: 'Norte y Noreste', energySummer: 6.127, energyNonSummer: null },
      { regionId: 'sur-peninsular', regionName: 'Sur y Peninsular', energySummer: 6.225, energyNonSummer: null },
      { regionId: 'central', regionName: 'Central', energySummer: 6.713, energyNonSummer: null },
    ],
  },
  {
    month: 8,
    fixedCharge: 145.04,
    regions: [
      { regionId: 'baja-california', regionName: 'Baja California', energySummer: 6.447, energyNonSummer: 5.536 },
      { regionId: 'baja-california-sur', regionName: 'Baja California Sur', energySummer: 7.025, energyNonSummer: 5.536 },
      { regionId: 'noroeste', regionName: 'Noroeste', energySummer: 6.211, energyNonSummer: null },
      { regionId: 'norte-noreste', regionName: 'Norte y Noreste', energySummer: 6.051, energyNonSummer: null },
      { regionId: 'sur-peninsular', regionName: 'Sur y Peninsular', energySummer: 6.148, energyNonSummer: null },
      { regionId: 'central', regionName: 'Central', energySummer: 6.63, energyNonSummer: null },
    ],
  },
]

export const DAC_MONTHLY_SCHEDULES: DacMonthSchedule[] = DAC_MONTH_ROWS.map((row) => ({
  year: 2026,
  month: row.month,
  regions: row.regions.map((region) => ({
    regionId: region.regionId,
    regionName: region.regionName,
    fixedCharge: row.fixedCharge,
    energySummer: region.energySummer,
    energyNonSummer: region.energyNonSummer,
  })),
}))

/** Latest published DAC month in this snapshot (used by the calculator). */
export const DAC_REGIONS: DacRegionRates[] =
  DAC_MONTHLY_SCHEDULES[DAC_MONTHLY_SCHEDULES.length - 1]!.regions

export const IVA_RATE = 0.16
export const MONTHLY_MINIMUM_KWH = 25

export const TARIFF_OPTIONS = [
  { code: '1' as const, label: 'Tarifa 1' },
  { code: '1A' as const, label: 'Tarifa 1A' },
  { code: '1B' as const, label: 'Tarifa 1B' },
  { code: '1C' as const, label: 'Tarifa 1C' },
  { code: '1D' as const, label: 'Tarifa 1D' },
  { code: '1E' as const, label: 'Tarifa 1E' },
  { code: '1F' as const, label: 'Tarifa 1F' },
  { code: 'DAC' as const, label: 'Tarifa DAC (alto consumo)' },
]
