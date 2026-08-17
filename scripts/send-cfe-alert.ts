import { readFile } from 'node:fs/promises'
import nodemailer from 'nodemailer'
import { buildEmailContent, shouldSendEmail } from './cfe-monitor/email.ts'
import type { MonitorReport } from './cfe-monitor/types.ts'

interface SmtpConfig {
  host: string
  port: number
  user: string
  pass: string
  from: string
  to: string
}

function requireEnv(name: string): string {
  const value = process.env[name]
  if (!value) throw new Error(`Missing required environment variable: ${name}`)
  return value
}

function loadSmtpConfig(): SmtpConfig {
  return {
    host: requireEnv('SMTP_HOST'),
    port: Number(requireEnv('SMTP_PORT')),
    user: requireEnv('SMTP_USER'),
    pass: requireEnv('SMTP_PASS'),
    from: requireEnv('SMTP_FROM'),
    to: requireEnv('ALERT_TO'),
  }
}

function createTransport(config: SmtpConfig) {
  const port = config.port
  if (port === 465) {
    return nodemailer.createTransport({
      host: config.host,
      port,
      secure: true,
      auth: { user: config.user, pass: config.pass },
    })
  }
  return nodemailer.createTransport({
    host: config.host,
    port,
    secure: false,
    requireTLS: true,
    auth: { user: config.user, pass: config.pass },
  })
}

async function main(): Promise<void> {
  const reportPath = process.env.REPORT_PATH ?? 'artifacts/cfe-monitor/report.json'
  const dryRun = process.env.CFE_ALERT_DRY_RUN === '1'
  const raw = await readFile(reportPath, 'utf8')
  const report = JSON.parse(raw) as MonitorReport

  if (!shouldSendEmail(report)) {
    console.log('Email skipped by policy')
    return
  }

  const content = buildEmailContent(report, {
    workflowRunUrl: process.env.GITHUB_RUN_URL,
    artifactName: process.env.CFE_ARTIFACT_NAME ?? 'cfe-monitor-report',
  })

  if (dryRun) {
    console.log('DRY RUN — email not sent')
    console.log(`Subject: ${content.subject}`)
    console.log(content.text)
    return
  }

  const config = loadSmtpConfig()
  const transport = createTransport(config)
  const info = await transport.sendMail({
    from: config.from,
    to: config.to,
    subject: content.subject,
    text: content.text,
  })
  console.log(`Email sent: ${info.messageId ?? '(no message id)'}`)
  console.log(`Subject: ${content.subject}`)
}

main().catch((error) => {
  console.error(error)
  process.exitCode = 1
})
