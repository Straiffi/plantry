import type { MiddlewareHandler } from 'hono'

const shouldLogRequestTimings = () => {
  return process.env.PLANTRY_LOG_REQUEST_TIMINGS === 'true'
}

export const requestTimingMiddleware: MiddlewareHandler = async (context, next) => {
  const startedAt = performance.now()

  await next()

  const durationMs = performance.now() - startedAt
  const roundedDurationMs = durationMs.toFixed(1)

  context.header('Server-Timing', `app;dur=${roundedDurationMs}`)
  context.header('X-Response-Time', `${roundedDurationMs}ms`)

  if (shouldLogRequestTimings()) {
    console.info(JSON.stringify({
      durationMs: Number(roundedDurationMs),
      method: context.req.method,
      path: context.req.path,
      status: context.res.status,
    }))
  }
}
