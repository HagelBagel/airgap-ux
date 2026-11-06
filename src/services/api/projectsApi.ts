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

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(path, init)
  if (!res.ok) {
    throw new ApiError(res.status, await errorMessage(res))
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
