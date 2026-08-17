import { useEffect, useRef, useState } from 'react'
import { useI18n, type Language } from '../i18n'

function publicAsset(fileName: string): string {
  const base = import.meta.env.BASE_URL
  const normalized = base.endsWith('/') ? base : `${base}/`
  return `${normalized}${fileName}`
}

const LANGUAGE_FLAGS: Record<Language, string> = {
  es: 'flags/mx.svg',
  en: 'flags/gb-eng.svg',
}

export function LanguageSwitcher() {
  const { language, setLanguage, t } = useI18n()
  const [open, setOpen] = useState(false)
  const rootRef = useRef<HTMLDivElement>(null)
  const options: Language[] = ['es', 'en']
  const labelFor = (value: Language) => (value === 'es' ? t('lang.es') : t('lang.en'))

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

  function choose(value: Language) {
    setLanguage(value)
    setOpen(false)
  }

  return (
    <div className="language-switcher" ref={rootRef}>
      <button
        type="button"
        className="language-trigger"
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-label={t('lang.switcherLabel')}
        onClick={() => setOpen((value) => !value)}
      >
        <img
          className="language-flag"
          src={publicAsset(LANGUAGE_FLAGS[language])}
          alt=""
          width={18}
          height={18}
          decoding="async"
        />
        <span className="language-trigger-label">{labelFor(language)}</span>
        <svg className="language-chevron" viewBox="0 0 20 20" aria-hidden="true" focusable="false">
          <path
            d="M5.5 7.5 10 12l4.5-4.5"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.7"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </button>

      {open && (
        <ul className="language-menu" role="listbox" aria-label={t('lang.switcherLabel')}>
          {options.map((value) => (
            <li key={value} role="none">
              <button
                type="button"
                role="option"
                aria-selected={language === value}
                className={`language-menu-item ${
                  language === value ? 'language-menu-item--active' : ''
                }`}
                onClick={() => choose(value)}
              >
                <img
                  className="language-flag"
                  src={publicAsset(LANGUAGE_FLAGS[value])}
                  alt=""
                  width={18}
                  height={18}
                  decoding="async"
                />
                <span>{labelFor(value)}</span>
                {language === value && (
                  <svg
                    className="language-check"
                    viewBox="0 0 20 20"
                    aria-hidden="true"
                    focusable="false"
                  >
                    <path
                      d="m5 10.5 3.2 3.2L15 6.5"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="1.9"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                )}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
