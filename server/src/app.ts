import { Hono } from 'hono'
import type { Db } from './db/pool.ts'
import { projectRoutes } from './projects/routes.ts'

export interface AppDeps {
  db: Db
  devUserId: string
}

/**
 * Builds the API without starting a server, so tests can call
 * `app.request(...)` directly with a database connection they control.
 */
export function createApp({ db, devUserId }: AppDeps): Hono {
  const app = new Hono().basePath('/api')
  const currentUserId = () => devUserId

  app.route('/projects', projectRoutes({ db, currentUserId }))

  app.onError((error, c) => {
    // Log the details on the server; never send SQL errors to the client.
    console.error(error)
    return c.json({ error: 'Internal server error.' }, 500)
  })

  return app
}
