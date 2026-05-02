import { Hono } from 'hono'
import { cors } from 'hono/cors'

import { appOrigin } from './lib/env.js'
import { auth } from './lib/auth.js'
import { authSessionMiddleware, type AppEnv } from './middleware/auth-session.js'
import { meRoute } from './routes/me.js'

export const app = new Hono<AppEnv>().basePath('/api')

app.use('/auth/*', cors({
  allowHeaders: ['Content-Type', 'Authorization'],
  allowMethods: ['GET', 'POST', 'OPTIONS'],
  credentials: true,
  exposeHeaders: ['Content-Length'],
  maxAge: 600,
  origin: appOrigin,
}))

app.on(['GET', 'POST'], '/auth/*', (context) => {
  return auth.handler(context.req.raw)
})

app.use('*', authSessionMiddleware)

app.get('/', (context) => {
  return context.json({
    message: 'Recipe App API phase 2 foundation is ready',
    status: 'ok',
  })
})

app.get('/health', (context) => {
  return context.json({
    service: 'api',
    status: 'ok',
  })
})

app.route('/me', meRoute)
