import assert from 'node:assert/strict'
import { writeFile } from 'node:fs/promises'
import { redactDiagnostic } from '../../../../src/lib/errors.ts'

// Corpus indépendant, uniquement des marqueurs inventés. Ces vérifications
// complètent les tests CI ; elles ne remplacent ni HTTP ni PostgreSQL.
const marker = 'FAKE_CHECK_PRIVATE_MARKER'
const samples = [
  `authorization: Bearer ${marker}`,
  `AUTHORIZATION = Basic ${marker}`,
  `Authorization: "Bearer ${marker}"`,
  `"Authorization": "Bearer ${marker}"`,
  `authorization='Basic ${marker}'`,
  `authorization: "Bearer début,\\"${marker}"`,
  `İauthorization: Basic ${marker}`,
  `password="${marker}"`,
  `password='${marker}'`,
  JSON.stringify({ password: marker, token: marker }),
  `https://ci.invalid/r?X-Amz-Signature=${marker}`,
  `X-Amz-Security-Token=${marker}`,
  `cookie: authjs.session-token=${marker}`,
  `postgres://expense:${marker}@127.0.0.1:5432/base`,
  `session-token=${marker}`,
]
for (const sample of samples) assert(!redactDiagnostic(sample).includes(marker))
for (const length of [16383, 16384]) assert.equal(redactDiagnostic('x'.repeat(length)), 'x'.repeat(length))
for (const length of [16385, 17000]) assert.equal(redactDiagnostic('x'.repeat(length)), '[diagnostic trop volumineux, omis]')
assert.equal(redactDiagnostic('authorization:' + ' '.repeat(4000)), 'authorization:' + ' '.repeat(4000))
const result = { node: process.version, source: 'diff local SPEC-14 du 29 octobre 2026',
  syntheticSecretForms: samples.length, boundaryAndNoValueChecks: 5, passed: samples.length + 5, failed: 0 }
await writeFile('docs/audit/evidence/spec14-review-20261029/compatibility.json', JSON.stringify(result, null, 2) + '\n')
console.log(JSON.stringify(result))
