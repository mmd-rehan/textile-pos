# Caching Strategy

## Purpose

This document defines caching rules for the Textile ERP & POS System.

Caching must improve speed without risking inventory accuracy. POS stock, roll remaining length, customer credit, and financial values must remain correct and must not rely on stale cached values for final decisions.

---

## Caching Goals

1. Keep POS barcode lookup fast.
2. Keep dashboard and reports responsive.
3. Avoid unnecessary repeated API calls.
4. Do not compromise inventory accuracy.
5. Keep v1 simple enough for a single-shop deployment.

---

## Main Rule

Never use cache as the source of truth for inventory-changing or financial-changing operations.

The database is the source of truth.

---

## Frontend Caching

Use TanStack Query for browser-side server-state caching.

Good candidates:

- Product list.
- Category list.
- Batch list.
- Customer search results.
- Roll list pages.
- Dashboard summary.
- Reports.
- Settings.

Sensitive data requiring frequent refresh:

- Roll remaining length.
- Customer outstanding balance.
- Invoice payment status.
- Low stock dashboard widgets.

---

## Frontend Query Defaults

Suggested defaults:

```text
Product/category/settings cache: 5 to 15 minutes
Roll lookup cache: very short or disabled for sale confirmation
Customer search cache: 1 to 5 minutes
Dashboard cache: 30 seconds to 2 minutes
Reports cache: based on selected filters
```

After mutations, invalidate affected queries.

Examples:

```text
After sale created:
  -> invalidate rolls
  -> invalidate roll detail
  -> invalidate dashboard
  -> invalidate customer ledger if customer used
  -> invalidate sales reports

After purchase posted:
  -> invalidate rolls
  -> invalidate products summary
  -> invalidate inventory reports

After customer payment:
  -> invalidate customer ledger
  -> invalidate customer detail
  -> invalidate dashboard credit summary
```

---

## Backend Caching in v1

Backend caching is optional for v1.

Start without Redis unless real performance problems appear.

Use database indexes first.

If backend caching is added, cache only low-risk read data:

- Settings.
- Permission matrix.
- Category list.
- Product metadata.
- Static unit conversion data.

Do not cache as final truth:

- Roll remaining length for deduction.
- Customer credit balance for approval.
- Invoice payment status for posting.
- Stock movement results.

---

## Barcode Lookup Caching

Barcode lookup must be fast, but accurate.

Recommended approach:

- Use database unique index on barcode.
- Query directly from database for v1.
- Return current roll remaining length from database.

If caching is added later:

- Cache barcode to entity ID only.
- Fetch current roll state from database before sale.
- Invalidate barcode cache when roll/product barcode changes.

---

## Dashboard Caching

Dashboard may use short-lived cache because it is read-only.

Suggested cache duration:

```text
30 to 120 seconds
```

Invalidate after:

- Sale posted.
- Purchase posted.
- Roll reconciliation.
- Customer payment.
- Inventory adjustment.

---

## Reports Caching

Reports can be expensive.

For v1:

- Use indexed SQL queries.
- Paginate details.
- Aggregate only required date range.

Later:

- Cache report results by filter hash.
- Add report export jobs.
- Add summary tables if needed.

---

## Settings Caching

Settings are good cache candidates.

Examples:

- Company details.
- Invoice footer.
- Tax setting.
- Remnant threshold.
- Measurement base unit.
- Barcode format.

Invalidate when Admin changes settings.

---

## Permission Caching

Permissions may be cached per session.

Rules:

- Backend remains authoritative.
- If a user's role changes, active sessions should refresh permissions or be invalidated.
- Frontend should refetch current user after login and after 401/403 issues.

---

## Local Storage Rules

Allowed:

- UI preferences.
- Last selected POS tab.
- Non-sensitive filter preferences.

Avoid storing:

- Access tokens if using cookie-based auth.
- Passwords.
- Sensitive customer data.
- Final POS invoices as truth.
- Roll remaining length as truth.

---

## Cache Invalidation Map

### Sale Created

Invalidate:

```text
rolls
roll detail
product stock summary
customer detail
customer ledger
dashboard
sales reports
inventory reports
wastage reports if wastage exists
```

### Purchase Posted

Invalidate:

```text
rolls
product stock summary
supplier ledger
purchase reports
inventory reports
dashboard
```

### Roll Reconciled

Invalidate:

```text
rolls
roll detail
stock movements
wastage/shrinkage reports
remnant reports
dashboard
```

### Customer Payment Received

Invalidate:

```text
customer detail
customer ledger
credit reports
dashboard
```

### Settings Updated

Invalidate:

```text
settings
receipt template data
barcode template data
permission-sensitive frontend config if applicable
```

---

## Redis Guidance

Do not add Redis by default for v1 unless needed.

Add Redis later for:

- Distributed cache.
- Rate limiting.
- Background job queue.
- Session store.
- Report export queue.

For a single-shop system, MySQL plus frontend query caching is enough to start.

---

## Non-Negotiable Caching Rules

1. Cache must not decide final inventory deduction.
2. Cache must not decide final customer credit approval.
3. Backend must read current roll state inside sale transaction.
4. Cache must be invalidated after inventory and ledger mutations.
5. Stale dashboard data is acceptable for a short time, but stale POS deduction is not.
6. Keep caching simple until performance requires more.
