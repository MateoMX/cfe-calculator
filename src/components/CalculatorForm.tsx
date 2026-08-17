import { useEffect, useId, useRef, useState } from 'react'
import { DAC_REGIONS, DOMESTIC_TARIFFS, TARIFF_OPTIONS } from '../data/tariffs'
import {
  approximateHistoryPeriodRanges,
  daysAgoLabel,
  defaultNextCutoff,
  formatApproximatePeriodHint,
  formatDisplayDate,
  todayISO,
} from '../domain/dates'
import { requiredHistorySlots, resizeHistoryForCycle } from '../domain/estimate'
import type {
  BillingCycle,
  CalculatorInput,
  DomesticTariffCode,
  MonthNumber,
  SummerStartMonth,
  ValidationIssue,
} from '../domain/types'
import { formatMonthLabel, summerStartOptions, tariffOptionLabel, useI18n } from '../i18n'
import {
  BillExampleDialog,
  BillExampleInfoButton,
  type ActiveBillExample,
} from './BillExampleDialog'
import { InfoPopover } from './InfoPopover'

interface Props {
  value: CalculatorInput
  issues: ValidationIssue[]
  expertMode: boolean
  onChange: (next: CalculatorInput) => void
  onSubmit: () => void
  onExpertModeChange: (enabled: boolean) => void
  onCopyShareLink: () => Promise<boolean>
  formId?: string
  showInlineSubmit?: boolean
}

type ShareCopyStatus = 'idle' | 'copied' | 'failed'

function fieldError(issues: ValidationIssue[], field: keyof CalculatorInput): string | undefined {
  return issues.find((issue) => issue.field === field)?.message
}

