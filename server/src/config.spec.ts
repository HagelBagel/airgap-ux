import { describe, expect, it } from 'vitest'
import { loadConfig } from './config.ts'

const DEV_USER_ID = '00000000-0000-4000-8000-000000000001'
const base = { DATABASE_URL: 'postgres://localhost/airgap', DEV_USER_ID }

describe('loadConfig', () => {
  it('reads DATABASE_URL, DEV_USER_ID and a default port', () => {
    expect(loadConfig(base)).toEqual({
      databaseUrl: 'postgres://localhost/airgap',
      devUserId: DEV_USER_ID,
      port: 3001,
    })
  })

  it('refuses to start when DEV_USER_ID is set in production', () => {
    expect(() => loadConfig({ ...base, NODE_ENV: 'production' })).toThrow(
      'DEV_USER_ID must not be set when NODE_ENV=production.',
    )
  })

  it('refuses to start without DATABASE_URL', () => {
    expect(() => loadConfig({ DEV_USER_ID })).toThrow('DATABASE_URL is not set.')
  })

  it('refuses to start without DEV_USER_ID, since there is no sign-in yet', () => {
    expect(() => loadConfig({ DATABASE_URL: base.DATABASE_URL })).toThrow('DEV_USER_ID is not set')
  })

  it('refuses a DEV_USER_ID that is not a UUID', () => {
    expect(() => loadConfig({ ...base, DEV_USER_ID: 'dev' })).toThrow('DEV_USER_ID must be a UUID.')
  })
})
