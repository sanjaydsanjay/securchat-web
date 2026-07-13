# SecureChat AI

**Anonymous Real-Time Communication Platform with AI-Powered Threat Detection**

A production-grade, end-to-end encrypted messaging platform prioritizing user privacy and safety.

## Tech Stack

| Layer | Technology |
|-------|-----------|
| **Frontend** | React 19, TypeScript 5, Vite 6, Tailwind CSS 3 |
| **State** | Zustand 5, TanStack React Query 5 |
| **Routing** | React Router 7 |
| **Backend** | Supabase (PostgreSQL, PostgREST, GoTrue Auth) |
| **Real-time** | Supabase Realtime (WebSocket) |
| **AI** | OpenRouter (GPT-4o-mini, Claude 3 Haiku, Gemini Flash 1.5) |
| **Payments** | Razorpay (test/live) |
| **Push** | Web Push API (VAPID) |
| **E2E Encryption** | Web Crypto API (ECDH + AES-GCM) |
| **Edge Functions** | Deno (Supabase Edge Runtime) |
| **Testing** | Vitest, Testing Library, Playwright |
| **Deployment** | Vercel (frontend), Supabase (backend) |

## Quick Start

```bash
# 1. Navigate to project
cd securechat-web

# 2. Install dependencies
npm install

# 3. Set up environment
cp .env.example .env.local

# 4. Start development
npm run dev
```

## Project Structure

```
securechat-web/        # Frontend application (Vite + React)
supabase/              # Supabase migrations, policies, Edge Functions
docs/                  # Architecture, API, deployment documentation
```

## Deployment

See [DEPLOYMENT.md](securechat-web/docs/DEPLOYMENT.md) for complete deployment guide to Vercel + Supabase.

## License

MIT
