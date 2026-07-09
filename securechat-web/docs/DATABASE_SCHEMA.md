# Database Schema

## Overview

PostgreSQL 17 database with 10 tables, 14 migrations, full Row-Level Security, and 3 pg_cron jobs.

## Tables

### users
| Column | Type | Description |
|--------|------|-------------|
| id | UUID (PK) | Primary key |
| auth_id | UUID (FK → auth.users) | Supabase Auth user ID |
| unique_id | INTEGER (UNIQUE) | 6-digit anonymous ID (100000-999999) |
| display_name | VARCHAR(50) | User display name |
| avatar_url | TEXT | Storage path to avatar |
| bio | TEXT | User bio (max 200 chars) |
| email | TEXT | Email address |
| phone | TEXT | Phone number |
| is_online | BOOLEAN | Online status |
| last_seen | TIMESTAMPTZ | Last activity timestamp |
| premium_tier | TEXT | free/basic/standard/premium/enterprise |
| message_quota | INTEGER | Monthly message limit |
| messages_used | INTEGER | Messages sent this period |
| quota_resets_at | TIMESTAMPTZ | When quota resets |
| e2e_enabled | BOOLEAN | E2E encryption enabled |
| e2e_public_key | TEXT | ECDH public key |
| auto_delete_hours | INTEGER | Default auto-delete interval |
| theme_preference | TEXT | light/dark/midnight/forest/system |
| accent_color | TEXT | UI accent color |
| show_online_status | BOOLEAN | Online status visibility |
| show_last_seen | TEXT | everyone/contacts/nobody |
| show_read_receipts | BOOLEAN | Read receipts visibility |
| blocked_users | INTEGER[] | Array of blocked unique_ids |
| settings | JSONB | Additional settings |
| is_admin | BOOLEAN | Admin flag |
| is_banned | BOOLEAN | Ban status |
| ban_reason | TEXT | Reason for ban |
| ban_expires_at | TIMESTAMPTZ | Ban expiration |
| created_at | TIMESTAMPTZ | Account creation |
| updated_at | TIMESTAMPTZ | Last update |

### user_settings
| Column | Type | Description |
|--------|------|-------------|
| id | UUID (PK) | Primary key |
| user_id | UUID (FK → users) | User reference |
| auto_delete_hours | INTEGER | Auto-delete preference |
| theme_preference | TEXT | UI theme |
| accent_color | TEXT | Accent color |
| show_online_status | BOOLEAN | Online status visibility |
| show_last_seen | TEXT | Last seen visibility |
| show_read_receipts | BOOLEAN | Read receipts |
| notification_sound | TEXT | Sound preference |
| vibration_enabled | BOOLEAN | Vibration on notification |
| language | TEXT | User language |

### chats
| Column | Type | Description |
|--------|------|-------------|
| id | UUID (PK) | Primary key |
| chat_code | TEXT (UNIQUE) | `smallerId_largerId` format |
| participant_1_id | INTEGER (FK → users) | First participant |
| participant_2_id | INTEGER (FK → users) | Second participant |
| participant_1_settings | JSONB | Per-participant settings (pinned, muted, etc.) |
| participant_2_settings | JSONB | Per-participant settings |
| last_message_id | UUID | Last message reference |
| last_message_preview | TEXT | Preview of last message |
| last_message_time | TIMESTAMPTZ | Time of last message |
| unread_count_1 | INTEGER | Unread for participant 1 |
| unread_count_2 | INTEGER | Unread for participant 2 |
| is_e2e_enabled | BOOLEAN | E2E enabled for chat |
| e2e_shared_secret | TEXT | ECDH shared secret |
| created_at | TIMESTAMPTZ | Chat creation |
| updated_at | TIMESTAMPTZ | Last update |

### chat_members
| Column | Type | Description |
|--------|------|-------------|
| id | UUID (PK) | Primary key |
| chat_id | UUID (FK → chats) | Chat reference |
| user_unique_id | INTEGER (FK → users) | User reference |
| role | TEXT | member/admin |

### messages
| Column | Type | Description |
|--------|------|-------------|
| id | UUID (PK) | Primary key |
| chat_id | UUID (FK → chats) | Chat reference |
| sender_unique_id | INTEGER | Message sender's unique_id |
| receiver_unique_id | INTEGER | Intended recipient |
| content | TEXT | Message content (max 5000 chars) |
| content_type | TEXT | text/image/video/document/voice/location/system |
| media_url | TEXT | Storage URL for media |
| media_metadata | JSONB | Media dimensions, duration, etc. |
| reply_to_id | UUID (FK → messages) | Message being replied to |
| is_edited | BOOLEAN | Edit status |
| edit_history | JSONB | Array of {content, edited_at} |
| is_deleted | BOOLEAN | Soft delete status |
| deleted_for | INTEGER[] | User IDs who deleted for self |
| deleted_at | TIMESTAMPTZ | When deleted |
| read_by | JSONB | `{user_id: timestamp}` map |
| delivered_at | TIMESTAMPTZ | Delivery timestamp |
| created_at | TIMESTAMPTZ | Creation time |
| expires_at | TIMESTAMPTZ | Auto-delete time |
| is_forwarded | BOOLEAN | Forwarded message |
| original_sender_id | INTEGER | Original sender (for forwarded) |
| reactions | JSONB | `{emoji: [user_id, ...]}` map |
| starred_by | INTEGER[] | User IDs who starred |
| ai_analyzed | BOOLEAN | AI analysis complete |
| ai_threat_level | TEXT | none/low/medium/high/critical |
| ai_categories | TEXT[] | AI classification categories |
| ai_confidence | REAL | AI confidence score |
| ai_explanation | TEXT | AI analysis explanation |
| e2e_encrypted | BOOLEAN | E2E encrypted |
| e2e_nonce | TEXT | Encryption nonce |

