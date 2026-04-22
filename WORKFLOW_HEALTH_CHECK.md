# Workflow System — Full Health Check & Enhancement Proposal

**Date:** 2025-02-14  
**Scope:** Workflow triggers, conditions, actions, webhooks, runner, execution logs, UI routes, tests.

---

## 1. Executive Summary

The workflow system is **structurally sound**: clear separation (runner → conditions → actions), Zod validation, recursion guard, and transactional action execution. Gaps exist in **observability** (no execution history UI), **test coverage** (runner edge cases, executeActions branches), **feature parity** (no “Test with latest customer” for CUSTOMER_CREATED), **code reuse** (duplicated payload mappers), and **operational safeguards** (no rate limiting or circuit breaker).

---

## 2. Architecture & Design — Health Check

| Area | Status | Notes |
|------|--------|--------|
| **Trigger → Runner** | ✅ | Webhooks map via `webhookUtils`; manual/test runs use same `runWorkflowsForTrigger`. |
| **Condition evaluation** | ✅ | AND/OR groups, path-based rules, EXISTS/EQUAL/CONTAINS/numeric ops. Handles empty group (match-all). |
| **Action execution** | ✅ | Single transaction; CREATE_TASK and CREATE_NOTE with createOncePerEntity and payload diff. |
| **Recursion guard** | ✅ | `__workflowSource === "internal"` and `MAX_WORKFLOW_DEPTH = 2`. |
| **Payload normalization** | ✅ | `normalizePayloadForWorkflow` wraps entity under `order` / `product` / `customer`. |
| **Schema validation** | ✅ | `conditionNodeSchema`, `workflowActionsSchema`, `workflowDefinitionSchema` with safeParse at runtime. |

**Gaps:**

- **Execution logs are write-only.** `WorkflowExecutionLogModel` only has `create()`. No `findByWorkflowId` / `findRecentByShop` — logs never surface in the UI.
- **No explicit idempotency key** for webhook deliveries (Shopify can retry); reliance is on createOncePerEntity + entity id, which is good for task/note dedup but not for “run workflow once per webhook delivery.”

---

## 3. Reliability & Robustness

| Check | Status | Notes |
|-------|--------|--------|
| Invalid payload | ✅ | Early return when `!payload \|\| typeof payload !== 'object'`. |
| Missing shop | ✅ | Log and return result; no throw. |
| No active users | ✅ | Log error and return; runner doesn’t throw. |
| Invalid workflow JSON | ✅ | safeParse; on failure log FAILED and continue to next workflow. |
| Action failure | ✅ | Caught in try/catch; FAILED log created; error rethrown so transaction rolls back. |
| Assignee validation | ✅ | `ensureUserBelongsToShop` before CREATE_TASK with assignToUserId. |
| Empty conditions | ✅ | AND of empty array → true (match-all). |

**Gaps:**

- **No rate limiting** on webhook handler or per-workflow execution (risk under burst).
- **No circuit breaker** if a workflow repeatedly fails (could add backoff or disable after N failures).
- **Payload snapshot size:** `payloadSnapshot` stored on every run; large payloads could bloat DB (no truncation or size limit).

---

## 4. Testing — Coverage & Gaps

| Module | Covered | Gaps |
|--------|---------|------|
| **evaluateConditions** | AND, OR, EXISTS, CONTAINS (string/array), product/order payloads | NOT_EQUAL, LESS_THAN, nested paths, empty groups, invalid paths |
| **webhookUtils** | Topic mapping, payload normalization, null/string payload | — |
| **workflowRunner** | Happy path: execute + log success | Skipped (conditions not met), invalid definition (FAILED log), no users, max depth, recursion guard, single workflowId filter |
| **executeActions** | CREATE_TASK success, assignee validation failure | CREATE_NOTE, createOncePerEntity (task/note), payload diff path, entitySnapshot upsert |

**Recommendations:**

- Add workflowRunner tests: conditions not met → skipped, invalid schema → FAILED log, no users → return without throw, depth >= MAX_WORKFLOW_DEPTH.
- Add evaluateConditions tests: NOT_EQUAL, LESS_THAN, empty AND group, missing path (undefined).
- Add executeActions tests: CREATE_NOTE, createOncePerEntity task update (with/without changes).

