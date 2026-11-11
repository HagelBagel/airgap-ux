import { beforeAll, beforeEach, describe, expect, it, vi } from 'vitest'
import { flushPromises, mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { createMemoryHistory, createRouter } from 'vue-router'
import ProjectListView from './ProjectListView.vue'
import * as projectsApi from '../services/api/projectsApi'
import { stubDialog } from '../test/stubDialog'

vi.mock('../services/api/projectsApi', async (importOriginal) => ({
  ...(await importOriginal<typeof projectsApi>()),
  listProjects: vi.fn(),
  createProject: vi.fn(),
  deleteProject: vi.fn(),
}))

const onboarding = { id: 'p1', name: 'Onboarding', createdAt: '2026-11-06T09:30:00.000Z' }
const pilot = { id: 'p2', name: 'Pilot', createdAt: '2026-11-06T10:00:00.000Z' }

async function mountView() {
  const router = createRouter({
    history: createMemoryHistory(),
    routes: [
      { path: '/', component: ProjectListView },
      { path: '/projects/:id', component: { template: '<div />' } },
    ],
  })
  await router.push('/')
  const wrapper = mount(ProjectListView, { global: { plugins: [router] }, attachTo: document.body })
  await flushPromises()
  return wrapper
}

describe('ProjectListView', () => {
  beforeAll(stubDialog)

  beforeEach(() => {
    setActivePinia(createPinia())
    vi.mocked(projectsApi.listProjects).mockReset()
    vi.mocked(projectsApi.createProject).mockReset()
    vi.mocked(projectsApi.deleteProject).mockReset()
    document.body.innerHTML = ''
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

  describe('deleting a project', () => {
    async function openDeleteDialog() {
      vi.mocked(projectsApi.listProjects).mockResolvedValue([onboarding, pilot])
      const wrapper = await mountView()
      await wrapper.find('[aria-label="Delete project Pilot"]').trigger('click')
      return wrapper
    }

    const dialogOpen = (wrapper: Awaited<ReturnType<typeof mountView>>) =>
      wrapper.find('dialog').attributes('open') !== undefined
    const projectNames = (wrapper: Awaited<ReturnType<typeof mountView>>) =>
      wrapper.findAll('.project-list__name').map((n) => n.text())

    it('asks for confirmation, naming the project, before calling the API', async () => {
      const wrapper = await openDeleteDialog()

      expect(dialogOpen(wrapper)).toBe(true)
      expect(wrapper.find('.confirm-dialog__title').text()).toBe('Delete “Pilot”?')
      expect(wrapper.find('dialog').text()).toContain("can't be undone")
      expect(projectsApi.deleteProject).not.toHaveBeenCalled()
    })

    it('does nothing when cancelled', async () => {
      const wrapper = await openDeleteDialog()

      await wrapper.find('.confirm-dialog__cancel-btn').trigger('click')

      expect(dialogOpen(wrapper)).toBe(false)
      expect(projectsApi.deleteProject).not.toHaveBeenCalled()
      expect(projectNames(wrapper)).toEqual(['Onboarding', 'Pilot'])
    })

    it('deletes the project on confirm, removes the row and closes the dialog', async () => {
      vi.mocked(projectsApi.deleteProject).mockResolvedValue(undefined)
      const wrapper = await openDeleteDialog()

      await wrapper.find('.confirm-dialog__confirm-btn').trigger('click')
      await flushPromises()

      expect(projectsApi.deleteProject).toHaveBeenCalledWith('p2')
      expect(projectNames(wrapper)).toEqual(['Onboarding'])
      expect(dialogOpen(wrapper)).toBe(false)
      expect(document.activeElement).toBe(wrapper.find('.project-list__heading').element)
    })

    it('keeps the dialog open with the error when the delete fails', async () => {
      vi.mocked(projectsApi.deleteProject).mockRejectedValue(new projectsApi.ApiError(500, 'Internal Server Error'))
      const wrapper = await openDeleteDialog()

      await wrapper.find('.confirm-dialog__confirm-btn').trigger('click')
      await flushPromises()

      expect(dialogOpen(wrapper)).toBe(true)
      expect(wrapper.find('dialog [role="alert"]').text()).toBe('Internal Server Error')
      expect(projectNames(wrapper)).toEqual(['Onboarding', 'Pilot'])
    })
  })
})
