# API Documentation

## Supabase Edge Functions

All Edge Functions are deployed at: `https://{project-ref}.supabase.co/functions/v1/{function-name}`

### Authentication

| Function | Auth Method | Header |
|----------|-------------|--------|
| `ai-analyze` | JWT (anon/authenticated) | `Authorization: Bearer {anon_key}` |
| `payment-webhook` | HMAC-SHA256 | `x-razorpay-signature: {signature}` |
| `auto-delete` | CRON_SECRET | `Authorization: Bearer {cron_secret}` |
| `scheduled-messages` | CRON_SECRET | `Authorization: Bearer {cron_secret}` |
| `delete-account` | JWT (authenticated) | `Authorization: Bearer {user_jwt}` |
| `export-chat` | JWT (authenticated) | `Authorization: Bearer {user_jwt}` |
| `push-notification` | JWT (authenticated) | `Authorization: Bearer {user_jwt}` |

### ai-analyze

Analyzes message content for threats using OpenRouter AI models.

**POST** `/ai-analyze`

```json
{
  "message_id": "uuid",
  "content": "Message text to analyze",
  "sender_unique_id": 123456,
  "chat_id": "uuid"
}
```

**Response:**
```json
{
  "threat_level": "none" | "low" | "medium" | "high" | "critical",
  "categories": ["harassment", "threats"],
  "confidence": 0.95,
  "explanation": "Analysis explanation text",
  "recommended_action": "allow" | "warn" | "block"
}
```

### payment-webhook

Handles Razorpay webhook events.

**POST** `/payment-webhook`

```json
{
  "event": "payment.captured" | "payment.failed" | "subscription.activated" | "subscription.completed" | "subscription.cancelled",
  "payload": {
    "payment": { "entity": { ... } },
    "subscription": { "entity": { ... } }
  }
}
```

### push-notification

Sends web push notifications to users.

**POST** `/push-notification`

```json
{
  "receiver_id": 123456,
  "chat_id": "uuid",
  "message_id": "uuid",
  "content_preview": "Message preview...",
  "sender_name": "User Name"
}
```

### delete-account

Anonymizes user data, removes PII, and revokes sessions.

**POST** `/delete-account`

```json
{
  "confirm": true
}
```

### export-chat

Exports chat history as JSON or PDF.

**POST** `/export-chat`

```json
{
  "chat_id": "uuid",
  "format": "json" | "pdf",
  "include_deleted": false
}
```

### auto-delete

Cron-triggered: purges expired messages from DB and storage.

**POST** `/auto-delete`
- No body required
- Called by pg_cron

### scheduled-messages

Cron-triggered: sends due scheduled messages.

**POST** `/scheduled-messages`
- No body required
- Called by pg_cron

## Client-Side Service API

All services are available under `src/services/`:

| Service | File | Key Methods |
|---------|------|-------------|
| `authService` | `authService.ts` | signUp, signIn, signOut, getProfile, forgotPassword, updatePassword |
| `chatService` | `chatService.ts` | getChats, createChat, searchChats, archiveChat, togglePin |
| `messageService` | `messageService.ts` | getMessages, sendMessage, editMessage, deleteMessage, searchMessages |
| `storageService` | `storageService.ts` | upload, deleteFile, getSignedUrl, validateFile |
| `paymentService` | `paymentService.ts` | getPlans, createPayment, getPaymentHistory |
| `reportService` | `reportService.ts` | createReport, getReports |
| `userService` | `userService.ts` | getCurrentUser, searchUsers, blockUser, updateProfile |
| `aiService` | `aiService.ts` | analyzeMessage, getAIAnalysisStats |
| `e2eService` | `e2eService.ts` | generateKeyPair, deriveSharedSecret |
| `notificationService` | `notificationService.ts` | requestPermission, showNotification, subscribeToPush |

## TypeScript Types

All types are available under `src/types/`:

- `src/types/user.ts` - UserProfile, UserPublicInfo, UserSettings
- `src/types/chat.ts` - Chat, ChatSettings, CreateChatPayload
- `src/types/message.ts` - Message, SendMessagePayload, ContentType
- `src/types/api.ts` - ApiResponse, PaginatedResponse, AuditLog
- `src/types/payment.ts` - Payment, PremiumPlan, CreatePaymentPayload
- `src/types/report.ts` - Report, CreateReportPayload
- `src/types/ai.ts` - AIAnalysisRequest, AIAnalysisResult, AIAnalysisStats

## Database RPCs

Available through `supabase.rpc()`:

| RPC | Parameters | Returns |
|-----|------------|---------|
| `create_chat` | p1_unique_id, p2_unique_id | UUID |
| `delete_user_account` | - | VOID |
| `update_display_name` | new_name | VOID |
| `toggle_reaction` | msg_id, reaction_emoji | VOID |
| `toggle_star_message` | msg_id | VOID |
| `get_starred_messages` | - | SETOF messages |
| `mark_messages_read` | msg_ids[] | VOID |
| `append_edit_history` | msg_id, new_content | JSONB |
| `delete_expired_messages` | - | INTEGER |
| `process_scheduled_messages` | - | INTEGER |
| `verify_payment_and_upgrade` | payment_id, admin_user_id | VOID |
| `is_admin` | - | BOOLEAN |
| `get_current_user_unique_id` | - | INTEGER |
