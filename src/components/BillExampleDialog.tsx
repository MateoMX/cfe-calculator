import { useEffect, useId, useRef } from 'react'
import { createPortal } from 'react-dom'

export type BillExampleKey =
  | 'tariff'
  | 'previousCutoffDate'
  | 'previousReading'
  | 'dacHistory'

interface BillExampleContent {
  title: string
  description: string
  imageAlt: string
  highlightLabel: string
  imageSet: 'example1' | 'example2'
}

const EXAMPLES: Record<BillExampleKey, BillExampleContent> = {
  tariff: {
    title: 'Dónde está la tarifa',
    description:
      'En tu aviso-recibo busca la línea “TARIFA”. Ahí aparece el código (por ejemplo 1B) que debes seleccionar en este formulario.',
    imageAlt: 'Ejemplo de recibo CFE con la tarifa resaltada',
    highlightLabel: 'Tarifa impresa en el recibo',
    imageSet: 'example1',
  },
  previousCutoffDate: {
    title: 'Dónde está la fecha de la última lectura',
    description:
      'Busca “PERIODO FACTURADO”. La fecha final del periodo es la del último corte o lectura del recibo anterior; úsala como fecha de corte previo.',
    imageAlt: 'Ejemplo de recibo CFE con la fecha de última lectura resaltada',
    highlightLabel: 'Fecha de la última lectura',
    imageSet: 'example1',
  },
  previousReading: {
    title: 'Dónde está la lectura anterior',
    description:
      'En la tabla de consumo, la columna “Lectura actual” del recibo anterior es la lectura del medidor al corte. Captúrala aquí como lectura anterior.',
    imageAlt: 'Ejemplo de recibo CFE con la lectura actual del medidor resaltada',
    highlightLabel: 'Lectura del medidor al corte',
    imageSet: 'example1',
  },
  dacHistory: {
    title: 'Dónde está el historial de consumo',
    description:
      'En el historial del aviso-recibo usa la columna “kWh”. Para un ciclo bimestral captura los 6 consumos más recientes (el de arriba es el más nuevo).',
    imageAlt: 'Ejemplo de historial CFE con la columna de kWh resaltada',
    highlightLabel: 'Consumos previos en kWh',
    imageSet: 'example2',
  },
}

function publicAsset(fileName: string): string {
  const base = import.meta.env.BASE_URL
  const normalized = base.endsWith('/') ? base : `${base}/`
  return `${normalized}${fileName}`
}

interface Props {
  exampleKey: BillExampleKey | null
  onClose: () => void
}

export function BillExampleDialog({ exampleKey, onClose }: Props) {
  const titleId = useId()
  const descriptionId = useId()
  const closeButtonRef = useRef<HTMLButtonElement>(null)
  const open = exampleKey !== null
  const content = exampleKey ? EXAMPLES[exampleKey] : null

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

  if (!open || !content || !exampleKey) return null

  return createPortal(
    <div className="bill-example-root" role="presentation">
      <button
        type="button"
        className="bill-example-backdrop"
        aria-label="Cerrar ejemplo del recibo"
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
            aria-label="Cerrar"
          >
            <svg viewBox="0 0 20 20" aria-hidden="true" focusable="false">
              <path
                d="M5.3 5.3a1 1 0 0 1 1.4 0L10 8.6l3.3-3.3a1 1 0 1 1 1.4 1.4L11.4 10l3.3 3.3a1 1 0 0 1-1.4 1.4L10 11.4l-3.3 3.3a1 1 0 0 1-1.4-1.4L8.6 10 5.3 6.7a1 1 0 0 1 0-1.4Z"
                fill="currentColor"
              />
            </svg>
          </button>
        </header>

        <div className={`bill-example-figure bill-example-figure--${content.imageSet}`}>
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
        </div>
      </div>
    </div>,
    document.body,
  )
}

interface InfoButtonProps {
  exampleKey: BillExampleKey
  label: string
  onOpen: (exampleKey: BillExampleKey) => void
}

export function BillExampleInfoButton({ exampleKey, label, onOpen }: InfoButtonProps) {
  return (
    <button
      type="button"
      className="bill-example-info"
      aria-label={label}
      title={label}
      onClick={(event) => {
        event.preventDefault()
        event.stopPropagation()
        onOpen(exampleKey)
      }}
    >
      <svg viewBox="0 0 20 20" aria-hidden="true" focusable="false">
        <circle cx="10" cy="10" r="8.25" fill="none" stroke="currentColor" strokeWidth="1.5" />
        <circle cx="10" cy="6.25" r="1.15" fill="currentColor" />
        <path
          d="M10 9.1v5.2"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.7"
          strokeLinecap="round"
        />
      </svg>
    </button>
  )
}
