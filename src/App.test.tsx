import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import App from './App'
import { daysAgoLabel, todayISO } from './domain/dates'

describe('App', () => {
  beforeEach(() => {
    window.localStorage.clear()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('renders the Spanish calculator and produces an estimate', async () => {
    const user = userEvent.setup()
    render(<App />)

    expect(screen.getByRole('heading', { name: /Calculadora de recibo CFE/i })).toBeInTheDocument()

    await user.selectOptions(screen.getByLabelText(/Tarifa impresa en tu recibo/i), '1B')
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

    expect(screen.getByRole('heading', { name: /Cupo diario en bloques baratos/i })).toBeInTheDocument()
    expect(screen.getByText('Tu promedio diario').parentElement).toHaveTextContent(
      /Tu promedio diario12\.5 kWh\/día/i,
    )
    expect(
      screen.getByText(/supera Intermedio por 5 kWh\/día: esa parte se cobra como Excedente/i),
    ).toBeInTheDocument()
    expect(screen.getByText(/max cantidad 7\.5/i)).toBeInTheDocument()
    expect(screen.getByText(/5 kWh\/día en Excedente/i)).toBeInTheDocument()
    expect(screen.getAllByText(/\$1\.010\/kWh/i).length).toBeGreaterThan(0)
    expect(screen.getAllByText(/\$1\.171\/kWh/i).length).toBeGreaterThan(0)
    expect(screen.getAllByText(/\$4\.016\/kWh/i).length).toBeGreaterThan(0)
  })

  it('restores the saved tariff, summer start, and billing cycle', async () => {
    const user = userEvent.setup()
    const firstRender = render(<App />)

    await user.selectOptions(screen.getByLabelText(/Tarifa impresa en tu recibo/i), '1C')
    await user.selectOptions(
      screen.getByLabelText(/Mes en que comienza el verano en tu localidad/i),
      '3',
    )
    await user.selectOptions(screen.getByLabelText(/Ciclo de facturación/i), 'mensual')

    firstRender.unmount()
    render(<App />)

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

    render(<App />)

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

    render(<App />)

    expect(screen.getByLabelText(/Ciclo de facturación/i)).toHaveValue('mensual')
    expect(
      screen.getByLabelText(/Lectura anterior \(kWh del medidor al corte previo\)/i),
    ).not.toHaveValue(1000)
    expect(screen.getByLabelText(/Fecha de corte del recibo anterior/i)).toHaveValue('')
  })

  it('shows 6 bimonthly history slots and incomplete-history DAC messaging', async () => {
    const user = userEvent.setup()
    render(<App />)

    await user.click(screen.getByText('Opcional'))
    expect(screen.getByText(/Historial para riesgo DAC/i)).toBeInTheDocument()
    expect(screen.getByText(/últimos 6 recibos/i)).toBeInTheDocument()
    expect(screen.getByText(/cada uno cubre ~2 meses/i)).toBeInTheDocument()
    expect(screen.getAllByLabelText(/Consumo histórico \d+ de 6 \(kWh\)/i)).toHaveLength(6)

    await user.selectOptions(screen.getByLabelText(/Tarifa impresa en tu recibo/i), '1B')
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
    render(<App />)

    await user.selectOptions(screen.getByLabelText(/Ciclo de facturación/i), 'mensual')
    await user.click(screen.getByText('Opcional'))
    expect(screen.getByText(/últimos 12 recibos mensuales/i)).toBeInTheDocument()
    expect(screen.getAllByLabelText(/Consumo histórico \d+ de 12 \(kWh\)/i)).toHaveLength(12)

    await user.selectOptions(screen.getByLabelText(/Tarifa impresa en tu recibo/i), '1B')
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

    for (let index = 0; index < 12; index += 1) {
      const input = screen.getByLabelText(
        new RegExp(`^Consumo histórico ${index + 1} de 12 \\(kWh\\)$`, 'i'),
      )
      await user.clear(input)
      await user.type(input, '350')
    }

    await user.click(screen.getByRole('button', { name: /Calcular estimación/i }))

    expect(await screen.findByRole('heading', { name: /^Riesgo DAC$/i })).toBeInTheDocument()
    expect(screen.getByText(/Promedio 12 meses/i).parentElement).toHaveTextContent(/350/)
    expect(screen.getByText(/está bajo el límite de 400 kWh\/mes/i)).toBeInTheDocument()
  })

  it('opens bill examples with the matching highlight and closes them', async () => {
    const user = userEvent.setup()
    render(<App />)

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

    await user.click(screen.getByText('Opcional'))
    await user.click(
      screen.getByRole('button', {
        name: /Ver en el recibo dónde está el historial de consumo DAC/i,
      }),
    )
    expect(
      screen.getByRole('dialog', { name: /Dónde está el historial de consumo/i }),
    ).toBeInTheDocument()
    expect(screen.getByTestId('bill-example-highlight-dacHistory')).toBeInTheDocument()
    expect(
      screen.getByRole('img', { name: /Ejemplo de historial CFE con la columna de kWh resaltada/i }),
    ).toBeInTheDocument()
  })

  it('highlights when current pace is above the DAC daily reference', async () => {
    const user = userEvent.setup()
    render(<App />)

    await user.selectOptions(screen.getByLabelText(/Tarifa impresa en tu recibo/i), '1B')
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
})
