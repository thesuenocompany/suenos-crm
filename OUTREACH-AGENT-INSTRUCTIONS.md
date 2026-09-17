# Outreach agent — new operating instructions (paste into agent `cse_013NwmgxvJWBDyvrWvS7nmqd`)

Replace the agent's current "when to run / how to pick the batch" instructions with the
block below. **Keep your existing drafting voice, the campaign templates, the CASL
consent footer, and the unsubscribe link exactly as they are** — only the trigger and
the bookkeeping change. Set the agent's schedule to **run every 15 minutes**.

The agent uses its existing **Sueños CRM connection** to call the RPCs below, and its
existing **Microsoft 365 connector** to create drafts in **jason@vwdevelopments.com**.
Everything stays a **draft** — never send.

---

## Each run, do exactly this

1. **Ask the CRM for work** — call RPC `outreach_take_run` with `p_campaign = 'lrs-2026-q4'`, `p_limit = 10`. Read the returned JSON `status`:
   - `ready` → you have `run_id` and a `contacts` array. Go to step 2.
   - `idle` (no batch has been cleared), `paused`, `deferred` (daily cap reached — a `next_capacity_at` is given), or `empty` (no eligible prospects) → **do nothing this cycle and stop.** You'll be called again on the next schedule; when the batch is cleared or capacity frees, `ready` will return the work. Do not loop or retry within the same run.

2. **Draft each contact** in `contacts` (each has `message_id`, `email`, `establishment`, `licensee`, `crm_type`, `city`, `address`, `website`, `contact_name`, `contact_title`, `email_type`, `unsubscribe_token`, `email_source_url`, `sibling_stores`). For each:
   a. **Idempotency check first (prevents duplicate drafts):** if you might have created a draft for this `message_id` on a previous failed run, search your Drafts for one carrying the marker header `X-Suenos-Msg: <message_id>`. If found, **reuse it** (skip creation) and go straight to step 2d with its existing draft id.
   b. **Write the email copy** in your usual voice, using the `lrs-2026-q4` campaign's templates/identification for guardrails and personalising from the contact fields. Keep the CASL consent footer and the unsubscribe link (built from `unsubscribe_token`) that you already use.
   c. **Create the Outlook draft** in mailbox `jason@vwdevelopments.com` via Microsoft Graph (`POST /users/jason@vwdevelopments.com/messages`), with the recipient set to `email`, and add the header **`X-Suenos-Msg: <message_id>`** (as a single-value extended property) so retries can find it. Do **not** send. Capture the returned draft `id`.
   d. **Record it in the CRM** — call RPC `outreach_record_draft` with `p_message_id = <message_id>`, `p_subject`, `p_body`, `p_mailbox_draft_id = <draft id>`.
   e. **On any failure** for this contact (copy or Graph error): call RPC `outreach_record_error` with `p_message_id` and a short `p_error`, then continue to the next contact. Do not abort the whole batch.

3. **Close the run** — after all contacts are processed, call RPC `outreach_finish_run` with `p_run = <run_id>`. This records how many drafted vs errored and marks the run done/partial/failed. (A contact left without a `mailbox_draft_id` is treated as an error and will be retried on a later run — it will not be re-claimed or duplicated.)

## Rules

- **Never send.** Everything is a draft for Jason to review, edit, and send manually.
- **One batch of at most what the CRM returns** (it already enforces the rolling-24-hour cap of 10 and all targeting, suppression, and duplicate-recipient rules — you do not select or cap contacts yourself; just draft what `outreach_take_run` hands you).
- **Do not create your own schedule of who to contact.** If `outreach_take_run` returns anything other than `ready`, there is nothing to do.
- **Idempotent retries only.** Never create a second Outlook draft for a `message_id` that already has one (use the `X-Suenos-Msg` marker to detect it).

## How the CRM calls map (for reference)

All are Postgres RPCs on the Sueños CRM (`crm.suenos.ca` / Supabase project `dowfjjthshbbgnvwxzjv`), callable via your existing connection at `/rest/v1/rpc/<name>`:

| RPC | Args | Returns |
|---|---|---|
| `outreach_take_run` | `p_campaign`, `p_limit` | `{status, run_id?, contacts[], next_capacity_at?}` |
| `outreach_record_draft` | `p_message_id`, `p_subject`, `p_body`, `p_mailbox_draft_id` | `{ok}` |
| `outreach_record_error` | `p_message_id`, `p_error` | `{ok}` |
| `outreach_finish_run` | `p_run` | run summary |

---

**Test cycle (Jason + Claude):** in the CRM Outreach view, click **"Generate next batch"** — that creates one `ready` run. On the agent's next 15-minute tick it will draft up to 10 into jason@vwdevelopments.com's Drafts and mark them ready in the CRM. Confirm the drafts appear in Outlook and show in the CRM, then leave the schedule running.
