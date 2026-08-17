import { describe, expect, it } from 'vitest'
import { buildEmailContent, shouldSendEmail } from './email.ts'
import type { MonitorReport } from './types.ts'

function report(partial: Partial<MonitorReport> & Pick<MonitorReport, 'result' | 'findings'>): MonitorReport {
  return {
    checkedAt: '2026-07-17T20:00:00.000Z',
    repo: {
      asOf: '2026-07-16',
      years: [2026],
      latestDacYear: 2026,
      latestDacMonth: 7,
    },
    pages: [
      {
        url: 'https://example.test/dac',
        ok: true,
        status: 200,
      },
    ],
    ...partial,
  }
}

describe('buildEmailContent', () => {
  it('always sends and uses the no-changes subject', () => {
    const r = report({ result: 'no_changes', findings: [] })
    expect(shouldSendEmail(r)).toBe(true)
    const email = buildEmailContent(r)
    expect(email.subject).toBe('[CFE] No changes found')
    expect(email.text).toContain('No changes found.')
  })

  it('describes DAC and domestic updates', () => {
    const r = report({
      result: 'rates_found',
      findings: [
        {
          kind: 'new_data',
          code: 'dac_month_ahead',
          summary: 'DAC August available',
          clearBy: 'Update snapshot',
          tariffKind: 'DAC',
          year: 2026,
          month: 8,
        },
        {
          kind: 'new_data',
          code: 'domestic_tfsb_new_year',
          summary: 'TFSB 2027 published',
          clearBy: 'Add tariffs-2027.ts',
          tariffKind: 'domestic',
          year: 2027,
        },
      ],
    })
    const email = buildEmailContent(r, {
      workflowRunUrl: 'https://github.com/example/run/1',
      artifactName: 'cfe-monitor-report',
    })
    expect(email.subject).toBe('[CFE] Updated DAC/Tarifa rates found')
    expect(email.text).toContain('DAC:')
    expect(email.text).toContain('Regular domestic tariffs:')
    expect(email.text).toContain('Workflow run: https://github.com/example/run/1')
    expect(email.text).toContain('This email will repeat weekly')
  })

  it('uses unable-to-check subject for structure failures', () => {
    const r = report({
      result: 'unable_to_check',
      findings: [
        {
          kind: 'structure_change',
          code: 'dac_month_select_missing',
          summary: 'Month select missing',
          clearBy: 'Update parser',
        },
      ],
    })
    const email = buildEmailContent(r)
    expect(email.subject).toBe('[CFE] Unable to check CFE data')
    expect(email.text).toContain('Unable to reliably compare')
  })
})
