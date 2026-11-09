import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { ApiError, createProject, listProjects } from './projectsApi'

const fetchMock = vi.fn<typeof fetch>()

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } })
}

describe('projectsApi', () => {
  beforeEach(() => {
    fetchMock.mockReset()
    vi.stubGlobal('fetch', fetchMock)
  })
  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('lists projects from GET /api/projects', async () => {
    const projects = [{ id: 'p1', name: 'Onboarding', createdAt: '2026-11-06T09:30:00.000Z' }]
    fetchMock.mockResolvedValue(jsonResponse(projects))

    await expect(listProjects()).resolves.toEqual(projects)
    expect(fetchMock).toHaveBeenCalledWith('/api/projects', undefined)
  })

  it('creates a project with a JSON body', async () => {
    const created = { id: 'p1', name: 'Onboarding', createdAt: '2026-11-06T09:30:00.000Z' }
    fetchMock.mockResolvedValue(jsonResponse(created, 201))

    await expect(createProject('Onboarding')).resolves.toEqual(created)
    expect(fetchMock).toHaveBeenCalledWith('/api/projects', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: 'Onboarding' }),
    })
  })

  it('throws an ApiError with the server message on 400', async () => {
    fetchMock.mockResolvedValue(jsonResponse({ error: 'name must not be empty.' }, 400))

    await expect(createProject(' ')).rejects.toEqual(new ApiError(400, 'name must not be empty.'))
  })

  it('throws an ApiError with the status when the body is not JSON', async () => {
    fetchMock.mockResolvedValue(new Response('Bad gateway', { status: 502, statusText: 'Bad Gateway' }))

    await expect(listProjects()).rejects.toMatchObject({ status: 502, message: 'Request failed (502 Bad Gateway).' })
  })
})
