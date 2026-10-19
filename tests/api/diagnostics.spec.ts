import { test, expect } from '../support/fixtures'
import { redactDiagnostic, respondError } from '../../src/lib/errors'

// Frontière AUD-005 testée sur le module réel : ces cas complètent PANNE-004
// (exception SQL réelle) par d'autres formes de secrets sans démarrer de
// serveur dédié. Placés dans la suite API avec les autres cas de SPEC-01.
const MARKER = 'FAKE_CI_PRIVATE_MARKER'

test('[AUD-005][PANNE-005][correction] expurgation des secrets usuels avant journalisation', () => {
  const samples = [
    `authorization: Bearer ${MARKER}`,
    `Authorization=Basic ${MARKER}`,
    `jeton porteur bearer ${MARKER} rejeté`,
    `https://ci.invalid/receipt?X-Amz-Signature=${MARKER}&X-Amz-Credential=${MARKER}`,
    `X-Amz-Security-Token=${MARKER}`,
    `cookie: authjs.session-token=${MARKER}`,
    `postgres://expense:${MARKER}@127.0.0.1:5432/base`,
    `password=${MARKER}`,
    `secret_access_key: ${MARKER}`,
    `session-token=${MARKER}`,
  ]
  for (const sample of samples) {
    expect(redactDiagnostic(sample), sample).not.toContain(MARKER)
  }
})

test('[AUD-005][PANNE-006][reference] le diagnostic expurgé reste utile', () => {
  expect(redactDiagnostic('relation "expense_notes" does not exist')).toBe('relation "expense_notes" does not exist')
  expect(redactDiagnostic(`échec https://s3.invalid/receipts/12.png?X-Amz-Signature=${MARKER}`))
    .toBe('échec https://s3.invalid/receipts/12.png?[expurgé]')
})

test('[AUD-005][PANNE-007][correction] journal interne et réponse publique sans secret, code et opération conservés', async () => {
  const logged: string[] = []
  const original = console.error
  console.error = (line: unknown) => { logged.push(String(line)) }
  try {
    const error = Object.assign(new Error(`authorization: Bearer ${MARKER} https://ci.invalid/r?X-Amz-Signature=${MARKER}`), { code: 'P0001' })
    const response = respondError(error, 'expense-notes:POST')

    expect(response.status).toBe(500)
    expect(JSON.stringify(await response.json())).not.toContain(MARKER)
    expect(logged).toHaveLength(1)
    expect(logged[0]).not.toContain(MARKER)
    const record = JSON.parse(logged[0])
    expect(record).toMatchObject({ code: 'P0001', operation: 'expense-notes:POST', status: 500 })
    expect(typeof record.stack).toBe('string')
  } finally {
    console.error = original
  }
})
