import { DAC_REGIONS, TARIFF_OPTIONS } from '../data/tariffs-2026'
import { getState, STATES } from '../data/locations'
import {
  daysAgoLabel,
  defaultNextCutoff,
  formatDisplayDate,
  SUMMER_START_OPTIONS,
  todayISO,
} from '../domain/dates'
import type { BillingCycle, CalculatorInput, DomesticTariffCode, SummerStartMonth, ValidationIssue } from '../domain/types'

interface Props {
  value: CalculatorInput
  issues: ValidationIssue[]
  onChange: (next: CalculatorInput) => void
  onSubmit: () => void
}

function fieldError(issues: ValidationIssue[], field: keyof CalculatorInput): string | undefined {
  return issues.find((issue) => issue.field === field)?.message
}

export function CalculatorForm({ value, issues, onChange, onSubmit }: Props) {
  const state = getState(value.stateCode)
  const needsSummer = value.tariffCode !== '1'
  const showDacRegion = value.tariffCode === 'DAC' || value.alreadyOnDac
  const cycleDays = value.billingCycle === 'mensual' ? 30 : 60
  const cycleLabel = value.billingCycle === 'mensual' ? 'mensual' : 'bimestral'
  const previousCutoffAgo = daysAgoLabel(value.previousCutoffDate)
  const currentReadingIsToday = value.currentReadingDate === todayISO()

  function patch(partial: Partial<CalculatorInput>) {
    onChange({ ...value, ...partial })
  }

  return (
    <form
      className="card form"
      onSubmit={(event) => {
        event.preventDefault()
        onSubmit()
      }}
    >
      <header className="card-header">
        <h2>Datos de tu servicio</h2>
        <p>
          Confirma la tarifa y el mes de inicio de verano con tu recibo CFE. La ubicación solo orienta
          avisos regionales.
        </p>
      </header>

      <fieldset>
        <legend>Ubicación</legend>
        <label>
          Estado
          <select
            value={value.stateCode}
            onChange={(event) =>
              patch({ stateCode: event.target.value, municipality: '' })
            }
          >
            <option value="">Selecciona…</option>
            {STATES.map((item) => (
              <option key={item.code} value={item.code}>
                {item.name}
              </option>
            ))}
          </select>
          {fieldError(issues, 'stateCode') && (
            <span className="error">{fieldError(issues, 'stateCode')}</span>
          )}
        </label>

        <label>
          Municipio
          <select
            value={value.municipality}
            disabled={!state}
            onChange={(event) => patch({ municipality: event.target.value })}
          >
            <option value="">Selecciona…</option>
            {state?.municipalities.map((name) => (
              <option key={name} value={name}>
                {name}
              </option>
            ))}
          </select>
          {fieldError(issues, 'municipality') && (
            <span className="error">{fieldError(issues, 'municipality')}</span>
          )}
        </label>
      </fieldset>

      <fieldset>
        <legend>Tarifa y ciclo</legend>
        <label>
          Tarifa impresa en tu recibo
          <select
            value={value.tariffCode}
            onChange={(event) => {
              const tariffCode = event.target.value as DomesticTariffCode
              patch({
                tariffCode,
                summerStartMonth:
                  tariffCode === '1' ? null : value.summerStartMonth ?? 5,
              })
            }}
          >
            {TARIFF_OPTIONS.map((option) => (
              <option key={option.code} value={option.code}>
                {option.label}
              </option>
            ))}
          </select>
        </label>

        {needsSummer && (
          <label>
            Mes en que comienza el verano en tu localidad
            <select
              value={value.summerStartMonth ?? ''}
              onChange={(event) =>
                patch({
                  summerStartMonth: Number(event.target.value) as SummerStartMonth,
                })
              }
            >
              <option value="">Selecciona…</option>
              {SUMMER_START_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
            <small>El verano dura seis meses consecutivos desde ese mes.</small>
            {fieldError(issues, 'summerStartMonth') && (
              <span className="error">{fieldError(issues, 'summerStartMonth')}</span>
            )}
          </label>
        )}

        <label>
          Ciclo de facturación
          <select
            value={value.billingCycle}
            onChange={(event) => {
              const billingCycle = event.target.value as BillingCycle
              const nextCutoffDate =
                value.previousCutoffDate
                  ? defaultNextCutoff(value.previousCutoffDate, billingCycle)
                  : value.nextCutoffDate
              patch({ billingCycle, nextCutoffDate })
            }}
          >
            <option value="bimestral">Bimestral (aprox. 60 días)</option>
            <option value="mensual">Mensual (aprox. 30 días)</option>
          </select>
        </label>

        <label className="checkbox">
          <input
            type="checkbox"
            checked={value.alreadyOnDac}
            onChange={(event) => patch({ alreadyOnDac: event.target.checked })}
          />
          Mi recibo ya indica tarifa DAC
        </label>

        {showDacRegion && (
          <label>
            Región DAC
            <select
              value={value.dacRegionId}
              onChange={(event) => patch({ dacRegionId: event.target.value })}
            >
              {DAC_REGIONS.map((region) => (
                <option key={region.regionId} value={region.regionId}>
                  {region.regionName}
                </option>
              ))}
            </select>
          </label>
        )}
      </fieldset>

      <fieldset>
        <legend>Lecturas y fechas</legend>
        <label>
          Lectura anterior (kWh del medidor al corte previo)
          <input
            type="number"
            min={0}
            step={1}
            value={value.previousReading || ''}
            onChange={(event) => patch({ previousReading: Number(event.target.value) })}
          />
          {fieldError(issues, 'previousReading') && (
            <span className="error">{fieldError(issues, 'previousReading')}</span>
          )}
        </label>

        <label>
          Fecha de corte del recibo anterior
          <span
            className={
              previousCutoffAgo
                ? previousCutoffAgo === 'hoy'
                  ? 'date-field date-field--with-badge'
                  : 'date-field date-field--with-badge-wide'
                : 'date-field'
            }
          >
            <input
              type="date"
              value={value.previousCutoffDate}
              onChange={(event) => {
                const previousCutoffDate = event.target.value
                patch({
                  previousCutoffDate,
                  nextCutoffDate: previousCutoffDate
                    ? defaultNextCutoff(previousCutoffDate, value.billingCycle)
                    : value.nextCutoffDate,
                })
              }}
            />
            {previousCutoffAgo && (
              <span className="date-field-badge" aria-hidden="true">
                {previousCutoffAgo}
              </span>
            )}
          </span>
          {fieldError(issues, 'previousCutoffDate') && (
            <span className="error">{fieldError(issues, 'previousCutoffDate')}</span>
          )}
        </label>

        <label>
          Lectura actual (kWh del medidor hoy)
          <input
            type="number"
            min={0}
            step={1}
            value={value.currentReading || ''}
            onChange={(event) => patch({ currentReading: Number(event.target.value) })}
          />
          {fieldError(issues, 'currentReading') && (
            <span className="error">{fieldError(issues, 'currentReading')}</span>
          )}
        </label>

        <label>
          Fecha de la lectura actual
          <span
            className={
              currentReadingIsToday ? 'date-field date-field--with-badge' : 'date-field'
            }
          >
            <input
              type="date"
              value={value.currentReadingDate}
              onChange={(event) => patch({ currentReadingDate: event.target.value })}
            />
            {currentReadingIsToday && (
              <span className="date-field-badge" aria-hidden="true">
                hoy
              </span>
            )}
          </span>
          {fieldError(issues, 'currentReadingDate') && (
            <span className="error">{fieldError(issues, 'currentReadingDate')}</span>
          )}
        </label>

        <div className="cutoff-estimate" aria-live="polite">
          {value.previousCutoffDate ? (
            <>
              <strong>
                Estimamos el próximo corte para el {formatDisplayDate(value.nextCutoffDate)}.
              </strong>
              <small>
                Tomamos tu corte anterior del {formatDisplayDate(value.previousCutoffDate)} y sumamos
                aproximadamente {cycleDays} días por el ciclo {cycleLabel} que seleccionaste.
              </small>
            </>
          ) : (
            <small>
              Cuando indiques la fecha del corte anterior, estimaremos el próximo corte sumando
              aproximadamente {cycleDays} días por tu ciclo {cycleLabel}.
            </small>
          )}
        </div>
      </fieldset>

      <details className="optional-section">
        <summary>Opcional</summary>
        <div className="optional-section-body">
          <label>
            Otros cargos conocidos del recibo (DAP, etc.), sin IVA
            <input
              type="number"
              min={0}
              step={0.01}
              value={value.optionalOtherCharges || ''}
              onChange={(event) =>
                patch({ optionalOtherCharges: Number(event.target.value) || 0 })
              }
            />
          </label>

          <label>
            Historial mensual opcional para riesgo DAC (kWh separados por coma)
            <input
              type="text"
              placeholder="ej. 180, 210, 195, 240"
              value={value.historicalMonthlyKwh.join(', ')}
              onChange={(event) => {
                const historicalMonthlyKwh = event.target.value
                  .split(/[,\s]+/)
                  .map((part) => part.trim())
                  .filter(Boolean)
                  .map(Number)
                  .filter((n) => Number.isFinite(n))
                patch({ historicalMonthlyKwh })
              }}
            />
          </label>
        </div>
      </details>

      {issues.some((issue) => issue.field === 'general') && (
        <p className="error">{issues.find((issue) => issue.field === 'general')?.message}</p>
      )}

      <button type="submit" className="primary">
        Calcular estimación
      </button>
    </form>
  )
}
