import { handle } from 'hono/vercel'

import { app } from './src/app'

const handler = handle(app)

export const DELETE = handler
export const GET = handler
export const OPTIONS = handler
export const PATCH = handler
export const POST = handler
export const PUT = handler
