import { useEffect, useId, useRef, type CSSProperties } from 'react'
import { createPortal } from 'react-dom'
import { useI18n, type MessageKey } from '../i18n'

export type BillExampleKey =
  | 'tariff'
  | 'previousCutoffDate'
  | 'previousReading'
  | 'dacHistoryNewest'
  | 'dacHistoryOlder'

/** Midpoint (%) of each kWh history row on CFE-Example2.png (1-based lines 1–11). */
export const DAC_HISTORY_LINE_MIDS_PERCENT = [
  17.02, 21.74, 27.33, 32.78, 38.36, 43.82, 49.34, 54.85, 60.37, 65.82, 71.34,
] as const

export const DAC_HISTORY_LINE_COUNT = DAC_HISTORY_LINE_MIDS_PERCENT.length

interface BillExampleMeta {
  titleKey: MessageKey
  descriptionKey: MessageKey
  imageAltKey: MessageKey
  highlightLabelKey: MessageKey
  imageSet: 'example1' | 'example1Desktop' | 'example2'
}

const EXAMPLES: Record<BillExampleKey, BillExampleMeta> = {
  tariff: {
    titleKey: 'example.tariff.title',
    descriptionKey: 'example.tariff.description',
    imageAltKey: 'example.tariff.alt',
    highlightLabelKey: 'example.tariff.highlight',
    imageSet: 'example1',
  },
  previousCutoffDate: {
    titleKey: 'example.previousCutoffDate.title',
    descriptionKey: 'example.previousCutoffDate.description',
    imageAltKey: 'example.previousCutoffDate.alt',
    highlightLabelKey: 'example.previousCutoffDate.highlight',
    imageSet: 'example1',
  },
  previousReading: {
    titleKey: 'example.previousReading.title',
    descriptionKey: 'example.previousReading.description',
    imageAltKey: 'example.previousReading.alt',
    highlightLabelKey: 'example.previousReading.highlight',
    imageSet: 'example1',
  },
  dacHistoryNewest: {
    titleKey: 'example.dacHistoryNewest.title',
    descriptionKey: 'example.dacHistoryNewest.description',
    imageAltKey: 'example.dacHistoryNewest.alt',
    highlightLabelKey: 'example.dacHistoryNewest.highlight',
    imageSet: 'example1Desktop',
  },
  dacHistoryOlder: {
    titleKey: 'example.dacHistoryOlder.title',
    descriptionKey: 'example.dacHistoryOlder.description',
    imageAltKey: 'example.dacHistoryOlder.alt',
    highlightLabelKey: 'example.dacHistoryOlder.highlight',
    imageSet: 'example2',
  },
}

function publicAsset(fileName: string): string {
  const base = import.meta.env.BASE_URL
  const normalized = base.endsWith('/') ? base : `${base}/`
  return `${normalized}${fileName}`
}

export interface ActiveBillExample {
  exampleKey: BillExampleKey
  /** 1-based kWh history row when exampleKey is dacHistoryOlder. */
  historyLine?: number
}

interface Props {
  example: ActiveBillExample | null
  onClose: () => void
}

