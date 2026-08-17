import { afterEach, describe, expect, it, vi } from 'vitest'
import { createEmptyInput } from './domain/estimate'
import type { CalculatorInput } from './domain/types'
import { parseAppView } from './navigation'
import {
  buildShareUrl,
  encodeCalculatorInput,
  hashForCalculatorInput,
  inputHasExpertShareFields,
  parseCalculatorInputFromHash,
  queryFromHash,
  SHARE_LINK_VERSION,
} from './shareLink'

function sampleInput(overrides: Partial<CalculatorInput> = {}): CalculatorInput {
  return {
    ...createEmptyInput(),
    tariffCode: '1C',
    summerStartMonth: 5,
    billingCycle: 'bimestral',
    previousReading: 1000,
    currentReading: 1250.5,
    previousCutoffDate: '2026-06-01',
    currentReadingDate: '2026-07-10',
    nextCutoffDate: '2026-07-31',
    optionalOtherCharges: 42.5,
    dacRegionId: 'noroeste',
    historicalPeriodKwh: [210, null, 180, 0, null, 150],
    ...overrides,
  }
}

describe('shareLink', () => {
  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('round-trips every CalculatorInput field through url-encoded hash params', () => {
    const input = sampleInput()
    const hash = hashForCalculatorInput(input)
    expect(hash.startsWith('#/?')).toBe(true)
    expect(hash).toContain(`v=${SHARE_LINK_VERSION}`)
    expect(hash).toContain('tariff=1C')
    expect(hash).toContain('hist=210%2C%2C180%2C0%2C%2C150')

    const restored = parseCalculatorInputFromHash(hash)
    expect(restored).toEqual(input)
  })

  it('encodes empty history and zero other charges compactly', () => {
    const input = sampleInput({
      optionalOtherCharges: 0,
      historicalPeriodKwh: [null, null, null, null, null, null],
    })
    const params = encodeCalculatorInput(input)
    expect(params.has('other')).toBe(false)
    expect(params.has('hist')).toBe(false)
    expect(parseCalculatorInputFromHash(`#/?${params}`)).toEqual(input)
  })

  it('forces summer null for tariff 1 and restores monthly history length', () => {
    const input = sampleInput({
      tariffCode: '1',
      summerStartMonth: null,
      billingCycle: 'mensual',
      historicalPeriodKwh: Array.from({ length: 12 }, (_, index) => (index % 2 === 0 ? index : null)),
    })
    const restored = parseCalculatorInputFromHash(hashForCalculatorInput(input))
    expect(restored).toEqual(input)
  })

  it('builds an absolute share URL from the current location', () => {
    const url = buildShareUrl(sampleInput(), {
      origin: 'https://example.test',
      pathname: '/cfe/',
      search: '',
    })
    expect(url.startsWith('https://example.test/cfe/#/?')).toBe(true)
    expect(url).toContain('tariff=1C')
  })

  it('returns null for missing version, bad enums, and malformed numbers/dates/history', () => {
    expect(parseCalculatorInputFromHash('#/')).toBeNull()
    expect(parseCalculatorInputFromHash('#/?tariff=1B&cycle=bimestral')).toBeNull()
    expect(parseCalculatorInputFromHash('#/?v=1&tariff=nope&cycle=bimestral')).toBeNull()
    expect(parseCalculatorInputFromHash('#/?v=1&tariff=1B&cycle=weekly')).toBeNull()
    expect(parseCalculatorInputFromHash('#/?v=1&tariff=1B&cycle=bimestral&prev=-1')).toBeNull()
    expect(
      parseCalculatorInputFromHash('#/?v=1&tariff=1B&cycle=bimestral&prevDate=06-01-2026'),
    ).toBeNull()
    expect(
      parseCalculatorInputFromHash('#/?v=1&tariff=1B&cycle=bimestral&dac=moon'),
    ).toBeNull()
    expect(
      parseCalculatorInputFromHash('#/?v=1&tariff=1B&cycle=bimestral&hist=1,2,3,4,5,6,7'),
    ).toBeNull()
    expect(
      parseCalculatorInputFromHash('#/?v=1&tariff=1B&cycle=bimestral&hist=1,x'),
    ).toBeNull()
  })

  it('extracts query strings from calculator hashes without breaking view routing', () => {
    expect(queryFromHash('#/?v=1&tariff=1B&cycle=bimestral')).toBe('v=1&tariff=1B&cycle=bimestral')
    expect(parseAppView('#/?v=1&tariff=1B&cycle=bimestral')).toBe('calculator')
    expect(parseAppView('#/tariffs?ignored=1')).toBe('tariffs')
  })

  it('detects expert-only share fields', () => {
    expect(inputHasExpertShareFields(createEmptyInput())).toBe(false)
    expect(inputHasExpertShareFields(sampleInput({ optionalOtherCharges: 1 }))).toBe(true)
    expect(
      inputHasExpertShareFields(
        sampleInput({
          optionalOtherCharges: 0,
          historicalPeriodKwh: [null, 10, null, null, null, null],
        }),
      ),
    ).toBe(true)
  })
})
