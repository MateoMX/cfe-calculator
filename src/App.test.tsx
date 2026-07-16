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

    await user.selectOptions(screen.getByLabelText(/^Estado$/i), 'YUC')
    await user.selectOptions(screen.getByLabelText(/^Municipio$/i), 'Mérida')
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
  })

  it('restores the saved location, tariff, and billing cycle', async () => {
    const user = userEvent.setup()
    const firstRender = render(<App />)

    await user.selectOptions(screen.getByLabelText(/^Estado$/i), 'YUC')
    await user.selectOptions(screen.getByLabelText(/^Municipio$/i), 'Mérida')
    await user.selectOptions(screen.getByLabelText(/Tarifa impresa en tu recibo/i), '1C')
    await user.selectOptions(screen.getByLabelText(/Ciclo de facturación/i), 'mensual')

    firstRender.unmount()
    render(<App />)

    expect(screen.getByLabelText(/^Estado$/i)).toHaveValue('YUC')
    expect(screen.getByLabelText(/^Municipio$/i)).toHaveValue('Mérida')
    expect(screen.getByLabelText(/Tarifa impresa en tu recibo/i)).toHaveValue('1C')
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
})
