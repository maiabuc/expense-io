import { execFileSync } from 'node:child_process'
import { randomUUID } from 'node:crypto'

function git(args) {
  try { return execFileSync('git', args, { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }).trim() } catch { return undefined }
}
export function provenance() {
  const revision = process.env.GITHUB_SHA ?? process.env.SOURCE_SHA ?? git(['rev-parse', 'HEAD']) ?? 'indisponible'
  const local = process.env.SOURCE_STATE ?? (process.env.GITHUB_SHA ? 'commit CI' : git(['status', '--porcelain']) ? 'diff local non commité' : 'commit local')
  function target(value) {
    if (!value) return undefined
    const url = new URL(value)
    return `${url.protocol}//${url.host}${url.pathname}`
  }
  return { revision, sourceState: local, generatedAt: new Date().toISOString(), runId: process.env.CI_RUN_ID ?? randomUUID(),
    node: process.version, platform: `${process.platform}/${process.arch}`, issue: process.env.TEST_ISSUE ?? null,
    database: target(process.env.DATABASE_URL), storage: target(process.env.S3_ENDPOINT), bucket: process.env.S3_BUCKET }
}
