import type { DailyAllowanceComparison, DailyAllowanceProfile } from '../domain/types'

interface Props {
  comparison: DailyAllowanceComparison
}

interface ZoneSegment {
  key: string
  label: string
  usedKwh: number
  unusedKwh: number
  tone: string
  ratePerKwh: number | null
}

function kwh(value: number): string {
  return new Intl.NumberFormat('es-MX', { maximumFractionDigits: 2 }).format(value)
}

function money(value: number): string {
  return new Intl.NumberFormat('es-MX', {
    style: 'currency',
    currency: 'MXN',
    minimumFractionDigits: 3,
    maximumFractionDigits: 3,
  }).format(value)
}

function bandTone(index: number): string {
  const tones = ['band-basico', 'band-intermedio', 'band-intermedio-alto']
  return tones[Math.min(index, tones.length - 1)]!
}

function buildZoneSegments(
  profile: DailyAllowanceProfile,
  averageDailyKwh: number,
  dacLimitDailyKwh: number | null,
): ZoneSegment[] {
  let remaining = Math.max(0, averageDailyKwh)
  const segments: ZoneSegment[] = profile.bands.map((band, index) => {
    const usedKwh = Math.min(remaining, band.bandDailyKwh)
    remaining = Math.max(0, remaining - usedKwh)
    return {
      key: band.key,
      label: band.label,
      usedKwh,
      unusedKwh: Math.max(0, band.bandDailyKwh - usedKwh),
      tone: bandTone(index),
      ratePerKwh: band.ratePerKwh,
    }
  })

  const ceiling = profile.subsidizedCeilingDailyKwh
  // DAC is a classification threshold, not another marginal price band. Keep
  // all consumption above the subsidized ceiling in the Excedente segment and
  // reserve enough visual scale to place the separate DAC indicator.
  const scaleTarget = Math.max(
    ceiling,
    averageDailyKwh,
    dacLimitDailyKwh != null ? dacLimitDailyKwh * 1.12 : 0,
  )
  const excessCapacity = Math.max(0, scaleTarget - ceiling)
  if (excessCapacity > 0) {
    const usedExcess = Math.min(Math.max(0, averageDailyKwh - ceiling), excessCapacity)
    segments.push({
      key: 'excedente',
      label: 'Excedente',
      usedKwh: usedExcess,
      unusedKwh: Math.max(0, excessCapacity - usedExcess),
      tone: 'band-excedente',
      ratePerKwh: profile.excedenteRatePerKwh,
    })
  }

  return segments
}

