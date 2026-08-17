import { classifyResult, compareToBaseline, validateStructure } from './compare.ts'
import { fetchPage } from './fetch.ts'
import {
  parseAgreementsPage,
  parseDacPage,
  parseTarifa1BPage,
  parseTarifa1Page,
} from './parsePages.ts'
import { buildReport, writeReportArtifacts } from './report.ts'
import { loadRepoBaseline } from './repoBaseline.ts'
import type { Finding, LiveExtract, MonitorReport, PageFetchResult } from './types.ts'

export async function runMonitor(options: {
  outputDir?: string
  fetchImpl?: typeof fetch
  checkedAt?: string
}): Promise<MonitorReport> {
  const outputDir = options.outputDir ?? 'artifacts/cfe-monitor'
  const repo = loadRepoBaseline()
  const urls = [
    { key: 'agreements' as const, url: repo.agreementsUrl },
    { key: 'dac' as const, url: repo.dacUrl },
    { key: 'tarifa1' as const, url: repo.tarifa1Url },
    { key: 'tarifa1b' as const, url: repo.tarifa1bUrl },
  ]

  const fetches: Record<(typeof urls)[number]['key'], PageFetchResult> = {
    agreements: { url: repo.agreementsUrl, ok: false, error: 'not fetched' },
    dac: { url: repo.dacUrl, ok: false, error: 'not fetched' },
    tarifa1: { url: repo.tarifa1Url, ok: false, error: 'not fetched' },
    tarifa1b: { url: repo.tarifa1bUrl, ok: false, error: 'not fetched' },
  }

  const findings: Finding[] = []

  for (const item of urls) {
    const result = await fetchPage(item.url, { fetchImpl: options.fetchImpl })
    fetches[item.key] = result
    if (!result.ok || !result.html) {
      findings.push({
        kind: 'fetch_error',
        code: `fetch_${item.key}`,
        summary: `Failed to fetch ${item.url}: ${result.error ?? `HTTP ${result.status}`}`,
        clearBy: 'Retry later or investigate CFE portal availability / network blocking.',
        sourceUrl: item.url,
      })
    }
  }

  const pages = Object.values(fetches).map((page) => ({
    url: page.url,
    ok: page.ok,
    status: page.status,
    error: page.error,
  }))

  if (findings.some((finding) => finding.kind === 'fetch_error')) {
    const report = buildReport({
      checkedAt: options.checkedAt,
      repo,
      pages,
      findings,
    })
    await writeReportArtifacts(report, outputDir)
    return report
  }

  let live: LiveExtract
  try {
    live = {
      agreements: parseAgreementsPage(fetches.agreements.html!),
      dac: parseDacPage(fetches.dac.html!),
      tarifa1: parseTarifa1Page(fetches.tarifa1.html!),
      tarifa1b: parseTarifa1BPage(fetches.tarifa1b.html!),
    }
  } catch (error) {
    findings.push({
      kind: 'fetch_error',
      code: 'parse_crash',
      summary: `Parser crashed: ${error instanceof Error ? error.message : String(error)}`,
      clearBy: 'Fix scripts/cfe-monitor parsers and fixtures.',
    })
    const report = buildReport({
      checkedAt: options.checkedAt,
      repo,
      pages,
      findings,
    })
    await writeReportArtifacts(report, outputDir)
    return report
  }

  const structureFindings = validateStructure(live)
  findings.push(...structureFindings)

  if (classifyResult(structureFindings) !== 'unable_to_check') {
    findings.push(...compareToBaseline(live, repo))
  }

  const report = buildReport({
    checkedAt: options.checkedAt,
    repo,
    pages,
    findings,
  })
  await writeReportArtifacts(report, outputDir)
  return report
}
