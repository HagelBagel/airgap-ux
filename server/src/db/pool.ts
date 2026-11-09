import pg from 'pg'

/**
 * What the queries need from the database: just `query`. A `pg.Pool` fits,
 * and so does a single `pg.Client`, which is how the tests run every request
 * inside one transaction they can roll back.
 */
export type Db = Pick<pg.ClientBase, 'query'>

export function createPool(databaseUrl: string): pg.Pool {
  return new pg.Pool({ connectionString: databaseUrl })
}
