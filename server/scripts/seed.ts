// Runs db/seed.sql against DATABASE_URL. Kept out of dbmate on purpose: a
// migration describes the schema every environment shares, while the seed is
// dev-only data that production must never get.

import { readFile } from 'node:fs/promises'
import pg from 'pg'

const databaseUrl = process.env.DATABASE_URL
if (!databaseUrl) {
  throw new Error('DATABASE_URL is not set.')
}
if (process.env.NODE_ENV === 'production') {
  throw new Error('Refusing to seed dev data with NODE_ENV=production.')
}

const sql = await readFile(new URL('../../db/seed.sql', import.meta.url), 'utf8')
const client = new pg.Client({ connectionString: databaseUrl })
await client.connect()
try {
  await client.query(sql)
  console.log('Seeded', new URL(databaseUrl).pathname.slice(1))
} finally {
  await client.end()
}