### reports
| Column | Type | Description |
|--------|------|-------------|
| id | UUID (PK) | Primary key |
| reporter_unique_id | INTEGER (FK → users) | Reporter |
| reported_unique_id | INTEGER (FK → users) | Reported user |
| chat_id | UUID (FK → chats) | Related chat |
| category | TEXT | spam/harassment/threats/fake_account/child_safety/other |
| description | TEXT | Report description |
| evidence_message_ids | UUID[] | Evidence messages |
| status | TEXT | pending/under_review/resolved/dismissed |
| severity | TEXT | low/medium/high/critical |
| admin_notes | TEXT | Admin notes |
| resolved_by | UUID (FK → auth.users) | Admin who resolved |
| created_at | TIMESTAMPTZ | Report creation |
| updated_at | TIMESTAMPTZ | Last update |

### payments
| Column | Type | Description |
|--------|------|-------------|
| id | UUID (PK) | Primary key |
| user_unique_id | INTEGER (FK → users) | Payer |
| plan | TEXT | basic/standard/premium/enterprise |
| amount | NUMERIC(10,2) | Payment amount |
| currency | TEXT | INR (default) |
| status | TEXT | pending/verified/failed/refunded |
| payment_method | TEXT | upi/net_banking/card/razorpay |
| screenshot_url | TEXT | UPI payment screenshot |
| razorpay_order_id | TEXT | Razorpay order ID |
| razorpay_payment_id | TEXT | Razorpay payment ID |
| razorpay_signature | TEXT | Razorpay signature |
| verified_by | UUID (FK → auth.users) | Admin who verified |
| verified_at | TIMESTAMPTZ | Verification time |
| created_at | TIMESTAMPTZ | Payment creation |
| updated_at | TIMESTAMPTZ | Last update |

### scheduled_messages
| Column | Type | Description |
|--------|------|-------------|
| id | UUID (PK) | Primary key |
| chat_id | UUID (FK → chats) | Target chat |
| sender_unique_id | INTEGER (FK → users) | Sender |
| content | TEXT | Message content |
| content_type | TEXT | Message type |
| media_url | TEXT | Media URL |
| scheduled_for | TIMESTAMPTZ | When to send |
| status | TEXT | pending/sent/cancelled/failed |
| error_message | TEXT | Failure reason |
| created_at | TIMESTAMPTZ | Creation time |

### audit_logs
| Column | Type | Description |
|--------|------|-------------|
| id | UUID (PK) | Primary key |
| actor_id | UUID (FK → auth.users) | Who performed action |
| actor_unique_id | INTEGER | Actor's unique_id |
| action | TEXT | Action performed (e.g., 'user.deleted', 'payment.verified') |
| resource_type | TEXT | Type of resource affected |
| resource_id | TEXT | Specific resource ID |
| old_values | JSONB | Previous state |
| new_values | JSONB | New state |
| ip_address | INET | IP address |
| user_agent | TEXT | Browser user agent |
| metadata | JSONB | Additional context |
| created_at | TIMESTAMPTZ | Event timestamp |

### web_push_subscriptions
| Column | Type | Description |
|--------|------|-------------|
| id | UUID (PK) | Primary key |
| user_unique_id | INTEGER (FK → users) | User |
| endpoint | TEXT (UNIQUE) | Push endpoint URL |
| p256dh | TEXT | Encryption key |
| auth | TEXT | Auth secret |
| user_agent | TEXT | Browser info |
| is_active | BOOLEAN | Active subscription |
| last_used_at | TIMESTAMPTZ | Last notification sent |
| expires_at | TIMESTAMPTZ | Expiration |
| created_at | TIMESTAMPTZ | Subscription created |

## Indexes

- `idx_users_auth_id` on users(auth_id)
- `idx_users_unique_id` on users(unique_id) [UNIQUE]
- `idx_chats_chat_code` on chats(chat_code) [UNIQUE]
- `idx_chats_participants` on chats(participant_1_id, participant_2_id)
- `idx_messages_chat_id` on messages(chat_id)
- `idx_messages_sender` on messages(sender_unique_id)
- `idx_messages_created_at` on messages(chat_id, created_at DESC)
- `idx_messages_content_fts` on messages using GIN(to_tsvector('english', content))
- `idx_reports_status` on reports(status)
- `idx_payments_status` on payments(status)
- `idx_payments_user` on payments(user_unique_id)
- `idx_scheduled_status` on scheduled_messages(status, scheduled_for)
- `idx_audit_actor` on audit_logs(actor_id)
- `idx_audit_action` on audit_logs(action)
- `idx_audit_created` on audit_logs(created_at DESC)
- `idx_web_push_user` on web_push_subscriptions(user_unique_id)
- `idx_web_push_endpoint` on web_push_subscriptions(endpoint) [UNIQUE]

## Cron Jobs

| Job | Schedule | Query |
|-----|----------|-------|
| auto-delete-messages | Every hour | `SELECT delete_expired_messages()` |
| send-scheduled-messages | Every minute | `SELECT process_scheduled_messages()` |
| reset-message-quotas | 1st of month | `UPDATE users SET messages_used = 0` |

## RLS Policies

RLS is enabled on all 10 tables with granular policies per operation. Storage buckets also have RLS policies. See migration `20260703000013_complete_rls_policies.sql` for full policy definitions.

Key principles:
- Users can only access their own data
- Chat participants can only access their shared chats
- Admins have elevated access for moderation
- Audit logs are append-only (admin SELECT only)
- Service role bypasses RLS for cron jobs and internal operations
