import type { Language } from './types'

type Params = Record<string, string | number>

export type MessageKey = keyof typeof esMessages

const esMessages = {
  // Document
  'doc.title': 'Calculadora de recibo CFE',
  'doc.description':
    'Calculadora estática para estimar recibos domésticos de CFE a partir de lecturas del medidor, tarifa, ciclo y temporada de verano.',

  // Language switcher
  'lang.switcherLabel': 'Idioma',
  'lang.es': 'Español',
  'lang.en': 'English',

  // App chrome
  'app.title': 'Calculadora de recibo CFE',
  'app.blurb':
    'Estima tu próximo recibo doméstico a partir de lecturas del medidor, tu tarifa, el punto del ciclo de facturación y la temporada de verano.',
  'app.infoTip':
    'Esta herramienta también busca darte información adicional para ayudarte a entender conceptos importantes de tu recibo. Hay mucha información útil para aprender al hacer clic en los distintos iconos de información',
  'app.madeWithLoveLabel': 'Hecho con amor',
  'app.madeWithLove': 'Esta herramienta fue hecha con amor',
  'app.privacyNote': 'Todo corre en tu navegador; no se envían datos a ningún servidor.',
  'app.placeholderTitle': 'Tu resultado aparecerá aquí',
  'app.placeholderBody':
    'Completa el formulario con los datos de tu recibo y medidor. Verás el desglose por bloques (básico, intermedio, excedente), IVA y una explicación en lenguaje claro.',
  'app.placeholderItem1': 'Tarifas 1, 1A–1F y DAC',
  'app.placeholderItem2': 'Ciclos mensual y bimestral',
  'app.placeholderItem3': 'Reglas de verano y periodos mixtos',
  'app.metaUpdated': 'Última actualización: {date}. Las tarifas son correctas a esta fecha.',
  'app.footer':
    'No afiliado a CFE. Estimación informativa basada en publicaciones oficiales. El aviso-recibo prevalece sobre esta herramienta.',
  'nav.label': 'Secciones',
  'nav.menu': 'Menú',
  'nav.calculator': 'Calculadora',
  'nav.tariffs': 'Consulta de tarifas',

  // Tariff reference page
  'tariffs.title': 'Consulta de tarifas CFE',
  'tariffs.blurb':
    'Consulta mes a mes los límites subsidiados y las cuotas de las tarifas domésticas 1–1F, y compáralas con la DAC. Esta página usa la misma fotografía de datos que la calculadora.',
  'tariffs.dataStatusTitle': 'Estado de los datos',
  'tariffs.dataStatusLastCheck': 'Última verificación',
  'tariffs.dataStatusRange': 'Datos disponibles',
  'tariffs.dataStatusRangeValue': '{start} – {end}',
  'tariffs.controlsTitle': 'Qué quieres consultar',
  'tariffs.tariffSelectTitle': 'Selecciona tu tarifa',
  'tariffs.yearLabel': 'Año de las tarifas',
  'tariffs.yearHelpSelect':
    'Cuando CFE publique datos del año siguiente antes de que expire el actual, podrás consultar ambos aquí.',
  'tariffs.modeLabel': 'Tipo de tarifa',
  'tariffs.modeRegular': 'Tarifas normales',
  'tariffs.modeDac': 'Tarifa DAC',
  'tariffs.tariffLabel': 'Tarifa doméstica normal',
  'tariffs.monthLabel': 'Mes',
  'tariffs.regionLabel': 'Región DAC',
  'tariffs.priceSeasonLabel': 'Precios',
  'tariffs.priceSeasonSummer': 'Verano',
  'tariffs.priceSeasonStandard': 'Estándar',
  'tariffs.scaleLabel': 'Ciclo de facturación',
  'tariffs.scaleMonthly': 'Mensual',
  'tariffs.scaleBimonthly': 'Bimestral',
  'tariffs.seasonFilterLabel': 'Temporada en la tabla anual',
  'tariffs.seasonSummer': 'Verano',
  'tariffs.seasonNonSummer': 'Fuera de verano',
  'tariffs.selectedSummary': 'Resumen de {tariff}',
  'tariffs.temperatureBelow':
    'Para localidades con temperatura media mínima en verano menor de 25 °C. No cambia por temporada.',
  'tariffs.temperatureAtLeast':
    'Para localidades con temperatura media mínima en verano de al menos {temperature} °C.',
  'tariffs.dacThreshold': 'Límite DAC (promedio móvil de 12 meses)',
  'tariffs.dacThresholdValueMonthly': '{limit} kWh/mes',
  'tariffs.dacThresholdValueBimonthly': '{limit} kWh/bimestre',
  'tariffs.dacThresholdInfoLabel': 'Cómo se calcula el límite DAC',
  'tariffs.summerReminder':
    'Los precios de verano solo aplican durante una ventana de seis meses consecutivos, según el mes de inicio de verano de tu localidad.',
  'tariffs.summerUnsupported': '{tariff} no cuenta con una tarifa de verano.',
  'tariffs.monthDetailTitle': 'Desglose de {month} {year}',
  'tariffs.monthDetailPrefix': 'Desglose de',
  'tariffs.monthNavLabel': 'Mes del desglose',
  'tariffs.previousMonth': 'Mes anterior',
  'tariffs.nextMonth': 'Mes siguiente',
  'tariffs.summerColumn': 'Precios de verano',
  'tariffs.nonSummerColumn': 'Precios estándar (fuera de verano)',
  'tariffs.summerBadge': 'Verano',
  'tariffs.nonSummerBadge': 'Estándar',
  'tariffs.blockColumn': 'Bloque',
  'tariffs.allowanceColumn': 'Cupo del bloque',
  'tariffs.cumulativeColumn': 'Hasta (acumulado)',
  'tariffs.rateColumn': 'Precio',
  'tariffs.totalSubsidised': 'Total de kWh subsidiados disponibles: {kwh}',
  'tariffs.allowanceValueMonthly': '{kwh} kWh/mes',
  'tariffs.allowanceValueBimonthly': '{kwh} kWh/bimestre',
  'tariffs.allowanceOpen': 'Sin límite',
  'tariffs.rateUnavailable': 'No publicado',
  'tariffs.scaleNoteMonthly':
    'Cupos subsidiados y límite DAC mostrados en valores mensuales oficiales.',
  'tariffs.scaleNoteBimonthly':
    'Cupos subsidiados y límite DAC mostrados para un ciclo bimestral (el doble de los valores mensuales oficiales). El umbral DAC oficial sigue midiendo el promedio móvil mensual.',
  'tariffs.showFullYear': 'Mostrar cuotas de todo {year}',
  'tariffs.hideFullYear': 'Ocultar cuotas de todo {year}',
  'tariffs.yearTitle': '{year} a la vista ({season})',
  'tariffs.yearHelp':
    'Cada celda muestra la cuota del mes para el bloque indicado. “No publicado” significa que esta fotografía no incluye un precio válido para ese cruce (por ejemplo, bandas altas de verano fuera de los meses en que CFE las publica).',
  'tariffs.monthColumn': 'Mes',
  'tariffs.dacPanelTitle': 'Tarifa DAC por región',
  'tariffs.dacPanelIntro':
    'Si estás en DAC, esta sección muestra las cuotas regionales más recientes. DAC no tiene bloques subsidiados: toda la energía se cobra a la cuota DAC más el cargo fijo.',
  'tariffs.dacFixed': 'Cargo fijo',
  'tariffs.dacEnergy': 'Energía',
  'tariffs.dacEnergySummer': 'Energía (verano)',
  'tariffs.dacEnergyNonSummer': 'Energía (fuera de verano)',
  'tariffs.dacNoBlocks':
    'DAC no tiene bloques subsidiados (Básico/Intermedio): toda la energía se cobra a la cuota DAC más el cargo fijo.',
  'tariffs.dacReturnHint':
    'Para salir de DAC, CFE exige que el promedio móvil de 12 meses quede bajo el límite de tu tarifa doméstica aplicable y, además, una solicitud ante CFE.',
  'tariffs.sourcesTitle': 'Fuentes oficiales',
  'tariffs.sourcePortal': 'Portal CFE de tarifas domésticas',
  'tariffs.sourceAgreements': 'Acuerdos y oficios SHCP en CFE',
  'tariffs.sourceDac': 'Definición oficial de la tarifa DAC',
  'tariffs.sourceManual': 'Manual de disposiciones de facturación (DOF)',
  'tariffs.limitationsTitle': 'Limitaciones',
  'tariffs.limitation1':
    'No hay catálogo abierto de localidad → tarifa / inicio de verano; confirma esos datos en tu recibo o con CFE.',
  'tariffs.limitation2':
    'Los precios cambian mensualmente. Esta página refleja las fotografías anuales incorporadas al proyecto; puedes cambiar de año cuando haya más de una.',
  'tariffs.limitation3':
    'DAP y otros cargos municipales no forman parte de estas tablas.',
  'tariffs.backToCalculator': 'Volver a la calculadora',

  // Mobile chrome
  'mobile.back': 'Volver',
  'mobile.editInputs': 'Editar datos',
  'mobile.resultsTitle': 'Estimación',

  // Form
  'form.headerTitle': 'Datos de tu servicio',
  'form.headerBlurb': 'Confirma la tarifa y el mes de inicio de verano con tu recibo CFE.',
  'form.legendTariffCycle': 'Tarifa y ciclo',
  'form.tariffLabel': 'Tarifa impresa en tu recibo',
  'form.tariffInfoLabel': 'Qué es la tarifa',
  'form.tariffInfoDescription':
    'Tu tarifa es un componente importante para determinar cuánto pagarás por la energía que consumes. CFE otorga distintas cantidades de kWh con descuento y, a veces, precios distintos para esos kWh según tu tarifa específica.\n\nTu tarifa se determina según las temperaturas medias de verano. Como las temperaturas más altas suelen implicar un mayor uso de aire acondicionado, CFE ofrece los mayores descuentos en las tarifas de las localidades más calurosas.',
  'form.tariffExample': 'Ver en el recibo dónde está la tarifa',
  'form.summerStartLabel': 'Mes en que comienza el verano en tu localidad',
  'form.summerStartInfoLabel': 'Qué son los meses de verano',
  'form.summerStartInfoDescription':
    '{tariffName} incluye kWh adicionales subsidiados y tarifas con descuento durante los «meses de verano» designados.\n\nLos meses de verano son un periodo consecutivo de 6 meses. El mes de inicio se determina según las temperaturas locales observadas y modelos de predicción climática. Esta herramienta no cuenta con una base de datos central para saber en qué mes comienza el verano en tu zona, y distintos consumidores en distintas partes del país pueden tener periodos de verano diferentes aunque compartan la misma tarifa.\n\nPuedes preguntar en tu oficina local de CFE, llamar al 071 o contactarlos por redes sociales para confirmar el mes exacto en que inicia la tarifa de verano en tu zona.\n\nComo referencia, en 2026 la tarifa de verano comenzó en abril en Playa del Carmen.',
  'form.summerStartHelp':
    'Los precios de verano aplican durante seis meses ({veranoStart} a {veranoEnd} inclusive)',
  'form.selectPlaceholder': 'Selecciona…',
  'form.billingCycleLabel': 'Ciclo de facturación',
  'form.cycleBimestral': 'Bimestral (aprox. 60 días)',
  'form.cycleMensual': 'Mensual (aprox. 30 días)',
  'form.dacRegionLabel': 'Región DAC',
  'form.legendReadings': 'Lecturas y fechas',
  'form.previousReadingLabel': 'Lectura anterior (kWh del medidor al corte previo)',
  'form.previousReadingExample': 'Ver en el recibo dónde está la lectura anterior',
  'form.previousCutoffLabel': 'Fecha de corte del recibo anterior',
  'form.previousCutoffExample': 'Ver en el recibo dónde está la fecha de la última lectura',
  'form.currentReadingLabel': 'Lectura actual (kWh del medidor hoy)',
  'form.currentReadingDateLabel': 'Fecha de la lectura actual',
  'form.cutoffEstimateReady': 'Estimamos el próximo corte para el {date}.',
  'form.cutoffEstimateDetail':
    'Tomamos tu corte anterior del {previousDate} y sumamos aproximadamente {days} días por el ciclo {cycle} que seleccionaste.',
  'form.cutoffEstimatePending':
    'Cuando indiques la fecha del corte anterior, estimaremos el próximo corte sumando aproximadamente {days} días por tu ciclo {cycle}.',
  'form.expertMode': 'Modo experto',
  'form.expertModeHint': 'DAC y más',
  'form.expertModeInfo': 'Qué es el modo experto',
  'form.expertModeDescription':
    'Opciones adicionales, incluidos cargos extra como DAP (alumbrado público) y la tarifa DAC (Domestic Alto Consumo). Puedes activar el modo experto ahora si quieres aprender más; o, si tu estimación de consumo sugiere que conviene revisarlo con cuidado, te lo recordaremos en los cálculos de la siguiente sección.',
  'form.copyShareLink': 'Copiar enlace con mis datos',
  'form.copyShareLinkHint':
    'Crea un enlace con los valores actuales del formulario para recargarlos rápidamente.',
  'form.copyShareLinkCopied': 'Enlace copiado al portapapeles.',
  'form.copyShareLinkFailed': 'No se pudo copiar el enlace. Cópialo manualmente desde la barra de dirección tras pegarlo.',
  'form.otherChargesLabel': 'Otros cargos conocidos del recibo (DAP, etc.), sin IVA',
  'form.dapInfoLabel': 'Qué es el DAP',
  'form.dapInfoDescription':
    'El DAP (Derecho de Alumbrado Público) es un cargo que se aplica a tu recibo según tu ubicación para pagar el alumbrado de calles y espacios públicos de tu zona. Este dinero NO paga el alumbrado de áreas comunes en edificios privados.\n\nRecuerda que algunas zonas con mucho alumbrado público pueden tener un cargo DAP bajo si también están muy pobladas: hay más clientes de CFE entre los que se reparte el costo de ese alumbrado.',
  'form.historyTitle': 'Historial para riesgo DAC',
  'form.dacInfoLabel': 'Qué es la tarifa DAC',
  'form.dacInfoDescription':
    'DAC (Doméstica de Alto Consumo) es un esquema de facturación considerablemente más caro que CFE aplica a clientes que normalmente tienen la {tariffName} cuando su consumo mensual promedio de los últimos 12 meses supera {dacLimit} kWh.\n\nUn solo recibo alto puede no cambiarte inmediatamente a DAC si tu consumo fue menor en otros meses. Del mismo modo, después de varios meses de alto consumo, pueden hacer falta varios ciclos de facturación con menor consumo para reducir el promedio de 12 meses por debajo del límite y salir de la tarifa DAC.\n\nComo la DAC se calcula con un promedio móvil de 12 meses, es importante proporcionar tu historial de consumo previo para ayudar a estimar qué tan cerca puedes estar del umbral DAC.',
  'form.dacInfoDescriptionAlreadyDac':
    'DAC (Doméstica de Alto Consumo) es un esquema de facturación considerablemente más caro que CFE aplica cuando el consumo mensual promedio de los últimos 12 meses supera el límite de alto consumo de la tarifa doméstica correspondiente.\n\nUn solo recibo alto puede no cambiarte inmediatamente a DAC si tu consumo fue menor en otros meses. Del mismo modo, después de varios meses de alto consumo, pueden hacer falta varios ciclos de facturación con menor consumo para reducir el promedio de 12 meses por debajo del límite y salir de la tarifa DAC.\n\nComo la DAC se calcula con un promedio móvil de 12 meses, es importante proporcionar tu historial de consumo previo para ayudar a estimar qué tan cerca puedes estar del umbral DAC.',
  'form.historyNewestExample':
    'Ver en el recibo el consumo del periodo más reciente (columna Total periodo)',
  'form.historyOlderExampleLine':
    'Ver en el historial del recibo la línea {line} de kWh (uso historial {line})',
  'form.historyGroupMensual': 'Consumos kWh de los últimos 12 recibos mensuales',
  'form.historyGroupBimestral': 'Consumos kWh de los últimos 6 recibos bimestrales',
  'form.historyHintNote':
    'Fechas aproximadas para orientar el orden: el primer cuadro es el consumo del recibo más reciente (Total periodo en la tabla principal); los demás van de arriba hacia abajo en el historial del recibo. Las fechas reales pueden diferir unos días por la ruta de lectura de CFE.',
  'form.historySlotNewest': 'Más reciente',
  'form.historySlotOlder': 'Uso historial {line}',
  'form.historySlotNewestAria': 'Consumo más reciente (kWh)',
  'form.historySlotNewestAriaWithRange':
    'Consumo más reciente (kWh), periodo aproximado {range}',
  'form.historySlotOlderAria': 'Uso historial {line} (kWh)',
  'form.historySlotOlderAriaWithRange':
    'Uso historial {line} (kWh), periodo aproximado {range}',
  'form.submit': 'Calcular estimación',
  'form.cycleWordMensual': 'mensual',
  'form.cycleWordBimestral': 'bimestral',
  'form.tariffOption': 'Tarifa {code}',
  'form.tariffOptionDac': 'Tarifa DAC (alto consumo)',
  'form.tariffTemperatureBelow':
    'Para localidades con temperatura media mínima en verano menor de 25 °C.',
  'form.tariffTemperatureAtLeast':
    'Para localidades con temperatura media mínima en verano de al menos {temperature} °C.',

  // Dates
  'dates.today': 'hoy',
  'dates.daysAgo1': 'hace 1 día',
  'dates.daysAgoN': 'hace {days} días',
  'dates.month.1': 'enero',
  'dates.month.2': 'febrero',
  'dates.month.3': 'marzo',
  'dates.month.4': 'abril',
  'dates.month.5': 'mayo',
  'dates.month.6': 'junio',
  'dates.month.7': 'julio',
  'dates.month.8': 'agosto',
  'dates.month.9': 'septiembre',
  'dates.month.10': 'octubre',
  'dates.month.11': 'noviembre',
  'dates.month.12': 'diciembre',
  'dates.monthTitle.2': 'Febrero',
  'dates.monthTitle.3': 'Marzo',
  'dates.monthTitle.4': 'Abril',
  'dates.monthTitle.5': 'Mayo',

  // Result
  'result.title': 'Estimación del recibo',
  'result.observed': 'Consumo observado',
  'result.observedValue': '{kwh} kWh / {days} días',
  'result.dailyAverage': 'Promedio diario',
  'result.dailyAverageValue': '{kwh} kWh/día',
  'result.periodDays': 'Días del periodo',
  'result.projected': 'Consumo proyectado',
  'result.projectedValue': '{kwh} kWh',
  'result.colConcept': 'Concepto',
  'result.colKwh': 'kWh',
  'result.colRate': '$/kWh',
  'result.colAmount': 'Importe',
  'result.energySubtotal': 'Subtotal energía',
  'result.otherCharges': 'Otros cargos',
  'result.iva': 'IVA (16%)',
  'result.total': 'Total estimado',
  'result.minimumApplied': 'Se aplicó el consumo mínimo oficial del periodo.',
  'result.mixedInfoLabel': 'Cómo estimamos este periodo mixto',
  'result.mixedInfoDescription':
    'Las fechas del periodo cruzan el inicio o el fin del verano y caen dentro de la regla oficial de facturación bimestral mixta. Contamos cuántos días del periodo son de verano y cuántos fuera de verano, y repartimos el consumo proyectado en esa misma proporción. Cada fracción se cobra como un mes: primero se llenan los cupos mensuales oficiales de Básico e Intermedio de esa temporada, y el resto es Excedente. Los meses de precios se eligen según los días de referencia del Manual de facturación (0, 30 o 60 días antes del corte, según cuántos días hayan transcurrido desde el cambio de temporada).\n\nEl reparto por días es una estimación porque una sola lectura bimestral no indica en qué día se consumió cada kWh. El recibo de CFE prevalece.',
  'result.assumptions': 'Supuestos',
  'result.warnings': 'Avisos',
  'result.sources': 'Fuentes',
  'result.sourceAgreements': 'Acuerdos y oficios SHCP en CFE',
  'result.sourceDac': 'Tarifa DAC (CFE): consumo mensual promedio y límites',
  'result.sourceManual': 'Manual de disposiciones de facturación (DOF)',
  'result.dacTitle': 'Riesgo DAC',
  'result.dacLimit': 'Límite de alto consumo',
  'result.dacLimitValue': '{limit} kWh/mes',
  'result.dacHistoryCaptured': 'Historial capturado',
  'result.dacHistoryValue': '{provided} / {required} periodos',
  'result.dacAvg12': 'Promedio 12 meses',
  'result.dacAvgValue': '{kwh} kWh/mes',
  'result.dacCurrentPace': 'Uso mensual proyectado con tu ritmo actual',
  'result.dacNextAvg': 'Promedio estimado del siguiente ciclo',
  'result.dacOfficialLink':
    'Consulta la definición oficial del Consumo Mensual Promedio y los límites en la {link}.',
  'result.dacOfficialLinkLabel': 'tarifa DAC de CFE',

  // Allowance chart
  'allowance.title': 'Detalle del consumo subsidiado',
  'allowance.infoLabel': 'Qué es el consumo subsidiado',
  'allowance.infoBody':
    'En {tariffName}, por cada recibo {billingCycle}, CFE ofrece hasta {maxSubsidisedKwhInSummer} kWh de consumo a precio subsidiado (Básico e Intermedio). Al rebasar esos cupos, el consumo adicional se cobra como Excedente, a un precio más alto por kWh.\n\nAbajo estimamos esos cupos en kWh por día y los comparamos con tu consumo promedio actual.',
  'allowance.billingCycle.mensual': 'mensual',
  'allowance.billingCycle.bimestral': 'bimestral',
  'allowance.scaleLabel': 'Mostrar consumo como',
  'allowance.scaleDaily': 'Diario',
  'allowance.scaleMonthly': 'Mensual',
  'allowance.scaleBimonthly': 'Bimestral',
  'allowance.mixedBreakdownTitle': 'Reparto del periodo mixto',
  'allowance.mixedSeasonRange': '({range})',
  'allowance.mixedSeasonUsage': '{days} días: {kwh} kWh',
  'allowance.seasonSummer': 'Verano',
  'allowance.seasonStandard': 'Estándar',
  'allowance.seasonRange': '{range}',
  'allowance.ariaMixedChart':
    'Periodo mixto. Verano ({summerRange}): promedio {summerAvg} kWh/{unit}. {summerZones}. Estándar ({standardRange}): promedio {standardAvg} kWh/{unit}. {standardZones}.{dac}',
  'allowance.mixedChartTitle': 'Periodo mixto (verano y estándar)',
  'allowance.dacAlertTitle': 'Ritmo actual por encima del umbral DAC de referencia',
  'allowance.dacAlertBody':
    'Si mantuvieras ~{daily} kWh/día de forma sostenida, tu ritmo mensual (~{monthly} kWh/mes) sería superior al límite de {limit} kWh/mes. Esto no significa que ya estés en DAC: la reclasificación depende del promedio móvil de 12 meses. Revisa el panel de riesgo DAC más abajo.',
  'allowance.yourAverage': 'Tu promedio',
  'allowance.yourDailyAverage': 'Tu promedio diario',
  'allowance.bandLegendBody':
    '{rate}/kWh · cupo {band} kWh/día (max cantidad {cumulative}){suffix}',
  'allowance.bandRemaining': ' — quedan {unused} sin usar',
  'allowance.bandFull': ' — cupo completo',
  'allowance.excessLegendUsed': '{rate}/kWh — {kwh} kWh/día',
  'allowance.excessLegendUnused': '{rate}/kWh — sin uso con tu promedio actual',
  'allowance.dacLegendLabel': 'Umbral DAC (referencia diaria)',
  'allowance.dacLegendBody':
    '{daily} kWh/día (equivalente a {monthly} kWh/mes). Superar este ritmo no reclasifica solo; CFE usa el promedio móvil de 12 meses.{pace}',
  'allowance.dacLegendAbove': ' Tu promedio actual supera esta referencia.',
  'allowance.dacLegendBelow': ' Tu promedio actual está bajo esta referencia.',
  'allowance.yourAverageExcess': 'Tu promedio: {avg} kWh/día — {excess} kWh/día en Excedente',
  'allowance.yourAverageWithin':
    'Tu promedio: {avg} kWh/día — dentro de los bloques con descuento (techo {ceiling} kWh/día)',
  'allowance.legendCap': 'máx {cumulative}',
  'allowance.legendFull': 'cupo completo',
  'allowance.legendLeft': 'quedan {unused}',
  'allowance.legendExcessOff': 'sin uso',
  'allowance.usedOf': 'Usando {used} de {total}',
  'allowance.usedAmount': 'Usando {used}',
  'allowance.usedLabel': 'Usando:',
  'allowance.perDay': 'día',
  'allowance.perMonth': 'mes',
  'allowance.perBimonth': 'bimestre',
  'allowance.tooltipPartial': '{label}{rate} · {used} usados de {total} kWh/{unit}',
  'allowance.tooltipFull': '{label}{rate} · {used} kWh/{unit}',
  'allowance.rateSuffix': ': {rate}/kWh',
  'allowance.ariaChart': 'Promedio {avg} kWh/{unit}. Zonas: {zones}.{dac}',
  'allowance.ariaZoneUnused': ', {unused} sin usar de {total}',
  'allowance.ariaZoneRate': '{rate} por kWh, ',
  'allowance.ariaZone': '{label} {rate}{used} usados{unused}',
  'allowance.ariaDac':
    ' Umbral DAC equivalente a {value} kWh/{unit} ({monthly} kWh/mes).{pace}',
  'allowance.ariaDacAbove':
    ' Tu ritmo actual supera ese umbral; esto no significa reclasificación automática.',
  'allowance.ariaDacBelow': ' Tu ritmo actual está bajo ese umbral de referencia.',
  'allowance.dacMarkerTitle': 'Umbral DAC: {value} kWh/{unit}',
  'allowance.block.basico': 'Básico',
  'allowance.block.intermedio': 'Intermedio',
  'allowance.block.intermedioBajo': 'Intermedio bajo',
  'allowance.block.intermedioAlto': 'Intermedio alto',
  'allowance.block.excedente': 'Excedente',
  'allowance.block.energia': 'Energía',
  'allowance.block.cargoFijo': 'Cargo fijo',

  // Bill examples
  'example.closeBackdrop': 'Cerrar ejemplo del recibo',
  'example.close': 'Cerrar',
  'example.tariff.title': 'Dónde está la tarifa',
  'example.tariff.description':
    'En tu aviso-recibo busca la línea “TARIFA”. Ahí aparece el código (por ejemplo 1B) que debes seleccionar en este formulario.',
  'example.tariff.alt': 'Ejemplo de recibo CFE con la tarifa resaltada',
  'example.tariff.highlight': 'Tarifa impresa en el recibo',
  'example.previousCutoffDate.title': 'Dónde está la fecha de la última lectura',
  'example.previousCutoffDate.description':
    'Busca “PERIODO FACTURADO”. La fecha final del periodo es la del último corte o lectura del recibo anterior; úsala como fecha de corte previo.',
  'example.previousCutoffDate.alt': 'Ejemplo de recibo CFE con la fecha de última lectura resaltada',
  'example.previousCutoffDate.highlight': 'Fecha de la última lectura',
  'example.previousReading.title': 'Dónde está la lectura anterior',
  'example.previousReading.description':
    'En la tabla de consumo, la columna “Lectura actual” del recibo anterior es la lectura del medidor al corte. Captúrala aquí como lectura anterior.',
  'example.previousReading.alt': 'Ejemplo de recibo CFE con la lectura actual del medidor resaltada',
  'example.previousReading.highlight': 'Lectura del medidor al corte',
  'example.dacHistoryNewest.title': 'Dónde está el consumo más reciente',
  'example.dacHistoryNewest.description':
    'En la tabla de consumo del aviso-recibo, usa la columna “Total periodo” de la fila Energía (kWh). Ese valor va en el primer cuadro del historial DAC.',
  'example.dacHistoryNewest.alt':
    'Ejemplo de recibo CFE con el Total periodo de energía resaltado',
  'example.dacHistoryNewest.highlight': 'Total periodo en kWh',
  'example.dacHistoryOlder.title': 'Dónde están los consumos anteriores',
  'example.dacHistoryOlder.description':
    'En el historial del aviso-recibo usa la columna “kWh”. Captura de arriba hacia abajo los periodos siguientes al más reciente (cuadros 2 en adelante).',
  'example.dacHistoryOlder.descriptionLine':
    'En el historial del aviso-recibo, la flecha marca la línea {line} de la columna “kWh” (contando de arriba hacia abajo). Usa ese valor en este cuadro.',
  'example.dacHistoryOlder.alt': 'Ejemplo de historial CFE con la columna de kWh resaltada',
  'example.dacHistoryOlder.highlight': 'Consumos anteriores en kWh',
  'example.dacHistoryOlder.highlightLine': 'Línea {line} de kWh en el historial',

  // Validation
  'validation.tariffRequired': 'Indica la tarifa de tu recibo.',
  'validation.summerRequired':
    'Indica el mes en que comienza el verano en tu localidad (aparece en CFE o en tu recibo).',
  'validation.dacRegionRequired': 'Selecciona la región DAC de tu recibo.',
  'validation.previousReadingInvalid': 'La lectura anterior debe ser un número válido.',
  'validation.currentReadingInvalid': 'La lectura actual debe ser un número válido.',
  'validation.currentReadingTooLow': 'La lectura actual no puede ser menor que la lectura anterior.',
  'validation.previousCutoffRequired': 'Indica la fecha de corte del recibo anterior.',
  'validation.currentReadingDateRequired': 'Indica la fecha de tu lectura actual.',
  'validation.nextCutoffRequired': 'Indica la fecha estimada del próximo corte.',
  'validation.currentReadingDateOrder':
    'La lectura actual debe ser posterior a la fecha de corte anterior.',
  'validation.nextCutoffOrder': 'El próximo corte debe ser posterior a la fecha de corte anterior.',
  'validation.readingPastCutoff':
    'La fecha de lectura rebasa el corte estimado. Revisa el corte anterior o el ciclo de facturación.',
  'validation.otherChargesNegative': 'Los cargos adicionales no pueden ser negativos.',

  // Narrative
  'narrative.p1':
    'Como hoy {currentDate} tu lectura es {currentReading} y tu lectura anterior del {previousDate} era {previousReading}, en {elapsedDays} días has usado {consumed} kWh, un promedio de {avg} kWh por día.',
  'narrative.p2': 'Estás en la tarifa {tariff} con facturación {cycle}. {summerHint}{allowanceHint}',
  'narrative.p3':
    'Si mantienes este ritmo durante el resto del periodo (corte estimado el {nextCutoff}, {billingDays} días), el consumo estimado es de {projected} kWh y el importe aproximado sería {total} (incluye IVA).',
  'narrative.summerTariff1': 'La tarifa 1 no diferencia temporada de verano.',
  'narrative.summerAll': 'Todos estos días caen en temporada de verano.',
  'narrative.summerMixto':
    'El periodo cruza el inicio o fin del verano, por lo que se aplica el tratamiento de periodo mixto.',
  'narrative.summerFuera': 'Estos días están fuera de la temporada de verano.',
  'narrative.allowanceFuera': ' Fuera de verano, los rangos subsidiados son menores.',
  'narrative.allowanceVerano':
    ' En verano, tu tarifa proporciona kWh subsidiados adicionales{lowerBasicRateHint}.',
  'narrative.lowerBasicRate': ' y una tarifa básica de consumo más baja',

  // Billing / seasons / assumptions
  'billing.seasonVerano': 'Temporada de verano',
  'billing.seasonFuera': 'Temporada fuera de verano',
  'billing.seasonNone': 'Sin temporada de verano diferenciada',
  'billing.seasonMixto': 'Periodo mixto (verano y fuera de verano)',
  'billing.seasonProfileNone': 'Sin temporada diferenciada',
  'billing.seasonProfileMixto': 'Periodo mixto',
  'billing.seasonProfileVerano': 'Temporada de verano',
  'billing.seasonProfileFuera': 'Fuera de verano',
  'billing.lineLabel': '{tariff} {block}',
  'billing.lineLabelWithSeason': '{tariff} {block} ({season})',
  'billing.lineSeasonVerano': 'verano',
  'billing.lineSeasonEstandar': 'estándar',
  'billing.dacFixed': 'DAC cargo fijo ({region})',
  'billing.dacEnergyVerano': 'DAC energía (verano)',
  'billing.dacEnergyFuera': 'DAC energía (fuera de verano)',
  'billing.dacSeasonVerano': 'DAC en temporada de verano',
  'billing.dacSeasonFuera': 'DAC fuera de verano',
  'billing.minAssumption': 'Se aplica el mínimo oficial de {minimum} kWh para un periodo {cycle}.',
  'billing.rateAssumption':
    'Cuotas del mes de {month} {year} ({offset} días antes del corte), conforme al Manual de facturación.',
  'billing.mixtoAssumption':
    'Periodo bimestral mixto con {summerDays} días de verano y {nonSummerDays} fuera de verano: el consumo se reparte por días ({summerKwh} kWh en verano y {nonSummerKwh} kWh fuera). Cada fracción usa los cupos mensuales oficiales de Básico e Intermedio de su temporada; el resto es Excedente. CFE no publica la fórmula exacta del reparto.',
  'billing.mixtoFractions':
    'Primera fracción: {firstSeason} ({firstDays} días) con cuotas de {firstMonth}; segunda fracción: {secondSeason} ({secondDays} días) con cuotas de {secondMonth}.',
  'billing.seasonWordVerano': 'verano',
  'billing.seasonWordFuera': 'fuera de verano',
  'billing.tariffAsOf':
    'Última actualización de tarifas: {date}. Las tarifas son correctas a esta fecha. El recibo oficial de CFE prevalece.',
  'billing.dacLimitRef':
    'Límite DAC de referencia para {tariff}: {limit} kWh/mes (promedio móvil de 12 meses).',
  'billing.localSummer': 'Verano local: 6 meses consecutivos a partir de {month}.',
  'billing.dacAssumption1': 'DAC usa cargo fijo más energía sin bloques subsidiados.',
  'billing.dacAssumption2':
    'Tarifas DAC regionales actualizadas y correctas al {date}; confirma el oficio mensual de tu recibo.',
  'billing.dacWarning':
    'La reclasificación a DAC depende del promedio móvil de 12 meses, no de un solo periodo.',

  // DAC risk
  'dac.alreadyMessage':
    'Tu servicio está o se indicó como DAC. El cálculo usa cargos DAC; para volver a tarifa doméstica se requiere promedio bajo el límite durante 12 meses y trámite ante CFE.',
  'dac.alreadyDetail1':
    'La reclasificación a DAC no depende de un solo recibo: CFE usa el promedio móvil del consumo durante los últimos 12 meses.',
  'dac.alreadyDetail2':
    'Para salir de DAC debes mantener un Consumo Mensual Promedio inferior al límite de tu localidad y gestionar el cambio ante CFE.',
  'dac.historyRuleMensual':
    'Para el promedio oficial se suman los kWh de tus últimos 12 recibos mensuales y se dividen entre 12.',
  'dac.historyRuleBimestral':
    'Aunque tu facturación sea bimestral, el límite DAC se expresa en kWh/mes. Se suman los kWh de tus últimos 6 recibos (cada uno cubre ~2 meses) y se dividen entre 12.',
  'dac.cycleMensuales': 'mensuales',
  'dac.cycleBimestrales': 'bimestrales',
  'dac.incompletePaceAbove':
    'Si mantuvieras durante un mes el ritmo observado en este periodo, usarías aproximadamente {pace} kWh/mes, por encima del límite de {limit} kWh/mes. Esta es una proyección de tu uso actual, no tu promedio móvil DAC.',
  'dac.incompletePaceOk':
    'Si mantuvieras durante un mes el ritmo observado en este periodo, usarías aproximadamente {pace} kWh/mes (límite {limit} kWh/mes). Esta es una proyección de tu uso actual, no tu promedio móvil DAC.',
  'dac.incompleteMessage':
    'Límite DAC de {tariff}: {limit} kWh/mes. {paceNote} Para estimar tu promedio móvil de 12 meses y el riesgo real de DAC necesitamos tus últimos {required} consumos {cycleLabel}. Faltan {missing} por capturar.',
  'dac.incompleteDetailMain':
    'CFE determina el riesgo DAC con el promedio móvil de 12 meses, no con la proyección de un solo periodo. Sin esos consumos previos no podemos estimar tu promedio real ni confirmar si estás en riesgo de alto consumo.',
  'dac.incompleteDetailEmpty':
    'Captura los {required} consumos {cycleLabel} en el modo experto del formulario (el “Consumo (kWh)” de cada recibo en tu historial CFE).',
  'dac.incompleteDetailPartial':
    'Ya capturaste {provided} de {required}. Completa los {missing} faltantes para calcular tu promedio de 12 meses y una proyección del siguiente ciclo.',
  'dac.avgDetail':
    'Tu promedio de los últimos 12 meses es {average} kWh/mes (límite {limit} kWh/mes).',
  'dac.paceDetail':
    'Si mantienes tu ritmo actual (~{pace} kWh/mes), el consumo proyectado de este periodo es {projected} kWh.',
  'dac.nextAbove':
    'Al reemplazar el periodo más antiguo con este consumo proyectado, el promedio móvil estimado quedaría en {next} kWh/mes: superior al límite DAC.',
  'dac.nextBelow':
    'Al reemplazar el periodo más antiguo con este consumo proyectado, el promedio móvil estimado quedaría en {next} kWh/mes: aún bajo el límite DAC.',
  'dac.messageAbove':
    'Tu promedio de 12 meses ({average} kWh/mes) ya es superior al límite de {limit} kWh/mes. Hay riesgo de reclasificación a DAC.',
  'dac.messageCrossing':
    'Tu promedio de 12 meses ({average} kWh/mes) aún está bajo el límite, pero si mantienes este ritmo el promedio estimado del siguiente ciclo ({next} kWh/mes) sería superior a {limit} kWh/mes.',
  'dac.messageBelow':
    'Tu promedio de 12 meses ({average} kWh/mes) está bajo el límite de {limit} kWh/mes.',
  'dac.messageBelowNext':
    ' Con el ritmo actual, el promedio estimado del siguiente ciclo sería {next} kWh/mes.',

  // Daily allowance guidance
  'guidance.simpleAvg': 'Tu promedio es de {avg} kWh/{unit}.',
  'guidance.inFirst':
    'Tu promedio ({avg} kWh/{unit}) cabe en {band}. Te quedan {headroom} kWh/{unit} antes de pasar al siguiente bloque.',
  'guidance.inMiddle':
    'Tu promedio ({avg} kWh/{unit}) supera {previous} por {above} kWh/{unit} y aún cabe en {band}. Te quedan {headroom} kWh/{unit} antes del excedente.',
  'guidance.excess':
    'Tu promedio ({avg} kWh/{unit}) supera {band} por {excess} kWh/{unit}: esa parte se cobra como Excedente (precio alto).',
  'guidance.dac':
    'La tarifa DAC no tiene bloques subsidiados (Básico/Intermedio): toda la energía se cobra a la cuota DAC más el cargo fijo.',
  'guidance.mixtoIntro':
    'Periodo mixto: {summerDays} días de verano ({summerKwh} kWh) y {nonSummerDays} fuera de verano ({nonSummerKwh} kWh). Tu promedio es {avg} kWh/{unit}.',
  'guidance.mixtoFuera': 'Fuera de verano: {text}',
  'guidance.mixtoVerano': 'Verano: {text}',
} as const

