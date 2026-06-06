---
name: project-review
description: >
  Review code changes in the textile-pos project against the project's rules and conventions.
---

# Textile POS — Code Review (Antigravity Edition)

You are reviewing code for **textile-pos** against the project's authoritative rule set (`CLAUDE.md` and `AGENTS.md`).

## Performing the Review
When asked to review a PR or a set of files:
1. Use `grep_search` to find instances of problematic patterns across the codebase (e.g., searching for `Float` in Prisma, or `updatedAt` in ledger tables, or floating-point arithmetic `*` or `/` on money variables).
2. Use `invoke_subagent` (e.g. `research` subagent) if the review spans a large number of files, to parallelize reading and summarizing.
3. Check against the critical rules:
   - **R1/R2**: Thin controllers, rich services.
   - **R3-R7**: Inventory rules (roll-based, actual cut, wastage records).
   - **R8-R10**: Decimal safe math (no `number` for money, no `parseFloat`).
   - **R11-R14**: Multi-currency purchase fields (`amountInCurrency`, `currency`, `exchangeRate`).
   - **R15-R18**: Transactions for multi-table writes. Append-only ledgers. Backend is the source of truth.
   - **R19-R20**: Audit logs and role-based permissions (`@RequirePermission`).

## Reporting the Review
Use an Artifact (e.g., `review_results.md`) to report your findings.
Structure the artifact with:
- ✅ PASS / ⚠️ WARNINGS / ❌ FAILURES
- For violations, quote the file, line number, and the specific rule violated.
- Propose a fix, and offer to automatically apply the fix using your code editing tools (`replace_file_content`).
