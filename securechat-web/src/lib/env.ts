const ENV_VARS = [
  'VITE_SUPABASE_URL',
  'VITE_SUPABASE_ANON_KEY',
  'VITE_VAPID_PUBLIC_KEY',
] as const

type EnvVar = typeof ENV_VARS[number]

const missing: EnvVar[] = []

for (const key of ENV_VARS) {
  if (!import.meta.env[key]) {
    missing.push(key)
  }
}

export const env = {
  SUPABASE_URL: import.meta.env.VITE_SUPABASE_URL as string,
  SUPABASE_ANON_KEY: import.meta.env.VITE_SUPABASE_ANON_KEY as string,
  APP_NAME: import.meta.env.VITE_APP_NAME || 'SecureChat AI',
  APP_URL: import.meta.env.VITE_APP_URL || 'http://localhost:5179',
  VAPID_PUBLIC_KEY: import.meta.env.VITE_VAPID_PUBLIC_KEY as string,
  RAZORPAY_KEY_ID: import.meta.env.VITE_RAZORPAY_KEY_ID || 'rzp_test_placeholder',
  SOCKET_URL: import.meta.env.VITE_SOCKET_URL || '',
  OPENROUTER_ENABLED: import.meta.env.VITE_OPENROUTER_ENABLED === 'true',
  ENABLE_E2E: import.meta.env.VITE_ENABLE_E2E === 'true',
  ENABLE_VOICE: import.meta.env.VITE_ENABLE_VOICE === 'true',
  ENABLE_LOCATION: import.meta.env.VITE_ENABLE_LOCATION === 'true',
  SENTRY_DSN: import.meta.env.VITE_SENTRY_DSN || '',
  POSTHOG_KEY: import.meta.env.VITE_POSTHOG_KEY || '',
  POSTHOG_HOST: import.meta.env.VITE_POSTHOG_HOST || '',
  get missingVars(): readonly EnvVar[] { return missing },
  get isValid(): boolean { return missing.length === 0 },
} as const

if (!env.isValid) {
  console.warn(
    `Missing required environment variables: ${missing.join(', ')}. ` +
    'Some features may not work correctly. Copy .env.example to .env and fill in the values.'
  )
}