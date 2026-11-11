// Talks to our own API under /api (same origin; Vite proxies it in dev, see
// ADR 0005). The shapes mirror server/src/projects/dto.ts.

export interface Project {
  id: string
  name: string
  /** ISO 8601. */
  createdAt: string
}

export class ApiError extends Error {
  readonly status: number

  constructor(status: number, message: string) {
    super(message)
    this.name = 'ApiError'
    this.status = status
  }
}

export async function listProjects(): Promise<Project[]> {
  return request<Project[]>('/api/projects')
}

export async function createProject(name: string): Promise<Project> {
  return request<Project>('/api/projects', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name }),
  })
}

/**
 * Deletes a Project and, through the database's cascades, everything in it.
 * Throws an ApiError with status 404 when the Project does not exist or
 * belongs to another User.
 */
export async function deleteProject(id: string): Promise<void> {
  await request<void>(`/api/projects/${encodeURIComponent(id)}`, { method: 'DELETE' })
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(path, init)
  if (!res.ok) {
    throw new ApiError(res.status, await errorMessage(res))
  }
  // 204 No Content has no body to parse; callers of such endpoints use T = void.
  if (res.status === 204) {
    return undefined as T
  }
  return (await res.json()) as T
}

/** The API sends `{ error: string }`; fall back to the status text. */
async function errorMessage(res: Response): Promise<string> {
  try {
    const body: unknown = await res.json()
    if (typeof body === 'object' && body !== null && 'error' in body && typeof body.error === 'string') {
      return body.error
    }
  } catch {
    // Not JSON (e.g. the proxy's error page when the API isn't running).
  }
  return `Request failed (${res.status} ${res.statusText}).`
}
