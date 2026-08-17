import { useEffect, useId, useMemo, useState, type CSSProperties } from 'react'
import { DOMESTIC_TARIFFS } from '../data/tariffs'
import {
  allowancePeriodUnitKey,
  formatAllowanceGuidance,
  scaleDailyUsageKwh,
  scaleMonthlyAllowanceKwh,
  scalePeriodAllowanceKwh,
  type AllowanceDisplayScale,
} from '../domain/billing'
import type {
  BillingCycle,
  DailyAllowanceComparison,
  DailyAllowanceProfile,
  DomesticTariffCode,
  MixedPeriodBreakdown,
} from '../domain/types'
import { formatInclusiveDateRange } from '../domain/dates'
import {
  formatKwh,
  formatMoneyRate,
  tariffOptionLabel,
  useI18n,
  type Language,
} from '../i18n'
import { InfoPopover } from './InfoPopover'

interface Props {
  comparison: DailyAllowanceComparison
  tariffCode: DomesticTariffCode
  billingCycle: BillingCycle
}

const DISPLAY_SCALE_STORAGE_KEY = 'cfe-calculator.allowanceScale.v1'

function isAllowanceDisplayScale(value: unknown): value is AllowanceDisplayScale {
  return value === 'daily' || value === 'monthly' || value === 'bimonthly'
}

function readStoredDisplayScale(): AllowanceDisplayScale {
  try {
    const stored = window.localStorage.getItem(DISPLAY_SCALE_STORAGE_KEY)
    if (isAllowanceDisplayScale(stored)) return stored
  } catch {
    // Fall through to the default when browser storage is unavailable.
  }
  return 'daily'
}

function writeStoredDisplayScale(scale: AllowanceDisplayScale): void {
  try {
    window.localStorage.setItem(DISPLAY_SCALE_STORAGE_KEY, scale)
  } catch {
    // The chart remains usable when browser storage is unavailable.
  }
}

function maxSubsidisedKwhInSummer(
  code: Exclude<DomesticTariffCode, 'DAC'>,
  billingCycle: BillingCycle,
): number {
  const monthly = DOMESTIC_TARIFFS[code].blocksBySeason.verano
    .filter((block) => Number.isFinite(block.allowanceKwh))
    .reduce((sum, block) => sum + block.allowanceKwh, 0)
  return billingCycle === 'bimestral' ? monthly * 2 : monthly
}

interface ZoneSegment {
  key: string
  label: string
  /** Segment sizes in monthly kWh (mixto split bars convert period totals first). */
  usedKwh: number
  unusedKwh: number
  tone: string
  ratePerKwh: number | null
  /** Cumulative subsidized ceiling through this band; null for excess. */
  cumulativeMonthlyKwh: number | null
  isExcess: boolean
}

function bandTone(index: number): string {
  const tones = ['band-basico', 'band-intermedio', 'band-intermedio-alto']
  return tones[Math.min(index, tones.length - 1)]!
}

function buildZoneSegments(
  profile: DailyAllowanceProfile,
  averageDailyKwh: number,
  dacLimitKwhMonth: number | null,
  excessLabel: string,
  mixedPeriod: MixedPeriodBreakdown | null,
): ZoneSegment[] {
  // Single-season charts use the monthly domain; legacy aggregate mixto uses period totals.
  const usageKwh = mixedPeriod
    ? averageDailyKwh * mixedPeriod.periodDays
    : scaleDailyUsageKwh(averageDailyKwh, 'monthly')
  const dacLimitInChartUnits =
    dacLimitKwhMonth == null
      ? null
      : mixedPeriod
        ? (dacLimitKwhMonth * mixedPeriod.periodDays) / 30
        : dacLimitKwhMonth

  return buildSegmentsForUsage(
    profile,
    usageKwh,
    dacLimitInChartUnits,
    excessLabel,
    null,
  )
}

/** Build stacked zones for an explicit usage total (season column or single chart). */
function buildSegmentsForUsage(
  profile: DailyAllowanceProfile,
  usageKwh: number,
  dacLimitInChartUnits: number | null,
  excessLabel: string,
  sharedScaleTarget: number | null,
): ZoneSegment[] {
  let remaining = Math.max(0, usageKwh)
  const segments: ZoneSegment[] = profile.bands.map((band, index) => {
    const usedKwh =
      band.usedKwh != null ? Math.max(0, band.usedKwh) : Math.min(remaining, band.bandMonthlyKwh)
    if (band.usedKwh == null) {
      remaining = Math.max(0, remaining - usedKwh)
    }
    return {
      key: band.key,
      label: band.label,
      usedKwh,
      unusedKwh: Math.max(0, band.bandMonthlyKwh - usedKwh),
      tone: bandTone(index),
      ratePerKwh: band.ratePerKwh,
      cumulativeMonthlyKwh: band.cumulativeMonthlyKwh,
      isExcess: false,
    }
  })

  const ceiling = profile.subsidizedCeilingMonthlyKwh
  // DAC is a classification threshold, not another marginal price band. Keep
  // all consumption above the subsidized ceiling in the Excedente segment and
  // reserve enough visual scale to place the separate DAC indicator.
  const localScaleTarget = Math.max(
    ceiling,
    usageKwh,
    dacLimitInChartUnits != null ? dacLimitInChartUnits * 1.12 : 0,
  )
  const scaleTarget = sharedScaleTarget != null ? Math.max(sharedScaleTarget, localScaleTarget) : localScaleTarget
  const excessCapacity = Math.max(0, scaleTarget - ceiling)
  if (excessCapacity > 0) {
    const usedExcess =
      profile.excessUsedKwh != null
        ? Math.min(Math.max(0, profile.excessUsedKwh), excessCapacity)
        : Math.min(Math.max(0, usageKwh - ceiling), excessCapacity)
    segments.push({
      key: 'excedente',
      label: excessLabel,
      usedKwh: usedExcess,
      unusedKwh: Math.max(0, excessCapacity - usedExcess),
      tone: 'band-excedente',
      ratePerKwh: profile.excedenteRatePerKwh,
      cumulativeMonthlyKwh: null,
      isExcess: true,
    })
  }

  return segments
}

