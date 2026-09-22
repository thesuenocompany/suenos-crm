# Voice Agent (ElevenLabs + Twilio) — CRM integration

This connects your existing ElevenLabs conversational agent (calling liquor stores over
Twilio) to the Sueños CRM. Three capabilities:

1. **Trigger calls from the CRM** — call a single store, or batch-call a filtered account list.
2. **Feed the call list from the CRM** — the "Call list" button on Accounts dials the filtered accounts that have phone numbers.
3. **Log results back to accounts** — after each call, a webhook writes the transcript, summary, and outcome onto the matching account (creating a Prospect if the store isn't an account yet).

Everything is admin-only. No calls are placed until the configuration below is done.

---

## What's already built (deployed)

- **Table** `call_logs` — one row per call (conversation id, account, phone, status, transcript, summary, outcome, structured data, duration).
- **Edge function** `elevenlabs-start-call` — admin-only; places an outbound call and stamps the `account_id` so results match back.
- **Edge function** `elevenlabs-call-webhook` — receives ElevenLabs' post-call webhook (HMAC-verified), logs the call, and notes it on the account.
- **CRM UI** — a **Voice Calls** screen (Setup section) to call a store and review calls, plus a **Call list** button on Main → Accounts to batch-call the filtered list (capped at 25 per click).

---

## What you need to do (one-time)

### 1. Set four secrets in Supabase
Supabase dashboard → Project `dowfjjthshbbgnvwxzjv` → **Project Settings → Edge Functions → Secrets** (or Settings → Functions → Secrets). Add:

| Secret name | Where to get it |
|---|---|
| `ELEVENLABS_API_KEY` | ElevenLabs → your profile → **API Keys** |
| `ELEVENLABS_AGENT_ID` | ElevenLabs → Agents → your agent → the agent's ID |
| `ELEVENLABS_AGENT_PHONE_NUMBER_ID` | ElevenLabs → **Phone Numbers** → the Twilio number you imported → its ID (not the phone number itself) |
| `ELEVENLABS_WEBHOOK_SECRET` | The shared secret ElevenLabs shows when you create the post-call webhook (step 2) |

Do **not** paste these into chat — set them directly in Supabase.

### 2. Enable the post-call webhook in ElevenLabs
ElevenLabs → **Agents Platform Settings → Webhooks** (or the agent's webhook overrides):

- **URL:** `https://dowfjjthshbbgnvwxzjv.supabase.co/functions/v1/elevenlabs-call-webhook`
- **Type:** Transcription (`post_call_transcription`) — this is the one that carries the transcript + summary.
- **Auth:** HMAC. Copy the generated **shared secret** into the `ELEVENLABS_WEBHOOK_SECRET` Supabase secret above.

The webhook returns 200 and is idempotent (keyed on the ElevenLabs conversation id), so retries are safe.

### 3. Make sure your Twilio number is imported into ElevenLabs
The outbound call uses `agent_phone_number_id`, which only exists once the Twilio number is connected under ElevenLabs → Phone Numbers. If you're already making calls from ElevenLabs, this is done — just grab the ID for the secret.

### 4. (Optional but recommended) Add structured data to the agent
In the agent's **Analysis → Data collection** (and/or Evaluation criteria), define fields you want captured, e.g. `interested` (yes/no), `buyer_name`, `wants_tasting`, `current_stock`. Whatever you define shows up under **Captured** on each call in the CRM and is stored on the call log — no CRM change needed.

---

## How matching works

- When the CRM starts a call it passes the `account_id` as a dynamic variable, so the result always lands on the right account.
- For calls started outside the CRM, the webhook matches by phone number (last 10 digits). If there's no match, it creates a **Prospect** account from the number so nothing is lost.
- Every completed call also appends a dated note to the account (`[date] Phone call (voice agent) [outcome]: summary…`) and stamps `last_call`.

## Using it

- **One store:** Setup → **Voice Calls** → search the account → **Call**.
- **A list:** Main → **Accounts** → apply filters → **Call list** (dials up to 25 with phones; click again for the next 25).
- **Review:** Setup → **Voice Calls** shows every call with transcript, summary, outcome, and captured fields; each call also appears in its account's notes.

## Notes / safeguards

- Batch calling is capped at 25 per click and asks for confirmation — calls are placed immediately and cost real Twilio/ElevenLabs minutes.
- Only admins can place calls (enforced in the edge function, not just the UI).
- If the secrets aren't set, the CRM shows a clear "ElevenLabs is not configured" error instead of failing silently.
