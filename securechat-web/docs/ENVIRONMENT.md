# Environment Variables

## Required Variables

### Supabase
| Variable | Description | How to Get |
|----------|-------------|------------|
| `VITE_SUPABASE_URL` | Supabase project URL | Supabase Dashboard > Project Settings > API > Project URL |
| `VITE_SUPABASE_ANON_KEY` | Supabase anonymous key | Supabase Dashboard > Project Settings > API > anon public key |

### App
| Variable | Description | Default |
|----------|-------------|---------|
| `VITE_APP_NAME` | Application display name | `SecureChat AI` |
| `VITE_APP_URL` | Production URL | `http://localhost:5179` |

### Web Push
| Variable | Description | How to Get |
|----------|-------------|------------|
| `VITE_VAPID_PUBLIC_KEY` | VAPID public key for push notifications | `npx web-push generate-vapid-keys` or https://web-push-codelab.glitch.me/ |

The corresponding `VAPID_PRIVATE_KEY` and `VAPID_SUBJECT` must be set as Supabase Edge Function secrets.

## Optional Variables

### Payments (Razorpay)
| Variable | Description | Default |
|----------|-------------|---------|
| `VITE_RAZORPAY_KEY_ID` | Razorpay API key | `rzp_test_xxx` |

### WebSocket (Legacy)
| Variable | Description | Default |
|----------|-------------|---------|
| `VITE_SOCKET_URL` | Socket.io server URL | `http://localhost:3001` |

### Feature Flags
| Variable | Description | Default |
|----------|-------------|---------|
| `VITE_OPENROUTER_ENABLED` | Enable AI threat detection | `true` |
| `VITE_ENABLE_E2E` | Enable end-to-end encryption | `true` |
| `VITE_ENABLE_VOICE` | Enable voice messages | `true` |
| `VITE_ENABLE_LOCATION` | Enable location sharing | `true` |

### Monitoring (Optional)
| Variable | Description |
|----------|-------------|
| `VITE_SENTRY_DSN` | Sentry DSN for error tracking |
| `VITE_POSTHOG_KEY` | PostHog API key for product analytics |
| `VITE_POSTHOG_HOST` | PostHog host URL |

## Supabase Edge Function Secrets

The following secrets must be set in Supabase:

```bash
supabase secrets set OPENROUTER_API_KEY=sk-or-v1-xxx
supabase secrets set VAPID_PUBLIC_KEY=xxx
supabase secrets set VAPID_PRIVATE_KEY=xxx
supabase secrets set VAPID_SUBJECT=mailto:admin@securechat.app
supabase secrets set RAZORPAY_WEBHOOK_SECRET=xxx
supabase secrets set CRON_SECRET=xxx
```

Get your project ref:
```bash
supabase link --project-ref umchxdjwypdwqpkwfwth
```