export function CalculatorForm({
  value,
  issues,
  expertMode,
  onChange,
  onSubmit,
  onExpertModeChange,
  onCopyShareLink,
  formId,
  showInlineSubmit = true,
}: Props) {
  const { language, t } = useI18n()
  const [activeExample, setActiveExample] = useState<ActiveBillExample | null>(null)
  const [shareCopyStatus, setShareCopyStatus] = useState<ShareCopyStatus>('idle')
  const shareStatusResetRef = useRef<number | null>(null)
  const fieldIds = useId()
  const tariffFieldId = `${fieldIds}-tariff`
  const tariffTemperatureId = `${fieldIds}-tariff-temperature`
  const summerStartFieldId = `${fieldIds}-summer-start`
  const summerStartErrorId = `${fieldIds}-summer-start-error`
  const dacRegionFieldId = `${fieldIds}-dac-region`
  const dacRegionErrorId = `${fieldIds}-dac-region-error`
  const previousReadingFieldId = `${fieldIds}-previous-reading`
  const previousReadingErrorId = `${fieldIds}-previous-reading-error`
  const previousCutoffFieldId = `${fieldIds}-previous-cutoff`
  const previousCutoffErrorId = `${fieldIds}-previous-cutoff-error`
  const currentReadingFieldId = `${fieldIds}-current-reading`
  const currentReadingErrorId = `${fieldIds}-current-reading-error`
  const currentReadingDateFieldId = `${fieldIds}-current-reading-date`
  const currentReadingDateErrorId = `${fieldIds}-current-reading-date-error`
  const otherChargesFieldId = `${fieldIds}-other-charges`
  const otherChargesErrorId = `${fieldIds}-other-charges-error`
  const expertPanelId = `${fieldIds}-expert-panel`
  const summerStartError = fieldError(issues, 'summerStartMonth')
  const dacRegionError = fieldError(issues, 'dacRegionId')
  const previousReadingError = fieldError(issues, 'previousReading')
  const previousCutoffError = fieldError(issues, 'previousCutoffDate')
  const currentReadingError = fieldError(issues, 'currentReading')
  const currentReadingDateError = fieldError(issues, 'currentReadingDate')
  const otherChargesError = fieldError(issues, 'optionalOtherCharges')
  const needsSummer = value.tariffCode !== '1'
  const showDacRegion = value.tariffCode === 'DAC'
  const cycleDays = value.billingCycle === 'mensual' ? 30 : 60
  const cycleLabel =
    value.billingCycle === 'mensual'
      ? t('form.cycleWordMensual')
      : t('form.cycleWordBimestral')
  const previousCutoffAgo = daysAgoLabel(value.previousCutoffDate, new Date(), language)
  const todayLabel = t('dates.today')
  const currentReadingIsToday = value.currentReadingDate === todayISO()
  const summerOptions = summerStartOptions(language)
  const summerStart = value.summerStartMonth
  const summerEndMonth =
    summerStart == null
      ? null
      : ((((summerStart - 1 + 5) % 12) + 1) as MonthNumber)
  const selectedDomesticTariff =
    value.tariffCode === 'DAC' ? null : DOMESTIC_TARIFFS[value.tariffCode]
  const tariffTemperatureDescription = (code: DomesticTariffCode) => {
    if (code === 'DAC') return null
    const minimumTemperature = DOMESTIC_TARIFFS[code].minSummerTempC
    return minimumTemperature === null
      ? t('form.tariffTemperatureBelow')
      : t('form.tariffTemperatureAtLeast', { temperature: minimumTemperature })
  }
  const selectedTariffTemperatureDescription = tariffTemperatureDescription(value.tariffCode)
  const dacInfo = selectedDomesticTariff
    ? t('form.dacInfoDescription', {
        tariffName: tariffOptionLabel(selectedDomesticTariff.code, language),
        dacLimit: selectedDomesticTariff.dacLimitKwhMonth,
      })
    : t('form.dacInfoDescriptionAlreadyDac')
  const summerStartInfo = t('form.summerStartInfoDescription', {
    tariffName: tariffOptionLabel(value.tariffCode, language),
  })

  function patch(partial: Partial<CalculatorInput>) {
    onChange({ ...value, ...partial })
  }

  useEffect(() => {
    return () => {
      if (shareStatusResetRef.current != null) {
        window.clearTimeout(shareStatusResetRef.current)
      }
    }
  }, [])

  async function handleCopyShareLink() {
    const ok = await onCopyShareLink()
    setShareCopyStatus(ok ? 'copied' : 'failed')
    if (shareStatusResetRef.current != null) {
      window.clearTimeout(shareStatusResetRef.current)
    }
    shareStatusResetRef.current = window.setTimeout(() => {
      setShareCopyStatus('idle')
      shareStatusResetRef.current = null
    }, 2500)
  }

  return (
    <form
      id={formId}
      className="card form"
      onSubmit={(event) => {
        event.preventDefault()
        onSubmit()
      }}
    >
      <header className="card-header">
        <h2>{t('form.headerTitle')}</h2>
        <p>{t('form.headerBlurb')}</p>
      </header>

      <fieldset>
        <legend>{t('form.legendTariffCycle')}</legend>
        <div className="form-field">
          <div className="field-label-row">
            <span className="label-with-info">
              <label htmlFor={tariffFieldId}>{t('form.tariffLabel')}</label>
              <InfoPopover label={t('form.tariffInfoLabel')}>
                {t('form.tariffInfoDescription')}
              </InfoPopover>
            </span>
            <BillExampleInfoButton
              exampleKey="tariff"
              label={t('form.tariffExample')}
              onOpen={setActiveExample}
            />
          </div>
          <select
            id={tariffFieldId}
            data-field="tariffCode"
            aria-describedby={
              selectedTariffTemperatureDescription ? tariffTemperatureId : undefined
            }
            value={value.tariffCode}
            onChange={(event) => {
              const tariffCode = event.target.value as DomesticTariffCode
              patch({
                tariffCode,
                summerStartMonth:
                  tariffCode === '1' ? null : value.summerStartMonth ?? 4,
              })
            }}
          >
            {TARIFF_OPTIONS.map((option) => (
              <option key={option.code} value={option.code}>
                {tariffOptionLabel(option.code, language)}
              </option>
            ))}
          </select>
          {selectedTariffTemperatureDescription && (
            <small id={tariffTemperatureId} className="tariff-temperature-description">
              {selectedTariffTemperatureDescription}
            </small>
          )}
        </div>

        {needsSummer && (
          <div className="form-field">
            <div className="field-label-row">
              <span className="label-with-info">
                <label htmlFor={summerStartFieldId}>{t('form.summerStartLabel')}</label>
                <InfoPopover label={t('form.summerStartInfoLabel')}>
                  {summerStartInfo}
                </InfoPopover>
              </span>
            </div>
            <select
              id={summerStartFieldId}
              data-field="summerStartMonth"
              aria-invalid={summerStartError ? true : undefined}
              aria-describedby={summerStartError ? summerStartErrorId : undefined}
              value={value.summerStartMonth ?? ''}
              onChange={(event) =>
                patch({
                  summerStartMonth: Number(event.target.value) as SummerStartMonth,
                })
              }
            >
              <option value="">{t('form.selectPlaceholder')}</option>
              {summerOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
            <small>
              {summerStart != null && summerEndMonth != null
                ? t('form.summerStartHelp', {
                    veranoStart: formatMonthLabel(summerStart, language),
                    veranoEnd: formatMonthLabel(summerEndMonth, language),
                  })
                : null}
            </small>
            {summerStartError && (
              <span id={summerStartErrorId} className="error">
                {summerStartError}
              </span>
            )}
          </div>
        )}

        <label>
          {t('form.billingCycleLabel')}
          <select
            value={value.billingCycle}
            onChange={(event) => {
              const billingCycle = event.target.value as BillingCycle
              const nextCutoffDate =
                value.previousCutoffDate
                  ? defaultNextCutoff(value.previousCutoffDate, billingCycle)
                  : value.nextCutoffDate
              patch({
                billingCycle,
                nextCutoffDate,
                historicalPeriodKwh: resizeHistoryForCycle(
                  value.historicalPeriodKwh,
                  billingCycle,
                  value.billingCycle,
                ),
              })
            }}
          >
            <option value="bimestral">{t('form.cycleBimestral')}</option>
            <option value="mensual">{t('form.cycleMensual')}</option>
          </select>
        </label>

        {showDacRegion && (
          <label htmlFor={dacRegionFieldId}>
            {t('form.dacRegionLabel')}
            <select
              id={dacRegionFieldId}
              data-field="dacRegionId"
              aria-invalid={dacRegionError ? true : undefined}
              aria-describedby={dacRegionError ? dacRegionErrorId : undefined}
              value={value.dacRegionId}
              onChange={(event) => patch({ dacRegionId: event.target.value })}
            >
              {DAC_REGIONS.map((region) => (
                <option key={region.regionId} value={region.regionId}>
                  {region.regionName}
                </option>
              ))}
            </select>
            {dacRegionError && (
              <span id={dacRegionErrorId} className="error">
                {dacRegionError}
              </span>
            )}
          </label>
        )}
      </fieldset>

      <fieldset>
        <legend>{t('form.legendReadings')}</legend>
        <div className="form-field">
          <div className="field-label-row">
            <label htmlFor={previousReadingFieldId}>
              {t('form.previousReadingLabel')}
            </label>
            <BillExampleInfoButton
              exampleKey="previousReading"
              label={t('form.previousReadingExample')}
              onOpen={setActiveExample}
            />
          </div>
          <input
            id={previousReadingFieldId}
            data-field="previousReading"
            type="number"
            min={0}
            step={1}
            aria-invalid={previousReadingError ? true : undefined}
            aria-describedby={previousReadingError ? previousReadingErrorId : undefined}
            value={value.previousReading || ''}
            onChange={(event) => patch({ previousReading: Number(event.target.value) })}
          />
          {previousReadingError && (
            <span id={previousReadingErrorId} className="error">
              {previousReadingError}
            </span>
          )}
        </div>

        <div className="form-field">
          <div className="field-label-row">
            <label htmlFor={previousCutoffFieldId}>{t('form.previousCutoffLabel')}</label>
            <BillExampleInfoButton
              exampleKey="previousCutoffDate"
              label={t('form.previousCutoffExample')}
              onOpen={setActiveExample}
            />
          </div>
          <span
            className={
              previousCutoffAgo
                ? previousCutoffAgo === todayLabel
                  ? 'date-field date-field--with-badge'
                  : 'date-field date-field--with-badge-wide'
                : 'date-field'
            }
          >
            <input
              id={previousCutoffFieldId}
              data-field="previousCutoffDate"
              type="date"
              aria-invalid={previousCutoffError ? true : undefined}
              aria-describedby={previousCutoffError ? previousCutoffErrorId : undefined}
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
          {previousCutoffError && (
            <span id={previousCutoffErrorId} className="error">
              {previousCutoffError}
            </span>
          )}
        </div>

        <label htmlFor={currentReadingFieldId}>
          {t('form.currentReadingLabel')}
          <input
            id={currentReadingFieldId}
            data-field="currentReading"
            type="number"
            min={0}
            step={1}
            aria-invalid={currentReadingError ? true : undefined}
            aria-describedby={currentReadingError ? currentReadingErrorId : undefined}
            value={value.currentReading || ''}
            onChange={(event) => patch({ currentReading: Number(event.target.value) })}
          />
          {currentReadingError && (
            <span id={currentReadingErrorId} className="error">
              {currentReadingError}
            </span>
          )}
        </label>

        <label htmlFor={currentReadingDateFieldId}>
          {t('form.currentReadingDateLabel')}
          <span
            className={
              currentReadingIsToday ? 'date-field date-field--with-badge' : 'date-field'
            }
          >
            <input
              id={currentReadingDateFieldId}
              data-field="currentReadingDate"
              type="date"
              aria-invalid={currentReadingDateError ? true : undefined}
              aria-describedby={
                currentReadingDateError ? currentReadingDateErrorId : undefined
              }
              value={value.currentReadingDate}
              onChange={(event) => patch({ currentReadingDate: event.target.value })}
            />
            {currentReadingIsToday && (
              <span className="date-field-badge" aria-hidden="true">
                {todayLabel}
              </span>
            )}
          </span>
          {currentReadingDateError && (
            <span id={currentReadingDateErrorId} className="error">
              {currentReadingDateError}
            </span>
          )}
        </label>

        <div className="cutoff-estimate" aria-live="polite">
          {value.previousCutoffDate ? (
            <>
              <strong>
                {t('form.cutoffEstimateReady', {
                  date: formatDisplayDate(value.nextCutoffDate, language),
                })}
              </strong>
              <small>
                {t('form.cutoffEstimateDetail', {
                  previousDate: formatDisplayDate(value.previousCutoffDate, language),
                  days: cycleDays,
                  cycle: cycleLabel,
                })}
              </small>
            </>
          ) : (
            <small>
              {t('form.cutoffEstimatePending', {
                days: cycleDays,
                cycle: cycleLabel,
              })}
            </small>
          )}
        </div>
      </fieldset>

      <section className="expert-section">
        <div className="expert-section-header">
          <div className="expert-section-title-row">
            <h3 className="expert-section-title">{t('form.expertMode')}</h3>
            <span className="expert-section-hint">{t('form.expertModeHint')}</span>
          </div>
          <div className="expert-section-controls">
            <button
              type="button"
              className={`expert-switch ${expertMode ? 'expert-switch--on' : ''}`}
              role="switch"
              aria-checked={expertMode}
              aria-controls={expertPanelId}
              aria-label={t('form.expertMode')}
              onClick={() => onExpertModeChange(!expertMode)}
            >
              <span className="expert-switch-track" aria-hidden="true">
                <span className="expert-switch-thumb" />
              </span>
            </button>
            <InfoPopover label={t('form.expertModeInfo')}>
              {t('form.expertModeDescription')}
            </InfoPopover>
          </div>
        </div>

        {expertMode && (
          <div id={expertPanelId} className="expert-section-body">
            <label>
              <span className="label-with-info">
                {t('form.otherChargesLabel')}
                <InfoPopover label={t('form.dapInfoLabel')}>
                  {t('form.dapInfoDescription')}
                </InfoPopover>
              </span>
              <input
                id={otherChargesFieldId}
                data-field="optionalOtherCharges"
                type="number"
                min={0}
                step={0.01}
                aria-invalid={otherChargesError ? true : undefined}
                aria-describedby={otherChargesError ? otherChargesErrorId : undefined}
                value={value.optionalOtherCharges || ''}
                onChange={(event) =>
                  patch({ optionalOtherCharges: Number(event.target.value) || 0 })
                }
              />
              {otherChargesError && (
                <span id={otherChargesErrorId} className="error">
                  {otherChargesError}
                </span>
              )}
            </label>

            <div className="history-dac">
              <div className="field-label-row">
                <div className="history-dac-title-row">
                  <h3>{t('form.historyTitle')}</h3>
                  <InfoPopover label={t('form.dacInfoLabel')}>{dacInfo}</InfoPopover>
                </div>
              </div>
              <p className="history-dac-hint">{t('form.historyHintNote')}</p>
              <div
                className={`history-dac-grid ${
                  value.billingCycle === 'mensual'
                    ? 'history-dac-grid--mensual'
                    : 'history-dac-grid--bimestral'
                }`}
                role="group"
                aria-label={
                  value.billingCycle === 'mensual'
                    ? t('form.historyGroupMensual')
                    : t('form.historyGroupBimestral')
                }
              >
                {(() => {
                  const slotCount = requiredHistorySlots(value.billingCycle)
                  const periodRanges = approximateHistoryPeriodRanges(
                    value.previousCutoffDate,
                    value.billingCycle,
                  )
                  return Array.from({ length: slotCount }, (_, index) => {
                    const slotValue = value.historicalPeriodKwh[index]
                    const range = periodRanges?.[index]
                    const rangeHint = range
                      ? formatApproximatePeriodHint(range.startISO, range.endISO, language)
                      : null
                    const historyLine = index
                    const orderLabel =
                      index === 0
                        ? t('form.historySlotNewest')
                        : t('form.historySlotOlder', { line: historyLine })
                    const ariaLabel =
                      index === 0
                        ? rangeHint
                          ? t('form.historySlotNewestAriaWithRange', { range: rangeHint })
                          : t('form.historySlotNewestAria')
                        : rangeHint
                          ? t('form.historySlotOlderAriaWithRange', {
                              line: historyLine,
                              range: rangeHint,
                            })
                          : t('form.historySlotOlderAria', { line: historyLine })
                    const slotInputId = `${fieldIds}-history-${value.billingCycle}-${index}`
                    return (
                      <div
                        key={`history-${value.billingCycle}-${index}`}
                        className="history-dac-slot"
                      >
                        <div className="history-dac-slot-header">
                          <label
                            htmlFor={slotInputId}
                            className="history-dac-slot-label"
                          >
                            <span className="history-dac-slot-order">{orderLabel}</span>
                            {rangeHint && (
                              <span className="history-dac-slot-range">{rangeHint}</span>
                            )}
                          </label>
                          {index === 0 ? (
                            <BillExampleInfoButton
                              exampleKey="dacHistoryNewest"
                              label={t('form.historyNewestExample')}
                              iconVariant="bill"
                              onOpen={setActiveExample}
                            />
                          ) : (
                            <BillExampleInfoButton
                              exampleKey="dacHistoryOlder"
                              label={t('form.historyOlderExampleLine', {
                                line: historyLine,
                              })}
                              historyLine={historyLine}
                              iconVariant="history"
                              onOpen={setActiveExample}
                            />
                          )}
                        </div>
                        <input
                          id={slotInputId}
                          type="number"
                          min={0}
                          step={1}
                          inputMode="numeric"
                          placeholder="kWh"
                          aria-label={ariaLabel}
                          value={slotValue ?? ''}
                          onChange={(event) => {
                            const raw = event.target.value
                            const next = [...value.historicalPeriodKwh]
                            while (next.length < slotCount) {
                              next.push(null)
                            }
                            next[index] =
                              raw === ''
                                ? null
                                : Number.isFinite(Number(raw))
                                  ? Number(raw)
                                  : null
                            patch({ historicalPeriodKwh: next })
                          }}
                        />
                      </div>
                    )
                  })
                })()}
              </div>
            </div>

            <div className="share-link-row">
              <button
                type="button"
                className="share-link-button"
                onClick={() => {
                  void handleCopyShareLink()
                }}
              >
                {t('form.copyShareLink')}
              </button>
              <p className="share-link-hint">{t('form.copyShareLinkHint')}</p>
              <p className="share-link-status" role="status" aria-live="polite">
                {shareCopyStatus === 'copied'
                  ? t('form.copyShareLinkCopied')
                  : shareCopyStatus === 'failed'
                    ? t('form.copyShareLinkFailed')
                    : '\u00a0'}
              </p>
            </div>
          </div>
        )}
      </section>

      {issues.some((issue) => issue.field === 'general') && (
        <p className="error">{issues.find((issue) => issue.field === 'general')?.message}</p>
      )}

      {showInlineSubmit && (
        <button type="submit" className="primary">
          {t('form.submit')}
        </button>
      )}

      <BillExampleDialog example={activeExample} onClose={() => setActiveExample(null)} />
    </form>
  )
}
