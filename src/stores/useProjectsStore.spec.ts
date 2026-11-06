import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { useProjectsStore } from './useProjectsStore'
import * as projectsApi from '../services/api/projectsApi'

vi.mock('../services/api/projectsApi', async (importOriginal) => ({
  ...(await importOriginal<typeof projectsApi>()),
  listProjects: vi.fn(),
  createProject: vi.fn(),
}))

const onboarding = { id: 'p1', name: 'Onboarding', createdAt: '2026-11-06T09:30:00.000Z' }
const pilot = { id: 'p2', name: 'Pilot', createdAt: '2026-11-06T10:00:00.000Z' }

describe('useProjectsStore', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    vi.mocked(projectsApi.listProjects).mockReset()
    vi.mocked(projectsApi.createProject).mockReset()
  })

  it('loads the projects and becomes ready', async () => {
    vi.mocked(projectsApi.listProjects).mockResolvedValue([onboarding])
    const store = useProjectsStore()

    await store.load()

    expect(store.status).toBe('ready')
    expect(store.projects).toEqual([onboarding])
    expect(store.byId('p1')).toEqual(onboarding)
  })

  it('records the error when loading fails', async () => {
    vi.mocked(projectsApi.listProjects).mockRejectedValue(new Error('offline'))
    const store = useProjectsStore()

    await store.load()

    expect(store.status).toBe('error')
    expect(store.error).toBe('offline')
  })

  it('shares one request between concurrent loads, and ensureLoaded skips a loaded list', async () => {
    vi.mocked(projectsApi.listProjects).mockResolvedValue([onboarding])
    const store = useProjectsStore()

    await Promise.all([store.load(), store.ensureLoaded()])
    await store.ensureLoaded()

    expect(projectsApi.listProjects).toHaveBeenCalledTimes(1)
  })

  it('adds a created project to the list', async () => {
    vi.mocked(projectsApi.listProjects).mockResolvedValue([onboarding])
    vi.mocked(projectsApi.createProject).mockResolvedValue(pilot)
    const store = useProjectsStore()
    await store.load()

    await store.create('Pilot')

    expect(projectsApi.createProject).toHaveBeenCalledWith('Pilot')
    expect(store.projects).toEqual([onboarding, pilot])
  })
})