function segmentScaleTarget(
  profile: DailyAllowanceProfile,
  usageKwh: number,
  dacLimitInChartUnits: number | null,
): number {
  return Math.max(
    profile.subsidizedCeilingMonthlyKwh,
    usageKwh,
    dacLimitInChartUnits != null ? dacLimitInChartUnits * 1.12 : 0,
  )
}

/** Convert mixto period-total kWh into the monthly domain both split bars share. */
function mixtoPeriodKwhToMonthly(periodKwh: number, seasonDays: number): number {
  return scalePeriodAllowanceKwh(periodKwh, seasonDays, 'monthly')
}

function mixtoProfileToMonthly(
  profile: DailyAllowanceProfile,
  seasonDays: number,
): DailyAllowanceProfile {
  const toMonthly = (value: number) => mixtoPeriodKwhToMonthly(value, seasonDays)
  return {
    ...profile,
    bands: profile.bands.map((band) => ({
      ...band,
      bandMonthlyKwh: toMonthly(band.bandMonthlyKwh),
      cumulativeMonthlyKwh: toMonthly(band.cumulativeMonthlyKwh),
      usedKwh: band.usedKwh != null ? toMonthly(band.usedKwh) : undefined,
    })),
    subsidizedCeilingMonthlyKwh: toMonthly(profile.subsidizedCeilingMonthlyKwh),
    excessUsedKwh:
      profile.excessUsedKwh != null ? toMonthly(profile.excessUsedKwh) : undefined,
  }
}

// Each legend row needs a floor of vertical space so its label/rate/value never
// collide. We first try to satisfy that floor by growing the bar to scale, and
// only when that would exceed the height budget do we render the smallest
// blocks out of scale (pinned to the floor) so the text always fits.
const MIN_SEGMENT_PX = 62
const BASE_HEIGHT_PX = 272
const MAX_VIEWPORT_RATIO = 0.7
const MAX_FLOOR_PX = 400

function computeDisplayFractions(totals: number[], minFraction: number): number[] {
  const scale = totals.reduce((sum, total) => sum + Math.max(0, total), 0)
  const positiveCount = totals.filter((total) => total > 0).length
  if (scale <= 0 || positiveCount === 0) {
    return totals.map(() => 0)
  }

  // Never demand more than an equal share as the per-segment floor, otherwise
  // the floors could sum past the available height.
  const floor = Math.min(minFraction, 1 / positiveCount)
  const pinned = totals.map(() => false)
  const fractions = totals.map(() => 0)

  for (let guard = 0; guard <= positiveCount; guard++) {
    let pinnedSum = 0
    let freeTrue = 0
    totals.forEach((total, index) => {
      if (total <= 0) return
      if (pinned[index]) pinnedSum += floor
      else freeTrue += total
    })

    const remaining = Math.max(0, 1 - pinnedSum)
    let newlyPinned = false
    totals.forEach((total, index) => {
      if (total <= 0) {
        fractions[index] = 0
        return
      }
      if (pinned[index]) {
        fractions[index] = floor
        return
      }
      const share = freeTrue > 0 ? (total / freeTrue) * remaining : 0
      if (share < floor) {
        pinned[index] = true
        newlyPinned = true
      } else {
        fractions[index] = share
      }
    })

    if (!newlyPinned) break
  }

  const totalFraction = fractions.reduce((sum, fraction) => sum + fraction, 0)
  return totalFraction > 0 ? fractions.map((fraction) => fraction / totalFraction) : fractions
}

// Maps a kWh value to its vertical position (0..1 from the bottom) using the
// same display fractions the bar renders with, so markers track any distortion.
function mapValueToFraction(value: number, totals: number[], fractions: number[]): number {
  const scale = totals.reduce((sum, total) => sum + Math.max(0, total), 0)
  if (scale <= 0) return 0
  const target = Math.max(0, Math.min(value, scale))
  let cumulativeValue = 0
  let cumulativeFraction = 0
  for (let index = 0; index < totals.length; index++) {
    const total = Math.max(0, totals[index]!)
    if (total <= 0) continue
    if (target <= cumulativeValue + total) {
      const within = (target - cumulativeValue) / total
      return cumulativeFraction + Math.max(0, Math.min(1, within)) * fractions[index]!
    }
    cumulativeValue += total
    cumulativeFraction += fractions[index]!
  }
  return cumulativeFraction
}

