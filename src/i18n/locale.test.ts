import { describe, expect, it } from 'vitest'
import { resolveLanguageFromLocale } from './types'

describe('resolveLanguageFromLocale', () => {
  it('defaults unknown or missing locales to Spanish', () => {
    expect(resolveLanguageFromLocale(null)).toBe('es')
    expect(resolveLanguageFromLocale(undefined)).toBe('es')
    expect(resolveLanguageFromLocale('')).toBe('es')
  })

  it('maps es, it, and pt locales to Spanish', () => {
    expect(resolveLanguageFromLocale('es')).toBe('es')
    expect(resolveLanguageFromLocale('es-MX')).toBe('es')
    expect(resolveLanguageFromLocale('it-IT')).toBe('es')
    expect(resolveLanguageFromLocale('pt-BR')).toBe('es')
  })

  it('maps English and other languages to English', () => {
    expect(resolveLanguageFromLocale('en')).toBe('en')
    expect(resolveLanguageFromLocale('en-GB')).toBe('en')
    expect(resolveLanguageFromLocale('en-US')).toBe('en')
    expect(resolveLanguageFromLocale('fr-FR')).toBe('en')
    expect(resolveLanguageFromLocale('de')).toBe('en')
    expect(resolveLanguageFromLocale('ja-JP')).toBe('en')
  })
})
