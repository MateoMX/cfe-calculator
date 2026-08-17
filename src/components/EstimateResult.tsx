import { forwardRef } from 'react'
import { TARIFF_SNAPSHOT_META } from '../data/tariffs'
import { shouldMinimizeDacRisk } from '../domain/billing'
import type { DacRisk, FullEstimate } from '../domain/types'
import { formatKwh, formatMoney, useI18n } from '../i18n'
import { DailyAllowanceChart } from './DailyAllowanceChart'
import { InfoPopover } from './InfoPopover'

interface Props {
  estimate: FullEstimate
  expertMode: boolean
}

function dacPanelTone(status: DacRisk['status'], minimized: boolean): string {
  if (minimized) return 'dac-risk-panel--ok'
  if (status === 'above_limit' || status === 'already_dac') return 'dac-risk-panel--alert'
  if (status === 'projected_crossing' || status === 'incomplete_history') return 'dac-risk-panel--warn'
  return 'dac-risk-panel--ok'
}

function DacOfficialLink() {
  const { t } = useI18n()
  const [before = '', after = ''] = t('result.dacOfficialLink', {
    link: '___',
  }).split('___')

  return (
    <>
      {before}
      <a href={TARIFF_SNAPSHOT_META.dacUrl} target="_blank" rel="noreferrer">
        {t('result.dacOfficialLinkLabel')}
      </a>
      {after}
    </>
  )
}

function DacRiskPanel({ dacRisk, expertMode }: { dacRisk: DacRisk; expertMode: boolean }) {
  const { language, t } = useI18n()
  const minimized = shouldMinimizeDacRisk(dacRisk, expertMode)
  const message = minimized
    ? t('dac.minimizedMessage', {
        pace:
          dacRisk.currentMonthlyPaceKwh != null
            ? formatKwh(dacRisk.currentMonthlyPaceKwh, language, 1)
            : '—',
        limit: dacRisk.limitKwhMonth,
      })
    : dacRisk.message
  const [summary, ...explanation] = message.split('\n\n')

  return (
    <section
      className={`dac-risk-panel ${dacPanelTone(dacRisk.status, minimized)}${
        minimized ? ' dac-risk-panel--minimized' : ''
      }`}
      aria-live="polite"
    >
      <h3>{t('result.dacTitle')}</h3>
      <p className="dac-risk-summary">{summary}</p>
      {explanation.map((paragraph) => (
        <p key={paragraph} className="dac-risk-explain">
          {paragraph}
        </p>
      ))}
      {minimized && <p className="dac-risk-hint">{t('dac.minimizedHint')}</p>}

      {dacRisk.status !== 'already_dac' && (
        <div className="dac-risk-stats">
          <div>
            <span>{t('result.dacLimit')}</span>
            <strong>{t('result.dacLimitValue', { limit: dacRisk.limitKwhMonth })}</strong>
          </div>
          {!minimized && (
            <div>
              <span>{t('result.dacHistoryCaptured')}</span>
              <strong>
                {t('result.dacHistoryValue', {
                  provided: dacRisk.providedHistorySlots,
                  required: dacRisk.requiredHistorySlots,
                })}
              </strong>
            </div>
          )}
          {dacRisk.averageMonthlyKwh != null && (
            <div>
              <span>{t('result.dacAvg12')}</span>
              <strong>
                {t('result.dacAvgValue', {
                  kwh: formatKwh(dacRisk.averageMonthlyKwh, language),
                })}
              </strong>
            </div>
          )}
          {dacRisk.currentMonthlyPaceKwh != null && (
            <div>
              <span>{t('result.dacCurrentPace')}</span>
              <strong>
                {t('result.dacAvgValue', {
                  kwh: formatKwh(dacRisk.currentMonthlyPaceKwh, language),
                })}
              </strong>
            </div>
          )}
          {dacRisk.projectedNextAverageMonthlyKwh != null && (
            <div>
              <span>{t('result.dacNextAvg')}</span>
              <strong>
                {t('result.dacAvgValue', {
                  kwh: formatKwh(dacRisk.projectedNextAverageMonthlyKwh, language),
                })}
              </strong>
            </div>
          )}
        </div>
      )}

      {minimized ? (
        <p className="dac-risk-more">
          <DacOfficialLink />
        </p>
      ) : (
        <ul className="dac-risk-details">
          {dacRisk.detailParagraphs.map((item) => (
            <li key={item}>{item}</li>
          ))}
          {!expertMode && dacRisk.status === 'incomplete_history' && (
            <li>{t('dac.incompleteEnableExpert')}</li>
          )}
          <li>
            <DacOfficialLink />
          </li>
        </ul>
      )}
    </section>
  )
}

