import { serve } from '@hono/node-server'
import { createApp } from './app.ts'
import { loadConfig } from './config.ts'
import { createPool } from './db/pool.ts'

const config = loadConfig(process.env)
const pool = createPool(config.databaseUrl)
const app = createApp({ db: pool, devUserId: config.devUserId })

serve({ fetch: app.fetch, port: config.port, hostname: '127.0.0.1' }, (info) => {
  console.log(`API listening on http://127.0.0.1:${info.port}/api`)
})
