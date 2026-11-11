import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { useProjectsStore } from './useProjectsStore'
import * as projectsApi from '../services/api/projectsApi'

vi.mock('../services/api/projectsApi', async (importOriginal) => ({
  ...(await importOriginal<typeof projectsApi>()),
  listProjects: vi.fn(),
  createProject: vi.fn(),
  deleteProject: vi.fn(),
}))

const onboarding = { id: 'p1', name: 'Onboarding', createdAt: '2026-11-06T09:30:00.000Z' }
const pilot = { id: 'p2', name: 'Pilot', createdAt: '2026-11-06T10:00:00.000Z' }

describe('useProjectsStore', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    vi.mocked(projectsApi.listProjects).mockReset()
    vi.mocked(projectsApi.createProject).mockReset()
    vi.mocked(projectsApi.deleteProject).mockReset()
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

  describe('remove', () => {
    async function loadedStore() {
      vi.mocked(projectsApi.listProjects).mockResolvedValue([onboarding, pilot])
      const store = useProjectsStore()
      await store.load()
      return store
    }

    it('deletes the project through the API and drops it from the list', async () => {
      vi.mocked(projectsApi.deleteProject).mockResolvedValue(undefined)
      const store = await loadedStore()

      await store.remove('p1')

      expect(projectsApi.deleteProject).toHaveBeenCalledWith('p1')
      expect(store.projects).toEqual([pilot])
    })

    it('drops the project when the API says it is already gone (404)', async () => {
      vi.mocked(projectsApi.deleteProject).mockRejectedValue(new projectsApi.ApiError(404, 'Project not found.'))
      const store = await loadedStore()

      await store.remove('p1')

      expect(store.projects).toEqual([pilot])
    })

    it('keeps the project and rethrows any other error', async () => {
      const failure = new projectsApi.ApiError(500, 'Internal Server Error')
      vi.mocked(projectsApi.deleteProject).mockRejectedValue(failure)
      const store = await loadedStore()

      await expect(store.remove('p1')).rejects.toBe(failure)
      expect(store.projects).toEqual([onboarding, pilot])
    })
  })
})
