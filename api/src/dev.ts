import { serve } from '@hono/node-server'

import './lib/load-env.js'

import { app } from './app.js'

const port = Number(process.env.PORT ?? 3000)

serve({
  fetch: app.fetch,
  port,
})

console.log(`API server listening on http://localhost:${port}`)
