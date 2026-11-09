// The SQL for the projects endpoints. The owner writes the three statements;
// the functions around them are the contract the routes and tests rely on.
//
// Every statement must be scoped by owner_id, so one User can never read or
// delete another User's Project. Use $1, $2 placeholders, never string
// concatenation.

import type { Db } from "../db/pool.ts";
import type { ProjectRow } from "./dto.ts";

type ProjectListRow = Pick<ProjectRow, "id" | "name" | "created_at">;

const LIST_PROJECTS_SQL = `SELECT id, name, created_at FROM projects 
  WHERE owner_id = $1
  ORDER BY created_at DESC, id;`;

const CREATE_PROJECT_SQL = `INSERT INTO projects
(owner_id, name)
VALUES($1, $2)
RETURNING id, name, created_at;
`;

const DELETE_PROJECT_SQL = `DELETE FROM projects
WHERE id = $1 AND owner_id = $2;`;

export async function listProjects(
  db: Db,
  ownerId: string,
): Promise<ProjectListRow[]> {
  const result = await db.query<ProjectListRow>(LIST_PROJECTS_SQL, [ownerId]);
  return result.rows;
}

export async function createProject(
  db: Db,
  ownerId: string,
  name: string,
): Promise<ProjectListRow> {
  const result = await db.query<ProjectListRow>(CREATE_PROJECT_SQL, [
    ownerId,
    name,
  ]);
  const row = result.rows[0];
  if (!row) {
    throw new Error(
      "CREATE_PROJECT_SQL returned no row; does it end with RETURNING?",
    );
  }
  return row;
}

/** Returns false when no Project with that id belongs to the owner. */
export async function deleteProject(
  db: Db,
  ownerId: string,
  projectId: string,
): Promise<boolean> {
  const result = await db.query(DELETE_PROJECT_SQL, [projectId, ownerId]);
  return result.rowCount === 1;
}
