import { testEnvironment } from './environment'
import { prepareStorage } from './storage'
import { closeDatabase, db } from './database'

export default async function setup() {
  testEnvironment()
  try { await db().query('SELECT id FROM expense_notes LIMIT 0'); await prepareStorage() }
  finally { await closeDatabase() }
}
