// The shape of a `projects` row as `pg` returns it, and the camelCase JSON the
// API sends. Keeping the mapper here means the database's naming never leaks
// into the client, and a renamed column changes one function.

export interface ProjectRow {
  id: string
  owner_id: string
  name: string
  created_at: Date
  updated_at: Date
}

export interface ProjectDto {
  id: string
  name: string
  /** ISO 8601, e.g. "2026-11-06T09:30:00.000Z". */
  createdAt: string
}

export function toProjectDto(row: Pick<ProjectRow, 'id' | 'name' | 'created_at'>): ProjectDto {
  return {
    id: row.id,
    name: row.name,
    createdAt: row.created_at.toISOString(),
  }
}

export const PROJECT_NAME_MAX_LENGTH = 200

export type ParsedName = { ok: true; name: string } | { ok: false; error: string }

/**
 * Trims the name and checks it is 1–200 characters. The database enforces the
 * same rule with a CHECK constraint; this check exists so the client gets a
 * 400 with a message instead of a 500 from a constraint violation.
 *
 * The two rules differ on purpose for whitespace: JS `trim()` removes tabs,
 * newlines and non-breaking spaces, while the CHECK's `btrim(name)` removes
 * only spaces. The API is the stricter of the two, so a tab-only name gets a
 * 400 here but would pass a direct INSERT.
 */
export function parseProjectName(input: unknown): ParsedName {
  if (typeof input !== 'string') {
    return { ok: false, error: 'name must be a string.' }
  }
  const name = input.trim()
  if (name.length === 0) {
    return { ok: false, error: 'name must not be empty.' }
  }
  // Count code points, as Postgres char_length does; `.length` counts UTF-16
  // units, so an emoji would count as 2 here and 1 in the database.
  if ([...name].length > PROJECT_NAME_MAX_LENGTH) {
    return { ok: false, error: `name must be at most ${PROJECT_NAME_MAX_LENGTH} characters.` }
  }
  return { ok: true, name }
}