function ProfileChart({
  profile,
  averageDailyKwh,
  dacLimitDailyKwh,
  dacLimitKwhMonth,
  currentPaceAboveDacLimit,
}: {
  profile: DailyAllowanceProfile
  averageDailyKwh: number
  dacLimitDailyKwh: number | null
  dacLimitKwhMonth: number | null
  currentPaceAboveDacLimit: boolean | null
}) {
  const segments = buildZoneSegments(profile, averageDailyKwh, dacLimitDailyKwh)
  const scale = segments.reduce((sum, segment) => sum + segment.usedKwh + segment.unusedKwh, 0)
  const markerPct = scale > 0 ? Math.min(100, (averageDailyKwh / scale) * 100) : 0
  const dacMarkerPct =
    dacLimitDailyKwh != null && scale > 0
      ? Math.min(100, (dacLimitDailyKwh / scale) * 100)
      : null
  const excessDaily =
    averageDailyKwh > profile.subsidizedCeilingDailyKwh
      ? averageDailyKwh - profile.subsidizedCeilingDailyKwh
      : 0

  const ariaZones = segments
    .map((segment) => {
      const total = segment.usedKwh + segment.unusedKwh
      const unused =
        segment.unusedKwh > 0 ? `, ${kwh(segment.unusedKwh)} sin usar de ${kwh(total)}` : ''
      const rate =
        segment.ratePerKwh != null ? `${money(segment.ratePerKwh)} por kWh, ` : ''
      return `${segment.label} ${rate}${kwh(segment.usedKwh)} usados${unused}`
    })
    .join('; ')

  const ariaDac =
    dacLimitDailyKwh != null && dacLimitKwhMonth != null
      ? ` Umbral DAC equivalente a ${kwh(dacLimitDailyKwh)} kWh/día (${dacLimitKwhMonth} kWh/mes).${
          currentPaceAboveDacLimit
            ? ' Tu ritmo actual supera ese umbral; esto no significa reclasificación automática.'
            : ' Tu ritmo actual está bajo ese umbral diario de referencia.'
        }`
      : ''

  return (
    <div className="allowance-profile">
      <h4>{profile.seasonLabel}</h4>

      <div
        className="allowance-chart"
        role="img"
        aria-label={`Promedio diario ${kwh(averageDailyKwh)} kWh por día. Zonas: ${ariaZones}.${ariaDac}`}
      >
        <div className="allowance-hbar-track">
          <div className="allowance-hbar-zones">
            {segments.map((segment) => {
              const total = segment.usedKwh + segment.unusedKwh
              if (total <= 0 || scale <= 0) return null
              const widthPct = (total / scale) * 100
              const usedPct = total > 0 ? (segment.usedKwh / total) * 100 : 0
              const unusedPct = 100 - usedPct

              return (
                <div
                  key={segment.key}
                  className={`allowance-hbar-zone ${segment.tone}`}
                  style={{ width: `${widthPct}%` }}
                  title={
                    segment.unusedKwh > 0
                      ? `${segment.label}${
                          segment.ratePerKwh != null ? `: ${money(segment.ratePerKwh)}/kWh` : ''
                        } · ${kwh(segment.usedKwh)} usados de ${kwh(total)} kWh/día`
                      : `${segment.label}${
                          segment.ratePerKwh != null ? `: ${money(segment.ratePerKwh)}/kWh` : ''
                        } · ${kwh(segment.usedKwh)} kWh/día`
                  }
                >
                  {segment.usedKwh > 0 && (
                    <span
                      className="allowance-hbar-used"
                      style={{ width: `${usedPct}%` }}
                    />
                  )}
                  {segment.unusedKwh > 0 && (
                    <span
                      className="allowance-hbar-unused"
                      style={{ width: `${unusedPct}%` }}
                    />
                  )}
                </div>
              )
            })}
          </div>

          {dacMarkerPct != null && (
            <div
              className="allowance-dac-marker"
              style={{ left: `${dacMarkerPct}%` }}
              title={`Umbral DAC: ${kwh(dacLimitDailyKwh!)} kWh/día`}
              aria-hidden="true"
            >
              <span className="allowance-dac-marker-line" />
              <span
                className={`allowance-dac-marker-text ${
                  currentPaceAboveDacLimit ? '' : 'allowance-dac-marker-text--unused'
                }`}
              >
                DAC
              </span>
            </div>
          )}

          <div
            className={`allowance-vmarker ${markerPct >= 55 ? 'allowance-vmarker--end' : 'allowance-vmarker--start'}${
              currentPaceAboveDacLimit ? ' allowance-vmarker--alert' : ''
            }`}
            style={{ left: `${markerPct}%` }}
            aria-hidden="true"
          >
            <span className="allowance-vmarker-line" />
            <span className="allowance-vmarker-label">
              <span>Tu promedio diario</span>
              <strong>{kwh(averageDailyKwh)} kWh/día</strong>
            </span>
          </div>
        </div>

        <div className="allowance-axis">
          {segments.map((segment) => {
              const total = segment.usedKwh + segment.unusedKwh
              return (
                <div
                  key={segment.key}
                  className="allowance-axis-item"
                  style={{ flex: `${total} 1 0` }}
                >
                  <span className="allowance-bar-label">{segment.label}</span>
                  {segment.ratePerKwh != null && (
                    <span className="allowance-bar-rate">{money(segment.ratePerKwh)}/kWh</span>
                  )}
                  <span className="allowance-bar-value">
                    {segment.unusedKwh > 0
                      ? `${kwh(segment.usedKwh)} / ${kwh(total)}`
                      : kwh(segment.usedKwh)}
                    <small>kWh/día</small>
                  </span>
                </div>
              )
            })}
        </div>
      </div>

      <ul className="allowance-legend">
        {profile.bands.map((band) => {
          const segment = segments.find((item) => item.key === band.key)
          const unused = segment?.unusedKwh ?? 0
          return (
            <li key={band.key}>
              <strong>{band.label}:</strong> {money(band.ratePerKwh)}/kWh · cupo{' '}
              {kwh(band.bandDailyKwh)} kWh/día (max cantidad {kwh(band.cumulativeDailyKwh)})
              {unused > 0
                ? ` — quedan ${kwh(unused)} sin usar`
                : segment && segment.usedKwh >= band.bandDailyKwh
                  ? ' — cupo completo'
                  : ''}
            </li>
          )
        })}
        <li>
          <strong>Excedente:</strong> {money(profile.excedenteRatePerKwh)}/kWh
          {excessDaily > 0
            ? ` — ${kwh(excessDaily)} kWh/día a este precio`
            : ' — sin uso con tu promedio actual'}
        </li>
        {dacLimitDailyKwh != null && dacLimitKwhMonth != null && (
          <li>
            <strong>Umbral DAC (referencia diaria):</strong> {kwh(dacLimitDailyKwh)} kWh/día
            (equivalente a {dacLimitKwhMonth} kWh/mes). Superar este ritmo no reclasifica solo; CFE
            usa el promedio móvil de 12 meses.
            {currentPaceAboveDacLimit
              ? ' Tu promedio actual supera esta referencia.'
              : ' Tu promedio actual está bajo esta referencia.'}
          </li>
        )}
        <li>
          <strong>Tu promedio:</strong> {kwh(averageDailyKwh)} kWh/día
          {excessDaily > 0
            ? ` — ${kwh(excessDaily)} kWh/día en Excedente`
            : ` — dentro de los bloques con descuento (techo ${kwh(profile.subsidizedCeilingDailyKwh)} kWh/día)`}
        </li>
      </ul>
    </div>
  )
}

