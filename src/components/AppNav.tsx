import { useEffect, useId, useRef, useState } from 'react'
import type { AppView } from '../navigation'
import { useI18n } from '../i18n'

interface Props {
  view: AppView
  onNavigate: (view: AppView) => void
  className?: string
}

export function AppNav({ view, onNavigate, className }: Props) {
  const { t } = useI18n()
  const [open, setOpen] = useState(false)
  const rootRef = useRef<HTMLDivElement>(null)
  const menuId = useId()

  useEffect(() => {
    if (!open) return

    function handlePointerDown(event: MouseEvent) {
      if (!rootRef.current?.contains(event.target as Node)) {
        setOpen(false)
      }
    }
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') setOpen(false)
    }

    window.addEventListener('mousedown', handlePointerDown)
    window.addEventListener('keydown', handleKeyDown)
    return () => {
      window.removeEventListener('mousedown', handlePointerDown)
      window.removeEventListener('keydown', handleKeyDown)
    }
  }, [open])

  function choose(next: AppView) {
    setOpen(false)
    onNavigate(next)
  }

  return (
    <div className={className ? `app-nav ${className}` : 'app-nav'} ref={rootRef}>
      <button
        type="button"
        className="app-nav-trigger"
        aria-haspopup="menu"
        aria-expanded={open}
        aria-controls={menuId}
        aria-label={t('nav.menu')}
        onClick={() => setOpen((value) => !value)}
      >
        <svg viewBox="0 0 20 20" aria-hidden="true" focusable="false">
          <path
            d="M4 6h12M4 10h12M4 14h12"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.8"
            strokeLinecap="round"
          />
        </svg>
      </button>

      {open && (
        <nav id={menuId} className="app-nav-menu" aria-label={t('nav.label')}>
          <button
            type="button"
            role="menuitem"
            className={
              view === 'calculator'
                ? 'app-nav-menu-item app-nav-menu-item--active'
                : 'app-nav-menu-item'
            }
            aria-current={view === 'calculator' ? 'page' : undefined}
            onClick={() => choose('calculator')}
          >
            {t('nav.calculator')}
          </button>
          <button
            type="button"
            role="menuitem"
            className={
              view === 'tariffs'
                ? 'app-nav-menu-item app-nav-menu-item--active'
                : 'app-nav-menu-item'
            }
            aria-current={view === 'tariffs' ? 'page' : undefined}
            onClick={() => choose('tariffs')}
          >
            {t('nav.tariffs')}
          </button>
        </nav>
      )}
    </div>
  )
}
