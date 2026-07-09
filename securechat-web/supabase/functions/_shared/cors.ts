export const allowedOrigins = [
  'http://localhost:5179',
  'http://127.0.0.1:5179',
  'http://localhost:3000',
  'http://10.149.61.225:5179',
  'https://umchxdjwypdwqpkwfwth.supabase.co',
]

function isOriginAllowed(origin: string | null): boolean {
  if (!origin) return false
  const originLower = origin.toLowerCase()
  return allowedOrigins.some((allowed) => {
    if (allowed.startsWith('https://*.')) {
      return originLower.endsWith(allowed.slice(9).toLowerCase())
    }
    if (allowed.endsWith(':5179') && allowed.startsWith('http://')) {
      const url = new URL(origin)
      return url.port === '5179' && url.protocol === 'http:'
    }
    return originLower === allowed.toLowerCase()
  })
}

export function getCorsHeaders(request: Request): Record<string, string> {
  const origin = request.headers.get('origin')
  const allowOrigin = origin && isOriginAllowed(origin) ? origin : 'http://localhost:5179'
  return {
    'Access-Control-Allow-Origin': allowOrigin,
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
    'Access-Control-Allow-Credentials': 'true',
    'Access-Control-Max-Age': '86400',
    'Vary': 'Origin',
  }
}

export const corsHeaders = getCorsHeaders(new Request('http://localhost'))