function useViewportHeight(): number {
  const [viewportHeight, setViewportHeight] = useState(() =>
    typeof window !== 'undefined' ? window.innerHeight : 800,
  )
  useEffect(() => {
    if (typeof window === 'undefined') return
    const handleResize = () => setViewportHeight(window.innerHeight)
    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [])
  return viewportHeight
}

function ProfileChart({
  profile,
  averageDailyKwh,
  dacLimitKwhMonth,
  currentPaceAboveDacLimit,
  displayScale,
  language,
  mixedPeriod,
  t,
}: {
  profile: DailyAllowanceProfile
  averageDailyKwh: number
  dacLimitKwhMonth: number | null
  currentPaceAboveDacLimit: boolean | null
  displayScale: AllowanceDisplayScale
  language: Language
  mixedPeriod: MixedPeriodBreakdown | null
  t: (key: Parameters<ReturnType<typeof useI18n>['t']>[0], params?: Record<string, string | number>) => string
}) {
  const unit = t(allowancePeriodUnitKey(displayScale))
  // Geometry is monthly for single-season charts and period-total for mixto.
  const formatBand = (value: number) =>
    formatKwh(
      mixedPeriod
        ? scalePeriodAllowanceKwh(value, mixedPeriod.periodDays, displayScale)
        : scaleMonthlyAllowanceKwh(value, displayScale),
      language,
    )
  const formatUsage = (dailyValue: number) =>
    formatKwh(scaleDailyUsageKwh(dailyValue, displayScale), language)
  const money = (value: number) => formatMoneyRate(value, language)
  const viewportHeight = useViewportHeight()
  const usageMarkerKwh = mixedPeriod
    ? averageDailyKwh * mixedPeriod.periodDays
    : scaleDailyUsageKwh(averageDailyKwh, 'monthly')
  const dacMarkerKwh =
    dacLimitKwhMonth == null
      ? null
      : mixedPeriod
        ? (dacLimitKwhMonth * mixedPeriod.periodDays) / 30
        : dacLimitKwhMonth
  const segments = buildZoneSegments(
    profile,
    averageDailyKwh,
    dacLimitKwhMonth,
    t('allowance.block.excedente'),
    mixedPeriod,
  )
  const totals = segments.map((segment) => segment.usedKwh + segment.unusedKwh)
  const scale = totals.reduce((sum, total) => sum + total, 0)

  const positiveTotals = totals.filter((total) => total > 0)
  const smallestFraction =
    positiveTotals.length > 0 && scale > 0 ? Math.min(...positiveTotals) / scale : 1
  const maxHeightPx = Math.max(MAX_FLOOR_PX, viewportHeight * MAX_VIEWPORT_RATIO)
  // Height that would let the smallest block reach the text floor while staying
  // to scale. Clamp it into [base, max(70vh, 400px)]; beyond that we distort.
  const requiredHeightPx = smallestFraction > 0 ? MIN_SEGMENT_PX / smallestFraction : BASE_HEIGHT_PX
  const chartHeightPx = Math.min(Math.max(BASE_HEIGHT_PX, requiredHeightPx), maxHeightPx)
  const displayFractions = computeDisplayFractions(totals, MIN_SEGMENT_PX / chartHeightPx)

  const markerPct =
    scale > 0
      ? Math.min(100, mapValueToFraction(usageMarkerKwh, totals, displayFractions) * 100)
      : 0
  const dacMarkerPct =
    dacMarkerKwh != null && scale > 0
      ? Math.min(100, mapValueToFraction(dacMarkerKwh, totals, displayFractions) * 100)
      : null

  const ariaZones = segments
    .map((segment) => {
      const total = segment.usedKwh + segment.unusedKwh
      const unused =
        segment.unusedKwh > 0
          ? t('allowance.ariaZoneUnused', {
              unused: formatBand(segment.unusedKwh),
              total: formatBand(total),
            })
          : ''
      const rate =
        segment.ratePerKwh != null
          ? t('allowance.ariaZoneRate', { rate: money(segment.ratePerKwh) })
          : ''
      return t('allowance.ariaZone', {
        label: segment.label,
        rate,
        used: formatBand(segment.usedKwh),
        unused,
      })
    })
    .join('; ')

  const ariaDac =
    dacLimitKwhMonth != null && dacMarkerKwh != null
      ? t('allowance.ariaDac', {
          value: formatBand(dacMarkerKwh),
          unit,
          monthly: dacLimitKwhMonth,
          pace: currentPaceAboveDacLimit
            ? t('allowance.ariaDacAbove')
            : t('allowance.ariaDacBelow'),
        })
      : ''

  return (
    <div className="allowance-profile">
      <h4>{profile.seasonLabel}</h4>

      <div
        className="allowance-chart allowance-chart--vertical"
        style={{ height: `${chartHeightPx}px` }}
        role="img"
        aria-label={t('allowance.ariaChart', {
          avg: formatUsage(averageDailyKwh),
          unit,
          zones: ariaZones,
          dac: ariaDac,
        })}
      >
        <div className="allowance-vbar-track">
          <div className="allowance-vbar-zones">
            {segments.map((segment, index) => {
              const total = segment.usedKwh + segment.unusedKwh
              if (total <= 0 || scale <= 0) return null
              const usedPct = total > 0 ? (segment.usedKwh / total) * 100 : 0
              const unusedPct = 100 - usedPct
              const rate =
                segment.ratePerKwh != null
                  ? t('allowance.rateSuffix', { rate: money(segment.ratePerKwh) })
                  : ''

              return (
                <div
                  key={segment.key}
                  className={`allowance-vbar-zone ${segment.tone}`}
                  style={{ flex: `${displayFractions[index]} 1 0` }}
                  title={
                    segment.unusedKwh > 0
                      ? t('allowance.tooltipPartial', {
                          label: segment.label,
                          rate,
                          used: formatBand(segment.usedKwh),
                          total: formatBand(total),
                          unit,
                        })
                      : t('allowance.tooltipFull', {
                          label: segment.label,
                          rate,
                          used: formatBand(segment.usedKwh),
                          unit,
                        })
                  }
                >
                  {segment.usedKwh > 0 && (
                    <span
                      className="allowance-vbar-used"
                      style={{ height: `${usedPct}%` }}
                    />
                  )}
                  {segment.unusedKwh > 0 && (
                    <span
                      className="allowance-vbar-unused"
                      style={{ height: `${unusedPct}%` }}
                    />
                  )}
                </div>
              )
            })}
          </div>
        </div>

        <div className="allowance-vbar-legend">
          {segments.map((segment, index) => {
            const total = segment.usedKwh + segment.unusedKwh
            const usedPct = total > 0 ? Math.min(100, (segment.usedKwh / total) * 100) : 0
            const roundedUsedPct = Math.round(usedPct)
            return (
              <div
                key={segment.key}
                className={`allowance-vbar-legend-item ${segment.tone}`}
                style={{ flex: `${displayFractions[index]} 1 0` }}
              >
                <span className="allowance-bar-identity">
                  <span className="allowance-bar-label">{segment.label}</span>
                  {segment.ratePerKwh != null && (
                    <span className="allowance-bar-rate">{money(segment.ratePerKwh)} / kWh</span>
                  )}
                </span>

                <span className="allowance-bar-value">
                  {segment.isExcess
                    ? t('allowance.usedAmount', { used: formatBand(segment.usedKwh) })
                    : t('allowance.usedOf', {
                        used: formatBand(segment.usedKwh),
                        total: formatBand(total),
                      })}
                  <small>kWh / {unit}</small>
                </span>

                {segment.isExcess ? (
                  segment.usedKwh > 0 ? null : (
                    <span className="allowance-bar-usage allowance-bar-usage--excess">
                      {t('allowance.legendExcessOff')}
                    </span>
                  )
                ) : (
                  <span className="allowance-bar-usage">
                    <span>{t('allowance.usedLabel')}</span>
                    <span className="allowance-bar-usage-value">
                      <span
                        className="allowance-usage-pie"
                        style={{ '--usage-percent': `${usedPct}%` } as CSSProperties}
                        aria-hidden="true"
                      />
                      <strong>{roundedUsedPct}%</strong>
                    </span>
                  </span>
                )}
              </div>
            )
          })}
        </div>

        {dacMarkerPct != null && dacMarkerKwh != null && (
          <span
            className="allowance-marker allowance-marker--dac"
            style={{ bottom: `${dacMarkerPct}%` }}
            title={t('allowance.dacMarkerTitle', {
              value: formatBand(dacMarkerKwh),
              unit,
            })}
            aria-hidden="true"
          >
            <span className="allowance-marker-triangle" />
            <span className="allowance-marker-line" />
          </span>
        )}

        <span
          className={`allowance-marker allowance-marker--avg${
            currentPaceAboveDacLimit ? ' allowance-marker--alert' : ''
          }`}
          style={{ bottom: `${markerPct}%` }}
          title={`${t('allowance.yourAverage')}: ${formatUsage(averageDailyKwh)} kWh/${unit}`}
          aria-hidden="true"
        >
          <span className="allowance-marker-triangle" />
          <span className="allowance-marker-line" />
        </span>
      </div>

      <ul className="allowance-marker-legend" aria-hidden="true">
        <li
          className={`allowance-marker-legend-item allowance-marker-legend-item--avg${
            currentPaceAboveDacLimit ? ' allowance-marker-legend-item--alert' : ''
          }`}
        >
          <span className="allowance-marker-swatch" />
          <span>
            {t('allowance.yourAverage')}:{' '}
            <strong>
              {formatUsage(averageDailyKwh)} kWh/{unit}
            </strong>
          </span>
        </li>
        {dacMarkerKwh != null && (
          <li className="allowance-marker-legend-item allowance-marker-legend-item--dac">
            <span className="allowance-marker-swatch" />
            <span>
              {t('allowance.dacMarkerTitle', {
                value: formatBand(dacMarkerKwh),
                unit,
              })}
            </span>
          </li>
        )}
      </ul>
    </div>
  )
}

function MixedPeriodBreakdownPanel({
  mixedPeriod,
  language,
}: {
  mixedPeriod: MixedPeriodBreakdown
  language: Language
}) {
  const { t } = useI18n()
  const summerRange =
    mixedPeriod.summerRange != null
      ? formatInclusiveDateRange(
          mixedPeriod.summerRange.startISO,
          mixedPeriod.summerRange.endISO,
          language,
        )
      : null
  const standardRange =
    mixedPeriod.nonSummerRange != null
      ? formatInclusiveDateRange(
          mixedPeriod.nonSummerRange.startISO,
          mixedPeriod.nonSummerRange.endISO,
          language,
        )
      : null

  return (
    <div className="allowance-mixed-breakdown" aria-label={t('allowance.mixedBreakdownTitle')}>
      <h4>{t('allowance.mixedBreakdownTitle')}</h4>
      <ul>
        <li>
          <span className="allowance-mixed-breakdown-title">
            {t('allowance.seasonSummer')}
            {summerRange != null && (
              <em className="allowance-mixed-breakdown-range">
                {t('allowance.mixedSeasonRange', { range: summerRange })}
              </em>
            )}
          </span>
          <span className="allowance-mixed-breakdown-usage">
            {t('allowance.mixedSeasonUsage', {
              days: mixedPeriod.summerDays,
              kwh: formatKwh(mixedPeriod.summerKwh, language),
            })}
          </span>
        </li>
        <li>
          <span className="allowance-mixed-breakdown-title">
            {t('allowance.seasonStandard')}
            {standardRange != null && (
              <em className="allowance-mixed-breakdown-range">
                {t('allowance.mixedSeasonRange', { range: standardRange })}
              </em>
            )}
          </span>
          <span className="allowance-mixed-breakdown-usage">
            {t('allowance.mixedSeasonUsage', {
              days: mixedPeriod.nonSummerDays,
              kwh: formatKwh(mixedPeriod.nonSummerKwh, language),
            })}
          </span>
        </li>
      </ul>
    </div>
  )
}

function describeZones(
  segments: ZoneSegment[],
  formatBand: (value: number) => string,
  money: (value: number) => string,
  t: (key: Parameters<ReturnType<typeof useI18n>['t']>[0], params?: Record<string, string | number>) => string,
): string {
  return segments
    .map((segment) => {
      const total = segment.usedKwh + segment.unusedKwh
      const unused =
        segment.unusedKwh > 0
          ? t('allowance.ariaZoneUnused', {
              unused: formatBand(segment.unusedKwh),
              total: formatBand(total),
            })
          : ''
      const rate =
        segment.ratePerKwh != null
          ? t('allowance.ariaZoneRate', { rate: money(segment.ratePerKwh) })
          : ''
      return t('allowance.ariaZone', {
        label: segment.label,
        rate,
        used: formatBand(segment.usedKwh),
        unused,
      })
    })
    .join('; ')
}

function SeasonColumn({
  label,
  rangeLabel,
  segments,
  displayFractions,
  formatBand,
  money,
  unit,
  usageMarkerPct,
  dacMarkerPct,
  currentPaceAboveDacLimit,
  t,
}: {
  label: string
  rangeLabel: string | null
  segments: ZoneSegment[]
  displayFractions: number[]
  formatBand: (value: number) => string
  money: (value: number) => string
  unit: string
  usageMarkerPct: number
  dacMarkerPct: number | null
  currentPaceAboveDacLimit: boolean | null
  t: (key: Parameters<ReturnType<typeof useI18n>['t']>[0], params?: Record<string, string | number>) => string
}) {
  return (
    <div className="allowance-mixed-column">
      <div className="allowance-mixed-column-header">
        <h5 className="allowance-mixed-column-title">{label}</h5>
        {rangeLabel != null && (
          <p className="allowance-mixed-column-range">{rangeLabel}</p>
        )}
      </div>

      <div className="allowance-mixed-body">
        <div className="allowance-mixed-bar-stage">
          <div className="allowance-vbar-track">
            <div className="allowance-vbar-zones">
              {segments.map((segment, index) => {
                const total = segment.usedKwh + segment.unusedKwh
                if (total <= 0) return null
                const usedPct = (segment.usedKwh / total) * 100
                const unusedPct = 100 - usedPct
                const rate =
                  segment.ratePerKwh != null
                    ? t('allowance.rateSuffix', { rate: money(segment.ratePerKwh) })
                    : ''
                return (
                  <div
                    key={segment.key}
                    className={`allowance-vbar-zone ${segment.tone}`}
                    style={{ flex: `${displayFractions[index]} 1 0` }}
                    title={
                      segment.unusedKwh > 0 && !segment.isExcess
                        ? t('allowance.tooltipPartial', {
                            label: segment.label,
                            rate,
                            used: formatBand(segment.usedKwh),
                            total: formatBand(total),
                            unit,
                          })
                        : t('allowance.tooltipFull', {
                            label: segment.label,
                            rate,
                            used: formatBand(segment.usedKwh),
                            unit,
                          })
                    }
                  >
                    {segment.usedKwh > 0 && (
                      <span className="allowance-vbar-used" style={{ height: `${usedPct}%` }} />
                    )}
                    {segment.unusedKwh > 0 && (
                      <span className="allowance-vbar-unused" style={{ height: `${unusedPct}%` }} />
                    )}
                  </div>
                )
              })}
            </div>

            {dacMarkerPct != null && (
              <span
                className="allowance-marker allowance-marker--dac allowance-marker--mixed"
                style={{ bottom: `${dacMarkerPct}%` }}
                aria-hidden="true"
              >
                <span className="allowance-marker-triangle" />
                <span className="allowance-marker-line" />
              </span>
            )}
            <span
              className={`allowance-marker allowance-marker--avg allowance-marker--mixed${
                currentPaceAboveDacLimit ? ' allowance-marker--alert' : ''
              }`}
              style={{ bottom: `${usageMarkerPct}%` }}
              aria-hidden="true"
            >
              <span className="allowance-marker-triangle" />
              <span className="allowance-marker-line" />
            </span>
          </div>
        </div>

        <ul className="allowance-mixed-details">
          {[...segments].toReversed().map((segment) => {
            const total = segment.usedKwh + segment.unusedKwh
            if (total <= 0) return null
            const usedPct = Math.min(100, (segment.usedKwh / total) * 100)
            const roundedUsedPct = Math.round(usedPct)
            return (
              <li key={segment.key} className={`allowance-mixed-detail ${segment.tone}`}>
                <span className="allowance-mixed-detail-swatch" aria-hidden="true" />
                <span className="allowance-mixed-detail-main">
                  <span className="allowance-mixed-detail-label">{segment.label}</span>
                  {segment.ratePerKwh != null && (
                    <span className="allowance-mixed-detail-rate">
                      {money(segment.ratePerKwh)} / kWh
                    </span>
                  )}
                </span>
                <span className="allowance-mixed-detail-value">
                  {segment.isExcess
                    ? t('allowance.usedAmount', { used: formatBand(segment.usedKwh) })
                    : t('allowance.usedOf', {
                        used: formatBand(segment.usedKwh),
                        total: formatBand(total),
                      })}
                  <small>kWh / {unit}</small>
                </span>
                {segment.isExcess ? (
                  segment.usedKwh > 0 ? (
                    <span className="allowance-mixed-detail-pct" aria-hidden="true" />
                  ) : (
                    <span className="allowance-mixed-detail-pct allowance-mixed-detail-pct--off">
                      {t('allowance.legendExcessOff')}
                    </span>
                  )
                ) : (
                  <span className="allowance-mixed-detail-pct">
                    <span
                      className="allowance-usage-pie"
                      style={{ '--usage-percent': `${usedPct}%` } as CSSProperties}
                      aria-hidden="true"
                    />
                    <strong>{roundedUsedPct}%</strong>
                  </span>
                )}
              </li>
            )
          })}
        </ul>
      </div>
    </div>
  )
}

function MixedSplitChart({
  summerProfile,
  standardProfile,
  mixedPeriod,
  averageDailyKwh,
  dacLimitKwhMonth,
  currentPaceAboveDacLimit,
  displayScale,
  language,
  t,
}: {
  summerProfile: DailyAllowanceProfile
  standardProfile: DailyAllowanceProfile
  mixedPeriod: MixedPeriodBreakdown
  averageDailyKwh: number
  dacLimitKwhMonth: number | null
  currentPaceAboveDacLimit: boolean | null
  displayScale: AllowanceDisplayScale
  language: Language
  t: (key: Parameters<ReturnType<typeof useI18n>['t']>[0], params?: Record<string, string | number>) => string
}) {
  const unit = t(allowancePeriodUnitKey(displayScale))
  const money = (value: number) => formatMoneyRate(value, language)
  const excessLabel = t('allowance.block.excedente')
  const formatBand = (value: number) =>
    formatKwh(scaleMonthlyAllowanceKwh(value, displayScale), language)

  const summerMonthly = mixtoProfileToMonthly(summerProfile, mixedPeriod.summerDays)
  const standardMonthly = mixtoProfileToMonthly(standardProfile, mixedPeriod.nonSummerDays)
  const summerUsageMonthly = mixtoPeriodKwhToMonthly(
    mixedPeriod.summerKwh,
    mixedPeriod.summerDays,
  )
  const standardUsageMonthly = mixtoPeriodKwhToMonthly(
    mixedPeriod.nonSummerKwh,
    mixedPeriod.nonSummerDays,
  )

  const sharedScale = Math.max(
    segmentScaleTarget(summerMonthly, summerUsageMonthly, dacLimitKwhMonth),
    segmentScaleTarget(standardMonthly, standardUsageMonthly, dacLimitKwhMonth),
  )

  const summerSegments = buildSegmentsForUsage(
    summerMonthly,
    summerUsageMonthly,
    dacLimitKwhMonth,
    excessLabel,
    sharedScale,
  )
  const standardSegments = buildSegmentsForUsage(
    standardMonthly,
    standardUsageMonthly,
    dacLimitKwhMonth,
    excessLabel,
    sharedScale,
  )

  const summerTotals = summerSegments.map((segment) => segment.usedKwh + segment.unusedKwh)
  const standardTotals = standardSegments.map((segment) => segment.usedKwh + segment.unusedKwh)
  const summerScale = summerTotals.reduce((sum, total) => sum + total, 0)
  const standardScale = standardTotals.reduce((sum, total) => sum + total, 0)

  const summerFractions = computeDisplayFractions(summerTotals, 0)
  const standardFractions = computeDisplayFractions(standardTotals, 0)

  const summerRangeLabel =
    mixedPeriod.summerRange != null
      ? formatInclusiveDateRange(
          mixedPeriod.summerRange.startISO,
          mixedPeriod.summerRange.endISO,
          language,
        )
      : null
  const standardRangeLabel =
    mixedPeriod.nonSummerRange != null
      ? formatInclusiveDateRange(
          mixedPeriod.nonSummerRange.startISO,
          mixedPeriod.nonSummerRange.endISO,
          language,
        )
      : null

  const formatUsage = (dailyValue: number) =>
    formatKwh(scaleDailyUsageKwh(dailyValue, displayScale), language)

  const summerAvgDaily =
    mixedPeriod.summerDays > 0 ? mixedPeriod.summerKwh / mixedPeriod.summerDays : 0
  const standardAvgDaily =
    mixedPeriod.nonSummerDays > 0 ? mixedPeriod.nonSummerKwh / mixedPeriod.nonSummerDays : 0

  const summerMarkerPct =
    summerScale > 0
      ? Math.min(100, mapValueToFraction(summerUsageMonthly, summerTotals, summerFractions) * 100)
      : 0
  const standardMarkerPct =
    standardScale > 0
      ? Math.min(
          100,
          mapValueToFraction(standardUsageMonthly, standardTotals, standardFractions) * 100,
        )
      : 0
  const summerDacPct =
    dacLimitKwhMonth != null && summerScale > 0
      ? Math.min(100, mapValueToFraction(dacLimitKwhMonth, summerTotals, summerFractions) * 100)
      : null
  const standardDacPct =
    dacLimitKwhMonth != null && standardScale > 0
      ? Math.min(100, mapValueToFraction(dacLimitKwhMonth, standardTotals, standardFractions) * 100)
      : null

  const ariaDac =
    dacLimitKwhMonth != null
      ? t('allowance.ariaDac', {
          value: formatKwh(scaleMonthlyAllowanceKwh(dacLimitKwhMonth, displayScale), language),
          unit,
          monthly: dacLimitKwhMonth,
          pace: currentPaceAboveDacLimit
            ? t('allowance.ariaDacAbove')
            : t('allowance.ariaDacBelow'),
        })
      : ''

  return (
    <div className="allowance-profile allowance-profile--mixed">
      <h4>{t('allowance.mixedChartTitle')}</h4>
      <div
        className="allowance-chart allowance-chart--mixed"
        role="img"
        aria-label={t('allowance.ariaMixedChart', {
          summerAvg: formatUsage(summerAvgDaily),
          standardAvg: formatUsage(standardAvgDaily),
          unit,
          summerRange: summerRangeLabel ?? t('allowance.seasonSummer'),
          standardRange: standardRangeLabel ?? t('allowance.seasonStandard'),
          summerZones: describeZones(summerSegments, formatBand, money, t),
          standardZones: describeZones(standardSegments, formatBand, money, t),
          dac: ariaDac,
        })}
      >
        <div className="allowance-mixed-columns">
          <SeasonColumn
            label={t('allowance.seasonSummer')}
            rangeLabel={summerRangeLabel}
            segments={summerSegments}
            displayFractions={summerFractions}
            formatBand={formatBand}
            money={money}
            unit={unit}
            usageMarkerPct={summerMarkerPct}
            dacMarkerPct={summerDacPct}
            currentPaceAboveDacLimit={currentPaceAboveDacLimit}
            t={t}
          />
          <SeasonColumn
            label={t('allowance.seasonStandard')}
            rangeLabel={standardRangeLabel}
            segments={standardSegments}
            displayFractions={standardFractions}
            formatBand={formatBand}
            money={money}
            unit={unit}
            usageMarkerPct={standardMarkerPct}
            dacMarkerPct={standardDacPct}
            currentPaceAboveDacLimit={currentPaceAboveDacLimit}
            t={t}
          />
        </div>
      </div>

      <ul className="allowance-marker-legend" aria-hidden="true">
        <li
          className={`allowance-marker-legend-item allowance-marker-legend-item--avg${
            currentPaceAboveDacLimit ? ' allowance-marker-legend-item--alert' : ''
          }`}
        >
          <span className="allowance-marker-swatch" />
          <span>
            {t('allowance.yourAverage')}:{' '}
            <strong>
              {formatUsage(averageDailyKwh)} kWh/{unit}
            </strong>
          </span>
        </li>
        {dacLimitKwhMonth != null && (
          <li className="allowance-marker-legend-item allowance-marker-legend-item--dac">
            <span className="allowance-marker-swatch" />
            <span>
              {t('allowance.dacMarkerTitle', {
                value: formatKwh(scaleMonthlyAllowanceKwh(dacLimitKwhMonth, displayScale), language),
                unit,
              })}
            </span>
          </li>
        )}
      </ul>
    </div>
  )
}

function AllowanceHeading({
  tariffCode,
  billingCycle,
}: {
  tariffCode: DomesticTariffCode
  billingCycle: BillingCycle
}) {
  const { language, t } = useI18n()

  return (
    <div className="allowance-title-row label-with-info">
      <h3>{t('allowance.title')}</h3>
      {tariffCode !== 'DAC' && (
        <InfoPopover label={t('allowance.infoLabel')}>
          {t('allowance.infoBody', {
            tariffName: tariffOptionLabel(tariffCode, language),
            billingCycle: t(
              billingCycle === 'bimestral'
                ? 'allowance.billingCycle.bimestral'
                : 'allowance.billingCycle.mensual',
            ),
            maxSubsidisedKwhInSummer: formatKwh(
              maxSubsidisedKwhInSummer(tariffCode, billingCycle),
              language,
            ),
          })}
        </InfoPopover>
      )}
    </div>
  )
}

function ScaleIcon({ scale }: { scale: AllowanceDisplayScale }) {
  const common = {
    width: 18,
    height: 18,
    viewBox: '0 0 24 24',
    fill: 'none',
    stroke: 'currentColor',
    strokeWidth: 1.9,
    strokeLinecap: 'round' as const,
    strokeLinejoin: 'round' as const,
    'aria-hidden': true,
    focusable: false,
  }

  if (scale === 'daily') {
    return (
      <svg {...common}>
        <circle cx="12" cy="12" r="4" />
        <path d="M12 2v2M12 20v2M2 12h2M20 12h2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M19.1 4.9l-1.4 1.4M6.3 17.7l-1.4 1.4" />
      </svg>
    )
  }

  if (scale === 'monthly') {
    return (
      <svg {...common}>
        <rect x="3" y="4.5" width="18" height="16" rx="2.5" />
        <path d="M3 9h18M8 2.5v4M16 2.5v4" />
      </svg>
    )
  }

  return (
    <svg {...common}>
      <rect x="6" y="7" width="15" height="13" rx="2.5" />
      <path d="M6 12h15M11 5.5v3M17 5.5v3" />
      <path d="M3 8.5v9A2.5 2.5 0 0 0 5.5 20" opacity="0.55" />
    </svg>
  )
}

function AllowanceScaleSwitch({
  billingCycle,
  displayScale,
  onChange,
}: {
  billingCycle: BillingCycle
  displayScale: AllowanceDisplayScale
  onChange: (scale: AllowanceDisplayScale) => void
}) {
  const { t } = useI18n()
  const scaleFieldId = useId()
  const options: AllowanceDisplayScale[] =
    billingCycle === 'bimestral'
      ? ['daily', 'monthly', 'bimonthly']
      : ['daily', 'monthly']
  const activeIndex = Math.max(0, options.indexOf(displayScale))

  return (
    <fieldset className="tariff-toggle-field allowance-scale-field">
      <legend id={scaleFieldId}>{t('allowance.scaleLabel')}</legend>
      <div
        className="usage-scale-switch"
        role="tablist"
        aria-labelledby={scaleFieldId}
        data-count={options.length}
        style={
          {
            '--usage-scale-count': options.length,
            '--usage-scale-active': activeIndex,
          } as CSSProperties
        }
      >
        <span className="usage-scale-thumb" aria-hidden="true" />
        {options.map((option) => {
          const labelKey =
            option === 'daily'
              ? 'allowance.scaleDaily'
              : option === 'monthly'
                ? 'allowance.scaleMonthly'
                : 'allowance.scaleBimonthly'
          const active = displayScale === option
          return (
            <button
              key={option}
              type="button"
              role="tab"
              className={
                active ? 'usage-scale-option usage-scale-option--active' : 'usage-scale-option'
              }
              aria-selected={active}
              aria-pressed={active}
              onClick={() => onChange(option)}
            >
              <ScaleIcon scale={option} />
              <span className="usage-scale-option__label">{t(labelKey)}</span>
            </button>
          )
        })}
      </div>
    </fieldset>
  )
}

export function DailyAllowanceChart({ comparison, tariffCode, billingCycle }: Props) {
  const { language, t } = useI18n()
  const [displayScale, setDisplayScale] = useState<AllowanceDisplayScale>(readStoredDisplayScale)

  useEffect(() => {
    if (billingCycle === 'mensual' && displayScale === 'bimonthly') {
      setDisplayScale('monthly')
    }
  }, [billingCycle, displayScale])

  useEffect(() => {
    writeStoredDisplayScale(displayScale)
  }, [displayScale])

  const guidance = useMemo(
    () => formatAllowanceGuidance(comparison, language, displayScale),
    [comparison, language, displayScale],
  )

  if (!comparison.applicable) {
    return (
      <section className="allowance-panel">
        <AllowanceHeading tariffCode={tariffCode} billingCycle={billingCycle} />
        <p className="allowance-guidance">{comparison.guidance}</p>
      </section>
    )
  }

  return (
    <section className="allowance-panel">
      <AllowanceHeading tariffCode={tariffCode} billingCycle={billingCycle} />
      <AllowanceScaleSwitch
        billingCycle={billingCycle}
        displayScale={displayScale}
        onChange={setDisplayScale}
      />
      <p className="allowance-guidance">{guidance}</p>

      {comparison.currentPaceAboveDacLimit && comparison.dacLimitKwhMonth != null && (
        <div className="allowance-dac-alert" role="status">
          <strong>{t('allowance.dacAlertTitle')}</strong>
          <p>
            {t('allowance.dacAlertBody', {
              daily: formatKwh(comparison.averageDailyKwh, language),
              monthly: formatKwh(
                scaleDailyUsageKwh(comparison.averageDailyKwh, 'monthly'),
                language,
              ),
              limit: comparison.dacLimitKwhMonth,
            })}
          </p>
        </div>
      )}

      {comparison.mixedPeriod && (
        <MixedPeriodBreakdownPanel mixedPeriod={comparison.mixedPeriod} language={language} />
      )}

      {comparison.mode === 'mixto' && comparison.mixedPeriod ? (
        <div className="allowance-profiles allowance-profiles--mixed">
          <MixedSplitChart
            summerProfile={
              comparison.profiles.find((profile) => profile.season === 'verano') ??
              comparison.profiles[0]!
            }
            standardProfile={
              comparison.profiles.find((profile) => profile.season === 'fuera') ??
              comparison.profiles[1] ??
              comparison.profiles[0]!
            }
            mixedPeriod={comparison.mixedPeriod}
            averageDailyKwh={comparison.averageDailyKwh}
            dacLimitKwhMonth={comparison.dacLimitKwhMonth}
            currentPaceAboveDacLimit={comparison.currentPaceAboveDacLimit}
            displayScale={displayScale}
            language={language}
            t={t}
          />
        </div>
      ) : (
        <div className="allowance-profiles">
          {comparison.profiles.map((profile) => (
            <ProfileChart
              key={`${profile.season}-${profile.seasonLabel}`}
              profile={profile}
              averageDailyKwh={comparison.averageDailyKwh}
              dacLimitKwhMonth={comparison.dacLimitKwhMonth}
              currentPaceAboveDacLimit={comparison.currentPaceAboveDacLimit}
              displayScale={displayScale}
              language={language}
              mixedPeriod={null}
              t={t}
            />
          ))}
        </div>
      )}
    </section>
  )
}
