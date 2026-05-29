# ADR-005: Multi-Branch Strategy

## Status

Deferred

## Context

The first version of the Textile ERP & POS System is focused on a single shop and single business instance.

The long-term vision may include multi-branch operations, global reporting, enterprise configuration, branch-level permissions, stock transfers, and branch-level analytics. However, those are not part of the initial implementation scope.

## Decision

No multi-branch implementation will be included in version 1.

The version 1 strategy is:

```text
Single-shop first.
Design should not block future multi-branch.
No multi-branch implementation in v1.
```

This ADR is intentionally not finalized beyond that rule.

## Version 1 Scope

Version 1 should focus on:

- Single shop setup
- Single inventory pool
- Single POS operation
- Single customer ledger set
- Single supplier ledger set
- Single reporting context
- Single set of users and roles

## Design Guardrails

Even though multi-branch is not implemented, version 1 should avoid decisions that make future multi-branch impossible.

Recommended guardrails:

- Avoid hard-coding shop identity throughout the codebase.
- Keep settings centralized.
- Keep data ownership clear.
- Avoid mixing unrelated concerns inside one table.
- Keep inventory movements traceable.
- Keep audit logs clear enough to support branch context later.

## What Not to Implement Yet

Do not implement the following until this ADR is revisited:

- Branch table as active business logic
- Branch-level login switching
- Branch-specific permissions
- Inter-branch transfers
- Consolidated branch reporting
- Branch-wise customer pricing
- Branch stock allocation
- Multi-branch cash management
- Branch-wise invoice numbering
- Super Admin workflow

## Future Questions

When revisiting this ADR, confirm:

1. Will each branch have separate inventory?
2. Will products and batches be shared globally or branch-specific?
3. Will customers be global or branch-specific?
4. Will invoice numbers be branch-wise?
5. Will stock transfer between branches be supported?
6. Will users belong to one branch or multiple branches?
7. Will accounting be consolidated or branch-separated?
8. Will offline/local branch operation be required?

## Review Trigger

Review this ADR only after the single-shop version has stable modules for:

- Authentication
- Inventory
- POS sales
- Purchase entry
- Customer ledger
- Supplier ledger
- Reporting
- Settings
