import { Hono } from 'hono'
import { UUID_PATTERN } from '../config.ts'
import type { Db } from '../db/pool.ts'
import { parseProjectName, toProjectDto } from './dto.ts'
import { createProject, deleteProject, listProjects } from './queries.ts'

export interface ProjectRoutesDeps {
  db: Db
  /** The current User. Comes from DEV_USER_ID until sign-in exists. */
  currentUserId: () => string
}

export function projectRoutes({ db, currentUserId }: ProjectRoutesDeps): Hono {
  const routes = new Hono()

  routes.get('/', async (c) => {
    const rows = await listProjects(db, currentUserId())
    return c.json(rows.map(toProjectDto))
  })

  routes.post('/', async (c) => {
    const body: unknown = await c.req.json().catch(() => undefined)
    const parsed = parseProjectName(isObject(body) ? body.name : undefined)
    if (!parsed.ok) {
      return c.json({ error: parsed.error }, 400)
    }
    const row = await createProject(db, currentUserId(), parsed.name)
    return c.json(toProjectDto(row), 201)
  })

  routes.delete('/:id', async (c) => {
    const id = c.req.param('id')
    // Postgres rejects a malformed UUID with an error, which would surface as
    // a 500. Check it here so a bad id is the client's mistake (400).
    if (!UUID_PATTERN.test(id)) {
      return c.json({ error: 'id must be a UUID.' }, 400)
    }
    const deleted = await deleteProject(db, currentUserId(), id)
    // Another User's Project answers 404, not 403: a 403 would confirm that
    // the id exists.
    if (!deleted) {
      return c.json({ error: 'Project not found.' }, 404)
    }
    return c.body(null, 204)
  })

  return routes
}

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null
}