export function DailyAllowanceChart({ comparison }: Props) {
  if (!comparison.applicable) {
    return (
      <section className="allowance-panel">
        <h3>Cupo diario en bloques baratos</h3>
        <p className="allowance-guidance">{comparison.guidance}</p>
      </section>
    )
  }

  return (
    <section className="allowance-panel">
      <h3>Cupo diario en bloques baratos</h3>
      <p className="allowance-intro">
        CFE ofrece una cantidad de electricidad a tarifas preferentes (Básico e Intermedio). Al
        rebasar esos cupos, el consumo adicional se cobra como Excedente, a un precio más alto por
        kWh. Abajo estimamos esos cupos en kWh por día y los comparamos con tu consumo promedio
        actual ({comparison.billingDays} días del periodo). Las zonas baratas que aún no usas se
        muestran atenuadas. La marca de umbral DAC indica el ritmo diario equivalente al límite
        mensual de alto consumo de tu tarifa.
      </p>
      <p className="allowance-guidance">{comparison.guidance}</p>

      {comparison.currentPaceAboveDacLimit && comparison.dacLimitKwhMonth != null && (
        <div className="allowance-dac-alert" role="status">
          <strong>Ritmo actual por encima del umbral DAC de referencia</strong>
          <p>
            Si mantuvieras ~{kwh(comparison.averageDailyKwh)} kWh/día de forma sostenida, tu ritmo
            mensual (~{kwh(comparison.averageDailyKwh * 30)} kWh/mes) sería superior al límite de{' '}
            {comparison.dacLimitKwhMonth} kWh/mes. Esto no significa que ya estés en DAC: la
            reclasificación depende del promedio móvil de 12 meses. Revisa el panel de riesgo DAC
            más abajo.
          </p>
        </div>
      )}

      <div className={`allowance-profiles ${comparison.profiles.length > 1 ? 'allowance-profiles--split' : ''}`}>
        {comparison.profiles.map((profile) => (
          <ProfileChart
            key={`${profile.season}-${profile.seasonLabel}`}
            profile={profile}
            averageDailyKwh={comparison.averageDailyKwh}
            dacLimitDailyKwh={comparison.dacLimitDailyKwh}
            dacLimitKwhMonth={comparison.dacLimitKwhMonth}
            currentPaceAboveDacLimit={comparison.currentPaceAboveDacLimit}
          />
        ))}
      </div>
    </section>
  )
}
