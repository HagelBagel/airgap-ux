import { beforeEach, describe, expect, it, vi } from 'vitest'
import { flushPromises, mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { createMemoryHistory, createRouter } from 'vue-router'
import ProjectListView from './ProjectListView.vue'
import * as projectsApi from '../services/api/projectsApi'

vi.mock('../services/api/projectsApi', async (importOriginal) => ({
  ...(await importOriginal<typeof projectsApi>()),
  listProjects: vi.fn(),
  createProject: vi.fn(),
}))

const onboarding = { id: 'p1', name: 'Onboarding', createdAt: '2026-11-06T09:30:00.000Z' }

async function mountView() {
  const router = createRouter({
    history: createMemoryHistory(),
    routes: [
      { path: '/', component: ProjectListView },
      { path: '/projects/:id', component: { template: '<div />' } },
    ],
  })
  await router.push('/')
  const wrapper = mount(ProjectListView, { global: { plugins: [router] } })
  await flushPromises()
  return wrapper
}

describe('ProjectListView', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    vi.mocked(projectsApi.listProjects).mockReset()
    vi.mocked(projectsApi.createProject).mockReset()
  })

  it('shows an empty state when there are no projects', async () => {
    vi.mocked(projectsApi.listProjects).mockResolvedValue([])
    const wrapper = await mountView()
    expect(wrapper.find('.project-list__empty').text()).toContain('No projects yet')
  })

  it('lists projects as links to their dashboard', async () => {
    vi.mocked(projectsApi.listProjects).mockResolvedValue([onboarding])
    const wrapper = await mountView()

    const link = wrapper.find('.project-list__link')
    expect(link.text()).toContain('Onboarding')
    expect(link.attributes('href')).toBe('/projects/p1')
  })

  it('creates a project with the trimmed name and clears the input', async () => {
    vi.mocked(projectsApi.listProjects).mockResolvedValue([])
    vi.mocked(projectsApi.createProject).mockResolvedValue(onboarding)
    const wrapper = await mountView()

    await wrapper.find('input').setValue('  Onboarding  ')
    await wrapper.find('form').trigger('submit')
    await flushPromises()

    expect(projectsApi.createProject).toHaveBeenCalledWith('Onboarding')
    expect(wrapper.find('.project-list__link').text()).toContain('Onboarding')
    expect((wrapper.find('input').element as HTMLInputElement).value).toBe('')
  })

  it('does not call the API for a blank name', async () => {
    vi.mocked(projectsApi.listProjects).mockResolvedValue([])
    const wrapper = await mountView()

    await wrapper.find('input').setValue('   ')
    await wrapper.find('form').trigger('submit')

    expect(projectsApi.createProject).not.toHaveBeenCalled()
    expect(wrapper.find('[role="alert"]').text()).toBe('Give the project a name.')
  })

  it('shows the API error when creating fails', async () => {
    vi.mocked(projectsApi.listProjects).mockResolvedValue([])
    vi.mocked(projectsApi.createProject).mockRejectedValue(new projectsApi.ApiError(400, 'name must not be empty.'))
    const wrapper = await mountView()

    await wrapper.find('input').setValue('x')
    await wrapper.find('form').trigger('submit')
    await flushPromises()

    expect(wrapper.find('[role="alert"]').text()).toBe('name must not be empty.')
  })

  it('shows an error with a retry when loading fails', async () => {
    vi.mocked(projectsApi.listProjects).mockRejectedValueOnce(new Error('offline')).mockResolvedValue([onboarding])
    const wrapper = await mountView()

    expect(wrapper.find('.project-list__load-error').text()).toContain('offline')
    await wrapper.find('.project-list__retry-btn').trigger('click')
    await flushPromises()
    expect(wrapper.find('.project-list__link').exists()).toBe(true)
  })
})
