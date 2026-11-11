/**
 * The current User's Projects, as the API returns them. Shared by the
 * project list on `/` and the dashboard on `/projects/:id`, which looks up
 * the Project's name here.
 */

import { defineStore } from 'pinia'
import { readonly, ref } from 'vue'
import * as projectsApi from '../services/api/projectsApi'
import type { Project } from '../services/api/projectsApi'

export type ProjectsStatus = 'idle' | 'loading' | 'ready' | 'error'

export const useProjectsStore = defineStore('projects', () => {
  const projects = ref<Project[]>([])
  const status = ref<ProjectsStatus>('idle')
  const error = ref<string | null>(null)

  let inFlight: Promise<void> | null = null

  /** Fetches the list. Concurrent calls share one request. */
  function load(): Promise<void> {
    inFlight ??= (async () => {
      status.value = 'loading'
      error.value = null
      try {
        projects.value = await projectsApi.listProjects()
        status.value = 'ready'
      } catch (e) {
        error.value = messageOf(e)
        status.value = 'error'
      } finally {
        inFlight = null
      }
    })()
    return inFlight
  }

  /** Loads the list unless it is already loaded. */
  async function ensureLoaded(): Promise<void> {
    if (status.value !== 'ready') await load()
  }

  /** Creates a Project and adds it to the list. Rethrows API errors for the form to show. */
  async function create(name: string): Promise<Project> {
    const project = await projectsApi.createProject(name)
    projects.value = [...projects.value, project]
    return project
  }

  /**
   * Deletes a Project, then drops it from the list. Waits for the API rather
   * than removing it first: the delete cannot be undone, so the list should
   * not show it gone before it is. A 404 means it is already gone (another
   * tab, say), which is the outcome the caller wanted. Other errors are
   * rethrown for the confirmation dialog to show.
   */
  async function remove(id: string): Promise<void> {
    try {
      await projectsApi.deleteProject(id)
    } catch (e) {
      if (!(e instanceof projectsApi.ApiError && e.status === 404)) throw e
    }
    projects.value = projects.value.filter((p) => p.id !== id)
  }

  function byId(id: string): Project | undefined {
    return projects.value.find((p) => p.id === id)
  }

  return {
    projects: readonly(projects),
    status: readonly(status),
    error: readonly(error),
    load,
    ensureLoaded,
    create,
    remove,
    byId,
  }
})

function messageOf(e: unknown): string {
  return e instanceof Error ? e.message : String(e)
}
