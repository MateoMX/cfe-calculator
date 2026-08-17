import type { MonitorReport } from './types.ts'

export interface EmailContent {
  subject: string
  text: string
}

export function buildEmailContent(
  report: MonitorReport,
  options: {
    workflowRunUrl?: string
    artifactName?: string
  } = {},
): EmailContent {
  const subject = subjectForResult(report)
  const lines: string[] = [
    subject,
    '',
    `Checked at: ${report.checkedAt}`,
    `Repository asOf: ${report.repo.asOf}`,
    `Registered years: ${report.repo.years.join(', ')}`,
    `Latest DAC in repo: ${report.repo.latestDacYear}-${String(report.repo.latestDacMonth).padStart(2, '0')}`,
    '',
  ]

  if (report.result === 'no_changes') {
    lines.push('No changes found.')
    lines.push(
      'CFE publication markers and page structure match the committed tariff baseline.',
    )
  } else if (report.result === 'rates_found') {
    lines.push('Updated rates found (DAC and/or regular domestic tariffs).')
    lines.push('')
    const dac = report.findings.filter((f) => f.tariffKind === 'DAC' || f.code.startsWith('dac_'))
    const domestic = report.findings.filter(
      (f) => f.tariffKind === 'domestic' || f.code.includes('tfsb') || f.code.includes('year_on_portal'),
    )
    if (dac.length > 0) {
      lines.push('DAC:')
      for (const finding of dac) lines.push(`- ${finding.summary}`)
      lines.push('')
    }
    if (domestic.length > 0) {
      lines.push('Regular domestic tariffs:')
      for (const finding of domestic) lines.push(`- ${finding.summary}`)
      lines.push('')
    }
    const other = report.findings.filter((f) => !dac.includes(f) && !domestic.includes(f))
    if (other.length > 0) {
      lines.push('Other:')
      for (const finding of other) lines.push(`- ${finding.summary}`)
      lines.push('')
    }
    lines.push('This email will repeat weekly until the repository snapshot is updated.')
  } else {
    lines.push('Site structure changed or the check could not be completed.')
    lines.push('Unable to reliably compare live CFE data with the repository baseline.')
    lines.push('')
    for (const finding of report.findings) {
      lines.push(`- [${finding.kind}] ${finding.summary}`)
      lines.push(`  Clear by: ${finding.clearBy}`)
    }
    lines.push('')
    lines.push('This email will repeat weekly until the parser/schema or operational issue is fixed.')
  }

  lines.push('')
  lines.push('Pages checked:')
  for (const page of report.pages) {
    lines.push(`- ${page.url}${page.ok ? '' : ` (failed: ${page.error ?? 'unknown'})`}`)
  }

  if (options.workflowRunUrl) {
    lines.push('')
    lines.push(`Workflow run: ${options.workflowRunUrl}`)
  }
  if (options.artifactName) {
    lines.push(`Artifact: ${options.artifactName}`)
  }

  lines.push('')
  return {
    subject,
    text: lines.join('\n'),
  }
}

function subjectForResult(report: MonitorReport): string {
  switch (report.result) {
    case 'no_changes':
      return '[CFE] No changes found'
    case 'rates_found': {
      const hasDac = report.findings.some(
        (f) => f.tariffKind === 'DAC' || f.code.startsWith('dac_'),
      )
      const hasDomestic = report.findings.some(
        (f) =>
          f.tariffKind === 'domestic' ||
          f.code.includes('tfsb') ||
          f.code.includes('year_on_portal'),
      )
      if (hasDac && hasDomestic) return '[CFE] Updated DAC/Tarifa rates found'
      if (hasDac) return '[CFE] Updated DAC rates found'
      if (hasDomestic) return '[CFE] Updated Tarifa rates found'
      return '[CFE] Updated DAC/Tarifa rates found'
    }
    case 'unable_to_check':
      return '[CFE] Unable to check CFE data'
    default:
      return '[CFE] Unable to check CFE data'
  }
}

export function shouldSendEmail(_report: MonitorReport): boolean {
  // Every run sends exactly one status email.
  return true
}
