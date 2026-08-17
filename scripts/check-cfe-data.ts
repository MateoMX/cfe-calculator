import { mkdir, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { runMonitor } from './cfe-monitor/runMonitor.ts'
import type { MonitorReport } from './cfe-monitor/types.ts'

async function writeGithubOutput(report: MonitorReport): Promise<void> {
  const githubOutput = process.env.GITHUB_OUTPUT
  if (!githubOutput) return
  await writeFile(githubOutput, `result=${report.result}\nstatus=${report.result}\n`, {
    encoding: 'utf8',
    flag: 'a',
  })
}

async function main(): Promise<void> {
  const outputDir = process.env.CFE_MONITOR_OUT ?? 'artifacts/cfe-monitor'
  await mkdir(outputDir, { recursive: true })

  let report: MonitorReport
  try {
    report = await runMonitor({ outputDir })
  } catch (error) {
    report = {
      result: 'unable_to_check',
      checkedAt: new Date().toISOString(),
      repo: {
        asOf: 'unknown',
        years: [],
        latestDacYear: 0,
        latestDacMonth: 0,
      },
      pages: [],
      findings: [
        {
          kind: 'fetch_error',
          code: 'monitor_crash',
          summary: `Monitor crashed before producing a normal report: ${
            error instanceof Error ? error.message : String(error)
          }`,
          clearBy: 'Inspect workflow logs and fix scripts/cfe-monitor.',
        },
      ],
    }
    await writeFile(
      path.join(outputDir, 'report.json'),
      `${JSON.stringify(report, null, 2)}\n`,
      'utf8',
    )
  }

  await writeGithubOutput(report)
  console.log(`CFE monitor result: ${report.result}`)
  console.log(`Findings: ${report.findings.length}`)
  for (const finding of report.findings) {
    console.log(`- [${finding.kind}] ${finding.code}: ${finding.summary}`)
  }

  // rates_found and no_changes are successful check outcomes.
  // unable_to_check fails the job after the email step (workflow handles ordering).
  if (report.result === 'unable_to_check') {
    process.exitCode = 1
  }
}

main().catch(async (error) => {
  console.error(error)
  process.exitCode = 1
})