export function BillExampleDialog({ example, onClose }: Props) {
  const { t } = useI18n()
  const titleId = useId()
  const descriptionId = useId()
  const closeButtonRef = useRef<HTMLButtonElement>(null)
  const open = example !== null
  const exampleKey = example?.exampleKey ?? null
  const meta = exampleKey ? EXAMPLES[exampleKey] : null
  const historyLine =
    exampleKey === 'dacHistoryOlder' && example?.historyLine != null
      ? Math.min(Math.max(1, Math.round(example.historyLine)), DAC_HISTORY_LINE_COUNT)
      : null
  const historyLineMid =
    historyLine != null ? DAC_HISTORY_LINE_MIDS_PERCENT[historyLine - 1] : null

  useEffect(() => {
    if (!open) return

    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    closeButtonRef.current?.focus()

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        event.preventDefault()
        onClose()
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => {
      document.body.style.overflow = previousOverflow
      window.removeEventListener('keydown', handleKeyDown)
    }
  }, [open, onClose])

  if (!open || !meta || !exampleKey) return null

  const description =
    exampleKey === 'dacHistoryOlder' && historyLine != null
      ? t('example.dacHistoryOlder.descriptionLine', { line: historyLine })
      : t(meta.descriptionKey)
  const highlightLabel =
    exampleKey === 'dacHistoryOlder' && historyLine != null
      ? t('example.dacHistoryOlder.highlightLine', { line: historyLine })
      : t(meta.highlightLabelKey)

  const content = {
    title: t(meta.titleKey),
    description,
    imageAlt: t(meta.imageAltKey),
    highlightLabel,
    imageSet: meta.imageSet,
  }

  const historyMarkerStyle =
    historyLineMid != null
      ? ({ '--history-line-mid': String(historyLineMid) } as CSSProperties)
      : undefined

  return createPortal(
    <div className="bill-example-root" role="presentation">
      <button
        type="button"
        className="bill-example-backdrop"
        aria-label={t('example.closeBackdrop')}
        onClick={onClose}
      />
      <div
        className="bill-example-dialog"
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={descriptionId}
      >
        <header className="bill-example-header">
          <div>
            <h2 id={titleId}>{content.title}</h2>
            <p id={descriptionId}>{content.description}</p>
          </div>
          <button
            ref={closeButtonRef}
            type="button"
            className="bill-example-close"
            onClick={onClose}
            aria-label={t('example.close')}
          >
            <svg viewBox="0 0 20 20" aria-hidden="true" focusable="false">
              <path
                d="M5.3 5.3a1 1 0 0 1 1.4 0L10 8.6l3.3-3.3a1 1 0 1 1 1.4 1.4L11.4 10l3.3 3.3a1 1 0 0 1-1.4 1.4L10 11.4l-3.3 3.3a1 1 0 0 1-1.4-1.4L8.6 10 5.3 6.7a1 1 0 0 1 0-1.4Z"
                fill="currentColor"
              />
            </svg>
          </button>
        </header>

        <div
          className={`bill-example-figure bill-example-figure--${content.imageSet}`}
          style={historyMarkerStyle}
        >
          {content.imageSet === 'example1' ? (
            <picture>
              <source
                media="(min-width: 720px)"
                srcSet={publicAsset('CFE-Example1-Desktop.png')}
              />
              <img
                src={publicAsset('CFE-Example1-Mobile.png')}
                alt={content.imageAlt}
                className="bill-example-image"
              />
            </picture>
          ) : content.imageSet === 'example1Desktop' ? (
            <img
              src={publicAsset('CFE-Example1-Desktop.png')}
              alt={content.imageAlt}
              className="bill-example-image"
            />
          ) : (
            <img
              src={publicAsset('CFE-Example2.png')}
              alt={content.imageAlt}
              className="bill-example-image"
            />
          )}
          <div
            className={`bill-example-highlight bill-example-highlight--${exampleKey}`}
            data-testid={`bill-example-highlight-${exampleKey}`}
            role="img"
            aria-label={content.highlightLabel}
          />
          {historyLine != null && (
            <div
              className="bill-example-history-marker"
              data-testid="bill-example-history-marker"
              data-history-line={historyLine}
              aria-hidden="true"
            />
          )}
        </div>
      </div>
    </div>,
    document.body,
  )
}

interface InfoButtonProps {
  exampleKey: BillExampleKey
  label: string
  onOpen: (example: ActiveBillExample) => void
  historyLine?: number
  /** Document-only icon for the newest bill value; history uses document + magnifier. */
  iconVariant?: 'bill' | 'history'
}

function BillIcon() {
  return (
    <svg viewBox="0 0 20 20" aria-hidden="true" focusable="false">
      <path
        d="M5 2.75h6.25L15.5 7v10.25H5V2.75Z"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinejoin="round"
      />
      <path
        d="M11.25 2.75V7H15.5M7.25 10.25h5.5M7.25 13h5.5"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}

function HistoryIcon() {
  return (
    <svg viewBox="0 0 20 20" aria-hidden="true" focusable="false">
      <path
        d="M4.25 2.75h6.5l3.5 3.5v3.1M10.75 2.75v3.5h3.5M8.75 16.75h-4.5v-14"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <circle
        cx="12.25"
        cy="12.25"
        r="3.25"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
      />
      <path
        d="m14.65 14.65 2.6 2.6"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
    </svg>
  )
}

export function BillExampleInfoButton({
  exampleKey,
  label,
  onOpen,
  historyLine,
  iconVariant = 'history',
}: InfoButtonProps) {
  return (
    <button
      type="button"
      className="bill-example-info"
      aria-label={label}
      title={label}
      onClick={(event) => {
        event.preventDefault()
        event.stopPropagation()
        onOpen(
          historyLine != null ? { exampleKey, historyLine } : { exampleKey },
        )
      }}
    >
      {iconVariant === 'bill' ? <BillIcon /> : <HistoryIcon />}
    </button>
  )
}
