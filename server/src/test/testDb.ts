// Every API test runs inside BEGIN … ROLLBACK on one connection to the
// airgap_test database. Nothing a test writes survives it, so tests don't
// need cleanup code and can't see each other's rows.

import pg from 'pg'
import { afterAll, afterEach, beforeAll, beforeEach } from 'vitest'

export function useTestTransaction(): { db: () => pg.Client } {
  const url = process.env.TEST_DATABASE_URL
  if (!url) {
    throw new Error('TEST_DATABASE_URL is not set. See server/README.md.')
  }
  if (!new URL(url).pathname.endsWith('_test')) {
    // A guard against pointing the tests at the dev database by mistake.
    throw new Error('TEST_DATABASE_URL must name a database ending in _test.')
  }

  let client: pg.Client | undefined

  beforeAll(async () => {
    client = new pg.Client({ connectionString: url })
    await client.connect()
  })
  beforeEach(async () => {
    await client!.query('BEGIN')
  })
  afterEach(async () => {
    await client!.query('ROLLBACK')
  })
  afterAll(async () => {
    await client?.end()
  })

  return {
    db: () => {
      if (!client) throw new Error('The test database is not connected yet.')
      return client
    },
  }
}

export async function insertUser(db: pg.Client, email: string): Promise<string> {
  const { rows } = await db.query<{ id: string }>(
    'INSERT INTO users (email) VALUES ($1) RETURNING id',
    [email],
  )
  return rows[0]!.id
}

export async function insertProject(db: pg.Client, ownerId: string, name: string): Promise<string> {
  const { rows } = await db.query<{ id: string }>(
    'INSERT INTO projects (owner_id, name) VALUES ($1, $2) RETURNING id',
    [ownerId, name],
  )
  return rows[0]!.id
}
