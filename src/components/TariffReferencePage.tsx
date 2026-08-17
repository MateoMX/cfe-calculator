import { useEffect, useId, useMemo, useState } from 'react'
import { formatDisplayDate } from '../domain/dates'
import {
  getAllMonths,
  getAvailableDacMonths,
  getAvailableTariffYears,
  getDacTariffDataStatus,
  getDacRegion,
  getDacRegions,
  getDomesticTariffCodes,
  getDomesticTariffDefinition,
  getMonthMatrix,
  getSeasonReference,
  getSnapshotMeta,
  getTariffDataStatus,
  resolveDefaultDacMonth,
  resolveDefaultTariffYear,
  type DomesticReferenceCode,
} from '../domain/tariffReference'
import type { BlockKey, MonthNumber, Season } from '../domain/types'
import {
  blockLabel,
  formatKwh,
  formatMoney,
  formatMoneyRate,
  formatMonthLabel,
  tariffOptionLabel,
  useI18n,
} from '../i18n'
import { LanguageSwitcher } from './LanguageSwitcher'
import { AppNav } from './AppNav'
import { InfoPopover } from './InfoPopover'
import type { AppView } from '../navigation'

interface Props {
  onNavigate: (view: AppView) => void
  compact?: boolean
}

type TariffMode = 'regular' | 'dac'
type AllowanceScale = 'monthly' | 'bimonthly'

function scaleKwh(value: number, scale: AllowanceScale): number {
  if (!Number.isFinite(value)) return value
  return scale === 'bimonthly' ? value * 2 : value
}

function stepMonth(current: MonthNumber, delta: -1 | 1): MonthNumber {
  return (((((current - 1 + delta) % 12) + 12) % 12) + 1) as MonthNumber
}

function stepAvailableMonth(
  current: MonthNumber,
  delta: -1 | 1,
  available: MonthNumber[],
): MonthNumber {
  if (available.length === 0) return current
  const index = available.indexOf(current)
  const start = index === -1 ? (delta === 1 ? -1 : 0) : index
  const next = start + delta
  if (next < 0) return available[available.length - 1]!
  if (next >= available.length) return available[0]!
  return available[next]!
}

function formatAllowance(
  allowanceKwh: number,
  scale: AllowanceScale,
  language: 'es' | 'en',
  t: ReturnType<typeof useI18n>['t'],
): string {
  if (!Number.isFinite(allowanceKwh)) return t('tariffs.allowanceOpen')
  const scaled = scaleKwh(allowanceKwh, scale)
  const key =
    scale === 'bimonthly'
      ? 'tariffs.allowanceValueBimonthly'
      : 'tariffs.allowanceValueMonthly'
  return t(key, { kwh: formatKwh(scaled, language, 0) })
}

function formatRateCell(
  rate: number | null | undefined,
  language: 'es' | 'en',
  unavailableLabel: string,
): string {
  if (rate == null) return unavailableLabel
  return `${formatMoneyRate(rate, language)}/kWh`
}

function SeasonBlocksTable({
  title,
  badge,
  season,
  scale,
  rows,
}: {
  title: string
  badge: string
  season: Season
  scale: AllowanceScale
  rows: ReturnType<typeof getSeasonReference>['blocks']
}) {
  const { language, t } = useI18n()
  const unavailable = t('tariffs.rateUnavailable')
  const totalSubsidisedKwh = rows.reduce(
    (sum, row) => (Number.isFinite(row.allowanceKwh) ? sum + row.allowanceKwh : sum),
    0,
  )

  return (
    <section
      className={
        season === 'verano'
          ? 'tariff-season-card tariff-season-card--summer'
          : 'tariff-season-card tariff-season-card--non-summer'
      }
    >
      <div className="tariff-season-card-header">
        <span className="tariff-season-badge">{badge}</span>
        <h3>{title}</h3>
      </div>
      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th scope="col">{t('tariffs.blockColumn')}</th>
              <th scope="col">{t('tariffs.allowanceColumn')}</th>
              <th scope="col">{t('tariffs.rateColumn')}</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.key}>
                <th scope="row">{blockLabel(row.key, language)}</th>
                <td>{formatAllowance(row.allowanceKwh, scale, language, t)}</td>
                <td>{formatRateCell(row.ratePerKwh, language, unavailable)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="tariff-total-subsidised">
        {t('tariffs.totalSubsidised', {
          kwh: formatAllowance(totalSubsidisedKwh, scale, language, t),
        })}
      </p>
    </section>
  )
}

