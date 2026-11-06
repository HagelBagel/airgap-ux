// Reads the API's settings from the environment once, at start-up, so a bad
// setting stops the server before it serves a single request.

export interface Config {
  databaseUrl: string
  /** Stands in for the signed-in User until sign-in exists. */
  devUserId: string
  port: number
}

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

export function loadConfig(env: NodeJS.ProcessEnv): Config {
  const databaseUrl = env.DATABASE_URL
  if (!databaseUrl) {
    throw new Error('DATABASE_URL is not set.')
  }

  const devUserId = env.DEV_USER_ID
  if (devUserId && env.NODE_ENV === 'production') {
    // DEV_USER_ID makes every request act as one User with no sign-in.
    // In production that would hand that User's data to anyone.
    throw new Error('DEV_USER_ID must not be set when NODE_ENV=production.')
  }
  if (!devUserId) {
    // There is no sign-in yet, so DEV_USER_ID is the only way to know who the
    // current User is. Without it the API cannot scope any query.
    throw new Error('DEV_USER_ID is not set (needed until sign-in exists).')
  }
  if (!UUID_PATTERN.test(devUserId)) {
    throw new Error('DEV_USER_ID must be a UUID.')
  }

  const port = Number(env.API_PORT ?? 3001)
  if (!Number.isInteger(port) || port <= 0) {
    throw new Error('API_PORT must be a positive integer.')
  }

  return { databaseUrl, devUserId, port }
}

export { UUID_PATTERN }
