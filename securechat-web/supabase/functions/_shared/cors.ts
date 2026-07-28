export const ALLOWED_ORIGINS = [
  'http://localhost:5179',
  'http://localhost:3000',
  'https://securchat-web.vercel.app'
];

export function isAllowedOrigin(origin: string | null): boolean {
  if (!origin) return false;
  
  const originLower = origin.toLowerCase();
  
  return ALLOWED_ORIGINS.some((allowed) => {
    return originLower === allowed.toLowerCase();
  });
}

export function corsHeaders(req: Request): Record<string, string> {
  const origin = req.headers.get('Origin');
  
  const headers: Record<string, string> = {
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'authorization, apikey, content-type, x-client-info, accept, origin',
    'Access-Control-Max-Age': '86400',
    'Vary': 'Origin',
  };

  // Only append Access-Control-Allow-Origin if it is in the whitelist.
  // Never hardcode localhost or use '*' blindly.
  if (isAllowedOrigin(origin)) {
    headers['Access-Control-Allow-Origin'] = origin!;
  }

  return headers;
}

export function handleCors(req: Request): Response | null {
  const origin = req.headers.get('Origin');
  
  // Basic heuristic to detect development environment
  const supabaseUrl = Deno.env.get('SUPABASE_URL') || '';
  const isDev = supabaseUrl.includes('localhost') || supabaseUrl.includes('127.0.0.1');

  // Reject unknown origins safely
  // If the browser sends an Origin and it's not in the whitelist, we return a 403 Forbidden.
  if (origin && !isAllowedOrigin(origin)) {
    if (isDev) {
      console.warn(JSON.stringify({
        level: 'warn',
        message: 'Rejected unknown origin',
        origin,
        method: req.method,
        path: new URL(req.url).pathname
      }));
    }
    
    // Proper Error Response for forbidden origins
    return new Response(
      JSON.stringify({ error: 'Origin not allowed by CORS policy' }),
      {
        status: 403,
        headers: {
          'Content-Type': 'application/json',
          'Vary': 'Origin'
        }
      }
    );
  }

  // Preflight request handling
  if (req.method === 'OPTIONS') {
    if (isDev) {
      console.log(JSON.stringify({
        level: 'info',
        message: 'Preflight request approved',
        origin,
        method: req.method,
        path: new URL(req.url).pathname
      }));
    }

    // Return HTTP 200 for OPTIONS per requirements
    return new Response(null, {
      status: 200,
      headers: corsHeaders(req)
    });
  }

  return null;
}
