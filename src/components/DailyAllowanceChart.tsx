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
  ratePerKwh: number
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

  if (remaining > 0) {
    segments.push({
      key: 'excedente',
      label: 'Excedente',
      usedKwh: remaining,
      unusedKwh: 0,
      tone: 'band-excedente',
      ratePerKwh: profile.excedenteRatePerKwh,
    })
  }

  return segments
}

function ProfileChart({
  profile,
  averageDailyKwh,
}: {
  profile: DailyAllowanceProfile
  averageDailyKwh: number
}) {
  const segments = buildZoneSegments(profile, averageDailyKwh)
  const scale = segments.reduce((sum, segment) => sum + segment.usedKwh + segment.unusedKwh, 0)
  const markerPct = scale > 0 ? Math.min(100, (averageDailyKwh / scale) * 100) : 0
  const excessDaily =
    averageDailyKwh > profile.subsidizedCeilingDailyKwh
      ? averageDailyKwh - profile.subsidizedCeilingDailyKwh
      : 0

  return (
    <div className="allowance-profile">
      <h4>{profile.seasonLabel}</h4>

      <div
        className="allowance-chart"
        role="img"
        aria-label={`Promedio diario ${kwh(averageDailyKwh)} kWh por día. Zonas: ${segments
          .map((segment) => {
            const total = segment.usedKwh + segment.unusedKwh
            const unused =
              segment.unusedKwh > 0
                ? `, ${kwh(segment.unusedKwh)} sin usar de ${kwh(total)}`
                : ''
            return `${segment.label} ${money(segment.ratePerKwh)} por kWh, ${kwh(segment.usedKwh)} usados${unused}`
          })
          .join('; ')}.`}
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
                      ? `${segment.label}: ${money(segment.ratePerKwh)}/kWh · ${kwh(segment.usedKwh)} usados de ${kwh(total)} kWh/día`
                      : `${segment.label}: ${money(segment.ratePerKwh)}/kWh · ${kwh(segment.usedKwh)} kWh/día`
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

          <div
            className={`allowance-vmarker ${markerPct >= 55 ? 'allowance-vmarker--end' : 'allowance-vmarker--start'}`}
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
                <span className="allowance-bar-rate">{money(segment.ratePerKwh)}/kWh</span>
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
              {kwh(band.bandDailyKwh)} kWh/día (techo acumulado {kwh(band.cumulativeDailyKwh)})
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
        muestran atenuadas.
      </p>
      <p className="allowance-guidance">{comparison.guidance}</p>

      <div className={`allowance-profiles ${comparison.profiles.length > 1 ? 'allowance-profiles--split' : ''}`}>
        {comparison.profiles.map((profile) => (
          <ProfileChart
            key={`${profile.season}-${profile.seasonLabel}`}
            profile={profile}
            averageDailyKwh={comparison.averageDailyKwh}
          />
        ))}
      </div>
    </section>
  )
}
