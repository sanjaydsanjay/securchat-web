import { getCorsHeaders } from './cors.ts'

export function handleError(err: unknown, request?: Request): Response {
  const message = err instanceof Error ? err.message : 'Internal Server Error'
  const headers = request ? getCorsHeaders(request) : { 'Content-Type': 'application/json' }
  headers['Content-Type'] = 'application/json'

  console.error(JSON.stringify({
    level: 'error',
    timestamp: new Date().toISOString(),
    message,
    error: err instanceof Error ? { name: err.name, stack: err.stack?.split('\n').slice(0, 3).join('\n') } : err,
  }))

  return new Response(
    JSON.stringify({ error: message }),
    { status: 500, headers }
  )
}

export function handleBadRequest(message: string, request?: Request): Response {
  const headers = request ? getCorsHeaders(request) : { 'Content-Type': 'application/json' }
  headers['Content-Type'] = 'application/json'

  return new Response(
    JSON.stringify({ error: message }),
    { status: 400, headers }
  )
}

export function handleUnauthorized(message = 'Unauthorized', request?: Request): Response {
  const headers = request ? getCorsHeaders(request) : { 'Content-Type': 'application/json' }
  headers['Content-Type'] = 'application/json'

  return new Response(
    JSON.stringify({ error: message }),
    { status: 401, headers }
  )
}
