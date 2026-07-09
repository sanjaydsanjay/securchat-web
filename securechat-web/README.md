# SecureChat AI

**Anonymous Real-Time Communication Platform with AI-Powered Threat Detection**

SecureChat AI is a production-grade, end-to-end encrypted messaging platform that prioritizes user privacy and safety. It combines real-time chat with AI-driven content moderation, supporting E2E encryption, voice messages, media sharing, and a premium subscription model.

## Features

- **Anonymous Communication**: 6-digit unique IDs protect user identity. No phone number required.
- **End-to-End Encryption**: Optional ECDH + AES-GCM encryption for private conversations.
- **AI Threat Detection**: Real-time analysis of messages using GPT-4o-mini via OpenRouter.
- **Real-Time Messaging**: Powered by Supabase Realtime (WebSocket) for instant message delivery.
- **Typing Indicators**: Live typing status with configurable timeout (5s).
- **Voice Messages**: In-browser recording via MediaRecorder API with WebM encoding.
- **Media Sharing**: Image, video, and document sharing with MIME validation and size limits.
- **Location Sharing**: Optional GPS location sharing in messages.
- **Message Reactions**: Emoji reactions (thumbs up, heart, laugh, etc.).
- **Message Editing & Deletion**: Edit within 2 minutes, delete for self or everyone within 2 hours.
- **Scheduled Messages**: Send messages at a future date/time.
- **Push Notifications**: Web Push API notifications via VAPID.
- **Premium Tiers**: Basic/Standard/Premium/Enterprise plans with increased quotas.
- **Admin Dashboard**: User management, payment verification, report moderation.
- **Dark Mode**: Multiple themes (Light, Dark, Midnight, Forest, System).
- **Keyboard Shortcuts**: Quick actions via Ctrl/Cmd + K (search), N (new chat), etc.
- **Auto-Delete Messages**: Configurable auto-deletion (1h to 7 days or after read).
- **Screen Capture Detection**: Warns when screenshot is taken in sensitive chats.
- **Accessibility**: WCAG-compliant ARIA labels, keyboard navigation, screen reader support.

## Tech Stack

| Layer | Technology |
|-------|-----------|
| **Frontend** | React 19, TypeScript 6, Vite 8, Tailwind CSS 3 |
| **State** | Zustand 4, TanStack React Query 5 |
| **Routing** | React Router 7 |
| **Backend** | Supabase (PostgreSQL 17, PostgREST, GoTrue Auth) |
| **Real-time** | Supabase Realtime (WebSocket) |
| **AI** | OpenRouter (GPT-4o-mini, Claude 3 Haiku, Gemini Flash 1.5) |
| **Payments** | Razorpay (test/live) |
| **Push** | Web Push API (VAPID) |
| **E2E Encryption** | Web Crypto API (ECDH + AES-GCM) |
| **Edge Functions** | Deno 2 (Supabase Edge Runtime) |
| **Testing** | Vitest, Testing Library, Playwright |
| **Monitoring** | Sentry, PostHog (optional, feature-flagged) |
| **Package Manager** | npm |

## Quick Start

### Prerequisites

- Node.js >= 20
- A Supabase project (free tier works)
- OpenRouter API key (free tier available)
- npm

### Setup

```bash
# 1. Clone the repository
git clone <repo-url>
cd securechat-web

# 2. Install dependencies
npm install

# 3. Copy environment file and fill in your values
cp .env.example .env

# 4. Start development server
npm run dev
```

### Environment Variables

See [docs/ENVIRONMENT.md](docs/ENVIRONMENT.md) for a complete reference.

## Project Structure

```
securechat-web/
├── src/
│   ├── components/       # React components (chat, layout, modals, ui)
│   ├── hooks/            # Custom React hooks
│   ├── lib/              # Configuration, utilities, constants
│   ├── pages/            # Route pages
│   ├── services/         # API services (auth, chat, storage, etc.)
│   ├── stores/           # Zustand state stores
│   ├── types/            # TypeScript type definitions
│   ├── utils/            # Utility functions (encryption, validation, etc.)
│   └── test/             # Test utilities
├── supabase/
│   ├── functions/        # Edge Functions (Deno)
│   ├── migrations/       # Database migrations (14 files)
│   ├── policies/         # RLS policy documentation
│   └── tests/            # Database tests
├── tests/                # Playwright E2E and load tests
└── docs/                 # Documentation
```

## Available Scripts

| Script | Description |
|--------|-------------|
| `npm run dev` | Start Vite dev server |
| `npm run build` | TypeScript check + Vite production build |
| `npm run test` | Run Vitest unit tests |
| `npm run lint` | Run Oxlint linter |
| `npm run type-check` | TypeScript type checking only |
| `npm run preview` | Preview production build |

## Architecture

See [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) for a detailed architecture overview.

## Database Schema

10 tables with full RLS policies. See [docs/DATABASE_SCHEMA.md](docs/DATABASE_SCHEMA.md).

## Security

- CSP headers configured in index.html
- Row-Level Security (RLS) on all tables
- Input validation via Zod schemas
- Output encoding/sanitization
- Rate limiting on auth, messages, uploads
- E2E encryption (ECDH + AES-GCM)
- Secure session management (PKCE flow)
- Audit logging for security events

See [docs/SECURITY.md](docs/SECURITY.md) for the full security analysis.

## API Documentation

See [docs/API.md](docs/API.md) for Edge Function API reference.

## Deployment

```bash
# Build for production
npm run build

# Deploy to Vercel
vercel --prod
```

See [docs/DEPLOYMENT.md](docs/DEPLOYMENT.md) for complete deployment guide.

## Testing

```bash
# Run unit tests
npm run test

# Run E2E tests (requires dev server)
npx playwright test

# Run load tests
npx k6 run tests/load/k6-load-test.js
```

## License

MIT
