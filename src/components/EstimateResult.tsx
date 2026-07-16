import { forwardRef } from 'react'
import { TARIFF_SNAPSHOT_META } from '../data/tariffs-2026'
import { formatDisplayDate } from '../domain/dates'
import type { FullEstimate } from '../domain/types'
import { DailyAllowanceChart } from './DailyAllowanceChart'

interface Props {
  estimate: FullEstimate
}

function money(value: number): string {
  return new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' }).format(value)
}

function kwh(value: number): string {
  return new Intl.NumberFormat('es-MX', { maximumFractionDigits: 2 }).format(value)
}

export const EstimateResult = forwardRef<HTMLElement, Props>(function EstimateResult(
  { estimate },
  ref,
) {
  const { bill, projection, narrative, dacRisk, regionalNotes } = estimate

  return (
    <section ref={ref} className="card result" aria-live="polite">
      <header className="card-header">
        <h2>Estimación del recibo</h2>
        <p>
          Última actualización: {formatDisplayDate(estimate.dataAsOf)}. Las tarifas son correctas a
          esta fecha. Esto es una estimación; el aviso-recibo de CFE es la fuente oficial.
        </p>
      </header>

      <div className="narrative">
        {narrative.split('\n\n').map((paragraph) => (
          <p key={paragraph.slice(0, 40)}>{paragraph}</p>
        ))}
      </div>

      <div className="stats">
        <div>
          <span>Consumo observado</span>
          <strong>
            {kwh(projection.observed.consumedKwh)} kWh / {projection.observed.elapsedDays} días
          </strong>
        </div>
        <div>
          <span>Promedio diario</span>
          <strong>{kwh(projection.observed.averageDailyKwh)} kWh/día</strong>
        </div>
        <div>
          <span>Días del periodo</span>
          <strong>{projection.billingDays}</strong>
        </div>
        <div>
          <span>Consumo proyectado</span>
          <strong>{kwh(bill.billedKwh)} kWh</strong>
        </div>
      </div>

      <DailyAllowanceChart comparison={estimate.dailyAllowance} />

      <h3>{bill.seasonLabel}</h3>
      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th>Concepto</th>
              <th>kWh</th>
              <th>$/kWh</th>
              <th>Importe</th>
            </tr>
          </thead>
          <tbody>
            {bill.lines.map((line) => (
              <tr key={`${line.label}-${line.rate}-${line.kwh}`}>
                <td>{line.label}</td>
                <td>{line.kwh > 0 ? kwh(line.kwh) : '—'}</td>
                <td>{money(line.rate)}</td>
                <td>{money(line.amount)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <dl className="totals">
        <div>
          <dt>Subtotal energía</dt>
          <dd>{money(bill.energySubtotal)}</dd>
        </div>
        {bill.otherCharges > 0 && (
          <div>
            <dt>Otros cargos</dt>
            <dd>{money(bill.otherCharges)}</dd>
          </div>
        )}
        <div>
          <dt>IVA (16%)</dt>
          <dd>{money(bill.iva)}</dd>
        </div>
        <div className="grand">
          <dt>Total estimado</dt>
          <dd>{money(bill.total)}</dd>
        </div>
      </dl>

      {bill.minimumApplied && (
        <p className="notice">Se aplicó el consumo mínimo oficial del periodo.</p>
      )}

      <h3>Supuestos</h3>
      <ul>
        {bill.assumptions.map((item) => (
          <li key={item}>{item}</li>
        ))}
      </ul>

      {(bill.warnings.length > 0 || regionalNotes.length > 0) && (
        <>
          <h3>Avisos</h3>
          <ul className="warnings">
            {bill.warnings.map((item) => (
              <li key={item}>{item}</li>
            ))}
            {regionalNotes.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        </>
      )}

      <h3>Riesgo DAC</h3>
      <p>{dacRisk.message}</p>

      <footer className="sources">
        <h3>Fuentes</h3>
        <ul>
          <li>
            <a href={TARIFF_SNAPSHOT_META.sourceUrl} target="_blank" rel="noreferrer">
              {TARIFF_SNAPSHOT_META.sourceName}
            </a>
          </li>
          <li>
            <a href={TARIFF_SNAPSHOT_META.agreementsUrl} target="_blank" rel="noreferrer">
              Acuerdos y oficios SHCP en CFE
            </a>
          </li>
          <li>
            <a
              href="http://www.diputados.gob.mx/LeyesBiblio/regla/n365.pdf"
              target="_blank"
              rel="noreferrer"
            >
              Manual de disposiciones de facturación (DOF)
            </a>
          </li>
        </ul>
      </footer>
    </section>
  )
})
