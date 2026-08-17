import { FETCH_RETRIES, FETCH_TIMEOUT_MS, USER_AGENT } from './expectedSchema.ts'
import type { PageFetchResult } from './types.ts'

export async function fetchPage(
  url: string,
  options: {
    timeoutMs?: number
    retries?: number
    fetchImpl?: typeof fetch
  } = {},
): Promise<PageFetchResult> {
  const timeoutMs = options.timeoutMs ?? FETCH_TIMEOUT_MS
  const retries = options.retries ?? FETCH_RETRIES
  const fetchImpl = options.fetchImpl ?? fetch

  let lastError: string | undefined

  for (let attempt = 0; attempt <= retries; attempt += 1) {
    const controller = new AbortController()
    const timer = setTimeout(() => controller.abort(), timeoutMs)
    try {
      const response = await fetchImpl(url, {
        headers: {
          'User-Agent': USER_AGENT,
          Accept: 'text/html,application/xhtml+xml',
        },
        signal: controller.signal,
        redirect: 'follow',
      })
      const html = await response.text()
      if (!response.ok) {
        lastError = `HTTP ${response.status}`
        if (attempt < retries) continue
        return { url, ok: false, status: response.status, error: lastError }
      }
      return { url, ok: true, status: response.status, html }
    } catch (error) {
      lastError = error instanceof Error ? error.message : String(error)
      if (attempt < retries) continue
      return { url, ok: false, error: lastError }
    } finally {
      clearTimeout(timer)
    }
  }

  return { url, ok: false, error: lastError ?? 'Unknown fetch failure' }
}
