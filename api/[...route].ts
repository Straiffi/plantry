import { handle } from 'hono/vercel'

import './src/lib/load-env.js'

import { app } from './src/app.js'

export default handle(app)
