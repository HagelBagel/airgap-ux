import { beforeEach, describe, expect, it, vi } from 'vitest'
import { flushPromises, mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { createMemoryHistory, createRouter } from 'vue-router'
import ResearchDashboard from './ResearchDashboard.vue'
import { useResearchStore } from '../stores/useResearchStore'
import * as projectsApi from '../services/api/projectsApi'

vi.mock('../services/api/projectsApi', async (importOriginal) => ({
  ...(await importOriginal<typeof projectsApi>()),
  listProjects: vi.fn(),
}))

const onboarding = { id: 'p1', name: 'Onboarding', createdAt: '2026-11-06T09:30:00.000Z' }
const pilot = { id: 'p2', name: 'Pilot', createdAt: '2026-11-06T10:00:00.000Z' }

async function mountAt(path: string) {
  const router = createRouter({
    history: createMemoryHistory(),
    routes: [
      { path: '/', component: { template: '<div />' } },
      { path: '/projects/:id', component: ResearchDashboard, props: true },
    ],
  })
  await router.push(path)
  const wrapper = mount({ template: '<router-view />' }, {
    global: {
      plugins: [router],
      // The analysis UI is covered by its own specs; here only the Project wiring matters.
      stubs: { ProcessingStatus: true, ResearchWorkbench: true, AppSettings: true },
    },
  })
  await flushPromises()
  return { wrapper, router }
}

describe('ResearchDashboard', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    vi.mocked(projectsApi.listProjects).mockReset()
    vi.mocked(projectsApi.listProjects).mockResolvedValue([onboarding, pilot])
  })

  it("shows the Project's name and opens it in the research store", async () => {
    const research = useResearchStore()
    const openProject = vi.spyOn(research, 'openProject')

    const { wrapper } = await mountAt('/projects/p1')

    expect(wrapper.find('.dashboard__title').text()).toBe('Onboarding')
    expect(openProject).toHaveBeenCalledWith(onboarding)
  })

  it('opens the new Project when the route switches to another id', async () => {
    const research = useResearchStore()
    const openProject = vi.spyOn(research, 'openProject')
    const { wrapper, router } = await mountAt('/projects/p1')

    await router.push('/projects/p2')
    await flushPromises()

    expect(openProject).toHaveBeenLastCalledWith(pilot)
    expect(wrapper.find('.dashboard__title').text()).toBe('Pilot')
  })

  it('shows "Project not found" for an unknown id', async () => {
    const research = useResearchStore()
    const openProject = vi.spyOn(research, 'openProject')

    const { wrapper } = await mountAt('/projects/nope')

    expect(wrapper.text()).toContain('Project not found.')
    expect(openProject).not.toHaveBeenCalled()
  })
})
