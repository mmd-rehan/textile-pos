---
name: milestone
description: >
  Guide end-to-end implementation of a new feature milestone for the textile-pos system using Antigravity's Planning Mode.
---

# Milestone Implementation Guide (Antigravity Edition)

You are implementing a feature milestone for **textile-pos** — a single-shop Textile ERP & POS.

As an Antigravity agent, you must follow the **Planning Mode** workflow for any multi-file feature implementation.

## Phase 0 — Research and Planning

Before modifying any code, conduct thorough research:
1. **Domain & Rules**: Re-read `AGENTS.md` and `CLAUDE.md`. Pay attention to inventory, ledger, currencies, and product types.
2. **Codebase Exploration**: Use `grep_search`, `view_file`, or invoke a `research` subagent to map out the current schema, services, and frontend components related to the milestone.
3. **Artifact Creation**: Create an `implementation_plan.md` artifact.
   - Outline the Prisma schema changes.
   - Outline the Backend changes (Thin controllers, Rich services, Transactions).
   - Outline the Frontend changes (API hooks, Form changes).
   - Include any "Open Questions" for the user.
4. **Approval**: Set `request_feedback = true` in the artifact metadata and **STOP**. Wait for the user to approve the plan.

## Phase 1 — Execution (Backend First)

Once approved, create a `task.md` artifact to track your checklist.

1. **Schema & Migrations**:
   - Update `backend/prisma/schema.prisma`. Ensure money/lengths use `Decimal`. Ledger tables are append-only.
   - Run `run_command` with `cd backend && npx prisma migrate dev --name <name>`.
   - Update Prisma seeds if necessary.
2. **Backend Code**:
   - Create/Update DTOs (use `string` for money/length).
   - Create/Update Services (handle business logic, stock movements, audit logs, and wrap multi-table writes in `$transaction`).
   - Create/Update Controllers (keep them thin, just routing and `@RequirePermission`).

## Phase 2 — Execution (Frontend)

1. Fetch data via the backend API.
2. The frontend **previews** values; do not compute final inventory or ledger values in the UI.
3. Handle product-type-aware forms (FABRIC_ROLL vs FIXED_PRODUCT).
4. Update components iteratively and mark off your `task.md`.

## Phase 3 — Verification & Walkthrough

1. Use `run_command` to start the backend and frontend in the background. Use `WaitMsBeforeAsync` so they run as background tasks.
2. Run backend endpoints using `curl` to verify validation and logic.
3. Create a `walkthrough.md` artifact to summarize the completed work, what remains pending, and how the user can test the milestone manually.

## Scope Fence Reminder
Do **not** implement: multi-branch, offline sync, mobile app, live exchange rate feeds, or multi-currency sales. This is a v1 single-shop system.