const enMessages: Record<MessageKey, string> = {
  'doc.title': 'CFE bill calculator',
  'doc.description':
    'Static calculator to estimate CFE domestic electricity bills from meter readings, tariff, billing cycle, and summer season.',

  'lang.switcherLabel': 'Language',
  'lang.es': 'Español',
  'lang.en': 'English',

  'app.title': 'CFE bill calculator',
  'app.blurb':
    'Estimate your next domestic electricity bill from meter readings, your tariff, where you are in the billing cycle, and the summer season.',
  'app.infoTip':
    'This tool also aims to give you additional information to help you understand important concepts of your bill. There is a lot of useful information for you to learn by clicking the various information icons',
  'app.madeWithLoveLabel': 'Made with love',
  'app.madeWithLove': 'This tool was made with love',
  'app.privacyNote': 'Everything runs in your browser; no data is sent to a server.',
  'app.placeholderTitle': 'Your result will appear here',
  'app.placeholderBody':
    'Fill in the form with data from your bill and meter. You will see the breakdown by blocks (basic, intermediate, excess), VAT, and a plain-language explanation.',
  'app.placeholderItem1': 'Tariffs 1, 1A–1F and DAC',
  'app.placeholderItem2': 'Monthly and bimonthly cycles',
  'app.placeholderItem3': 'Summer rules and mixed periods',
  'app.metaUpdated': 'Last updated: {date}. Rates are correct as of this date.',
  'app.footer':
    'Not affiliated with CFE. Informational estimate based on official publications. Your official bill prevails over this tool.',
  'nav.label': 'Sections',
  'nav.menu': 'Menu',
  'nav.calculator': 'Calculator',
  'nav.tariffs': 'Tariff reference',

  'tariffs.title': 'CFE tariff reference',
  'tariffs.blurb':
    'Browse month-by-month subsidized limits and rates for domestic tariffs 1–1F, and compare them with DAC. This page uses the same tariff snapshot as the calculator.',
  'tariffs.dataStatusTitle': 'Data status',
  'tariffs.dataStatusLastCheck': 'Last data check',
  'tariffs.dataStatusRange': 'Available data range',
  'tariffs.dataStatusRangeValue': '{start} – {end}',
  'tariffs.controlsTitle': 'What do you want to look up',
  'tariffs.tariffSelectTitle': 'Select your tariff',
  'tariffs.yearLabel': 'Tariff year',
  'tariffs.yearHelpSelect':
    'When CFE publishes next year’s data before the current year expires, you can browse both here.',
  'tariffs.modeLabel': 'Tariff type',
  'tariffs.modeRegular': 'Regular tariffs',
  'tariffs.modeDac': 'DAC tariff',
  'tariffs.tariffLabel': 'Normal domestic tariff',
  'tariffs.monthLabel': 'Month',
  'tariffs.regionLabel': 'DAC region',
  'tariffs.priceSeasonLabel': 'Prices',
  'tariffs.priceSeasonSummer': 'Summer',
  'tariffs.priceSeasonStandard': 'Standard',
  'tariffs.scaleLabel': 'Billing cycle',
  'tariffs.scaleMonthly': 'Monthly',
  'tariffs.scaleBimonthly': 'Bimonthly',
  'tariffs.seasonFilterLabel': 'Season in the year table',
  'tariffs.seasonSummer': 'Summer',
  'tariffs.seasonNonSummer': 'Non-summer',
  'tariffs.selectedSummary': 'Summary for {tariff}',
  'tariffs.temperatureBelow':
    'For localities with an average minimum summer temperature below 25 °C. Does not change by season.',
  'tariffs.temperatureAtLeast':
    'For localities with an average minimum summer temperature of at least {temperature} °C.',
  'tariffs.dacThreshold': 'DAC limit (12-month rolling average)',
  'tariffs.dacThresholdValueMonthly': '{limit} kWh/month',
  'tariffs.dacThresholdValueBimonthly': '{limit} kWh/bimonth',
  'tariffs.dacThresholdInfoLabel': 'How the DAC limit is calculated',
  'tariffs.summerReminder':
    'Summer pricing only applies during a consecutive six-month window, based on the summer start month for your locality.',
  'tariffs.summerUnsupported': '{tariff} does not support a summer tariff.',
  'tariffs.monthDetailTitle': 'Breakdown for {month} {year}',
  'tariffs.monthDetailPrefix': 'Breakdown for',
  'tariffs.monthNavLabel': 'Breakdown month',
  'tariffs.previousMonth': 'Previous month',
  'tariffs.nextMonth': 'Next month',
  'tariffs.summerColumn': 'Summer prices',
  'tariffs.nonSummerColumn': 'Standard prices (non-summer)',
  'tariffs.summerBadge': 'Summer',
  'tariffs.nonSummerBadge': 'Standard',
  'tariffs.blockColumn': 'Block',
  'tariffs.allowanceColumn': 'Block allowance',
  'tariffs.cumulativeColumn': 'Through (cumulative)',
  'tariffs.rateColumn': 'Price',
  'tariffs.totalSubsidised': 'Total subsidised kWh available: {kwh}',
  'tariffs.allowanceValueMonthly': '{kwh} kWh/month',
  'tariffs.allowanceValueBimonthly': '{kwh} kWh/bimonth',
  'tariffs.allowanceOpen': 'Unlimited',
  'tariffs.rateUnavailable': 'Not published',
  'tariffs.scaleNoteMonthly':
    'Subsidized allowances and DAC limit shown as official monthly values.',
  'tariffs.scaleNoteBimonthly':
    'Subsidized allowances and DAC limit shown for a bimonthly cycle (double the official monthly values). The official DAC threshold still uses the monthly rolling average.',
  'tariffs.showFullYear': 'Show full {year} rates',
  'tariffs.hideFullYear': 'Hide full {year} rates',
  'tariffs.yearTitle': '{year} at a glance ({season})',
  'tariffs.yearHelp':
    'Each cell shows that month’s rate for the indicated block. “Not published” means this snapshot has no valid price for that combination (for example, summer high bands outside the months when CFE publishes them).',
  'tariffs.monthColumn': 'Month',
  'tariffs.dacPanelTitle': 'DAC tariff by region',
  'tariffs.dacPanelIntro':
    'If you are on DAC, this section shows the latest regional DAC charges. DAC has no subsidized blocks: all energy is billed at the DAC rate plus the fixed charge.',
  'tariffs.dacFixed': 'Fixed charge',
  'tariffs.dacEnergy': 'Energy',
  'tariffs.dacEnergySummer': 'Energy (summer)',
  'tariffs.dacEnergyNonSummer': 'Energy (non-summer)',
  'tariffs.dacNoBlocks':
    'DAC has no subsidized blocks (Basic/Intermediate): all energy is billed at the DAC rate plus the fixed charge.',
  'tariffs.dacReturnHint':
    'Leaving DAC requires a 12-month rolling average below the limit for your applicable domestic tariff and a request to CFE.',
  'tariffs.sourcesTitle': 'Official sources',
  'tariffs.sourcePortal': 'CFE domestic tariffs portal',
  'tariffs.sourceAgreements': 'SHCP agreements and memos on CFE',
  'tariffs.sourceDac': 'Official DAC tariff definition',
  'tariffs.sourceManual': 'Billing provisions manual (DOF)',
  'tariffs.limitationsTitle': 'Limitations',
  'tariffs.limitation1':
    'There is no open locality → tariff / summer-start catalog; confirm those details on your bill or with CFE.',
  'tariffs.limitation2':
    'Prices change monthly. This page reflects the annual snapshots incorporated into the project; you can switch years when more than one is available.',
  'tariffs.limitation3':
    'DAP and other municipal charges are not part of these tables.',
  'tariffs.backToCalculator': 'Back to the calculator',

  'mobile.back': 'Back',
  'mobile.editInputs': 'Edit inputs',
  'mobile.resultsTitle': 'Estimate',

  'form.headerTitle': 'Your service details',
  'form.headerBlurb': 'Confirm the tariff and summer start month from your CFE bill.',
  'form.legendTariffCycle': 'Tariff and cycle',
  'form.tariffLabel': 'Tariff printed on your bill',
  'form.tariffInfoLabel': 'What is the tariff',
  'form.tariffInfoDescription':
    'Your tariff is an important factor in determining how much you pay for the energy you consume. CFE gives different amounts of discounted kWh and sometimes different prices for those kWh, depending on your specific tariff.\n\nYour tariff is determined by your average summer temperatures. Because higher temperatures mean more air-conditioning energy is likely to be required, CFE provides the largest discounts to the tariffs for the hottest locations.',
  'form.tariffExample': 'See where the tariff is on the bill',
  'form.summerStartLabel': 'Month when summer begins in your locality',
  'form.summerStartInfoLabel': 'What are summer months',
  'form.summerStartInfoDescription':
    '{tariffName} includes additional subsidized kWh and discounted rates during the designated “summer months”.\n\nSummer months are a 6-month consecutive period. The starting month is determined by local observed temperatures and climate prediction models. There is no central database for this tool to look up the summer start month in your area, and different consumers in different parts of the country may have different summer periods even with the same tariff.\n\nYou can ask your local CFE office, call 071, or reach them through social media to confirm the precise month that summer pricing starts in your area.\n\nFor reference, in 2026 summer pricing began in April in Playa del Carmen.',
  'form.summerStartHelp':
    'Summer pricing applies for six months ({veranoStart} to {veranoEnd} inclusive)',
  'form.selectPlaceholder': 'Select…',
  'form.billingCycleLabel': 'Billing cycle',
  'form.cycleBimestral': 'Bimonthly (about 60 days)',
  'form.cycleMensual': 'Monthly (about 30 days)',
  'form.dacRegionLabel': 'DAC region',
  'form.legendReadings': 'Readings and dates',
  'form.previousReadingLabel': 'Previous reading (meter kWh at prior cutoff)',
  'form.previousReadingExample': 'See where the previous reading is on the bill',
  'form.previousCutoffLabel': 'Cutoff date from the previous bill',
  'form.previousCutoffExample': 'See where the last reading date is on the bill',
  'form.currentReadingLabel': 'Current reading (meter kWh today)',
  'form.currentReadingDateLabel': 'Current reading date',
  'form.cutoffEstimateReady': 'We estimate the next cutoff on {date}.',
  'form.cutoffEstimateDetail':
    'We take your previous cutoff of {previousDate} and add about {days} days for the {cycle} cycle you selected.',
  'form.cutoffEstimatePending':
    'When you enter the previous cutoff date, we will estimate the next cutoff by adding about {days} days for your {cycle} cycle.',
  'form.expertMode': 'Expert mode',
  'form.expertModeHint': 'DAC and more',
  'form.expertModeInfo': 'What is expert mode',
  'form.expertModeDescription':
    'Additional options including extra charges such as DAP (public lighting) and the DAC (high domestic consumption) tariff. You can enable expert mode now if you want to learn more; or, if your consumption estimate suggests this is something you should consider carefully, you will be reminded in the calculations in the next section.',
  'form.copyShareLink': 'Copy link with my inputs',
  'form.copyShareLinkHint':
    'Creates a link with the current form values so you can reload them quickly.',
  'form.copyShareLinkCopied': 'Link copied to the clipboard.',
  'form.copyShareLinkFailed': 'Could not copy the link. Paste it manually from the address bar after opening it.',
  'form.otherChargesLabel': 'Other known bill charges (DAP, etc.), before VAT',
  'form.dapInfoLabel': 'What is DAP',
  'form.dapInfoDescription':
    'DAP (Derecho de Alumbrado Público) is a charge applied to your bill based on your specific location to pay for lighting of public streets and spaces in your area. This money DOES NOT pay for lighting in public areas of private buildings.\n\nRemember, you may find that some areas with a lot of public lighting may actually have a low DAP charge if these areas are also heavily populated areas — because there are more CFE customers across which the costs for this lighting can be shared.',
  'form.historyTitle': 'History for DAC risk',
  'form.dacInfoLabel': 'What is the DAC tariff',
  'form.dacInfoDescription':
    'DAC (High Domestic Consumption) is a considerably more expensive billing scheme that CFE applies to customers normally billed under {tariffName} when their average monthly consumption over the previous 12 months exceeds {dacLimit} kWh.\n\nOne high bill alone may not move you to DAC if your consumption was lower in other months. Likewise, after several high-consumption months, it can take several lower-consumption billing cycles to bring your 12-month average below the threshold and leave the DAC tariff.\n\nBecause DAC is calculated based on a rolling 12-month average, it is important to provide your previous consumption history in order to help estimate how close you may be to the DAC threshold.',
  'form.dacInfoDescriptionAlreadyDac':
    'DAC (High Domestic Consumption) is a considerably more expensive billing scheme that CFE applies when your average monthly consumption over the previous 12 months exceeds the high-consumption threshold for your applicable domestic tariff.\n\nOne high bill alone may not move you to DAC if your consumption was lower in other months. Likewise, after several high-consumption months, it can take several lower-consumption billing cycles to bring your 12-month average below the threshold and leave the DAC tariff.\n\nBecause DAC is calculated based on a rolling 12-month average, it is important to provide your previous consumption history in order to help estimate how close you may be to the DAC threshold.',
  'form.historyNewestExample':
    'See where the most recent period consumption is on the bill (Total periodo column)',
  'form.historyOlderExampleLine':
    'See history line {line} of kWh on the bill (historial usage {line})',
  'form.historyGroupMensual': 'kWh consumption from the last 12 monthly bills',
  'form.historyGroupBimestral': 'kWh consumption from the last 6 bimonthly bills',
  'form.historyHintNote':
    'Approximate dates to show the order: the first box is the most recent bill’s consumption (Total periodo in the main table); the rest go top-to-bottom from the bill history. Real dates can differ by a few days because of CFE’s reading route.',
  'form.historySlotNewest': 'Most recent',
  'form.historySlotOlder': 'Historial usage {line}',
  'form.historySlotNewestAria': 'Most recent consumption (kWh)',
  'form.historySlotNewestAriaWithRange':
    'Most recent consumption (kWh), approximate period {range}',
  'form.historySlotOlderAria': 'Historial usage {line} (kWh)',
  'form.historySlotOlderAriaWithRange':
    'Historial usage {line} (kWh), approximate period {range}',
  'form.submit': 'Calculate estimate',
  'form.cycleWordMensual': 'monthly',
  'form.cycleWordBimestral': 'bimonthly',
  'form.tariffOption': 'Tariff {code}',
  'form.tariffOptionDac': 'DAC tariff (high consumption)',
  'form.tariffTemperatureBelow':
    'For localities with an average minimum summer temperature below 25 °C.',
  'form.tariffTemperatureAtLeast':
    'For localities with an average minimum summer temperature of at least {temperature} °C.',

  'dates.today': 'today',
  'dates.daysAgo1': '1 day ago',
  'dates.daysAgoN': '{days} days ago',
  'dates.month.1': 'January',
  'dates.month.2': 'February',
  'dates.month.3': 'March',
  'dates.month.4': 'April',
  'dates.month.5': 'May',
  'dates.month.6': 'June',
  'dates.month.7': 'July',
  'dates.month.8': 'August',
  'dates.month.9': 'September',
  'dates.month.10': 'October',
  'dates.month.11': 'November',
  'dates.month.12': 'December',
  'dates.monthTitle.2': 'February',
  'dates.monthTitle.3': 'March',
  'dates.monthTitle.4': 'April',
  'dates.monthTitle.5': 'May',

  'result.title': 'Bill estimate',
  'result.observed': 'Observed consumption',
  'result.observedValue': '{kwh} kWh / {days} days',
  'result.dailyAverage': 'Daily average',
  'result.dailyAverageValue': '{kwh} kWh/day',
  'result.periodDays': 'Days in period',
  'result.projected': 'Projected consumption',
  'result.projectedValue': '{kwh} kWh',
  'result.colConcept': 'Item',
  'result.colKwh': 'kWh',
  'result.colRate': '$/kWh',
  'result.colAmount': 'Amount',
  'result.energySubtotal': 'Energy subtotal',
  'result.otherCharges': 'Other charges',
  'result.iva': 'VAT (16%)',
  'result.total': 'Estimated total',
  'result.minimumApplied': 'The official minimum consumption for the period was applied.',
  'result.mixedInfoLabel': 'How we estimate this mixed period',
  'result.mixedInfoDescription':
    'The billing dates cross the start or end of summer and fall under the official mixed-bimonthly billing rule. We count how many days of the period are summer versus non-summer and allocate projected consumption in that same proportion. Each portion is billed as a month: that season’s official monthly Basic and Intermediate allowances are filled first, and the rest is Excess. Pricing months follow the Billing Manual reference dates (0, 30, or 60 days before cutoff, depending on how many days have elapsed since the season changed).\n\nThe day-weighted split is an estimate because one bimonthly meter reading does not show which day each kWh was used. The official CFE bill prevails.',
  'result.assumptions': 'Assumptions',
  'result.warnings': 'Notices',
  'result.sources': 'Sources',
  'result.sourceAgreements': 'SHCP agreements and memos on CFE',
  'result.sourceDac': 'DAC tariff (CFE): average monthly consumption and limits',
  'result.sourceManual': 'Billing provisions manual (DOF)',
  'result.dacTitle': 'DAC risk',
  'result.dacLimit': 'High-consumption limit',
  'result.dacLimitValue': '{limit} kWh/month',
  'result.dacHistoryCaptured': 'History captured',
  'result.dacHistoryValue': '{provided} / {required} periods',
  'result.dacAvg12': '12-month average',
  'result.dacAvgValue': '{kwh} kWh/month',
  'result.dacCurrentPace': 'Projected monthly use at your current pace',
  'result.dacNextAvg': 'Estimated average for the next cycle',
  'result.dacOfficialLink':
    'See the official definition of Average Monthly Consumption and the limits on the {link}.',
  'result.dacOfficialLinkLabel': 'CFE DAC tariff page',

  'allowance.title': 'Subsidised usage detail',
  'allowance.infoLabel': 'What is subsidised usage',
  'allowance.infoBody':
    'On {tariffName}, for each {billingCycle} bill, CFE provides up to {maxSubsidisedKwhInSummer} kWh of usage at a subsidised price (Basic and Intermediate). Beyond those allowances, additional use is billed as Excess at a higher price per kWh.\n\nBelow we estimate those allowances in kWh per day and compare them with your current average usage.',
  'allowance.billingCycle.mensual': 'monthly',
  'allowance.billingCycle.bimestral': 'bimonthly',
  'allowance.scaleLabel': 'Show usage as',
  'allowance.scaleDaily': 'Daily',
  'allowance.scaleMonthly': 'Monthly',
  'allowance.scaleBimonthly': 'Bimonthly',
  'allowance.mixedBreakdownTitle': 'Mixed-period split',
  'allowance.mixedSeasonRange': '({range})',
  'allowance.mixedSeasonUsage': '{days} days: {kwh} kWh',
  'allowance.seasonSummer': 'Summer',
  'allowance.seasonStandard': 'Standard',
  'allowance.seasonRange': '{range}',
  'allowance.ariaMixedChart':
    'Mixed period. Summer ({summerRange}): average {summerAvg} kWh/{unit}. {summerZones}. Standard ({standardRange}): average {standardAvg} kWh/{unit}. {standardZones}.{dac}',
  'allowance.mixedChartTitle': 'Mixed period (summer and standard)',
  'allowance.dacAlertTitle': 'Current pace above the reference DAC threshold',
  'allowance.dacAlertBody':
    'If you kept ~{daily} kWh/day for a full month, your monthly pace (~{monthly} kWh/month) would be above the {limit} kWh/month limit. That does not mean you are already on DAC: reclassification depends on the 12-month rolling average. Check the DAC risk panel below.',
  'allowance.yourAverage': 'Your average',
  'allowance.yourDailyAverage': 'Your daily average',
  'allowance.bandLegendBody':
    '{rate}/kWh · allowance {band} kWh/day (max amount {cumulative}){suffix}',
  'allowance.bandRemaining': ' — {unused} left unused',
  'allowance.bandFull': ' — allowance full',
  'allowance.excessLegendUsed': '{rate}/kWh — {kwh} kWh/day',
  'allowance.excessLegendUnused': '{rate}/kWh — unused at your current average',
  'allowance.dacLegendLabel': 'DAC threshold (daily reference)',
  'allowance.dacLegendBody':
    '{daily} kWh/day (equivalent to {monthly} kWh/month). Exceeding this pace alone does not reclassify you; CFE uses the 12-month rolling average.{pace}',
  'allowance.dacLegendAbove': ' Your current average is above this reference.',
  'allowance.dacLegendBelow': ' Your current average is below this reference.',
  'allowance.yourAverageExcess': 'Your average: {avg} kWh/day — {excess} kWh/day in Excess',
  'allowance.yourAverageWithin':
    'Your average: {avg} kWh/day — within the discounted blocks (ceiling {ceiling} kWh/day)',
  'allowance.legendCap': 'max {cumulative}',
  'allowance.legendFull': 'allowance full',
  'allowance.legendLeft': '{unused} left',
  'allowance.legendExcessOff': 'unused',
  'allowance.usedOf': 'Using {used} of {total}',
  'allowance.usedAmount': 'Using {used}',
  'allowance.usedLabel': 'Using:',
  'allowance.perDay': 'day',
  'allowance.perMonth': 'month',
  'allowance.perBimonth': 'bimonth',
  'allowance.tooltipPartial': '{label}{rate} · {used} used of {total} kWh/{unit}',
  'allowance.tooltipFull': '{label}{rate} · {used} kWh/{unit}',
  'allowance.rateSuffix': ': {rate}/kWh',
  'allowance.ariaChart': 'Average {avg} kWh/{unit}. Zones: {zones}.{dac}',
  'allowance.ariaZoneUnused': ', {unused} unused of {total}',
  'allowance.ariaZoneRate': '{rate} per kWh, ',
  'allowance.ariaZone': '{label} {rate}{used} used{unused}',
  'allowance.ariaDac':
    ' DAC threshold equivalent to {value} kWh/{unit} ({monthly} kWh/month).{pace}',
  'allowance.ariaDacAbove':
    ' Your current pace exceeds that threshold; this does not mean automatic reclassification.',
  'allowance.ariaDacBelow': ' Your current pace is below that reference threshold.',
  'allowance.dacMarkerTitle': 'DAC threshold: {value} kWh/{unit}',
  'allowance.block.basico': 'Basic',
  'allowance.block.intermedio': 'Intermediate',
  'allowance.block.intermedioBajo': 'Intermediate low',
  'allowance.block.intermedioAlto': 'Intermediate high',
  'allowance.block.excedente': 'Excess',
  'allowance.block.energia': 'Energy',
  'allowance.block.cargoFijo': 'Fixed charge',

  'example.closeBackdrop': 'Close bill example',
  'example.close': 'Close',
  'example.tariff.title': 'Where the tariff is',
  'example.tariff.description':
    'On your bill, look for the “TARIFA” line. That is the code (for example 1B) you should select in this form.',
  'example.tariff.alt': 'Sample CFE bill with the tariff highlighted',
  'example.tariff.highlight': 'Tariff printed on the bill',
  'example.previousCutoffDate.title': 'Where the last reading date is',
  'example.previousCutoffDate.description':
    'Look for “PERIODO FACTURADO”. The end date of that period is the previous cutoff or reading date; use it as the prior cutoff date.',
  'example.previousCutoffDate.alt': 'Sample CFE bill with the last reading date highlighted',
  'example.previousCutoffDate.highlight': 'Last reading date',
  'example.previousReading.title': 'Where the previous reading is',
  'example.previousReading.description':
    'In the consumption table, the “Lectura actual” column from the previous bill is the meter reading at cutoff. Enter it here as the previous reading.',
  'example.previousReading.alt': 'Sample CFE bill with the current meter reading highlighted',
  'example.previousReading.highlight': 'Meter reading at cutoff',
  'example.dacHistoryNewest.title': 'Where the most recent consumption is',
  'example.dacHistoryNewest.description':
    'In the bill’s consumption table, use the “Total periodo” column on the Energía (kWh) row. Enter that value in the first DAC history box.',
  'example.dacHistoryNewest.alt':
    'Sample CFE bill with the energy Total periodo highlighted',
  'example.dacHistoryNewest.highlight': 'Total periodo in kWh',
  'example.dacHistoryOlder.title': 'Where the older consumptions are',
  'example.dacHistoryOlder.description':
    'In the bill history, use the “kWh” column. Enter the periods after the most recent one top-to-bottom (boxes 2 onward).',
  'example.dacHistoryOlder.descriptionLine':
    'In the bill history, the arrow marks line {line} of the “kWh” column (counting top to bottom). Enter that value in this box.',
  'example.dacHistoryOlder.alt': 'Sample CFE history with the kWh column highlighted',
  'example.dacHistoryOlder.highlight': 'Older consumptions in kWh',
  'example.dacHistoryOlder.highlightLine': 'History kWh line {line}',

  'validation.tariffRequired': 'Enter the tariff from your bill.',
  'validation.summerRequired':
    'Enter the month when summer begins in your locality (shown by CFE or on your bill).',
  'validation.dacRegionRequired': 'Select the DAC region from your bill.',
  'validation.previousReadingInvalid': 'Previous reading must be a valid number.',
  'validation.currentReadingInvalid': 'Current reading must be a valid number.',
  'validation.currentReadingTooLow': 'Current reading cannot be lower than the previous reading.',
  'validation.previousCutoffRequired': 'Enter the cutoff date from the previous bill.',
  'validation.currentReadingDateRequired': 'Enter the date of your current reading.',
  'validation.nextCutoffRequired': 'Enter the estimated next cutoff date.',
  'validation.currentReadingDateOrder':
    'The current reading must be after the previous cutoff date.',
  'validation.nextCutoffOrder': 'The next cutoff must be after the previous cutoff date.',
  'validation.readingPastCutoff':
    'The reading date is past the estimated cutoff. Check the previous cutoff or billing cycle.',
  'validation.otherChargesNegative': 'Additional charges cannot be negative.',

  'narrative.p1':
    'As of {currentDate} your reading is {currentReading} and your previous reading from {previousDate} was {previousReading}, so in {elapsedDays} days you have used {consumed} kWh, an average of {avg} kWh per day.',
  'narrative.p2': 'You are on tariff {tariff} with {cycle} billing. {summerHint}{allowanceHint}',
  'narrative.p3':
    'If you keep this pace for the rest of the period (estimated cutoff {nextCutoff}, {billingDays} days), estimated consumption is {projected} kWh and the approximate amount would be {total} (includes VAT).',
  'narrative.summerTariff1': 'Tariff 1 does not distinguish a summer season.',
  'narrative.summerAll': 'All of these days fall in the summer season.',
  'narrative.summerMixto':
    'The period crosses the start or end of summer, so mixed-period treatment applies.',
  'narrative.summerFuera': 'These days are outside the summer season.',
  'narrative.allowanceFuera': ' Outside summer, the subsidized ranges are smaller.',
  'narrative.allowanceVerano':
    ' In summer, your tariff provides additional subsidized kWh{lowerBasicRateHint}.',
  'narrative.lowerBasicRate': ' and a lower basic usage rate',

  'billing.seasonVerano': 'Summer season',
  'billing.seasonFuera': 'Non-summer season',
  'billing.seasonNone': 'No differentiated summer season',
  'billing.seasonMixto': 'Mixed period (summer and non-summer)',
  'billing.seasonProfileNone': 'No differentiated season',
  'billing.seasonProfileMixto': 'Mixed period',
  'billing.seasonProfileVerano': 'Summer season',
  'billing.seasonProfileFuera': 'Non-summer',
  'billing.lineLabel': '{tariff} {block}',
  'billing.lineLabelWithSeason': '{tariff} {block} ({season})',
  'billing.lineSeasonVerano': 'summer',
  'billing.lineSeasonEstandar': 'standard',
  'billing.dacFixed': 'DAC fixed charge ({region})',
  'billing.dacEnergyVerano': 'DAC energy (summer)',
  'billing.dacEnergyFuera': 'DAC energy (non-summer)',
  'billing.dacSeasonVerano': 'DAC in summer season',
  'billing.dacSeasonFuera': 'DAC outside summer',
  'billing.minAssumption':
    'The official minimum of {minimum} kWh is applied for a {cycle} period.',
  'billing.rateAssumption':
    'Rates for {month} {year} ({offset} days before cutoff), per the billing manual.',
  'billing.mixtoAssumption':
    'Mixed bimonthly period with {summerDays} summer days and {nonSummerDays} non-summer days: consumption is split by days ({summerKwh} kWh in summer and {nonSummerKwh} kWh non-summer). Each portion uses that season’s official monthly Basic and Intermediate allowances; the rest is Excess. CFE does not publish the exact allocation formula.',
  'billing.mixtoFractions':
    'First portion: {firstSeason} ({firstDays} days) with rates from {firstMonth}; second portion: {secondSeason} ({secondDays} days) with rates from {secondMonth}.',
  'billing.seasonWordVerano': 'summer',
  'billing.seasonWordFuera': 'non-summer',
  'billing.tariffAsOf':
    'Last tariff update: {date}. Rates are correct as of this date. The official CFE bill prevails.',
  'billing.dacLimitRef':
    'Reference DAC limit for {tariff}: {limit} kWh/month (12-month rolling average).',
  'billing.localSummer': 'Local summer: 6 consecutive months starting in {month}.',
  'billing.dacAssumption1': 'DAC uses a fixed charge plus energy with no subsidized blocks.',
  'billing.dacAssumption2':
    'Regional DAC rates updated and correct as of {date}; confirm the monthly memo on your bill.',
  'billing.dacWarning':
    'Reclassification to DAC depends on the 12-month rolling average, not a single period.',

  'dac.alreadyMessage':
    'Your service is or was marked as DAC. The calculation uses DAC charges; returning to a domestic tariff requires an average below the limit for 12 months and a request to CFE.',
  'dac.alreadyDetail1':
    'Reclassification to DAC does not depend on a single bill: CFE uses the rolling average consumption over the last 12 months.',
  'dac.alreadyDetail2':
    'To leave DAC you must keep Average Monthly Consumption below your locality’s limit and request the change from CFE.',
  'dac.historyRuleMensual':
    'For the official average, the kWh from your last 12 monthly bills are summed and divided by 12.',
  'dac.historyRuleBimestral':
    'Even with bimonthly billing, the DAC limit is expressed in kWh/month. The kWh from your last 6 bills (each covering ~2 months) are summed and divided by 12.',
  'dac.cycleMensuales': 'monthly',
  'dac.cycleBimestrales': 'bimonthly',
  'dac.incompletePaceAbove':
    'If you kept this period’s observed pace for a month, you would use about {pace} kWh/month, above the {limit} kWh/month limit. This is a projection of your current use, not your DAC rolling average.',
  'dac.incompletePaceOk':
    'If you kept this period’s observed pace for a month, you would use about {pace} kWh/month (limit {limit} kWh/month). This is a projection of your current use, not your DAC rolling average.',
  'dac.incompleteMessage':
    'DAC limit for {tariff}: {limit} kWh/month. {paceNote} To estimate your 12-month rolling average and real DAC risk we need your last {required} {cycleLabel} consumptions. {missing} still missing.',
  'dac.incompleteDetailMain':
    'CFE determines DAC risk with the 12-month rolling average, not a single-period projection. Without those prior consumptions we cannot estimate your real average or confirm high-consumption risk.',
  'dac.incompleteDetailEmpty':
    'Enter the {required} {cycleLabel} consumptions in the form’s expert mode (the “Consumo (kWh)” from each bill in your CFE history).',
  'dac.incompleteDetailPartial':
    'You have entered {provided} of {required}. Complete the remaining {missing} to calculate your 12-month average and a projection for the next cycle.',
  'dac.avgDetail':
    'Your average over the last 12 months is {average} kWh/month (limit {limit} kWh/month).',
  'dac.paceDetail':
    'If you keep your current pace (~{pace} kWh/month), projected consumption for this period is {projected} kWh.',
  'dac.nextAbove':
    'Replacing the oldest period with this projected consumption, the estimated rolling average would be {next} kWh/month: above the DAC limit.',
  'dac.nextBelow':
    'Replacing the oldest period with this projected consumption, the estimated rolling average would be {next} kWh/month: still below the DAC limit.',
  'dac.messageAbove':
    'Your 12-month average ({average} kWh/month) is already above the {limit} kWh/month limit. There is a risk of reclassification to DAC.',
  'dac.messageCrossing':
    'Your 12-month average ({average} kWh/month) is still below the limit, but if you keep this pace the estimated next-cycle average ({next} kWh/month) would be above {limit} kWh/month.',
  'dac.messageBelow':
    'Your 12-month average ({average} kWh/month) is below the {limit} kWh/month limit.',
  'dac.messageBelowNext':
    ' At the current pace, the estimated next-cycle average would be {next} kWh/month.',

  'guidance.simpleAvg': 'Your average is {avg} kWh/{unit}.',
  'guidance.inFirst':
    'Your average ({avg} kWh/{unit}) fits in {band}. You have {headroom} kWh/{unit} left before the next block.',
  'guidance.inMiddle':
    'Your average ({avg} kWh/{unit}) exceeds {previous} by {above} kWh/{unit} and still fits in {band}. You have {headroom} kWh/{unit} left before excess.',
  'guidance.excess':
    'Your average ({avg} kWh/{unit}) exceeds {band} by {excess} kWh/{unit}: that portion is billed as Excess (high price).',
  'guidance.dac':
    'The DAC tariff has no subsidized blocks (Basic/Intermediate): all energy is billed at the DAC rate plus the fixed charge.',
  'guidance.mixtoIntro':
    'Mixed period: {summerDays} summer days ({summerKwh} kWh) and {nonSummerDays} non-summer days ({nonSummerKwh} kWh). Your average is {avg} kWh/{unit}.',
  'guidance.mixtoFuera': 'Non-summer: {text}',
  'guidance.mixtoVerano': 'Summer: {text}',
}

const catalogs: Record<Language, Record<MessageKey, string>> = {
  es: esMessages,
  en: enMessages,
}

export function translate(language: Language, key: MessageKey, params?: Params): string {
  let template = catalogs[language][key] ?? catalogs.es[key] ?? key
  if (!params) return template
  for (const [name, value] of Object.entries(params)) {
    template = template.replaceAll(`{${name}}`, String(value))
  }
  return template
}
