import { describe, expect, it } from 'vitest'
import { createApp } from '../app.ts'
import type { ProjectDto } from './dto.ts'
import { insertProject, insertUser, useTestTransaction } from '../test/testDb.ts'

const { db } = useTestTransaction()

async function setup() {
  const me = await insertUser(db(), 'me@example.test')
  const other = await insertUser(db(), 'other@example.test')
  const app = createApp({ db: db(), devUserId: me })
  return { app, me, other }
}

function postJson(body: unknown) {
  return {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  }
}

describe('GET /api/projects', () => {
  it("returns only the current User's Projects, as camelCase JSON", async () => {
    const { app, me, other } = await setup()
    const mine = await insertProject(db(), me, 'Onboarding study')
    await insertProject(db(), other, "Someone else's study")

    const res = await app.request('/api/projects')

    expect(res.status).toBe(200)
    const body = (await res.json()) as ProjectDto[]
    expect(body).toEqual([{ id: mine, name: 'Onboarding study', createdAt: expect.any(String) }])
    expect(new Date(body[0]!.createdAt).toISOString()).toBe(body[0]!.createdAt)
  })

  it('returns an empty list when the User has no Projects', async () => {
    const { app } = await setup()
    const res = await app.request('/api/projects')
    expect(await res.json()).toEqual([])
  })
})

describe('POST /api/projects', () => {
  it('creates a Project with a trimmed name and returns 201', async () => {
    const { app, me } = await setup()

    const res = await app.request('/api/projects', postJson({ name: '  Onboarding study  ' }))

    expect(res.status).toBe(201)
    const body = (await res.json()) as ProjectDto
    expect(body).toEqual({ id: expect.any(String), name: 'Onboarding study', createdAt: expect.any(String) })
    const { rows } = await db().query('SELECT owner_id, name FROM projects WHERE id = $1', [body.id])
    expect(rows).toEqual([{ owner_id: me, name: 'Onboarding study' }])
  })

  it.each([
    ['empty', { name: '' }],
    ['only whitespace', { name: '   ' }],
    ['longer than 200 characters', { name: 'x'.repeat(201) }],
    ['missing', {}],
  ])('returns 400 when the name is %s', async (_label, body) => {
    const { app } = await setup()
    const res = await app.request('/api/projects', postJson(body))
    expect(res.status).toBe(400)
    expect(await res.json()).toEqual({ error: expect.any(String) })
  })

  it('returns 400 when the body is not JSON', async () => {
    const { app } = await setup()
    const res = await app.request('/api/projects', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: 'not json',
    })
    expect(res.status).toBe(400)
  })

  it('allows two Projects with the same name', async () => {
    const { app } = await setup()
    await app.request('/api/projects', postJson({ name: 'Pilot' }))
    const res = await app.request('/api/projects', postJson({ name: 'Pilot' }))
    expect(res.status).toBe(201)
  })
})

describe('projects.name CHECK constraint', () => {
  it.each([
    ['blank', '   '],
    ['longer than 200 characters', 'x'.repeat(201)],
  ])('rejects a %s name inserted directly, bypassing the API', async (_label, name) => {
    const { me } = await setup()
    // A failed statement aborts the transaction; the savepoint keeps the
    // test's transaction usable so afterEach can still roll back cleanly.
    await db().query('SAVEPOINT check_name')
    await expect(insertProject(db(), me, name)).rejects.toMatchObject({ code: '23514' })
    await db().query('ROLLBACK TO SAVEPOINT check_name')
  })
})

describe('DELETE /api/projects/:id', () => {
  it('deletes the Project and, by cascade, its transcripts, segments and excerpts', async () => {
    const { app, me } = await setup()
    const projectId = await insertProject(db(), me, 'Onboarding study')
    const transcript = await db().query<{ id: string }>(
      `INSERT INTO transcripts (project_id, title, raw_text, content_hash, source)
       VALUES ($1, 'Interview 1', 'Hello there', 'hash', 'upload') RETURNING id`,
      [projectId],
    )
    const transcriptId = transcript.rows[0]!.id
    const segment = await db().query<{ id: string }>(
      `INSERT INTO segments (project_id, transcript_id, ordinal, text, start_char, end_char)
       VALUES ($1, $2, 0, 'Hello there', 0, 11) RETURNING id`,
      [projectId, transcriptId],
    )
    const segmentId = segment.rows[0]!.id
    await db().query(
      'INSERT INTO excerpts (project_id, segment_id, start_offset, end_offset) VALUES ($1, $2, 0, 5)',
      [projectId, segmentId],
    )

    const res = await app.request(`/api/projects/${projectId}`, { method: 'DELETE' })

    expect(res.status).toBe(204)
    const counts = await db().query(
      `SELECT
         (SELECT count(*)::int FROM projects WHERE id = $1) AS projects,
         (SELECT count(*)::int FROM transcripts WHERE id = $2) AS transcripts,
         (SELECT count(*)::int FROM segments WHERE id = $3) AS segments,
         (SELECT count(*)::int FROM excerpts WHERE segment_id = $3) AS excerpts`,
      [projectId, transcriptId, segmentId],
    )
    expect(counts.rows[0]).toEqual({ projects: 0, transcripts: 0, segments: 0, excerpts: 0 })
  })

  it("returns 404 for another User's Project and leaves it in place", async () => {
    const { app, other } = await setup()
    const theirs = await insertProject(db(), other, "Someone else's study")

    const res = await app.request(`/api/projects/${theirs}`, { method: 'DELETE' })

    expect(res.status).toBe(404)
    const { rowCount } = await db().query('SELECT 1 FROM projects WHERE id = $1', [theirs])
    expect(rowCount).toBe(1)
  })

  it('returns 404 for an unknown id', async () => {
    const { app } = await setup()
    const res = await app.request('/api/projects/9b2f6a8e-1111-4000-8000-000000000000', { method: 'DELETE' })
    expect(res.status).toBe(404)
  })

  it('returns 400 for an id that is not a UUID', async () => {
    const { app } = await setup()
    const res = await app.request('/api/projects/not-a-uuid', { method: 'DELETE' })
    expect(res.status).toBe(400)
  })
})
