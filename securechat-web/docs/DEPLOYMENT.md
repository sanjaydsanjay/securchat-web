# Deployment Guide

## Prerequisites

- Node.js >= 20
- Supabase account (free tier: https://supabase.com)
- Vercel account (free tier: https://vercel.com)
- OpenRouter API key (free: https://openrouter.ai)
- Razorpay account (optional, for payments: https://razorpay.com)

## Step 1: Supabase Setup

### Create Project
```bash
# Install Supabase CLI
npm install -g supabase

# Login
supabase login

# Initialize local project
cd securechat-web
supabase init

# Link to remote project
supabase link --project-ref your-project-ref
```

### Apply Migrations
```bash
# Push all migrations to remote database
supabase db push
```

### Configure Auth Settings
1. Go to Supabase Dashboard > Authentication > Settings
2. Set Site URL: `https://your-app.vercel.app`
3. Add Redirect URLs:
   - `https://your-app.vercel.app/auth/callback`
   - `http://localhost:5179/auth/callback` (for local dev)

### Set Edge Function Secrets
```bash
supabase secrets set OPENROUTER_API_KEY=sk-or-v1-xxx
supabase secrets set VAPID_PUBLIC_KEY=xxx
supabase secrets set VAPID_PRIVATE_KEY=xxx
supabase secrets set VAPID_SUBJECT=mailto:admin@securechat.app
supabase secrets set RAZORPAY_WEBHOOK_SECRET=xxx
supabase secrets set CRON_SECRET=your-random-cron-secret
```

### Deploy Edge Functions
```bash
supabase functions deploy ai-analyze
supabase functions deploy payment-webhook
supabase functions deploy push-notification
supabase functions deploy delete-account
supabase functions deploy export-chat
supabase functions deploy auto-delete
supabase functions deploy scheduled-messages
```

### Enable Extensions
Ensure these extensions are enabled (they are in migrations):
- `pgcrypto` - Cryptographic functions
- `pg_cron` - Scheduled jobs
- `pg_net` - HTTP requests from Edge Functions

### Configure Storage Buckets
The migration `20260703000010_create_storage_policies.sql` creates these buckets:
- `chat-media` - Private
- `avatars` - Public read
- `payment-screenshots` - Private
- `voice-notes` - Private

## Step 2: Vercel Deployment

### Environment Variables
Set these in Vercel Dashboard > Project > Settings > Environment Variables:

| Variable | Value |
|----------|-------|
| `VITE_SUPABASE_URL` | `https://your-project.supabase.co` |
| `VITE_SUPABASE_ANON_KEY` | Your anon key |
| `VITE_APP_NAME` | `SecureChat AI` |
| `VITE_APP_URL` | `https://your-app.vercel.app` |
| `VITE_VAPID_PUBLIC_KEY` | Your VAPID public key |
| `VITE_OPENROUTER_ENABLED` | `true` |
| `VITE_RAZORPAY_KEY_ID` | Your Razorpay key |

### Deploy
```bash
# Using Vercel CLI
npm install -g vercel
vercel --prod

# Or connect GitHub repository in Vercel Dashboard
```

### Build Settings (auto-detected)
- Framework: Vite
- Build Command: `npm run build`
- Output Directory: `dist`
- Node.js Version: 20.x

## Step 3: Post-Deployment Verification

### Checklist
- [ ] Frontend loads at `https://your-app.vercel.app`
- [ ] User signup/login works
- [ ] Real-time messaging works
- [ ] File uploads work (check storage bucket policies)
- [ ] Push notifications work
- [ ] Admin dashboard accessible
- [ ] Payment flow works (if configured)
- [ ] AI threat analysis works (if configured)
- [ ] 404 page shows for unknown routes
- [ ] HTTPS enforced (automatic on Vercel)
- [ ] Auth redirects work correctly
- [ ] CORS headers allow frontend origin
- [ ] Edge Functions respond correctly

### Validate Edge Functions
```bash
# Test ai-analyze (replace with your URL)
curl -X POST https://your-project.functions.supabase.co/ai-analyze \
  -H "Authorization: Bearer YOUR_ANON_KEY" \
  -H "Content-Type: application/json" \
  -d '{"message_id":"test","content":"Test message"}'
```

## Database Connection Pooling

For production deployments with concurrent users, use Supabase's built-in connection pooler via pgBouncer to prevent exhausting database connections.

### Configure Connection Pooler

1. In your Supabase Dashboard, go to **Database > Connection Pooling**
2. Enable pgBouncer (Session mode is recommended for this application)
3. Copy the **Session mode** connection string - it follows the pattern: `postgresql://postgres.[project-ref]@aws-0-ap-south-1.pooler.supabase.com:6543/postgres`
4. Supabase clients use the standard REST API (HTTP connections), so connection pooling is primarily relevant for:
   - Direct database access for admin operations
   - Background jobs and cron functions
   - RPC calls that may open multiple connections

### Recommended Pool Settings

| Setting | Value | Reason |
|---|---|---|
| Pool Mode | Session | Handles prepared statements used by migrations |
| Default Pool Size | 15 | 100 concurrent users with REST (stateless) need ~15 DB connections |
| Max Client Connections | 200 | Determined by your Supabase plan |
| Statement Timeout | 30s | Prevents long-running queries from blocking the pool |

### Connection String Priority

Supabase clients connecting via `@supabase/supabase-js` (REST API) **do not use** connection pooling directly - they use the standard Supabase API URL (`https://[project-ref].supabase.co/rest/v1/`). Connection pooling is only needed if you connect directly to the database (e.g., for migrations, admin queries, or cron jobs).

## Step 4: Custom Domain (Optional)

1. Go to Vercel Dashboard > Project > Domains
2. Add your custom domain
3. Update DNS records (CNAME or A record as directed)
4. Update Supabase Auth settings:
   - Site URL: `https://yourdomain.com`
   - Redirect URLs: `https://yourdomain.com/auth/callback`
5. Update `VITE_APP_URL` in Vercel env vars

## Monitoring Setup (Optional)

### Sentry
1. Create Sentry account and project
2. Add `VITE_SENTRY_DSN` to Vercel env vars

### PostHog
1. Create PostHog account and project
2. Add `VITE_POSTHOG_KEY` and `VITE_POSTHOG_HOST` to Vercel env vars

## Production Runbook

### Daily Operations
- Monitor Supabase logs for errors
- Check pg_cron job execution
- Review pending payment verifications
- Review user reports

### Incident Response
1. Check Supabase Dashboard > Logs
2. Check Vercel Dashboard > Logs
3. Review Sentry for client-side errors
4. Check Edge Function logs

### Backup & Recovery
- Supabase provides automatic daily backups on Pro plan
- Database can be restored via Supabase Dashboard
- Storage is replicated across availability zones
