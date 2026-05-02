import { app } from './dist/src/app.js'

const createForwardedRequest = (request) => {
  const url = new URL(request.url)
  const forwardedPath = url.searchParams.get('_path')

  if (forwardedPath) {
    url.pathname = `/api/${forwardedPath}`
    url.searchParams.delete('_path')
  }

  return new Request(url, request)
}

const handler = (request) => {
  return app.fetch(createForwardedRequest(request))
}

export const DELETE = handler
export const GET = handler
export const OPTIONS = handler
export const PATCH = handler
export const POST = handler
export const PUT = handler
