import { readFileSync } from 'node:fs'
import { mkdtemp, readFile, rm } from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'
import { afterEach, describe, expect, it } from 'vitest'
import { runMonitor } from './runMonitor.ts'

const fixturesDir = path.join(import.meta.dirname, 'fixtures')
const tempDirs: string[] = []

afterEach(async () => {
  await Promise.all(tempDirs.splice(0).map((dir) => rm(dir, { recursive: true, force: true })))
})

function fixture(name: string): string {
  return readFileSync(path.join(fixturesDir, name), 'utf8')
}

function mockFetch(mapping: Record<string, string | null>): typeof fetch {
  return (async (input: RequestInfo | URL) => {
    const url = String(input)
    const key = Object.keys(mapping).find((candidate) => url.includes(candidate))
    if (!key || mapping[key] == null) {
      return new Response('missing', { status: 500 })
    }
    return new Response(fixture(mapping[key]!), { status: 200 })
  }) as typeof fetch
}

describe('runMonitor', () => {
  it('writes a no_changes report for matching fixtures', async () => {
    const outputDir = await mkdtemp(path.join(os.tmpdir(), 'cfe-monitor-'))
    tempDirs.push(outputDir)
    const report = await runMonitor({
      outputDir,
      fetchImpl: mockFetch({
        AcuerdosCasa: 'agreements-healthy.html',
        TarifaDAC: 'dac-august.html',
        Tarifa1B: 'tarifa1b.html',
        Tarifa1: 'tarifa1.html',
      }),
      checkedAt: '2026-07-17T12:00:00.000Z',
    })
    expect(report.result).toBe('no_changes')
    const saved = JSON.parse(await readFile(path.join(outputDir, 'report.json'), 'utf8'))
    expect(saved.result).toBe('no_changes')
  })

  it('writes rates_found when September DAC is ahead of the repo', async () => {
    const outputDir = await mkdtemp(path.join(os.tmpdir(), 'cfe-monitor-'))
    tempDirs.push(outputDir)
    const report = await runMonitor({
      outputDir,
      fetchImpl: mockFetch({
        AcuerdosCasa: 'agreements-september-dac.html',
        TarifaDAC: 'dac-september.html',
        Tarifa1B: 'tarifa1b.html',
        Tarifa1: 'tarifa1.html',
      }),
    })
    expect(report.result).toBe('rates_found')
    expect(report.findings.some((f) => f.code === 'dac_month_ahead')).toBe(true)
  })

  it('writes unable_to_check on HTTP failures', async () => {
    const outputDir = await mkdtemp(path.join(os.tmpdir(), 'cfe-monitor-'))
    tempDirs.push(outputDir)
    const report = await runMonitor({
      outputDir,
      fetchImpl: mockFetch({}),
    })
    expect(report.result).toBe('unable_to_check')
    expect(report.findings.every((f) => f.kind === 'fetch_error')).toBe(true)
  })
})
