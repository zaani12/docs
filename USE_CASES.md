# OpsPilot — Complete Use Case Reference

OpsPilot is an embedded Shopify app for automating store operations. It provides workflow automation, task management, notes, an analytics dashboard, and multi-channel integrations (Slack, Email, Google Sheets).

## Table of Contents

1. [Authentication & Installation](#1-authentication--installation)
2. [Onboarding](#2-onboarding)
3. [Dashboard](#3-dashboard)
4. [Task Management](#4-task-management)
5. [Notes System](#5-notes-system)
6. [Workflow Automation](#6-workflow-automation)
7. [Integrations](#7-integrations)
8. [Settings](#8-settings)
9. [Billing & Plans](#9-billing--plans)
10. [Activity History](#10-activity-history)
11. [API Endpoints](#11-api-endpoints)
12. [Edge Cases & Special Flows](#12-edge-cases--special-flows)

---

## 1. Authentication & Installation

### Normal Flow

- User installs the app from the Shopify App Store.
- Redirected to `/auth/login` with their shop domain.
- Shopify OAuth 2.0 flow begins; user authorizes permissions.
- Callback handled at `/auth/*`; session created with: `shop`, `accessToken`, `userId`, `scope`, `email`, `firstName`, `lastName`, `accountOwner`.
- User record created or verified in the database.
- Webhooks registered for the shop.
- User redirected to `/app/dashboard`.

### Required Scopes

- `read_checkouts`
- `read_customers`
- `read_inventory`
- `read_orders`
- `read_products`

### Scope Update Webhook

`/webhooks/app/scopes_update` is registered but not yet implemented — scope changes do not trigger any action in the current codebase.

### User Roles

| Role  | Permissions |
|-------|-------------|
| admin | Full access: create/edit/delete workflows, manage settings, team management, delete tasks |
| user  | View/manage tasks and notes (reduced scope) |

### Edge Cases

- If the app is already installed and the user re-opens it, the existing session is reused.
- Only `accountOwner` and staff with the app installed can authenticate.
- Online sessions only (no offline access tokens).

---

## 2. Onboarding

### Normal Flow

- On first install, onboarding tasks are auto-seeded:
  - "Connect Slack and Google Sheets" (HIGH priority)
  - "Set up email sender and branding" (MEDIUM priority)
- A welcome note is created (marker: `onboarding:welcome-note:v1`).
- Starter trial auto-starts if eligible (`billingTrialUsed === false`).
- Onboarding drawer auto-opens if: `activeWorkflowsCount === 0` AND `nonOnboardingOpenTasksCount === 0`.

### Edge Cases

- Onboarding tasks use unique markers to prevent duplicates on re-install.
- If a shop has previously used a trial (`billingTrialUsed === true`), no trial is auto-started.
- If billing is globally disabled, all shops get STARTER limits without billing.

---

## 3. Dashboard

### Use Cases

- View KPI quick stats: active workflows, today's tasks, time saved by automation.
- See task cards: today's tasks, priority distribution, staff assignment breakdown.
- Monitor workflow health: 7-day success/failure trend chart, automation impact.
- Check inventory alerts: low stock items, out-of-stock count.
- Check order alerts: unfulfilled orders, payment pending, abandoned checkouts.
- "Attention Required" banner: shows critical issues with entity previews (orders, inventory, tasks).
- Browse recent workflow execution activity in a table.
- See upcoming scheduled workflows with next-run times.

### Filters

- Date range: today, last 7 days, last 30 days, last 3 months, custom.
- Timezone-aware (shop timezone vs user timezone).

### Charts Available

- Workflow success/failure line chart (7-day).
- Task status donut chart.
- Task priority bar chart.
- Notes type distribution.
- Workflow 7-day comparison.

### Edge Cases

- Dashboard uses pre-computed snapshots (`DashboardSnapshot`) for performance.
- If no snapshot exists for the selected date range, an empty state is shown.
- Timezone mismatch between shop and user is handled per request.

---

## 4. Task Management

### Use Cases

#### Creating a Task (Manual)

- Fill in: title (required), description (rich text, optional), priority (LOW/MEDIUM/HIGH/URGENT), status, due date, assignee, linked entity (order/product/customer).
- Task is saved and appears in list or kanban board.

#### Creating a Task (Auto — via Workflow)

- Workflow engine creates a task with context: workflow name, trigger, entity details, conditions.
- Task linked to the source entity (order ID, product ID, etc.).
- Description auto-populated with workflow metadata.

#### Viewing Tasks

- **Table View**: filterable by status, priority, assignee, due date, keyword.
- **Kanban View**: columns per status, drag-and-drop (if implemented).
- Task stats panel shows: open count, overdue count, tasks due today.

#### Updating a Task

- Edit any field: title, description, priority, status, due date, assignee.
- Status change logged in `TaskTimelineEntry` (UPDATED event).

#### Deleting a Task

- Single delete or bulk delete.
- Admin-only operation.
- Associated notes are soft-deleted (not hard-deleted).

### Task Actions

| Action | Description |
|--------|-------------|
| create | Create a new task |
| update | Update any task field |
| delete | Delete a single task |
| bulkDelete | Delete multiple selected tasks |
| updateStatus | Change task status |
| togglePin | Pin or unpin a task |

### Pinning / Favorites

- Tasks can be pinned to appear at the top of the list.

### Bulk Operations

- Select multiple tasks → bulk delete or bulk status update.

### Auto-Archiving

- If the shop sets `archiveCompletedAfter` (e.g., 7 days), completed tasks are automatically archived after that period.
- Unit: days or weeks. Null = no auto-archive.

### Task Statuses

- Built-in: `PENDING`, `IN_PROGRESS`, `COMPLETED`, `CANCELLED`, `ON_HOLD`, `ARCHIVED`
- Custom statuses can be configured per shop (in Settings).
- Closed statuses: `COMPLETED`, `CANCELLED`, `ARCHIVED`.

### Task Priorities

- `LOW` → `MEDIUM` → `HIGH` → `URGENT`

### Edge Cases

- Title is required; empty or whitespace-only is rejected.
- Due date cannot be in the past.
- Assigned user must exist, belong to the same shop, and be active.
- Default assignee: if shop sets `defaultTaskAssignment === 'shop_owner'`, tasks auto-assign to shop owner.
- Workflow-created tasks: if `createOncePerEntity` is true, system upserts instead of duplicating (see §12.2).
- If a task is in a closed status (COMPLETED, CANCELLED, ARCHIVED), a new task is created on upsert instead of updating.

---

## 5. Notes System

### Use Cases

#### Creating a Note

- Write rich text using Tiptap editor (bold, lists, links, etc.).
- Attach files (images, documents) — stored in Supabase.
- Link note to an entity: order, product, customer, task, or "other".
- Optionally assign to a note section for organization.

#### Viewing Notes

- Browse all notes for the shop.
- Filter by entity type, status (pinned/resolved), creator.
- View note sections.

### Note Actions

| Action | Description |
|--------|-------------|
| Create | Write a new note |
| Update | Edit existing note content |
| Delete | Remove a note (soft-delete) |
| Pin | Pin note for visibility |
| Resolve | Mark note as resolved |
| Convert to Task | Turn a note into a task |
| Bulk operations | Bulk delete or pin |

### File Attachments

- Files uploaded via Supabase storage.
- Size/type validation applied on upload.
- Files retrievable via signed URLs.

### Auto-Created Notes (Workflow)

- Workflows can create notes linked to an entity.
- Notes include workflow context in content.

### Edge Cases

- File attachment failures are treated as permanent errors (not retried).
- Notes linked to deleted tasks are soft-deleted, not hard-deleted.
- Note creation from `/api/item-actions` (Shopify admin surface): notes can be created externally via this endpoint with CORS enabled.

---

## 6. Workflow Automation

### 6.1 Workflow Triggers

| Trigger Type | Event |
|--------------|-------|
| ORDER_CREATED | New order placed |
| ORDER_UPDATED | Order updated (status, tags, etc.) |
| CHECKOUT_ABANDONED | Checkout not completed |
| INVENTORY_LEVEL_UPDATED | Inventory quantity changed |
| CUSTOMER_CREATED | New customer account |
| PRODUCT_UPDATED | Product data changed |
| MANUAL_TRIGGER | Staff manually runs workflow from the UI |
| SCHEDULED | Cron-based scheduled trigger |

### 6.2 Workflow Conditions

- Conditions evaluate against the trigger payload (order data, customer data, etc.).
- Operators supported: `EQUAL`, `NOT_EQUAL`, `GREATER_THAN`, `LESS_THAN`, `CONTAINS`, `NOT_CONTAINS`, `EXISTS`, `NOT_EXISTS`, `REGEX`, `STARTS_WITH`, `ENDS_WITH`.
- Conditions support AND/OR logic trees with nested groups.
- Payload variable substitution: conditions can reference dynamic values from the payload.

#### Condition Evaluation Edge Cases:

- If condition schema is invalid, workflow status = `FAILED` ("Invalid workflow definition").
- If conditions are NOT met, workflow is `SKIPPED` (still logged for visibility).
- If payload is not a valid object, workflow is `SKIPPED` with a warning.

### 6.3 Workflow Actions

| Action Type | Description |
|------------|-------------|
| CREATE_TASK | Create a task (optionally linked to source entity) |
| CREATE_NOTE | Create a note |
| SEND_EMAIL | Send email with HTML template & branding |
| SEND_SLACK | Send Slack message (Block Kit formatted) |
| ADD_TO_GOOGLE_SHEET | Append a row to a Google Sheet |
| ARCHIVE_TASKS | Bulk-archive tasks based on conditions |

#### Action Result Statuses:

- `SUCCESS` — action completed.
- `FAILED` — permanent failure (logged, not retried unless transient).
- `SKIPPED` — action not eligible (plan restriction, dedup, disabled integration).
- `QUEUED` — delayed action queued for later execution.

#### Plan-Based Action Filtering:

- Integrations (Email, Slack, Google Sheets) are gated by plan tier.
- FREE plan: no integration actions allowed.
- If ALL actions are filtered, workflow is marked `SKIPPED`.
- Filtered actions are logged with reason: "plan" or "setup".

#### Execution Depth Guard:

- Max recursive workflow depth: 2.
- Workflows triggered internally (via `__workflowSource === "internal"`) cannot trigger further workflows beyond depth 2.

### 6.4 Scheduled Workflows

- `SCHEDULED` trigger type executes on a cron schedule (5 min, hourly, daily, weekly).
- Entry point: `POST /api/scheduled-workflows` (authenticated with QSTASH signing key or CRON_SECRET bearer token).
- Execution modes: scheduled, delayed, all.
- Aggregate payloads: multiple orders/products/customers processed → one task created per entity.
- Aggregate entity ID format: `workflow-aggregate:${workflowId}`.

### 6.5 Delayed Actions

- Actions with a delay field are queued in `WorkflowDelayedAction` table with an `executeAfter` timestamp.
- Before execution: payload refreshed from Shopify Admin API for ORDER/PRODUCT/CUSTOMER triggers.
- Conditions re-evaluated at execution time — if conditions no longer match, action `SKIPPED`.
- If workflow becomes inactive/deleted before execution, action `SKIPPED`.
- Nested delays (delays within delayed actions) are prevented: re-queued actions marked `SKIPPED`.
- Atomic row claim: attempts counter incremented atomically to prevent concurrent processing.

### 6.6 Workflow Deduplication

#### CREATE_ONCE_PER_ENTITY:

- When `createOncePerEntity === true` and a valid entity is in the payload:
  - `CREATE_TASK` upserts: if existing task is open → update; if closed → create new.
  - `CREATE_NOTE` always creates new (no upsert).

#### 24-Hour Dedup Window (SEND_EMAIL, SEND_SLACK, ADD_TO_GOOGLE_SHEET):

- Fingerprinted by: action type + normalized payload fields (SHA256 hash).
- Checks last 100 execution logs within 24 hours.
- Same-run dedup tracked via fingerprint set.
- Override with `forceExecuteDuplicates: true` (logs a warning).
- Dedup only applies when both `workflowId` and `entityFromPayload.entityId` exist.

### 6.7 Workflow Templates (40+)

#### Order Management:

- VIP Order Alert (High Value)
- Priority Order (Tagged on Create)
- Priority Tag Added (On Update)
- Payment Pending (Review + Reminder)
- Refunded Order Follow-Up
- Order Fulfillment Reminder
- Order Received Advanced
- Unfulfilled Orders Monitor (Scheduled)
- Unpaid COD Confirmation Monitor

#### Customer Management:

- New Customer Welcome
- High-Value Customer Alert
- New Customer Task Creation
- Customer Tag VIP Note
- New Customers Daily Digest

#### Product Management:

- Product Update Review
- Product Status Change
- Product Tagged for Sale
- Product Draft Review
- Weekly Product Review

#### Inventory & Stock:

- Inventory Critical Restock Alert
- Inventory Out of Stock Escalation
- Low Inventory Monitor
- Low Stock Notification

#### Checkout & Recovery:

- Abandoned Checkout Recovery
- High-Value Checkout Escalation

#### Scheduled Reports:

- Daily Review Task
- Weekly Summary Note
- Inbox Cleanup Reminder
- Recent Orders Digest
- Recent Customers Review

#### Manual Workflows:

- Manual Escalation
- Manual Quick Task

---

## 7. Integrations

### 7.1 Slack

**Setup**: Provide a bot token (`xoxb-…`) in Settings → Integrations → Slack. Optionally set a default channel.

#### Use Cases:

- Workflows send Slack messages with Block Kit formatting (header + body sections).
- Message text is required (template interpolation cannot produce an empty string).
- Channel can be set per-action or fall back to shop default channel.
- Token source priority: action-level token > shop bot token > environment token.
- Channel priority: action channel > shop default channel.

#### Failure Cases:

| Error | Message |
|-------|---------|
| Missing bot token | "Slack Bot Token is required. Set it in Settings → Integrations → Slack..." |
| Missing channel | "Channel is required. Set it in this action's Channel field or Settings..." |
| Channel not found | "The channel does not exist or the app is not in that channel..." |
| Missing scope | Slack reports required scopes vs current scopes; instructs to add scopes |
| Public channel | Requires `chat:write.public` scope |

### 7.2 Email (AWS SES / Resend)

**Setup**: Either provide `RESEND_API_KEY` env var or configure a verified sender email/domain in Settings.

#### Use Cases:

- Workflows send HTML emails with custom branding (logo, primary color, footer HTML).
- Recipient types: specific email address or "operator" (a shop user by ID).
- From address: validated, supports "Name email@domain.com" format.
- Template variable interpolation for subject and body.

#### Retry Logic:

- HTTP 429 → transient retry, up to 3 attempts, exponential backoff (base 300ms + up to 200ms jitter).
- HTTP 5xx → transient retry.
- HTTP 4xx → permanent failure (no retry).

#### Failure Cases:

| Error | Behavior |
|-------|----------|
| Missing RESEND_API_KEY | "Email not configured. Set RESEND_API_KEY to send workflow emails." |
| Invalid email address | Permanent failure |
| Multiple recipients (comma/semicolon) | NOT supported — fails validation |
| Attachment >30MB | Validation error, permanent failure |
| Operator user not found | Action SKIPPED |
| Unverified sender domain | Cannot send — domain must be verified |

### 7.3 Google Sheets

**Setup**: Provide service account JSON as `GOOGLE_SHEETS_SERVICE_ACCOUNT_JSON` env var. Share the target spreadsheet with the service account email.

#### Use Cases:

- Workflows append rows to a Google Sheet with template-interpolated column values.
- Sheet name looked up by name; created if it doesn't exist.
- Spreadsheet ID: can use `"__DEFAULT__"`, `"__SHOP_DEFAULT__"`, `"USE_DEFAULT"` tokens or raw ID.
- First append: header row formatted bold, custom colors applied, column widths set, optional filter added.

#### Failure Cases:

| Error | Behavior |
|-------|----------|
| Missing service account JSON | "Missing Google Sheets service account configuration." |
| Default spreadsheet not configured | Fails if token used but no default ID set |
| Spreadsheet unshared | Auth error |
| Missing column template | Permanent validation error |

---

## 8. Settings

### Sections

#### Integrations

- Configure Slack (webhook URL, bot token, default channel).
- Configure Google Sheets (default spreadsheet ID).
- Configure email (sender email, sender name, reply-to, branding).

#### Email Configuration

- Set sender email and name.
- Set reply-to address.
- Upload logo, set primary color, write footer HTML.
- Add and verify email domains (DNS records: DKIM, SPF).
- Remove verified domains (clears sender email if it used that domain).

#### Team Management

- View all users for the shop.
- Assign roles: admin or user.
- Activate or deactivate users.
- Batch role updates.

#### Task Preferences

- Set auto-archive threshold: X days/weeks after task completion.
- Set default task view: table or kanban.
- Set default task assignee (shop owner or specific user).
- Manage custom task statuses.

#### Billing

- View current plan and features.
- Upgrade or downgrade plans.
- See trial status and expiry.

---

## 9. Billing & Plans

### Plans

| Feature | FREE | STARTER | GROWTH |
|---------|------|---------|--------|
| Active workflows | 1 | 5 | 20 |
| Workflow runs/month | 10 | 500 | 5,000 |
| Actions per workflow | 2 | 10 | 20 |
| Email action | ✗ | ✓ | ✓ |
| Slack action | ✗ | ✓ | ✓ |
| Google Sheets action | ✗ | ✓ | ✓ |
| Analytics | ✗ | ✓ | ✓ |

**Note**: Limits are environment-configurable via `APP_PLAN_*_*` env vars and must be positive integers.

### Trial Management

- New shops auto-enrolled in 14-day STARTER trial (if `billingTrialUsed === false`).
- Trial start date computed from first Shopify subscription's `createdAt`.
- Invalid dates (NaN) fall back to current date.
- After trial ends: plan reverts to FREE unless subscription continues.

### Plan Sync (syncShopPlanFromBilling)

- Runs on every app load.
- Multiple paid subscriptions → picks highest tier.
- Out-of-sync state (paid in DB, no active Shopify subscriptions) → triggers downgrade.
- Grace period: if local trial is still active, keeps paid tier until trial also expires.

### Downgrade Flow

- **Immediate downgrade**: ALL active workflows auto-disabled.
- **Scheduled downgrade**: target plan + effective date stored; no immediate effect.
- Applied only if `effectiveDate > now` AND `newPlanRank < currentPlanRank`.
- Upgrade before effective date cancels the scheduled downgrade.

---

## 10. Activity History

### Use Cases

- View a comprehensive audit log of all app operations.
- Filter by: entity type, action type, user, date range.
- See who created/changed what and when.
- All workflow executions logged with status, action results, and payload snapshots.
- Task timeline entries track CREATED and UPDATED events.

---

## 11. API Endpoints

| Endpoint | Method | Auth | Purpose |
|----------|--------|------|---------|
| /api/scheduled-workflows | POST | QSTASH / Bearer | Trigger scheduled & delayed workflows |
| /api/item-actions | POST | CORS (Shopify admin) | Create tasks/notes from Shopify admin surface |
| /health | GET | None | Health check |
| /ready | GET | None | Readiness probe |
| /webhooks | POST | Shopify HMAC | Generic Shopify webhook handler |
| /webhooks/app/scopes_update | POST | Shopify HMAC | Scope change webhook (not yet implemented) |
| /webhooks/app/uninstalled | POST | Shopify HMAC | App uninstall webhook |

---

## 12. Edge Cases & Special Flows

### 12.1 Billing Edge Cases

| Scenario | Behavior |
|----------|----------|
| Trial already used | No auto-trial on re-install |
| Trial end date invalid (NaN) | Falls back to current date |
| Multiple paid Shopify subscriptions | Highest tier wins |
| Shop has paid plan in DB but no active Shopify subscription | Triggers downgrade |
| Upgrade before scheduled downgrade date | Cancels scheduled downgrade |
| Plan limits from env vars are not positive integers | Default limits applied |
| FREE_MODE (billing disabled) | All shops get STARTER limits |

### 12.2 Workflow Execution Edge Cases

| Scenario | Behavior |
|----------|----------|
| Payload is not a valid object | Workflow SKIPPED with warning |
| Condition schema invalid | Workflow FAILED ("Invalid workflow definition") |
| Monthly run limit exceeded | Workflow SKIPPED (logged), checked BEFORE conditions |
| No active users in shop | Execution halted with error (cannot resolve default user) |
| Recursive workflow (depth > 2) | Workflow SKIPPED with warning |
| All actions filtered by plan/setup | Workflow SKIPPED (not FAILED) |
| Payload >50KB | Truncated to summary (_truncated: true) |
| Payload unserializable | Marked _unserializable: true |
| Delayed workflow — workflow deleted/disabled before execution | Action SKIPPED |
| Delayed workflow — conditions no longer match at execution time | Action SKIPPED |
| Nested delay (delay within a delayed action) | Re-queued action SKIPPED, stopped |
| Concurrent delayed action workers | Atomic row claim prevents double-processing |
| CREATE_ONCE_PER_ENTITY + entity in closed status | New task created instead of updating |
| 24h dedup window — same fingerprint detected | Action SKIPPED unless forceExecuteDuplicates: true |
| Duplicate within same run | Detected via in-memory fingerprint set |
| Aggregate scheduled workflow | One task per entity, entity ID = workflow-aggregate:${workflowId} |

### 12.3 Integration Edge Cases

#### Slack:

| Scenario | Behavior |
|----------|----------|
| Token doesn't start with xoxb- | Token rejected |
| Empty channel name or just # | Fails validation |
| Public channel without chat:write.public | Slack reports missing scope |
| Empty message text after interpolation | Permanent failure |

#### Email:

| Scenario | Behavior |
|----------|----------|
| Comma-separated recipients | NOT supported, fails validation |
| Attachment >30MB | Permanent validation error |
| HTTP 429 from email provider | Retry up to 3x with exponential backoff |
| HTTP 5xx from email provider | Transient retry |
| HTTP 4xx from email provider | Permanent failure |
| Operator user ID not found | Action SKIPPED |
| Sender domain unverified | Cannot send |

#### Google Sheets:

| Scenario | Behavior |
|----------|----------|
| "__DEFAULT__" token but no default ID set | Fails with "Default spreadsheet not configured" |
| Sheet name not found | Sheet created automatically |
| Spreadsheet unshared from service account | Auth error |
| Missing column template | Permanent validation error |

### 12.4 Task Edge Cases

| Scenario | Behavior |
|----------|----------|
| Empty or whitespace-only title | Rejected |
| Due date in the past | Rejected |
| Assigned user inactive or from different shop | Rejected |
| No defaultTaskAssignment set | No auto-assignment |
| Bulk delete attempted by non-admin | Rejected |
| Auto-archive unit not days or weeks | Ignored (no archive) |
| Task notes on delete | Soft-deleted (not hard-deleted) |

### 12.5 Email Domain Edge Cases

| Scenario | Behavior |
|----------|----------|
| Domain already claimed by another shop | Error returned with owning shop's domain |
| P2002 race condition on domain claim | Re-queried to report actual owner |
| Domain removed while sender email uses it | Sender email auto-cleared |
| Domain status stored as "error" | Normalized to "pending" in UI |
| DNS records fetched if: unverified AND (no stored data OR domain mismatch OR no records stored) | Live DNS fetch triggered |
| Legacy shop (created before domain locking) | Auto-claims used domains via legacy_backfill source |

### 12.6 Auth & Uninstall Edge Cases

| Scenario | Behavior |
|----------|----------|
| Uninstall webhook fires multiple times | Safe: checks if (session) before deleting |
| Session already deleted when webhook arrives | Handled gracefully |
| All sessions deleted | All sessions for shop removed regardless |
| Scope update webhook received | Registered but no handler implemented |
| User re-opens app after uninstall | Full OAuth flow restarts |

### 12.7 Rate Limits & Quotas

| Resource | Limit |
|----------|-------|
| Monthly workflow runs (FREE) | Configurable via env, low default |
| Monthly workflow runs (STARTER) | 500 (env-configurable) |
| Monthly workflow runs (GROWTH) | 5,000 (env-configurable) |
| Execution log scan for dedup | Max 1,000 rows, last 24 hours |
| Dedup check batch size | 100 execution logs |
| Delayed action batch per cron run | Up to 100 actions |
| Email attachment max size | 30 MB total |
| Payload snapshot size before truncation | 50 KB |
| Recursive workflow depth | Max 2 |

### 12.8 Error States & Recovery

#### Permanent Failures (no retry):

- Invalid workflow schema
- No active users in shop
- Missing required integration credentials
- Invalid email addresses
- Invalid or unauthorized task data
- Attachment size/type violations

#### Transient Failures (retry with backoff):

- Email provider HTTP 429 (rate limit): up to 3 retries, base 300ms + up to 200ms jitter
- Email provider HTTP 5xx: transient retry
- Slack temporary API errors

#### Skipped (logged, not failures):

- Workflow conditions not met
- Monthly run limit exceeded
- Dedup window active for action
- Workflow disabled/deleted before delayed execution
- All actions filtered by plan or missing setup
- Operator user not found for email recipient

---

## Verification Plan

- Walk through each route in `app/routes/` and confirm each section of this doc is reflected.
- Check `planLimits.ts` to confirm plan tiers match documented limits.
- Run the workflow engine tests in `__tests__/` to confirm edge case behavior.
- Install the app in a dev shop and trace the onboarding flow.
- Trigger each integration (Slack, Email, Sheets) with a test workflow to verify error messages.