export function TariffReferencePage({ onNavigate, compact = false }: Props) {
  const { language, t } = useI18n()
  const fieldIds = useId()
  const modeFieldId = `${fieldIds}-mode`
  const tariffFieldId = `${fieldIds}-tariff`
  const monthNavFieldId = `${fieldIds}-month-nav`
  const regionFieldId = `${fieldIds}-region`
  const priceSeasonFieldId = `${fieldIds}-price-season`
  const scaleFieldId = `${fieldIds}-scale`
  const yearFieldId = `${fieldIds}-year`
  const yearAvailabilityId = `${fieldIds}-year-availability`
  const yearPanelId = `${fieldIds}-year-panel`

  const availableYears = useMemo(() => getAvailableTariffYears(), [])
  const statusHeadingId = `${fieldIds}-data-status`
  const [selectedYear, setSelectedYear] = useState(() => resolveDefaultTariffYear())
  const [mode, setMode] = useState<TariffMode>('regular')
  const dataStatus = useMemo(
    () =>
      mode === 'dac'
        ? getDacTariffDataStatus(availableYears)
        : getTariffDataStatus(availableYears),
    [availableYears, mode],
  )
  const [tariffCode, setTariffCode] = useState<DomesticReferenceCode>('1B')
  const [month, setMonth] = useState<MonthNumber>(
    () => resolveDefaultDacMonth() ?? 7,
  )
  const [regionId, setRegionId] = useState('central')
  const [viewSeason, setViewSeason] = useState<Season>('verano')
  const [allowanceScale, setAllowanceScale] = useState<AllowanceScale>('bimonthly')
  const [yearExpanded, setYearExpanded] = useState(false)

  useEffect(() => {
    if (!availableYears.includes(selectedYear) && availableYears[0] != null) {
      setSelectedYear(availableYears[0])
    }
  }, [availableYears, selectedYear])

  const snapshotMeta = getSnapshotMeta(selectedYear)
  const tariffCodes = getDomesticTariffCodes(selectedYear)
  const months = getAllMonths()
  const dacMonths = getAvailableDacMonths(selectedYear)
  const dacRegions = getDacRegions(selectedYear, month)

  useEffect(() => {
    if (!tariffCodes.includes(tariffCode) && tariffCodes[0]) {
      setTariffCode(tariffCodes[0])
    }
  }, [tariffCode, tariffCodes])

  useEffect(() => {
    if (mode !== 'dac' || dacMonths.length === 0) return
    if (!dacMonths.includes(month)) {
      setMonth(resolveDefaultDacMonth(selectedYear) ?? dacMonths[dacMonths.length - 1]!)
    }
  }, [dacMonths, mode, month, selectedYear])

  useEffect(() => {
    if (!dacRegions.some((region) => region.regionId === regionId)) {
      setRegionId(dacRegions[0]?.regionId ?? 'central')
    }
  }, [dacRegions, regionId])

  const tariff = getDomesticTariffDefinition(tariffCode, selectedYear)
  const supportsSummerTariff = tariff.minSummerTempC != null
  const displayedSeason = supportsSummerTariff ? viewSeason : 'fuera'
  const seasonReference = useMemo(
    () => getSeasonReference(tariffCode, month, displayedSeason, selectedYear),
    [tariffCode, month, displayedSeason, selectedYear],
  )
  const yearMatrix = useMemo(
    () => getMonthMatrix(tariffCode, displayedSeason, selectedYear),
    [tariffCode, displayedSeason, selectedYear],
  )
  const yearBlockKeys = tariff.blocksBySeason[displayedSeason].map((block) => block.key)
  const dacRegion = getDacRegion(regionId, selectedYear, month) ?? dacRegions[0]!
  const lastCheckDate = formatDisplayDate(dataStatus.lastCheckedAsOf, language)
  const rangeStart = formatDisplayDate(dataStatus.rangeStartISO, language)
  const rangeEnd = formatDisplayDate(dataStatus.rangeEndISO, language)
  const dataStatusPanel = (
    <section className="tariff-data-status" aria-labelledby={statusHeadingId}>
      <h2 id={statusHeadingId}>{t('tariffs.dataStatusTitle')}</h2>
      <dl>
        <div>
          <dt>{t('tariffs.dataStatusLastCheck')}</dt>
          <dd>{lastCheckDate}</dd>
        </div>
        <div>
          <dt>{t('tariffs.dataStatusRange')}</dt>
          <dd>{t('tariffs.dataStatusRangeValue', { start: rangeStart, end: rangeEnd })}</dd>
        </div>
      </dl>
    </section>
  )
  const tariffName = tariffOptionLabel(tariffCode, language)
  const seasonLabel =
    displayedSeason === 'verano' ? t('tariffs.seasonSummer') : t('tariffs.seasonNonSummer')
  const unavailable = t('tariffs.rateUnavailable')
  const dacLimitInfo = t('form.dacInfoDescription', {
    tariffName,
    dacLimit: tariff.dacLimitKwhMonth,
  })
  const summerStartInfo = t('form.summerStartInfoDescription', { tariffName })
  const displayedDacLimit = scaleKwh(tariff.dacLimitKwhMonth, allowanceScale)
  const dacLimitValueKey =
    allowanceScale === 'bimonthly'
      ? 'tariffs.dacThresholdValueBimonthly'
      : 'tariffs.dacThresholdValueMonthly'
  const scaleNoteKey =
    allowanceScale === 'bimonthly'
      ? 'tariffs.scaleNoteBimonthly'
      : 'tariffs.scaleNoteMonthly'
  const isSummer = displayedSeason === 'verano'

  return (
    <div className={compact ? 'tariff-page tariff-page--compact' : 'tariff-page page'}>
      {!compact && (
        <header className="hero">
          <div className="hero-top">
            <AppNav view="tariffs" onNavigate={onNavigate} />
            <h1>{t('tariffs.title')}</h1>
            <LanguageSwitcher />
          </div>
          <p>{t('tariffs.blurb')}</p>
        </header>
      )}

      {compact && (
        <div className="tariff-page-intro">
          <p>{t('tariffs.blurb')}</p>
        </div>
      )}

      <section className="card tariff-primary-choices" aria-labelledby={`${fieldIds}-primary`}>
        <h2 id={`${fieldIds}-primary`} className="visually-hidden">
          {t('tariffs.controlsTitle')}
        </h2>

        <fieldset className="tariff-toggle-field">
          <legend id={scaleFieldId}>{t('tariffs.scaleLabel')}</legend>
          <div
            className="tariff-mode-switch"
            role="tablist"
            aria-labelledby={scaleFieldId}
          >
            <button
              type="button"
              role="tab"
              className={
                allowanceScale === 'bimonthly'
                  ? 'tariff-mode-option tariff-mode-option--active'
                  : 'tariff-mode-option'
              }
              aria-selected={allowanceScale === 'bimonthly'}
              aria-pressed={allowanceScale === 'bimonthly'}
              onClick={() => setAllowanceScale('bimonthly')}
            >
              {t('tariffs.scaleBimonthly')}
            </button>
            <button
              type="button"
              role="tab"
              className={
                allowanceScale === 'monthly'
                  ? 'tariff-mode-option tariff-mode-option--active'
                  : 'tariff-mode-option'
              }
              aria-selected={allowanceScale === 'monthly'}
              aria-pressed={allowanceScale === 'monthly'}
              onClick={() => setAllowanceScale('monthly')}
            >
              {t('tariffs.scaleMonthly')}
            </button>
          </div>
        </fieldset>

        <fieldset className="tariff-toggle-field">
          <legend id={modeFieldId}>{t('tariffs.modeLabel')}</legend>
          <div className="tariff-mode-switch" role="tablist" aria-labelledby={modeFieldId}>
            <button
              type="button"
              role="tab"
              className={
                mode === 'regular'
                  ? 'tariff-mode-option tariff-mode-option--active'
                  : 'tariff-mode-option'
              }
              aria-selected={mode === 'regular'}
              aria-pressed={mode === 'regular'}
              onClick={() => setMode('regular')}
            >
              {t('tariffs.modeRegular')}
            </button>
            <button
              type="button"
              role="tab"
              className={
                mode === 'dac'
                  ? 'tariff-mode-option tariff-mode-option--active'
                  : 'tariff-mode-option'
              }
              aria-selected={mode === 'dac'}
              aria-pressed={mode === 'dac'}
              onClick={() => setMode('dac')}
            >
              {t('tariffs.modeDac')}
            </button>
          </div>
        </fieldset>
      </section>

      {mode === 'regular' && (
        <>
          <section className="card tariff-controls" aria-labelledby={`${fieldIds}-controls`}>
            <div className="tariff-controls-select">
              <h2 id={`${fieldIds}-controls`}>{t('tariffs.tariffSelectTitle')}</h2>
              <div className="tariff-controls-grid tariff-controls-grid--tariff-only">
                <label className="tariff-select-field" htmlFor={tariffFieldId}>
                  <span className="tariff-select-field-label">
                    {t('tariffs.tariffLabel')}
                  </span>
                  <select
                    id={tariffFieldId}
                    className="tariff-select"
                    value={tariffCode}
                    onChange={(event) =>
                      setTariffCode(event.target.value as DomesticReferenceCode)
                    }
                  >
                    {tariffCodes.map((code) => (
                      <option key={code} value={code}>
                        {tariffOptionLabel(code, language)}
                      </option>
                    ))}
                  </select>
                </label>
              </div>
              {dataStatusPanel}
            </div>

            <div className="tariff-controls-summary" aria-live="polite">
              <h3>{t('tariffs.selectedSummary', { tariff: tariffName })}</h3>
              <p className="tariff-summary-desc">
                {tariff.minSummerTempC == null
                  ? t('tariffs.temperatureBelow')
                  : t('tariffs.temperatureAtLeast', { temperature: tariff.minSummerTempC })}
              </p>
              <div className="tariff-summary-stat">
                <span className="tariff-summary-stat-label">
                  {t('tariffs.dacThreshold')}
                  <InfoPopover label={t('tariffs.dacThresholdInfoLabel')}>
                    {dacLimitInfo}
                  </InfoPopover>
                </span>
                <span className="tariff-summary-stat-value">
                  {t(dacLimitValueKey, { limit: displayedDacLimit })}
                </span>
              </div>
              <p className="meta">{t(scaleNoteKey)}</p>
            </div>
          </section>

          <section className="card">
            <h2 className="tariff-month-heading">
              <span className="tariff-month-heading-prefix">
                {t('tariffs.monthDetailPrefix')}
              </span>
              <span className="tariff-month-nav">
                <label className="tariff-month-picker" htmlFor={monthNavFieldId}>
                  <span className="visually-hidden">{t('tariffs.monthNavLabel')}</span>
                  <select
                    id={monthNavFieldId}
                    className="tariff-month-picker-select"
                    value={month}
                    onChange={(event) =>
                      setMonth(Number(event.target.value) as MonthNumber)
                    }
                  >
                    {months.map((value) => (
                      <option key={value} value={value}>
                        {formatMonthLabel(value, language)}
                      </option>
                    ))}
                  </select>
                </label>
                <button
                  type="button"
                  className="tariff-month-nav-button"
                  aria-label={t('tariffs.previousMonth')}
                  onClick={() => setMonth((current) => stepMonth(current, -1))}
                >
                  <span aria-hidden="true">‹</span>
                </button>
                <button
                  type="button"
                  className="tariff-month-nav-button"
                  aria-label={t('tariffs.nextMonth')}
                  onClick={() => setMonth((current) => stepMonth(current, 1))}
                >
                  <span aria-hidden="true">›</span>
                </button>
              </span>
              <span className="tariff-year-picker-group">
                <label className="tariff-month-picker" htmlFor={yearFieldId}>
                  <span className="visually-hidden">{t('tariffs.yearLabel')}</span>
                  <select
                    id={yearFieldId}
                    className="tariff-month-picker-select tariff-year-picker-select"
                    value={selectedYear}
                    aria-describedby={
                      availableYears.length === 1 ? yearAvailabilityId : undefined
                    }
                    onChange={(event) => setSelectedYear(Number(event.target.value))}
                  >
                    {availableYears.map((year) => (
                      <option key={year} value={year}>
                        {year}
                      </option>
                    ))}
                  </select>
                </label>
                {availableYears.length === 1 && (
                  <span id={yearAvailabilityId} className="meta tariff-year-availability">
                    {t('tariffs.yearHelpSelect')}
                  </span>
                )}
              </span>
            </h2>

            <div className="tariff-breakdown-toolbar">
              <fieldset className="tariff-toggle-field tariff-breakdown-season">
                <legend id={priceSeasonFieldId} className="visually-hidden">
                  {t('tariffs.priceSeasonLabel')}
                </legend>
                <div
                  className="tariff-mode-switch tariff-mode-switch--compact"
                  role="tablist"
                  aria-labelledby={priceSeasonFieldId}
                >
                  <button
                    type="button"
                    role="tab"
                    className={
                      isSummer
                        ? 'tariff-mode-option tariff-mode-option--active'
                        : 'tariff-mode-option'
                    }
                    aria-selected={isSummer}
                    aria-pressed={isSummer}
                    disabled={!supportsSummerTariff}
                    onClick={() => setViewSeason('verano')}
                  >
                    {t('tariffs.priceSeasonSummer')}
                  </button>
                  <button
                    type="button"
                    role="tab"
                    className={
                      !isSummer
                        ? 'tariff-mode-option tariff-mode-option--active'
                        : 'tariff-mode-option'
                    }
                    aria-selected={!isSummer}
                    aria-pressed={!isSummer}
                    disabled={!supportsSummerTariff}
                    onClick={() => setViewSeason('fuera')}
                  >
                    {t('tariffs.priceSeasonStandard')}
                  </button>
                </div>
              </fieldset>

              <aside
                className="tariff-summer-reminder"
                aria-label={t('form.summerStartInfoLabel')}
              >
                <div className="tariff-summer-reminder-row">
                  <p>
                    {supportsSummerTariff
                      ? t('tariffs.summerReminder')
                      : t('tariffs.summerUnsupported', { tariff: tariffName })}
                  </p>
                  {supportsSummerTariff && (
                    <InfoPopover label={t('form.summerStartInfoLabel')}>
                      {summerStartInfo}
                    </InfoPopover>
                  )}
                </div>
              </aside>
            </div>

            <SeasonBlocksTable
              title={isSummer ? t('tariffs.summerColumn') : t('tariffs.nonSummerColumn')}
              badge={isSummer ? t('tariffs.summerBadge') : t('tariffs.nonSummerBadge')}
              season={displayedSeason}
              scale={allowanceScale}
              rows={seasonReference.blocks}
            />
          </section>

          <section className="card tariff-year-section">
            <button
              type="button"
              className="tariff-year-toggle"
              aria-expanded={yearExpanded}
              aria-controls={yearPanelId}
              onClick={() => setYearExpanded((current) => !current)}
            >
              <span>
                {yearExpanded
                  ? t('tariffs.hideFullYear', { year: selectedYear })
                  : t('tariffs.showFullYear', { year: selectedYear })}
              </span>
              <span className="tariff-year-toggle-icon" aria-hidden="true">
                {yearExpanded ? '▾' : '▸'}
              </span>
            </button>

            {yearExpanded && (
              <div id={yearPanelId} className="tariff-year-panel">
                <h2>
                  {t('tariffs.yearTitle', { year: selectedYear, season: seasonLabel })}
                </h2>
                <p className="meta">{t('tariffs.yearHelp')}</p>
                <div className="table-wrap">
                  <table className="tariff-year-table">
                    <thead>
                      <tr>
                        <th scope="col">{t('tariffs.monthColumn')}</th>
                        {yearBlockKeys.map((key) => (
                          <th key={key} scope="col">
                            {blockLabel(key as BlockKey, language)}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {yearMatrix.map((row) => (
                        <tr key={row.month}>
                          <th scope="row">{formatMonthLabel(row.month, language)}</th>
                          {yearBlockKeys.map((key) => (
                            <td key={key}>
                              {formatRateCell(row.rates[key], language, unavailable)}
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </section>
        </>
      )}

      {mode === 'dac' && (
        <section className="card tariff-dac-panel">
          <div className="tariff-dac-panel-header">
            <h2>{t('tariffs.dacPanelTitle')}</h2>
            <InfoPopover label={t('form.dacInfoLabel')}>
              {t('form.dacInfoDescriptionAlreadyDac')}
            </InfoPopover>
          </div>

          <div className="tariff-dac-controls">
            <div className="tariff-controls-select">
              <p>{t('tariffs.dacPanelIntro')}</p>
              <label htmlFor={regionFieldId} className="tariff-select-field">
                <span className="tariff-select-field-label">
                  {t('tariffs.regionLabel')}
                </span>
                <select
                  id={regionFieldId}
                  className="tariff-select"
                  value={regionId}
                  onChange={(event) => setRegionId(event.target.value)}
                >
                  {dacRegions.map((region) => (
                    <option key={region.regionId} value={region.regionId}>
                      {region.regionName}
                    </option>
                  ))}
                </select>
              </label>
            </div>
            {dataStatusPanel}
          </div>

          <h2 className="tariff-month-heading">
            <span className="tariff-month-heading-prefix">
              {t('tariffs.monthDetailPrefix')}
            </span>
            <span className="tariff-month-nav">
              <label className="tariff-month-picker" htmlFor={monthNavFieldId}>
                <span className="visually-hidden">{t('tariffs.monthNavLabel')}</span>
                <select
                  id={monthNavFieldId}
                  className="tariff-month-picker-select"
                  value={month}
                  onChange={(event) =>
                    setMonth(Number(event.target.value) as MonthNumber)
                  }
                >
                  {dacMonths.map((value) => (
                    <option key={value} value={value}>
                      {formatMonthLabel(value, language)}
                    </option>
                  ))}
                </select>
              </label>
              <button
                type="button"
                className="tariff-month-nav-button"
                aria-label={t('tariffs.previousMonth')}
                onClick={() =>
                  setMonth((current) => stepAvailableMonth(current, -1, dacMonths))
                }
              >
                <span aria-hidden="true">‹</span>
              </button>
              <button
                type="button"
                className="tariff-month-nav-button"
                aria-label={t('tariffs.nextMonth')}
                onClick={() =>
                  setMonth((current) => stepAvailableMonth(current, 1, dacMonths))
                }
              >
                <span aria-hidden="true">›</span>
              </button>
            </span>
            <span className="tariff-year-picker-group">
              <label className="tariff-month-picker" htmlFor={yearFieldId}>
                <span className="visually-hidden">{t('tariffs.yearLabel')}</span>
                <select
                  id={yearFieldId}
                  className="tariff-month-picker-select tariff-year-picker-select"
                  value={selectedYear}
                  aria-describedby={
                    availableYears.length === 1 ? yearAvailabilityId : undefined
                  }
                  onChange={(event) => setSelectedYear(Number(event.target.value))}
                >
                  {availableYears.map((year) => (
                    <option key={year} value={year}>
                      {year}
                    </option>
                  ))}
                </select>
              </label>
              {availableYears.length === 1 && (
                <span id={yearAvailabilityId} className="meta tariff-year-availability">
                  {t('tariffs.yearHelpSelect')}
                </span>
              )}
            </span>
          </h2>

          <div className="tariff-dac-stats">
            <div>
              <span>{t('tariffs.dacFixed')}</span>
              <strong>{formatMoney(dacRegion.fixedCharge, language)}</strong>
            </div>
            <div>
              <span>{t('tariffs.dacEnergySummer')}</span>
              <strong>{formatMoneyRate(dacRegion.energySummer, language)}/kWh</strong>
            </div>
            <div>
              <span>{t('tariffs.dacEnergyNonSummer')}</span>
              <strong>
                {dacRegion.energyNonSummer == null
                  ? t('tariffs.rateUnavailable')
                  : `${formatMoneyRate(dacRegion.energyNonSummer, language)}/kWh`}
              </strong>
            </div>
          </div>
          <p>{t('tariffs.dacNoBlocks')}</p>
          <p>{t('tariffs.dacReturnHint')}</p>
        </section>
      )}

      <section className="card sources">
        <h2>{t('tariffs.sourcesTitle')}</h2>
        <ul>
          <li>
            <a href={snapshotMeta.sourceUrl} target="_blank" rel="noreferrer">
              {t('tariffs.sourcePortal')}
            </a>
          </li>
          <li>
            <a href={snapshotMeta.agreementsUrl} target="_blank" rel="noreferrer">
              {t('tariffs.sourceAgreements')}
            </a>
          </li>
          <li>
            <a href={snapshotMeta.dacUrl} target="_blank" rel="noreferrer">
              {t('tariffs.sourceDac')}
            </a>
          </li>
          <li>
            <a href={snapshotMeta.manualUrl} target="_blank" rel="noreferrer">
              {t('tariffs.sourceManual')}
            </a>
          </li>
        </ul>

        <h3>{t('tariffs.limitationsTitle')}</h3>
        <ul>
          <li>{t('tariffs.limitation1')}</li>
          <li>{t('tariffs.limitation2')}</li>
          <li>{t('tariffs.limitation3')}</li>
        </ul>
      </section>

      <div className="tariff-page-actions">
        <button type="button" className="primary" onClick={() => onNavigate('calculator')}>
          {t('tariffs.backToCalculator')}
        </button>
      </div>

      {!compact && (
        <footer className="page-footer">
          <p>{t('app.footer')}</p>
        </footer>
      )}
    </div>
  )
}
