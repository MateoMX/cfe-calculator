export interface StateInfo {
  code: string
  name: string
  municipalities: string[]
  regionalNotes: string[]
}

/**
 * Catálogo orientativo de entidades y municipios.
 * La tarifa y el mes de inicio de verano deben confirmarse con el recibo CFE:
 * CFE asigna por localidad y no publica un catálogo completo abierto.
 */
export const STATES: StateInfo[] = [
  {
    code: 'AGU',
    name: 'Aguascalientes',
    municipalities: ['Aguascalientes', 'Jesús María', 'Calvillo'],
    regionalNotes: [],
  },
  {
    code: 'BCN',
    name: 'Baja California',
    municipalities: ['Mexicali', 'Tijuana', 'Ensenada', 'Tecate', 'Playas de Rosarito', 'San Felipe'],
    regionalNotes: [
      'En Mexicali y San Felipe (tarifa 1F) han existido apoyos estatales adicionales en verano. Confirma en tu recibo si aplica un esquema especial.',
    ],
  },
  {
    code: 'BCS',
    name: 'Baja California Sur',
    municipalities: ['La Paz', 'Los Cabos', 'Comondú', 'Mulegé', 'Loreto'],
    regionalNotes: [],
  },
  {
    code: 'CAM',
    name: 'Campeche',
    municipalities: ['Campeche', 'Ciudad del Carmen', 'Champotón'],
    regionalNotes: [],
  },
  {
    code: 'CHP',
    name: 'Chiapas',
    municipalities: ['Tuxtla Gutiérrez', 'Tapachula', 'San Cristóbal de las Casas'],
    regionalNotes: [],
  },
  {
    code: 'CHH',
    name: 'Chihuahua',
    municipalities: ['Chihuahua', 'Juárez', 'Cuauhtémoc', 'Delicias'],
    regionalNotes: [],
  },
  {
    code: 'CMX',
    name: 'Ciudad de México',
    municipalities: [
      'Álvaro Obregón',
      'Azcapotzalco',
      'Benito Juárez',
      'Coyoacán',
      'Cuauhtémoc',
      'Gustavo A. Madero',
      'Iztapalapa',
      'Miguel Hidalgo',
      'Tlalpan',
      'Xochimilco',
    ],
    regionalNotes: [],
  },
  {
    code: 'COA',
    name: 'Coahuila',
    municipalities: ['Saltillo', 'Torreón', 'Monclova', 'Piedras Negras'],
    regionalNotes: [],
  },
  {
    code: 'COL',
    name: 'Colima',
    municipalities: ['Colima', 'Manzanillo', 'Tecomán'],
    regionalNotes: [],
  },
  {
    code: 'DUR',
    name: 'Durango',
    municipalities: ['Durango', 'Gómez Palacio', 'Lerdo'],
    regionalNotes: [],
  },
  {
    code: 'GUA',
    name: 'Guanajuato',
    municipalities: ['León', 'Irapuato', 'Celaya', 'Guanajuato', 'Salamanca'],
    regionalNotes: [],
  },
  {
    code: 'GRO',
    name: 'Guerrero',
    municipalities: ['Acapulco de Juárez', 'Chilpancingo de los Bravo', 'Iguala de la Independencia', 'Zihuatanejo de Azueta'],
    regionalNotes: [],
  },
  {
    code: 'HID',
    name: 'Hidalgo',
    municipalities: ['Pachuca de Soto', 'Tulancingo de Bravo', 'Tula de Allende'],
    regionalNotes: [],
  },
  {
    code: 'JAL',
    name: 'Jalisco',
    municipalities: ['Guadalajara', 'Zapopan', 'Tlaquepaque', 'Tonalá', 'Puerto Vallarta', 'Tlajomulco de Zúñiga'],
    regionalNotes: [],
  },
  {
    code: 'MEX',
    name: 'Estado de México',
    municipalities: ['Toluca', 'Ecatepec de Morelos', 'Naucalpan de Juárez', 'Nezahualcóyotl', 'Tlalnepantla de Baz'],
    regionalNotes: [],
  },
  {
    code: 'MIC',
    name: 'Michoacán',
    municipalities: ['Morelia', 'Uruapan', 'Lázaro Cárdenas', 'Zamora'],
    regionalNotes: [],
  },
  {
    code: 'MOR',
    name: 'Morelos',
    municipalities: ['Cuernavaca', 'Jiutepec', 'Cuautla', 'Temixco'],
    regionalNotes: [],
  },
  {
    code: 'NAY',
    name: 'Nayarit',
    municipalities: [
      'Tepic',
      'Bahía de Banderas',
      'Santiago Ixcuintla',
      'Compostela',
      'San Blas',
      'Ruiz',
      'Tuxpan',
      'Rosamorada',
      'Tecuala',
      'Acaponeta',
      'Huajicori',
    ],
    regionalNotes: [
      'En municipios del norte de Nayarit han existido apoyos que aplican estructura de tarifa 1D durante todo el año. Verifica tu recibo.',
    ],
  },
  {
    code: 'NLE',
    name: 'Nuevo León',
    municipalities: ['Monterrey', 'Guadalupe', 'San Nicolás de los Garza', 'Apodaca', 'San Pedro Garza García'],
    regionalNotes: [],
  },
  {
    code: 'OAX',
    name: 'Oaxaca',
    municipalities: ['Oaxaca de Juárez', 'Salina Cruz', 'Juchitán de Zaragoza', 'Puerto Escondido'],
    regionalNotes: [],
  },
  {
    code: 'PUE',
    name: 'Puebla',
    municipalities: ['Puebla', 'Tehuacán', 'San Martín Texmelucan', 'Atlixco'],
    regionalNotes: [],
  },
  {
    code: 'QUE',
    name: 'Querétaro',
    municipalities: ['Querétaro', 'San Juan del Río', 'El Marqués', 'Corregidora'],
    regionalNotes: [],
  },
  {
    code: 'ROO',
    name: 'Quintana Roo',
    municipalities: ['Benito Juárez', 'Solidaridad', 'Othón P. Blanco', 'Isla Mujeres', 'Tulum'],
    regionalNotes: [],
  },
  {
    code: 'SLP',
    name: 'San Luis Potosí',
    municipalities: ['San Luis Potosí', 'Soledad de Graciano Sánchez', 'Ciudad Valles'],
    regionalNotes: [],
  },
  {
    code: 'SIN',
    name: 'Sinaloa',
    municipalities: ['Culiacán', 'Mazatlán', 'Ahome', 'Guasave', 'Navolato'],
    regionalNotes: [
      'En Sinaloa han existido convenios estatales que facturan con estructura 1F en verano a usuarios domésticos donde no aplica 1F de forma ordinaria. Confirma en tu recibo.',
    ],
  },
  {
    code: 'SON',
    name: 'Sonora',
    municipalities: [
      'Hermosillo',
      'Cajeme',
      'Nogales',
      'San Luis Río Colorado',
      'Navojoa',
      'Guaymas',
      'Agua Prieta',
      'Cananea',
      'Naco',
      'Santa Cruz',
      'Bacoachi',
    ],
    regionalNotes: [
      'En Sonora han existido convenios estatales que aplican estructura 1F en verano a usuarios domésticos. En frontera norte el límite DAC puede modificarse por apoyo estatal. Confirma en tu recibo.',
    ],
  },
  {
    code: 'TAB',
    name: 'Tabasco',
    municipalities: ['Centro', 'Cárdenas', 'Comalcalco', 'Huimanguillo', 'Macuspana'],
    regionalNotes: [
      'Tabasco ha tenido convenios estatales de homologación hacia tarifa 1F para usuarios domésticos. Usa la tarifa impresa en tu recibo.',
    ],
  },
  {
    code: 'TAM',
    name: 'Tamaulipas',
    municipalities: ['Reynosa', 'Matamoros', 'Tampico', 'Nuevo Laredo', 'Ciudad Victoria'],
    regionalNotes: [],
  },
  {
    code: 'TLA',
    name: 'Tlaxcala',
    municipalities: ['Tlaxcala', 'Apizaco', 'Huamantla'],
    regionalNotes: [],
  },
  {
    code: 'VER',
    name: 'Veracruz',
    municipalities: ['Veracruz', 'Xalapa', 'Coatzacoalcos', 'Córdoba', 'Poza Rica', 'Orizaba'],
    regionalNotes: [],
  },
  {
    code: 'YUC',
    name: 'Yucatán',
    municipalities: ['Mérida', 'Kanasín', 'Progreso', 'Valladolid', 'Umán'],
    regionalNotes: [],
  },
  {
    code: 'ZAC',
    name: 'Zacatecas',
    municipalities: ['Zacatecas', 'Fresnillo', 'Guadalupe'],
    regionalNotes: [],
  },
]

export function getState(code: string): StateInfo | undefined {
  return STATES.find((state) => state.code === code)
}

export function regionalNotesFor(stateCode: string, municipality: string): string[] {
  const state = getState(stateCode)
  if (!state) return []
  const notes = [...state.regionalNotes]
  if (
    stateCode === 'BCN' &&
    (municipality === 'Mexicali' || municipality === 'San Felipe')
  ) {
    notes.push(
      'Mexicali y San Felipe suelen clasificarse en 1F; el recibo es la fuente definitiva de tu tarifa y periodo de verano.',
    )
  }
  return notes
}
