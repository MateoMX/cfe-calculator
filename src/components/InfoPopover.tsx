import { useEffect, useId, useLayoutEffect, useRef, useState } from 'react'

const VIEWPORT_MARGIN = 12
const POPOVER_GAP = 8
const POPOVER_MAX_WIDTH = 352

interface Props {
  label: string
  children: string
}

export function InfoPopover({ label, children }: Props) {
  const [open, setOpen] = useState(false)
  const rootRef = useRef<HTMLDivElement>(null)
  const buttonRef = useRef<HTMLButtonElement>(null)
  const panelRef = useRef<HTMLDivElement>(null)
  const panelId = useId()

  useLayoutEffect(() => {
    if (!open) return

    function positionPanel() {
      const button = buttonRef.current
      const panel = panelRef.current
      if (!button || !panel) return

      const buttonRect = button.getBoundingClientRect()
      const availableWidth = Math.max(0, window.innerWidth - VIEWPORT_MARGIN * 2)
      const width = Math.min(POPOVER_MAX_WIDTH, availableWidth)
      const maxHeight = Math.max(0, window.innerHeight - VIEWPORT_MARGIN * 2)

      panel.style.width = `${width}px`
      panel.style.maxHeight = `${maxHeight}px`

      const panelHeight = Math.min(panel.scrollHeight, maxHeight)
      const centeredLeft = buttonRect.left + buttonRect.width / 2 - width / 2
      const left = Math.min(
        Math.max(centeredLeft, VIEWPORT_MARGIN),
        window.innerWidth - width - VIEWPORT_MARGIN,
      )
      const belowTop = buttonRect.bottom + POPOVER_GAP
      const aboveTop = buttonRect.top - POPOVER_GAP - panelHeight
      const fitsBelow = belowTop + panelHeight <= window.innerHeight - VIEWPORT_MARGIN
      const fitsAbove = aboveTop >= VIEWPORT_MARGIN
      const top = fitsBelow
        ? belowTop
        : fitsAbove
          ? aboveTop
          : Math.max(
              VIEWPORT_MARGIN,
              Math.min(belowTop, window.innerHeight - panelHeight - VIEWPORT_MARGIN),
            )

      panel.style.left = `${left}px`
      panel.style.top = `${top}px`
      panel.style.visibility = 'visible'
    }

    positionPanel()
    window.addEventListener('resize', positionPanel)
    window.addEventListener('scroll', positionPanel, true)
    return () => {
      window.removeEventListener('resize', positionPanel)
      window.removeEventListener('scroll', positionPanel, true)
    }
  }, [open, children])

  useEffect(() => {
    if (!open) return

    function handlePointerDown(event: MouseEvent | TouchEvent) {
      const target = event.target as Node | null
      if (target && rootRef.current?.contains(target)) return
      setOpen(false)
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        event.preventDefault()
        setOpen(false)
        buttonRef.current?.focus()
      }
    }

    document.addEventListener('mousedown', handlePointerDown)
    document.addEventListener('touchstart', handlePointerDown)
    window.addEventListener('keydown', handleKeyDown)
    return () => {
      document.removeEventListener('mousedown', handlePointerDown)
      document.removeEventListener('touchstart', handlePointerDown)
      window.removeEventListener('keydown', handleKeyDown)
    }
  }, [open])

  return (
    <div className="info-popover" ref={rootRef}>
      <button
        ref={buttonRef}
        type="button"
        className="bill-example-info"
        aria-label={label}
        title={label}
        aria-expanded={open}
        aria-controls={panelId}
        onClick={(event) => {
          event.preventDefault()
          event.stopPropagation()
          setOpen((current) => !current)
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
      {open && (
        <div
          ref={panelRef}
          id={panelId}
          className="info-popover-panel"
          role="dialog"
          aria-label={label}
        >
          {children.split(/\n{2,}/).map((paragraph) => (
            <p key={paragraph}>{paragraph}</p>
          ))}
        </div>
      )}
    </div>
  )
}