---

## 5. Observability & Operations

| Item | Status |
|------|--------|
| Console logging | DEBUG_WORKFLOW flags; production relies on console.warn/error. |
| Execution history | Logs written to DB; **no API or UI** to list/filter by workflow or shop. |
| Error message on FAILED | Stored in `errorMessage`; not visible in app. |
| Metrics / APM | None (no success/failure counts, latency, or alerting). |

---

## 6. UX & Feature Parity

- **Edit page** (`app.workflows.$id`): Run manual, Test with latest order, Test with latest product.
- **View page** (`app.workflows.view.$id`): Same test buttons for order/product; no “Run workflow” for MANUAL_TRIGGER (only on edit).
- **CUSTOMER_CREATED:** No “Test with latest customer” button on edit or view — **inconsistent** with order/product.

---

## 7. Code Quality

- **Duplication:** `orderNodeToPayload` and `productNodeToPayload` are duplicated in `app.workflows.$id.tsx` and `app.workflows.view.$id.tsx`. Should live in a shared module (e.g. `app/services/workflows/testPayloadUtils.ts` or `workflowUtils.ts`).
- **Types:** Some `as any` on workflow conditions/actions in routes; could use typed helpers from workflow.types.
- **payloadDiff:** When `followedFields` is empty and createOncePerEntity is true, `computePayloadDiff` returns `[]`, so “what changed” is never shown and task update is skipped (by design); doc comment in payloadDiff would clarify.

---

## 8. Proposed Enhancements (Prioritized)

### High priority

1. **Execution history UI** ✅ *Done*
   - `WorkflowExecutionLogModel.findByWorkflowId(workflowId, limit?)` and `findRecentByShop(shopId, limit?)` added.
   - Workflow view and edit show “Recent runs” via `WorkflowExecutionHistory` (status, executedAt, errorMessage, entity summary).

2. **“Test with latest customer” for CUSTOMER_CREATED** ✅ *Done*
   - Intent `runWithLastCustomer` and “Test with latest customer” button on both edit and view when `triggerType === "CUSTOMER_CREATED"`.

3. **Extract shared test payload helpers** ✅ *Done*
   - `app/services/workflows/testPayloadUtils.ts` with `orderNodeToPayload`, `productNodeToPayload`, `customerNodeToPayload`; used in both route files.

### Medium priority

4. **Stronger workflowRunner tests** ✅ *Done*
   - Conditions not met → skipped, no executeActions; invalid schema → FAILED log; no active users → return; depth >= MAX → skip; singleWorkflowId filter.

5. **Payload snapshot size limit** ✅ *Done*
   - `payloadSnapshotForLog()` truncates payloads > 50KB to a small summary (entity id, triggerType, _truncated) in `workflowRunner.ts`.

6. **executeActions tests**
   - CREATE_NOTE success and createOncePerEntity (append to existing note).
   - CREATE_TASK with createOncePerEntity: existing task, no changes → no update; existing task, with changes → update + timeline + entitySnapshot.

### Lower priority

7. **Structured logging / metrics**
   - Replace or complement DEBUG_WORKFLOW with a small logger interface (e.g. debug/info/warn) and optional metrics (counts per workflow, latency) for production.

8. **Rate limiting / backpressure**
   - Optional: limit concurrent workflow runs per shop or per workflow; or debounce same-entity triggers within a short window (beyond createOncePerEntity).

9. **View page: “Run workflow” for MANUAL_TRIGGER** ✅ *Done*
   - “Run workflow” button on view page when `triggerType === "MANUAL_TRIGGER"`; intent `runManual` handler added.

---

## 9. Summary Table

| Category        | Finding |
|----------------|--------|
| **Architecture** | Solid; execution history not exposed. |
| **Reliability**  | Good error handling; no rate limit or circuit breaker. |
| **Tests**        | Core paths covered; runner edge cases and executeActions branches missing. |
| **Observability**| Logs in DB only; no UI or metrics. |
| **UX**           | Missing “Test with latest customer”; duplicate payload code in routes. |
| **Code quality** | Shared payload mappers and clearer types would help. |

Implementing **execution history UI**, **Test with latest customer**, and **shared test payload utils** gives the highest impact for debugging and consistency with minimal risk.
