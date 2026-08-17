import { mkdir, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { classifyResult } from './compare.ts'
import type { Finding, MonitorReport, RepoBaseline } from './types.ts'

export function buildReport(input: {
  checkedAt?: string
  repo: RepoBaseline
  pages: MonitorReport['pages']
  findings: Finding[]
}): MonitorReport {
  return {
    result: classifyResult(input.findings),
    checkedAt: input.checkedAt ?? new Date().toISOString(),
    repo: {
      asOf: input.repo.asOf,
      years: input.repo.years,
      latestDacYear: input.repo.latestDacYear,
      latestDacMonth: input.repo.latestDacMonth,
    },
    pages: input.pages,
    findings: input.findings,
  }
}

export function formatReportMarkdown(report: MonitorReport): string {
  const lines: string[] = [
    `# CFE data watch report`,
    '',
    `- Result: **${report.result}**`,
    `- Checked at: ${report.checkedAt}`,
    `- Repo asOf: ${report.repo.asOf}`,
    `- Repo years: ${report.repo.years.join(', ')}`,
    `- Latest DAC in repo: ${report.repo.latestDacYear}-${String(report.repo.latestDacMonth).padStart(2, '0')}`,
    '',
    '## Pages',
    '',
  ]

  for (const page of report.pages) {
    const status = page.ok ? `ok${page.status != null ? ` (${page.status})` : ''}` : `FAILED${page.error ? `: ${page.error}` : ''}`
    lines.push(`- ${page.url} — ${status}`)
  }

  lines.push('', '## Findings', '')
  if (report.findings.length === 0) {
    lines.push('- None. Live CFE markers match the committed baseline and expected structure.')
  } else {
    for (const finding of report.findings) {
      lines.push(`- **${finding.kind}** \`${finding.code}\`: ${finding.summary}`)
      lines.push(`  - Clear by: ${finding.clearBy}`)
      if (finding.sourceUrl) lines.push(`  - Source: ${finding.sourceUrl}`)
    }
  }

  lines.push('')
  return lines.join('\n')
}

export async function writeReportArtifacts(
  report: MonitorReport,
  outputDir: string,
): Promise<{ jsonPath: string; markdownPath: string }> {
  await mkdir(outputDir, { recursive: true })
  const jsonPath = path.join(outputDir, 'report.json')
  const markdownPath = path.join(outputDir, 'report.md')
  await writeFile(jsonPath, `${JSON.stringify(report, null, 2)}\n`, 'utf8')
  await writeFile(markdownPath, formatReportMarkdown(report), 'utf8')
  return { jsonPath, markdownPath }
}