export const EstimateResult = forwardRef<HTMLElement, Props>(function EstimateResult(
  { estimate, expertMode },
  ref,
) {
  const { language, t } = useI18n()
  const { bill, projection, narrative, dacRisk } = estimate
  const money = (value: number) => formatMoney(value, language)
  const kwh = (value: number) => formatKwh(value, language)

  return (
    <section ref={ref} className="card result" aria-live="polite">
      <header className="card-header">
        <h2>{t('result.title')}</h2>
      </header>

      <div className="narrative">
        {narrative.split('\n\n').map((paragraph) => (
          <p key={paragraph.slice(0, 40)}>{paragraph}</p>
        ))}
      </div>

      <div className="stats">
        <div>
          <span>{t('result.observed')}</span>
          <strong>
            {t('result.observedValue', {
              kwh: kwh(projection.observed.consumedKwh),
              days: projection.observed.elapsedDays,
            })}
          </strong>
        </div>
        <div>
          <span>{t('result.dailyAverage')}</span>
          <strong>
            {t('result.dailyAverageValue', {
              kwh: kwh(projection.observed.averageDailyKwh),
            })}
          </strong>
        </div>
        <div>
          <span>{t('result.periodDays')}</span>
          <strong>{projection.billingDays}</strong>
        </div>
        <div>
          <span>{t('result.projected')}</span>
          <strong>{t('result.projectedValue', { kwh: kwh(bill.billedKwh) })}</strong>
        </div>
      </div>

      <DailyAllowanceChart
        comparison={estimate.dailyAllowance}
        tariffCode={estimate.input.tariffCode}
        billingCycle={estimate.input.billingCycle}
      />

      <div className="label-with-info result-season-title">
        <h3>{bill.seasonLabel}</h3>
        {bill.seasonMode === 'mixto' && (
          <InfoPopover label={t('result.mixedInfoLabel')}>
            {t('result.mixedInfoDescription')}
          </InfoPopover>
        )}
      </div>
      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th>{t('result.colConcept')}</th>
              <th>{t('result.colKwh')}</th>
              <th>{t('result.colRate')}</th>
              <th>{t('result.colAmount')}</th>
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
          <dt>{t('result.energySubtotal')}</dt>
          <dd>{money(bill.energySubtotal)}</dd>
        </div>
        {bill.otherCharges > 0 && (
          <div>
            <dt>{t('result.otherCharges')}</dt>
            <dd>{money(bill.otherCharges)}</dd>
          </div>
        )}
        <div>
          <dt>{t('result.iva')}</dt>
          <dd>{money(bill.iva)}</dd>
        </div>
        <div className="grand">
          <dt>{t('result.total')}</dt>
          <dd>{money(bill.total)}</dd>
        </div>
      </dl>

      {bill.minimumApplied && (
        <p className="notice">{t('result.minimumApplied')}</p>
      )}

      <h3>{t('result.assumptions')}</h3>
      <ul>
        {bill.assumptions.map((item) => (
          <li key={item}>{item}</li>
        ))}
      </ul>

      {bill.warnings.length > 0 && (
        <>
          <h3>{t('result.warnings')}</h3>
          <ul className="warnings">
            {bill.warnings.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        </>
      )}

      <DacRiskPanel dacRisk={dacRisk} expertMode={expertMode} />

      <footer className="sources">
        <h3>{t('result.sources')}</h3>
        <ul>
          <li>
            <a href={TARIFF_SNAPSHOT_META.sourceUrl} target="_blank" rel="noreferrer">
              {TARIFF_SNAPSHOT_META.sourceName}
            </a>
          </li>
          <li>
            <a href={TARIFF_SNAPSHOT_META.agreementsUrl} target="_blank" rel="noreferrer">
              {t('result.sourceAgreements')}
            </a>
          </li>
          <li>
            <a href={TARIFF_SNAPSHOT_META.dacUrl} target="_blank" rel="noreferrer">
              {t('result.sourceDac')}
            </a>
          </li>
          <li>
            <a href={TARIFF_SNAPSHOT_META.manualUrl} target="_blank" rel="noreferrer">
              {t('result.sourceManual')}
            </a>
          </li>
        </ul>
      </footer>
    </section>
  )
})
