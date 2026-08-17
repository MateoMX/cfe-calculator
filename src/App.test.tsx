import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import App from './App'
import { daysAgoLabel, todayISO } from './domain/dates'
import { resolveLanguageFromLocale } from './i18n'
import { hashForCalculatorInput } from './shareLink'

describe('App', () => {
  beforeEach(() => {
    window.localStorage.clear()
    vi.stubGlobal('navigator', {
      ...navigator,
      language: 'es-MX',
      languages: ['es-MX'],
    })
  })

  afterEach(() => {
    window.location.hash = ''
    vi.useRealTimers()
    vi.unstubAllGlobals()
  })

  function stubMobileMatchMedia(matches = true) {
    vi.stubGlobal(
      'matchMedia',
      vi.fn().mockImplementation((query: string) => ({
        matches: matches && String(query).includes('max-width: 720px'),
        media: query,
        onchange: null,
        addListener: vi.fn(),
        removeListener: vi.fn(),
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
        dispatchEvent: vi.fn(),
      })),
    )
  }

  function mockRect(
    element: Element,
    rect: Pick<DOMRect, 'top' | 'height'> & Partial<DOMRect>,
  ) {
    const height = rect.height
    const top = rect.top
    vi.spyOn(element, 'getBoundingClientRect').mockReturnValue({
      x: rect.x ?? 0,
      y: top,
      top,
      bottom: rect.bottom ?? top + height,
      left: rect.left ?? 0,
      right: rect.right ?? 360,
      width: rect.width ?? 360,
      height,
      toJSON: () => ({}),
    } as DOMRect)
  }

  it('on mobile, focuses and scrolls the first invalid field into view', async () => {
    stubMobileMatchMedia(true)
    const user = userEvent.setup()
    render(<App initialLanguage="es" />)

    const inputScreen = document.querySelector('.m-screen--input')
    expect(inputScreen).toBeInstanceOf(HTMLElement)
    if (!(inputScreen instanceof HTMLElement)) return

    Object.defineProperty(inputScreen, 'clientHeight', { configurable: true, value: 400 })
    Object.defineProperty(inputScreen, 'scrollTop', {
      configurable: true,
      writable: true,
      value: 0,
    })
    const scrollTo = vi.fn(({ top = 0 }: ScrollToOptions) => {
      inputScreen.scrollTop = top
    })
    inputScreen.scrollTo = scrollTo as typeof inputScreen.scrollTo

    mockRect(inputScreen, { top: 80, height: 400 })

    const previousCutoff = screen.getByLabelText(/Fecha de corte del recibo anterior/i)
    const field = previousCutoff.closest('.form-field') ?? previousCutoff
    mockRect(field, { top: 920, height: 120 })
    mockRect(previousCutoff, { top: 960, height: 40 })

    await user.click(screen.getByRole('button', { name: /Calcular estimación/i }))

    expect(previousCutoff).toHaveAttribute('aria-invalid', 'true')
    expect(previousCutoff).toHaveFocus()
    expect(scrollTo).toHaveBeenCalled()
    expect(inputScreen.scrollTop).toBeGreaterThan(0)
  })

  it('renders the Spanish calculator and produces an estimate', async () => {
    const user = userEvent.setup()
    render(<App initialLanguage="es" />)

    expect(screen.getByRole('heading', { name: /Calculadora de recibo CFE/i })).toBeInTheDocument()

    const tariffSelect = screen.getByLabelText(/Tarifa impresa en tu recibo/i)
    const temperatureDescription = document.getElementById(
      tariffSelect.getAttribute('aria-describedby')!,
    )
    expect(temperatureDescription).toHaveTextContent(
      /temperatura media mínima en verano de al menos 28 °C/i,
    )

    await user.click(screen.getByRole('button', { name: /Qué es la tarifa/i }))
    const tariffInfo = screen.getByRole('dialog', { name: /Qué es la tarifa/i })
    expect(tariffInfo).toHaveTextContent(/temperaturas medias de verano/i)
    expect(tariffInfo).toHaveTextContent(/localidades más calurosas/i)
    await user.keyboard('{Escape}')

    await user.selectOptions(tariffSelect, '1B')
    await user.selectOptions(
      screen.getByLabelText(/Mes en que comienza el verano en tu localidad/i),
      '5',
    )

    const previousReading = screen.getByLabelText(/Lectura anterior \(kWh del medidor al corte previo\)/i)
    const currentReading = screen.getByLabelText(/Lectura actual \(kWh del medidor hoy\)/i)
    await user.clear(previousReading)
    await user.type(previousReading, '1000')
    await user.clear(currentReading)
    await user.type(currentReading, '1200')

    const previousCutoff = screen.getByLabelText(/Fecha de corte del recibo anterior/i)
    const currentReadingDate = screen.getByLabelText(/Fecha de la lectura actual/i)
    expect(currentReadingDate).toHaveValue(todayISO())
    expect(screen.getByText('hoy')).toBeInTheDocument()
    await user.clear(previousCutoff)
    await user.type(previousCutoff, '2026-06-30')
    expect(screen.getByText(daysAgoLabel('2026-06-30')!)).toBeInTheDocument()
    await user.clear(currentReadingDate)
    await user.type(currentReadingDate, '2026-07-16')
    if (todayISO() === '2026-07-16') {
      expect(screen.getByText('hoy')).toBeInTheDocument()
    } else {
      expect(screen.queryByText('hoy')).not.toBeInTheDocument()
    }

    expect(screen.queryByLabelText(/Próximo corte estimado/i)).not.toBeInTheDocument()
    expect(
      screen.getByText(/Estimamos el próximo corte para el 29 de agosto de 2026/i),
    ).toBeInTheDocument()
    expect(
      screen.getByText(/sumamos aproximadamente 60 días por el ciclo bimestral/i),
    ).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: /Calcular estimación/i }))

    expect(await screen.findByRole('heading', { name: /Estimación del recibo/i })).toBeInTheDocument()
    expect(screen.getByText(/promedio de 12\.5 kWh por día/i)).toBeInTheDocument()
    expect(screen.getByText(/Total estimado/i)).toBeInTheDocument()
    expect(screen.getByText(/Consumo proyectado/i).parentElement).toHaveTextContent(/750/)

    expect(screen.getByRole('heading', { name: /Detalle del consumo subsidiado/i })).toBeInTheDocument()
    expect(screen.getByRole('tab', { name: /^Diario$/i })).toHaveAttribute('aria-selected', 'true')
    expect(screen.getByRole('tab', { name: /^Mensual$/i })).toBeInTheDocument()
    expect(screen.getByRole('tab', { name: /^Bimestral$/i })).toBeInTheDocument()
    expect(document.querySelector('.allowance-marker-legend-item--avg')).toHaveTextContent(
      /Tu promedio:\s*12\.5 kWh\/día/i,
    )
    expect(document.querySelector('.allowance-marker-legend-item--dac')).toHaveTextContent(
      /Umbral DAC:\s*13\.33 kWh\/día/i,
    )
    expect(
      screen.getByText(/supera Intermedio por 5 kWh\/día: esa parte se cobra como Excedente/i),
    ).toBeInTheDocument()
    expect(screen.getByText(/Usando 3\.33 de 3\.33/i)).toBeInTheDocument()
    expect(screen.getByText(/Usando 4\.17 de 4\.17/i)).toBeInTheDocument()
    expect(screen.getAllByText('100%').length).toBeGreaterThanOrEqual(2)
    expect(document.querySelectorAll('.allowance-usage-pie').length).toBeGreaterThanOrEqual(2)
    expect(screen.queryByText(/a este precio/i)).not.toBeInTheDocument()
    expect(screen.getAllByText(/\$1\.010 \/ kWh/i).length).toBeGreaterThan(0)
    expect(screen.getAllByText(/\$1\.171 \/ kWh/i).length).toBeGreaterThan(0)
    expect(screen.getAllByText(/\$4\.016 \/ kWh/i).length).toBeGreaterThan(0)

    await user.click(screen.getByRole('tab', { name: /^Mensual$/i }))
    expect(screen.getByRole('tab', { name: /^Mensual$/i })).toHaveAttribute('aria-selected', 'true')
    expect(document.querySelector('.allowance-marker-legend-item--avg')).toHaveTextContent(
      /Tu promedio:\s*375 kWh\/mes/i,
    )
    expect(screen.getByText(/Usando 100 de 100/i)).toBeInTheDocument()
    expect(document.querySelector('.allowance-marker-legend-item--dac')).toHaveTextContent(
      /Umbral DAC:\s*400 kWh\/mes/i,
    )
    expect(
      screen.getByText(/supera Intermedio por 150 kWh\/mes: esa parte se cobra como Excedente/i),
    ).toBeInTheDocument()

    await user.click(screen.getByRole('tab', { name: /^Bimestral$/i }))
    expect(screen.getByRole('tab', { name: /^Bimestral$/i })).toHaveAttribute(
      'aria-selected',
      'true',
    )
    expect(document.querySelector('.allowance-marker-legend-item--avg')).toHaveTextContent(
      /Tu promedio:\s*750 kWh\/bimestre/i,
    )
    expect(screen.getByText(/Usando 200 de 200/i)).toBeInTheDocument()
    expect(document.querySelector('.allowance-marker-legend-item--dac')).toHaveTextContent(
      /Umbral DAC:\s*800 kWh\/bimestre/i,
    )
    expect(
      screen.getByText(
        /supera Intermedio por 300 kWh\/bimestre: esa parte se cobra como Excedente/i,
      ),
    ).toBeInTheDocument()
  })

  it('explains the mixed-bill estimate when billing dates cross the end of summer', async () => {
    const user = userEvent.setup()
    render(<App initialLanguage="es" />)

    await user.selectOptions(
      screen.getByLabelText(/Mes en que comienza el verano en tu localidad/i),
      '4',
    )
    const previousReading = screen.getByLabelText(/Lectura anterior \(kWh del medidor al corte previo\)/i)
    const currentReading = screen.getByLabelText(/Lectura actual \(kWh del medidor hoy\)/i)
    await user.clear(previousReading)
    await user.type(previousReading, '1000')
    await user.clear(currentReading)
    await user.type(currentReading, '1100')
    await user.clear(screen.getByLabelText(/Fecha de corte del recibo anterior/i))
    await user.type(screen.getByLabelText(/Fecha de corte del recibo anterior/i), '2026-08-21')
    await user.clear(screen.getByLabelText(/Fecha de la lectura actual/i))
    await user.type(screen.getByLabelText(/Fecha de la lectura actual/i), '2026-09-20')

    expect(screen.getByText(/Estimamos el próximo corte para el 20 de octubre de 2026/i)).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: /Calcular estimación/i }))

    expect(
      await screen.findByRole('heading', { name: /Periodo mixto \(verano y fuera de verano\)/i }),
    ).toBeInTheDocument()
    expect(
      screen.getByText(
        /Primera fracción: verano \(40 días\) con cuotas de septiembre; segunda fracción: fuera de verano \(20 días\) con cuotas de octubre/i,
      ),
    ).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: /Reparto del periodo mixto/i })).toBeInTheDocument()
    expect(screen.getByText(/40 días:/i)).toBeInTheDocument()
    expect(screen.getByText(/20 días:/i)).toBeInTheDocument()
    expect(document.querySelectorAll('.allowance-mixed-breakdown-usage')).toHaveLength(2)
    expect(document.querySelectorAll('.allowance-chart--mixed')).toHaveLength(1)
    expect(document.querySelectorAll('.allowance-mixed-column')).toHaveLength(2)
    expect(document.querySelectorAll('.allowance-mixed-details')).toHaveLength(2)
    expect(screen.getByRole('heading', { name: /^Verano$/i })).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: /^Estándar$/i })).toBeInTheDocument()

    await user.click(
      screen.getByRole('button', { name: /Cómo estimamos este periodo mixto/i }),
    )
    const mixedInfo = screen.getByRole('dialog', {
      name: /Cómo estimamos este periodo mixto/i,
    })
    expect(mixedInfo).toHaveTextContent(/repartimos el consumo proyectado en esa misma proporción/i)
    expect(mixedInfo).toHaveTextContent(/cupos mensuales oficiales de Básico e Intermedio/i)
    expect(mixedInfo).toHaveTextContent(/reparto por días es una estimación/i)
    expect(mixedInfo).toHaveTextContent(/recibo de CFE prevalece/i)
  })

  it('hides bimonthly allowance scale when billing cycle is monthly', async () => {
    const user = userEvent.setup()
    render(<App initialLanguage="es" />)

    await user.selectOptions(screen.getByLabelText(/Ciclo de facturación/i), 'mensual')
    await user.selectOptions(
      screen.getByLabelText(/Mes en que comienza el verano en tu localidad/i),
      '5',
    )
    const previousReading = screen.getByLabelText(/Lectura anterior \(kWh del medidor al corte previo\)/i)
    const currentReading = screen.getByLabelText(/Lectura actual \(kWh del medidor hoy\)/i)
    await user.clear(previousReading)
    await user.type(previousReading, '1000')
    await user.clear(currentReading)
    await user.type(currentReading, '1125')
    await user.clear(screen.getByLabelText(/Fecha de corte del recibo anterior/i))
    await user.type(screen.getByLabelText(/Fecha de corte del recibo anterior/i), '2026-06-30')
    await user.clear(screen.getByLabelText(/Fecha de la lectura actual/i))
    await user.type(screen.getByLabelText(/Fecha de la lectura actual/i), '2026-07-15')

    await user.click(screen.getByRole('button', { name: /Calcular estimación/i }))
    expect(
      await screen.findByRole('heading', { name: /Detalle del consumo subsidiado/i }),
    ).toBeInTheDocument()
    expect(screen.getByRole('tab', { name: /^Diario$/i })).toBeInTheDocument()
    expect(screen.getByRole('tab', { name: /^Mensual$/i })).toBeInTheDocument()
    expect(screen.queryByRole('tab', { name: /^Bimestral$/i })).not.toBeInTheDocument()
  })

  it('restores the saved tariff, summer start, and billing cycle', async () => {
    const user = userEvent.setup()
    const firstRender = render(<App initialLanguage="es" />)

    await user.selectOptions(screen.getByLabelText(/Tarifa impresa en tu recibo/i), '1C')
    await user.selectOptions(
      screen.getByLabelText(/Mes en que comienza el verano en tu localidad/i),
      '3',
    )
    await user.selectOptions(screen.getByLabelText(/Ciclo de facturación/i), 'mensual')

    firstRender.unmount()
    render(<App initialLanguage="es" />)

    expect(screen.getByLabelText(/Tarifa impresa en tu recibo/i)).toHaveValue('1C')
    expect(screen.getByLabelText(/Mes en que comienza el verano en tu localidad/i)).toHaveValue('3')
    expect(screen.getByLabelText(/Ciclo de facturación/i)).toHaveValue('mensual')
  })

  it('restores previous reading and corte when still within the bimestral window', () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date(2026, 7, 25))
    window.localStorage.setItem(
      'cfe-calculator.preferences.v1',
      JSON.stringify({
        billingCycle: 'bimestral',
        previousReading: 1000,
        previousCutoffDate: '2026-06-30',
      }),
    )

    render(<App initialLanguage="es" />)

    expect(screen.getByLabelText(/Lectura anterior \(kWh del medidor al corte previo\)/i)).toHaveValue(
      1000,
    )
    expect(screen.getByLabelText(/Fecha de corte del recibo anterior/i)).toHaveValue('2026-06-30')
    expect(
      screen.getByText(/Estimamos el próximo corte para el 29 de agosto de 2026/i),
    ).toBeInTheDocument()
  })

  it('does not restore previous reading and corte when past the mensual window', () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date(2026, 7, 25))
    window.localStorage.setItem(
      'cfe-calculator.preferences.v1',
      JSON.stringify({
        billingCycle: 'mensual',
        previousReading: 1000,
        previousCutoffDate: '2026-06-30',
      }),
    )

    render(<App initialLanguage="es" />)

    expect(screen.getByLabelText(/Ciclo de facturación/i)).toHaveValue('mensual')
    expect(
      screen.getByLabelText(/Lectura anterior \(kWh del medidor al corte previo\)/i),
    ).not.toHaveValue(1000)
    expect(screen.getByLabelText(/Fecha de corte del recibo anterior/i)).toHaveValue('')
  })

  it('keeps expert-mode inputs hidden until the toggle is enabled', async () => {
    const user = userEvent.setup()
    render(<App initialLanguage="es" />)
    expect(screen.getByRole('heading', { name: /^Modo experto$/i })).toBeInTheDocument()
    expect(
      screen.queryByText(/cargos extra como DAP \(alumbrado público\)/i),
    ).not.toBeInTheDocument()
    expect(screen.queryByText(/Historial para riesgo DAC/i)).not.toBeInTheDocument()
    expect(
      screen.queryByLabelText(/Otros cargos conocidos del recibo/i),
    ).not.toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: /Qué es el modo experto/i }))
    expect(
      screen.getByText(/cargos extra como DAP \(alumbrado público\)/i),
    ).toBeInTheDocument()

    const expertSwitch = screen.getByRole('switch', { name: /Modo experto/i })
    expect(expertSwitch).toHaveAttribute('aria-checked', 'false')
    await user.click(expertSwitch)
    expect(expertSwitch).toHaveAttribute('aria-checked', 'true')
    expect(screen.getByText(/Historial para riesgo DAC/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/Otros cargos conocidos del recibo/i)).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: /Qué es la tarifa DAC/i }))
    const dacInfo = screen.getByRole('dialog', { name: /Qué es la tarifa DAC/i })
    expect(dacInfo).toHaveTextContent(/normalmente tienen la Tarifa 1B/i)
    expect(dacInfo).toHaveTextContent(/supera 400 kWh/i)
  })

  it('shows 6 bimonthly history slots and incomplete-history DAC messaging', async () => {
    const user = userEvent.setup()
    render(<App initialLanguage="es" />)

    await user.click(screen.getByRole('switch', { name: /Modo experto/i }))
    expect(screen.getByText(/Historial para riesgo DAC/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/Consumo más reciente \(kWh\)/i)).toBeInTheDocument()
    expect(screen.getAllByLabelText(/Uso historial \d+ \(kWh\)/i)).toHaveLength(5)

    await user.selectOptions(
      screen.getByLabelText(/Mes en que comienza el verano en tu localidad/i),
      '5',
    )
    const previousReading = screen.getByLabelText(/Lectura anterior \(kWh del medidor al corte previo\)/i)
    const currentReading = screen.getByLabelText(/Lectura actual \(kWh del medidor hoy\)/i)
    await user.clear(previousReading)
    await user.type(previousReading, '1000')
    await user.clear(currentReading)
    await user.type(currentReading, '1200')
    await user.clear(screen.getByLabelText(/Fecha de corte del recibo anterior/i))
    await user.type(screen.getByLabelText(/Fecha de corte del recibo anterior/i), '2026-06-30')
    await user.clear(screen.getByLabelText(/Fecha de la lectura actual/i))
    await user.type(screen.getByLabelText(/Fecha de la lectura actual/i), '2026-07-16')

    await user.click(screen.getByRole('button', { name: /Calcular estimación/i }))

    expect(await screen.findByRole('heading', { name: /^Riesgo DAC$/i })).toBeInTheDocument()
    expect(screen.getByText(/últimos 6 consumos bimestrales/i)).toBeInTheDocument()
    expect(screen.getByText(/Faltan 6 por capturar/i)).toBeInTheDocument()
    expect(
      screen.getByText(/sin esos consumos previos no podemos estimar tu promedio real/i),
    ).toBeInTheDocument()
    expect(screen.getByText(/no tu promedio móvil DAC/i)).toBeInTheDocument()
    expect(screen.getAllByText(/Umbral DAC/i).length).toBeGreaterThan(0)
    expect(screen.getAllByText(/400 kWh\/mes/i).length).toBeGreaterThan(0)
  })

  it('switches to 12 monthly history slots and estimates a complete 12-month average', async () => {
    const user = userEvent.setup()
    render(<App initialLanguage="es" />)

    await user.selectOptions(screen.getByLabelText(/Ciclo de facturación/i), 'mensual')
    await user.click(screen.getByRole('switch', { name: /Modo experto/i }))
    expect(screen.getByLabelText(/Consumo más reciente \(kWh\)/i)).toBeInTheDocument()
    expect(screen.getAllByLabelText(/Uso historial \d+ \(kWh\)/i)).toHaveLength(11)

    await user.selectOptions(
      screen.getByLabelText(/Mes en que comienza el verano en tu localidad/i),
      '5',
    )
    const previousReading = screen.getByLabelText(/Lectura anterior \(kWh del medidor al corte previo\)/i)
    const currentReading = screen.getByLabelText(/Lectura actual \(kWh del medidor hoy\)/i)
    await user.clear(previousReading)
    await user.type(previousReading, '1000')
    await user.clear(currentReading)
    await user.type(currentReading, '1125')
    await user.clear(screen.getByLabelText(/Fecha de corte del recibo anterior/i))
    await user.type(screen.getByLabelText(/Fecha de corte del recibo anterior/i), '2026-06-30')
    await user.clear(screen.getByLabelText(/Fecha de la lectura actual/i))
    await user.type(screen.getByLabelText(/Fecha de la lectura actual/i), '2026-07-15')

    const newestHistory = screen.getByLabelText(/Consumo más reciente \(kWh\)/i)
    await user.clear(newestHistory)
    await user.type(newestHistory, '350')
    for (let line = 1; line <= 11; line += 1) {
      const input = screen.getByLabelText(new RegExp(`Uso historial ${line} \\(kWh\\)`, 'i'))
      await user.clear(input)
      await user.type(input, '350')
    }

    await user.click(screen.getByRole('button', { name: /Calcular estimación/i }))

    expect(await screen.findByRole('heading', { name: /^Riesgo DAC$/i })).toBeInTheDocument()
    expect(screen.getByText(/Promedio 12 meses/i).parentElement).toHaveTextContent(/350/)
    expect(screen.getByText(/está bajo el límite de 400 kWh\/mes/i)).toBeInTheDocument()
  })

  it('shows approximate newest-to-oldest DAC history date hints from the previous cutoff', async () => {
    const user = userEvent.setup()
    render(<App initialLanguage="es" />)

    await user.click(screen.getByRole('switch', { name: /Modo experto/i }))
    expect(
      screen.getByText(/Fechas aproximadas para orientar el orden.*Total periodo/i),
    ).toBeInTheDocument()
    expect(screen.getByText(/^Más reciente$/i)).toBeInTheDocument()
    expect(screen.getByText(/Uso historial 1/i)).toBeInTheDocument()
    expect(screen.getByText(/Uso historial 5/i)).toBeInTheDocument()
    expect(
      screen.getByRole('button', {
        name: /Ver en el recibo el consumo del periodo más reciente/i,
      }),
    ).toBeInTheDocument()
    expect(
      screen.getAllByRole('button', {
        name: /Ver en el historial del recibo la línea \d+ de kWh/i,
      }),
    ).toHaveLength(5)
    expect(screen.queryByText(/≈/)).not.toBeInTheDocument()

    await user.clear(screen.getByLabelText(/Fecha de corte del recibo anterior/i))
    await user.type(screen.getByLabelText(/Fecha de corte del recibo anterior/i), '2026-04-24')

    expect(screen.getByText(/^Más reciente$/i)).toBeInTheDocument()
    expect(screen.getAllByText(/≈/).length).toBe(6)
    expect(
      screen.getByLabelText(/Consumo más reciente \(kWh\), periodo aproximado ≈/i),
    ).toHaveAccessibleName(/24/)

    await user.selectOptions(screen.getByLabelText(/Ciclo de facturación/i), 'mensual')
    expect(screen.getByLabelText(/Consumo más reciente \(kWh\)/i)).toBeInTheDocument()
    expect(screen.getAllByLabelText(/Uso historial \d+ \(kWh\)/i)).toHaveLength(11)
    expect(screen.getByText(/Uso historial 11/i)).toBeInTheDocument()
    expect(screen.getAllByText(/≈/).length).toBe(12)
    expect(
      screen.getByLabelText(/Consumo más reciente \(kWh\), periodo aproximado ≈/i),
    ).toBeInTheDocument()
  })

  it('opens bill examples with the matching highlight and closes them', async () => {
    const user = userEvent.setup()
    render(<App initialLanguage="es" />)

    await user.click(screen.getByRole('button', { name: /Ver en el recibo dónde está la tarifa/i }))
    expect(screen.getByRole('dialog', { name: /Dónde está la tarifa/i })).toBeInTheDocument()
    expect(screen.getByText(/línea “TARIFA”/i)).toBeInTheDocument()
    expect(screen.getByTestId('bill-example-highlight-tariff')).toBeInTheDocument()
    expect(screen.getByRole('img', { name: /Ejemplo de recibo CFE con la tarifa resaltada/i })).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: /^Cerrar$/i }))
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()

    await user.click(
      screen.getByRole('button', {
        name: /Ver en el recibo dónde está la fecha de la última lectura/i,
      }),
    )
    expect(
      screen.getByRole('dialog', { name: /Dónde está la fecha de la última lectura/i }),
    ).toBeInTheDocument()
    expect(screen.getByTestId('bill-example-highlight-previousCutoffDate')).toBeInTheDocument()
    await user.keyboard('{Escape}')
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()

    await user.click(
      screen.getByRole('button', { name: /Ver en el recibo dónde está la lectura anterior/i }),
    )
    expect(screen.getByRole('dialog', { name: /Dónde está la lectura anterior/i })).toBeInTheDocument()
    expect(screen.getByTestId('bill-example-highlight-previousReading')).toBeInTheDocument()
    expect(
      screen.getByRole('img', { name: /Ejemplo de recibo CFE con la lectura actual del medidor resaltada/i }),
    ).toHaveAttribute('src', expect.stringContaining('CFE-Example1-Mobile.png'))
    await user.click(screen.getByRole('button', { name: /^Cerrar$/i }))

    await user.click(screen.getByRole('switch', { name: /Modo experto/i }))
    expect(
      screen.queryByRole('button', {
        name: /Ver en el recibo dónde está el historial de consumo DAC/i,
      }),
    ).not.toBeInTheDocument()

    await user.click(
      screen.getByRole('button', {
        name: /Ver en el recibo el consumo del periodo más reciente/i,
      }),
    )
    expect(
      screen.getByRole('dialog', { name: /Dónde está el consumo más reciente/i }),
    ).toBeInTheDocument()
    expect(screen.getByTestId('bill-example-highlight-dacHistoryNewest')).toBeInTheDocument()
    expect(
      screen.getByRole('img', {
        name: /Ejemplo de recibo CFE con el Total periodo de energía resaltado/i,
      }),
    ).toHaveAttribute('src', expect.stringContaining('CFE-Example1-Desktop.png'))
    await user.keyboard('{Escape}')
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()

    await user.click(
      screen.getByRole('button', {
        name: /Ver en el historial del recibo la línea 1 de kWh \(uso historial 1\)/i,
      }),
    )
    expect(
      screen.getByRole('dialog', { name: /Dónde están los consumos anteriores/i }),
    ).toBeInTheDocument()
    expect(screen.getByText(/la flecha marca la línea 1/i)).toBeInTheDocument()
    expect(screen.getByTestId('bill-example-highlight-dacHistoryOlder')).toBeInTheDocument()
    expect(screen.getByTestId('bill-example-history-marker')).toHaveAttribute(
      'data-history-line',
      '1',
    )
    expect(
      screen.getByRole('img', { name: /Ejemplo de historial CFE con la columna de kWh resaltada/i }),
    ).toHaveAttribute('src', expect.stringContaining('CFE-Example2.png'))
    await user.keyboard('{Escape}')

    await user.click(
      screen.getByRole('button', {
        name: /Ver en el historial del recibo la línea 5 de kWh \(uso historial 5\)/i,
      }),
    )
    expect(screen.getByText(/la flecha marca la línea 5/i)).toBeInTheDocument()
    expect(screen.getByTestId('bill-example-history-marker')).toHaveAttribute(
      'data-history-line',
      '5',
    )

    await user.selectOptions(screen.getByLabelText(/Ciclo de facturación/i), 'mensual')
    expect(
      screen.getAllByRole('button', {
        name: /Ver en el historial del recibo la línea \d+ de kWh/i,
      }),
    ).toHaveLength(11)
  })

  it('highlights when current pace is above the DAC daily reference', async () => {
    const user = userEvent.setup()
    render(<App initialLanguage="es" />)

    await user.selectOptions(
      screen.getByLabelText(/Mes en que comienza el verano en tu localidad/i),
      '5',
    )
    // 16 days × 15 kWh/day = 240 kWh → above 400/30 ≈ 13.33 kWh/day DAC reference
    const previousReading = screen.getByLabelText(/Lectura anterior \(kWh del medidor al corte previo\)/i)
    const currentReading = screen.getByLabelText(/Lectura actual \(kWh del medidor hoy\)/i)
    await user.clear(previousReading)
    await user.type(previousReading, '1000')
    await user.clear(currentReading)
    await user.type(currentReading, '1240')
    await user.clear(screen.getByLabelText(/Fecha de corte del recibo anterior/i))
    await user.type(screen.getByLabelText(/Fecha de corte del recibo anterior/i), '2026-06-30')
    await user.clear(screen.getByLabelText(/Fecha de la lectura actual/i))
    await user.type(screen.getByLabelText(/Fecha de la lectura actual/i), '2026-07-16')

    await user.click(screen.getByRole('button', { name: /Calcular estimación/i }))

    expect(
      await screen.findByText(/Ritmo actual por encima del umbral DAC de referencia/i),
    ).toBeInTheDocument()
    expect(screen.getAllByText(/Umbral DAC/i).length).toBeGreaterThan(0)
    expect(screen.queryByText(/Ritmo sobre umbral DAC/i)).not.toBeInTheDocument()
    expect(screen.getAllByText(/^Excedente$/i)).toHaveLength(1)
  })

  it('prefers a stored language over the browser locale', () => {
    window.localStorage.setItem(
      'cfe-calculator.preferences.v1',
      JSON.stringify({ language: 'en' }),
    )
    vi.stubGlobal('navigator', {
      ...navigator,
      language: 'es-MX',
      languages: ['es-MX'],
    })

    render(<App />)

    expect(screen.getByRole('heading', { name: /CFE bill calculator/i })).toBeInTheDocument()
    expect(document.documentElement.lang).toBe('en')
  })

  it.each([
    [undefined, 'es'],
    ['es-MX', 'es'],
    ['it-IT', 'es'],
    ['pt-BR', 'es'],
    ['en-GB', 'en'],
    ['fr-FR', 'en'],
  ] as const)('maps browser locale %s to %s', (locale, expected) => {
    expect(resolveLanguageFromLocale(locale)).toBe(expected)
  })

  it('switches language, persists the preference, and rebuilds English results', async () => {
    const user = userEvent.setup()
    render(<App initialLanguage="es" />)

    await user.selectOptions(
      screen.getByLabelText(/Mes en que comienza el verano en tu localidad/i),
      '5',
    )
    const previousReading = screen.getByLabelText(/Lectura anterior \(kWh del medidor al corte previo\)/i)
    const currentReading = screen.getByLabelText(/Lectura actual \(kWh del medidor hoy\)/i)
    await user.clear(previousReading)
    await user.type(previousReading, '1000')
    await user.clear(currentReading)
    await user.type(currentReading, '1200')
    await user.clear(screen.getByLabelText(/Fecha de corte del recibo anterior/i))
    await user.type(screen.getByLabelText(/Fecha de corte del recibo anterior/i), '2026-06-30')
    await user.clear(screen.getByLabelText(/Fecha de la lectura actual/i))
    await user.type(screen.getByLabelText(/Fecha de la lectura actual/i), '2026-07-16')
    await user.click(screen.getByRole('button', { name: /Calcular estimación/i }))
    expect(await screen.findByRole('heading', { name: /Estimación del recibo/i })).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: /Idioma/i }))
    await user.click(screen.getByRole('option', { name: /English/i }))

    expect(await screen.findByRole('heading', { name: /CFE bill calculator/i })).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: /Bill estimate/i })).toBeInTheDocument()
    expect(screen.getByText(/average of 12\.5 kWh per day/i)).toBeInTheDocument()
    expect(screen.getByText(/Estimated total/i)).toBeInTheDocument()
    expect(document.documentElement.lang).toBe('en')
    expect(document.title).toMatch(/CFE bill calculator/i)

    const stored = JSON.parse(window.localStorage.getItem('cfe-calculator.preferences.v1')!)
    expect(stored.language).toBe('en')
  })

  it('restores the stored English preference on remount', () => {
    window.localStorage.setItem(
      'cfe-calculator.preferences.v1',
      JSON.stringify({ language: 'en', tariffCode: '1B' }),
    )
    vi.stubGlobal('navigator', {
      ...navigator,
      language: 'es-MX',
      languages: ['es-MX'],
    })

    render(<App />)

    expect(screen.getByRole('heading', { name: /CFE bill calculator/i })).toBeInTheDocument()
    expect(document.documentElement.lang).toBe('en')
  })

  it('does not show the removed already-on-DAC checkbox', () => {
    render(<App initialLanguage="es" />)
    expect(screen.queryByLabelText(/Mi recibo ya indica tarifa DAC/i)).not.toBeInTheDocument()
    expect(screen.queryByText(/My bill already shows the DAC tariff/i)).not.toBeInTheDocument()
  })

  it('opens the tariff reference page from navigation and supports hash deep links', async () => {
    const user = userEvent.setup()
    render(<App initialLanguage="es" />)

    await user.click(screen.getByRole('button', { name: /^Menú$/i }))
    await user.click(screen.getByRole('menuitem', { name: /Consulta de tarifas/i }))
    expect(window.location.hash).toBe('#/tariffs')
    expect(await screen.findByRole('heading', { name: /Consulta de tarifas CFE/i })).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: /Estado de los datos/i })).toBeInTheDocument()
    expect(screen.getByText(/Última verificación/i)).toBeInTheDocument()
    expect(screen.getByText(/17 de agosto de 2026/i)).toBeInTheDocument()
    expect(screen.getByText(/Datos disponibles/i)).toBeInTheDocument()
    expect(screen.getByText(/1 de enero de 2026 – 31 de diciembre de 2026/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/Año de las tarifas/i)).toHaveValue('2026')
    expect(screen.getByLabelText(/Año de las tarifas/i)).toBeEnabled()
    expect(
      screen.getByText(/Cuando CFE publique datos del año siguiente/i),
    ).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /Definición oficial de la tarifa DAC/i })).toHaveAttribute(
      'href',
      expect.stringContaining('TarifaDAC'),
    )

    expect(screen.getByRole('tab', { name: /Tarifas normales/i })).toHaveAttribute(
      'aria-selected',
      'true',
    )
    await user.selectOptions(screen.getByLabelText(/Tarifa doméstica normal/i), '1C')
    await user.selectOptions(screen.getByLabelText(/Mes del desglose/i), '7')

    // Default scale is bimonthly: DAC limit 850 × 2 = 1700 kWh/bimestre
    expect(screen.getByRole('tab', { name: /^Bimestral$/i })).toHaveAttribute(
      'aria-selected',
      'true',
    )
    expect(screen.getAllByText(/1700 kWh\/bimestre/i).length).toBeGreaterThan(0)
    expect(screen.getByRole('heading', { name: /Precios de verano/i })).toBeInTheDocument()
    expect(screen.queryByRole('heading', { name: /Precios estándar/i })).not.toBeInTheDocument()
    expect(screen.getByText(/ventana de seis meses consecutivos/i)).toBeInTheDocument()

    await user.click(screen.getByRole('tab', { name: /^Estándar$/i }))
    expect(screen.getByRole('heading', { name: /Precios estándar/i })).toBeInTheDocument()
    expect(screen.queryByRole('heading', { name: /Precios de verano/i })).not.toBeInTheDocument()

    await user.click(screen.getByRole('tab', { name: /^Mensual$/i }))
    expect(screen.getAllByText(/850 kWh\/mes/i).length).toBeGreaterThan(0)

    expect(screen.queryByRole('heading', { name: /2026 a la vista/i })).not.toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: /Mostrar cuotas de todo 2026/i }))
    expect(screen.getByRole('heading', { name: /2026 a la vista/i })).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: /Cómo se calcula el límite DAC/i }))
    const dacLimitInfo = screen.getByRole('dialog', { name: /Cómo se calcula el límite DAC/i })
    expect(dacLimitInfo).toHaveTextContent(/promedio de los últimos 12 meses/i)
    expect(dacLimitInfo).toHaveTextContent(/850/)

    await user.click(screen.getByRole('tab', { name: /^Tarifa DAC$/i }))
    expect(screen.getByLabelText(/Región DAC/i)).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: /Tarifa DAC por región/i })).toBeInTheDocument()
    expect(screen.getByLabelText(/Mes del desglose/i)).toHaveValue('7')
    expect(screen.getByLabelText(/Año de las tarifas/i)).toHaveValue('2026')
    expect(screen.getByText(/Energía \(verano\)/i)).toBeInTheDocument()
    expect(screen.getByText(/Energía \(fuera de verano\)/i)).toBeInTheDocument()
    expect(screen.getByText(/1 de enero de 2026 – 31 de agosto de 2026/i)).toBeInTheDocument()
    expect(screen.queryByLabelText(/Tarifa doméstica normal/i)).not.toBeInTheDocument()

    await user.selectOptions(screen.getByLabelText(/Mes del desglose/i), '1')
    expect(screen.getByLabelText(/Mes del desglose/i)).toHaveValue('1')
    // Central January energy rate appears in the stats panel.
    expect(screen.getByText(/6\.653/)).toBeInTheDocument()

    await user.selectOptions(screen.getByLabelText(/Región DAC/i), 'baja-california')
    expect(screen.getByText(/5\.557/)).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: /Volver a la calculadora/i }))
    expect(window.location.hash).toBe('#/')
    expect(screen.getByRole('heading', { name: /Calculadora de recibo CFE/i })).toBeInTheDocument()
  })

  it('loads the tariff reference page directly from the hash and switches language', async () => {
    const user = userEvent.setup()
    window.location.hash = '#/tariffs'
    render(<App initialLanguage="es" />)

    expect(await screen.findByRole('heading', { name: /Consulta de tarifas CFE/i })).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: /Idioma/i }))
    await user.click(screen.getByRole('option', { name: /English/i }))
    expect(await screen.findByRole('heading', { name: /CFE tariff reference/i })).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: /Data status/i })).toBeInTheDocument()
    expect(screen.getByText(/Last data check/i)).toBeInTheDocument()
    expect(screen.getByText(/17 August 2026/i)).toBeInTheDocument()
    expect(screen.getByText(/Available data range/i)).toBeInTheDocument()
    expect(screen.getByText(/1 January 2026 – 31 December 2026/i)).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: /^Menu$/i }))
    expect(screen.getByRole('menuitem', { name: /Tariff reference/i })).toHaveAttribute(
      'aria-current',
      'page',
    )
  })

  it('disables summer pricing for tariffs without seasonal differences', async () => {
    const user = userEvent.setup()
    window.location.hash = '#/tariffs'
    render(<App initialLanguage="es" />)

    await user.selectOptions(screen.getByLabelText(/Tarifa doméstica normal/i), '1')

    expect(screen.getByRole('tab', { name: /^Verano$/i })).toBeDisabled()
    expect(screen.getByRole('tab', { name: /^Estándar$/i })).toBeDisabled()
    expect(screen.getByRole('tab', { name: /^Estándar$/i })).toHaveAttribute(
      'aria-selected',
      'true',
    )
    expect(screen.getByRole('heading', { name: /Precios estándar/i })).toBeInTheDocument()
    expect(screen.getByText(/Tarifa 1 no cuenta con una tarifa de verano/i)).toBeInTheDocument()
  })

  it('lets users select the year and cycle months from the tariff breakdown heading', async () => {
    const user = userEvent.setup()
    window.location.hash = '#/tariffs'
    render(<App initialLanguage="es" />)

    expect(await screen.findByRole('heading', { name: /Consulta de tarifas CFE/i })).toBeInTheDocument()

    const headingMonth = screen.getByLabelText(/Mes del desglose/i)
    const headingYear = screen.getByLabelText(/Año de las tarifas/i)
    expect(headingMonth).toHaveValue('8')
    expect(headingYear).toHaveValue('2026')
    expect(headingYear).toHaveAccessibleDescription(
      /Cuando CFE publique datos del año siguiente/i,
    )

    await user.selectOptions(headingMonth, '3')
    expect(headingMonth).toHaveValue('3')

    await user.click(screen.getByRole('button', { name: /Mes siguiente/i }))
    expect(headingMonth).toHaveValue('4')

    await user.click(screen.getByRole('button', { name: /Mes anterior/i }))
    expect(headingMonth).toHaveValue('3')

    await user.click(screen.getByRole('button', { name: /Mes anterior/i }))
    expect(headingMonth).toHaveValue('2')
  })

  it('shows the tariff reference on mobile via hash navigation', async () => {
    const user = userEvent.setup()
    stubMobileMatchMedia(true)
    window.location.hash = '#/tariffs'
    render(<App initialLanguage="es" />)

    expect(await screen.findByRole('heading', { name: /Consulta de tarifas CFE/i })).toBeInTheDocument()
    expect(document.querySelector('.m-app--tariffs')).toBeTruthy()
    expect(screen.getByRole('heading', { name: /Estado de los datos/i })).toBeInTheDocument()
    expect(screen.getByText(/17 de agosto de 2026/i)).toBeInTheDocument()
    expect(screen.getByText(/1 de enero de 2026 – 31 de diciembre de 2026/i)).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: /^Menú$/i }))
    expect(screen.getByRole('menuitem', { name: /Calculadora/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /Volver a la calculadora/i })).toBeInTheDocument()
  })

  it('renders a full English estimate when language is English', async () => {
    const user = userEvent.setup()
    render(<App initialLanguage="en" />)

    expect(screen.getByRole('heading', { name: /CFE bill calculator/i })).toBeInTheDocument()
    await user.selectOptions(
      screen.getByLabelText(/Month when summer begins in your locality/i),
      '5',
    )
    await user.clear(screen.getByLabelText(/Previous reading \(meter kWh at prior cutoff\)/i))
    await user.type(screen.getByLabelText(/Previous reading \(meter kWh at prior cutoff\)/i), '1000')
    await user.clear(screen.getByLabelText(/Current reading \(meter kWh today\)/i))
    await user.type(screen.getByLabelText(/Current reading \(meter kWh today\)/i), '1200')
    await user.clear(screen.getByLabelText(/Cutoff date from the previous bill/i))
    await user.type(screen.getByLabelText(/Cutoff date from the previous bill/i), '2026-06-30')
    await user.clear(screen.getByLabelText(/Current reading date/i))
    await user.type(screen.getByLabelText(/Current reading date/i), '2026-07-16')

    expect(screen.getByText(/We estimate the next cutoff on 29 August 2026/i)).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: /Calculate estimate/i }))

    expect(await screen.findByRole('heading', { name: /Bill estimate/i })).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: /Subsidised usage detail/i })).toBeInTheDocument()
    expect(screen.getByRole('tab', { name: /^Daily$/i })).toHaveAttribute('aria-selected', 'true')
    expect(screen.getByRole('tab', { name: /^Monthly$/i })).toBeInTheDocument()
    expect(screen.getByRole('tab', { name: /^Bimonthly$/i })).toBeInTheDocument()
    expect(
      screen.getByText(/exceeds Intermediate by 5 kWh\/day: that portion is billed as Excess/i),
    ).toBeInTheDocument()

    await user.click(screen.getByRole('tab', { name: /^Monthly$/i }))
    expect(
      screen.getByText(/exceeds Intermediate by 150 kWh\/month: that portion is billed as Excess/i),
    ).toBeInTheDocument()
  })

  it('hides the share-link control until expert mode is enabled', async () => {
    const user = userEvent.setup()
    render(<App initialLanguage="es" />)

    expect(screen.queryByRole('button', { name: /Copiar enlace con mis datos/i })).not.toBeInTheDocument()
    await user.click(screen.getByRole('switch', { name: /Modo experto/i }))
    expect(screen.getByRole('button', { name: /Copiar enlace con mis datos/i })).toBeInTheDocument()
  })

  it('copies a share link with url-encoded form values from expert mode', async () => {
    const user = userEvent.setup()
    const writeText = vi.fn().mockResolvedValue(undefined)
    vi.stubGlobal('navigator', {
      ...navigator,
      language: 'es-MX',
      languages: ['es-MX'],
      clipboard: { writeText },
    })

    render(<App initialLanguage="es" />)

    await user.selectOptions(screen.getByLabelText(/Tarifa impresa en tu recibo/i), '1C')
    await user.selectOptions(
      screen.getByLabelText(/Mes en que comienza el verano en tu localidad/i),
      '5',
    )
    await user.selectOptions(screen.getByLabelText(/Ciclo de facturación/i), 'bimestral')
    await user.clear(screen.getByLabelText(/Lectura anterior \(kWh del medidor al corte previo\)/i))
    await user.type(
      screen.getByLabelText(/Lectura anterior \(kWh del medidor al corte previo\)/i),
      '1000',
    )
    await user.clear(screen.getByLabelText(/Lectura actual \(kWh del medidor hoy\)/i))
    await user.type(screen.getByLabelText(/Lectura actual \(kWh del medidor hoy\)/i), '1250')
    await user.clear(screen.getByLabelText(/Fecha de corte del recibo anterior/i))
    await user.type(screen.getByLabelText(/Fecha de corte del recibo anterior/i), '2026-06-01')
    await user.clear(screen.getByLabelText(/Fecha de la lectura actual/i))
    await user.type(screen.getByLabelText(/Fecha de la lectura actual/i), '2026-07-10')

    await user.click(screen.getByRole('switch', { name: /Modo experto/i }))
    const otherCharges = document.querySelector<HTMLInputElement>(
      '[data-field="optionalOtherCharges"]',
    )
    expect(otherCharges).not.toBeNull()
    await user.click(otherCharges!)
    await user.keyboard('{Control>}a{/Control}12.5')
    const newestHistory = screen.getByLabelText(/Consumo más reciente \(kWh\)/i)
    const historyUsage2 = screen.getByLabelText(/Uso historial 2 \(kWh\)/i)
    await user.type(newestHistory, '210')
    await user.type(historyUsage2, '180')

    await user.click(screen.getByRole('button', { name: /Copiar enlace con mis datos/i }))

    expect(writeText).toHaveBeenCalledTimes(1)
    const copied = String(writeText.mock.calls[0]?.[0])
    expect(copied).toContain('#/?')
    expect(copied).toContain('v=1')
    expect(copied).toContain('tariff=1C')
    expect(copied).toContain('summer=5')
    expect(copied).toContain('prev=1000')
    expect(copied).toContain('curr=1250')
    expect(copied).toContain('prevDate=2026-06-01')
    expect(copied).toContain('currDate=2026-07-10')
    expect(copied).toContain('other=12.5')
    expect(copied).toContain('hist=210%2C%2C180')
    expect(await screen.findByRole('status')).toHaveTextContent(/Enlace copiado al portapapeles/i)
  })

  it('restores all shared calculator inputs from the hash and opens expert mode', () => {
    window.localStorage.setItem(
      'cfe-calculator.preferences.v1',
      JSON.stringify({
        tariffCode: '1A',
        summerStartMonth: 2,
        billingCycle: 'mensual',
        previousReading: 1,
        previousCutoffDate: '2020-01-01',
      }),
    )
    window.location.hash = hashForCalculatorInput({
      tariffCode: 'DAC',
      summerStartMonth: 4,
      billingCycle: 'bimestral',
      previousReading: 2000,
      currentReading: 2400,
      previousCutoffDate: '2026-05-15',
      currentReadingDate: '2026-06-20',
      nextCutoffDate: '2026-07-14',
      optionalOtherCharges: 33,
      dacRegionId: 'baja-california',
      historicalPeriodKwh: [400, null, 350, 300, null, 280],
    })

    render(<App initialLanguage="es" />)

    expect(screen.getByLabelText(/Tarifa impresa en tu recibo/i)).toHaveValue('DAC')
    expect(screen.getByLabelText(/Mes en que comienza el verano en tu localidad/i)).toHaveValue('4')
    expect(screen.getByLabelText(/Ciclo de facturación/i)).toHaveValue('bimestral')
    expect(screen.getByLabelText(/Región DAC/i)).toHaveValue('baja-california')
    expect(screen.getByLabelText(/Lectura anterior \(kWh del medidor al corte previo\)/i)).toHaveValue(
      2000,
    )
    expect(screen.getByLabelText(/Lectura actual \(kWh del medidor hoy\)/i)).toHaveValue(2400)
    expect(screen.getByLabelText(/Fecha de corte del recibo anterior/i)).toHaveValue('2026-05-15')
    expect(screen.getByLabelText(/Fecha de la lectura actual/i)).toHaveValue('2026-06-20')
    expect(screen.getByRole('switch', { name: /Modo experto/i })).toHaveAttribute(
      'aria-checked',
      'true',
    )
    expect(document.querySelector('[data-field="optionalOtherCharges"]')).toHaveValue(33)
    expect(screen.getByLabelText(/Consumo más reciente \(kWh\)/i)).toHaveValue(400)
    expect(screen.getByLabelText(/Uso historial 1 \(kWh\)/i)).toHaveValue(null)
    expect(screen.getByLabelText(/Uso historial 2 \(kWh\)/i)).toHaveValue(350)
    expect(screen.getByLabelText(/Uso historial 3 \(kWh\)/i)).toHaveValue(300)
    expect(screen.getByLabelText(/Uso historial 5 \(kWh\)/i)).toHaveValue(280)
    expect(screen.getByRole('button', { name: /Copiar enlace con mis datos/i })).toBeInTheDocument()
  })

  it('ignores malformed share hashes and keeps saved preferences', () => {
    window.localStorage.setItem(
      'cfe-calculator.preferences.v1',
      JSON.stringify({
        tariffCode: '1C',
        summerStartMonth: 3,
        billingCycle: 'mensual',
      }),
    )
    window.location.hash = '#/?v=1&tariff=nope&cycle=bimestral'

    render(<App initialLanguage="es" />)

    expect(screen.getByLabelText(/Tarifa impresa en tu recibo/i)).toHaveValue('1C')
    expect(screen.getByLabelText(/Ciclo de facturación/i)).toHaveValue('mensual')
    expect(screen.getByRole('switch', { name: /Modo experto/i })).toHaveAttribute(
      'aria-checked',
      'false',
    )
  })

  it('keeps tariff reference hash routing working alongside calculator share links', async () => {
    const user = userEvent.setup()
    window.location.hash = hashForCalculatorInput({
      tariffCode: '1B',
      summerStartMonth: 4,
      billingCycle: 'bimestral',
      previousReading: 500,
      currentReading: 600,
      previousCutoffDate: '2026-06-01',
      currentReadingDate: '2026-07-01',
      nextCutoffDate: '2026-07-31',
      optionalOtherCharges: 0,
      dacRegionId: 'central',
      historicalPeriodKwh: [null, null, null, null, null, null],
    })

    render(<App initialLanguage="es" />)
    expect(screen.getByLabelText(/Lectura anterior \(kWh del medidor al corte previo\)/i)).toHaveValue(
      500,
    )

    await user.click(screen.getByRole('button', { name: /^Menú$/i }))
    await user.click(screen.getByRole('menuitem', { name: /Consulta de tarifas/i }))
    expect(window.location.hash).toBe('#/tariffs')
    expect(await screen.findByRole('heading', { name: /Consulta de tarifas CFE/i })).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: /Volver a la calculadora/i }))
    expect(window.location.hash).toBe('#/')
    expect(within(document.body).getByRole('heading', { name: /Calculadora de recibo CFE/i })).toBeInTheDocument()
  })
})
