import { describe, expect, it } from 'vitest'
import { hashForView, parseAppView } from './navigation'

describe('navigation', () => {
  it('parses tariff reference hashes', () => {
    expect(parseAppView('#/tariffs')).toBe('tariffs')
    expect(parseAppView('#tariffs')).toBe('tariffs')
    expect(parseAppView('#/tarifas')).toBe('tariffs')
    expect(parseAppView('')).toBe('calculator')
    expect(parseAppView('#/')).toBe('calculator')
    expect(parseAppView('#/?v=1&tariff=1B&cycle=bimestral')).toBe('calculator')
    expect(parseAppView('#/tariffs?x=1')).toBe('tariffs')
  })

  it('builds stable hashes for views', () => {
    expect(hashForView('tariffs')).toBe('#/tariffs')
    expect(hashForView('calculator')).toBe('#/')
  })
})
