# SecureChat AI - Supabase Backend

## Directory Structure

```
supabase/
├── config.toml                 # Supabase CLI config
├── seed.sql                    # Seed data (admin user)
├── migrations/                 # Database migrations (applied in order)
│   ├── 20260703000001_create_users.sql
│   ├── 20260703000002_create_ch
 2ats.sql
│   ├── 20260703000003_create_messages.sql
│   ├── 20260703000004_create_reports.sql
│   ├── 20260703000005_create_payments.sql
│   ├── 20260703000006_create_scheduled_messages.sql
│   ├── 20260703000007_create_audit_logs.sql
│   └── 20260703000008_setup_rls.sql
├── functions/                  # Edge Functions
│   └── _shared/                # Shared utilities
└── policies/                   # RLS policy reference
```

## Deployment Instructions

### 1. Install Supabase CLI
```bash
npm install -g supabase
```

### 2. Login & Link Project
```bash
supabase login
supabase link --project-ref your-project-ref
```

### 3. Apply Migrations
```bash
supabase db push
```

### 4. Set Environment Secrets
```bash
supabase secrets set OPENROUTER_API_KEY=sk-or-v1-xxx
supabase secrets set SUPABASE_URL=https://your-project.supabase.co
supabase secrets set SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
```

### 5. Create Admin User
After signing up with your admin email, run:
```sql
UPDATE public.users SET is_admin = TRUE WHERE email = 'your-admin@email.com';
```

## Table Reference

| Table | Purpose |
|-------|---------|
| `users` | Core user profiles linked to Supabase Auth |
| `user_settings` | Extended user preferences |
| `chats` | Two-user conversations |
| `chat_members` | Chat membership (extensible for groups) |
| `messages` | All messages with AI analysis, reactions, expiry |
| `reports` | User reports with admin workflow |
| `payments` | Premium subscription payments |
| `scheduled_messages` | Messages scheduled for future delivery |
| `audit_logs` | Immutable security audit trail |

## Key Functions

| Function | Purpose |
|----------|---------|
| `generate_unique_user_id()` | Creates 6-digit unique ID (100000-999999) |
| `create_chat(p1, p2)` | Creates/returns existing chat, idempotent |
| `toggle_reaction(msg_id, emoji)` | Adds/removes emoji reaction |
| `toggle_star_message(msg_id)` | Stars/un-stars a message |
| `mark_messages_read(msg_ids[])` | Marks messages as read |
| `delete_expired_messages()` | Purges expired messages (cron) |
| `process_scheduled_messages()` | Sends due scheduled messages (cron) |
| `verify_payment_and_upgrade()` | Verifies payment and upgrades user |
| `log_audit_event()` | Writes audit log entries |
