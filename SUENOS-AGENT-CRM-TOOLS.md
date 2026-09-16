# Sueños Work Agent — CRM Tools (Phase 1, read-only)

Extends the existing `suenos-agent-bridge` edge function so ChatGPT can query the
Sueños CRM through the Work Agent. No new connector, no new auth, no new tables.

## Architecture (unchanged security model)

```
ChatGPT → Sueños Work Agent (token sua_…)
        → suenos-agent-bridge  (CRM project edge function, JWT off, own auth)
            • validates the token against os.thesuenocompany.com/api/agent/session
            • maps OS user → CRM admin via suenos_agent_members / profiles
            • checks scopes (crm:read for all reads)
            • calls read-only suenos_agent_* SQL functions with the service-role
              key held server-side (never exposed; no arbitrary SQL)
        → Sueños CRM (Supabase dowfjjthshbbgnvwxzjv) — source of truth
```

All new tools are **read-only** and require the existing **`crm:read`** scope; access
stays **admin-only** (as before). Writes remain limited to the existing
`crm_create_task` / `crm_update_task` (scope `crm:tasks:write`).

## What was added

**SQL (migration `suenos-agent-crm-tools.sql`)** — two helper views
(`v_agent_orders`, `v_agent_account_stats`) and read-only functions:
`suenos_agent_orders`, `_visits`, `_reorders`, `_listings`, `_followups`,
`_rep_activity`, `_account_summary`, `_account_health`, `_attention`; plus an
extended `suenos_agent_sales_summary` (region/rep/type filters, cases, by-region).

**Bridge (`supabase/functions/suenos-agent-bridge/bridge.mjs`)** — new tools, a
natural-date resolver, and previous-period comparison for sales.

## Tools & the questions they answer

| Tool | Key args | Answers |
|---|---|---|
| `crm_find_accounts` | query, region, city, type, status, rep_id | "Find an account by name", "Vancouver Island accounts" |
| `crm_account_summary` | account_id | "Show me everything we know about <account>" (incl. health, cadence, next action) |
| `crm_account_health` | account_id | account status with transparent reasons |
| `crm_sales_summary` | range **or** from_month/to_month, region, rep_id, type, compare | "Sales this month", "this month vs last month" |
| `crm_orders` | range, account_id, rep_id, region, kind(all/new_listing/reorder) | "Orders by account/rep/region/date" |
| `crm_reorders` | region, rep_id, overdue_only, single_order_only | "Overdue for reorder", "ordered but not reordered", "only one order" |
| `crm_listings` | kind(new/active/new_no_reorder), range, region, rep_id | "New listings this month", "listings without a reorder" |
| `crm_visits` | range, account_id, rep_id, region | "Which accounts did Katie visit recently?" |
| `crm_rep_activity` | range, rep_id, region | "What has Mike Roma done this month?" (activity **vs** outcomes) |
| `crm_followups` | bucket(overdue/today/upcoming/all), rep_id, region, account_id | "Overdue follow-ups", "which reps are behind" |
| `crm_attention` | region, rep_id, limit | "The five things that most need my attention" |
| `crm_list_reps` | — | resolve rep names/ids |

Existing tools (`crm_account_history`, `crm_list_tasks`, `agent_change_log`,
`crm_create_task`, `crm_update_task`) are unchanged.

## Date handling

Any tool with a range accepts a keyword — resolved **server-side** and echoed back
as `resolved_range`:

`today, yesterday, this_week, this_month, last_month, last_7_days, last_30_days,
last_90_days, quarter_to_date, year_to_date, all_time, custom` (with `from`/`to`).

Example: `crm_sales_summary { range: "this_month", compare: true }` →
`resolved_range: {from_month, to_month}` plus `period`, `previous`, and `comparison`.

## Data-accuracy rules baked in

- CRM is the source of truth; missing data is `null`, never invented or zero-filled.
- The monthly **`sales`** table and **purchase orders** are kept distinct (orders
  are excluded from sales_summary; each response says so).
- Reorder cadence / health use transparent reasons, e.g.
  *"Last order 137 days ago; average reorder gap 51.2 days."* — no opaque scores.
- Rep activity separates **effort** (visits, tastings) from **outcomes**
  (new listings, reorders, bottles).
- Pagination: `limit` (≤100, default 30) + `offset`; `has_more` tells the agent to page.

## Verified server-side

RPCs were tested against live data: reorders/overdue, new-listings-without-reorder,
overdue follow-ups, attention items, rep activity, sales summary, account summary
(e.g. Cobblestone Pub → "slipping"), plus edge cases (empty result → `[]`, bad month
range → `AGENT_INVALID_RANGE`, missing account → null/404).

## Final testing (yours — needs a live token)

The end-to-end auth path needs a valid `sua_` Work Agent token from Sueños OS, which
only you hold. Once connected, try in ChatGPT:

- "Review the Sueños CRM and tell me the five things that most need my attention."
- "Show me Mike Roma's activity and outcomes for September."
- "Which Vancouver Island accounts haven't reordered in 45 days?"
- "What were our sales this month versus last month?"
- "Find Cobblestone Liquor Store and summarize the account."
- "Which reps have overdue follow-up?"

## Phase 2 (designed for, not built)

The write path already exists (`suenos_agent_write_task`, idempotency via
`request_key`, optimistic concurrency via `expected_snapshot`, audit in
`suenos_agent_audit`). Future controlled actions — `log_visit`, `add_account_note`,
`update_next_action`, `mark_followup_complete`, `assign_account` — follow the same
pattern behind a stricter scope. Nothing financial or destructive is exposed in
Phase 1.
