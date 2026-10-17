export function testEnvironment() {
  const databaseURL = process.env.DATABASE_URL ?? ''
  const endpoint = process.env.S3_ENDPOINT ?? ''
  const bucket = process.env.S3_BUCKET ?? ''
  const database = new URL(databaseURL)
  const storage = new URL(endpoint)
  if (process.env.ARLA_TEST_RUN !== '1' ||
      !database.pathname.startsWith('/expense_io_ci_') ||
      !['127.0.0.1', 'localhost'].includes(database.hostname) ||
      database.port === '5433' ||
      !['127.0.0.1', 'localhost'].includes(storage.hostname) ||
      storage.port === '4567' || !bucket.startsWith('ci-')) {
    throw new Error('Cible refusée : services et données CI isolés requis.')
  }
  return { databaseURL, endpoint, bucket }
}
