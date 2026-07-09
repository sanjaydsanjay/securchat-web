# Architecture

## Overview

SecureChat AI follows a modern JAMstack architecture with Supabase as the backend platform.

```
┌──────────────────────────────────────────────────────┐
│                    Client (Browser)                   │
│  ┌──────────┐  ┌──────────┐  ┌───────────────────┐   │
│  │  React    │  │ Zustand  │  │  TanStack Query   │   │
│  │  19       │  │ Stores   │  │  (Cache/Queries)  │   │
│  └────┬─────┘  └──────────┘  └───────────────────┘   │
│       │                                               │
│  ┌────▼─────────────────────────────────────────┐     │
│  │           supabase-js Client                  │     │
│  │  ┌─────────┐ ┌──────────┐ ┌──────────────┐   │     │
│  │  │  Auth   │ │ Realtime │ │  Storage      │   │     │
│  │  │  (PKCE) │ │ (WS)     │ │  (Files)      │   │     │
│  │  └────┬────┘ └────┬─────┘ └──────┬───────┘   │     │
│  └───────┼───────────┼──────────────┼───────────┘     │
└──────────┼───────────┼──────────────┼─────────────────┘
           │           │              │
    ┌──────▼───────────▼──────────────▼─────────────────┐
    │                 Supabase Platform                  │
    │  ┌─────────┐  ┌──────────┐  ┌────────────────┐   │
    │  │ GoTrue  │  │PostgREST │  │  Realtime       │   │
    │  │ (Auth)  │  │ (REST)   │  │  (WebSocket)    │   │
    │  └────┬────┘  └────┬─────┘  └────────────────┘   │
    │       │            │                               │
    │  ┌────▼────────────▼─────────────────────────┐    │
    │  │         PostgreSQL 17 + RLS                │    │
    │  │  (10 tables, pg_cron, pgcrypto, pg_net)    │    │
    │  └────────────────────────────────────────────┘    │
    │       │                                            │
    │  ┌────▼────────────────────────────────────────┐  │
    │  │        Edge Functions (Deno 2)               │  │
    │  │  ┌──────────┐ ┌──────────┐ ┌─────────────┐  │  │
    │  │  │ai-analyze│ │payment   │ │push-notif   │  │  │
    │  │  │          │ │-webhook  │ │-ication     │  │  │
    │  │  ├──────────┤ ├──────────┤ ├─────────────┤  │  │
    │  │  │export    │ │delete    │ │scheduled    │  │  │
    │  │  │-chat     │ │-account  │ │-messages    │  │  │
    │  │  ├──────────┤ ├──────────┤ ├─────────────┤  │  │
    │  │  │auto      │ │          │ │             │  │  │
    │  │  │-delete   │ │          │ │             │  │  │
    │  │  └──────────┘ └──────────┘ └─────────────┘  │  │
    │  └──────────────────────────────────────────────┘  │
    │                                                     │
    │  ┌────────────────────────────────────────────┐    │
    │  │        Storage (S3-compatible)             │    │
    │  │  chat-media | avatars | voice-notes        │    │
    │  │  payment-screenshots                       │    │
    │  └────────────────────────────────────────────┘    │
    └─────────────────────────────────────────────────────┘
                      │
           ┌──────────┴──────────┐
           ▼                     ▼
    ┌──────────────┐    ┌──────────────┐
    │   OpenRouter  │    │   Razorpay   │
    │  (AI Models)  │    │  (Payments)  │
    └──────────────┘    └──────────────┘
```

## Data Flow

### Authentication Flow
```
User → LoginPage → authService.signIn() → Supabase Auth (PKCE)
  → Auth callback → authStore.setUser() → Redirect to /
```

### Message Flow
```
User types → MessageInput → messageService.sendMessage() → Supabase INSERT
  → Realtime broadcast → Receiving client updates
  → (Optional) aiService.analyzeMessage() → Edge Function → OpenRouter
  → (Optional) push-notification Edge Function → Web Push
```

### Payment Flow
```
User selects plan → PaymentModal → Razorpay checkout
  → User uploads screenshot → Storage → paymentService.createPayment()
  → Admin verifies → payment-webhook Edge Function (or admin panel)
  → User upgraded to premium
```

## Component Architecture

### Route Structure
```
/ (Protected)
├── /chat          ChatPage (AppLayout → Sidebar + ChatWindow)
├── /profile       ProfilePage
├── /premium       PremiumPage (PaymentModal)
├── /starred       StarredPage
├── /blocked       BlockedPage
├── /admin         AdminDashboard

/login (Public)
/forgot-password (Public)
/reset-password (Public)
/auth/callback (Public)
```

### State Management

| Store | Purpose |
|-------|---------|
| `authStore` | User session, profile, loading state |
| `chatStore` | Chats list, active chat, messages, typing users |
| `userStore` | Recent searches, blocked users, starred messages |
| `uiStore` | Theme, sidebar, modals, command palette |
