# Security Overview

## Authentication & Authorization
- **PKCE Flow**: OAuth 2.0 PKCE for secure authentication
- **Row-Level Security (RLS)**: All database tables protected
- **JWT Tokens**: Short-lived access tokens with refresh
- **Session Management**: HTTP-only cookie refresh tokens

## Encryption
- **End-to-End**: ECDH key exchange + AES-GCM 256-bit via Web Crypto API
- **In Transit**: TLS 1.3 for all API and WebSocket connections
- **At Rest**: Supabase encryption at rest (AES-256)

## Content Security
- **CSP Headers**: Strict Content-Security-Policy via Vercel headers
- **Input Validation**: Zod schemas on all user inputs
- **Output Sanitization**: HTML entity encoding for displayed content
- **AI Threat Detection**: Real-time content analysis via GPT-4o-mini

## Infrastructure
- **Vercel**: DDoS protection, automatic HTTPS, WAF
- **Supabase**: Managed PostgreSQL with automatic backups
- **Edge Functions**: Isolated Deno runtime for serverless logic

## Environment Variables
- All secrets stored as Vercel environment variables
- Supabase secrets for Edge Functions
- No secrets committed to version control

## Monitoring
- Optional Sentry integration for error tracking
- Optional PostHog for product analytics
- Audit logging for security-critical events
