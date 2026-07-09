# Security Documentation

## Overview

SecureChat AI implements defense-in-depth security across all layers: client, network, API, database, and infrastructure.

## Security Layers

### 1. Transport Security
- **HTTPS**: All production traffic encrypted via TLS (Vercel + Supabase).
- **CSP**: Content Security Policy header restricts script/style sources, prevents clickjacking (`frame-src 'none'`), and restricts form actions.
- **HSTS**: Vercel adds Strict-Transport-Security header automatically.

### 2. Authentication
- **Supabase Auth (GoTrue)**: PKCE OAuth flow protects against authorization code interception.
- **Session Management**: JWT tokens with 1-hour expiry, auto-refresh enabled.
- **Refresh Token Rotation**: Each refresh invalidates the previous token.
- **Password Policy**: Minimum 6 characters, optional complexity requirements.
- **Email Verification**: Configurable (disabled in dev, recommended for production).

### 3. Authorization
- **Row-Level Security (RLS)**: Every database table has RLS policies:
  - Users can only read/write their own data
  - Chat participants can only access their shared conversations
  - Admins have explicit moderation access
  - Audit logs are append-only
- **Privilege Separation**:
  - `anon` role: Public access (login, signup)
  - `authenticated` role: User data access (limited by RLS)
  - `service_role` key: Backend-only (Edge Functions, cron jobs)

### 4. API Security
- **API Key Rotation**: Anon key can be rotated from Supabase dashboard.
- **Edge Function Authentication**:
  - `ai-analyze`: Custom JWT verification
  - `payment-webhook`: HMAC-SHA256 signature verification
  - `auto-delete`, `scheduled-messages`: CRON_SECRET header
  - `delete-account`, `push-notification`: Custom JWT via `supabase.auth.getUser()`
- **Rate Limiting**: Server-side rate limits on auth endpoints (30 sign-in/signup per 5 min per IP).

### 5. Input Validation
- **Client-side**: Zod schemas validate all user inputs (email, password, display name, message content, reports, payments).
- **Server-side**: PostgreSQL CHECK constraints and RLS policies prevent invalid data.
- **File Upload**: MIME type validation, size limits, path sanitization.
- **Content Sanitization**: HTML entity encoding for display, stripping for storage.

### 6. Data Protection
- **End-to-End Encryption (Optional)**:
  - ECDH (P-256) key exchange for shared secret derivation
  - AES-GCM (256-bit) for message encryption
  - Per-message random IV/nonce
  - Keys never transmitted; only public keys stored
- **Encryption at Rest**: Supabase encrypts all data at rest (AES-256).
- **Database**: pgcrypto extension for cryptographic functions.

### 7. Storage Security
- **Signed URLs**: Non-avatar files use time-limited signed URLs (1-hour default).
- **Bucket Policies**: RLS on all storage buckets:
  - `chat-media`, `voice-notes`: Only chat participants can access
  - `avatars`: Public read, authenticated write
  - `payment-screenshots`: Admin read only
- **File Validation**: Server-side MIME type checking.

### 8. Session Security
- **PKCE Flow**: Prevents authorization code interception.
- **HttpOnly Cookies**: Session cookies not accessible via JavaScript.
- **Session Revocation**: Admin can revoke all sessions for a user.
- **Auto-Logout**: Session expires on token refresh failure.

### 9. Monitoring & Logging
- **Audit Logs**: Immutable table tracks security-relevant events (account deletion, payment verification, admin actions).
- **Client-side Logging**: Structured logging with sensitive data redaction:
  - Passwords, tokens, secrets, keys are automatically [REDACTED]
- **Error Monitoring**: Optional Sentry integration for error tracking.

### 10. Security Headers

Configured in `index.html` via `<meta http-equiv>` CSP tag:

```
default-src 'self'
script-src 'self'
script-src-elem 'self' 'unsafe-inline'
style-src 'self' 'unsafe-inline'
img-src 'self' data: https: blob:
font-src 'self' https://fonts.gstatic.com
connect-src 'self' https://*.supabase.co wss://*.supabase.co https://api.openrouter.ai
frame-src 'none'
object-src 'none'
base-uri 'self'
form-action 'self'
```

## Known Security Considerations

1. **`'unsafe-inline'` for scripts**: Required for Vite's HMR in development and some React patterns. In production, Vite generates hashed script tags automatically.

2. **VAPID Public Key Leakage**: The VAPID public key is intentionally public (required by Web Push API spec). The private key must be kept as a Supabase secret.

3. **Client-side E2E Keys**: E2E public keys are stored in the database. Users are responsible for backing up their private keys.

4. **Rate Limiting**: Client-side rate limiting is implemented via `useRateLimit` hook. Server-side rate limits should be configured in Supabase for production.

## Security Checklist

- [x] HTTPS enabled (Vercel + Supabase)
- [x] CSP headers configured
- [x] RLS on all tables
- [x] Input validation (Zod)
- [x] Output encoding/sanitization
- [x] File upload validation (MIME + size)
- [x] Signed URLs for storage
- [x] PKCE auth flow
- [x] JWT token rotation
- [x] Audit logging
- [x] Rate limiting (client + server)
- [x] Error boundary (React)
- [x] Sensitive data redaction in logs
- [x] E2E encryption (optional)
- [ ] Session timeout configuration
- [ ] Brute force protection (Supabase handles this server-side)
- [ ] Security headers via Vercel `vercel.json` (recommended for production)
