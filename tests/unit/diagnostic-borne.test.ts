import { test, expect, vi } from 'vitest'
import { redactDiagnostic, respondError } from '../../src/lib/errors'

const MARKER = 'FAKE_CI_DIAGNOSTIC_MARKER'
const OMITTED = '[diagnostic trop volumineux, omis]'

function padToLength(prefix: string, length: number) {
  return prefix + 'x'.repeat(length - prefix.length)
}

test('[AUD-028][DIAG-001][correction] champ de 16385 unités omis entièrement', () => {
  const text = 'x'.repeat(16385)
  expect(redactDiagnostic(text)).toBe(OMITTED)
})

test('[AUD-028][DIAG-002][reference] diagnostic bénin conservé aux frontières inclusives', () => {
  for (const length of [16383, 16384]) {
    const text = 'x'.repeat(length)
    expect(redactDiagnostic(text)).toBe(text)
  }
  expect(redactDiagnostic('relation absente')).toBe('relation absente')
})

test('[AUD-028][DIAG-003][correction] secrets filtrés sans omission sous le plafond', () => {
  for (const length of [16383, 16384]) {
    const text = padToLength(`authorization: "Bearer ${MARKER}"; `, length)
    const redacted = redactDiagnostic(text)
    expect(redacted).not.toContain(MARKER)
    expect(redacted).toContain('[expurgé]')
    expect(redacted).not.toBe(OMITTED)
  }
})

test('[AUD-028][DIAG-004][correction] omission entière sans fragment sensible au début à la frontière ou à la fin', () => {
  const secrets = [`password=${MARKER}`, `authorization: "Bearer début,\\"${MARKER}"`, `Authorization='Basic ${MARKER}'`]
  for (const secret of secrets) {
    for (const text of [secret + 'x'.repeat(17000), 'x'.repeat(16375) + secret, 'x'.repeat(17000) + secret]) {
      expect(redactDiagnostic(text)).toBe(OMITTED)
      expect(redactDiagnostic(text)).not.toContain(MARKER)
    }
  }
})

test('[AUD-028][DIAG-005][reference] authorization sans valeur et variantes de secrets restent traités', () => {
  const spaces = `authorization:${' '.repeat(4000)}`
  expect(redactDiagnostic(spaces)).toBe(spaces)
  for (const text of [
    `AUTHORIZATION = Basic ${MARKER}`,
    `authorization: Bearer ${MARKER}`,
    `"Authorization": "Bearer ${MARKER}"`,
    `authorization='Basic ${MARKER}'`,
    `authorization: "Bearer début,\\"${MARKER}"`,
    `bearer ${MARKER}`,
  ]) expect(redactDiagnostic(text), text).not.toContain(MARKER)
})

test('[AUD-028][DIAG-006][correction] réponse publique et journal structuré conservent leurs contrats avec champs surdimensionnés', async () => {
  const log = vi.spyOn(console, 'error').mockImplementation(() => {})
  try {
    const error = Object.assign(new Error('message-' + 'x'.repeat(17000) + MARKER), {
      code: 'code-' + 'x'.repeat(17000) + MARKER,
      stack: 'stack-' + 'x'.repeat(17000) + MARKER,
    })
    const response = respondError(error, 'ci/diagnostic:GET')
    expect(response.status).toBe(500)
    expect(await response.json()).toEqual({ error: 'Une erreur inattendue est survenue. Réessaie plus tard.' })
    expect(log).toHaveBeenCalledOnce()
    const line = String(log.mock.calls[0][0])
    expect(line).not.toContain(MARKER)
    expect(JSON.parse(line)).toMatchObject({ operation: 'ci/diagnostic:GET', status: 500, code: OMITTED, message: OMITTED, stack: OMITTED })
  } finally {
    log.mockRestore()
  }
})
